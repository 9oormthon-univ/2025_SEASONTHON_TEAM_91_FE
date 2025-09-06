/* =========================================================================
 * apiClient.js  —  RightMark(가칭) 프런트 전용 API 래퍼
 * - Spring Boot Swagger (http://13.125.59.4:8080/swagger-ui) 기준
 * - 공용 유틸 (jfetch), 인증 토큰 저장/헤더, 응답 정규화 포함
 * - FormData일 땐 Content-Type 자동 생략
 * ========================================================================= */

export const API_BASE = 'http://13.125.59.4:8080/api'; // Nginx로 /api 프록시되는 구조 권장

/* ============================== 내부 유틸 =============================== */

// 토큰 보관 키
const K_TOKEN = 'accessToken';  // raw token or "Bearer XXX"
const K_TYPE  = 'tokenType';    // e.g., "Bearer"
const K_ME    = 'me';

// Authorization 헤더 생성 (이미 "Bearer "로 시작하면 그대로 사용)
function buildAuthHeader() {
  const token = localStorage.getItem(K_TOKEN);
  const type  = localStorage.getItem(K_TYPE) || 'Bearer';
  if (!token) throw new Error('로그인이 필요합니다.');
  const value = token.startsWith('Bearer ') ? token : `${type} ${token}`;
  return { Authorization: value };
}

// 공통 fetch
async function jfetch(path, { method = 'GET', headers = {}, body, auth = false } = {}) {
  const h = { Accept: 'application/json', ...headers };
  if (body && body instanceof FormData === false) {
    // JSON 요청
    h['Content-Type'] = 'application/json;charset=UTF-8';
  }
  if (auth) Object.assign(h, buildAuthHeader());

  let res;
  const url = `${API_BASE}${path}`;
  try {
    res = await fetch(url, { method, headers: h, body });
  } catch (err) {
    throw new Error(`서버에 연결할 수 없습니다. (${url})`);
  }

  // 서버가 빈 응답을 줄 수도 있으니 안전 파싱
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Swagger가 message/code를 내려주면 우선 노출
    const msg = data?.message || `요청 실패 (${res.status})`;
    const code = data?.code ? ` [${data.code}]` : '';
    throw new Error(`${msg}${code}`);
  }
  return data;
}

// 로그인 응답 정규화: access_token/token_type vs accessToken/tokenType
function normalizeLoginResult(result) {
  const accessToken = result?.access_token ?? result?.accessToken ?? null;
  const tokenType   = result?.token_type   ?? result?.tokenType   ?? 'Bearer';
  const me          = result?.me ?? null;
  return { accessToken, tokenType, me };
}

// 토큰/내 정보 저장
function persistAuth({ accessToken, tokenType, me }) {
  if (!accessToken) throw new Error('토큰이 응답에 없습니다.');
  localStorage.setItem(K_TOKEN, accessToken);
  localStorage.setItem(K_TYPE, tokenType || 'Bearer');
  if (me) localStorage.setItem(K_ME, JSON.stringify(me));
}

