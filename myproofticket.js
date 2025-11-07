import { listMyTickets as getMyTickets, getTicketDetail } from './js/apiClient.js';

/* =========================================================
   1) 커스텀 엘리먼트 준비
========================================================= */
await customElements.whenDefined('proof-ticket');

/* =========================================================
   2) 유틸/전역
========================================================= */
const postersFallback = [
  'posters/poster1.png',
  'posters/poster2.png',
  'posters/poster3.jpg',
  'posters/poster4.png',
  'posters/poster5.jpg',
  'posters/poster6.png',
  'posters/poster7.png',
];

const fmtDateRight = (iso = '') =>
  iso ? String(iso).slice(0, 10).replaceAll('-', '/') : '';

let RAW = [];
let TICKETS = [];

/* =========================================================
   3) 유저 이름 반영
========================================================= */
(function updateUserTitle() {
  const userInfo = JSON.parse(localStorage.getItem('me') || '{}');
  const name = userInfo.name || '익명 사용자';
  const titleEl = document.querySelector('.title');
  if (titleEl) titleEl.textContent = `${name}님의 Proof Tickets`;
})();

/* =========================================================
   4) 티켓 데이터 로드
========================================================= */
async function loadTickets() {
  try {
    const data = await getMyTickets();
    console.log('[DEBUG] /api/tickets 응답:', data);

    // ✅ apiClient가 camelCase로 정규화해서 내려줌
    const items = Array.isArray(data.items) ? data.items : [];

    RAW = items.map((item, i) => ({
      ticketId: item.ticketId,
      contest: {
        name: item.contestName,
        imageUrl: item.imageUrl || postersFallback[i % postersFallback.length],
      },
      ticketDetail: {
        humanCode: item.humanCode,
        issuedAt: item.issuedAt,
        fileNameSubmitted: item.fileName || item.fileNameSubmitted || '',
        owner: {
          name: item.ownerName || JSON.parse(localStorage.getItem('me') || '{}').name || '익명 사용자',
        },
      },
    }));

    TICKETS = mapTickets(RAW);
    renderTickets(TICKETS);
  } catch (error) {
    console.warn('[myproofticket] getMyTickets 실패 → fallback mock', error);
    useFallbackTickets();
  }
}

/* =========================================================
   5) 매핑/Fallback
========================================================= */
function mapTickets(rawList) {
  return rawList.map((r, i) => ({
    src: r.contest.imageUrl || postersFallback[i % postersFallback.length],
    meta: {
      title: r.contest.name || '',
      proofCode: r.ticketDetail.humanCode || '',
      timestamp: r.ticketDetail.issuedAt || '',
      fileName: r.ticketDetail.fileNameSubmitted || '',
      owner: r.ticketDetail.owner.name || '',
      dateRight: fmtDateRight(r.ticketDetail.issuedAt),
      ticketId: r.ticketId,
      imageUrl: r.contest.imageUrl || '', // 상세 응답 없을 때를 대비해 보존
    },
  }));
}

function useFallbackTickets() {
  RAW = postersFallback.map((src, i) => ({
    ticketId: 1000 + i,
    contest: { name: `MOCK CONTEST #${i + 1}`, imageUrl: src },
    ticketDetail: {
      humanCode: ['빛나는 장면-217', '차분한 전개-071', '섬세한 완성-071', '미려한 질감-071'][i % 4],
      issuedAt: new Date(Date.now() - i * 3600_000).toISOString(),
      fileNameSubmitted: `sample_${i + 1}.pdf`,
      owner: { name: 'mockUser' },
    },
  }));

  TICKETS = mapTickets(RAW);
  renderTickets(TICKETS);
}

/* =========================================================
   6) 티켓 렌더 & 휠 초기화
========================================================= */
function renderTickets(tickets) {
  const wheel = document.getElementById('wheel');

  if (!tickets.length) {
    wheel.innerHTML = `<p class="no-ticket-msg">현재 티켓이 없습니다. 추가해보세요!</p>`;
    console.warn('[renderTickets] 티켓 없음');
    return;
  }

  console.log(`[loadTickets] 티켓 ${tickets.length}개 로드 완료`);
  initWheel(tickets);
}

