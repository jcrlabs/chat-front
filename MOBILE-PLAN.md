# Chat Mobile — Plan Capacitor

App movil para JCRLabs Chat (Android + iOS) usando Capacitor.
Shell nativo que carga la web live desde `https://chat.jcrlabs.net`.

## Estrategia

- `server.url` en capacitor.config apunta a la web desplegada
- Auto-update: cada deploy a K8s actualiza la app automaticamente
- El APK/IPA es solo un wrapper nativo — zero code changes en el web
- WebSocket y WebRTC funcionan en WebView sin modificaciones

## Implementacion (completada)

### 1. Capacitor instalado
- `@capacitor/core`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/status-bar`, `@capacitor/splash-screen`
- `@capacitor/cli` en devDependencies

### 2. capacitor.config.ts
- `appId: 'net.jcrlabs.chat'`
- `server.url: 'https://chat.jcrlabs.net'`
- SplashScreen con backgroundColor `#1e1f22`

### 3. Permisos nativos configurados
- Android: INTERNET, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS
- iOS: NSMicrophoneUsageDescription para canales de voz

### 4. Proyectos nativos generados
- `android/` y `ios/` creados via `cap add`

### 5. Scripts package.json
- `mobile:sync` — build web + sync capacitor
- `mobile:android` — build debug APK
- `mobile:ios` — abrir en Xcode
- `mobile:dev` — live reload con device conectado

### 6. GitHub Actions workflow
- `.github/workflows/mobile-build.yml` — trigger manual
- Genera APK debug como artifact descargable
- Opcion de build iOS (unsigned, simulator)
- Usa mismos secrets VITE_* que cd.yml

## CI/CD

Build via GitHub Actions → descargar APK desde artifacts.
Ver `SHARED-MOBILE-CICD.md` en raiz de jcrlabs para patron compartido.

## Checklist de verificacion

- [ ] Login funciona
- [ ] Mensajes se envian/reciben via WebSocket
- [ ] Badges de unread aparecen
- [ ] Voice channel: mic pide permiso y audio funciona
- [ ] App se actualiza sola al hacer deploy web (cerrar y reabrir)

## Fase posterior (opcional)

- Push notifications con `@capacitor/push-notifications`
- Requiere endpoint `POST /api/push/register` en chat-back
- Para uso familiar, las notificaciones web pueden ser suficientes