/* ============================ Users/Auth =============================== */
/** POST /api/users/register  body: {name,email,password} */
export async function registerUser({ name, email, password }) {
  return jfetch('/users/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

/** POST /api/users/login  body: {email,password}
 *  응답(result): { access_token, token_type, me } (Swagger 기준)
 */
export async function loginUser({ email, password }) {
  const data = await jfetch('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const norm = normalizeLoginResult(data?.result || {});
  persistAuth(norm);
  // 호출측에서 필요하면 원본+정규화 같이 사용
  return { ...data, normalized: norm };
}

export function logout() {
  localStorage.removeItem(K_TOKEN);
  localStorage.removeItem(K_TYPE);
  localStorage.removeItem(K_ME);
}

export function getMeFromStorage() {
  try { return JSON.parse(localStorage.getItem(K_ME) || 'null'); }
  catch { return null; }
}

/* ============================== Genres ================================ */
/** GET /api/genres  (인증 필요) */
export async function getGenres() {
  const data = await jfetch('/genres', { auth: true });
  return data?.result?.items ?? data?.result ?? [];
}

/* ============================= Contests =============================== */
/** GET /api/contests/search?q=&limit=  (비인증) */
export async function searchContests(q = '', limit) {
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (limit) qs.set('limit', String(limit));

  const data = await jfetch(`/contests/search${qs.toString() ? `?${qs}` : ''}`);
  return data?.result?.items ?? data?.result ?? [];
}

/** POST /api/contests?name=&genre_id=  body: multipart(image)  (인증) */
export async function createContest({ name, genreId, imageFile }) {
  const qs = new URLSearchParams({ name: name.trim(), genre_id: String(genreId) });
  const fd = new FormData();
  if (imageFile instanceof File) fd.append('image', imageFile);

  const data = await jfetch(`/contests?${qs}`, {
    method: 'POST',
    body: fd,
    auth: true,
  });
  return data?.result ?? data;
}

/* ============================== Tickets =============================== */
// 응답 normalize (목록/단건이 약간씩 다를 수 있어 공통 필드로 통일)
function normalizeTicket(item) {
  if (!item) return null;
  const contest = item.contest || {};
  const td = item.ticketDetail || {};
  return {
    ticketId: items.ticketId ?? item.id ?? 0,
    contestId: contest.contestId ?? contest.id ?? null,
    contestName: contest.name ?? '',
    imageUrl: contest.imageUrl ?? item.imageUrl ?? '',
    humanCode: td.humanCode ?? item.humanCode ?? '',
    issuedAt: td.issuedAt ?? item.issuedAt ?? '',
    sha256: td.sha256 ?? item.sha256 ?? '',
    fileNameSubmitted: td.fileNameSubmitted ?? item.fileNameSubmitted ?? '',
    ownerName: td.owner?.name ?? td.ownerName ?? item.ownerName ?? '',
  };
}

/** POST /api/tickets/issue?contest_id=  body: multipart(file)  (인증)
 *  result: { response: { ticketId, contest:{...}, ticketDetail:{...}, pdfUrl }, existed }
 */
export async function issueTicket({ contestId, file }) {
  if (!(file instanceof File)) throw new Error('파일이 필요합니다.');
  const qs = new URLSearchParams({ contest_id: String(contestId) });
  const fd = new FormData();
  fd.append('file', file);

  const data = await jfetch(`/tickets/issue?${qs}`, {
    method: 'POST',
    body: fd,
    auth: true,
  });
  return data?.result ?? data;
}

/** GET /api/tickets/{ticketId}  (인증) — 단건 */
export async function getTicketDetail(ticketId) {
  const data = await jfetch(`/tickets/${encodeURIComponent(ticketId)}`, { auth: true });
  console.log("data : " + data);
  const raw = data?.result ?? data;
  return normalizeTicket({
    ticketId: raw?.ticketId,
    contest: raw?.contest,
    ticketDetail: raw?.ticketDetail,
  });
}

/** GET /api/tickets/me?page=&size=  (인증) — 내 티켓 목록 */
export async function listMyTickets({ page = 0, size = 20 } = {}) {
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  const data = await jfetch(`/tickets?${qs}`, { auth: true });

  const container = data?.result ?? data;
  const itemsRaw = container?.items ?? container ?? [];
  const items = (Array.isArray(itemsRaw) ? itemsRaw : []).map(normalizeTicket);

  return {
    items,
    page: container?.page ?? page,
    size: container?.size ?? size,
    totalElements: container?.totalElements ?? items.length,
    totalPages: container?.totalPages ?? 1,
  };
}

/* ============================== Verify ================================ */
/** POST /api/verify/files?page=&size=  body: multipart(file)  (비인증)
 *  result: { count, tickets:[{...}], page,size,totalElements,totalPages,hasMore,sha256 }
 */
export async function verifyFiles({ file, page = 0, size = 8 }) {
  if (!(file instanceof File)) throw new Error('VERIFY_400: 파일을 첨부해주세요.');

  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  const fd = new FormData();
  fd.append('file', file);

  return jfetch(`/verify/files?${qs}`, { method: 'POST', body: fd });
}

/** GET /api/verify/files/{ticket_id}  (비인증) — 검증 상세 */
export async function getVerifyDetail(ticketId) {
  if (!ticketId) throw new Error('ticket_id가 필요합니다.');
  return jfetch(`/verify/files/${encodeURIComponent(ticketId)}`);
}

/* ============================== Helpers =============================== */
export function isAuthed() {
  return !!localStorage.getItem(K_TOKEN);
}
