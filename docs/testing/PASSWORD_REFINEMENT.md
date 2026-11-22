# Cierre local: confirmación, capacidad y correo de contraseñas

## Resultado y entorno real

Se implementaron las tres mejoras sobre los cambios locales existentes. No se reconstruyeron Registro, Login, MFA, la cola de correo ni los servicios de sesión. No se cambiaron V58/V59, contratos comerciales, versiones Android o configuración Production.

La discrepancia tenía una causa de entorno comprobada y una clasificación demasiado concluyente en Angular:

| Elemento | Ejecución histórica observada | Candidata comprobada |
|---|---|---|
| Frontend | `http://localhost:4200`, Angular PID 45884, Development | `http://127.0.0.1:14200`, Development aislado |
| API | `http://localhost:8080`, Java PID 5516, perfil `local` | `http://127.0.0.1:18083`, perfil `local`, JDK 21, Spring Boot 4.0.9 |
| Checkout backend | carpeta padre `segundo proyecto`, rama `codex/integrate-brevo-original`, HEAD `44df7468f65180e1aebda161eabe66d94355d95d` con cambios locales | checkout existente `.local-worktrees/spring-public-runtime`, rama `fix/account-activation-hardening`, HEAD `30a8c5ab9c85d58fe998935d7725edf3d2d3ba2f` con cambios locales |
| Capacidad | el controlador compilado histórico no contiene `passwordChangeRevokesSessions` | HTTP 200, `success: true`, `data.passwordChangeRevokesSessions: true` con sesión sintética |
| Base | no se modificó ni se usó para escrituras | PostgreSQL 18 desechable, loopback 55439, base de aceptación `password_e2e_test`; base de revisión independiente `password_refinement_dev` |
| Correo | mensaje básico procedente de la ejecución anterior | Mailpit SMTP 1025/API 8025, plantilla nueva en ambos MIME |

Se confirmó `user.dir` de la JVM de 8080 y su perfil local sin imprimir credenciales. El bundle público servido en 4200 importa `/chunk-BB6RDHY2.js`, que contiene el origen predeterminado 8080 y no el override 18083 (SHA-256 observado `036257637fcc710014bd584ad566adb77cef134865999c6288d18e5abe37c15d`). Esto concuerda con la URL y el comando que confirmó el propietario. El GET sin sesión a `/actuator/info` histórico devolvió 401 y health devolvió UP; no se utilizó la sesión del propietario para consultar datos protegidos ni se atribuye a ese servidor una respuesta autenticada que no se capturó.

Un campo ausente se convertía en `false`; eso presentaba «No disponible» como si el servidor hubiera declarado explícitamente no soportar la función. Ahora un contrato ausente/incompatible produce error recuperable. Solo `true` habilita el cambio y solo `false` explícito representa no soporte. 401 conserva el flujo de sesión vencida; 403/404/500/red mantienen su naturaleza de error. El retorno a la vista vuelve a consultar y las respuestas antiguas se cancelan al salir.

No se detuvieron ni sustituyeron los procesos de 4200/8080. Seguir abriendo 4200 no lo convierte en la candidata de 18083: para esta revisión hay que usar **14200** y una sesión nueva de prueba. No se forzó ninguna garantía del servidor.

## Desarrollo aislado y revisión

Se añadió `npm run start:isolated`, que comprueba health en 18083 y arranca Angular Development en 14200 con `CMC_DEVICE_API_URL` de loopback. El comando normal y Production no cambian. No guarda JWT, contraseñas ni claves.

Al entregar se dejó un entorno temporal de revisión en `http://127.0.0.1:14200`, API `http://127.0.0.1:18083` y base **nueva y vacía de cuentas comerciales** `password_refinement_dev@127.0.0.1:55439`. Usa datos sintéticos y Mailpit. No reutiliza la base del servidor histórico. La sesión de revisión tiene una duración máxima de 60 minutos desde su arranque; no es infraestructura persistente de desarrollo ni una configuración productiva.

