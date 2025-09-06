// ===== 스위치 (배포 후엔 false) ============================================
export const USE_MOCK = true;

// ===== 서버 설정 ===========================================================
export const API_BASE = 'http://127.0.0.1:8080/api';

async function jfetch(path, { method='GET', headers={}, body, auth=false } = {}) {
  const h = { Accept: 'application/json', ...headers };
  if (body && !(body instanceof FormData)) h['Content-Type'] = 'application/json;charset=UTF-8';
  if (auth) {
    const t = localStorage.getItem('accessToken');
    if (!t) throw new Error('로그인이 필요합니다.');
    h.Authorization = `Bearer ${t}`;
  }

  let res;
  try { res = await fetch(`${API_BASE}${path}`, { method, headers: h, body }); }
  catch { throw new Error(`서버에 연결할 수 없습니다. (${API_BASE}${path})`); }

  const data = await res.json().catch(()=> ({}));
  if (!res.ok) throw new Error(data?.message || `요청 실패 (${res.status})`);
  return data;
}

// ===== MOCK 응답 ===========================================================
// 1) 회원가입
const MOCK_REGISTER_RESPONSE = {
  isSuccess: true,
  code: 'USER_300',
  message: '로컬 회원가입 성공했습니다.',
  result: 1, // 예시 userId
};

// 2) 로그인
function makeMockLoginResponse(email) {
  const resp = {
    isSuccess: true,
    code: 'USER_302',
    message: '로컬 로그인 성공했습니다.',
    result: {
      tokenType: 'Bearer',
      accessToken: 'mock-access-token-123',
      me: { userId: 1, name: 'mockUser', email }
    }
  };
  // 요청하신 대로 전체 응답을 콘솔에 출력
  console.log('[MOCK LOGIN RESPONSE]', resp);
  return resp;
}

