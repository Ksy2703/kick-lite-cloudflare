// Proxy de datos de Kick (Cloudflare Pages Functions) → /api/kick?path=/api/v2/channels/xqc
// Kick no envía cabeceras CORS, por eso las consultas pasan por aquí.

// ---- Protección básica (mismo código en kick, hls, img y auth) ----
// 1) Solo acepta peticiones hechas desde tu propia página (Sec-Fetch-Site).
// 2) Si defines la variable ACCESS_CODE en Cloudflare, exige ese código (?k=...).
// 3) Límite de peticiones por IP y minuto (mejor esfuerzo).
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

export async function onRequest({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const bad = guard(request, env, url, 90); if (bad) return bad;
  const p = url.searchParams.get('path') || '';
  const ok = /^\/(api\/v[12]\/channels\/[\w-]+|stream\/livestreams\/\w+|api\/search|emotes\/[\w-]+)(\?[\w=&%-]*)?$/.test(p);
  if (!ok) return new Response('{"error":"path no permitido"}', { status: 400, headers: { 'Content-Type': 'application/json' } });
  const cache = caches.default, ck = new Request(url.origin + '/__kick?path=' + encodeURIComponent(p));
  const hit = await cache.match(ck); if (hit) return hit;      // 30 s de caché: menos consultas a Kick
  try {
    const r = await fetch('https://kick.com' + p, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36' }
    });
    const res = new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' } });
    if (r.ok) waitUntil(cache.put(ck, res.clone()));
    return res;
  } catch { return new Response('{"error":"fallo al contactar con Kick"}', { status: 502, headers: { 'Content-Type': 'application/json' } }); }
}
