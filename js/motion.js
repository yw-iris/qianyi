/* ============================================================
 *  千载一瞬 · 动态设计层（参考 k95.it 的动效技术，国风化表达）
 *  - 滚动揭示（IntersectionObserver）
 *  - 顶部滚动进度条
 *  - 磁吸交互（按钮 / 卡片）
 *  - 自定义光标（桌面端，墨-ring）
 *  - 走马灯分隔带
 *  - 页面转场（进入/离开角色时的墨色幕布）
 *  - Hero 视差
 *  全部纯原生实现，无外部依赖；尊重 reduce-motion 偏好。
 * ============================================================ */
(function (global) {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  let io = null;          // IntersectionObserver
  let cursor = null, cursorReady = false;
  let progressBar = null;
  let cover = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* 走马灯内容：历史相关的名言警句（不止一句） */
  const HISTORY_QUOTES = [
    '历史不是过去，它是选择留下的形状',
    '前事之不忘，后事之师也 ——《史记》',
    '以古为镜，可以知兴替 ——唐太宗',
    '观今宜鉴古，无古不成今 ——《增广贤文》',
    '欲知大道，必先为史 ——龚自珍',
    '人事有代谢，往来成古今 ——孟浩然',
    '千古兴亡多少事，悠悠，不尽长江滚滚流 ——辛弃疾',
    '青山依旧在，几度夕阳红 ——《三国演义》',
    '鉴于往事，有资于治道 ——《资治通鉴》',
    '往者不可谏，来者犹可追 ——《论语》',
    '温故而知新，可以为师矣 ——《论语》'
  ];

  /* ---------- 初始化 ---------- */
  function init() {
    if (reduceMotion) { document.documentElement.classList.add('reduce-motion'); }

    // 创建全局元素
    progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);

    if (!isTouch && !reduceMotion) {
      cursor = document.createElement('div');
      cursor.className = 'cursor';
      document.body.appendChild(cursor);
      cursorReady = true;
      initCursor();
    }

    // 转场幕布
    cover = document.createElement('div');
    cover.className = 'stage-cover';
    cover.innerHTML = '<span class="stage-cover__seal">千载<br>一瞬</span>';
    document.body.appendChild(cover);

    // 滚动揭示
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    // 滚动监听（进度 + 视差，rAF 节流）
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { onScroll(); ticking = false; });
    }, { passive: true });

    onScroll();
    refresh();

    // 自动构建走马灯（若存在容器）
    const mt = document.getElementById('marquee-track');
    if (mt) buildMarquee(HISTORY_QUOTES, mt);
  }

  /* ---------- 滚动揭示：观察新元素 ---------- */
  function refresh(root) {
    if (!io) return;
    const scope = root || document;
    scope.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => io.observe(el));
  }

  /* ---------- 滚动进度 + 视差 ---------- */
  function onScroll() {
    const st = window.pageYOffset || document.documentElement.scrollTop;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) progressBar.style.width = (h > 0 ? (st / h) * 100 : 0) + '%';

    // Hero 视差
    const hero = document.querySelector('.hub-hero');
    if (hero && st < window.innerHeight) {
      hero.style.setProperty('--py', (st * 0.12).toFixed(1) + 'px');
    }
  }

  /* ---------- 自定义光标 ---------- */
  function initCursor() {
    let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    let tx = cx, ty = cy;
    const targets = 'a, button, .choice, .char-card, .ecard, .book-card, .canvas-wrap';

    document.addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      const t = e.target.closest(targets);
      cursor.classList.toggle('is-hover', !!t);
    });
    document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
    document.addEventListener('mouseenter', () => cursor.style.opacity = '');

    const loop = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ---------- 磁吸：绑定到按钮/卡片 ---------- */
  function bindMagnetic(root) {
    const scope = root || document;
    scope.querySelectorAll('.btn, .char-card, .ecard').forEach((el) => {
      if (el.__mag || isTouch || reduceMotion) return;
      el.__mag = true;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${mx * 0.10}px, ${my * 0.16}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- 页面转场：墨色幕布 ---------- */
  async function coverSwap(fn) {
    if (reduceMotion || !cover) { if (fn) await fn(); return; }
    cover.style.transition = 'none';
    cover.style.transform = 'translateY(100%)';
    void cover.offsetWidth;            // 强制重排
    cover.style.transition = '';
    cover.classList.add('is-active');
    cover.style.transform = 'translateY(0)';
    await wait(560);
    if (fn) await fn();
    await wait(80);
    cover.style.transform = 'translateY(-100%)';
    await wait(620);
    cover.classList.remove('is-active');
    cover.style.transition = 'none';
    cover.style.transform = 'translateY(100%)';
  }

  /* ---------- 走马灯（可选外部调用，自动构建）---------- */
  function buildMarquee(quotes, container) {
    const el = container || document.getElementById('marquee-track');
    if (!el) return;
    const list = (Array.isArray(quotes) ? quotes : [quotes]).filter(Boolean);
    if (!list.length) return;
    const set = list.map((q) =>
      `<span class="marquee__item">${q}</span>` +
      `<span class="marquee__sep" aria-hidden="true">◆</span>`
    ).join('');
    el.innerHTML = set + set; // 重复两份以无缝循环
  }

  /* ---------- 对外 API ---------- */
  global.Motion = {
    init,
    refresh,
    bindMagnetic,
    coverSwap,
    buildMarquee
  };

  document.addEventListener('DOMContentLoaded', init);
})(window);
