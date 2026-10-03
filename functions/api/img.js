// Proxy de imágenes (Cloudflare): /api/img?u=<URL https de una imagen de kick.com>
// Plan B: solo se usa cuando el navegador no puede cargar la imagen directamente.
const OK_HOST = /^([\w-]+\.)*kick\.com$/;
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36';
const hits = new Map();
function guard(request, env, url, limit) {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return new Response(null, { status: 403 });
  const code = env.ACCESS_CODE;
  if (code && url.searchParams.get('k') !== code) return new Response(null, { status: 401 });
  const ip = request.headers.get('cf-connecting-ip') || 'x';
  const m = Math.floor(Date.now() / 60000), key = ip + ':' + m;
  const n = (hits.get(key) || 0) + 1; hits.set(key, n);
  if (hits.size > 2000) for (const k of hits.keys()) if (!k.endsWith(':' + m)) hits.delete(k);
  if (n > limit) return new Response(null, { status: 429 });
  return null;
}
export async function onRequest({ request, env, waitUntil }) {
  const self = new URL(request.url);
  const bad = guard(request, env, self, 300); if (bad) return bad;
  let url;
  try { url = new URL(self.searchParams.get('u') || ''); } catch { return new Response(null, { status: 400 }); }
  if (url.protocol !== 'https:' || !OK_HOST.test(url.hostname)) return new Response(null, { status: 403 });
  const cache = caches.default, ck = new Request(self.origin + '/__img?u=' + encodeURIComponent(url.href));
  const hit = await cache.match(ck); if (hit) return hit;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://kick.com/', Accept: 'image/*' } });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.startsWith('image/')) return new Response(null, { status: r.ok ? 415 : r.status });
    const res = new Response(await r.arrayBuffer(), { status: 200, headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' } });
    waitUntil(cache.put(ck, res.clone()));
    return res;
  } catch { return new Response(null, { status: 502 }); }
}
