# TT-04 — Implementar navegación móvil

Fecha: 25/10/2026. Issue #18. Rama: `feature/TT-04-mobile-navigation`. Base local: `develop`, `fb6dedc` (PR #81). Sin commit, push, PR ni cambios a GitHub Projects.

## Implementación

Se conservan los cinco tabs y Bubble Navigation, badge de carrito, estilos globales, safe areas y foco visible. No se añaden dependencias.

- `/favorites`: pantalla informativa accesible, enlace desde Inicio, regreso Ionic con `/main/home` como fallback y acceso al catálogo. Explica que las selecciones DEMO de Home no se comparten ni persisten.
- `/products/:id`: sustituye el diálogo del catálogo; contenido DEMO extraído sin duplicar datos. Acepta representación decimal canónica de entero positivo seguro; inválido/inexistente muestra un estado controlado. El ID no se refleja en el mensaje. `/products` sin ID muestra NotFound.
- `q` y `categoria`: cambios seguros mediante Router con `replaceUrl`; no generan una entrada por pulsación. Vacío/espacios se comportan como búsqueda vacía. Categorías desconocidas usan Todos. Orden permanece local. No se propagan parámetros arbitrarios.
- `/not-found` y wildcard: página visible que conserva la URL defectuosa, con destino fijo a Inicio.
- Pedidos conserva su ruta, servicio DEMO y validación existente. Los retornos de pedido, edición de perfil y checkout usan `NavController.navigateBack`; la salida de confirmación usa `navigateRoot` y `replaceUrl`.

## Evidencia para ajustes limitados

Los botones anteriores de regreso llamaban a `Router.navigate`, sin indicar dirección. `NavController` instalado infiere forward para nuevas navegaciones; esos regresos podían conservar la secundaria en la pila Ionic. Los cambios solo sustituyen la operación de navegación. Las pruebas de regresión exigen la API back y la integración activa los destinos reales. Se conservan formularios, validaciones, importes, cantidades, `placeOrder`, estado DEMO y limpieza existentes.

`main.ts` se modificó después de una evidencia real, no preventivamente: el primer intento Maestro API 36 registró en WebView `Blocked aria-hidden ... descendant retained focus` al abrir `/favorites`, con el enlace de Inicio enfocado dentro de `app-main-navigation.ion-page-hidden`. Se habilitó la prioridad de foco nativa de Ionic `['heading', 'content']`. Se comprueba con logs y muestreo de solo lectura del foco en el WebView local. El muestreo capturó encabezados visibles en Favoritos y producto, sin foco dentro de páginas ocultas; el aviso Blocked aria-hidden no reapareció en el log de la ejecución con la corrección. La primera sonda de solo lectura guardó 94 muestras y terminó con exit 1 por un await pendiente al reiniciarse WebView entre flujos; se corrigió el manejo de cierre en el script local y la segunda sonda terminó con exit 0. La segunda sonda guardó 45/45 muestras sin foco en páginas ocultas. No se presenta esa sonda como una prueba TalkBack. Esto no equivale a una auditoría completa con TalkBack.

En el segundo intento, la ruta de producto abrió y mostró sus datos, pero el selector exacto de marca no coincidió con el párrafo compuesto; la captura confirma el contenido y se ajustó el selector, sin modificar la página.

El primer flujo Android falló al pulsar el enlace de producto parcialmente cubierto por la barra flotante: la captura conservada muestra Catálogo sin haberse desplazado. El flujo ahora desplaza el control al centro antes de pulsarlo; no se alteró Bubble Navigation ni se ocultó el fallo.

## Rutas finales

```text
/ -> /splash
/splash
/login
/register
/forgot-password
/main -> /main/home
/main/home
/main/catalog?q=...&categoria=...
/main/cart
/main/orders
/main/profile
/favorites
/products/:id
/orders/:id
/profile/edit
/checkout
/checkout/delivery
/checkout/payment
/checkout/confirmation
/api-connection
/foundation-preview
/not-found
** -> NotFoundPage (sin redirigir la URL)
```

Las entradas directas son rutas internas Angular. No se configuran App Links externos ni dominios. Home conserva los productos destacados con IDs `p1`; no se convierten a IDs del catálogo.

## Seguridad y límites

Solo parámetros públicos, destinos internos fijos, IDs validados y lazy loading. Sin JWT/tokens/secretos en URLs, returnUrl externo, AuthGuard DEMO ni nuevas simulaciones de autenticación.

Fuera de alcance: autenticación (TT-09), sesión/almacenamiento seguro (TT-05), guards futuros, manejo global de errores (TT-06), APIs de producto/favoritos/carrito, persistencia, backend, stock, reviews, imágenes reales, pagos y funcionalidad completa HU-07/HU-08. La validación de ID no sustituye autorización de backend.

## Pruebas

`app.routes.integration.spec.ts` usa las rutas de producción y sus componentes lazy reales, con RouterTestingHarness, IonicRouteStrategy e Ionic Tabs. Incluye 50 escenarios: raíz/splash/main, cinco destinos, auth, checkout, entradas directas, filtro combinado, caracteres reservados, limpieza, atrás/adelante, links reales, IDs y NotFound. Los eventos de historial esperan NavigationEnd, no solo estabilidad del fixture.

