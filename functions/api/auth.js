// Inicio de sesión con Kick (OAuth 2.1 + PKCE) y envío de mensajes al chat. OPCIONAL.
// Variables en Cloudflare Pages: KICK_CLIENT_ID y KICK_CLIENT_SECRET (de tu app en kick.com/settings/developer).
// El servidor NO guarda tokens: solo intercambia códigos y reenvía mensajes.
const hits = new Map();
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
function guard(request, env, url, limit) {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return new Response(null, { status: 403 });
  const code = env.ACCESS_CODE;
  if (code && url.searchParams.get('k') !== code) return J({ error: 'codigo' }, 401);
  const ip = request.headers.get('cf-connecting-ip') || 'x';
  const m = Math.floor(Date.now() / 60000), key = ip + ':' + m;
  const n = (hits.get(key) || 0) + 1; hits.set(key, n);
  if (hits.size > 2000) for (const k of hits.keys()) if (!k.endsWith(':' + m)) hits.delete(k);
  if (n > limit) return new Response(null, { status: 429 });
  return null;
}
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const bad = guard(request, env, url, 60); if (bad) return bad;
  const id = env.KICK_CLIENT_ID, secret = env.KICK_CLIENT_SECRET, a = url.searchParams.get('action');
  if (a === 'config') return J({ enabled: !!(id && secret), clientId: id || '' });
  if (!id || !secret) return J({ error: 'no configurado' }, 501);
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  let b = {}; try { b = (await request.json()) || {}; } catch {}
  try {
    if (a === 'token' || a === 'refresh') {
      const p = new URLSearchParams(a === 'token'
        ? { grant_type: 'authorization_code', client_id: id, client_secret: secret, redirect_uri: String(b.redirect || ''), code_verifier: String(b.verifier || ''), code: String(b.code || '') }
        : { grant_type: 'refresh_token', client_id: id, client_secret: secret, refresh_token: String(b.refresh || '') });
      const r = await fetch('https://id.kick.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: p });
      return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json' } });
    }
    if (a === 'send') {
      const r = await fetch('https://api.kick.com/public/v1/chat', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + String(b.token || ''), 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ broadcaster_user_id: Number(b.uid), content: String(b.content || '').slice(0, 500), type: 'user' })
      });
      return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json' } });
    }
  } catch { return J({ error: 'fallo' }, 502); }
  return new Response(null, { status: 400 });
}
