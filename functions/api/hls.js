// Proxy de video (Cloudflare): /api/hls?u=<URL https del .m3u8 o segmento>. Solo plan B.
// Solo permite los dominios de video de Kick.
const OK_HOST = /^(stream\.kick\.com|([\w-]+\.)*live-video\.net)$/;
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36';
const hits = new Map();
function guard(request, env, url, limit) {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return new Response(null, { status: 403 });
  const code = env.ACCESS_CODE;
  if (code && url.searchParams.get('k') !== code) return new Response('{"error":"codigo"}', { status: 401, headers: { 'Content-Type': 'application/json' } });
  const ip = request.headers.get('cf-connecting-ip') || 'x';
  const m = Math.floor(Date.now() / 60000), key = ip + ':' + m;
  const n = (hits.get(key) || 0) + 1; hits.set(key, n);
  if (hits.size > 2000) for (const k of hits.keys()) if (!k.endsWith(':' + m)) hits.delete(k);
  if (n > limit) return new Response(null, { status: 429 });
  return null;
}
export async function onRequest({ request, env }) {
  const self = new URL(request.url);
  const bad = guard(request, env, self, 400); if (bad) return bad;
  let url;
  try { url = new URL(self.searchParams.get('u') || ''); } catch { return new Response(null, { status: 400 }); }
  if (url.protocol !== 'https:' || !OK_HOST.test(url.hostname)) return new Response(null, { status: 403 });
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Origin: 'https://kick.com', Referer: 'https://kick.com/' } });
    const isList = /\.m3u8$/i.test(url.pathname) || /mpegurl/i.test(r.headers.get('content-type') || '');
    if (isList) {
      let txt = await r.text();
      if (self.searchParams.get('r') === '1') { // reescribe rutas para reproductores nativos (Safari antiguo)
        const k = self.searchParams.get('k'), kq = k ? '&k=' + encodeURIComponent(k) : '';
        const prox = l => '/api/hls?r=1' + kq + '&u=' + encodeURIComponent(new URL(l, url).href);
        txt = txt.split('\n').map(l => l.startsWith('#') ? l.replace(/URI="([^"]+)"/g, (_, u) => `URI="${prox(u)}"`) : (l.trim() ? prox(l.trim()) : l)).join('\n');
      }
      return new Response(txt, { status: r.status, headers: { 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' } });
    }
    return new Response(r.body, { status: r.status, headers: { 'Content-Type': r.headers.get('content-type') || 'application/octet-stream', 'Cache-Control': 'public, max-age=60' } });
  } catch { return new Response(null, { status: 502 }); }
}
