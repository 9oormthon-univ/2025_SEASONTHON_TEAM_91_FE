import { http, HttpResponse } from 'msw';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

export const handlers = [
  // ✅ 로그인: /api/users/login
  http.post('/api/users/login', async ({ request }) => {
    await wait(300);
    const { email, password } = await request.json().catch(() => ({}));
    if (!email || !password) {
      return HttpResponse.json({ message: 'Missing credentials' }, { status: 400 });
    }
    return HttpResponse.json({
      token: 'demo-token-123',
      user: { id: 1, email },
    });
  }),

  // (옵션) 내 정보
  http.get('/api/users/me', async ({ request }) => {
    await wait(200);
    const auth = request.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ')) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({ id: 1, email: 'demo@proofticket.app', name: 'Demo User' });
  }),

  // 파일 검증
  http.post('/api/proofs/verify', async ({ request }) => {
    await wait(400);
    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!file) {
      return HttpResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }
    return HttpResponse.json({
      status: 'ok',
      filename: file.name || 'unknown',
      size: file.size || 0,
      hashPreview: 'abc123...demo',
      proofCode: 'PT-2025-000001',
    });
  }),
];
