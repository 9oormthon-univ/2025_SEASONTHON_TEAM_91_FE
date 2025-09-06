// bg-rotator.js
const COLORS = [
  '#4b45ab','#554fb8','#605ac7',
  '#2a91a8','#2e9ab2','#32a5bf',
  '#81b144','#85b944','#8fc549',
  '#e0af27','#eeba2a','#fec72e',
  '#bf342d','#ca3931','#d7423a',
];
const PI2 = Math.PI * 2;

class Polygon {
  constructor(x, y, radius, sides) {
    this.x = x; this.y = y; this.radius = radius; this.sides = sides;
    this.rotate = 0;
  }
  draw(ctx, deltaRot) {
    ctx.save();
    ctx.translate(this.x, this.y);
    this.rotate += deltaRot;
    ctx.rotate(this.rotate);

    const angle = PI2 / this.sides;
    const angle2 = PI2 / 4;
    const rectR = 160; // 사각형 크기

    for (let i = 0; i < this.sides; i++) {
      const px = this.radius * Math.cos(angle * i);
      const py = this.radius * Math.sin(angle * i);

      ctx.save();
      ctx.translate(px, py);
      const deg = (360 / this.sides) * i + 45;
      ctx.rotate((deg * Math.PI) / 180);

      ctx.beginPath();
      for (let j = 0; j < 4; j++) {
        const x2 = rectR * Math.cos(angle2 * j);
        const y2 = rectR * Math.sin(angle2 * j);
        j === 0 ? ctx.moveTo(x2, y2) : ctx.lineTo(x2, y2);
      }
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}

class BgRotator {
  constructor() {
    this.canvas = document.getElementById('bg-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.pixelRatio = window.devicePixelRatio > 1 ? 2 : 1;

    // 회전 상태
    this.moveX = 0;               // 외부 입력 델타 누적
    this.friction = 0.92;         // 감쇠
    this.speedScale = 0.008;      // 회전 속도 스케일

    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);
    this.onDelta = this.onDelta.bind(this);

    window.addEventListener('resize', this.resize);
    window.addEventListener('ticketwheel:delta', this.onDelta); // ← 휠 드래그 연동
    this.resize();
    requestAnimationFrame(this.animate);
  }

resize() {
  const stageWidth  = window.innerWidth;
  const stageHeight = window.innerHeight;

  // 캔버스 픽셀 버퍼 크기 (devicePixelRatio 보정 포함)
  this.canvas.width  = stageWidth  * this.pixelRatio;
  this.canvas.height = stageHeight * this.pixelRatio;

  // CSS 크기 (눈에 보이는 영역)
  this.canvas.style.width  = `${stageWidth}px`;
  this.canvas.style.height = `${stageHeight}px`;

  // 컨텍스트에 픽셀 비율 보정
  this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
}


  onDelta(e) {
    // 휠 드래그 dx를 바로 누적 (좌/우 이동량)
    const { dx = 0 } = e.detail || {};
    this.moveX = dx;
  }

  animate() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    this.ctx.clearRect(0, 0, w, h);

    // 감쇠
    this.moveX *= this.friction;

    // 이동량을 회전 라디안으로 변환해 전달
    const deltaRot = this.moveX * this.speedScale;
    this.poly.draw(this.ctx, deltaRot);
    
    requestAnimationFrame(() => this.animate());

  }
}

new BgRotator();
