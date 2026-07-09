/* ============================================================
 *  千里江山图 · 3D / 2D 查看器
 *  - 优先 WebGL 三维：画卷贴于微曲面卷轴，叠加 6 块"尘"（自左至右 0~5）
 *  - WebGL 不可用时自动降级为平面画卷 + 6 道尘条（机制一致）
 *  - 每解锁一结局，擦除对应尘块（带过渡动画）
 *  - 全部擦净后开启完整三维观赏 / 触发完成回调
 *  - 支持上传真实图片替换
 * ============================================================ */
(function (global) {
  'use strict';

  const REGION_COUNT = 6; // 与 ENDINGS 数量一致

  class ScrollViewer {
    constructor(canvas, opts) {
      opts = opts || {};
      this.canvas = canvas;
      this.defaultSrc = opts.defaultSrc || 'assets/paintings/qianli_4k.png';
      this.onProgress = opts.onProgress || function () {};
      this.onComplete = opts.onComplete || function () {};
      this.regions = REGION_COUNT;
      this.progress = new Array(this.regions).fill(0); // 0=满尘 1=净
      this.target = new Array(this.regions).fill(0);
      this.dirty = true;
      this.complete = false;
      this.mode = null;

      // 双击缩放：开关式放大，到位后交还滚轮自由控制
      this._zoomed = false;    // 双击放大开关
      this._zoomDist = null;   // 目标取景距离；到位后置 null
      this._baseDist = 12;

      this._initMode();
      this.setPainting(this.defaultSrc, true);
      if (this.mode === '3d') {
        this._initDust();
        this._animate();
      }
      window.addEventListener('resize', () => this._onResize());
    }

    /* ---------- 选择渲染模式 ---------- */
    _initMode() {
      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas, antialias: true, alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.mode = '3d';
        this._initThree();
      } catch (e) {
        console.warn('[ScrollViewer] WebGL 不可用，降级为平面模式：', e && e.message);
        this.mode = '2d';
        this._initFallback2D();
      }
    }

    /* ============ 三维模式 ============ */
    _initThree() {
      const w = this.canvas.clientWidth || 800;
      const h = this.canvas.clientHeight || 400;
      this.renderer.setSize(w, h, false);

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
      this.camera.position.set(0, 0, 12);

      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.enablePan = true;          // 允许拖拽平移观赏画卷
      this.controls.screenSpacePanning = false; // 世界坐标平移，更自然
      this.controls.panSpeed = 0.8;
      this.controls.minDistance = 5;
      this.controls.maxDistance = 24;
      this.controls.minPolarAngle = Math.PI * 0.28;
      this.controls.maxPolarAngle = Math.PI * 0.72;
      this.controls.autoRotateSpeed = 0.9;
      this.controls.target.set(0, 0, 0);

      // 双击放大：打开居中弹窗展示画作全貌
      this._currentImageSrc = '';
      this.renderer.domElement.addEventListener('dblclick', () => this._openLightbox());

      this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const dir = new THREE.DirectionalLight(0xfff2dc, 0.7);
      dir.position.set(4, 6, 10);
      this.scene.add(dir);

      this.group = new THREE.Group();
      this.scene.add(this.group);
      this.clock = new THREE.Clock();
    }

    _initDust() {
      const W = 2048, H = 256;
      this.dustW = W; this.dustH = H;
      this.dustPre = document.createElement('canvas');
      this.dustPre.width = W; this.dustPre.height = H;
      this._paintDustPattern(this.dustPre.getContext('2d'), W, H);

      this.dustCanvas = document.createElement('canvas');
      this.dustCanvas.width = W; this.dustCanvas.height = H;
      this.dustTex = new THREE.CanvasTexture(this.dustCanvas);
      this.dustTex.minFilter = THREE.LinearFilter;
      this.dustTex.magFilter = THREE.LinearFilter;
      this._composeDust();
    }

    _paintDustPattern(ctx, W, H) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(150,138,112,0.32)';
      ctx.fillRect(0, 0, W, H);
      const blobs = 260;
      for (let i = 0; i < blobs; i++) {
        const x = Math.random() * W, y = Math.random() * H;
        const r = 6 + Math.random() * 60;
        const a = 0.05 + Math.random() * 0.22;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const tone = Math.random() < 0.5 ? '120,108,84' : '96,90,78';
        g.addColorStop(0, `rgba(${tone},${a})`);
        g.addColorStop(1, `rgba(${tone},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < 140; i++) {
        const x = Math.random() * W, y = Math.random() * H;
        const len = 10 + Math.random() * 70;
        const ang = (Math.random() - 0.5) * 0.6;
        ctx.strokeStyle = `rgba(70,62,50,${0.06 + Math.random() * 0.12})`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        ctx.stroke();
      }
      for (let i = 0; i < 2200; i++) {
        ctx.fillStyle = `rgba(60,52,40,${0.04 + Math.random() * 0.10})`;
        ctx.fillRect(Math.random() * W, Math.random() * H, 1.2, 1.2);
      }
    }

    _composeDust() {
      const ctx = this.dustCanvas.getContext('2d');
      const W = this.dustW, H = this.dustH;
      ctx.clearRect(0, 0, W, H);
      const strip = W / this.regions;
      for (let i = 0; i < this.regions; i++) {
        const p = this.progress[i];
        if (p >= 1) continue;
        const alpha = (1 - p);
        ctx.save();
        ctx.beginPath();
        ctx.rect(i * strip, 0, strip + 1, H);
        ctx.clip();
        ctx.globalAlpha = alpha;
        ctx.drawImage(this.dustPre, 0, 0, W, H);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      this.dustTex.needsUpdate = true;
    }

    setPainting(src, instant) {
      this._currentImageSrc = src; // 保存当前画作源供 lightbox 使用
      if (this.mode === '2d') { this._setFallbackImage(src); return; }
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(src, (tex) => {
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        tex.colorSpace = THREE.SRGBColorSpace;
        const img = tex.image;
        this.aspect = img.width / img.height;
        this._buildScroll(tex);
        if (instant) this._composeDust();
      }, undefined, () => {
        this._buildScroll(this._placeholderTexture());
      });
    }

    _placeholderTexture() {
      const c = document.createElement('canvas');
      c.width = 1024; c.height = Math.round(1024 / this.aspect);
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, c.height);
      g.addColorStop(0, '#e9dcc0'); g.addColorStop(1, '#cdbf9c');
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = 'rgba(46,125,107,0.5)';
      x.beginPath(); x.ellipse(c.width * 0.5, c.height * 0.6, c.width * 0.4, c.height * 0.3, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#7a2e22';
      x.font = `${Math.round(c.height * 0.22)}px serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('千里江山图', c.width / 2, c.height * 0.4);
      x.fillStyle = 'rgba(80,70,55,0.7)';
      x.font = `${Math.round(c.height * 0.1)}px serif`;
      x.fillText('（待更换为正式画卷）', c.width / 2, c.height * 0.62);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }

    _buildScroll(tex) {
      while (this.group.children.length) this.group.remove(this.group.children[0]);
      const totalW = 13;
      const totalH = totalW / this.aspect;
      const seg = 120;
      const curveAmt = Math.min(0.9, totalW * 0.05);
      const geo = new THREE.PlaneGeometry(totalW, totalH, seg, 2);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const t = x / (totalW / 2);
        pos.setZ(i, -curveAmt * (1 - t * t));
      }
      geo.computeVertexNormals();

      this.paintingMesh = new THREE.Mesh(geo,
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide }));
      this.group.add(this.paintingMesh);

      const dustMat = new THREE.MeshBasicMaterial({
        map: this.dustTex, transparent: true, opacity: 1, depthWrite: false
      });
      this.dustMesh = new THREE.Mesh(geo.clone(), dustMat);
      this.dustMesh.position.z = 0.02;
      this.group.add(this.dustMesh);

      const rodLen = totalH + 0.6;
      const rodGeo = new THREE.CylinderGeometry(0.32, 0.32, rodLen, 20);
      const rodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.8, metalness: 0.1 });
      const left = new THREE.Mesh(rodGeo, rodMat);
      left.rotation.z = Math.PI / 2;
      left.position.set(-totalW / 2 - 0.1, 0, 0);
      const right = left.clone();
      right.position.set(totalW / 2 + 0.1, 0, 0);
      this.group.add(left); this.group.add(right);

      const dist = Math.max(8, totalW * 0.62);
      this._baseDist = dist;
      this.camera.position.set(0, totalH * 0.15, dist);
      this.controls.minDistance = dist * 0.16;   // 允许更大的放大倍数
      this.controls.maxDistance = dist * 2.4;
      this.controls.update();
      // 记录初始机位与焦点，供退出放大弹窗时复位外层视角
      this._homePos = this.camera.position.clone();
      this._homeTarget = this.controls.target.clone();
      this._composeDust();
    }

    _animate() {
      const loop = () => {
        this._raf = requestAnimationFrame(loop);
        const dt = Math.min(0.05, this.clock.getDelta());
        let changed = false;
        for (let i = 0; i < this.regions; i++) {
          if (this.progress[i] < this.target[i]) {
            this.progress[i] = Math.min(1, this.progress[i] + dt * 1.1);
            changed = true;
          }
        }
        if (changed || this.dirty) { this._composeDust(); this.dirty = false; }
        if (!this.complete && this.target.every((t, i) => this.progress[i] >= 1)) {
          this.complete = true;
          this.controls.autoRotate = true;
          this.controls.minDistance = this._baseDist * 0.16;
          this.onComplete();
        }
        // 双击缩放：平滑逼近目标距离，到位后停止施加，交还滚轮自由控制
        if (this._zoomDist != null) {
          const off = this.camera.position.clone().sub(this.controls.target);
          const d = off.length();
          const nd = d + (this._zoomDist - d) * Math.min(1, dt * 5);
          if (Math.abs(nd - d) > 1e-3) {
            this.camera.position.copy(this.controls.target).add(off.setLength(nd));
          }
          if (Math.abs(nd - this._zoomDist) < 0.05) this._zoomDist = null;
        }
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
      };
      loop();
    }

    _onResize() {
      if (this.mode !== '3d') return;
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    }

    /* ---------- 复位视角：退出放大弹窗时调用，避免外层仍停留在放大/平移状态 ---------- */
    resetView() {
      this._zoomed = false;
      this._zoomDist = null;
      if (this.mode === '2d') {
        if (this.fallbackImg) this.fallbackImg.classList.remove('is-zoomed');
        return;
      }
      if (this.controls) {
        this.controls.autoRotate = false;
        if (this._homeTarget) this.controls.target.copy(this._homeTarget);
        if (this._homePos) this.camera.position.copy(this._homePos);
        this.controls.update();
      }
    }

    /* ---------- 双击放大：居中弹窗展示画卷全貌，支持缩放看局部 ---------- */
    _openLightbox() {
      const lb = document.getElementById('lightbox');
      if (!lb) return;
      const img = lb.querySelector('#lb-img');
      if (!img) return;
      // 优先使用当前加载的画作源；3D 模式下取纹理 URL，2D 取 fallback src
      let src = this._currentImageSrc || this.defaultSrc;
      if (this.mode === '2d' && this.fallbackImg) {
        src = this.fallbackImg.src || src;
      }
      img.src = src;
      const cap = lb.querySelector('#lb-caption');
      if (cap) cap.textContent = '滚轮缩放观察局部 · 拖拽平移 · 点击空白或按 ESC 退出';
      lb.classList.add('is-show');

      // 弹窗图片的缩放 / 平移状态
      let scale = 1, tx = 0, ty = 0, dragging = false, sx = 0, sy = 0, moved = false;
      const applyTransform = () => {
        // 取消入场动画的持久 transform，确保行内缩放/平移始终生效
        img.style.animation = 'none';
        img.classList.toggle('is-zoomed', scale > 1);
        img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      };
      const resetImg = () => {
        scale = 1; tx = 0; ty = 0; moved = false;
        img.style.transform = '';
        img.style.animation = '';
        img.classList.remove('is-zoomed');
      };

      const cleanup = () => {
        img.removeEventListener('wheel', onWheel);
        img.removeEventListener('pointerdown', onDown);
        img.removeEventListener('click', onImgClick);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        lb.removeEventListener('click', onBack);
        document.removeEventListener('keydown', onEsc);
      };
      const close = () => {
        lb.classList.remove('is-show');
        resetImg();                 // 清空弹窗图片的缩放/平移变换
        this.resetView();           // 复位外层 3D 视角，退出后不再残留放大状态
        cleanup();
      };

      // 滚轮缩放（阻止冒泡，避免误触发底层 3D 相机或页面缩放）
      const onWheel = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const f = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
        scale = Math.max(1, Math.min(5, scale * f));
        if (scale === 1) { tx = 0; ty = 0; }
        applyTransform();
      };
      // 放大后拖拽平移
      const onDown = (ev) => {
        if (scale <= 1) return;     // 未放大时点击图片用于关闭
        dragging = true; moved = false; sx = ev.clientX; sy = ev.clientY;
        if (img.setPointerCapture && ev.pointerId != null) {
          try { img.setPointerCapture(ev.pointerId); } catch (e) {}
        }
      };
      const onMove = (ev) => {
        if (!dragging) return;
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
        tx += dx; ty += dy; sx = ev.clientX; sy = ev.clientY;
        applyTransform();
      };
      const onUp = () => { dragging = false; };
      // 点击图片：未放大→关闭；已放大但仅轻点→关闭；拖拽平移→不关闭
      const onImgClick = () => {
        if (moved) { moved = false; return; }
        close();
      };
      // 点击背景关闭
      const onBack = (ev) => { if (ev.target === lb) close(); };
      const onEsc = (ev) => { if (ev.key === 'Escape') close(); };

      img.addEventListener('wheel', onWheel, { passive: false });
      img.addEventListener('pointerdown', onDown);
      img.addEventListener('click', onImgClick);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      lb.addEventListener('click', onBack);
      document.addEventListener('keydown', onEsc);

      const closeBtn = lb.querySelector('#lb-close');
      if (closeBtn) closeBtn.onclick = close;
    }

    /* ---------- （保留）相机距离缩放（供其他场景使用）---------- */
    _toggleZoom() {
      if (this.mode !== '3d') return;
      this.controls.autoRotate = false;   // 手动观察时停止自动旋转
      this._zoomed = !this._zoomed;
      this._zoomDist = this._zoomed
        ? Math.max(this.controls.minDistance, this._baseDist * 0.32)
        : this._baseDist;
    }

    /* ============ 平面降级模式 ============ */
    _initFallback2D() {
      this.canvas.style.display = 'none';
      const wrap = this.canvas.parentElement;
      wrap.classList.add('is-2d');
      const img = document.createElement('img');
      img.className = 'fallback-img';
      img.alt = '千里江山图';
      this.fallbackImg = img;
      img.addEventListener('dblclick', () => this._openLightbox());
      wrap.appendChild(img);

      const overlay = document.createElement('div');
      overlay.className = 'dust-overlay';
      this.dustStrips = [];
      for (let i = 0; i < this.regions; i++) {
        const s = document.createElement('div');
        s.className = 'dust-strip';
        overlay.appendChild(s);
        this.dustStrips.push(s);
      }
      wrap.appendChild(overlay);

      const hint = wrap.querySelector('.canvas-hint');
      if (hint) hint.textContent = '平面模式 · 每解锁一结局，尘条淡去';
    }

    _setFallbackImage(src) {
      if (this.fallbackImg) this.fallbackImg.src = src;
      if (this.pendingFileURL) { URL.revokeObjectURL(this.pendingFileURL); this.pendingFileURL = null; }
    }

    /* ============ 对外接口（两模式通用） ============ */
    clearRegion(i, instant) {
      if (i < 0 || i >= this.regions) return;
      this.target[i] = 1;
      if (this.mode === '2d') {
        const s = this.dustStrips[i];
        s.style.transition = instant ? 'none' : 'opacity 1s ease';
        // 强制重排以便 instant 时立即生效
        void s.offsetWidth;
        s.style.opacity = '0';
        if (this.target.every((t) => t === 1) && !this.complete) {
          this.complete = true;
          setTimeout(() => this.onComplete(), instant ? 0 : 1100);
        }
      } else {
        if (instant) { this.progress[i] = 1; this.dirty = true; }
      }
    }

    isRegionClear(i) { return this.progress[i] >= 1; }

    resetDust() {
      this.progress.fill(0);
      this.target.fill(0);
      this.complete = false;
      if (this.mode === '2d') {
        this.dustStrips.forEach((s) => { s.style.transition = 'opacity .4s'; s.style.opacity = '1'; });
      } else {
        this.controls.autoRotate = false;
        this.dirty = true;
        this._composeDust();
      }
    }

    loadFile(file) {
      const url = URL.createObjectURL(file);
      if (this.mode === '2d') { this._setFallbackImage(url); }
      else { this.setPainting(url, false); }
    }
  }

  global.ScrollViewer = ScrollViewer;
})(window);
