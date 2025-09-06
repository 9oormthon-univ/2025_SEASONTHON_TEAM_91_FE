import { verifyFiles } from './js/apiClient.js';
import { loginUser } from './js/apiClient.js';

// ★ API에 맞춘 버전: 생짜 fetch + Swagger 응답 스키마 반영
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = 'http://127.0.0.1:8080/api'; // 필요시 '/api' 상대경로로 변경 가능

  /* ====== 업로드 영역 ====== */
  const uploadBox  = document.getElementById('uploadBox');
  const fileInput  = document.getElementById('fileInput');
  const confirmBtn = document.getElementById('confirmBtn');

  if (uploadBox && fileInput && confirmBtn) {
    uploadBox.addEventListener('click', (e) => {
      if (e.target !== fileInput) fileInput.click();
    });

    fileInput.addEventListener('change', handleFileUpload);

    function handleFileUpload() {
      const fileName = fileInput.files[0]?.name || '파일을 끌어다 놓거나 눌러서 선택해주세요.';
      const span = uploadBox.querySelector('span');
      if (span) span.textContent = fileName;

      const hasFile = fileInput.files.length > 0;
      confirmBtn.disabled = !hasFile;

      if (hasFile) {
        uploadBox.style.background   = 'linear-gradient(360deg, #596E99 0%, #94B8FF 100%)';
        uploadBox.style.border       = '2px dashed #979797';
        uploadBox.style.boxShadow    = '0px 0px 0px rgba(0, 0, 0, 0.08)';
        uploadBox.style.borderRadius = '20px';
      }
    }

    // 초기 상태
    handleFileUpload();

// 업로드 확인(비로그인 검증: POST /api/verify/files)
confirmBtn.addEventListener('click', async () => {
  if (fileInput.files.length === 0) {
    alert('파일이 아직 업로드되지 않았습니다.');
    return;
  }
  try {
    const file = fileInput.files[0];
    const page = 0, size = 8;

    const { result } = await verifyFiles({ file, page, size });

    sessionStorage.setItem('verifyResult', JSON.stringify({
      count:   result.count,
      tickets: result.tickets,
    }));

    location.href = 'proofcomplete.html';
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes('VERIFY_415')) {
      alert('지원하지 않는 파일 형식입니다. (pdf, docx, mp3, mp4만 가능)');
    } else if (msg.includes('VERIFY_413')) {
      alert('업로드 가능한 최대 크기(1GB)를 초과했습니다.');
    } else if (msg.includes('VERIFY_400')) {
      alert('파일을 첨부해주세요.');
    } else {
      alert(`검증 실패: ${msg}`);
      location.href = 'prooffailed.html'
    }
  }
});

  }

  /* ====== 로그인 영역 ====== */
  const emailInput    = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn      = document.getElementById('loginBtn');
  const loginForm     = document.getElementById('loginForm');

  if (emailInput && passwordInput && loginBtn && loginForm) {
    const checkInputs = () => {
      loginBtn.disabled = !(emailInput.value.trim() && passwordInput.value.trim());
    };

    emailInput.addEventListener('input', checkInputs);
    passwordInput.addEventListener('input', checkInputs);
    checkInputs(); // 초기 상태

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (loginBtn.disabled) return;

      try {
        const resp = await loginUser({
          email: emailInput.value.trim(),
          password: passwordInput.value.trim(),
        });
        // 전체 응답 콘솔 출력(요청하셨던 형식)
        console.log('[MOCK LOGIN RESPONSE]', resp);

        const token = resp?.result?.accessToken;
        const me    = resp?.result?.me;
        if (!token) throw new Error('토큰이 응답에 없습니다.');

        localStorage.setItem('accessToken', token);
        if (me) localStorage.setItem('me', JSON.stringify(me));

        alert('로그인 성공! 이제 발급/마이페이지 기능을 사용할 수 있어요.');
        location.href = 'register.html';
      } catch (e) {
        alert(`로그인 실패: ${e.message || e}`);
      }
    });
  }

  /* ====== 스크롤 애니메이션(티켓) ====== */
  const container = document.querySelector('.container');
  const sec2 = document.getElementById('section-2');
  const sec3 = document.getElementById('section-3');
  const t1   = document.getElementById('ticket1');
  const t2   = document.getElementById('ticket2');

  if (container && sec2 && sec3 && t1 && t2) {
    function setInitial() {
      t1.style.opacity   = '1';
      t1.style.transform = 'rotateY(180deg)';
      t2.style.opacity   = '0';
      t2.style.transform = 'rotateY(-180deg)';
    }
    setInitial();

    function getProgress() {
      const y = container.scrollTop;
      const sec2Top = sec2.offsetTop;
      const sec3Top = sec3.offsetTop;
      const dist = sec3Top - sec2Top;
      if (dist <= 0) return 0;
      let p = (y - sec2Top) / dist;
      return Math.max(0, Math.min(1, p));
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const p = getProgress();
        t1.style.transform = `rotateY(${p * 180}deg)`;
        t1.style.opacity   = String(1 - p);

        t2.style.transform = `rotateY(${-180 + p * 180}deg)`;
        t2.style.opacity   = String(p);

        ticking = false;
      });
    }

    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('load', onScroll);
    window.addEventListener('resize', onScroll);
  }
});
