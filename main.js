// ★ MSW 버전: 서비스/어댑터 없이 생짜 fetch만 사용합니다.
document.addEventListener("DOMContentLoaded", () => {
  /* ====== 업로드 영역 ====== */
  const uploadBox  = document.getElementById('uploadBox');
  const fileInput  = document.getElementById('fileInput');
  const confirmBtn = document.getElementById('confirmBtn');

  if (uploadBox && fileInput && confirmBtn) {
    // 라벨 클릭 → 파일 선택
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

    // 업로드 확인
    confirmBtn.addEventListener('click', async () => {
      if (fileInput.files.length === 0) {
        alert('파일이 아직 업로드되지 않았습니다.');
        return;
      }
      try {
        const form = new FormData();
        form.append('file', fileInput.files[0]);

        const res = await fetch('/api/proofs/verify', {
          method: 'POST',
          body: form, // Content-Type 자동 설정
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || '업로드 실패');
        }

        const data = await res.json();
        console.log('verify result:', data);
        location.href = 'proofcomplete.html';
      } catch (e) {
        alert(`업로드 실패: ${e.message}`);
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
        const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: emailInput.value.trim(),
            password: passwordInput.value.trim(),
        }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || '로그인 실패');

        // 토큰 저장 (나중에 /api/users/me 호출 시 사용)
        if (data.token) localStorage.setItem('token', data.token);

        console.log('logged in:', data.user);
        location.href = 'register.html';
    } catch (e) {
        alert(`로그인 실패: ${e.message}`);
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
