/* ============================================================
 *  千载一瞬 · 路由 / 角色加载器
 *  管理人物长廊(Hub)与抉择之台(Stage)之间的 SPA 切换
 *  加载 js/characters/ 下的角色模块，注入 app.js
 * ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 角色注册表 ---------- */
  const REGISTRY = [
    {
      id: 'ximeng',
      name: '王希孟',
      en: 'WANG XIMENG',
      era: '北宋',
      year: '1096–?',
      tag: '十八岁天才画师',
      color: '#2e7d6b',
      script: 'js/characters/ximeng.js',
      thumb: 'assets/paintings/qianli_4k.png'
    },
    {
      id: 'xizhi',
      name: '王羲之',
      en: 'WANG XIZHI',
      era: '东晋',
      year: '303–361',
      tag: '书圣 · 兰亭一序',
      color: '#3a6b8a',
      script: 'js/characters/xizhi.js',
      thumb: 'assets/images/lanting_thumb.jpg'
    },
    {
      id: 'yanzhenqing',
      name: '颜真卿',
      en: 'YAN ZHENQING',
      era: '唐',
      year: '709–785',
      tag: '忠烈 · 颜筋柳骨',
      color: '#a8422e',
      script: 'js/characters/yanzhenqing.js',
      thumb: 'assets/images/jizhi_thumb.jpg'
    }
    /* 后续添加新角色只需在此追加一条：
     * { id: 'xxx', name: '...', en: '...', era: '...', script: 'js/characters/xxx.js', ... }
     */
  ];

  /* 当前状态 */
  let currentChar = null;       // 已加载的角色对象
  let currentView = 'hub';      // 'hub' | 'stage'

  /* 回调：由 app.js 在初始化时设置 */
  let onEnterStage = null;
  let onLeaveStage = null;

  /* ---------- 公开 API ---------- */

  /** 获取所有已注册角色（用于 Hub 渲染卡片）*/
  function getRegistry() { return REGISTRY; }

  /** 获取当前角色 */
  function getCurrent() { return currentChar; }

  /**
   * 加载一个角色并切换到抉择之台
   * @param {string} charId - 角色标识，如 'ximeng'
   * @returns {Promise<object>} 已加载的完整角色对象
   */
  async function enterCharacter(charId) {
    const entry = REGISTRY.find(r => r.id === charId);
    if (!entry) throw new Error(`[Router] 未注册角色: ${charId}`);

    // 如果脚本已在 window.CHARACTERS 中，直接取用
    if (!window.CHARACTERS || !window.CHARACTERS[charId]) {
      await loadScript(entry.script);
    }
    currentChar = window.CHARACTERS[charId];
    if (!currentChar) throw new Error(`[Router] ${entry.script} 未导出 CHARACTERS.${charId}`);
    currentView = 'stage';
    history.replaceState(null, '', '#stage/' + charId);
    const swap = () => { if (onEnterStage) onEnterStage(currentChar); };
    if (window.Motion) await window.Motion.coverSwap(swap);
    else swap();
    return currentChar;
  }

  /** 返回 Hub 长廊 */
  function goHome() {
    currentView = 'hub';
    history.replaceState(null, '', '#');
    const swap = () => { if (onLeaveStage) onLeaveStage(); renderHub(); };
    if (window.Motion) window.Motion.coverSwap(swap);
    else swap();
  }

  /* ---------- Hash 路由恢复（页面刷新后自动进入角色）---------- */

  /**
   * 初始化时调用：检查 URL hash，若为 #stage/<charId> 则自动进入角色
   * 需在 DOMContentLoaded 后、app.js init() 中调用
   */
  function initFromHash() {
    const hash = location.hash;  // 如 "#stage/ximeng"
    const m = hash.match(/^#stage\/([a-zA-Z0-9_]+)$/);
    if (m) {
      enterCharacter(m[1]).catch(err => console.warn('[Router] hash 恢复失败:', err));
      return true;
    }
    renderHub(); // 默认显示长廊
    return false;
  }

  // 监听浏览器前进/后退
  window.addEventListener('hashchange', () => {
    const hash = location.hash;
    if (!hash || hash === '#') { goHome(); return; }
    const m = hash.match(/^#stage\/([a-zA-Z0-9_]+)$/);
    if (m) enterCharacter(m[1]).catch(() => {});
  });

  /** 设置回调 */
  function setCallbacks(opts) {
    onEnterStage = opts.onEnterStage || null;
    onLeaveStage = opts.onLeaveStage || null;
  }

  /* ---------- Hub 页面渲染 ---------- */

  function renderHub() {
    const hubEl = document.getElementById('hub-section');
    const stageEl = document.getElementById('stage');
    if (hubEl) hubEl.style.display = '';
    if (stageEl) stageEl.style.display = 'none';
    updateTopbar(null);

    // 渲染角色卡片
    const grid = document.getElementById('char-grid');
    if (!grid) return;
    grid.innerHTML = '';

    REGISTRY.forEach((ch, idx) => {
      const card = createCharCard(ch, idx);
      card.addEventListener('click', () => enterCharacter(ch.id));
      grid.appendChild(card);
    });

    // 添加"敬请期待"占位卡
    for (let i = 0; i < 1; i++) {
      grid.appendChild(createPlaceholderCard(i));
    }

    // 动态元素的揭示与磁吸
    if (window.Motion) { Motion.refresh(); Motion.bindMagnetic(grid); }
  }

  function createCharCard(ch, idx) {
    const card = document.createElement('article');
    card.className = 'char-card reveal';
    card.style.setProperty('--accent', ch.color || '#c9a86a');
    card.style.setProperty('--i', idx);

    const progress = loadProgress(ch.id);
    const total = ch.id && window.CHARACTERS && window.CHARACTERS[ch.id]
      ? window.CHARACTERS[ch.id].endings.length : '?';

    card.innerHTML =
      `<div class="cc__no">${String(idx + 1).padStart(2, '0')}</div>` +
      `<div class="cc__thumb"><img src="${ch.thumb}" alt="${ch.name}" loading="lazy" /></div>` +
      `<div class="cc__info">` +
        `<div class="cc__era">${ch.era} · ${ch.year || ''}</div>` +
        `<h3 class="cc__name">${ch.name}</h3>` +
        `<div class="cc__en">${ch.en}</div>` +
        `<p class="cc__tag">${ch.tag}</p>` +
      `</div>` +
      `<div class="cc__progress">` +
        `<span>已解锁 <strong>${progress}</strong> / ${total}</span>` +
        `<div class="cc__bar"><div class="cc__fill" style="width:${total === '?' ? 0 : (progress/total*100)}%"></div></div>` +
      `</div>`;
    return card;
  }

  function createPlaceholderCard(idx) {
    const card = document.createElement('article');
    card.className = 'char-card char-card--locked';
    card.innerHTML =
      `<div class="cc__no">？</div>` +
      `<div class="cc__thumb cc__thumb--placeholder">` +
        `<span>更多古人<br/>敬请期待</span></div>` +
      `<div class="cc__info">` +
        `<div class="cc__era">— · —</div>` +
        `<h3 class="cc__name">未解锁</h3>` +
        `<div class="cc__en">COMING SOON</div>` +
        `<p class="cc__tag">待续</p>` +
      `</div>`;
    return card;
  }

  /* ---------- 进度读取（通用）---------- */

  function loadProgress(charId) {
    try {
      const key = charId + '_endings_v1';
      return JSON.parse(localStorage.getItem(key) || '[]').length;
    } catch (e) { return 0; }
  }

  /* ---------- 顶栏更新 ---------- */

  function updateTopbar(charMeta) {
    const brand = document.querySelector('.brand');
    if (!brand) return;
    if (charMeta) {
      brand.innerHTML = `${charMeta.title}<span class="brand__en">${charMeta.en}</span>`;
    } else {
      brand.innerHTML = `千载一瞬<span class="brand__en">THE ETERNAL CHOICE</span>`;
    }
  }

  /* ---------- 工具：动态加载脚本 ---------- */

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = s.dataset.src = src;
      s.async = false;  // 保证执行顺序
      s.onload = resolve;
      s.onerror = () => reject(new Error(`[Router] 加载失败: ${src}`));
      document.head.appendChild(s);
    });
  }

  /* ---------- 暴露 ---------- */
  global.Router = {
    getRegistry,
    getCurrent,
    enterCharacter,
    goHome,
    setCallbacks,
    renderHub,
    updateTopbar,
    initFromHash
  };

})(window);