Los PID y la ruta de parada están en el archivo ignorado `target/password-refinement-runtime.json` del backend. Para terminar únicamente ese entorno, crear `target/password-refinement-runtime.stop` en ese checkout: el runner termina solo su árbol Angular, su JVM y señala la parada de los clústeres desechables propios. No afecta 4200, 8080 ni Mailpit compartido. Los helpers `target/` y `dist/` son herramientas locales de aceptación y no se incorporan a Git. No ejecutar sus migraciones contra una base no desechable.

## Éxito de recuperación

- Una sola tarjeta, icono de check del sistema existente sobre círculo salvia, título y descripción centrados. El hero de solicitud desaparece al confirmar y el subtítulo pasa a «Seguridad de tu cuenta».
- Texto: «Tu contraseña se cambió correctamente. Ya puedes iniciar sesión con tu nueva contraseña». Acción «Ir a iniciar sesión», cuenta regresiva inicial de seis segundos.
- Un solo intervalo de baja frecuencia, basado en un deadline. Se crea únicamente en el `next` de la confirmación válida del backend. No depende de animaciones ni de detección por fotograma.
- Regreso manual cancela el intervalo y un guard evita dobles navegaciones. Salida Ionic, destrucción y cambio de enlace limpian temporizadores y secretos. Navegación con `replaceUrl`, sin token o contraseña; no hay Login automático.
- Título enfocable tras confirmar y mensaje de estado accesible; el contador no fuerza anuncios repetidos al lector de pantalla. Se conserva scroll natural y no se impone centrado vertical que recorte la tarjeta.
- El cambio autenticado conserva su redirección inmediata a Login después de limpiar la sesión. No se introduce espera con una sesión revocada; el aviso existente en Login sigue funcionando.

## Correo

La composición está en `AuthMailContent.passwordChanged` y `passwordReset`, con un frame privado compartido solo por estos dos propósitos. Activación y MFA conservan sus plantillas. La notificación no acepta un token como argumento y no contiene enlaces de recuperación, publicidad, tracking, imágenes remotas esenciales, JavaScript o fuentes externas. No se inventó un canal de soporte ni se sustituyó el escudo oficial: se usa la marca en texto.

Tablas de presentación, estilos críticos inline, contenedor máximo 600 px con fallback MSO, burdeos/dorado/crema, confirmación salvia y aviso suave. Los valores dinámicos se escapan. SMTP y Brevo reciben la misma composición HTML/texto, sin cambiar cuándo se encola ni cómo se resuelve una entrega incierta. Se conserva el asunto de la candidata: «Se actualizó la contraseña de tu cuenta — Casa de Música Castillo».

Mailpit confirmó MIME 1.0, multipart con alternativas `text/plain; charset=utf-8` y `text/html; charset=utf-8`, asunto español correcto y remitente sintético del entorno. El HTML y el texto completos, sin secretos, se exportaron como evidencia. No se probó renderización en Gmail/Outlook reales ni envío a Brevo productivo.

## Pruebas finales

| Comprobación | Resultado |
|---|---:|
| Backend completo y empaquetado | **223/223**, 0 fallos/errores/omitidas, 3 min 53 s |
| Específicas frontend (4 archivos) | **81/81** antes de la comprobación global final |
| Integración frontend | **265/265** |
| Regresión frontend | **277/277** |
| Completa frontend | **906/907** |
| Lint | Aprobado |
| Build Development / Production | Aprobados, sin ampliar presupuestos |
| test:build-config | **9/9** |

El único fallo completo final es el anterior de `public-catalog.integration.spec.ts:393`, búsqueda compacta. No se cambió ese módulo ni se eliminó o relajó su prueba. El aumento backend desde 219 incluye dos pruebas de plantilla y dos de transporte/MIME. Se corrigieron expectativas de textos nuevos y una comprobación inicial de timers globales del test: la aserción final comprueba la cancelación del intervalo propio y ausencia de navegación tardía, conservando las pruebas de cancelación manual, salida y destrucción.

