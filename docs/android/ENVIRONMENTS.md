# Entornos móviles y Galaxy A55

Etapa 2A, noviembre de 2026. No se provisiona infraestructura.

| Selección | Backend | Uso |
|---|---|---|
| Development navegador | `http://localhost:8080` | Spring Boot y PostgreSQL locales de desarrollo |
| Development Android | `http://10.0.2.2:8080` | Alias del host en emulador, no en teléfono |
| Device Debug | Origen explícito | USB o HTTPS de pruebas autorizado; rechaza el host comercial |
| Staging | Sin valor predeterminado | HTTPS explícito y aislamiento confirmado. Debug con ID `com.casademusicacastillo.app.staging` |
| Production | `https://casa-musica-castillo-backend.onrender.com` | Servicio comercial; no usar para pruebas destructivas |
| Production Debug | Mismo origen HTTPS de Production | Solo lectura. ID `com.casademusicacastillo.app.publicdemo` |
| Connected QA | Mismo origen HTTPS de Production | Cinco pestañas y módulos conectados. Transporte limitado a GET públicos hasta validar acceso privado. ID `com.casademusicacastillo.app.qa` |
| DEMO | `https://demo.invalid` | Fixtures explícitos, sin fallback remoto por errores HTTP |

Los orígenes se centralizan en `src/environments/environment-settings.ts`. Angular aplica los `fileReplacements` de `production`, `demo` y `staging` en `angular.json`. `development` conserva el entorno base y `ci` las pruebas existentes. Las URL públicas del bundle no son secretos.

Staging falla antes de emitir solicitudes si falta `CMC_STAGING_API_URL`. El script sustituye ese identificador al compilar con `--define` y exige `--isolated`; la declaración del operador no demuestra por sí sola el aislamiento de PostgreSQL/correo, que debe comprobarse previamente. No hay staging desplegado ni URL inventada.

```powershell
node scripts/build-android.mjs --environment staging --variant debug --api-url $env:CMC_AUTHORIZED_STAGING_ORIGIN --isolated
```

El operador debe definir ese origen autorizado. Release solo admite `production` o `staging`. Gradle también rechaza assets locales/DEMO en invocaciones directas.

El workflow de APK Staging requiere un dispatch manual con confirmación de aislamiento, Quality Gate del mismo SHA y la variable `CMC_AUTHORIZED_STAGING_ORIGIN`. La URL por sí sola no demuestra el aislamiento.

## Demostración pública sin USB

Para validar la navegación integral contra el catálogo real, ejecutar `npm run android:qa`. El APK queda en `reports/android-packages/production-qa/app-connectedQa.apk`, firmado con identidad Debug. Las rutas privadas conservan sus guards. QA informa en el formulario de ingreso que el acceso a cuentas espera un entorno autorizado. El interceptor impide enviar credenciales, tokens y escrituras a Render desde este paquete.

Ejecutar `npm run android:production-debug`. El APK `reports/android-packages/production-debug/app-publicDemo.apk` tiene firma Debug y un ID separado del paquete principal. Comprobar SHA-256 y firma antes de transferirlo por un canal privado. Si ya existe una instalación con el mismo ID, comprobar certificado y versión antes de actualizar.

Con Wi-Fi o datos y el cable desconectado, comprobar Inicio, categoría, búsqueda, orden por precio, detalle, galería y el placeholder. Desactivar la red, abrir otra consulta y registrar el error. Restablecer la red y pulsar Reintentar. Registrar modelo, Android, WebView, fecha, SHA y resultado. El origen virtual `https://localhost` del WebView sirve los recursos empaquetados. Las solicitudes de datos usan Render por HTTPS.

## Samsung Galaxy A55 por USB

1. Usar Spring Boot local con un perfil existente apropiado, base aislada y datos sintéticos. Confirmar que `localhost:8080` sea el backend esperado.
2. Activar depuración USB, conectar y aceptar la huella del equipo en el teléfono. Comprobar `adb devices -l`. Si hay varios dispositivos, usar `adb -s SERIAL` en cada comando.
3. Ejecutar `adb reverse tcp:8080 tcp:8080`. Esto permite usar loopback sin cambiar firewall ni exponer el servidor a Internet.
4. Compilar e instalar:

```powershell
node scripts/build-android.mjs --environment device --variant debug --api-url http://127.0.0.1:8080
adb install -r reports/android-packages/device-debug/app-debug.apk
```

5. Comprobar arranque, catálogo, errores sin red y navegación. Los flujos privados requieren cuentas sintéticas y correo de captura; no ejecutar compras/pagos comerciales. Registrar modelo, Android, WebView, SHA del paquete y resultado.
6. Terminar con `adb reverse --remove tcp:8080` y revocar depuración USB cuando corresponda.

Si una firma distinta impide actualizar, no desinstalar automáticamente: se pueden perder datos y requiere decisión del usuario. Un build aprobado no acredita funcionamiento en teléfono.

Debug permite HTTP solo en `localhost`, `127.0.0.1` y `10.0.2.2`. Release prohíbe cleartext/mixed content. LAN sin USB requiere HTTPS de pruebas explícito. No se publica una IP privada como endpoint para Play.
