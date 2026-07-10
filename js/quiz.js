/* ============================================================
 *  千载一瞬 · 人格测试逻辑（纯前端）
 *  九道题 → 累加各古人得分 → 取最高者为匹配结果
 * ============================================================ */
(function () {
  'use strict';

  const enc = (s) => encodeURIComponent(s);

  /* ---------- 七位古人画像与人格简介 ---------- */
  const PEOPLE = {
    ximeng: {
      name: '王希孟', en: 'WANG XIMENG', era: '北宋 · 1096–?', tag: '十八岁天才画师', color: '#2e7d6b',
      img: 'assets/images/qianli.webp',
      blurb: '你像王希孟——纯粹、炽热，把整个少年心气都泼进一卷青绿里。你认定一件事，便愿以全部性命去成全它，宁短勿庸。'
    },
    xizhi: {
      name: '王羲之', en: 'WANG XIZHI', era: '东晋 · 303–361', tag: '书圣 · 兰亭一序', color: '#3a6b8a',
      img: 'assets/images/lanting.webp',
      blurb: '你像王羲之——风流蕴藉，懂得在规矩与自在之间从容游走。你珍惜当下，也最懂朋友与山水之乐，把人生过成了一曲行云流水。'
    },
    yanzhenqing: {
      name: '颜真卿', en: 'YAN ZHENQING', era: '唐 · 709–785', tag: '忠烈 · 颜筋柳骨', color: '#a8422e',
      img: 'assets/images/jizhi.webp',
      blurb: '你像颜真卿——铁骨铮铮，把家国之痛一笔一笔写进笔墨。你认准的道义，宁折不弯；你爱的人，你用一生去护。'
    },
    zeduan: {
      name: '张择端', en: 'ZHANG ZEDUAN', era: '北宋 · 1085–?', tag: '界画圣手 · 清明上河', color: '#2e7d6b',
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/' + enc('清明上河图.jpg') + '?width=400',
      blurb: '你像张择端——冷静而温柔的观察者，在熙攘人间里看见每一个普通人的悲欢。你记录世界，而非评判它，喧嚣里自有一双清明眼。'
    },
    liyu: {
      name: '李煜', en: 'LI YU', era: '南唐 · 937–978', tag: '词中之帝 · 亡国之君', color: '#7a4a6b',
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/' + enc('Li_Yu_scth.jpg') + '?width=400',
      blurb: '你像李煜——心比天软，情比海深。你把这世上最疼的离别与无常，都酿成了千古绝唱。柔软，原是你最锋利的笔。'
    },
    sushi: {
      name: '苏轼', en: 'SU SHI', era: '北宋 · 1037–1101', tag: '东坡居士 · 豪放词祖', color: '#3a6b8a',
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/' + enc('Su_Shi.jpg') + '?width=400',
      blurb: '你像苏轼——跌宕一生却始终豁达。无论被贬到哪里，你都能把日子过成诗，把风雨笑纳为清风。此心安处，便是吾乡。'
    },
    wanganshi: {
      name: '王安石', en: 'WANG ANSHI', era: '北宋 · 1021–1086', tag: '拗相公 · 熙宁变法', color: '#a8422e',
      img: 'https://commons.wikimedia.org/wiki/Special:FilePath/' + enc('Wang_Anshi.jpg') + '?width=400',
      blurb: '你像王安石——孤光自照，明知孤独也要为苍生改天换地。你认定的事，九死未悔；你承受的误解，都化作了历史的回响。'
    }
  };

  /* ---------- 题库：每选项 to=主匹配古人（权重2），to2=次匹配（权重1）---------- */
  const QUESTIONS = [
    {
      q: '一个闲下来的周末，你最想怎么过？',
      options: [
        { t: '关起门来写字作画，与笔墨独处', to: 'ximeng' },
        { t: '呼朋引伴，流觞饮酒、谈笑终日', to: 'xizhi' },
        { t: '上街逛集市，看人间烟火百态', to: 'zeduan' },
        { t: '一个人发呆，想些说不清的心事', to: 'liyu' }
      ]
    },
    {
      q: '面对一个你觉得不公的制度，你会？',
      options: [
        { t: '上书直谏，宁可触怒权贵也不沉默', to: 'yanzhenqing' },
        { t: '著文讥讽，嬉笑怒骂中藏锋芒', to: 'sushi' },
        { t: '推行变法，从根子上把它改掉', to: 'wanganshi' },
        { t: '沉默，把不平悄悄写进词里', to: 'liyu' }
      ]
    },
    {
      q: '你最希望被后人记住的作品是？',
      options: [
        { t: '一卷惊艳千古的青绿山水', to: 'ximeng' },
        { t: '一篇天下第一的行书', to: 'xizhi' },
        { t: '一篇蘸血带泪的祭文', to: 'yanzhenqing' },
        { t: '一幅看见众生的市井长卷', to: 'zeduan' }
      ]
    },
    {
      q: '人生跌到谷底时，你靠什么撑过来？',
      options: [
        { t: '寄情书画，越难越要画下去', to: 'ximeng' },
        { t: '寄情山水与老友，换个心境', to: 'xizhi' },
        { t: '坚信自己是对的，苦难只是代价', to: 'wanganshi' },
        { t: '把苦难酿成词句，写给自己', to: 'sushi', to2: 'liyu' }
      ]
    },
    {
      q: '别人最可能这样评价你：',
      options: [
        { t: '天才，少年成名', to: 'ximeng' },
        { t: '风流，活得通透', to: 'sushi' },
        { t: '拗，认死理', to: 'wanganshi' },
        { t: '柔善，不懂周旋', to: 'liyu' },
        { t: '忠烈，铁骨铮铮', to: 'yanzhenqing' }
      ]
    },
    {
      q: '你更想被历史记住为？',
      options: [
        { t: '一位艺术天才', to: 'ximeng' },
        { t: '一代书法宗师', to: 'xizhi' },
        { t: '一位忠臣义士', to: 'yanzhenqing' },
        { t: '一个市井观察者', to: 'zeduan' },
        { t: '一位词人', to: 'liyu' },
        { t: '一位豪放文豪', to: 'sushi' },
        { t: '一位改革家', to: 'wanganshi' }
      ]
    },
    {
      q: '理想的居所是？',
      options: [
        { t: '山林茅屋，与鹤为伴', to: 'xizhi', to2: 'ximeng' },
        { t: '江南小院，竹影清风', to: 'sushi' },
        { t: '京城官邸，离权力中心近', to: 'wanganshi' },
        { t: '故都宫阙，哪怕已成空城', to: 'liyu' }
      ]
    },
    {
      q: '对"功名"二字，你真正在意的是？',
      options: [
        { t: '无意功名，只爱笔下江山', to: 'ximeng' },
        { t: '顺其自然，不失本心即可', to: 'xizhi', to2: 'sushi' },
        { t: '功名是手段，要为苍生谋', to: 'wanganshi' },
        { t: '身不由己，被推上高位', to: 'liyu' },
        { t: '以功名证一生的清白', to: 'yanzhenqing' }
      ]
    },
    {
      q: '假如能重来一次，你最想改写什么？',
      options: [
        { t: '愿一生只画完那卷江山', to: 'ximeng' },
        { t: '愿永和九年那场醉永不散', to: 'xizhi' },
        { t: '愿山河无恙，至亲都还在', to: 'yanzhenqing' },
        { t: '愿看尽汴京繁华永不褪色', to: 'zeduan' },
        { t: '愿不做皇帝，只做词人', to: 'liyu' },
        { t: '愿贬谪路上少些风雨', to: 'sushi' },
        { t: '愿新法终被后世理解', to: 'wanganshi' }
      ]
    }
  ];

  /* ---------- 状态 ---------- */
  const scores = {};
  Object.keys(PEOPLE).forEach(k => scores[k] = 0);
  let current = 0;

  /* ---------- DOM ---------- */
  const screens = {
    start: document.getElementById('screen-start'),
    quiz: document.getElementById('screen-quiz'),
    result: document.getElementById('screen-result')
  };
  const host = document.getElementById('quiz-q-host');
  const fill = document.getElementById('quiz-progress-fill');
  const ptext = document.getElementById('quiz-progress-text');
  const ppct = document.getElementById('quiz-progress-pct');

  function show(name) {
    Object.values(screens).forEach(s => s.hidden = true);
    screens[name].hidden = false;
    screens[name].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- 渲染单题 ---------- */
  function renderQuestion() {
    const item = QUESTIONS[current];
    const total = QUESTIONS.length;
    const p = Math.round((current) / total * 100);
    fill.style.width = p + '%';
    ptext.textContent = `第 ${current + 1} / ${total} 题`;
    ppct.textContent = p + '%';

    const q = document.createElement('div');
    q.className = 'quiz-q';
    q.innerHTML =
      `<div class="quiz-q__no">QUESTION ${String(current + 1).padStart(2, '0')}</div>` +
      `<h2 class="quiz-q__text">${item.q}</h2>` +
      `<div class="quiz-options"></div>`;

    const optHost = q.querySelector('.quiz-options');
    item.options.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'quiz-opt';
      b.innerHTML = `<span class="quiz-opt__no">${i + 1}</span><span class="quiz-opt__txt">${o.t}</span>`;
      b.addEventListener('click', () => choose(o));
      optHost.appendChild(b);
    });

    if (current > 0) {
      const back = document.createElement('button');
      back.className = 'quiz-q__back';
      back.textContent = '← 上一题';
      back.addEventListener('click', () => { current--; renderQuestion(); });
      q.appendChild(back);
    }

    host.innerHTML = '';
    host.appendChild(q);
  }

  function choose(o) {
    scores[o.to] += 2;
    if (o.to2) scores[o.to2] += 1;
    current++;
    if (current >= QUESTIONS.length) {
      fill.style.width = '100%'; ppct.textContent = '100%';
      renderResult();
    } else {
      renderQuestion();
    }
  }

  /* ---------- 计算并渲染结果 ---------- */
  function renderResult() {
    // 取分数最高（并列时取数组顺序靠前者，保证稳定）
    let best = null, bestScore = -1;
    Object.keys(PEOPLE).forEach(k => {
      if (scores[k] > bestScore) { bestScore = scores[k]; best = k; }
    });
    // 次高
    let second = null, secondScore = -1;
    Object.keys(PEOPLE).forEach(k => {
      if (k !== best && scores[k] > secondScore) { secondScore = scores[k]; second = k; }
    });

    const p = PEOPLE[best];
    const s = PEOPLE[second];
    const hostEl = document.getElementById('quiz-result-host');

    const imgHtml = p.img
      ? `<img class="quiz-result__img" src="${p.img}" alt="${p.name}" loading="lazy"
            onerror="this.outerHTML='<div class=&quot;quiz-result__img quiz-result__img--fallback&quot;>${p.name}</div>'" />`
      : `<div class="quiz-result__img quiz-result__img--fallback">${p.name}</div>`;

    hostEl.innerHTML =
      `<div class="quiz-result__kicker">YOUR ANCIENT SOUL IS</div>` +
      `<div class="quiz-result__card">` +
        imgHtml +
        `<div class="quiz-result__body">` +
          `<div class="quiz-result__era">${p.era} · ${p.en}</div>` +
          `<h2 class="quiz-result__name">${p.name}</h2>` +
          `<div class="quiz-result__tag">${p.tag}</div>` +
          `<p class="quiz-result__blurb">${p.blurb}</p>` +
          (s ? `<div class="quiz-result__second">你也可能像 <b>${s.name}</b> · ${s.tag}</div>` : '') +
        `</div>` +
      `</div>` +
      `<div class="quiz-result__actions">` +
        `<a class="quiz-btn quiz-btn--solid" href="index.html#stage/${best}">去体验 ${p.name} 的故事 →</a>` +
        `<button class="quiz-btn quiz-btn--ghost" id="quiz-retry">再测一次</button>` +
      `</div>`;

    document.getElementById('quiz-retry').addEventListener('click', reset);
    show('result');
  }

  function reset() {
    Object.keys(scores).forEach(k => scores[k] = 0);
    current = 0;
    show('start');
  }

  /* ---------- 启动 ---------- */
  document.getElementById('quiz-start').addEventListener('click', () => {
    current = 0;
    show('quiz');
    renderQuestion();
  });
})();
