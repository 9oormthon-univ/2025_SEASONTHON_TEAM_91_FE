import { listMyTickets, getTicketDetail } from './js/apiClient.js';



  // ===== 커스텀 엘리먼트 준비 =====
  await customElements.whenDefined('proof-ticket');

  // ===== 유틸 =====
  const fmtDateRight = (iso='') => (iso ? String(iso).slice(0,10).replaceAll('-','/') : '');
  const postersFallback = [
    '/posters/demoposter1.png','/posters/demoposter2.png','/posters/demoposter3.png',
    '/posters/demoposter4.png','/posters/demoposter5.png','/posters/demoposter6.png',
    '/posters/demoposter7.png','/posters/demoposter8.png'
  ];

  // ===== 티켓 데이터 로드 (실서버/목 자동 처리: apiClient.js에 위임) =====
  let RAW = [];
  try {
    // getMyTickets는 로그인 토큰이 있으면 /api/tickets 호출, 없거나 서버 없으면 mock 반환하게 구현되어 있어야 함
    const { items } = await listMyTickets();
    // 예상 스키마: [{ ticketId, contest:{name,imageUrl}, ticketDetail:{humanCode,issuedAt,sha256,fileNameSubmitted,owner:{name}} }, ...]
    RAW = Array.isArray(items) ? items : [];
  } catch (e) {
    console.warn('[myproofticket] getMyTickets 실패 → fallback mock', e);
    RAW = postersFallback.map((src, i) => ({
      ticketId: 1000 + i,
      imageUrl: src,
      contestName: `MOCK CONTEST #${i+1}`,
      ticketDetail: {
        humanCode: ['빛나는 장면-217','차분한 전개-071','섬세한 완성-071','미려한 질감-071'][i % 4],
        issuedAt: new Date(Date.now() - i*3600_000).toISOString(),
        sha256: `mocked-sha256-${i}`,
        fileNameSubmitted: `sample_${i+1}.pdf`,
        owner: { name: (JSON.parse(localStorage.getItem('me')||'{}').name || '사용자') }
      }
    }));
  }

  // ===== 휠에 쓸 TICKETS (이미지 src + 모달 바인딩용 메타 동봉) =====
  const TICKETS = RAW.map((r, i) => ({
    src: r.imageUrl || postersFallback[i % postersFallback.length],
    meta: {
      title: r.contestName || '',
      proofCode: r.humanCode || '',
      timestamp: r.issuedAt || '',
      hash: r.sha256 || '',
      fileName: r.fileNameSubmitted || '',
      owner: r.ownerName || '',
      dateRight: fmtDateRight(r.issuedAt),
      ticketId: r.ticketId
    }
  }));

  // 티켓이 하나도 없다면 UX 처리
  if (TICKETS.length === 0) {
    // 필요 시 안내 후 발급 페이지로 이동
    // alert('아직 보유한 티켓이 없어요. 새 티켓을 발급해 보세요!');
    // location.href = 'register.html';
  }

  // ===== 레이아웃/휠 파트 =====
  const wheelWrap = document.querySelector('.wheel-wrap');
  const sortBtn = document.querySelector('.sort-icon');
  const wheel = document.getElementById('wheel');

  let layoutMode = 'arc'; // 'arc' | 'linear'

  // 슬롯 개수/각도 계산 (데이터 길이에 맞춤)
  const SLOT_COUNT = Math.max(1, TICKETS.length);
  const SLOT_ANGLES = Array.from({length: SLOT_COUNT}, (_, i) => {
    return (SLOT_COUNT === 1) ? 0 : -90 + (180 / (SLOT_COUNT - 1)) * i;
  });
  const STEP = (SLOT_COUNT === 1) ? 180 : 180 / (SLOT_COUNT - 1);
  const TARGET = 0;

  // 슬롯 DOM 생성
  wheel.innerHTML = SLOT_ANGLES.map((_, i) =>
    `<button class="card" data-slot="${i}" aria-label="티켓 ${i + 1}"></button>`
  ).join('');
  const slots = [...wheel.querySelectorAll('.card')];

  // 반응형 지오메트리
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

  function updateLinearHeight() {
    const perRow = 4;
    const gapY = cardH + 60;
    const rows = Math.ceil(SLOT_COUNT / perRow);

    const topPad = 80;
    const bottomPad = 240;
    const contentH = topPad + rows * gapY + bottomPad;

    wheelWrap.style.height = `${Math.max(560, contentH)}px`;
  }

  function applyScrollMode() {
    if (layoutMode === 'linear') {
      document.documentElement.style.overflowY = 'auto';
      document.body.style.overflowY = 'auto';
      updateLinearHeight();
    } else {
      document.documentElement.style.overflowY = 'hidden';
      document.body.style.overflowY = 'hidden';
      wheelWrap.style.height = '560px';
    }
  }

  const norm360 = a => ((a % 360) + 360) % 360;
  const shortestDelta = (target, current) => {
    let d = target - current; d = ((d + 180) % 360) - 180; return d;
  };

  // 인덱스 매핑
  let offset = 0, phase = 0, residual = 0;
  function mapIdx(i) {
    const N = TICKETS.length;
    const k = i - phase;
    return ((k % N) + N) % N;
  }

  function layout() {
    phase    = Math.round(offset / STEP);
    residual = offset - phase * STEP;

    slots.forEach((el, i) => {
      const idx = mapIdx(i);
      el.style.setProperty('--src', `url('${TICKETS[idx].src}')`);

      if (layoutMode === 'arc') {
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

  // ===== 모달 & 티켓 바인딩 =====
  const dlg = document.getElementById('ticketModal');
  const tFront = document.getElementById('tFront');
  const tBack = document.getElementById('tBack');

  async function openTicket(idx) {
    const info = TICKETS[idx]?.meta;
    if (!info) return;

    // 필요 시 상세 API로 최신화 (실서버일 때만 의미 있음)
    try {
      if (info.ticketId && typeof getTicketById === 'function') {
        const detail = await getTicketDetail(info.ticketId); // 실패 시 그냥 아래 info 사용
        const r = detail?.result;
        if (r) {
          info.title     = r?.contest?.name     ?? info.title;
          info.proofCode = r?.ticketDetail?.humanCode ?? r?.humanCode ?? info.proofCode;
          info.timestamp = r?.ticketDetail?.issuedAt  ?? r?.issuedAt  ?? info.timestamp;
          info.hash      = r?.ticketDetail?.sha256    ?? r?.sha256    ?? info.hash;
          info.fileName  = r?.ticketDetail?.fileNameSubmitted ?? r?.fileNameSubmitted ?? info.fileName;
          info.owner     = r?.ticketDetail?.owner?.name ?? r?.owner?.name ?? info.owner;
          info.dateRight = fmtDateRight(info.timestamp);
        }
      }
    } catch (e) {
      console.warn('[ticket detail] fallback to list meta:', e?.message || e);
    }

    const patch = (el) => {
      el.setAttribute('front-image', TICKETS[idx].src);
      el.setAttribute('title',       info.title      || '');
      el.setAttribute('proof-code',  info.proofCode  || '');
      el.setAttribute('timestamp',   info.timestamp  || '');
      el.setAttribute('hash',        info.hash       || '');
      el.setAttribute('file-name',   info.fileName   || '');
      el.setAttribute('owner',       info.owner      || '');
      el.setAttribute('date-right',  info.dateRight  || '');
    };
    patch(tFront);
    patch(tBack);
    tFront.setAttribute('side', 'front');
    tBack.setAttribute('side',  'back');
    dlg.showModal();
  }

  slots.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      if (dragging || moved > 8) return;
      const idx = ((i - phase) % TICKETS.length + TICKETS.length) % TICKETS.length;
      openTicket(idx);
    });
  });
  dlg.querySelector('.close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => {
    const box = dlg.querySelector('.modal-box');
    if (!box.contains(e.target)) dlg.close();
  });

  // ===== 반응형 스케일 (모달용) =====
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

  // ===== 초기 레이아웃 =====
  function onResize() {
    calcGeom();
    layout();
    snapToNearest(0);
  }
  window.addEventListener('resize', onResize, { passive: true });
  onResize();

  // ===== 모드 토글 =====
  // 초기 아이콘 설정 (arc 모드이므로 sortradius.svg)
  const sortImg = sortBtn?.querySelector('img');
  if (sortImg && layoutMode === 'arc') {
    sortImg.src = "public/images/sortlinear.svg";
  }

  sortBtn?.addEventListener('click', () => {
    layoutMode = (layoutMode === 'arc') ? 'linear' : 'arc';
    
    // 이미지 요소 찾기
    if (sortImg) {
      if (layoutMode === 'linear') {
        sortImg.src = "public/images/sortradius.svg";
      } else if (layoutMode === 'arc') {
        sortImg.src = "public/images/sortlinear.svg";
      }
    }

    applyScrollMode();
    layout();
  });
  applyScrollMode();

  // ===== 티켓 모달 3D 효과 (부드러운 애니메이션) =====
  document.querySelectorAll('.ticketContainer').forEach(container => {
    const overlay = container.querySelector('.lightOverlay');
    
    // 애니메이션 상태 관리
    let targetRotX = 0, targetRotY = 0;
    let currentRotX = 0, currentRotY = 0;
    let targetOverlayX = 80, targetOverlayY = 80;
    let currentOverlayX = 80, currentOverlayY = 80;
    let isAnimating = false;
    let animationId = null;
    
    // 부드러운 보간 함수 (ease-out)
    const lerp = (start, end, factor) => start + (end - start) * factor;
    
    // 애니메이션 루프
    function animate() {
      if (!isAnimating) return;
      
      // 회전값 보간 (더 부드러운 움직임)
      const rotFactor = 0.15;
      currentRotX = lerp(currentRotX, targetRotX, rotFactor);
      currentRotY = lerp(currentRotY, targetRotY, rotFactor);
      
      // 오버레이 위치 보간
      const overlayFactor = 0.2;
      currentOverlayX = lerp(currentOverlayX, targetOverlayX, overlayFactor);
      currentOverlayY = lerp(currentOverlayY, targetOverlayY, overlayFactor);
      
      // DOM 업데이트
      container.style.transform = `perspective(1000px) rotateX(${currentRotX}deg) rotateY(${currentRotY}deg)`;
      overlay.style.backgroundPosition = `${currentOverlayX}% ${currentOverlayY}%`;
      
      // 애니메이션 계속 여부 확인 (목표값에 충분히 가까워졌는지)
      const rotDiff = Math.abs(currentRotX - targetRotX) + Math.abs(currentRotY - targetRotY);
      const overlayDiff = Math.abs(currentOverlayX - targetOverlayX) + Math.abs(currentOverlayY - targetOverlayY);
      
      if (rotDiff < 0.01 && overlayDiff < 0.1) {
        isAnimating = false;
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
      } else {
        animationId = requestAnimationFrame(animate);
      }
    }
    
    // 애니메이션 시작
    function startAnimation() {
      if (!isAnimating) {
        isAnimating = true;
        animationId = requestAnimationFrame(animate);
      }
    }
    
    // 마우스/터치 위치를 목표값으로 설정
    function updateTarget(x, y, rect) {
      const nx = (x / rect.width) * 2 - 1;
      const ny = (y / rect.height) * 2 - 1;
      
      // 회전값 계산 (더 자연스러운 범위)
      targetRotY = nx * 12; // 좌우 회전
      targetRotX = -ny * 8; // 상하 회전
      
      // 오버레이 위치 계산
      targetOverlayX = Math.max(0, Math.min(100, (x / rect.width) * 100));
      targetOverlayY = Math.max(0, Math.min(100, (y / rect.height) * 100));
      
      startAnimation();
    }
    
    // 초기화 (원래 위치로)
    function resetToDefault() {
      targetRotX = 0;
      targetRotY = 0;
      targetOverlayX = 80;
      targetOverlayY = 80;
      startAnimation();
    }
    
    // 이벤트 리스너
    container.addEventListener('mousemove', e => {
      const r = container.getBoundingClientRect();
      updateTarget(e.clientX - r.left, e.clientY - r.top, r);
    });
    
    container.addEventListener('mouseleave', () => {
      resetToDefault();
    });
    
    container.addEventListener('touchmove', e => {
      const t = e.touches?.[0];
      if (!t) return;
      const r = container.getBoundingClientRect();
      updateTarget(t.clientX - r.left, t.clientY - r.top, r);
      e.preventDefault();
    }, { passive: false });
    
    container.addEventListener('touchend', () => {
      resetToDefault();
    });
  });

  // 신규발급 버튼
  document.getElementById('newTicketBtn')?.addEventListener('click', () => {
    location.href = 'register.html';
  });
