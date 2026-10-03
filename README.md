# Kick Lite (PWA)

## Probar en local
    npx serve .        # o: python3 -m http.server 8080
(Sin proxy verás el MODO DEMO con streams de prueba.)

## Alojar gratis en Cloudflare Pages (incluye el proxy de `functions/api/`)
1. Sube esta carpeta a un repo de GitHub (los archivos en la raíz del repo, con `functions/` incluida).
2. dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git → elige el repo.
3. Configuración de compilación: Framework preset **None**, Build command **vacío**, Build output directory **/**. → Save and Deploy.
4. Abre https://TU-APP.pages.dev en el móvil.

Alternativa sin GitHub: `npx wrangler pages deploy . --project-name kick-lite`.

Límites del plan gratis: los archivos de la app (HTML, CSS, JS, imágenes) son ilimitados. Lo que pasa por `functions/api/`
(datos de Kick, imágenes de respaldo, vídeo de respaldo, login) cuenta para las 100.000 peticiones al día de Workers (se reinician a las 00:00 UTC).
El vídeo normal va directo desde Kick y no gasta peticiones; solo el modo de respaldo `/api/hls` las gasta.
Si algún día las superas, Settings → Functions → "Fail open" (por defecto) deja la app abierta pero sin datos; el plan de pago de Workers (5 USD/mes) sube el límite a 10 millones al mes.

(Sin las funciones, por ejemplo en GitHub Pages, verás el MODO DEMO con streams de prueba.)

## Instalar
- iOS: Safari → Compartir → "Agregar a pantalla de inicio".
- Android: Chrome → menú ⋮ → "Instalar aplicación".
Requiere HTTPS (todos los hosts anteriores lo dan).

## Seguridad para compartir
1. Cloudflare → tu proyecto de Pages → Settings → Variables and Secrets → añade ACCESS_CODE con un código (ej. "panda-2026") → vuelve a desplegar (Deployments → Retry deployment, o un commit nuevo).
   La app pedirá el código una sola vez en cada dispositivo. Para dejar fuera a alguien, cambia el código y vuelve a desplegar.
2. No publiques el enlace. `_headers` + robots.txt piden a los buscadores que no lo indexen.
3. Si ves mucho consumo, revisa Workers & Pages → tu proyecto → Metrics.

## Clips
Toca ✂ en el reproductor para guardar los últimos 15/30/60 s (se elige en 🎞). En 🎞 puedes recortar (por segmentos),
compartir o descargar .mp4. Los clips viven en memoria: descárgalos antes de cerrar la app.

Al editar un clip hay dos modos:
- **Limpio**: exporta el clip tal cual (horizontal, resolución original, sin texto). Es instantáneo.
- **Editado**: formato 16:9 o 9:16 (vertical: "Ajustar" con fondo difuminado o "Recortar" al centro) y texto estilo meme en tiempo real
  (arriba/centro/abajo, borde o fondo semitransparente, color y animación). Se vuelve a generar el clip, así que tarda lo que dura
  y hay que dejar la pantalla abierta. El formato final depende del navegador (.mp4 si graba H.264, si no .webm).

## Escribir en el chat (opcional)
1. kick.com/settings/developer → crea una app. Redirect URL = https://TU-APP.pages.dev/ (exacta, con la barra final).
   Permisos (scopes): user:read y chat:write.
2. Cloudflare Pages → Settings → Variables and Secrets: KICK_CLIENT_ID y KICK_CLIENT_SECRET (como Secret) → vuelve a desplegar.
3. En el chat del reproductor aparecerá "Iniciar sesión con Kick". Cada persona entra con su cuenta.

## Novedades al actualizar (changelog)
Cuando hay versión nueva, el aviso "Estamos haciendo cambios" muestra las novedades de `changelog.json`.
Para cada versión: sube `APP_V` en app.js (y `CACHE` en service-worker.js), y añade ARRIBA en changelog.json una entrada
con `"v"` = el nuevo número y una lista `items` con frases tipo "Hemos arreglado ...". Solo se muestran las entradas más nuevas
que la versión que el usuario tiene abierta.
