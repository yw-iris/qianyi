/* ============================================================
 *  千载一瞬 —— 通用控制器
 *  串联路由、剧情树、结局解锁、画卷除尘、图鉴、书籍推荐
 *  不再硬编码任何角色——所有数据来自 Router + 角色模块
 * ============================================================ */
(function () {
  'use strict';

  /* 馆藏信息用的线性 SVG 图标（替代 emoji） */
  const ICON_LIB =
    '<svg class="lib-ico" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M3 8 12 3l9 5"/>' +
      '<path d="M4.5 8v11M9 8v11M15 8v11M19.5 8v11"/>' +
      '<path d="M3 8h18M4 19h16"/>' +
    '</svg>';
  const ICON_BOOK =
    '<svg class="lib-ico lib-ico--sm" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 5c-2-1.5-5-1.5-7 0v13c2-1.5 5-1.5 7 0 2-1.5 5-1.5 7 0V5c-2-1.5-5-1.5-7 0z"/>' +
      '<path d="M12 5v13"/>' +
    '</svg>';

  /* ---------- 状态（按角色隔离）---------- */
  let currentChar = null;   // 当前角色对象 { id, meta, endings, story, books }
  let state = {
    node: 'start',
    unlocked: new Set(),
    path: [],                 // 当前抉择路径上的节点 id（不含结局节点）
    currentEndingNodeId: null // 本次到达的结局节点 key
  };
  let viewer = null;

  const TOTAL_ENDINGS = () => currentChar ? currentChar.endings.length : 0;
  const STORE_KEY = () => currentChar ? (currentChar.id + '_endings_v1') : '';

  /* ---------- DOM ---------- */
  const $ = (s) => document.querySelector(s);
  const el = {
    // 导航
    topbarBrand: $('#topbar-brand'),
    navStage: $('#nav-stage'),
    navGallery: $('#nav-gallery'),
    backBtn: $('#back-to-hub'),

    // Hub / Stage 显隐
    hubSection: $('#hub-section'),
    stageSection: $('#stage'),
    gallerySection: $('#gallery'),

    // 叙事
    chapter: $('#node-chapter'),
    text: $('#node-text'),
    stageAxis: $('#stage-axis'),
    choices: $('#node-choices'),
    progressCount: $('#progress-count'),
    progressBar: $('#progress-bar'),
    scrollName: $('#scroll-name'),
    stageTitle: $('#stage-title'),

    // 图鉴
    galleryTitle: $('#gallery-title'),
    gallery: $('#gallery-grid'),
    resetBtn: $('#reset-progress'),

    // 弹窗 & 提示
    modal: $('#ending-modal'),
    modalBody: $('#ending-modal-body'),
    toast: $('#complete-toast'),
    canvas: $('#scroll-canvas'),
    canvasWrap: $('#canvas-wrap'),
    scrollSub: $('#scroll-sub'),
    mediaPortrait: $('#media-portrait'),
    mediaVideo: $('#media-video'),
    portraitImg: $('#portrait-img'),

    // 书籍面板（新增）
    booksPanel: $('#books-panel'),
    booksList: $('#books-list'),
    booksTitle: $('#books-title'),

    // 返回封面（新增）
    backToCover: $('#back-to-cover'),

    // 过渡剧情
    skipBridge: $('#skip-bridge')
  };

  /* ---------- 文案分段 ---------- */
  function paragraphs(text) {
    return text.split('\n\n').map((t) => `<p>${t.replace(/\n/g, '<br>')}</p>`).join('');
  }

  /* 秒 → mm:ss */
  function fmtDuration(sec) {
    sec = Number(sec) || 0;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /* 延迟加载 Three.js（仅画作副本需要 3D，首屏不阻塞） */
  let threeReady = false, threeLoading = false;
  function ensureThreeJS() {
    if (threeReady) return Promise.resolve();
    if (threeLoading) return new Promise(r => { const id = setInterval(() => { if (threeReady) { clearInterval(id); r(); } }, 50); });
    threeLoading = true;
    return Promise.all([
      loadScript('assets/three.min.js'),
      loadScript('assets/OrbitControls.js')
    ]).then(() => { threeReady = true; });
  }
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = resolve; s.onerror = () => reject(new Error('script load failed: ' + src));
      document.head.appendChild(s);
    });
  }

  /* ========== 进入角色（由 Router 调用）========== */

  async function enterStage(charData) {
    currentChar = charData;
    state.unlocked = loadUnlocked();
    state.path = [];
    state.currentEndingNodeId = null;

    // 判断是否为文人传记副本（有配套影像志视频）
    const hasVideo = !!(charData.meta && charData.meta.video);

    // 更新 UI 标识
    el.scrollName.textContent = charData.meta.scrollName + (hasVideo ? ' · 影像' : ' · 三维');
    el.stageTitle.textContent = `「${charData.meta.title}」抉择之台`;
    el.galleryTitle.textContent =
      `${TOTAL_ENDINGS()}段命运，${TOTAL_ENDINGS()}片尘埃`;

    // 显示/隐藏区域
    el.hubSection.style.display = 'none';
    el.stageSection.style.display = '';
    el.gallerySection.style.display = '';
    el.booksPanel.style.display = '';
    el.navStage.style.display = '';
    el.navGallery.style.display = '';

    /* ---------- 右侧面板：画作(3D) vs 文人(画像+视频) ---------- */
    if (hasVideo) {
      // ── 文人副本：画像 + 通关后视频 ──
      el.canvasWrap.style.display = 'none';
      el.mediaPortrait.style.display = '';
      el.mediaVideo.style.display = 'none';
      el.portraitImg.src = charData.meta.scrollImage;
      el.portraitImg.alt = charData.meta.title + ' 画像';
      el.scrollSub.textContent = '画像 · 通关解锁影像志';

      // 若已全通关，直接显示视频
      if (state.unlocked.size >= TOTAL_ENDINGS()) renderMediaVideo();
      else hideMediaVideo();
    } else {
      // ── 画作副本：ScrollViewer 三维画卷（延迟加载 Three.js）──
      await ensureThreeJS();
      el.canvasWrap.style.display = '';
      el.mediaPortrait.style.display = 'none';
      el.mediaVideo.style.display = 'none';
      el.mediaVideo.innerHTML = '';   // 清除切换自文人副本时残留的影像志 iframe
      el.scrollSub.textContent = '每解锁一结局，尘埃少一块';

      // 初始化或重用 viewer
      if (!viewer) {
        viewer = new ScrollViewer(el.canvas, {
          defaultSrc: charData.meta.scrollImage,
          onComplete: onAllClear
        });
      } else {
        viewer.setPainting(charData.meta.scrollImage, true);
        viewer.resetDust();
      }
      // 恢复已解锁的尘块
      charData.endings.forEach(e => {
        if (state.unlocked.has(e.id)) viewer.clearRegion(e.region, true);
      });
    }

    updateProgress();
    renderGallery();
    renderBooks(); // 渲染书籍（通关后高亮）

    // 从 start 节点开始
    renderNode('start');
    if (window.Motion) { Motion.refresh(); Motion.bindMagnetic(el.stageSection); }
  }

  function leaveStage() {
    if (viewer) { /* viewer 保留复用 */ }
    el.hubSection.style.display = '';
    el.stageSection.style.display = 'none';
    el.gallerySection.style.display = 'none';
    el.booksPanel.style.display = 'none';
    el.navStage.style.display = 'none';
    el.navGallery.style.display = 'none';
    Router.updateTopbar(null);
  }

  /* ---------- 持久化 ---------- */
  function loadUnlocked() {
    try { return new Set(JSON.parse(localStorage.getItem(STORE_KEY()) || '[]')); }
    catch (e) { return new Set(); }
  }
  function saveUnlocked() {
    localStorage.setItem(STORE_KEY(), JSON.stringify([...state.unlocked]));
  }

  /* ---------- 渲染节点 ---------- */
  function renderNode(id) {
    const node = currentChar.story[id];
    if (!node) return;
    state.node = id;
    if (node.ending) { state.currentEndingNodeId = id; reachEnding(node); return; }

    // 路径追踪：向前则追加，回退到已访问节点则截断其后
    const idx = state.path.indexOf(id);
    if (idx === -1) state.path.push(id);
    else state.path.length = idx + 1;

    // 清理上一轮过渡状态
    clearTransition();

    el.chapter.textContent = node.chapter || '';
    el.text.innerHTML = paragraphs(node.text);
    el.choices.innerHTML = '';
    node.choices.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.innerHTML = `<span class="choice__no">${i + 1}</span>` +
        `<span class="choice__txt">${c.text}</span>` +
        `<span class="choice__arrow">→</span>`;
      b.addEventListener('click', () => playTransition(c));
      el.choices.appendChild(b);
    });
    el.choices.classList.remove('is-ending', 'node-choices--hidden');
    renderStageAxis();
    $('#stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- 选择后过渡剧情：选项消失→bridge浮现→跳过→下一节点 ---------- */
  let _bridgeTimer = null, _bridgeAutoTimer = null;

  function playTransition(choice) {
    const bridge = choice.bridge || '';
    const nextId = choice.next;

    // 1) 选项按钮退出动画
    el.choices.classList.add('node-choices--hidden');

    // 2) 如果有 bridge 文字，播放过渡剧情
    if (bridge) {
      // 渲染 bridge 文字（逐段淡入）
      const paras = bridge.split('\n\n');
      const bridgeHtml = paras.map((t, i) =>
        `<p style="transition-delay:${i * 0.4}s">${t.replace(/\n/g, '<br>')}</p>`
      ).join('');
      el.text.innerHTML = `<div class="bridge-text">${bridgeHtml}</div>`;

      // 逐段触发淡入
      let revealed = 0;
      const revealNext = () => {
        const ps = el.text.querySelectorAll('.bridge-text p');
        if (revealed < ps.length) {
          ps[revealed].classList.add('is-revealed');
          revealed++;
          if (revealed < ps.length) {
            _bridgeTimer = setTimeout(revealNext, 420);
          } else {
            // 全部浮现后，等 1s 自动进入下一节点
            _bridgeAutoTimer = setTimeout(() => finishTransition(nextId), 1000);
          }
        }
      };
      _bridgeTimer = setTimeout(revealNext, 300);

      // 显示跳过按钮
      el.skipBridge.style.display = '';
      el.skipBridge.classList.add('is-visible');
      el.skipBridge.onclick = () => finishTransition(nextId);
    } else {
      // 无 bridge：短暂延迟后直接进入下一节点
      _bridgeAutoTimer = setTimeout(() => finishTransition(nextId), 600);
    }
  }

  function finishTransition(nextId) {
    clearTransition();
    renderNode(nextId);
  }

  function clearTransition() {
    if (_bridgeTimer) { clearTimeout(_bridgeTimer); _bridgeTimer = null; }
    if (_bridgeAutoTimer) { clearTimeout(_bridgeAutoTimer); _bridgeAutoTimer = null; }
    el.skipBridge.style.display = 'none';
    el.skipBridge.classList.remove('is-visible');
    el.skipBridge.onclick = null;
    el.choices.classList.remove('node-choices--hidden');
  }

  /* ---------- 抉择之台：实时回溯轴线 ---------- */
  function renderStageAxis() {
    if (!el.stageAxis || !currentChar) { el.stageAxis.innerHTML = ''; return; }
    const path = state.path;
    if (path.length < 1) { el.stageAxis.innerHTML = ''; return; }

    const nodes = path.map((nid, k) => {
      const n = currentChar.story[nid];
      if (!n) return '';
      // 找出从该节点走向下一个节点的选项文本
      const nextId = (k + 1 < path.length) ? path[k + 1] : state.node;
      const ch = (n.choices && nextId) ? n.choices.find(c => c.next === nextId) : null;
      return `<button type="button" class="axis__node" data-node="${nid}" title="回溯至此处重选">` +
               `<span class="axis__dot"></span>` +
               `<span class="axis__ch">${n.chapter || '抉择'}</span>` +
               `<span class="axis__choice">${ch ? ch.text : ''}</span>` +
             `</button><span class="axis__line"></span>`;
    }).join('');

    el.stageAxis.innerHTML =
      `<div class="stage-axis__label">已做抉择 · 点击可回溯</div>` +
      `<div class="axis__track">${nodes}</div>`;

    // 绑定点击回溯
    el.stageAxis.querySelectorAll('.axis__node[data-node]').forEach((b) => {
      b.addEventListener('click', () => renderNode(b.dataset.node));
    });
  }

  /* ---------- 到达结局 ---------- */
  function reachEnding(node) {
    const e = node.ending;
    const meta = findEndingMeta(e.id);
    const isNew = !state.unlocked.has(e.id);

    state.unlocked.add(e.id);
    saveUnlocked();
    if (viewer && meta) viewer.clearRegion(meta.region, !isNew);

    // 清空抉择之台轴线（结局弹窗自带轴线）
    if (el.stageAxis) el.stageAxis.innerHTML = '';

    updateProgress();
    renderGallery();
    openEndingModal(node, meta, isNew);

    // 如果刚全部解锁，渲染书籍面板 + 文人副本视频
    if (state.unlocked.size >= TOTAL_ENDINGS()) {
      renderBooks(true); // 高亮模式
      // 文人副本：通关后在右侧面板展示影像志
      if (currentChar && currentChar.meta && currentChar.meta.video) renderMediaVideo();
    }
  }

  function findEndingMeta(id) {
    if (!currentChar || !currentChar.endings) return null;
    return currentChar.endings.find(e => e.id === id) || null;
  }

  /* 由 ending.id 反查其在 story 中的节点 key */
  function findEndingNodeId(id) {
    if (!currentChar) return null;
    for (const k in currentChar.story)
      if (currentChar.story[k].ending && currentChar.story[k].ending.id === id)
        return k;
    return null;
  }

  /* 从 start 经 choices BFS 找到通向 endingNodeId 的一条路径（含结局 key 于末尾） */
  function tracePathTo(endingNodeId) {
    const queue = [['start']];
    const seen = new Set(['start']);
    while (queue.length) {
      const path = queue.shift();
      const last = path[path.length - 1];
      const node = currentChar.story[last];
      if (!node) continue;
      if (node.ending && last === endingNodeId) return path;
      if (node.choices) {
        for (const c of node.choices) {
          if (!seen.has(c.next)) {
            seen.add(c.next);
            queue.push(path.concat(c.next));
          }
        }
      }
    }
    return ['start'];
  }

  /* 优先用本次实际抉择路径；否则回溯出一条可达该结局的路径 */
  function getAxisPath(endingNodeId) {
    if (state.currentEndingNodeId === endingNodeId && state.path.length)
      return state.path.concat(endingNodeId);
    return tracePathTo(endingNodeId);
  }

  /* 构建抉择轴线 HTML（各选择节点可点击回溯，末尾为结局） */
  function buildAxisHtml(endingNodeId) {
    const path = getAxisPath(endingNodeId);
    if (!path || path.length < 2) return '';
    const endNode = currentChar.story[endingNodeId];
    const endTitle = (endNode && endNode.ending && endNode.ending.title) ? endNode.ending.title : '结局';

    const steps = path.slice(0, -1).map((nid, k) => {
      const n = currentChar.story[nid];
      const nextId = path[k + 1];
      const ch = (n.choices && nextId) ? n.choices.find(c => c.next === nextId) : null;
      return `<button type="button" class="axis__node" data-node="${nid}">` +
               `<span class="axis__dot"></span>` +
               `<span class="axis__ch">${n.chapter || '抉择'}</span>` +
               `<span class="axis__choice">${ch ? ch.text : ''}</span>` +
             `</button><span class="axis__line"></span>`;
    }).join('');

    const endHtml = `<span class="axis__node axis__node--end">` +
       `<span class="axis__dot"></span>` +
       `<span class="axis__ch">${endNode && endNode.chapter ? endNode.chapter : '结局'}</span>` +
       `<span class="axis__choice">${endTitle}</span>` +
     `</span>`;

    return `<div class="choice-axis">` +
             `<div class="axis__label">你的抉择之路 · 点击任一节点可回溯重选</div>` +
             `<div class="axis__track">${steps}${endHtml}</div>` +
           `</div>`;
  }

  /* ---------- 进度 ---------- */
  function updateProgress() {
    const n = state.unlocked.size;
    const total = TOTAL_ENDINGS();
    el.progressCount.textContent = `${n} / ${total}`;
    el.progressBar.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const seg = document.createElement('span');
      seg.className = 'pseg' + (i < n ? ' on' : '');
      seg.style.background = i < n ? currentChar.endings[i].tint : '';
      el.progressBar.appendChild(seg);
    }
  }

  /* ---------- 结局图鉴 ---------- */
  function renderGallery() {
    el.gallery.innerHTML = '';
    currentChar.endings.forEach((e) => {
      const unlocked = state.unlocked.has(e.id);
      const card = document.createElement('article');
      card.className = 'ecard reveal' + (unlocked ? ' unlocked' : ' locked');
      card.style.setProperty('--tint', e.tint);
      if (unlocked) {
        card.innerHTML =
          `<div class="ecard__no">${String(e.region + 1).padStart(2, '0')}</div>` +
          `<div class="ecard__en">${e.en}</div>` +
          `<h3 class="ecard__title">${e.title}</h3>` +
          `<p class="ecard__blurb">${e.blurb}</p>` +
          `<span class="ecard__tag">已解锁 · 点击重温</span>`;
        card.addEventListener('click', () => {
          const nd = findEndingNode(e.id);
          openEndingModal(nd, e, false);
        });
      } else {
        card.innerHTML =
          `<div class="ecard__no">${String(e.region + 1).padStart(2, '0')}</div>` +
          `<div class="ecard__en">？ ？ ？</div>` +
          `<h3 class="ecard__title">未解锁</h3>` +
          `<p class="ecard__blurb">继续历练，揭开这一段命运。</p>` +
          `<span class="ecard__tag">尘封中</span>`;
      }
      el.gallery.appendChild(card);
    });
    if (window.Motion) { Motion.refresh(); Motion.bindMagnetic(el.gallery); }
  }

  function findEndingNode(id) {
    for (const k in currentChar.story)
      if (currentChar.story[k].ending && currentChar.story[k].ending.id === id)
        return currentChar.story[k];
    return null;
  }

  /* ---------- 结局弹窗 ---------- */
  function openEndingModal(node, meta, isNew) {
    const e = node.ending;
    const allDone = state.unlocked.size >= TOTAL_ENDINGS();
    const endingKey = findEndingNodeId(e.id);
    el.modalBody.innerHTML =
      `<div class="em__chapter">${node.chapter || ''}</div>` +
      `<h2 class="em__title">${meta ? meta.title : ''}</h2>` +
      `<div class="em__en">${meta ? meta.en : ''}${isNew ? ' · 新解锁' : ''}</div>` +
      `<div class="em__body">${paragraphs(e.body)}</div>` +
      `<blockquote class="em__epi">${e.epilogue}</blockquote>` +
      buildAxisHtml(endingKey) +
      `<div class="em__actions">` +
        `<button class="btn btn--ghost" data-act="restart">重头再来</button>` +
        `<button class="btn btn--ghost" data-act="gallery">查看图鉴</button>` +
        (allDone && currentChar.books && currentChar.books.length
          ? `<button class="btn btn--solid" data-act="books">查看延伸阅读</button>`
          : (allDone
            ? `<button class="btn btn--solid" data-act="orbit">三维全景鉴赏</button>`
            : `<button class="btn btn--solid" data-act="continue">继续探索其他结局</button>`)) +
      `</div>`;

    if (window.Motion) Motion.bindMagnetic(el.modalBody);
    el.modalBody.querySelectorAll('[data-act]').forEach((b) => {
      b.addEventListener('click', () => {
        const act = b.dataset.act;
        closeModal();
        if (act === 'restart') renderNode('start');
        else if (act === 'gallery') el.gallerySection.scrollIntoView({ behavior: 'smooth' });
        else if (act === 'books') el.booksPanel.scrollIntoView({ behavior: 'smooth' });
        else if (act === 'continue') el.gallerySection.scrollIntoView({ behavior: 'smooth' });
        else if (act === 'orbit') {
          if (viewer) viewer.controls.autoRotate = true;
          el.stageSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
    // 抉择轴线：点击节点回溯到该选择处重选
    el.modalBody.querySelectorAll('.axis__node[data-node]').forEach((b) => {
      b.addEventListener('click', () => {
        closeModal();
        renderNode(b.dataset.node);
      });
    });
    el.modal.classList.add('show');
  }

  function closeModal() { el.modal.classList.remove('show'); }

  /* ---------- 全部解锁提示 ---------- */
  function onAllClear() {
    el.toast.querySelector('.toast__title').textContent = '六尘尽落';
    el.toast.querySelector('.toast__sub').textContent = '千里江山，终可三维而观。';
    el.toast.classList.add('show');
    setTimeout(() => el.toast.classList.remove('show'), 6000);
    renderBooks(true);
    // 文人副本：通关后显示影像志视频
    if (currentChar && currentChar.meta && currentChar.meta.video) renderMediaVideo();
  }

  /* ========== 文人副本：画像 / 影像志切换 ========== */

  /** 通关后，在右侧面板渲染 B站影像志视频（替换画像区域）*/
  function renderMediaVideo() {
    if (!currentChar || !currentChar.meta || !currentChar.meta.video) return;
    if (!el.mediaVideo) return;
    const v = currentChar.meta.video;
    el.mediaPortrait.style.display = 'none';
    el.mediaVideo.style.display = '';
    el.scrollSub.textContent = '影像志 · 已解锁';
    el.mediaVideo.innerHTML =
      `<div class="vblock__head">` +
        `<span class="vblock__badge">影像志</span>` +
        `<div class="vblock__meta">` +
          `<h3 class="vblock__title">${v.title}</h3>` +
          `<div class="vblock__sub">${v.uploader} · 「${v.groupTitle || '传记影像'}」 · 时长 ${fmtDuration(v.duration)}</div>` +
        `</div>` +
      `</div>` +
      `<div class="vblock__frame">` +
        `<iframe src="//player.bilibili.com/player.html?bvid=${v.bvid}&page=1&high_quality=1&danmaku=0" ` +
          `scrolling="no" border="0" frameborder="no" framespacing="0" ` +
          `allowfullscreen="true" loading="lazy" ` +
          `referrerpolicy="no-referrer-when-downgrade"` +
          `title="${v.title}"></iframe>` +
      `</div>`;
  }

  /** 隐藏视频，恢复显示画像区域 */
  function hideMediaVideo() {
    if (!el.mediaPortrait || !el.mediaVideo) return;
    el.mediaPortrait.style.display = '';
    el.mediaVideo.style.display = 'none';
    el.scrollSub.textContent = '画像 · 通关解锁影像志';
    el.mediaVideo.innerHTML = '';
  }

  /* ========== 书籍推荐面板（新增）========== */

  function renderBooks(highlight) {
    if (!currentChar || !currentChar.books || !currentChar.books.length) {
      // 若无书籍且无视频（非文人副本），隐藏整个面板
      el.booksPanel.style.display = 'none'; return;
    }
    el.booksPanel.style.display = '';
    el.booksTitle.textContent = `「${currentChar.meta.title}」延伸阅读`;
    el.booksList.innerHTML = '';

    currentChar.books.forEach((book, idx) => {
      const card = document.createElement('article');
      card.className = 'book-card reveal';
      card.style.setProperty('--i', idx);

      const libHtml = book.libraries.map(lib =>
        `<div class="blib">
           <span class="blib__icon">${ICON_BOOK}</span>
           <span class="blib__name">${lib.name}</span>
           <span class="blib__loc">${lib.location}</span>
         </div>`
      ).join('');

      card.innerHTML =
        `<div class="bc__main">` +
          `<h3 class="bc__title">${book.title}</h3>` +
          `<div class="bc__meta">${book.author} · ${book.publisher} (${book.year}) · ISBN ${book.isbn}</div>` +
          `<p class="bc__summary">${book.summary}</p>` +
          (book.libraries && book.libraries.length
            ? `<div class="bc__libraries">` +
              `<strong style="font-size:.82rem;color:#5a4a32;display:flex;align-items:center;">${ICON_LIB}馆藏参考</strong>` +
              `${libHtml}` +
              `<div class="bc__libnote">以上为收藏相关典籍的公立图书馆；具体馆藏与索书号请以各馆官方目录为准。</div>` +
            `</div>`
            : '') +
        `</div>`;

      if (highlight) {
        card.style.animation = `rise .4s ease ${idx * 0.12}s both`;
      }
      el.booksList.appendChild(card);
    });
    if (window.Motion) Motion.refresh();
  }

  /* ---------- 背景音乐 ---------- */
  function initSound() {
    const btn = document.getElementById('sound-toggle');
    const audio = document.getElementById('bgm');
    if (!btn || !audio) return;
    const FADE = 1100;
    let enabled = true;

    function fade(to, done) {
      const start = Math.max(0, Math.min(1, audio.volume || 0));
      const target = Math.max(0, Math.min(1, to));
      const t0 = performance.now();
      (function step(t) {
        const k = Math.min(1, (t - t0) / FADE);
        audio.volume = Math.max(0, Math.min(1, start + (target - start) * k));
        if (k < 1) requestAnimationFrame(step);
        else if (done) done();
      })(t0);
    }
    function play() { const p = audio.play(); if (p && p.catch) p.catch(() => {}); }
    function pause() { fade(0, () => audio.pause()); }

    btn.addEventListener('click', () => {
      enabled = !enabled;
      btn.classList.toggle('is-muted', !enabled);
      btn.setAttribute('aria-pressed', String(enabled));
      if (enabled) { audio.volume = 0; play(); fade(0.5); }
      else pause();
    });

    /* 进入网页即尝试播放背景音乐。
     * 浏览器自动播放策略通常要求一次用户手势，因此分三层兜底：
     *   1) 初始化后立即尝试（部分浏览器/老访客允许）
     *   2) 音频可播放(canplay)时再试
     *   3) 首次用户手势（点击/按键/滚动/进入）时补播
     */
    function doPlay() {
      if (!enabled || !audio.paused) return;
      audio.volume = 0;
      play();
      fade(0.5);
    }
    doPlay();
    audio.addEventListener('canplay', doPlay);
    audio.addEventListener('canplaythrough', doPlay);

    function onGesture(e) {
      if (e && e.target && e.target.closest && e.target.closest('#sound-toggle')) return;
      doPlay();
      if (!audio.paused) {
        window.removeEventListener('pointerdown', onGesture);
        window.removeEventListener('keydown', onGesture);
        window.removeEventListener('scroll', onGesture);
      }
    }
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    window.addEventListener('scroll', onGesture);

    /* 11MB 音频不在首屏争抢带宽：等首屏渲染完成后再开始缓冲，
     * 既保证“进去就能播”，又不拖慢页面响应。 */
    function bufferAudio() {
      try { audio.load(); } catch (e) {}
    }
    if (document.readyState === 'complete') setTimeout(bufferAudio, 800);
    else window.addEventListener('load', () => setTimeout(bufferAudio, 800));
  }

  /* ---------- 开场：顶栏显隐 / 进入 / 颜真卿图替换 ---------- */
  function initPrologue() {
    const topbar = document.querySelector('.topbar');
    const prologue = document.getElementById('prologue');
    const enterBtn = document.getElementById('enter-site');
    const hub = document.getElementById('hub-section');

    if (prologue && topbar) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) topbar.classList.add('topbar--hidden');
          else topbar.classList.remove('topbar--hidden');
        });
      }, { threshold: 0.02 });
      io.observe(prologue);
    }
    if (enterBtn && hub) {
      enterBtn.addEventListener('click', () => {
        if (topbar) topbar.classList.remove('topbar--hidden');
        hub.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else if (hub) {
      // 无按钮时：prologue 滚出视口后自动显示顶栏（IntersectionObserver 已处理）
      // 用户自然滚动到 hub 即可
    }
    // 若 jizhi.webp 加载失败，祭侄文稿 act 卡片回退为题版模式
    const yanFrame = document.getElementById('yan-frame');
    if (yanFrame) {
      const test = new Image();
      test.onerror = () => {
        yanFrame.style.backgroundImage = '';
        yanFrame.classList.remove('act__frame--scroll');
        yanFrame.classList.add('act__frame--yan');
        yanFrame.innerHTML = '<div class="act__yantext"><div class="act__yan-name">顏真卿</div><div class="act__yan-line">維乾元元年，歲次戊戌……<br>父陷子死，巢傾卵覆。</div></div>';
      };
      test.src = 'assets/images/jizhi.webp';
    }
  }

  /* ---------- 初始化 ---------- */
  function init() {
    // 向 Router 注册回调
    Router.setCallbacks({
      onEnterStage: enterStage,
      onLeaveStage: leaveStage
    });

    // 根据 URL hash 自动恢复或渲染 Hub 长廊
    Router.initFromHash();

    // 开场与背景音乐
    initPrologue();
    initSound();

    // Hub 内事件（"开始探索"仅为指示，点击/回车滚动至人物长廊）
    const scrollToGrid = () => {
      document.getElementById('char-grid').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // 返回长廊按钮
    el.backBtn.addEventListener('click', () => Router.goHome());

    // 返回封面页：恢复长廊显示并平滑滚回文档最顶端的封面
    if (el.backToCover) {
      el.backToCover.addEventListener('click', () => {
        Router.goHome();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // 导航栏：品牌点击返回主页
    el.topbarBrand.addEventListener('click', (ev) => { ev.preventDefault(); Router.goHome(); });
    el.topbarBrand.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); Router.goHome(); } });

    // 重置进度
    el.resetBtn.addEventListener('click', () => {
      if (!confirm(`确定要拂去「${currentChar ? currentChar.meta.title : ''}」的所有已解锁结局、重头再来吗？`)) return;
      state.unlocked.clear();
      state.path = [];
      state.currentEndingNodeId = null;
      saveUnlocked();
      if (viewer) viewer.resetDust();
      updateProgress();
      renderGallery();
      renderBooks(false);
      renderNode('start');
    });

    // 弹窗关闭
    el.modal.addEventListener('click', (ev) => { if (ev.target === el.modal) closeModal(); });
    const mc = document.querySelector('#modal-close');
    if (mc) mc.addEventListener('click', closeModal);

    // 键盘快捷键
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') closeModal();
      if (el.modal.classList.contains('show')) return;
      // 过渡剧情播放中，按键不触发选择
      if (el.choices.classList.contains('node-choices--hidden')) return;
      if (ev.key === '1') { const c = el.choices.querySelector('.choice'); if (c) c.click(); }
      if (ev.key === '2') { const cs = el.choices.querySelectorAll('.choice'); if (cs[1]) cs[1].click(); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
