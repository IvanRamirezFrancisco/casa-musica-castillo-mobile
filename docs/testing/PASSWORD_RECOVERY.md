# Recuperación por enlace y cambio autenticado

Se implementó sobre `feature/pen-dev-ui-unification`, HEAD `c9e7258cf09b1a155dc0cd1340129bfae3412a29`, conservando el rediseño y el trabajo local anterior. No se cambiaron versiones Android, contratos comerciales, MFA, almacenamiento de sesión ni servicios de autenticación.

## Correcciones

1. `/reset-password?token=…` carga el mismo `ConnectedForgotPasswordPage`. Captura un único token válido, retira el parámetro del historial visible y abre directamente el formulario. No verifica ni consume al pegar/abrir el enlace: requiere confirmar la contraseña nueva.
2. La pantalla inicial elimina «Ya tengo un enlace o código» y conserva correo, solicitud neutral, reenvío explícito con cooldown, Retry-After, errores y regreso a Login. Un error de red permite reintentar; no se presume que hubo envío ni existencia de cuenta. No hay correo automático al vencer el contador.
3. El formulario conserva los validadores existentes y el contrato POST `/api/auth/password-reset/confirm` con `{token,newPassword}`. Previene doble envío, limpia contraseñas tras error y toda la información temporal al salir. No guarda tokens en almacenamiento web ni inicia sesión después de recuperar.
4. Seguridad distingue capacidad cargando, disponible, no soportada y error temporal. `passwordChangeAvailable()` sigue exigiendo `data.passwordChangeRevokesSessions === true` del servidor. Los tipos de respuesta inválidos se rechazan. La consulta se puede reintentar y no se duplica mientras está pendiente.
5. El cambio autenticado conserva contraseña actual, validación de nueva contraseña, confirmación, checklist, límite BCrypt/UTF-8, limpieza y cierre de sesión tras éxito. El backend sigue siendo responsable de autorización y revocación.
6. Se corrigió el aviso de éxito al volver a Login: `ionViewWillEnter` también lee el estado de navegación ya finalizada mediante `Location`, porque Ionic puede ejecutarlo después de terminar Angular Navigation. No cambia el flujo MFA.
7. `referrer=no-referrer` evita propagar la URL sensible como Referer. El servidor web debe redactar tokens en sus access logs y servir el fallback SPA para la ruta nueva. No se afirma que Angular pueda borrar logs previos del proxy.

## Archivos de esta tarea

- `src/app/app.routes.ts`, `src/index.html`.
- `src/app/features/auth/connected/connected-forgot-password.page.ts` y `.html`.
- `src/app/features/auth/connected/connected-login.page.ts` (solo confirmación de cambio).
- `src/app/features/profile/account-security.page.ts` y `.html`.
- `src/app/core/infrastructure/http-account-security.repository.ts`.
- `src/app/features/auth/connected/password-recovery.integration.spec.ts` (nuevo).
- `src/app/features/auth/connected/connected-auth.integration.spec.ts` y `src/app/features/profile/account-security.page.spec.ts`.
- Este informe. Los demás cambios locales de UI/UX ya estaban presentes y no deben confundirse con esta tarea.

## Validación final

Resultados finales: específicas 55/55, integración 260/260, regresión 271/271; suite completa 890/891 con el fallo previo e intermitente de Catálogo en línea 393. Lint, Development, Production y test:build-config 9/9 aprobados. Se conservan advertencias SCSS anteriores sin ampliar umbrales. Los builds que fallaron por EPERM al crear assets se repitieron con permiso y terminaron completos.

Chrome real completó solicitud→Mailpit→enlace→formulario→recuperación→Login nuevo, y Perfil→Seguridad→cambio autenticado→revocación→nuevo Login. El enlace reutilizado fue rechazado; contraseña actual incorrecta no produjo cambios; los JWT anteriores A/B devolvieron 401/401. Se indujo un fallo de conexión solo en la consulta de capacidad, se mostró error recuperable y el reintento confirmó la capacidad real. Hubo un correo de recuperación y dos notificaciones, una por cambio exitoso. Cero peticiones a Railway.

El backend final aprobó 219/219 pruebas y empaquetado; migración V59, límites compartidos, reinicio de ambas JVM, entrega PENDING tras reinicio y MFA con Mailpit se comprobaron con PostgreSQL real. Brevo tiene pruebas de contrato locales; no se enviaron mensajes productivos.

Se generaron 14 capturas reales sin contraseñas/códigos/tokens. La galería `password-evidence.html` y los JSON sanitizados están bajo `C:/Users/ivanf/.codex/visualizations/2026/11/16/01a1e6c5-73a1-7da1-999b-2b1ab6c10033/`. Se verificó overflow a los diez anchos solicitados, tablet y una ventana horizontal baja. No se acredita teclado nativo, gestos físicos ni texto ampliado Android. Las pruebas unitarias de HTTP no se presentan como integración real. La implementación de backend y su checklist están en `docs/PASSWORD_SECURITY.md` del checkout existente `spring-public-runtime`.

Entorno de aceptación: build Development conectado a `http://127.0.0.1:18083`, segunda instancia Spring en 18084, PostgreSQL desechable 55439/55448, Mailpit SMTP 1025/API 8025 y frontend web 14200. Las credenciales son sintéticas y los procesos de prueba no cargan claves Brevo comerciales. Production conserva su URL y restricciones. El informe distingue los resultados de Chrome de Android físico.

## Límites de aceptación

- No hay App Links verificados de recuperación demostrados en el manifiesto actual. El enlace web funciona con fallback SPA; apertura automática nativa y pruebas físicas Android quedan pendientes.
- La sesión web permanece deliberadamente en memoria. No se añadió persistencia JWT en localStorage/sessionStorage. NativeSessionStore no se modificó.
- La captura histórica «No disponible» no permite identificar qué servidor o fallo HTTP la produjo. Sí se corrigió la causa comprobada que confundía cualquier error de consulta con falta de soporte. El recorrido local prueba el endpoint real y recuperación ante fallo de transporte inducido.
- El fallo previo del test de búsqueda compacta del Catálogo se conserva sin alterar su implementación ni sus aserciones. Un resultado completo con ese fallo no equivale a una suite al 100 %.
- No se contactó ni modificó Railway, no se enviaron correos comerciales y no hubo push, merge, commit ni despliegue.


Git final: misma rama y HEAD; 73 archivos modificados/nuevos en total con el trabajo anterior, cero preparados. main `723546d413418cc5407129566d1513876e6a669e` y develop `f9b3693af0e9c7297f0944a4b0f834521ac76750` intactas. `git diff --check` aprobado. La candidata no está aprobada para promoción productiva: persisten los pendientes de gates remotos, Catálogo, Brevo staging y Android indicados en ambos informes.