Se amplían los specs de tabs, Home, Catálogo, pedido, edición, checkout y la integración crítica existente. Los casos del diálogo retirado se sustituyen por pruebas equivalentes de ruta. Se añade `.maestro/navigation-demo.yaml` al conjunto existente. El CI Android sigue en API 34; la validación local TT-04 usa Pixel_8_API_36 (SDK 36 comprobado).

## Resultados

- `git diff --check`: exit 0, sin errores de whitespace.
- `npm run lint`: exit 0, All files pass linting.
- `npm test -- --watch=false`: exit 0, 224/224 pruebas, 33/33 archivos; 50 pruebas de routing.
- `npm run build`: exit 0, ocho warnings de presupuesto SCSS.
- `npm audit --omit=dev`: exit 0, found 0 vulnerabilities.
- `npx cap sync android`: exit 0.
- `gradlew.bat assembleDebug --console=plain`: exit 0, BUILD SUCCESSFUL; APK en `android/app/build/outputs/apk/debug/app-debug.apk`.
- Maestro API 36: los tres flujos existentes pasaron (cuenta 52.130 s, autenticación 35.991 s, compra 54.020 s). La ejecución conjunta conservada terminó con 1/4 fallido: navegación esperaba coincidencia exacta de la marca, que se renderiza dentro de una línea compuesta. Se corrigió el selector a regex de esa misma marca. La siguiente repetición verificó producto y regreso con categoría conservada, pero el selector del buscador no se expuso en la jerarquía Android. Se añadió `id="catalog-search"` sin cambiar comportamiento ni aria-label, usando selector por ID como en login. Ejecución verificada final: exit 0, 1/1 flujo aprobado, 109.544 s (JUnit 109.578 s de suite), Pixel_8_API_36. No se presenta la ejecución conjunta anterior como 4/4: conserva 3 PASS y 1 FAIL; el flujo corregido se acredita mediante su JUnit separado `tt04-navigation-verified.xml`.

Intentos iniciales: Vitest falló antes de ejecutar tests por EPERM al renombrar caché temporal del sandbox; el build generó bundles pero falló por EPERM al copiar assets; audit no resolvió registry.npmjs.org. Los comandos se reejecutaron fuera del sandbox y sus resultados finales se registran arriba. Los dos fallos iniciales de historial se corrigieron esperando el evento real NavigationEnd.

## Advertencias

Build: presupuestos de estilos de 2 kB excedidos en button (2.82 kB), forgot-password (2.86), confirmation (2.14), checkout-summary (2.05), catalog (2.29), cart (3.20), payment (3.30) y delivery (3.30). No se elevaron presupuestos. Se conservaron los estilos existentes salvo retirar los del diálogo.

Android: advertencias flatDir y discrepancia de herramientas SDK XML (lector hasta versión 3 frente a XML 4). Maestro Windows registra errores de heartbeat por bloqueo de archivo; se informa separadamente del resultado de assertions. WebView también registró al inicio avisos de inyección de safe area de Capacitor y mensajes de Chromium; no se consideran acreditación de accesibilidad completa.

## Evidencia local

En `reports/` (ignorado por Git): `tt04-tests.log`, `tt04-build.log`, `tt04-android-build.log`, `tt04-acceptance.log`, `tt04-acceptance.xml`, `tt04-acceptance/`, `tt04-focus.jsonl`, `tt04-navigation-verified.log`, `tt04-navigation-verified.xml`, `tt04-navigation-verified/` y `tt04-webview.log`. El intento Android fallido se conserva en `tt04-maestro/` y `tt04-navigation.xml`. Maestro 2.11.0 descargado de su release oficial a `reports/tt04-tools/`; sin cambios a package.json/package-lock.

## Inventario exacto de archivos

Archivos nuevos:

- `.maestro/navigation-demo.yaml`
- `docs/testing/TT04_NAVIGATION.md`
- `src/app/app.routes.integration.spec.ts`
- `src/app/features/catalog/catalog-demo.data.ts`
- `src/app/features/catalog/product-detail/product-detail.page.ts`
- `src/app/features/favorites/favorites.page.ts`
- `src/app/features/not-found/not-found.page.ts`

Archivos modificados:

