# Autenticación y administración MFA — 28/oct/2026

> Documento histórico de octubre. Las referencias de ramas históricas se omiten para publicación; los originales permanecen en el respaldo manual. El estado y las validaciones de Etapa 1B están en [el informe actual](../etapa1b/README.md).


## Resultado y bloqueo de validación real
Se implementa Perfil → Seguridad de la cuenta usando exclusivamente los contratos existentes. La autenticación completa contra Spring Boot sigue SIN VALIDAR: no se proporcionó una cuenta sintética local autorizada, sus credenciales por configuración segura, acceso al buzón y autorización para configurar/regenerar factores de esa cuenta. No se usaron cuentas de clientes, ni se registraron cuentas reales ni se modificaron factores en el servidor.

## Cambios y protección
Rama [referencia de rama histórica omitida], HEAD efe9767082040971278e66595aad8c0bf82c4b81 conservados. Respaldo de los 143 archivos inicialmente modificados/nuevos: reports/auth-phase1/initial-worktree.zip; inventario con SHA-256: initial-inventory.json. Se observaron hashes estables antes de editar. La consulta de procesos CIM no estuvo disponible; no se puede asegurar exclusión de escritores externos, y se solicitó confirmación al usuario. La comprobación final sólo detecta las tres modificaciones intencionales sobre archivos previos; ningún archivo previo falta.

Archivos añadidos: core/infrastructure/http-account-security.repository.ts y su spec; features/profile/account-security.page.ts y su spec. Archivos ampliados: app.routes.ts, features/profile/connected-profile.view.ts y connected-profile.integration.spec.ts (se añade prueba de navegación, sin eliminar pruebas previas). Todas esas rutas están bajo src/app/. No se tocaron sesión TT-05, backend, ramas o PR ajenos.

## Implementación
- Ruta /profile/security protegida con authGuard y acceso desde perfil conectado.
- Adaptador HttpAccountSecurityRepository: solicitudes autenticadas mediante el cliente/interceptor existentes, validación unknown → contrato. No se crea un segundo almacén de sesión.
- Consulta de métodos, activar/desactivar EMAIL, iniciar enrollment TOTP, mostrar QR PNG base64 generado por backend y clave manual, copiar clave explícitamente, confirmar código de seis dígitos y desactivar TOTP con confirmación de intención.
- Diez códigos de recuperación validados en formato numérico 4-4, sin duplicados. Regeneración con confirmación explícita: el backend elimina los códigos anteriores y exige TOTP habilitado. No se implementa login sin contraseña ni verificación de respaldo adicional en perfil que consumiría códigos innecesariamente.
- Clave y códigos sólo viven en la vista; se descartan al abandonar ruta, destruir componente o terminar sesión. Se cancelan respuestas pendientes para impedir repoblar secretos después del logout. No se exportan, registran, persisten ni envían a generadores QR externos. Copiar clave informa de la permanencia potencial en el portapapeles.
- Se evita duplicar operaciones activas. Corrección de concurrencia: el cierre de una solicitud anterior no desactiva el estado de carga de la siguiente consulta.
- Identidad burdeos #722F37, controles de 48px, etiquetas, inputmode numérico y avisos de estado/error. Renderizado probado en jsdom; no se afirma revisión visual de navegador o Android.

## Matriz de mecanismos y contratos
| Mecanismo | Endpoint y JSON | Estado y pruebas |
|---|---|---|
| Contraseña/login | POST /api/auth/login {email,password}; ApiResponse.data.jwtResponse o desafío twoFactorRequired/preAuthChallenge/availableMethods | Implementación previa conservada; pruebas HTTP simuladas; falta cuenta real |
| Registro | POST /api/auth/register {username,firstName,lastName,email,password,phone?} | DTO backend leído, límites y BcryptPassword existentes; falta registro/correo de prueba autorizado |
| Verificación | POST /api/auth/verify-email {token}; POST /api/auth/resend-verification {email} | Implementación previa; falta correo real y apertura móvil |
| Recuperación | POST /api/auth/password-reset/request {email}; POST /api/auth/password-reset/confirm {token,newPassword} | Contrato leído, contraseña se envía sin trim/normalización; falta prueba real |
| Login EMAIL | POST /api/2fa/send-login-code {preAuthChallenge,method:EMAIL}; POST /api/2fa/verify {preAuthChallenge,method,code} | Flujo existente con mocks; reenvío/límites decididos por servidor |
| Login TOTP/respaldo | POST /api/2fa/verify; method GOOGLE_AUTHENTICATOR o BACKUP_CODE | Flujo existente conserva contraseña previa y desafío; uso/reutilización/expiración reales pendientes |
| Estado MFA | GET /api/2fa/methods → ApiResponse.data {EMAIL,GOOGLE_AUTHENTICATOR,BACKUP_CODES} | Implementado; mocks y HTTP real SIN sesión: 401 |
| EMAIL desde perfil | POST /api/2fa/email/enable y /disable, body {} | Implementado y simulado; falta cuenta autorizada |
| Enrollment TOTP | POST /api/2fa/google/setup {} → data.manualEntryKey y data.qrCode (data:image/png;base64) | Implementado y simulado; backend genera secreto y QR |
| Confirmación TOTP | POST /api/2fa/google/confirm {code} | Implementado; rechazo 400/401/403/429 simulado; sin activación local ficticia |
| Desactivar TOTP | POST /api/2fa/google/disable {} | Implementado según contrato JWT autenticado; confirmación de UI no sustituye una reautenticación del servidor |
| Respaldo | POST /api/2fa/backup-codes/generate {} → data.codes/count=10 | Implementado/simulado. Backend exige TOTP, hashea códigos, elimina anteriores al regenerar y consume cada uso. Falta prueba real de uso/reutilización/regeneración |
| JWT/logout | Guard e interceptor existentes; POST /api/auth/logout {} autenticado | Sin cambios a TT-05. Memoria volátil, 401 limpia sesión y 403 conserva sesión; pruebas simuladas existentes |