La suite backend incluye PostgreSQL real, concurrencia, revocación, MFA, migraciones V58/V59, fallo de notificación y estados de proveedor. Los contratos Brevo prueban autorización, remitente, HTML/texto, 401, 429, 5xx y timeout sin correos reales ni fallback inseguro. No se usó skipTests.

## Aceptación real y capturas

Chrome automatizado independiente de Firefox completó:

1. Login → recuperación → Mailpit → enlace → contraseña nueva → éxito centrado → Login automático.
2. Reutilización del enlace rechazada por Spring Boot, sin conservar campos sensibles.
3. Nuevo Login → Perfil → Seguridad → fallo de conexión inducido solo en la consulta de capacidad → reintento contra servidor real → botón habilitado → formulario → contraseña actual incorrecta rechazada → cambio confirmado → Login inmediato.
4. JWT anteriores A/B rechazados con **401/401**, nueva contraseña admitida y dos notificaciones para la cuenta A (una por cada cambio confirmado).
5. Segunda cuenta sintética: regreso manual desde éxito → otra pantalla → espera superior al contador sin navegación tardía.
6. Renderización del mensaje SMTP real en el iframe de Mailpit, capturado sin inbox ni destinatarios ajenos. El mismo HTML se renderizó a 320 CSS px sin overflow y con preferencia de modo oscuro en Chrome.

Respuesta sanitizada comprobada, sin JWT ni datos personales:

```json
{"status":200,"success":true,"data":{"passwordChangeRevokesSessions":true},"authenticated":true}
```

El icono tuvo diferencia de centro **0 px** en 320, 360, 375, 390, 412, 430, 600, 768, 960 y 1280 px. Se comprobó overflow horizontal, ventana baja/horizontal, texto al 200 % y movimiento reducido. No se afirma una prueba específica de texto al 150 %, teclado virtual, lector de pantalla real, Galaxy A55 físico o rendimiento de Android económico. Las verificaciones semánticas y de ciclo de vida están en los tests; no sustituyen aceptación física.

Evidencia bajo `C:/Users/ivanf/.codex/visualizations/2026/11/16/01a1e6c5-73a1-7da1-999b-2b1ab6c10033/`: galería `password-refinement-evidence.html`, PNG `password-refine-*`, plantilla HTML/texto y JSON de navegador, MIME, geometría y ejecución. Las capturas de contraseñas tienen campos vacíos. Cero peticiones Railway en la aceptación; los logs finales revisados no contienen patrones de JWT ni enlaces con bearer. Esta comprobación acotada no audita todos los logs de infraestructura.

## Archivos de esta intervención y límites

Frontend: `package.json`, nuevo `scripts/start-isolated-development.mjs`; `connected-forgot-password.page.ts/.html/.scss`, `password-recovery.integration.spec.ts`; `account-security.page.ts/.html/.spec.ts`; `http-account-security.repository.ts/.spec.ts`; este informe. Los demás cambios de UI, activación y contraseñas ya estaban presentes.

Backend: `AuthMailContent.java`, `EmailService.java`, `AuthMailContentTest.java`, `EmailServiceTransportTest.java` e informe `docs/PASSWORD_UI_MAIL_REFINEMENT.md`. No se modificaron validaciones, autorización, reautenticación, límites, revocación, MFA o cola persistente. No hay migraciones nuevas.

Ramas/HEAD se conservan: móvil `feature/pen-dev-ui-unification` / `c9e7258cf09b1a155dc0cd1340129bfae3412a29`; backend `fix/account-activation-hardening` / `30a8c5ab9c85d58fe998935d7725edf3d2d3ba2f`. Cambios locales para revisión, nada preparado o confirmado. No se crearon ramas, clones o worktrees. No hubo push, merge, despliegue, cambios en Railway/PostgreSQL comercial/Google Play o modificación de main/develop.

La producción **no está corregida por este trabajo local**. Su futura promoción requiere revisión, gates autorizados, smoke Brevo en staging, aceptación nativa pendiente y triage del fallo previo del Catálogo. Los riesgos temporales de antienumeración documentados en la tarea anterior no se consideran resueltos por cambiar una plantilla o interfaz.
