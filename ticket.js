class ProofTicket extends HTMLElement {
  static get observedAttributes() {
    // side/scale 는 전체 리렌더 없이 스타일만 갱신할 거라서
    // 여기서도 감지하되, 이름별로 분기 처리해요.
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
    if (!this._rendered) return;
    if (oldVal === newVal) return;

    if (name === "side") {
      this._applySide();
      return;
    }
    if (name === "scale") {
      this._applyScale();
      return;
    }
    if (name === "front-image") {
      this._applyFrontImage();
      return;
    }
    if (name === "shape-src") {
      this._applyMask();
      return;
    }
    // 나머지 텍스트 관련 속성은 재렌더(간단)
    this.render();
  }

  render() {
    const frontImage = this.getAttr("front-image", "/posters/poster7.png"); // ✅ 웹 경로 기본값
    const side       = (this.getAttr("side","front")).toLowerCase();       // 'front' | 'back'
    const scale      = parseFloat(this.getAttr("scale","1"));
    const shapeSrc   = this.getAttr("shape-src", "/public/images/ticket-shape.svg");

    // 뒷면 데이터
    const title     = this.getAttr("title","2025 9oormthon Univ · Seasonthon");
    const proofCode = this.getAttr("proof-code","빛나는 앱-217");
    const timestamp = this.getAttr("timestamp","2025-09-05 13:42:11 (KST)");
    const hash      = this.getAttr("hash","83af9e9d4b12fa...(64 characters)");
    const fileName  = this.getAttr("file-name","Markers_ProofTicket_91.pdf");
    const owner     = this.getAttr("owner","KIM MARKER");
    const dateRight = this.getAttr("date-right","2025/09/05");

    this.shadowRoot.innerHTML = `
        <style>
        :host {
          display:inline-block;
          transform-origin: top left;
          font-family: 'Inter', Roboto, system-ui, -apple-system, Segoe UI, Noto Sans KR, sans-serif;
          --stroke-color: #FFF9D9;
          --stroke-width: 3px;
        }
        .wrap {
          position: relative;
          width: 460px;
          height: 787px;
          filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.25));
          perspective: 1000px; /* flip 효과용 */
        }

        .mask {
          position: absolute; inset: 0;
          overflow: hidden;
          -webkit-mask-repeat: no-repeat;
                  mask-repeat: no-repeat;
          -webkit-mask-position: 0 0;
                  mask-position: 0 0;
          -webkit-mask-size: 100% 100%;
                  mask-size: 100% 100%;
        }

        .card {
          position:absolute; inset:0;
          box-shadow: 0 4px 4px rgba(0,0,0,.25), 0 10px 20px rgba(0,0,0,.25);
          overflow: hidden;
          transform-style: preserve-3d;
          backface-visibility: hidden;
          transition: transform .6s ease;
        }

        .card.front{
          background: url("${frontImage}") center/cover no-repeat;
        }

        .stroke-ring{
          position:absolute; inset:0; z-index:10; pointer-events:none;
          background: var(--stroke-color);
          -webkit-mask:
            url("${shapeSrc}") 0 0/100% 100% no-repeat,
            url("${shapeSrc}") center/
              calc(100% - (var(--stroke-width) * 2))
              calc(100% - (var(--stroke-width) * 2)) no-repeat;
                  mask:
            url("${shapeSrc}") 0 0/100% 100% no-repeat,
            url("${shapeSrc}") center/
              calc(101% - (var(--stroke-width) * 3))
              calc(101% - (var(--stroke-width) * 3)) no-repeat;
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
        }

        .inner-frame{
          position: absolute;
          inset: 3px;
          width: calc(100% - 10px);
          height: calc(100% - 10px);
          object-fit: contain;
          pointer-events: none;
          -webkit-mask: url("public/images/ticket-shape.svg") 0 0/100% 100% no-repeat;
                  mask: url("public/images/ticket-shape.svg") 0 0/100% 100% no-repeat;
        }

        .card.back{
          background: linear-gradient(180deg, #8C8C8C 0%, #6C8092 100%);
          transform: rotateY(180deg);
        }
        .card.back .inner{
          position:absolute; inset:0;
          color:#FFF9D9;
          font-family: Roboto, 'Inter', sans-serif;
        }

        .panel{
          position:absolute;
          left:27px; top:91px; width:406px; height:615px;
          border:1px solid #FFF9D9;
        }

        .title{
          position:absolute; left:0; right:0; top:29px;
          text-align:center; line-height:1.15;
          color:#FFF3B6; font-family:'Anton', sans-serif; font-weight:400; font-size:40px;
        }
        .title .line{ display:block; }

        .star-rule-top, .star-rule-mid {
          position:absolute; left:0; right:0; height:10px;
        }
        .star-rule-top { top:150px; }
        .star-rule-mid { top:380px; }
        .rule-line{
          position:absolute; top:4px; height:0; border-top:1px solid #FFF9D9; width:153px;
        }
        .rule-line.left{ left:0; }
        .rule-line.right{ right:0; }
        .rule-star{
          position:absolute; left:50%; top:-10px; transform:translateX(-50%);
          width:30px; height:30px; display:block;
          background:url("public/images/star.svg") center/contain no-repeat;
        }

        .info-list{
          position:absolute; left:0; right:0; top:180px;
          padding:0; margin:0; list-style:none;
        }
        .info-row{
          display:grid; grid-template-columns: 100px 1fr;
          align-items:center;
          padding:12px 8px;
          border-bottom:1px solid #FFF9D9;
          line-height:13px;
        }
        .info-row .label{ font-size:16px; color:#FFF9D9; font-family:Roboto, sans-serif; font-weight:400; }
        .info-row .value{ text-align: left; font-size:16px; color:#FFFFFF; font-family:Roboto, sans-serif; font-weight:200; }

/* 표 컨테이너: 좌표/사이즈는 피그마 기준 */
.bottom-grid{
  color:#FFF9D9;
  font-family: Inter, sans-serif;
  font-weight:800;
  align-items:center;
  text-align: center;
  justify-content:center;
  position:absolute; left:0; top:390px;
  width:406px; height:225px;

  display:grid;
  grid-template-columns:145px 125px 136px;
  grid-template-rows:59px 1fr;

  border:1px solid #FFF9D9; /* 먼저 전체 */
  border-top:0;             /* 마지막에 위쪽만 제거 */
  border-bottom: 0;

  background:
    linear-gradient(#FFF9D9,#FFF9D9) 145px 0 / 1px 100% no-repeat,
    linear-gradient(#FFF9D9,#FFF9D9) 270px 0 / 1px 100% no-repeat,
    linear-gradient(#FFF9D9,#FFF9D9) 0 59px / 100% 1px no-repeat;
}


/* 셀 공통 */
.bottom-grid > .th,
.bottom-grid > .td{
  display:flex;
  align-items:center;
  justify-content:center;
  color:#FFF9D9;
  font-family: Inter, sans-serif;
  font-weight:800;
}

/* 헤더 텍스트(피그마 값) */
.bottom-grid > .th{
  color:#FFF9D9;
  font-family: Inter, sans-serif;
  font-weight:800;
  text-transform:uppercase;
  font-size:16px;
  line-height:28px;
  letter-spacing:1.6px;
}

/* 값(두 줄 표시) */
.bottom-grid .value{
  color:#FFF9D9;
  font-family: Inter, sans-serif;
  font-weight:800;
  text-width:
  text-transform:uppercase;
  font-size:20px;
  line-height:28px;
  letter-spacing:2px;
  text-align:center;
  white-space:pre-line; /* 줄바꿈 유지 */
}

/* 스탬프: 표 안에서 절대 위치로 라인 위를 자연스럽게 덮음
   (피그마 좌표 기준: left 273, top 536.54 → 컨테이너 기준으로 보정) */
.proof-stamp{
  position:absolute;
  top: -70px;
  left: -10px;
  width:187px;
  height:184px;
  background:url("public/images/proof_stamp.svg") center/contain no-repeat;
  opacity:.9;
  pointer-events:none;
}
        :host([side="back"]) .card.front { transform: rotateY(180deg); }
        :host([side="back"]) .card.back  { transform: rotateY(0deg);    }

      </style>

      <div class="wrap" style="transform: scale(${isNaN(scale)?1:scale});">
        <div class="mask">
          <div class="card front"></div>
          <div class="card back">
            <div class="inner">
              <div class="panel">
                <div class="title">
                  <span class="line">${title}</span>
                </div>
                <div class="star-rule-top">
                  <span class="rule-line left"></span>
                  <span class="rule-line right"></span>
                  <i class="rule-star"></i>
                </div>
                <ul class="info-list">
                  <li class="info-row">
                    <span class="label">Proof Code</span>
                    <span class="value">${proofCode}</span>
                  </li>
                  <li class="info-row">
                    <span class="label">Time Stamp</span>
                    <span class="value">${timestamp}</span>
                  </li>
                  <li class="info-row">
                    <span class="label">SHA-256 Hash</span>
                    <span class="value">${hash}</span>
                  </li>
                  <li class="info-row">
                    <span class="label">File Name</span>
                    <span class="value">${fileName}</span>
                  </li>
                  <li class="info-row" style="border-bottom:none;">
                    <span class="label">Owner</span>
                    <span class="value">${owner}</span>
                  </li>
                </ul>
                <div class="star-rule-mid">
                  <span class="rule-line left"></span>
                  <span class="rule-line right"></span>
                  <i class="rule-star"></i>
                </div>
                <div class="bottom-grid">
                  <div class="header">NAME</div>
                  <div class="header">DATE</div>
                  <div class="header">PROOF</div>
                  <div class="value">${owner}</div>
                  <div class="value">${dateRight}</div>
                  <div class="value" style="position:relative;">
                    <div class="proof-stamp" aria-hidden="true"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="stroke-ring"></div>
        <img src="public/images/ticket-innerframe.svg" class="inner-frame" alt="" />
      </div>
    `;

    this._rendered = true;

    // 마스크/이미지/사이드 초기 적용
    this._maskEl   = this.shadowRoot.querySelector(".mask");
    this._frontEl  = this.shadowRoot.querySelector(".card.front");
    this._applyMask(shapeSrc);
    this._applyFrontImage(frontImage);
    this._applySide(side);
    this._applyScale(scale);
  }

  _applyMask(src = this.getAttr("shape-src", "/images/ticket-shape.svg")){
    if (!this._maskEl) return;
    // CSS mask는 Shadow DOM에서도 문서 기준 경로로 로드됨
    // 마스크가 없으면 기본 border-radius로 티켓 모양 흉내
    if (src && src !== "") {
      this._maskEl.style.webkitMaskImage = `url("${src}")`;
      this._maskEl.style.maskImage       = `url("${src}")`;
      this._maskEl.style.borderRadius    = "0"; // 마스크 사용시 border-radius 제거
    } else {
      this._maskEl.style.webkitMaskImage = "none";
      this._maskEl.style.maskImage       = "none";
      this._maskEl.style.borderRadius    = "24px"; // 마스크 없을 때 기본 둥근 모서리
    }
  }

  _applyFrontImage(src = this.getAttr("front-image", "/posters/poster7.png")){
    if (!this._frontEl) return;
    this._frontEl.style.backgroundImage = `url("${src}")`;
  }

  _applySide(val = (this.getAttr("side","front")).toLowerCase()){
    // flip은 CSS가 :host([side])를 보고 처리 → 여기서는 속성만 보장
    this.setAttribute("side", val);
  }

  _applyScale(val = parseFloat(this.getAttr("scale","1"))){
    const wrap = this.shadowRoot.querySelector(".wrap");
    if (!wrap) return;
    const s = isNaN(val) ? 1 : val;
    wrap.style.transform = `scale(${s})`;
  }

  /** 공개 API: 앞/뒤 토글 */
  flip(toSide){
    const next = toSide ?? (this.getAttribute("side")==="back" ? "front" : "back");
    this._applySide(next);
  }
}
customElements.define("proof-ticket", ProofTicket);