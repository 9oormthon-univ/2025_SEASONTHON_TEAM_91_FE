const wheelWrap = document.querySelector('.wheel-wrap');

let layoutMode = 'arc'; // 'arc' | 'linear'

// Custom Elements 등록 완료 후 실행
await customElements.whenDefined('proof-ticket');

// 티켓 데이터
const TICKETS = [
  {src: 'posters/poster1.png'},
  {src: 'posters/poster2.png'},
  {src: 'posters/poster3.jpg'},
  {src: 'posters/poster4.png'},
  {src: 'posters/poster5.jpg'},
  {src: 'posters/poster6.png'},
  {src: 'posters/poster7.png'}
];

const sortBtn = document.querySelector('.sort-icon');

// 슬롯 각도 계산: -90 ~ +90도 반원
const SLOT_COUNT = 7;
const SLOT_ANGLES = Array.from({length: SLOT_COUNT}, (_, i) => -90 + (180 / (SLOT_COUNT - 1)) * i);
const STEP = 180 / (SLOT_COUNT - 1);
const TARGET = 0;

// DOM 요소
const wheel = document.getElementById('wheel');
wheel.innerHTML = SLOT_ANGLES.map((_, i) =>
  `<button class="card" data-slot="${i}" aria-label="티켓 ${i + 1}"></button>`
).join('');
const slots = [...wheel.querySelectorAll('.card')];

// 반응형 레이아웃 계산
let radius = 300, cx = 0, cy = 0, cardW = 230, cardH = 394;
function calcGeom() {
  const rect = wheel.getBoundingClientRect();
  cx = 550;
  cy = rect.height * 1.75;

  const anyCard = slots[0];
  cardW = anyCard?.offsetWidth  || 230;
  cardH = anyCard?.offsetHeight || 394;

  radius = Math.min(480, Math.max(360, rect.width * 0.45));
}

// linear 모드에서 부모 높이를 실제로 늘려 스크롤/여유공간 확보
function updateLinearHeight() {
  const perRow = 4;
  const gapY = cardH + 60;
  const rows = Math.ceil(SLOT_COUNT / perRow);

  const topPad = 80;
  const bottomPad = 240; // 하단 여유 공간(버튼 자리 등)
  const contentH = topPad + rows * gapY + bottomPad;

  wheelWrap.style.height = `${Math.max(560, contentH)}px`; // arc 기본 높이(560px)보다 작아지지 않게
}

// 모드 전환 시 스크롤 정책/높이 반영
function applyScrollMode() {
  if (layoutMode === 'linear') {
    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'auto';
    updateLinearHeight();
  } else {
    document.documentElement.style.overflowY = 'hidden';
    document.body.style.overflowY = 'hidden';
    wheelWrap.style.height = '560px'; // arc 기본값 복구
  }
}

// 인덱스 매핑
function mapIdx(i) {
  const N = TICKETS.length;
  const k = i - phase;
  return ((k % N) + N) % N;
}
const norm360 = a => ((a % 360) + 360) % 360;
const shortestDelta = (target, current) => {
  let d = target - current; d = ((d + 180) % 360) - 180; return d;
};

// 슬롯 layout 배치
let offset = 0, phase = 0, residual = 0;
function layout() {
  phase    = Math.round(offset / STEP);
  residual = offset - phase * STEP;

  slots.forEach((el, i) => {
    const idx = mapIdx(i);
    el.style.setProperty('--src', `url('${TICKETS[idx].src}')`);

    if (layoutMode === 'arc') {
      // 반원 배치
      const angle = SLOT_ANGLES[i] + residual;
      const rad   = angle * Math.PI/180;
      const x     = cx + radius * Math.sin(rad) - cardW/2;
      const y     = cy - radius * Math.cos(rad) - cardH;
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
      el.style.transform = `rotate(${angle}deg)`;
      const distToTarget = Math.abs(shortestDelta(TARGET, norm360(angle)));
      el.style.zIndex = String(1000 - Math.round(distToTarget * 10));
    } else {
      // 선형 배치 (그리드: 4개씩 줄바꿈)
      const perRow = 4;
      const gapX = cardW + 40;
      const gapY = cardH + 60;

      const row = Math.floor(i / perRow);
      const col = i % perRow;

      const x = col * gapX - (perRow * gapX) / 2 + gapX / 0.5;
      const y = row * gapY + 100;

      el.style.left = `${x}px`;
      el.style.top  = `${y}px`;
      el.style.transform = `rotate(0deg) scale(1)`;
      el.style.zIndex = String(1000 - i);
    }
  });

  // 선형일 때는 레이아웃 후에도 높이 보정(리사이즈/폰트계산 변동 대응)
  if (layoutMode === 'linear') updateLinearHeight();
}