/* =========================================================
   7) 휠 구성/상호작용
========================================================= */
function initWheel(tickets) {
  const wheelWrap = document.querySelector('.wheel-wrap');
  const sortBtn = document.querySelector('.sort-icon');
  const wheel = document.getElementById('wheel');

  // ===== 레이아웃 설정 =====
  let layoutMode = 'arc'; // 'arc' | 'linear'
  const SLOT_COUNT = Math.max(1, tickets.length);
  const SLOT_ANGLES = Array.from({ length: SLOT_COUNT }, (_, i) =>
    SLOT_COUNT === 1 ? 0 : -90 + (180 / (SLOT_COUNT - 1)) * i
  );
  const STEP = SLOT_COUNT === 1 ? 180 : 180 / (SLOT_COUNT - 1);
  const TARGET = 0;

  wheel.innerHTML = SLOT_ANGLES.map(
    (_, i) => `<button class="card" data-slot="${i}" aria-label="티켓 ${i + 1}"></button>`
  ).join('');

  const slots = [...wheel.querySelectorAll('.card')];

  /* ---------- 모달 ---------- */
  const dlg = document.getElementById('ticketModal');
  const tFront = document.getElementById('tFront');
  const tBack  = document.getElementById('tBack');

async function openTicket(idx) {
  const info = tickets[idx]?.meta;
  if (!info) return;

  console.group('[openTicket]');
  
  let imgUrl = (tickets[idx]?.src && String(tickets[idx].src).trim())
    ? tickets[idx].src
    : 'posters/poster1.png';

  try {
    const r = await getTicketDetail(info.ticketId);
    console.log('✅ RAW API response:', r);

    if (r && r.ticket_id) {
      // ✅ snake_case 그대로 접근
      info.title = r.contest?.name || info.title;
      info.proofCode = r.ticket_detail?.human_code || info.proofCode;
      info.timestamp = r.ticket_detail?.issued_at || info.timestamp;
      info.hash = r.ticket_detail?.sha256 || info.hash;
      info.fileName = r.ticket_detail?.file_name_submitted || info.fileName;
      info.owner = r.ticket_detail?.owner_name || info.owner;

      const apiImg = r.contest?.image_url;
      if (apiImg && String(apiImg).trim() && apiImg !== 'null') {
        const looksLikeS3 = /rightmark-.*\.s3\./.test(apiImg);
        if (!looksLikeS3) imgUrl = apiImg;
      }
    }
  } catch (err) {
    console.error('[ticket detail error]', err);
  }

  const dlg = document.getElementById('ticketModal');
  const tFront = document.getElementById('tFront');
  const tBack = document.getElementById('tBack');

  // ✅ 속성 설정
  const payload = {
    'front-image': imgUrl,
    'title': info.title || '',
    'proof-code': info.proofCode || '',
    'timestamp': info.timestamp || '',
    'hash': info.hash || '',
    'file-name': info.fileName || '',
    'owner': info.owner || '',
    'date-right': info.dateRight || ''
  };

  Object.entries(payload).forEach(([k, v]) => {
    tFront?.setAttribute(k, v);
    tBack?.setAttribute(k, v);
  });
  tFront?.setAttribute('side', 'front');
  tBack?.setAttribute('side', 'back');

  // 배경 백업
  const frontBox = document.querySelector('.ticketContainer.is-front');
  const backBox = document.querySelector('.ticketContainer.is-back');
  [frontBox, backBox].forEach((box) => {
    if (!box) return;
    box.style.backgroundSize = 'cover';
    box.style.backgroundPosition = 'center';
    box.style.borderRadius = '24px';
    box.style.minWidth = '460px';
    box.style.minHeight = '788px';
  });

  dlg.showModal();
  // 다운로드 버튼 이벤트 연결 (항상 새로 연결)
  setTimeout(() => {
    const downloadBtn = document.getElementById('downloadTicketBtn');
    if (downloadBtn) {
      downloadBtn.onclick = async () => {
        try {
          const token = localStorage.getItem('accessToken');
          const ticketId = info.ticketId;
          if (!ticketId) return alert('티켓 정보가 없습니다.');
          const res = await fetch(`https://api.rightmarks.site/api/tickets/${ticketId}/download`, {
            method: 'GET',
            headers: {
              'accept': 'application/json;charset=UTF-8',
              'Authorization': token ? `Bearer ${token}` : ''
            }
          });
          const data = await res.json();
          const fileUrl = data?.result?.file_url || data?.result?.fileUrl;
          if (!fileUrl) return alert('다운로드 가능한 파일이 없습니다.');
          // 실제 PDF 다운로드
          const a = document.createElement('a');
          a.href = fileUrl;
          a.download = '';
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (err) {
          alert('다운로드 실패: ' + (err?.message || err));
        }
      };
    }
  }, 100);
  
  console.log('✅ Final check:', {
    tFrontSize: `${tFront?.offsetWidth}x${tFront?.offsetHeight}`,
    tBackSize: `${tBack?.offsetWidth}x${tBack?.offsetHeight}`
  });
  
  console.groupEnd();
}


// ✅ 수정: 클릭 시 실제 티켓 인덱스 전달
slots.forEach((btn, i) => {
  btn.addEventListener('click', () => {
    const realIdx = mapIdx(i);
    console.log(`🖱️ 슬롯 ${i} 클릭 → 티켓[${realIdx}]: ${tickets[realIdx]?.meta?.title}`);
    openTicket(realIdx);
  });
});
  dlg.querySelector('.close')?.addEventListener('click', () => dlg.close?.());

  /* ---------- 기하 계산 ---------- */
  let radius = 300, cx = 0, cy = 0, cardW = 230, cardH = 394;

  const calcGeom = () => {
    const rect = wheel.getBoundingClientRect();
    cx = 550;
    cy = rect.height * 1.75;
    const anyCard = slots[0];
    cardW = anyCard?.offsetWidth || 230;
    cardH = anyCard?.offsetHeight || 394;
    radius = Math.min(480, Math.max(360, rect.width * 0.45));
  };

  const norm360 = (a) => ((a % 360) + 360) % 360;
  const shortestDelta = (target, current) => ((target - current + 540) % 360) - 180;

  let offset = 0, phase = 0, residual = 0;
  const mapIdx = (i) => ((i - phase) % tickets.length + tickets.length) % tickets.length;

  /* ---------- 레이아웃 ---------- */
  const layout = () => {
    if (!tickets.length) return;

    phase = Math.round(offset / STEP);
    residual = offset - phase * STEP;

    slots.forEach((el, i) => {
      const ticket = tickets[mapIdx(i)];
      if (!ticket) return;

      el.style.setProperty('--src', `url('${ticket.src}')`);

      if (layoutMode === 'arc') {
        const angle = SLOT_ANGLES[i] + residual;
        const rad = (angle * Math.PI) / 180;
        const x = cx + radius * Math.sin(rad) - cardW / 2;
        const y = cy - radius * Math.cos(rad) - cardH;
        el.style.left = `${x}px`;
        el.style.top  = `${y}px`;
        el.style.transform = `rotate(${angle}deg)`;
        el.style.zIndex = String(1000 - Math.round(Math.abs(shortestDelta(TARGET, norm360(angle))) * 10));
      } else {
        // linear 모드: 4컬럼 그리드
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

    if (layoutMode === 'linear') updateLinearHeight();
  };

  const updateLinearHeight = () => {
    const perRow = 4;
    const rows = Math.ceil(SLOT_COUNT / perRow);
    const contentH = 80 + rows * (cardH + 60) + 240;
    wheelWrap.style.height = `${Math.max(560, contentH)}px`;
  };

  /* ---------- 토글(arc ↔︎ linear) ---------- */
  const applyScrollMode = () => {
    if (layoutMode === 'linear') {
      document.documentElement.style.overflowY = 'auto';
      document.body.style.overflowY = 'auto';
      updateLinearHeight();
    } else {
      document.documentElement.style.overflowY = 'hidden';
      document.body.style.overflowY = 'hidden';
      wheelWrap.style.height = '560px';
    }
  };

  sortBtn?.addEventListener('click', () => {
    layoutMode = (layoutMode === 'arc') ? 'linear' : 'arc';
    applyScrollMode();
    layout();
  });

  /* ---------- 드래그 & 관성 ---------- */
  let dragging = false, startX = 0, startOffset = 0, vel = 0, rafId = 0;
  const sensitivity = 0.1;

  const tick = () => {
    if (Math.abs(vel) > 0.001) {
      offset += vel;
      vel *= 0.75;
      layout();
      rafId = requestAnimationFrame(tick);
    } else if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  const onDown = (e) => {
    dragging = true;
    vel = 0;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startOffset = offset;
    wheel.classList.add('dragging');
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  };

  const onMove = (e) => {
    if (!dragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = x - startX;
    const next = startOffset + dx * sensitivity;
    vel = next - offset;
    offset = next;
    layout();
    e.preventDefault();
  };

  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    wheel.classList.remove('dragging');
    if (!rafId) rafId = requestAnimationFrame(tick);
  };

  wheel.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  wheel.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);

  /* ---------- 초기화 ---------- */
  const onResize = () => { calcGeom(); layout(); };
  window.addEventListener('resize', () => setTimeout(onResize, 100));
  applyScrollMode();
  onResize();

  console.log('[initWheel] 완료, 티켓 개수:', tickets.length);
}

/* =========================================================
   8) 실행
========================================================= */
await loadTickets();

/* =========================================================
   9) 모달 3D/홀로그램 효과
========================================================= */
document.querySelectorAll('.ticketContainer').forEach(container => {
  const overlay = container.querySelector('.lightOverlay');
  function trackOverlay(x, y, rect) {
    const nx = (x / rect.width) * 2 - 1;
    const ny = (y / rect.height) * 2 - 1;
    container.style.transform = `perspective(1000px) rotateX(${-ny * 10}deg) rotateY(${nx * 10}deg)`;
    overlay.style.backgroundPosition = `${(x / rect.width) * 100}% ${(y / rect.height) * 100}%`;
  }
  container.addEventListener('mousemove', e => {
    const r = container.getBoundingClientRect();
    trackOverlay(e.clientX - r.left, e.clientY - r.top, r);
  });
  container.addEventListener('mouseleave', () => {
    container.style.transform = '';
    overlay.style.backgroundPosition = '80% 80%';
  });
});

/* =========================================================
   10) 신규 티켓 발급 버튼
========================================================= */
document.getElementById('newTicketBtn')?.addEventListener('click', () => {
  location.href = 'register.html';
});
