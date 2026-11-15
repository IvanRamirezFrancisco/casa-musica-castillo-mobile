# APK y evidencia Android del cierre

> Documento histórico del 29 de octubre. Las cifras y decisiones de publicación describen esa ejecución. La Etapa 1B del 3 de noviembre permite publicar el Draft PR con solapamientos documentados: consultar [el informe actual](../etapa1b/README.md).


Dispositivo: `emulator-5554`, Pixel 8 API 36; Android Debug 1.0/código 1, target 36. APK nuevo compilado e instalado en este cierre. SHA-256:

`85694c4fa0b1e72a16eab636b3e2ab566cd65f52bdc27bf3927949057f53db64`

El APK extraído de la instalación coincide con el compilado. El manifiesto `VALIDATION.json` verifica también los assets web del ZIP frente a `www/` y conserva metadatos de instalación. Última instalación registrada por Android: `2026-10-29 14:21:52` (reloj del dispositivo, no hora local del usuario).

## Recorridos y nivel de evidencia

| Pantalla / flujo | APK nuevo | Backend real | Evidencia / límite |
|---|---|---|---|
| Inicio y navegación inferior | Sí | GET públicos | `android/inicio.png`, registro de recorrido |
| Categorías / catálogo / filtros / orden | Sí | GET públicos | `catalogo.png`, `filtros.png`, `orden.png` |
| Búsqueda | Sí | GET con keyword | `busqueda.png`; respuesta 200 observada |
| Detalle / cantidad / opiniones | Sí | GET producto y opiniones | `detalle.png`, `cantidad.png`, `opiniones.png`; producto 313 con una imagen y cero opiniones |
| Login / registro / recuperación / verificación | Sí, UI de invitado | No se envían formularios | `login.png`, `registro.png`, `recuperacion.png`, `verificacion.png` |
| Carrito protegido | Sí, redirección de invitado | Sin lectura privada | `cart-protegido.png`: Login con retorno al carrito |
| Perfil protegido | Sí, redirección de invitado | Sin perfil privado | `profile-protegido.png`: Login con retorno al perfil |
| Checkout / Editar perfil autenticados | No recorrido nativo privado | No | Componentes y contratos probados con HttpTestingController; no captura falsa de perfil ni checkout |
| Error de red / reintento | Sí | Desconexión sólo WebView y GET recuperado | `sin-conexion.png`, `reintento.png` |
| Catálogo / detalle / Login 320×568 | Sí | GET públicos; Login sin envío | `pequeno-catalogo.png`, `pequeno-detalle.png`, `pequeno-login.png`; sin overflow horizontal observado |
| Inicio pequeño / tableta / horizontal de este APK | **Parcial** | No atribuible en el intento incompleto | Incidente nativo y timeout descritos abajo; no PASS global |

La revisión anterior dispone de matriz completa y capturas de su APK (`docs/testing/commerce-ui/`, manifiesto COMMERCE). Se conservan como evidencia histórica. No se cambian sus hashes ni se afirma que su binario sea el del cierre.

## Incidentes visibles y límites

La primera automatización no encontró el socket porque la app no estaba activa y Chrome ocupaba el emulador; tras abrir la app, el recorrido público completo pasó. No se confunde ese fallo del ejecutor con un error de autenticación.

Al repetir tamaños nativos, una captura de Inicio 320×568 mostró **«System UI isn’t responding»**. Se conserva como incidente en `android/incidents/system-ui-anr.png`, no como captura aprobada. Después Catálogo, Detalle y Login pequeños quedaron visibles sin ese diálogo. La matriz no se completa en tableta: el ejecutor esperó Inicio con novedades y agotó su espera. No se atribuye automáticamente ese timeout a Angular, al backend o al diálogo anterior sin diagnóstico adicional. La matriz final queda parcial aunque sus observaciones geométricas parciales no tengan overflow. Se restauran tamaño/densidad/rotación mediante `finally`.

La primera variante del script falló al navegar después de cambiar tamaño con una sesión de depuración persistente. La variante actual abre una WebView nueva por perfil, conserva los resultados parciales y no convierte un timeout en PASS. Antes de volver a presentar esa matriz, estabilizar/reiniciar el emulador y ejecutarla nuevamente. No se reinició ni modificó Spring Boot para resolverlo.

No se validan teclado completo, TalkBack, teléfono físico o Release. No se ejecuta Maestro en esta máquina. Un formulario de Login correcto no demuestra login/MFA real. No hay cuenta sintética, buzón o BD aislada autorizados.

## Reproducción segura

Desde la raíz, PowerShell con Node/SDK/JDK 21:

```powershell
npm run build -- --configuration=development
npx cap sync android
# Desde android/:
.\gradlew.bat assembleDebug
# Desde la raíz:
$env:ADB = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $env:ADB -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk
& $env:ADB -s emulator-5554 shell am start -W -n com.casademusicacastillo.app/.MainActivity
node test/check-public-api.mjs
node test/android-public-smoke.mjs
node test/android-layout-smoke.mjs
```

Los scripts requieren backend local disponible, paquete Debug y emulador estable; usan taps/swipes nativos y observación DOM/Network de la WebView de prueba. No incluyen credenciales ni ejecutan registro/login/pedidos. Los perfiles cambian resolución/densidad para pruebas y restauran valores base al terminar. Su éxito geométrico requiere además revisión visual de las capturas: un diálogo nativo podría cubrir la UI sin alterar el DOM.

El smoke presupone la categoría Jaranas y productos locales de esta muestra; si el conjunto de prueba cambia, revisar esos selectores/datos, sin insertar fixtures en la aplicación real. La galería múltiple y las opiniones con contenido se verifican sólo mediante datos controlados; la muestra pública real no permite demostrar esas variantes.