// 드래그/관성/스냅
let dragging = false, startX = 0, startOffset = 0, moved = 0, vel = 0, rafId = 0, snapPlanned = false;
const sensitivity = 0.1;
function tick() {
  if (Math.abs(vel) > 0.001) {
    offset += vel; vel *= 0.75; layout();
    rafId = requestAnimationFrame(tick);
  } else {
    cancelAnimationFrame(rafId); rafId=0;
    if (!snapPlanned) { snapPlanned = true; snapToNearest(); }
  }
}
function snapToNearest(duration = 260) {
  let best = 0, bestAbs = 1e9;
  SLOT_ANGLES.forEach((a, i) => {
    const curr = a + residual;
    const d = Math.abs(shortestDelta(TARGET, norm360(curr)));
    if (d < bestAbs) { bestAbs = d; best = i; }
  });
  const currentAngle = norm360(SLOT_ANGLES[best] + residual);
  const delta = shortestDelta(TARGET, currentAngle);
  if (Math.abs(delta) < 0.1) { snapPlanned = false; return; }
  const start = residual, end = residual + delta;
  const t0 = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  function animate(now) {
    const p = Math.min(1, (now - t0) / duration);
    residual = start + (end - start) * ease(p);
    offset = phase * STEP + residual;
    layout();
    if (p < 1) requestAnimationFrame(animate); else snapPlanned = false;
  }
  requestAnimationFrame(animate);
}

// Drag 이벤트
const onDown = e => {
  dragging = true; moved = 0; vel = 0; snapPlanned = false;
  wheel.classList.add('dragging');
  startX = e.touches ? e.touches[0].clientX : e.clientX;
  startOffset = offset;
  if (rafId) { cancelAnimationFrame(rafId); rafId=0; }
};
const onMove = e => {
  if (!dragging) return;
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const dx = x - startX; moved = Math.max(moved, Math.abs(dx));
  const next = startOffset + dx * sensitivity;
  vel = next - offset; offset = next; layout();
  e.preventDefault();
  window.dispatchEvent(new CustomEvent('ticketwheel:delta', { detail: { dx } }));
};
const onUp = () => {
  if (!dragging) return; dragging = false;
  wheel.classList.remove('dragging');
  if (!rafId) rafId = requestAnimationFrame(tick);
};

wheel.addEventListener('mousedown', onDown);
window.addEventListener('mousemove', onMove);
window.addEventListener('mouseup', onUp);
wheel.addEventListener('touchstart', onDown, { passive: false });
window.addEventListener('touchmove', onMove, { passive: false });
window.addEventListener('touchend', onUp);

// Modal 및 티켓 바인딩
const dlg = document.getElementById('ticketModal');
const tFront = document.getElementById('tFront');
const tBack = document.getElementById('tBack');
function bindTicket(el, imgSrc) {
  el.setAttribute('front-image', imgSrc);
  el.setAttribute('title','2025 Creative Hackaton - Drama Track');
  el.setAttribute('proof-code','빛나는 장면-217');
  el.setAttribute('timestamp','2025-09-05 13:42:11 (KST)');
  el.setAttribute('hash','83af9e9d4b12fa...(64 characters)');
  el.setAttribute('file-name','베이비드라이버_공모전제출_김아무개.pdf');
  el.setAttribute('owner','김아무개');
  el.setAttribute('date-right','2025/09/05');
}

