# Entornos móviles y Galaxy A55

Etapa 2A, noviembre de 2026. No se provisiona infraestructura.

| Selección | Backend | Uso |
|---|---|---|
| Development navegador | `http://localhost:8080` | Spring Boot y PostgreSQL locales de desarrollo |
| Development Android | `http://10.0.2.2:8080` | Alias del host en emulador, no en teléfono |
| Device Debug | Origen explícito | USB o HTTPS de pruebas autorizado; rechaza el host comercial |
| Staging | Sin valor predeterminado | HTTPS explícito, diferente de producción y confirmación de aislamiento |
| Production | `https://casa-musica-castillo-backend.onrender.com` | Servicio comercial; no usar para pruebas destructivas |
| DEMO | `https://demo.invalid` | Fixtures explícitos, sin fallback remoto por errores HTTP |

Los orígenes se centralizan en `src/environments/environment-settings.ts`. Angular aplica los `fileReplacements` de `production`, `demo` y `staging` en `angular.json`. `development` conserva el entorno base y `ci` las pruebas existentes. Las URL públicas del bundle no son secretos.

Staging falla antes de emitir solicitudes si falta `CMC_STAGING_API_URL`. El script sustituye ese identificador al compilar con `--define` y exige `--isolated`; la declaración del operador no demuestra por sí sola el aislamiento de PostgreSQL/correo, que debe comprobarse previamente. No hay staging desplegado ni URL inventada.

```powershell
node scripts/build-android.mjs --environment staging --variant debug --api-url $env:CMC_AUTHORIZED_STAGING_ORIGIN --isolated
```

El operador debe definir ese origen autorizado. Release solo admite `production` o `staging`. Gradle también rechaza assets locales/DEMO en invocaciones directas.

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
