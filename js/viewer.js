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
      this.controls.enablePan = false;
      this.controls.minDistance = 5;
      this.controls.maxDistance = 24;
      this.controls.minPolarAngle = Math.PI * 0.28;
      this.controls.maxPolarAngle = Math.PI * 0.72;
      this.controls.autoRotateSpeed = 0.9;
      this.controls.target.set(0, 0, 0);

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
      this.camera.position.set(0, totalH * 0.15, dist);
      this.controls.minDistance = dist * 0.5;
      this.controls.maxDistance = dist * 2.2;
      this.controls.update();
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
          this.controls.minDistance = this.camera.position.length() * 0.45;
          this.onComplete();
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

    /* ============ 平面降级模式 ============ */
    _initFallback2D() {
      this.canvas.style.display = 'none';
      const wrap = this.canvas.parentElement;
      wrap.classList.add('is-2d');
      const img = document.createElement('img');
      img.className = 'fallback-img';
      img.alt = '千里江山图';
      this.fallbackImg = img;
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