slots.forEach((btn, i) => {
  btn.addEventListener('click', () => {
    if (dragging || moved > 8) return;
    const idx = ((i - phase) % TICKETS.length + TICKETS.length) % TICKETS.length;
    const src = TICKETS[idx].src;
    bindTicket(tFront, src);
    bindTicket(tBack , src);
    dlg.showModal();
  });
});
dlg.querySelector('.close').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', e => {
  const box = dlg.querySelector('.modal-box');
  if (!box.contains(e.target)) dlg.close();
});

// 반응형 티켓 크기 계산 (모달용)
function fitTicketsToViewport() {
  const ticketsWrap = document.querySelector('.tickets');
  if (!ticketsWrap) return;

  const h1 = document.querySelector('h1');
  const sub = document.querySelector('.subtitle');
  const btns = document.querySelector('.buttons');

  const vw = window.innerWidth, vh = window.innerHeight;

  const bs = getComputedStyle(document.body);
  const padTop = parseFloat(bs.paddingTop)||0,
        padBottom = parseFloat(bs.paddingBottom)||0,
        padLeft = parseFloat(bs.paddingLeft)||0,
        padRight = parseFloat(bs.paddingRight)||0;
  const gap = parseFloat(getComputedStyle(ticketsWrap).gap)||0;
  const isColumn = getComputedStyle(ticketsWrap).flexDirection === 'column';
  const cols = isColumn ? 1 : 2;

  const usedH = (h1?.offsetHeight||0) + (sub?.offsetHeight||0) + (btns?.offsetHeight||0) + padTop + padBottom -24;
  const availH = Math.max(200, vh - usedH);
  const sH = availH / 887;

  const availW = Math.max(200, vw - padLeft - padRight);
  const sW = (availW - (cols - 1) * gap) / (cols * 460);

  const s = Math.max(0.3, Math.min(1, sH, sW));

  document.documentElement.style.setProperty('--ticket-scale', s.toFixed(3));
  document.querySelectorAll('proof-ticket')
    .forEach(el => el.setAttribute('scale', s.toFixed(3)));
}

window.addEventListener('load', fitTicketsToViewport);
window.addEventListener('resize', fitTicketsToViewport);

// 리사이즈/초기 실행
function onResize() {
  calcGeom();
  layout();
  snapToNearest(0);
}
window.addEventListener('resize', onResize, { passive: true });
onResize();

// 모드 토글 버튼
sortBtn.addEventListener('click', () => {
  layoutMode = (layoutMode === 'arc') ? 'linear' : 'arc';
  applyScrollMode();
  layout();
});

// 최초 모드 적용(arc 기본)
applyScrollMode();


// 티켓 모달 3D효과
document.querySelectorAll('.ticketContainer').forEach(container => {
  const overlay = container.querySelector('.lightOverlay');
  function trackOverlay(x, y, rect) {
    const nx = (x / rect.width) * 2 - 1;
    const ny = (y / rect.height) * 2 - 1;
    const rotY = nx * 10, rotX = -ny * 10;
    container.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    overlay.style.backgroundPosition = `${(x/rect.width)*100}% ${(y/rect.height)*100}%`;
  }
  container.addEventListener('mousemove', e => {
    const r = container.getBoundingClientRect();
    trackOverlay(e.clientX - r.left, e.clientY - r.top, r);
  });
  container.addEventListener('mouseleave', () => {
    container.style.transform = '';
    overlay.style.backgroundPosition = '80% 80%';
  });
  container.addEventListener('touchmove', e => {
    const t = e.touches;
    if (!t) return;
    const r = container.getBoundingClientRect();
    trackOverlay(t.clientX - r.left, t.clientY - r.top, r);
    e.preventDefault();
  }, { passive: false });
});

// 신규발급 버튼
document.getElementById('newTicketBtn').onclick = () => location.href = 'register.html';
