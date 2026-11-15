# Correspondencia para revisión — sin actualizar GitHub

Consulta de Issues: 27/oct/2026. Repositorio: [casa-musica-castillo-mobile](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile). El snapshot exacto de títulos, cuerpos, responsables, estados, labels y milestone se conserva en `PUBLIC_CATALOG_ISSUES_SNAPSHOT.json`. No se crearon Issues duplicadas ni se modificaron casillas o asignaciones.

El [GitHub Project existente](https://github.com/users/IvanRamirezFrancisco/projects/1) devuelve **404** en la sesión de navegador disponible. No se pudo leer Product Backlog, Iteraciones XP, Tablero por estados ni Flujo DevOps. Tampoco se pudo confirmar pertenencia de cada Issue a una vista o sus valores personalizados. Los responsables de la siguiente tabla son de las Issues, no se presentan como campos verificados del Project.

| Campo solicitado | Estado real comprobable | Propuesta pendiente de revisión |
|---|---|---|
| Status | No verificable en Project; Issue abierta/cerrada sí disponible | Conservar; no marcar Done con este incremento local |
| Responsable | Assignees de Issues en tabla siguiente | Mantener Ivan/Tackalay; no reasignar trabajo ajeno |
| Iteración XP | No verificable | Revisar la iteración de entrega actual con las opciones reales del Project |
| Etapa DevOps | No verificable | Registrar implementación/validación local y revisión pendiente cuando se autorice; comprobar nombres de opciones |
| Prioridad | No verificable como campo del Project | Priorizar catálogo/búsqueda/detalle para Actividad 4; no inventar IDs ni opciones P0/P1 remotas |
| Dependencias | Las HU declaran TT-03, TT-04 y TT-06 en sus cuerpos | Mantenerlas; TT-05 sólo bloquea futuras operaciones autenticadas |
| Criterios y evidencias | Cuerpos de Issues y pruebas locales | Adjuntar resultados al futuro PR; no marcar todos los criterios del servidor como satisfechos |

## HU y tareas existentes correspondientes al incremento

`Tackalay` es el usuario GitHub de Brayan. La correspondencia funcional siguiente se deriva de títulos/cuerpos de Issues; no acredita enlaces padre-hijo personalizados del Project.

| Historia / Issue | Estado Issue y responsable | TT existentes correspondientes | Evidencia implementada localmente | Pendiente para terminar |
|---|---|---|---|---|
| [HU-04 #4](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/4), Inicio | Open; Tackalay | [TT-19 #33](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/33), [TT-20 #34](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/34), [TT-21 #35](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/35), las tres Open/Tackalay | `public-home.view.ts`: categorías, latest y featured HTTP; enlaces de categorías por ID, búsqueda y Favoritos; loading/error/reintento | Sesión/autorización privadas fuera de alcance; Android, revisión y PR |
| [HU-05 #5](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/5), catálogo | Open; Tackalay | [TT-22 #36](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/36) Open/Tackalay; [TT-23 #37](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/37) Open/Ivan; [TT-24 #38](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/38) Open/Tackalay | Repository HTTP + servicio de catálogo; página de 12, filtros, selección por ID, precios/stock/imágenes y estados | Verificar controles backend, Android y DoD de PR/revisión |
| [HU-06 #6](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/6), búsqueda | Open; IvanRamirezFrancisco | [TT-25 #39](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/39), [TT-26 #40](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/40), [TT-27 #41](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/41), las tres Open/Ivan | `keyword` al endpoint catalog, límite 100, URL/filtros, debounce, cancelación y reintentos; 18 coincidencias locales para Jarana/categoría 20 | Seguridad de consulta backend y aceptación Android; PR/revisión |
| [HU-07 #7](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/7), detalle | Open; Tackalay | [TT-28 #42](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/42) Open/Tackalay; [TT-29 #43](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/43) Open/Ivan | ID validado, GET real, descripción como texto, error/404/reintento, stock/precio, origen de imágenes, sin compra real ni DEMO | HU parcial: [TT-30 #46](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/46) Open/Tackalay, carrito/favoritos reales todavía no integrado |
| [TT-03 #17](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/17), conexión Spring Boot | **Closed**; IvanRamirezFrancisco; seis casillas marcadas | Referencia existente, no duplicar ni reabrir | Configuración localhost/10.0.2.2/HTTPS, cinco endpoints, runtime validation y pruebas HTTP | Vincular nueva evidencia al futuro PR como referencia; Closed no demuestra por sí mismo Status Done del Project |
| [TT-04 #18](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/18), navegación | Closed; IvanRamirezFrancisco y Tackalay | Referencia existente | Se conservan las rutas y el flujo DEMO; catálogo HTTP con IDs reales | Revisión en Android real pendiente |
| [TT-06 #20](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/20), errores API | Open; IvanRamirezFrancisco | Dependencia descrita en HU-04/05/06/07 | ApiError, timeout, errores de contrato, estados visibles y reintentos públicos | No acredita manejo global de sesión/401 ni todas las operaciones autenticadas |
| [TT-05 #19](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/19), almacenamiento seguro de sesión | Open; IvanRamirezFrancisco | Rama `feature/TT-05-secure-session`, preservada | Ningún cambio de sesión/guard/interceptor en este incremento | Coordinar antes de carrito/pedidos/perfil reales; no bloquea GET públicos |

## Criterios PF/PS y evidencia precisa

Los resultados siguientes describen alcance de evidencia, no sustituyen las casillas remotas ni declaran completa una HU.

| Criterios existentes | Qué se puede acreditar | Prueba/evidencia | Brecha |
|---|---|---|---|
| PF-HU04-01/02/03 | Inicio HTTP, contenido, enlaces, loading/error/reintento | `public-catalog.integration.spec.ts`: home wrapper y retry home; navegador local, captura Home | Aceptación Android pendiente |
| PS-HU04-03 | Error visible genérico | UI y error HTTP en pruebas | PS-HU04-01/02 de autorización/sesión expirada pertenecen a siguiente integración |
| PF-HU05-01/02/03/04 | Catálogo, vacío, paginación/selección y error | Suite HTTP de parámetros; suite integración filtros/empty/retry; navegador páginas 1 y 2, enlaces `/products/313` | Recorrido completo en dispositivo pendiente |
| PS-HU05-01/02 | Modelo consumido público, sin body interno en mensajes | DTO/mapper, muestras sanitizadas, HTTP 404/5xx tests | No se certifica seguridad completa del backend sólo por usar una muestra |
| PS-HU05-03 | Guardas de parámetros del cliente; entrada codificada | HTTP repository spec, ID manipulado en integración | Rechazo de todo parámetro malicioso en servidor no probado exhaustivamente |
| PF-HU06-01/02/03 | Búsqueda real y estados sin resultados/error | GET local Jarana/categoría20: 18; búsqueda vacía en navegador; integración empty/retry | Android pendiente |
| PS-HU06-01/02/03/04 | Codificación de caracteres, render texto, longitud, error genérico en cliente | Specs HTTP, mapper/validation e integración script-as-text | No se declara resistencia SQL/inyección del backend sin pruebas específicas contra servidor |
| PF-HU07-01/02 | Detalle, 404 e ID manipulado | HTTP repository spec + integración detalle/404/tampered route; detalle local 313 | Android pendiente |
| PF-HU07-03 | Acciones limitadas explícitamente a consulta; sin agregar real a DEMO | Integración verifica ausencia de botón y carrito DEMO sin cambios | Carrito/favoritos reales de TT-30 aún pendientes; HU-07 parcial |
| PS-HU07-01/02/03 | ID seguro, texto no ejecutable, error genérico | Integración ID/script/error; validation/mapper restringen imágenes | No se acredita autorización de operaciones privadas |

## Evidencia transversal de Actividad 5 / GPDS

| Issues ya existentes | Evidencia de este incremento | Estado y responsable existentes | Falta para DoD |
|---|---|---|---|
| [TT-42 #61](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/61), matriz | Este documento y snapshot de Issues | Open/Tackalay | Revisar matriz en equipo y Project con acceso |
| [TT-43 #62](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/62), CI | Scripts reales conservados; workflows con artifacts HTTP/DEMO separados | Open/Ivan | Ejecución remota del futuro SHA; ningún check nuevo se presenta como PASS |
| [TT-44 #63](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/63), pruebas/cobertura | 316 tests, 70 integración, JUnit y cobertura local 94.83/93.58/93.15/97.20 | Open/Tackalay | Artifacts CI y revisión |
| [TT-45 #64](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/64), seguridad pipeline | No se modifica el pipeline de SAST | Open/Ivan | No hay ejecución nueva SAST/DAST de este código sin commit |
| [TT-46 #65](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/65), Android build | Build Debug local y revisión de manifiesto Release | Open/Ivan | Build/artifact remotos del futuro SHA; pruebas en dispositivo |
| [TT-47 #66](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/66), staging | URL de producción separada, sin deploy | Open/Ivan | Entrega de staging/revisión no ejecutadas por esta fase |
| [TT-48 #67](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/67), regresión | 251 casos anteriores preservados y 65 nuevos; configuración DEMO explícita para Maestro | Open/Tackalay | Maestro Android no ejecutado: adb vacío |
| [TT-49 #68](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/68), pruebas seguridad | Validación JSON, imágenes, IDs, scripts como texto, sin credenciales en GET | Open/Tackalay | No es auditoría/DAST ni prueba exhaustiva del backend |
| [TT-50 #69](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/69), documentación | Informe, matriz, manifest y logs locales | Open/Tackalay | Revisión humana y vínculo al PR futuro |

La evidencia no autoriza cerrar Issues, cambiar Status a Done ni atribuir trabajo publicado a otro colaborador. No se han tocado PR #71, #77, #80 ni sus ramas. Los borradores de commit/PR y la secuencia segura de revisión están en `PUBLIC_CATALOG_INTEGRATION.md`, apartado K. No existe PR nuevo de este incremento.

---

## Ampliación de correspondencia — Módulos autenticados y comerciales conectados

| Historia / Issue | TT relacionadas | Evidencia implementada y probada localmente (`468` tests / `99` integración) | Pendiente para DoD / Cierre |
|---|---|---|---|
| [HU-01 #1](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/1), Inicio de sesión y 2FA | TT-05 #19, TT-06 #20 | `connected-login.page.ts`, `http-auth.repository.ts`, `auth.service.ts`, `connected-auth.integration.spec.ts`: separación de sesión autenticada vs desafío 2FA (`EMAIL`, `GOOGLE_AUTHENTICATOR`, `BACKUP_CODE`), bloqueo 429 con `remainingTimeSeconds`, limpieza inmediata de contraseña | Persistencia nativa en Keystore/Keychain (TT-05), pruebas en dispositivo Android y revisión de PR |
| [HU-02 #2](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/2), Registro y verificación | TT-06 #20 | `connected-register.page.ts`, `verify-email.page.ts`, `auth-fields.validation.ts`: campos separados (`username`, `firstName`, `lastName`, `email`, `phone`, `password` ≤72 bytes UTF-8 y ≥3 clases), confirmación de correo con `/verify-email` y `/resend-verification` | Pruebas contra entorno staging aislado y revisión de PR |
| [HU-03 #3](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/3), Recuperación de contraseña | TT-06 #20 | `connected-forgot-password.page.ts`: usa `/api/auth/password-reset/request` y `/api/auth/password-reset/confirm` (no el endpoint legacy con query param), sin enumeración de cuentas y limpiando contraseñas en memoria | Pruebas en dispositivo Android y revisión de PR |
| [TT-05 #19](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/19), Sesión segura | HU-01, HU-04, HU-09..14 | `MemorySessionStore` (`persistent = false`), `auth.interceptor.ts` (`REQUIRES_AUTH`), `auth.guard.ts` (`safeReturnUrl`), `jwt.util.ts`, `session-security.integration.spec.ts`: cero uso de `localStorage`/`sessionStorage`, manejo de expiración y distinción 401 vs 403 | Integrar plugin nativo cifrado (Android Keystore / iOS Keychain) cuando se autorice dependencia nativa |
| [HU-07 #7](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/7) / [HU-09 #9](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/9), Agregar al carrito real | [TT-30 #46](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/46) | `public-product-detail.view.ts`, `cart.service.ts`, `connected-cart.integration.spec.ts`: en modo conectado exige sesión válida, envía `POST /api/cart/items` por `productId` y actualiza el badge real de `MainNavigationComponent` | Favoritos reales (HU-08) aún pendientes de endpoint; aceptación en dispositivo Android |
| [HU-10 #10](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/10), Administrar carrito real | TT-05 #19, TT-06 #20 | `connected-cart.view.ts`, `http-cart.repository.ts`, `cart.validation.spec.ts`: usa `itemId` para `PUT`/`DELETE /api/cart/items/{itemId}`, valida rangos `1..100`, respeta importes del servidor y valida con `GET /api/cart/validate` antes de checkout | Aceptación Android y revisión de PR |
| [HU-11 #11](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/11), Checkout real seguro | TT-05 #19, TT-06 #20 | `connected-checkout.view.ts`, `http-checkout.repository.ts`, `connected-checkout.integration.spec.ts`: cotización real con `POST /api/checkout/price-preview` y escritura `POST /api/checkout` protegida por `REAL_CHECKOUT_WRITE_ENABLED = false` por defecto | Ejecución autorizada en entorno staging aislado y pasarela de pago |
| [HU-12 #12](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/12) y [HU-13 #13](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/13), Mis pedidos y detalle | TT-05 #19, TT-06 #20 | `connected-orders.view.ts`, `connected-order-detail.view.ts`, `http-real-order.repository.ts`, `connected-orders.integration.spec.ts`: historial paginado `/api/orders/my`, detalle `/api/orders/my/{id}` y `/timeline`, verificación de propiedad `userId` y bloqueo de IDs `DEMO-*` | Aceptación Android y revisión de PR |
| [HU-14 #14](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/14), Perfil real | TT-05 #19, TT-06 #20 | `connected-profile.view.ts`, `http-profile.repository.ts`, `connected-profile.integration.spec.ts`: consulta `GET /api/users/profile`, muestra identidad, estado de verificación y 2FA, aviso de sesión volátil TT-05 y cierre de sesión con `POST /api/auth/logout` | Backend requiere endpoint `PUT /api/users/profile` de autoservicio para habilitar edición de perfil |