- `.maestro/config.yaml`
- `docs/testing/TEST_PLAN.md`
- `docs/testing/TRACEABILITY_MATRIX.md`
- `src/app/app.routes.ts`
- `src/app/core/services/critical.integration.spec.ts`
- `src/app/features/catalog/catalog.page.html`
- `src/app/features/catalog/catalog.page.scss`
- `src/app/features/catalog/catalog.page.spec.ts`
- `src/app/features/catalog/catalog.page.ts`
- `src/app/features/checkout/checkout-summary/checkout-summary.page.spec.ts`
- `src/app/features/checkout/checkout-summary/checkout-summary.page.ts`
- `src/app/features/checkout/confirmation/confirmation.page.spec.ts`
- `src/app/features/checkout/confirmation/confirmation.page.ts`
- `src/app/features/checkout/delivery-method/delivery-method.page.spec.ts`
- `src/app/features/checkout/delivery-method/delivery-method.page.ts`
- `src/app/features/checkout/payment-method/payment-method.page.spec.ts`
- `src/app/features/checkout/payment-method/payment-method.page.ts`
- `src/app/features/home/home.page.html`
- `src/app/features/home/home.page.spec.ts`
- `src/app/features/home/home.page.ts`
- `src/app/features/orders/order-detail/order-detail.page.spec.ts`
- `src/app/features/orders/order-detail/order-detail.page.ts`
- `src/app/features/profile/edit-profile/edit-profile.page.spec.ts`
- `src/app/features/profile/edit-profile/edit-profile.page.ts`
- `src/app/layout/main-navigation/main-navigation.component.spec.ts`
- `src/main.ts`

## Estado Git

Rama: `feature/TT-04-mobile-navigation`. Sin staging, commit, push, PR ni cambios a Projects. Los archivos Gradle generados por cap sync quedaron iguales a HEAD. Emulador de pruebas cerrado y puerto de depuración retirado.

`git status --short --untracked-files=all`:

```text
 M .maestro/config.yaml
 M docs/testing/TEST_PLAN.md
 M docs/testing/TRACEABILITY_MATRIX.md
 M src/app/app.routes.ts
 M src/app/core/services/critical.integration.spec.ts
 M src/app/features/catalog/catalog.page.html
 M src/app/features/catalog/catalog.page.scss
 M src/app/features/catalog/catalog.page.spec.ts
 M src/app/features/catalog/catalog.page.ts
 M src/app/features/checkout/checkout-summary/checkout-summary.page.spec.ts
 M src/app/features/checkout/checkout-summary/checkout-summary.page.ts
 M src/app/features/checkout/confirmation/confirmation.page.spec.ts
 M src/app/features/checkout/confirmation/confirmation.page.ts
 M src/app/features/checkout/delivery-method/delivery-method.page.spec.ts
 M src/app/features/checkout/delivery-method/delivery-method.page.ts
 M src/app/features/checkout/payment-method/payment-method.page.spec.ts
 M src/app/features/checkout/payment-method/payment-method.page.ts
 M src/app/features/home/home.page.html
 M src/app/features/home/home.page.spec.ts
 M src/app/features/home/home.page.ts
 M src/app/features/orders/order-detail/order-detail.page.spec.ts
 M src/app/features/orders/order-detail/order-detail.page.ts
 M src/app/features/profile/edit-profile/edit-profile.page.spec.ts
 M src/app/features/profile/edit-profile/edit-profile.page.ts
 M src/app/layout/main-navigation/main-navigation.component.spec.ts
 M src/main.ts
?? .maestro/navigation-demo.yaml
?? docs/testing/TT04_NAVIGATION.md
?? src/app/app.routes.integration.spec.ts
?? src/app/features/catalog/catalog-demo.data.ts
?? src/app/features/catalog/product-detail/product-detail.page.ts
?? src/app/features/favorites/favorites.page.ts
?? src/app/features/not-found/not-found.page.ts
```

`git diff --stat` (no incluye los siete archivos nuevos sin seguimiento):

```text
 .maestro/config.yaml                               |   1 +
 docs/testing/TEST_PLAN.md                          |  16 ++-
 docs/testing/TRACEABILITY_MATRIX.md                |  23 +++-
 src/app/app.routes.ts                              |  18 ++-
 src/app/core/services/critical.integration.spec.ts |   5 +-
 src/app/features/catalog/catalog.page.html         |  53 +-------
 src/app/features/catalog/catalog.page.scss         |  56 +-------
 src/app/features/catalog/catalog.page.spec.ts      |  70 ++--------
 src/app/features/catalog/catalog.page.ts           | 149 +++------------------
 .../checkout-summary/checkout-summary.page.spec.ts |   7 +
 .../checkout-summary/checkout-summary.page.ts      |   5 +-
 .../confirmation/confirmation.page.spec.ts         |   7 +
 .../checkout/confirmation/confirmation.page.ts     |   7 +-
 .../delivery-method/delivery-method.page.spec.ts   |   7 +
 .../delivery-method/delivery-method.page.ts        |   9 +-
 .../payment-method/payment-method.page.spec.ts     |   7 +
 .../checkout/payment-method/payment-method.page.ts |   9 +-
 src/app/features/home/home.page.html               |   2 +-
 src/app/features/home/home.page.spec.ts            |   6 +
 src/app/features/home/home.page.ts                 |   2 +-
 .../orders/order-detail/order-detail.page.spec.ts  |   7 +-
 .../orders/order-detail/order-detail.page.ts       |   8 +-
 .../profile/edit-profile/edit-profile.page.spec.ts |   7 +
 .../profile/edit-profile/edit-profile.page.ts      |   9 +-
 .../main-navigation.component.spec.ts              |   6 +
 src/main.ts                                        |   3 +-
 26 files changed, 170 insertions(+), 329 deletions(-)
```
