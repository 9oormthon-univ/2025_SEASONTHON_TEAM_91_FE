// msw/start.js
export async function startMSW() {
  // ✅ CDN에서 ESM 모듈 바로 가져오기
  const { setupWorker } = await import('https://esm.sh/msw@2.11.1/browser');
  const { handlers } = await import('./handlers.js');

  const worker = setupWorker(...handlers);
  await worker.start({
    serviceWorker: { url: '/mockServiceWorker.js' },
    onUnhandledRequest: 'bypass',
  });
  console.log('[MSW] worker started');
}
