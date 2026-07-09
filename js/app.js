/* ============================================================
 *  千载一瞬 —— 通用控制器
 *  串联路由、剧情树、结局解锁、画卷除尘、图鉴、书籍推荐
 *  不再硬编码任何角色——所有数据来自 Router + 角色模块
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 状态（按角色隔离）---------- */
  let currentChar = null;   // 当前角色对象 { id, meta, endings, story, books }
  let state = {
    node: 'start',
    unlocked: new Set()
  };
  let viewer = null;

  const TOTAL_ENDINGS = () => currentChar ? currentChar.endings.length : 0;
  const STORE_KEY = () => currentChar ? (currentChar.id + '_endings_v1') : '';

  /* ---------- DOM ---------- */
  const $ = (s) => document.querySelector(s);
  const el = {
    // 导航
    topbarBrand: $('#topbar-brand'),
    navHome: $('#nav-home'),
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
    startBtn: $('#start-btn'),

    // 书籍面板（新增）
    booksPanel: $('#books-panel'),
    booksList: $('#books-list'),
    booksTitle: $('#books-title')
  };

  /* ---------- 文案分段 ---------- */
  function paragraphs(text) {
    return text.split('\n\n').map((t) => `<p>${t.replace(/\n/g, '<br>')}</p>`).join('');
  }

  /* ========== 进入角色（由 Router 调用）========== */

  function enterStage(charData) {
    currentChar = charData;
    state.unlocked = loadUnlocked();

    // 更新 UI 标识
    el.scrollName.textContent = charData.meta.scrollName + ' · 三维';
    el.stageTitle.textContent = `「${charData.meta.title}」抉择之台`;
    el.galleryTitle.textContent =
      `${TOTAL_ENDINGS()}段命运，${TOTAL_ENDINGS()}片尘埃`;

    // 显示/隐藏区域
    el.hubSection.style.display = 'none';
    el.stageSection.style.display = '';
    el.gallerySection.style.display = '';
    el.booksPanel.style.display = '';
    el.navHome.style.display = '';
    el.navStage.style.display = '';
    el.navGallery.style.display = '';

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

    updateProgress();
    renderGallery();
    renderBooks(); // 渲染书籍（通关后高亮）

    // 从 start 节点开始
    renderNode('start');
    if (window.Motion) { Motion.refresh(); Motion.bindMagnetic(el.stageSection); }
    el.startBtn.click(); // 滚动到舞台区
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
    if (node.ending) { reachEnding(node); return; }

    el.chapter.textContent = node.chapter || '';
    el.text.innerHTML = paragraphs(node.text);
    el.choices.innerHTML = '';
    node.choices.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.innerHTML = `<span class="choice__no">${i + 1}</span>` +
        `<span class="choice__txt">${c.text}</span>` +
        `<span class="choice__arrow">→</span>`;
      b.addEventListener('click', () => renderNode(c.next));
      el.choices.appendChild(b);
    });
    el.choices.classList.remove('is-ending');
    $('#stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- 到达结局 ---------- */
  function reachEnding(node) {
    const e = node.ending;
    const meta = findEndingMeta(e.id);
    const isNew = !state.unlocked.has(e.id);

    state.unlocked.add(e.id);
    saveUnlocked();
    if (viewer && meta) viewer.clearRegion(meta.region, !isNew);

    updateProgress();
    renderGallery();
    openEndingModal(node, meta, isNew);

    // 如果刚全部解锁，渲染书籍面板
    if (state.unlocked.size >= TOTAL_ENDINGS()) {
      renderBooks(true); // 高亮模式
    }
  }

  function findEndingMeta(id) {
    if (!currentChar || !currentChar.endings) return null;
    return currentChar.endings.find(e => e.id === id) || null;
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
    el.modalBody.innerHTML =
      `<div class="em__chapter">${node.chapter || ''}</div>` +
      `<h2 class="em__title">${meta ? meta.title : ''}</h2>` +
      `<div class="em__en">${meta ? meta.en : ''}${isNew ? ' · 新解锁' : ''}</div>` +
      `<div class="em__body">${paragraphs(e.body)}</div>` +
      `<blockquote class="em__epi">${e.epilogue}</blockquote>` +
      `<div class="em__actions">` +
        `<button class="btn btn--ghost" data-act="restart">重历此生</button>` +
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
  }

  /* ========== 书籍推荐面板（新增）========== */

  function renderBooks(highlight) {
    if (!currentChar || !currentChar.books || !currentChar.books.length) {
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
        `<div class="blib ${lib.available ? '' : 'blib--unavail'}">
           <span class="blib__icon">📚</span>
           <span class="blib__name">${lib.name}</span>
           <span class="blib__loc">${lib.location}</span>
           <span class="blib__call">索书号：${lib.callNumber}</span>
         </div>`
      ).join('');

      card.innerHTML =
        `<div class="bc__main">` +
          `<h3 class="bc__title">${book.title}</h3>` +
          `<div class="bc__meta">${book.author} · ${book.publisher} (${book.year}) · ISBN ${book.isbn}</div>` +
          `<p class="bc__summary">${book.summary}</p>` +
          (book.libraries && book.libraries.length
            ? `<div class="bc__libraries"><strong style="font-size:.82rem;color:#5a4a32;">🏛 馆藏信息</strong>${libHtml}</div>`
            : '') +
        `</div>`;

      if (highlight) {
        card.style.animation = `rise .4s ease ${idx * 0.12}s both`;
      }
      el.booksList.appendChild(card);
    });
    if (window.Motion) Motion.refresh();
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

    // Hub 内事件
    el.startBtn.addEventListener('click', () => {
      document.getElementById('char-grid').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // 返回长廊按钮
    el.backBtn.addEventListener('click', () => Router.goHome());

    // 导航栏
    el.navHome.addEventListener('click', (ev) => { ev.preventDefault(); Router.goHome(); });

    // 重置进度
    el.resetBtn.addEventListener('click', () => {
      if (!confirm(`确定要拂去「${currentChar ? currentChar.meta.title : ''}」的所有已解锁结局、重头再来吗？`)) return;
      state.unlocked.clear();
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
      if (ev.key === '1') { const c = el.choices.querySelector('.choice'); if (c) c.click(); }
      if (ev.key === '2') { const cs = el.choices.querySelectorAll('.choice'); if (cs[1]) cs[1].click(); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
