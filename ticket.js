class ProofTicket extends HTMLElement {
  static get observedAttributes() {
    return ["front-image","title","proof-code","timestamp","hash","file-name","owner","date-left","date-right","side","scale","shape-src"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rendered = false;
  }
  getAttr(name, fallback="") { return this.getAttribute(name) ?? fallback; }
  connectedCallback() { this.render(); }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "side")  return this._applySide();
    if (name === "scale") return this._applyScale();
    if (name === "front-image") { this._applyFrontImage(); return; }
    if (name === "shape-src")   { this._applyMask(); return; }
    this.render(); // 나머지 텍스트 속성
  }

  render() {
    const frontImage = this.getAttr("front-image");
    const side       = (this.getAttr("side","front")).toLowerCase();
    const scale      = parseFloat(this.getAttr("scale","1"));
    const shapeSrc   = this.getAttr("shape-src", "/public/images/ticket-shape.svg");

    const title     = this.getAttr("title","2025 9oormthon Univ · Seasonthon");
    const proofCode = this.getAttr("proof-code","빛나는 앱-217");
    const timestamp = this.getAttr("timestamp","2025-09-05 13:42:11 (KST)");
    const hash      = this.getAttr("hash","83af9e9d4b12fa...(64 characters)");
    const fileName  = this.getAttr("file-name","Markers_ProofTicket_91.pdf");
    const owner     = this.getAttr("owner","KIM MARKER");
    const dateRight = this.getAttr("date-right","2025/09/05");

    this.shadowRoot.innerHTML = `
      <style>
        :host{ display:inline-block; transform-origin:top left; font-family:'Roboto', Roboto, system-ui, -apple-system, Segoe UI, Noto Sans KR, sans-serif; --stroke-color:#FFF9D9; --stroke-width:3px; }
        .wrap{ position:relative; width:460px; height:787px; filter:drop-shadow(0px 4px 4px rgba(0,0,0,.25)); perspective:1000px; }
        .hologram-overlay{ position:absolute; inset:0; pointer-events:none; z-index:5; overflow:hidden; }
        .hologram-particle{ position:absolute; width:2px; height:2px; background:radial-gradient(circle, rgba(214, 255, 255, 0.8) 0%, rgba(0,255,255,0.4) 50%, transparent 100%); border-radius:50%; animation:float 3s ease-in-out infinite; }
        .hologram-glow{ position:absolute; inset:0; background:radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(0,255,255,0.1) 0%, transparent 70%); opacity:0; transition:opacity 0.3s ease; }
        .wrap:hover .hologram-glow{ opacity:1.2; }
        @keyframes float{ 0%,100%{ transform:translateY(0px) scale(1); opacity:0.3; } 50%{ transform:translateY(-20px) scale(1.2); opacity:0.8; } }
        .mask{ position:absolute; inset:0; overflow:hidden; -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; -webkit-mask-position:0 0; mask-position:0 0; -webkit-mask-size:100% 100%; mask-size:100% 100%; }
        .card{ position:absolute; inset:0; box-shadow:0 4px 4px rgba(0,0,0,.25), 0 10px 20px rgba(0,0,0,.25); overflow:hidden; transform-style:preserve-3d; backface-visibility:hidden; transition:transform .6s ease; }
        .card.front{ background:url("${frontImage}") center/cover no-repeat; }
        /* ← 여기 배경은 JS에서 동적으로 linear-gradient로 덮어써요 */
        .card.back{ background: linear-gradient(180deg, #8C8C8C 0%, #6C8092 100%); transform: rotateY(180deg); }
        .card.back .inner{ position:absolute; inset:0; color:#FFF9D9; font-family:Roboto,'Roboto',sans-serif; }

        .stroke-ring{ position:absolute; inset:0; z-index:10; pointer-events:none; background:var(--stroke-color);
          -webkit-mask:
            url("${shapeSrc}") 0 0/100% 100% no-repeat,
            url("${shapeSrc}") center/ calc(100% - (var(--stroke-width) * 2)) calc(100% - (var(--stroke-width) * 2)) no-repeat;
                  mask:
            url("${shapeSrc}") 0 0/100% 100% no-repeat,
            url("${shapeSrc}") center/ calc(101% - (var(--stroke-width) * 3)) calc(101% - (var(--stroke-width) * 3)) no-repeat;
          -webkit-mask-composite:xor; mask-composite:exclude;
        }
        .inner-frame{ position:absolute; inset:5px; width:calc(100% - 10px); height:calc(100% - 10px); object-fit:contain; pointer-events:none;
          -webkit-mask:url("public/images/ticket-shape.svg") 0 0/100% 100% no-repeat; mask:url("public/images/ticket-shape.svg") 0 0/100% 100% no-repeat; }

        .panel{ position:absolute; left:27px; top:91px; width:406px; height:615px; border:1px solid #FFF9D9; }
        .title{ position:absolute; left:0; right:0; top:29px; text-align:center; line-height:1.15; color:#FFF3B6; font-family:'Roboto',sans-serif; font-weight:700; font-size:40px; }
        .title .line{ display:block; }
        .star-rule-top,.star-rule-mid{ position:absolute; left:0; right:0; height:10px; }
        .star-rule-top{ top:150px; } .star-rule-mid{ top:380px; }
        .rule-line{ position:absolute; top:4px; height:0; border-top:1px solid #FFF9D9; width:153px; }
        .rule-line.left{ left:0; } .rule-line.right{ right:0; }
        .rule-star{ position:absolute; left:50%; top:-10px; transform:translateX(-50%); width:30px; height:30px; display:block; background:url("public/images/star.svg") center/contain no-repeat; }

        .info-list{ position:absolute; left:0; right:0; top:180px; padding:0; margin:0; list-style:none; }
        .info-row{ display:grid; grid-template-columns:100px 1fr; align-items:center; padding:12px 8px; border-bottom:1px solid #FFF9D9; line-height:13px; }
        .info-row .label{ font-size:16px; color:#FFF9D9; font-family:Roboto,sans-serif; font-weight:500; }
        .info-row .value{ text-align:left; font-size:16px; color:#FFFFFF; font-family:Roboto,sans-serif; font-weight:400; }

        .bottom-grid{
          color:#FFF9D9; font-family:Inter,sans-serif; font-weight:800; align-items:center; text-align:center; justify-content:center;
          position:absolute; left:0; top:390px; width:406px; height:225px; display:grid;
          grid-template-columns:145px 125px 136px; grid-template-rows:59px 1fr;
          border:1px solid #FFF9D9; border-top:0; border-bottom:0;
          background:
            linear-gradient(#FFF9D9,#FFF9D9) 145px 0 / 1px 100% no-repeat,
            linear-gradient(#FFF9D9,#FFF9D9) 270px 0 / 1px 100% no-repeat,
            linear-gradient(#FFF9D9,#FFF9D9) 0 59px / 100% 1px no-repeat;
        }
        .bottom-grid > .th, .bottom-grid > .td{ display:flex; align-items:center; justify-content:center; color:#FFF9D9; font-family:Inter,sans-serif; font-weight:800; }
        .bottom-grid > .th{ text-transform:uppercase; font-size:16px; line-height:28px; letter-spacing:1.6px; }
        .bottom-grid .value{ text-transform:uppercase; font-size:20px; line-height:28px; letter-spacing:2px; text-align:center; white-space:pre-line; }
        .proof-stamp{ position:absolute; top:-70px; left:-10px; width:187px; height:184px; background:url("public/images/proof_stamp.svg") center/contain no-repeat; opacity:.9; pointer-events:none; }
        
        /* 뒷면 무늬 디테일 */
        .back-pattern{ position:absolute; inset:0; pointer-events:none; opacity:0.15; z-index:1; }
        .back-pattern::before{ content:''; position:absolute; inset:0; background-image: repeating-linear-gradient(45deg, rgba(255,249,217,0.3) 0px, rgba(255,249,217,0.3) 1px, transparent 1px, transparent 20px), repeating-linear-gradient(-45deg, rgba(255,249,217,0.3) 0px, rgba(255,249,217,0.3) 1px, transparent 1px, transparent 20px); }
        
        /* 점 무늬 */
        .dot-pattern{ position:absolute; inset:0; pointer-events:none; opacity:0.2; z-index:1; }
        .dot-pattern::before{ content:''; position:absolute; inset:0; background-image: radial-gradient(circle, rgba(255,249,217,0.4) 1px, transparent 1px); background-size: 25px 25px; }
        
        /* 웨이브 무늬 */
        .wave-pattern{ position:absolute; bottom:0; left:0; right:0; height:80px; pointer-events:none; opacity:0.3; z-index:1; background: repeating-linear-gradient(90deg, transparent 0px, transparent 8px, rgba(255,249,217,0.5) 8px, rgba(255,249,217,0.5) 10px, transparent 10px, transparent 18px); }

        :host([side="back"]) .card.front{ transform:rotateY(180deg); }
        :host([side="back"]) .card.back { transform:rotateY(0deg); }
      </style>

      <div class="wrap" style="transform:scale(${isNaN(scale)?1:scale});">
        <div class="mask">
          <div class="card front"></div>
          <div class="card back">
            <div class="inner">
              <div class="panel">
                <div class="title"><span class="line">${title}</span></div>
                <div class="star-rule-top"><span class="rule-line left"></span><span class="rule-line right"></span><i class="rule-star"></i></div>
                <ul class="info-list">
                  <li class="info-row"><span class="label">Proof Code</span><span class="value">${proofCode}</span></li>
                  <li class="info-row"><span class="label">Time Stamp</span><span class="value">${timestamp}</span></li>
                  <li class="info-row"><span class="label">Hash</span><span class="value">${hash}</span></li>
                  <li class="info-row"><span class="label">File Name</span><span class="value">${fileName}</span></li>
                  <li class="info-row" style="border-bottom:none;"><span class="label">Owner</span><span class="value">${owner}</span></li>
                </ul>
                <div class="star-rule-mid"><span class="rule-line left"></span><span class="rule-line right"></span><i class="rule-star"></i></div>
                <div class="bottom-grid">
                  <div class="header th">NAME</div><div class="header th">DATE</div><div class="header th">PROOF</div>
                  <div class="value td">${owner}</div>
                  <div class="value td">${dateRight}</div>
                  <div class="value td" style="position:relative;"><div class="proof-stamp" aria-hidden="true"></div></div>
                </div>
                
                <!-- 뒷면 무늬 디테일 -->
                <div class="back-pattern"></div>
                <div class="dot-pattern"></div>
                <div class="wave-pattern"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="stroke-ring"></div>
        <img src="public/images/ticket-innerframe.svg" class="inner-frame" alt="">
        <div class="hologram-overlay">
          <div class="hologram-glow"></div>
        </div>
      </div>
    `;

    this._rendered = true;
    this._maskEl  = this.shadowRoot.querySelector(".mask");
    this._frontEl = this.shadowRoot.querySelector(".card.front");
    this._backEl  = this.shadowRoot.querySelector(".card.back");
    this._hologramOverlay = this.shadowRoot.querySelector(".hologram-overlay");
    this._hologramGlow = this.shadowRoot.querySelector(".hologram-glow");

    this._applyMask(shapeSrc);
    this._applyFrontImage(frontImage);   // ← 여기서 그라디언트도 갱신
    this._applySide(side);
    this._applyScale(scale);
    this._initHologramEffect();
  }

  _applyMask(src = this.getAttr("shape-src", "/images/ticket-shape.svg")){
    if (!this._maskEl) return;
    if (src) {
      this._maskEl.style.webkitMaskImage = `url("${src}")`;
      this._maskEl.style.maskImage       = `url("${src}")`;
      this._maskEl.style.borderRadius    = "0";
    } else {
      this._maskEl.style.webkitMaskImage = "none";
      this._maskEl.style.maskImage       = "none";
      this._maskEl.style.borderRadius    = "24px";
    }
  }

  _applyFrontImage(src = this.getAttr("front-image", "/posters/poster7.png")){
    if (!this._frontEl) return;
    
    const rawSrc = src || '/posters/poster7.png';
    const normalizedSrc =
      rawSrc.startsWith('http://') || rawSrc.startsWith('https://') || rawSrc.startsWith('data:') ? rawSrc :
      rawSrc.startsWith('/') ? rawSrc : `/${rawSrc}`;

    console.log(normalizedSrc);
    
    // 이미지 로딩 테스트
    const img = new Image();
    img.onload = () => {
      this._frontEl.style.backgroundImage = `url("${normalizedSrc}")`;
      this._updateBackGradientFromImage(normalizedSrc);
    };
    img.onerror = () => {
      console.warn(`[ProofTicket] 이미지 로딩 실패: ${normalizedSrc}`);
    };
    img.src = normalizedSrc;
  }

  _applySide(val = (this.getAttr("side","front")).toLowerCase()){
    this.setAttribute("side", val);
  }

  _applyScale(val = parseFloat(this.getAttr("scale","1"))){
    const wrap = this.shadowRoot.querySelector(".wrap");
    if (!wrap) return;
    wrap.style.transform = `scale(${isNaN(val)?1:val})`;
  }

  /** 이미지에서 컬러 2개 추출 → back 그라디언트 적용 */
  _updateBackGradientFromImage(src){
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      // 매번 새로운 canvas 생성, 오염 방지
      const w = 64, h = 64;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      let data;
      try {
        data = ctx.getImageData(0, 0, w, h).data;
      } catch (e) {
        this._setDefaultBackGradient();
        return;
      }
      // 24개 hue bin으로 간이 양자화
      const bins = Array.from({length:24}, ()=>({count:0,r:0,g:0,b:0}));
      for (let i=0;i<data.length;i+=4){
        const r=data[i], g=data[i+1], b=data[i+2], a=data[i+3];
        if (a < 128) continue;
        const {h,s,l} = this._rgbToHsl(r,g,b);
        if (s < 0.2) continue;
        if (l < 0.12 || l > 0.9) continue;
        const bin = Math.floor(h*24)%24;
        const bucket = bins[bin];
        bucket.count++; bucket.r+=r; bucket.g+=g; bucket.b+=b;
      }
      const candidates = bins
        .map((b,idx)=> b.count>0 ? {idx, count:b.count, r:Math.round(b.r/b.count), g:Math.round(b.g/b.count), b:Math.round(b.b/b.count)} : null)
        .filter(Boolean)
        .sort((a,b)=> b.count - a.count);
      if (candidates.length === 0) { this._setDefaultBackGradient(); return; }
      const first = candidates[0];
      const second = candidates.find(c => this._hueDistance(first.idx, c.idx) >= 4) || candidates[1] || first;
      const c1 = this._tuneLightness(first, +0.08);
      const c2 = this._tuneLightness(second, -0.08);
      this._setBackGradient(c1, c2);
    };
    img.onerror = () => this._setDefaultBackGradient();
    // 캐시 무효화 쿼리 추가
    const cacheBuster = (src.includes('?') ? '&' : '?') + 'v=' + Date.now();
    img.src = src + cacheBuster;
  }

  _setBackGradient(c1, c2){
    if (!this._backEl) return;
    this._backEl.style.background = `linear-gradient(180deg, ${c1} 0%, ${c2} 100%)`;
  }
  _setDefaultBackGradient(){
    this._setBackGradient('#8C8C8C', '#6C8092');
  }

  _hueDistance(a,b){
    const d = Math.abs(a-b);
    return Math.min(d, 24 - d); // 0~12
  }
  _tuneLightness(rgb, delta){
    const hsl = this._rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.l = Math.max(0, Math.min(1, hsl.l + delta));
    const out = this._hslToRgb(hsl.h, hsl.s, hsl.l);
    return `rgb(${out.r}, ${out.g}, ${out.b})`;
  }
  _rgbToHsl(r,g,b){
    r/=255; g/=255; b/=255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    let h,s,l=(max+min)/2;
    if (max===min){ h=0; s=0; }
    else{
      const d=max-min;
      s = l>0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h = (g-b)/d + (g<b?6:0); break;
        case g: h = (b-r)/d + 2; break;
        default: h = (r-g)/d + 4;
      }
      h/=6;
    }
    return {h,s,l};
  }
  _hslToRgb(h,s,l){
    let r,g,b;
    if (s===0){ r=g=b=l; }
    else{
      const hue2rgb=(p,q,t)=>{
        if (t<0) t+=1; if (t>1) t-=1;
        if (t<1/6) return p+(q-p)*6*t;
        if (t<1/2) return q;
        if (t<2/3) return p+(q-p)*(2/3 - t)*6;
        return p;
      };
      const q = l<0.5 ? l*(1+s) : l+s - l*s;
      const p = 2*l - q;
      r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3);
    }
    return { r:Math.round(r*255), g:Math.round(g*255), b:Math.round(b*255) };
  }

  /** 홀로그램 효과 초기화 */
  _initHologramEffect(){
    if (!this._hologramOverlay || !this._hologramGlow) return;
    
    // 홀로그램 오버레이에 티켓 모양 마스킹 적용
    const shapeSrc = this.getAttr("shape-src", "/public/images/ticket-shape.svg");
    this._hologramOverlay.style.webkitMask = `url("${shapeSrc}") no-repeat center/contain`;
    this._hologramOverlay.style.mask = `url("${shapeSrc}") no-repeat center/contain`;
    
    // 파티클 생성
    this._createHologramParticles();
    
    // 마우스 호버 효과
    this._setupHologramHover();
  }
  
  /** 홀로그램 파티클 생성 */
  _createHologramParticles(){
    if (!this._hologramOverlay) return;
    
    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'hologram-particle';
      
      // 랜덤 위치와 애니메이션 설정
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 3 + 's';
      particle.style.animationDuration = (2 + Math.random() * 2) + 's';
      
      this._hologramOverlay.appendChild(particle);
      
      // 5초 후 제거
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 5000);
    };
    
    // 초기 파티클 생성
    for (let i = 0; i < 8; i++) {
      setTimeout(createParticle, i * 200);
    }
    
    // 지속적인 파티클 생성
    this._particleInterval = setInterval(createParticle, 300);
  }
  
  /** 홀로그램 호버 효과 설정 */
  _setupHologramHover(){
    if (!this._hologramGlow) return;
    
    const wrap = this.shadowRoot.querySelector('.wrap');
    if (!wrap) return;
    
    const updateGlow = (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      this._hologramGlow.style.setProperty('--mouse-x', x + '%');
      this._hologramGlow.style.setProperty('--mouse-y', y + '%');
    };
    
    wrap.addEventListener('mousemove', updateGlow);
    wrap.addEventListener('mouseleave', () => {
      this._hologramGlow.style.setProperty('--mouse-x', '50%');
      this._hologramGlow.style.setProperty('--mouse-y', '50%');
    });
  }
  
  
  /** 컴포넌트 제거 시 정리 */
  disconnectedCallback(){
    if (this._particleInterval) {
      clearInterval(this._particleInterval);
    }
  }

  /** 공개 API */
  flip(toSide){
    const next = toSide ?? (this.getAttribute("side")==="back" ? "front" : "back");
    this._applySide(next);
  }
}
customElements.define("proof-ticket", ProofTicket);
