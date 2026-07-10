/* ============================================================
 *  千载一瞬 · 结局分享卡片（Canvas 合成 · 纯前端）
 *  - 画作背景 + 人物名 + 结局标题 + 引言 + 水印
 *  - 点击结局弹窗的"生成分享卡片"按钮调用 ShareCard.open(data)
 *  - 同源图片（本地 webp）直接绘制；Wikimedia 远程图尝试 crossOrigin，
 *    失败或污染画布则降级为色块，保证始终可下载
 * ============================================================ */
(function (global) {
  'use strict';

  /* 各角色用于分享卡的高清画作（本地优先，远程用 Wikimedia 缩略）*/
  const SHARE_IMG = {
    ximeng:       'assets/images/qianli.webp',
    xizhi:        'assets/images/lanting.webp',
    yanzhenqing:  'assets/images/jizhi.webp',
    zeduan:       'https://commons.wikimedia.org/wiki/Special:FilePath/' + enc('清明上河图.jpg') + '?width=720',
    liyu:         'https://commons.wikimedia.org/wiki/Special:FilePath/' + enc('Li_Yu_scth.jpg') + '?width=720',
    sushi:        'https://commons.wikimedia.org/wiki/Special:FilePath/' + enc('Su_Shi.jpg') + '?width=720',
    wanganshi:    'https://commons.wikimedia.org/wiki/Special:FilePath/' + enc('Wang_Anshi.jpg') + '?width=720'
  };
  function enc(s) { return encodeURIComponent(s); }

  /* ---------- 工具 ---------- */
  function hexA(hex, a) {
    const h = (hex || '#c9a86a').replace('#', '');
    const r = parseInt(h.substring(0, 2), 16),
          g = parseInt(h.substring(2, 4), 16),
          b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function loadImage(url) {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      let done = false;
      const finish = (ok) => { if (!done) { done = true; resolve(ok ? img : null); } };
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      setTimeout(() => finish(false), 6000); // 超时降级
      img.src = url;
    });
  }

  function wrapText(ctx, text, maxWidth, maxLines) {
    const chars = (text || '').split('');
    const lines = []; let cur = '';
    for (const ch of chars) {
      const test = cur + ch;
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur); cur = ch;
        if (lines.length >= maxLines) break;
      } else { cur = test; }
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    if (lines.length >= maxLines) {
      let last = lines[maxLines - 1] || '';
      while (last.length && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = last + '…';
    }
    return lines;
  }

  /* ---------- 绘制 ---------- */
  const W = 1080, H = 1350;

  function drawScene(ctx, color, data, img) {
    // 背景：画作 cover 或 降级色块
    if (img && img.width) {
      const scale = Math.max(W / img.width, H / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1e1812'); g.addColorStop(1, '#2a2118');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = hexA(color, 0.14); ctx.fillRect(0, 0, W, H);
    }

    // 顶部遮罩（kicker 可读）
    let top = ctx.createLinearGradient(0, 0, 0, 280);
    top.addColorStop(0, 'rgba(10,8,5,.74)'); top.addColorStop(1, 'rgba(10,8,5,0)');
    ctx.fillStyle = top; ctx.fillRect(0, 0, W, 280);

    // 底部主遮罩
    let bot = ctx.createLinearGradient(0, 540, 0, H);
    bot.addColorStop(0, 'rgba(8,6,4,0)');
    bot.addColorStop(.42, 'rgba(8,6,4,.55)');
    bot.addColorStop(1, 'rgba(8,6,4,.95)');
    ctx.fillStyle = bot; ctx.fillRect(0, 540, W, H - 540);

    ctx.textAlign = 'center';
    try { ctx.letterSpacing = '8px'; } catch (e) {}

    // kicker
    ctx.fillStyle = color;
    ctx.font = '600 30px "Noto Serif SC","Songti SC","STSong",serif';
    ctx.fillText('千载一瞬 · THE ETERNAL CHOICE', W / 2, 150);
    try { ctx.letterSpacing = '0px'; } catch (e) {}

    // 姓名
    ctx.fillStyle = '#f3ead4';
    ctx.font = '600 132px "Noto Serif SC","Songti SC","STSong",serif';
    ctx.fillText(data.name || '', W / 2, 1020);

    // 年代
    if (data.era) {
      ctx.fillStyle = hexA(color, .92);
      ctx.font = '32px "Noto Serif SC","Songti SC","STSong",serif';
      ctx.fillText(data.era, W / 2, 1082);
    }

    // 结局标题
    ctx.fillStyle = color;
    ctx.font = '600 52px "Noto Serif SC","Songti SC","STSong",serif';
    ctx.fillText('「' + (data.endingTitle || '') + '」', W / 2, 1162);

    // 引言（居中，最多 3 行）
    ctx.fillStyle = 'rgba(243,234,212,.82)';
    ctx.font = '30px "Noto Serif SC","Songti SC","STSong",serif';
    const lines = wrapText(ctx, data.epilogue || '', W - 150, 3);
    let y = 1235;
    lines.forEach(l => { ctx.fillText(l, W / 2, y); y += 46; });

    // 水印
    ctx.fillStyle = 'rgba(201,168,106,.72)';
    ctx.font = '24px "Noto Serif SC","Songti SC","STSong",serif';
    ctx.fillText('千载一瞬 · 你替古人做出了选择', W / 2, 1332);
  }

  function buildCanvas(data) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const color = data.color || '#c9a86a';
    return loadImage(SHARE_IMG[data.charId]).then(img => {
      drawScene(ctx, color, data, img);
      // 检测画布是否被远程图污染 → 是则无图重绘，保证可下载
      let tainted = false;
      try { c.toDataURL('image/png'); } catch (e) { tainted = true; }
      if (tainted) {
        ctx.clearRect(0, 0, W, H);
        drawScene(ctx, color, data, null);
      }
      return c;
    });
  }

  /* ---------- 弹窗 UI ---------- */
  function shareText(data) {
    return `我在「千载一瞬」替${data.name}走到了「${data.endingTitle}」这个结局。你也来试试，看你会把古人带向哪条路。`;
  }

  function shareUrl(data) {
    return `https://yw-iris.github.io/qianyi/index.html#stage/${data.charId}`;
  }

  function showOverlay(canvas, data) {
    let modal = document.getElementById('sharecard-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sharecard-modal';
      modal.className = 'sharecard-modal';
      modal.innerHTML =
        '<div class="sharecard__panel">' +
          '<button class="sharecard__close" aria-label="关闭">×</button>' +
          '<div class="sharecard__canvas-wrap"></div>' +
          '<div class="sharecard__actions">' +
            '<button class="btn btn--solid" data-act="download">下载卡片</button>' +
            '<button class="btn btn--ghost" data-act="play">去体验 TA 的故事</button>' +
          '</div>' +
          '<div class="sharecard__share">' +
            '<span class="sharecard__share-label">分享到：</span>' +
            '<button class="sharecard__share-btn" data-act="wechat">微信</button>' +
            '<button class="sharecard__share-btn" data-act="weibo">微博</button>' +
          '</div>' +
          '<p class="sharecard__tip">长按图片也可保存 · 分享给朋友，看他们解锁谁的结局</p>' +
        '</div>';
      document.body.appendChild(modal);
      modal.querySelector('.sharecard__close').addEventListener('click', () => modal.classList.remove('show'));
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
    }

    const wrap = modal.querySelector('.sharecard__canvas-wrap');
    wrap.innerHTML = '';
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.display = 'block';
    canvas.style.borderRadius = '4px';
    wrap.appendChild(canvas);

    const txt = shareText(data);
    const url = shareUrl(data);

    modal.querySelector('[data-act="download"]').onclick = () => {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `千载一瞬-${data.name}-${data.endingTitle}.png`;
        document.body.appendChild(a); a.click(); a.remove();
      } catch (e) {
        alert('当前浏览器限制了图片导出，请尝试长按图片保存。');
      }
    };
    modal.querySelector('[data-act="play"]').onclick = () => {
      modal.classList.remove('show');
      location.href = 'index.html#stage/' + data.charId;
    };

    /* 微信：复制文本到剪贴板 + 提示（微信不支持 intent URL，靠用户粘贴）*/
    modal.querySelector('[data-act="wechat"]').onclick = () => {
      try {
        navigator.clipboard.writeText(txt + ' ' + url).then(() => {
          alert('已复制分享文案到剪贴板！\n打开微信 → 粘贴发送给好友，对方点链接即可体验。');
        }).catch(() => {
          prompt('请手动复制这段文案，发送给微信好友：', txt + ' ' + url);
        });
      } catch (e) {
        prompt('请手动复制这段文案，发送给微信好友：', txt + ' ' + url);
      }
    };

    /* 微博：标准 intent URL */
    modal.querySelector('[data-act="weibo"]').onclick = () => {
      const wb = 'https://service.weibo.com/share/share.php?' +
        'title=' + encodeURIComponent(txt) +
        '&url=' + encodeURIComponent(url) +
        '&pic=&searchPic=false&style=simple';
      window.open(wb, '_blank', 'noopener');
    };

    modal.classList.add('show');
  }

  function open(data) {
    buildCanvas(data).then(canvas => showOverlay(canvas, data))
      .catch(() => alert('分享卡片生成失败，请稍后再试。'));
  }

  global.ShareCard = { open };
})(window);