// ===== 공개 API (목업/실서버 공용) =========================================
// 회원가입: POST /api/users/register  body: {name,email,password}
export async function registerUser({ name, email, password }) {
  if (USE_MOCK) return MOCK_REGISTER_RESPONSE;
  return jfetch('/users/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

// 로그인: POST /api/users/login  body: {email,password}
export async function loginUser({ email, password }) {
  if (USE_MOCK) return makeMockLoginResponse(email);
  return jfetch('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}




// 1) 장르
const MOCK_GENRES = {
  isSuccess: true,
  code: 'GENRE_400',
  message: '장르 조회 성공했습니다.',
  result: {
    items: [
      { genre_id: 3, slug: 'design',     name: '디자인'   },
      { genre_id: 1, slug: 'literature', name: '문학/서사' },
      { genre_id: 2, slug: 'music',      name: '음악'     },
      { genre_id: 5, slug: 'other',      name: '기타'     },
      { genre_id: 4, slug: 'video',      name: '영상/애니' }
    ]
  }
};

// 2) 검색 결과(간단 목업) — 입력 문자열 일부가 포함되면 노출
const MOCK_CONTESTS = [
  { contest_id: 1, name: '공모전_테스트_1' },
  { contest_id: 2, name: '공모전_테스트_2' },
  { contest_id: 3, name: '디자인 챌린지 2025' },
  { contest_id: 4, name: '영상/애니 공모전 9월' },
];

// 3) contest 생성 응답 템플릿
function mockCreateContest(name, genreId) {
  const id = Number(sessionStorage.getItem('__mock_contest_seq') || '100') + 1;
  sessionStorage.setItem('__mock_contest_seq', String(id));
  const genreName = (MOCK_GENRES.result.items.find(g => g.genre_id == genreId)?.slug || 'OTHER').toUpperCase();

  return {
    isSuccess: true,
    code: 'CONTEST_500',
    message: '공모전 생성 성공했습니다.',
    result: {
      contest_id: id,
      name,
      image_url: 'http://localhost:8080/static/contests/mock.png',
      genre_id: Number(genreId),
      genre_name: genreName
    }
  };
}

// 4) 티켓 발급 응답 템플릿 (멱등: 동일 contestId+파일명 조합이면 existed=true)
function mockIssueTicket(contestId, file) {
  const key = `TICKET_${contestId}__${file.name}`;
  const existedBefore = !!sessionStorage.getItem(key);
  const ticketId = existedBefore
    ? Number(sessionStorage.getItem(key))
    : Number(sessionStorage.getItem('__mock_ticket_seq') || '1000') + 1;

  sessionStorage.setItem('__mock_ticket_seq', String(ticketId));
  sessionStorage.setItem(key, String(ticketId));

  const now = new Date();
  const iso = now.toISOString();
  const human = `테스트 코드-${String(ticketId).slice(-3)}`;

  return {
    isSuccess: true,
    code: 'TICKET_500',
    message: '티켓 발급 성공했습니다.',
    result: {
      response: {
        ticketId,
        contest: {
          contestId: Number(contestId),
          name: 'MOCK_CONTEST',
          imageUrl: 'http://localhost:8080/static/contests/mock.png'
        },
        ticketDetail: {
          humanCode: human,
          issuedAt: iso,
          sha256: 'mock-sha256-not-real',
          fileNameSubmitted: file.name,
          owner: { userId: 1, name: 'mockUser' }
        },
        pdfUrl: null
      },
      existed: existedBefore
    }
  };
}

// ====== 실제/목업 공용 API (한 함수로 묶기) ===============================
// 공모전 검색 (비인증)
export async function searchContests(q = '', limit) {
  if (USE_MOCK) {
    const term = q.trim();
    if (!term) return [];
    return MOCK_CONTESTS
      .filter(c => c.name.includes(term))
      .slice(0, limit || 10);
  }
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (limit) qs.set('limit', String(limit));
  const data = await jfetch(`/contests/search${qs.toString() ? `?${qs}` : ''}`);
  return data?.result?.items ?? [];
}

// 장르 조회 (인증)
export async function getGenres() {
  if (USE_MOCK) return MOCK_GENRES.result.items;
  const data = await jfetch('/genres', { auth: true });
  return data?.result?.items ?? [];
}

// 공모전 직접 추가 (인증) — query: name, genre_id / body: multipart(image 선택)
export async function createContest({ name, genreId, imageFile }) {
  if (USE_MOCK) return mockCreateContest(name, genreId).result;

  const qs = new URLSearchParams({ name: name.trim(), genre_id: String(genreId) });
  const fd = new FormData();
  if (imageFile instanceof File) fd.append('image', imageFile);

  const data = await jfetch(`/contests?${qs}`, { method: 'POST', body: fd, auth: true });
  return data?.result;
}

// 티켓 발급 (인증) — query: contest_id / body: multipart(file)
export async function issueTicket({ contestId, file }) {
  if (USE_MOCK) return mockIssueTicket(contestId, file).result;

  const qs = new URLSearchParams({ contest_id: String(contestId) });
  const fd = new FormData(); fd.append('file', file);

  const data = await jfetch(`/tickets/issue?${qs}`, { method: 'POST', body: fd, auth: true });
  return data?.result;
}

// ===== 비로그인 티켓 검증 API =============================================
// POST /api/verify/files?page=&size=  (multipart: file)
export async function verifyFiles({ file, page = 0, size = 8 }) {
  if (!(file instanceof File)) throw new Error('VERIFY_400: 파일을 첨부해주세요.');

  if (USE_MOCK) {
    // --- MOCK: 확장자/용량 제한 & 페이징 반영 ---
    const okExt = ['pdf','docx','mp3','mp4'];
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!okExt.includes(ext)) throw new Error('VERIFY_415: 지원하지 않는 파일 형식입니다.');
    if (file.size > 1024 * 1024 * 1024) throw new Error('VERIFY_413: 최대 1GB를 초과했습니다.');

    // 전체 개수(랜덤) → page/size 반영해 현재 페이지 tickets 산출
    const totalElements = Math.floor(Math.random() * 14); // 0~13
    const start = page * size;
    const end   = Math.min(start + size, totalElements);
    const pageLen = Math.max(0, end - start);

    const tickets = Array.from({ length: pageLen }, (_, i) => {
      const idx = start + i;
      return {
        ticketId: idx + 1,
        contestName: `공모전_테스트_${(idx % 10) + 1}`,
        humanCode: ['빛나는 장면-217','차분한 전개-071','섬세한 완성-071','미려한 질감-071'][idx % 4],
        issuedAt: new Date(Date.now() - idx * 1000 * 60).toISOString(),
        fileNameSubmitted: file.name,
      };
    });

    const resp = {
      isSuccess: true,
      code: 'VERIFY_300',
      message: '파일 검증 성공했습니다.',
      result: {
        count: tickets.length,           // ★ 이번 페이지 개수
        sha256: 'mocked-sha256...',
        tickets,
        page,
        size,
        totalElements,                   // 전체 개수
        totalPages: Math.ceil(totalElements / size) || 0,
        hasMore: end < totalElements,    // 다음 페이지 여부
      }
    };
    console.log('[MOCK VERIFY FILES REQUEST]', { page, size, name: file.name, sizeBytes: file.size });
    console.log('[MOCK VERIFY FILES RESPONSE]', resp);
    return resp;
  }

  const qs = new URLSearchParams({ page: String(page), size: String(size) }).toString();
  const fd = new FormData();
  fd.append('file', file);
  return jfetch(`/verify/files?${qs}`, { method: 'POST', body: fd });
}

// GET /api/verify/files/{ticket_id}
export async function getVerifyDetail(ticketId) {
  if (!ticketId) throw new Error('ticket_id가 필요합니다.');

  if (USE_MOCK) {
    const resp = {
      isSuccess: true,
      code: 'VERIFY_301',
      message: '티켓 자세히보기 성공했습니다.',
      result: {
        ticketId,
        contest: {
          contestId: 1,
          name: '공모전_테스트_1',
        //   imageUrl: 'http://localhost:8080/static/contests/demo.png',
          imageUrl:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYMMskKN9Ql1Ep4wG_vEW01t98DUBVXeXE8A&s'
        },
        humanCode: '빛나는 장면-217',
        issuedAt: new Date().toISOString(),
        sha256: 'mocked-sha256...',
        fileNameSubmitted: 'sample.pdf',
        owner: { name: 'user1' },
      }
    };
    console.log('[MOCK VERIFY DETAIL RESPONSE]', resp);
    return resp;
  }

  return jfetch(`/verify/files/${encodeURIComponent(ticketId)}`, { method: 'GET' });
}

// 로그인 필요: 내 티켓들
export async function getMyTickets() {
  if (USE_MOCK) {
    // 단건 스키마를 참고해 배열로 구성 (imageUrl / ticketDetail.* 매핑)
    const now = new Date().toISOString();
    return [
      {
        ticketId: 101,
        contest: { contestId: 1, name: '공모전_테스트_1', imageUrl: 'https://picsum.photos/seed/a/600/800' },
        ticketDetail: {
          humanCode: '은은한 문장-460',
          issuedAt: now,
          sha256: 'mock-a',
          fileNameSubmitted: 'mywork_a.pdf',
          owner: { name: 'user1' } // 혹은 ownerName: 'user1'
        }
      },
      {
        ticketId: 102,
        contest: { contestId: 2, name: '공모전_테스트_2', imageUrl: 'https://picsum.photos/seed/b/600/800' },
        ticketDetail: {
          humanCode: '차분한 전개-071',
          issuedAt: now,
          sha256: 'mock-b',
          fileNameSubmitted: 'mywork_b.mp4',
          owner: { name: 'user1' }
        }
      }
    ];
  }
  // 실제 서버 열리면 (백엔드가 제공하는) 경로만 바꿔주면 됨
  // 예: return jfetch('/tickets/me', { auth: true });
  // 또는: return jfetch('/users/me/tickets', { auth: true });
}

// 단건(인증) — 스키마가 문서에 명시됨(TICKET_501)
export async function getTicketById(ticketId) {
  if (USE_MOCK) {
    const now = new Date().toISOString();
    return {
      isSuccess: true,
      result: {
        ticketId,
        contest: { contestId: 1, name: '공모전_테스트_1', imageUrl: 'https://picsum.photos/seed/detail/600/800' },
        ticketDetail: {
          humanCode: '은은한 문장-460',
          issuedAt: now,
          sha256: 'mock-detail',
          fileNameSubmitted: 'sample.pdf',
          ownerName: 'user1'
        }
      }
    };
  }
  return jfetch(`/tickets/${encodeURIComponent(ticketId)}`, { auth: true });
}

/* ──────────────────────────────────────────────────────────────────────────
   [추가] 로그인 사용자의 티켓 목록 / 단건 조회 (인증 필요)
   - 경로는 상수로 빼서, 배포 백엔드가 확정되면 한 곳만 수정
   - Swagger의 단건 조회 스키마(TICKET_501) 기준으로 필드 정규화
     · 결과에 따라 ownerName 또는 owner.name 둘 다 대응
   ────────────────────────────────────────────────────────────────────────── */
// 백엔드 배포 후 실제 경로만 바꿔주면 됨
const MY_TICKETS_PATH = '/tickets/me';      // 예시) GET /api/tickets/me?page=&size=
const TICKET_DETAIL_PATH = (id) => `/tickets/${encodeURIComponent(id)}`; // GET

// 공통 정규화: API 응답 → UI에서 쓰기 쉬운 형태로
function normalizeTicket(item) {
  // 케이스A: 목록 API가 이미 'ticketId/contest/ticketDetail' 구조를 준다면
  if (item?.ticketId && item?.contest && item?.ticketDetail) {
    const td = item.ticketDetail || {};
    return {
      ticketId: item.ticketId,
      imageUrl: item.contest?.imageUrl || '',
      contestName: item.contest?.name || '',
      humanCode: td.humanCode || '',
      issuedAt: td.issuedAt || '',
      sha256: td.sha256 || '',
      fileNameSubmitted: td.fileNameSubmitted || '',
      ownerName: td.owner?.name || td.ownerName || '',
    };
  }

  // 케이스B: 단건 조회(TICKET_501) 형태
  if (item?.contest && item?.ticketDetail) {
    const td = item.ticketDetail || {};
    return {
      ticketId: item.ticketId || item.id,
      imageUrl: item.contest?.imageUrl || '',
      contestName: item.contest?.name || '',
      humanCode: td.humanCode || '',
      issuedAt: td.issuedAt || '',
      sha256: td.sha256 || '',
      fileNameSubmitted: td.fileNameSubmitted || '',
      ownerName: td.ownerName || td.owner?.name || '',
    };
  }

  // 아주 단순한 케이스 대비
  return {
    ticketId: item?.ticketId ?? item?.id ?? 0,
    imageUrl: item?.imageUrl ?? '',
    contestName: item?.contestName ?? '',
    humanCode: item?.humanCode ?? '',
    issuedAt: item?.issuedAt ?? '',
    sha256: item?.sha256 ?? '',
    fileNameSubmitted: item?.fileNameSubmitted ?? '',
    ownerName: item?.ownerName ?? '',
  };
}

// [목록] 내 티켓들
export async function listMyTickets({ page = 0, size = 50 } = {}) {
  if (USE_MOCK) {
    // 가벼운 목업: 7개 만들어서 wheel에 넣기 좋게
    const now = Date.now();
    const mk = (i) => ({
      ticketId: i + 1,
      contest: {
        contestId: i + 100,
        name: `공모전_테스트_${i + 1}`,
        // 데모용 이미지(로컬 서버 없을 때도 보이게)
        imageUrl: 'https://picsum.photos/seed/pt' + (i + 1) + '/800/1200'
      },
      ticketDetail: {
        humanCode: ['빛나는 장면-217','차분한 전개-071','은은한 문장-460'][i % 3],
        issuedAt: new Date(now - i * 3600_000).toISOString(),
        sha256: 'mocked-sha256-' + (i + 1),
        fileNameSubmitted: `sample_${i + 1}.pdf`,
        ownerName: 'mockUser'
      }
    });
    const items = Array.from({ length: 7 }, (_, i) => normalizeTicket(mk(i)));
    return { items, page, size, totalElements: items.length, totalPages: 1 };
  }

  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  const data = await jfetch(`${MY_TICKETS_PATH}?${qs}`, { auth: true });
  // 백엔드 응답 스키마에 따라 result.items 또는 result 자체가 배열일 수 있음
  const raw = (data?.result?.items ?? data?.result ?? []);
  const items = (Array.isArray(raw) ? raw : []).map(normalizeTicket);
  return {
    items,
    page: data?.result?.page ?? page,
    size: data?.result?.size ?? size,
    totalElements: data?.result?.totalElements ?? items.length,
    totalPages: data?.result?.totalPages ?? 1
  };
}

// [단건] 티켓 상세
export async function getTicketDetail(ticketId) {
  if (!ticketId) throw new Error('ticketId가 필요합니다.');
  if (USE_MOCK) {
    const one = normalizeTicket({
      ticketId,
      contest: {
        contestId: 1,
        name: '공모전_테스트_1',
        imageUrl: 'https://picsum.photos/seed/pt_detail/800/1200'
      },
      ticketDetail: {
        humanCode: '빛나는 장면-217',
        issuedAt: new Date().toISOString(),
        sha256: 'mocked-sha256-detail',
        fileNameSubmitted: 'my_work.pdf',
        ownerName: 'mockUser'
      }
    });
    return one;
  }

  const data = await jfetch(TICKET_DETAIL_PATH(ticketId), { auth: true });
  // Swagger TICKET_501 응답을 normalize
  return normalizeTicket({
    ticketId: data?.result?.ticketId,
    contest: data?.result?.contest,
    ticketDetail: data?.result?.ticketDetail
  });
}