## Código backend frente al proceso ejecutado
Se leyó el árbol local security/backend-dependency-hardening, HEAD 44df7468f65180e1aebda161eabe66d94355d95d, con modificaciones de otro proceso. No se modificó ni se reinició. No se ha establecido qué SHA ejecuta localhost.
Comprobaciones HTTP reales, GET sin autenticación, guardadas en reports/auth-phase1/real-http-safe.json: categorías activas 200; /api/2fa/methods 401; /api/2fa/backup-codes/status 401. Esto demuestra disponibilidad y rechazo anónimo; NO acredita login o configuración MFA.

## Pruebas y builds
Evidencias en reports/auth-phase1/: lint.log, coverage-final.log, integration.log, regression.log, build.log, sync.log y android.log.
- Lint PASS.
- Suite completa con cobertura: 485 PASS; se conservan los 468 casos previos y se añaden 17. Statements 94.48%, branches 93.03%, functions 91.84%, lines 97.82% (base reportada: 94.04/92.84/91.20/97.75).
- Script integración: 99 PASS. Usa HttpTestingController; no es ejecución contra Spring Boot.
- Script regresión ejecutado: 136 PASS en ese momento; las pruebas añadidas posteriormente también pasan dentro de los 485 de la suite completa.
- Build Angular production PASS, con advertencias de presupuestos SCSS existentes. Capacitor sync y Gradle assembleDebug comprobados; resultado final en android.log. No es APK Release firmado ni instalación.
- Sin prueba autenticada de navegador, Android ni Maestro por falta de cuenta de prueba y dispositivo disponible identificado. No se incluyen secretos en capturas.

## Pendientes backend y de seguridad
1. GET /api/auth/verify redirige a localhost:4200. El servidor y emisor de correo deben acordar un enlace HTTPS de dominio controlado hacia /verify-email?token=... y App Links si se quiere apertura nativa. POST /api/auth/verify-email {token} sigue siendo el endpoint de confirmación; no se inventa un endpoint alternativo. Recuperación requiere el mismo acuerdo de enlace para entregar el token al formulario móvil existente. No se cambia backend ni manifiesto nativo sin dominio/certificado acordados.
2. nextStep del setup incluye un texto con /api/two-factor/google/confirm, mientras el mapping real es /api/2fa/google/confirm. La app usa el mapping real y no ejecuta instrucciones ni URLs del texto remoto.
3. Las operaciones de desactivación/generación inspeccionadas aceptan sesión JWT sin contraseña adicional en el controlador. No se inventa una verificación que el servidor no aplicaría. Reautenticación fuerte, políticas de límites y auditoría de cambios deben coordinarse con backend.
4. TT-05 sigue siendo responsable de persistencia segura. También quedan por verificar protección de capturas/preview del sistema y limpieza al pasar a segundo plano; la implementación actual limpia al abandonar la vista o cerrar sesión, no acredita FLAG_SECURE ni gestión del portapapeles por Android.
5. La política final de correos y validación real de expiración, rate limit y consumo de códigos sólo puede acreditarse con cuentas y buzón autorizados. No se generaron secretos ni códigos reales durante esta ejecución.

## Intervención requerida y siguiente paso
Proporcionar mediante configuración local segura una cuenta sintética autorizada y su acceso al buzón; identificar que localhost y su BD son de prueba, así como autorizar cambios de métodos y regeneración de esa cuenta. Confirmar que no hay otro escritor móvil. Después ejecutar login sin factor, EMAIL, enrollment/confirmación TOTP, recuperación de un uso/reutilización/regeneración, expiración y logout; capturas siempre con secretos ocultos. No se hacen commits, push, PR, merge, deploy, pagos ni pedidos.
