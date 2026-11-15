# TT-05 — sesión Android y validación aislada

Incremento iniciado desde `90663999b7b1705552bf1bb889ad00730ba505a2` (PR #85), rama `feature/tt05-sesion-segura`. Verificación local: 3–4 de noviembre de 2026. #83/#84/#85 siguen abiertos; el Draft de este incremento debe tener base `feature/privacidad-play-compliance`. No integra esos PR ni los de otros colaboradores.

## Implementación

`@aparajita/capacitor-secure-storage` **8.0.1**, fijado en package-lock, con overrides de core/iOS 8.5.2 para conservar un único puente alineado con la aplicación, declara Capacitor 8 y Android minSdk 24. El código Android usa AES/GCM/NoPadding, claves por entrada en AndroidKeyStore y ciphertext/IV en `WSSecureStorageSharedPreferences`. `removeItem` elimina la entrada Keystore y el valor cifrado. No se incorpora una clave criptográfica al bundle. [Código y documentación del mantenedor](https://github.com/aparajita/capacitor-secure-storage).

La fábrica permite el adaptador exclusivamente en Android nativo conectado y exige registro del plugin. Navegador, iOS y DEMO usan `MemorySessionStore`; el adaptador web sin cifrar del paquete nunca se invoca. No se migra ningún JWT desde localStorage/Preferences. Se conserva la preferencia no sensible de ocultación de contacto de 2B.

Se cifra un único registro versionado: API seleccionada y AuthSession (JWT, exp e identidad de usuario: id, email, nombre/apellidos, teléfono, roles y flag MFA). Se rechazan registros corruptos, expirados, de otro origen o con sub/exp incompatibles. Solo se conserva la forma validada; no contraseñas ni códigos/desafíos MFA. Las operaciones se serializan para que un guardado pendiente no sobreviva al borrado posterior.

La restauración nativa consulta **GET /api/auth/me** antes de exponer identidad/roles. Si no puede confirmar la sesión, no permite acceso privado. El servidor verifica firma y revocación; el cliente solo lee estructura/exp/sub. Revisiones de sesión y de intentos rechazan restauraciones/login tardíos y respuestas privadas de sesiones previas. Un 401 antiguo no cierra la sesión nueva. Un 403 de un recurso no cierra sesión; un rechazo de /me impide aceptar una credencial restaurada.

Logout descarta inmediatamente identidad/datos locales, elimina la credencial y solicita revocación usando una instantánea del token. Diferencia falta de confirmación remota y fallo de almacenamiento, que muestra mediante un aviso accesible. Una credencial nativa vencida se informa como expiración, sin atribuirla a una avería del Keystore. La expiración programa la limpieza; no se inventa renovación. MFA solo establece y cifra sesión tras verificar el factor. Un fallo nativo no activa persistencia web ni se presenta como login persistido.

Capacitor `loggingBehavior: none` evita que el puente registre argumentos con el JWT incluso en Debug. El guard Gradle y el verificador Release exigen esa política. Se mantienen allowBackup=false y las exclusiones de cloud/device-transfer anteriores; el verificador comprueba el manifiesto/XML empaquetados y los métodos SecureStorage conservados por las reglas consumidoras de Capacitor. No se añadieron permisos ni reglas keep genéricas. R8 protege bytecode nativo, no equivale a cifrar JavaScript ni a certificate pinning.

## Contratos y despliegue

Backend examinado y ejecutado: PR #3, **9494d60f7b7295daa34dff52d6d671ab990c8e20**, dependiente de #2. Worktree independiente `backend-integracion-tt05`, rama local `test/tt05-integracion-aislada`, sin cambios fuente ni PR nuevo. El checkout original conserva sus cambios pendientes.

| Contrato existente | Uso / evidencia |
|---|---|
| POST /api/auth/register, /verify-email, /resend-verification | DTO JSON; pruebas existentes Spring/SQL/SMTP aislados |
| POST /api/auth/login | jwtResponse o twoFactorRequired/preAuthChallenge/availableMethods; ambas formas diferenciadas |
| POST /api/2fa/send-login-code, /verify | EMAIL, GOOGLE_AUTHENTICATOR y BACKUP_CODE según desafío; sin sesión anticipada |
| GET /api/auth/me; GET /api/users/profile | Bearer y principal propio; identidad revalidada |
| POST /api/auth/logout; /logout-all; DELETE /api/auth/sessions/{id} | Revocación JTI y propiedad; el móvil usa logout de su token |
| POST /api/auth/password-reset/request y /confirm | Contrato JSON; pruebas de correo, rotación y revocación existentes |
| Renovación del JWT de login | No existe un contrato seguro verificado que use este móvil; un campo refreshToken/modelo OAuth no acredita soporte |

Los PR backend siguen sin integrar. El cliente requiere sub=id del contrato JWT endurecido de #2/#3. No se acredita que Render ejecute ese SHA ni esos contratos privados; no se usaron cuentas productivas para averiguarlo. ARCO/eliminación del PR backend #4 siguen siendo propuesta, fuera de este incremento.

## Entorno de pruebas reproducible

Docker continúa bloqueado antes de iniciar el motor: OTel/stale `userAnalyticsOtlpHttp.sock`. No se borraron sockets, contenedores, volúmenes ni distribuciones WSL. `integration/tt05/compose.yaml` define PostgreSQL y Mailpit nuevos, red interna y puertos solo 127.0.0.1; `docker compose ... config --quiet` pasó, pero no se ejecutó el stack Docker.

Se utilizó una alternativa nativa dentro de la autorización del entorno local nuevo: **clúster independiente PostgreSQL 18.1**, datos bajo `reports/tt05-local/postgres-data`, puerto **55439**. El servicio Windows preexistente en 5432 y su directorio no se modificaron. `auth_test` no es superusuario ni puede crear bases/roles; tiene propiedad de esta base sintética y administración de pg_monitor requerida por la migración V11. La contraseña conocida de tests es exclusivamente sintética, coincidente con el perfil test existente; bootstrap privado generado bajo reports, fuera de Git. No reutilizar estos valores en otro entorno.

Solo se ejecutan scripts que validan marcador, puerto, nombre/usuario de base y SHA/árbol limpio del backend. Perfiles Spring dev/test existentes, esquema baseline de test y migraciones originales; no se deshabilita Flyway. LOCAL storage, pagos deshabilitados y entorno de proceso sin claves comerciales heredadas. Mailpit oficial v1.33.0 escucha en **127.0.0.1:11025/18025**, acepta solo destinatarios example.test y carece de relay/forward; archivo oficial verificado por SHA-256. El servidor Spring escucha en **127.0.0.1:18080**.

Durante la interrupción el primer proceso Spring quedó activo y una automatización de respaldo intentó resolver el Supabase configurado por defecto; falló DNS. Se detuvo el proceso. El arranque final desactiva las automatizaciones **solo en esta base nueva**, comprueba que no queda ninguna habilitada y sustituye Supabase por un destino loopback inutilizable, además de quitar sus credenciales. No se afirma que el primer arranque ya tuviera esta protección.

Secuencia en Windows (sin tocar servicios existentes):

1. `pwsh -NoProfile -File integration/tt05/start-native-postgres.ps1` — crea solo si no existe el clúster/puerto. Para reutilizarlo, inspeccionar su marcador y arrancar exclusivamente ese directorio con pg_ctl; nunca borrar/reinicializarlo.
2. `python integration/tt05/run-backend-tests.py "<worktree backend limpio>"` — usa el perfil test y el SMTP de captura de los tests existentes; escribe evidencia resumida sin JWT.
3. Descargar Mailpit Windows amd64 v1.33.0 oficial en reports/tools; `python integration/tt05/start-mailpit.py` verifica el ZIP y abre solo captura local. [Distribución oficial](https://github.com/axllent/mailpit/releases/tag/v1.33.0).
4. `python integration/tt05/start-backend.py "<worktree backend limpio>"` — prepara cuenta sintética, desactiva automatizaciones locales y arranca Spring con variables explícitas. Mantenerlo únicamente durante la prueba y detener su proceso al terminar.
5. `node scripts/build-android.mjs --environment device --variant debug --api-url http://127.0.0.1:18181`, instalar en emulador de pruebas; Maestro 2.11.0 oficial bajo reports/tools. `python integration/tt05/test-live.py` conecta adb reverse a Spring 18080, ejecuta dos recorridos y comprueba MFA EMAIL/SMTP/SQL reales. Los verificadores rechazan dispositivos físicos antes de limpiar estado; la futura aceptación en A55 requiere un procedimiento separado autorizado.
6. El control CI separado `node scripts/test-android-session.mjs` inicia su propio fixture HTTP de loopback, ejecuta cuatro recorridos nativos y comprueba ciphertext/borrado/Logcat limitado a los PID de la aplicación. **Ese control no usa Spring ni PostgreSQL.** Valida también hash del APK instalado y configuración device antes del login.

Los procesos locales de prueba se detienen al finalizar; los datos del clúster se conservan ignorados. No ejecutar down -v ni eliminar datos para repetir. PostgreSQL 18.1 produce advertencia de compatibilidad no certificada con Flyway 9.22.3; las migraciones y pruebas pasaron, sin cambiar la dependencia backend. Los scripts nativos tienen rutas Windows ajustables en sus argumentos/código; Compose constituye otra alternativa todavía no ejecutada.

## Evidencia y límites

| Categoría | Resultado local |
|---|---|
| A/B: suite Angular/Vitest | 671 pruebas; cobertura de líneas 97.91 %, umbrales originales |
| B: integración HTTP controlada | 184; selección solapada con suite general |
| A/B: regresión / caja blanca | 172 / 124; selecciones solapadas, no casos independientes adicionales |
| Backend existente | 32 aprobadas: 14 Spring MockMvc + PostgreSQL real (7 persistencia, 7 correo/MFA), 18 contratos/seguridad con dobles |
| D + B: Android API 36 + HTTP controlado | 4/4 Maestro; login, reinicio/logout, MFA y revocación; ciphertext/ausencia de plaintext y Logcat comprobados |
| D + C: Android API 36 + Spring HTTP/PostgreSQL real | 2/2 Maestro: login, reinicio y logout; actividad/revocación de sesión comprobada en SQL |
| C: HTTP/SMTP reales | /me, perfil propio, JTI, revocación, EMAIL MFA recibido por Mailpit, no JWT anticipado y no reutilización del desafío: PASS |
| Release | APK/AAB técnicos sin firma; R8, puente nativo, políticas de backup/red y paquete: PASS estático |

La evidencia local vive en reports/etapa3a, reports/android-session y reports/android-packages, excluidos de Git. Los APK locales se generaron desde la base indicada con árbol modificado, y así lo declara build-report.json: no se atribuyen al SHA limpio publicado. CI recompila el HEAD del Draft y adjunta artefactos vinculados a ese SHA. Consultar el PR para resultados remotos finales; no convertir una omisión documental en ejecución completa.

El primer intento local tuvo un diálogo **System UI isn't responding** en API 36; se conservó captura/FAIL, se atendió el diálogo y se repitieron los recorridos completos. La intermitencia de arranque documentada en 2A/2B sigue abierta; no se agregaron reintentos automáticos ni se ampliaron timeouts. Se corrigió un selector inicial que esperaba Novedades fuera del viewport conectado: ahora se espera la pestaña Catálogo existente.

No hay prueba en Samsung A55 físico ni runtime Release firmado. No se generó upload key ni se firmó/publicó en Play. No se implementó certificate pinning. Estas limitaciones y la conciliación de PR móviles/backend requieren revisión; TT-05 puede pasar a En pruebas con evidencia, no se marca Done automáticamente.

Antes de 3B: revisar TT-05 y los PR apilados; repetir aceptación en A55 con entorno aislado, resolver firma Release mediante autorización separada y decidir una infraestructura staging HTTPS. MFA/registro/recuperación tienen pruebas aisladas, no aceptación de producción. Perfil, carrito, ARCO y caja negra permanecen en sus fases autorizadas futuras; no se activaron pedidos/pagos ni se modificaron contratos comerciales.
