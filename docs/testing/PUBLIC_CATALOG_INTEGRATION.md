# Incremento de catálogo público real — 27 de octubre de 2026

> Documento histórico de octubre. Las referencias de ramas históricas se omiten para publicación; los originales permanecen en el respaldo manual. El estado y las validaciones de Etapa 1B están en [el informe actual](../etapa1b/README.md).


## Resultado y alcance

Inicio, categorías, catálogo, búsqueda, paginación y detalle consultan Spring Boot por HTTP. Se conservan las rutas, identidad visual, navegación Ionic y la implementación DEMO de Actividad 4. Los productos HTTP mantienen sus identificadores reales, modelo propio y `source: 'http'`; el detalle real no ofrece agregar al carrito. No se ejecutaron pedidos, pagos, cambios de stock ni operaciones autenticadas. No hay fallback automático de servidor ni de datos reales a fixtures.

La rama sigue siendo `[referencia de rama histórica omitida]`, con HEAD `efe9767082040971278e66595aad8c0bf82c4b81` y cambios sin commit. Digest SHA-256 del conjunto de 248 archivos fuente/configuración: `76c0b4f71be9b0e35a0d512e484499fc4ad20083e98b48066b8b4e24f3bb8ecf`. El HEAD no representa por sí solo el código probado: consultar `PUBLIC_CATALOG_SOURCE_MANIFEST.json`, con hashes del árbol de trabajo. `develop`, `main`, `feature/TT-05-secure-session` y los PR de otros colaboradores no se modificaron. Tampoco se modificó el backend ni su proceso local.

Antes de implementar se respaldaron los 33 archivos con cambios previos en `reports/public-catalog-preexisting.zip` y sus hashes en `reports/public-catalog-preexisting.json`. Los archivos históricos `ACTIVITY4_EVIDENCE.md` y `ACTIVITY4_SOURCE_MANIFEST.json` se conservan como evidencia anterior, sin reescribir sus resultados.

## A–B. Funcionalidades y contratos utilizados

Todas las operaciones son GET públicas, sin body, cookies ni encabezado Authorization. `ApiClientService` mantiene timeout de 60 segundos; los reintentos son explícitos del usuario.

| Endpoint confirmado | Entrada | Salida consumida | Uso |
|---|---|---|---|
| `/api/public/categories/active` | Ninguna | `PublicCategory[]` | Inicio y filtro por ID real |
| `/api/public/products/catalog` | `page` desde 0, `size` 1–50, `keyword`, `categoryId`, `sortBy` | `PublicPage<PublicProductDto>` | Catálogo paginado y búsqueda real |
| `/api/public/products/{id}` | ID entero positivo seguro | `PublicProductDto` | Detalle, precio, stock, atributos e imágenes |
| `/api/public/products/latest` | Ninguna | `PublicProductDto[]` | Novedades en Inicio |
| `/api/public/products/featured` | `page=0`, `size=6` | `PublicPage<PublicProductDto>` | Destacados en Inicio |

Orden soportado: `featured`, `price_asc`, `price_desc`, `name_asc`. En búsqueda se informa que el servidor decide la relevancia; se desactiva el selector de orden. El texto se recorta a 100 caracteres, se envía con `HttpParams` y nunca se interpola en un endpoint. Categoría y detalle usan ID numérico real, no nombres ni identificadores del catálogo DEMO. Cambiar búsqueda/categoría/orden reinicia la página. Los filtros se representan en la URL; las pulsaciones reemplazan la entrada del historial y se agrupan durante 200 ms.

`PublicProductDto` tipa `id`, `sku`, `name`, `description`, `detailedDescription`, `price`, `discountPrice`, `stock`, `imageUrl`, `images[{url,displayOrder}]`, `category{id,name,parentId,parentName}`, `brand{id,name,logoUrl}`, `attributes[{name,value,displayOrder}]`, `model`, `weight`, `dimensions`, `featured`, `averageRating` y `reviewCount`. Los null admitidos siguen el contrato real. `PublicPage` consume `content`, `number`, `size`, `totalElements`, `totalPages`, `first`, `last`; no necesita los metadatos adicionales de Spring Page.

La validación parte de `unknown`: rechaza formas JSON incompatibles, IDs no seguros, precios negativos/no finitos/textuales, descuentos mayores que el precio base, stock negativo/fraccionario, referencias y arreglos mal formados y paginación incoherente con sus totales. No convierte errores de contrato en productos de ejemplo. Stock null se presenta como disponibilidad por confirmar; stock 0 como agotado. Un descuento de 0 se conserva. La moneda visual MXN conserva la convención existente de la aplicación; no se hace conversión de divisas.

El mapper aplica el descuento, conserva el precio original cuando corresponde, ordena/deduplica imágenes y atributos, maneja null y produce un modelo de presentación independiente. Sólo admite recursos del origen del backend y HTTPS de `res.cloudinary.com`; rechaza credenciales embebidas, `data:`, `javascript:` y HTTP remoto. HTTP de imágenes sólo se admite en el mismo backend de desarrollo local/emulador. Una URL ausente, rechazada o con error de carga muestra un placeholder accesible. No se renderiza `detailedDescription` como HTML.

## Arquitectura y patrones reales

Antes: las vistas consultaban servicios DEMO, con el flujo de pedidos separado mediante Repository y Factory. Después: se agrega una ruta HTTP paralela para consultas públicas; el flujo DEMO mantiene sus clases y pruebas.

| Capa | Clases/rutas relativas a la raíz del repositorio |
|---|---|
| Presentación | `src/app/features/public-catalog/public-home.view.ts`, `public-catalog.view.ts`, `public-product-detail.view.ts`, `public-product-grid.component.ts` |
| Aplicación | `src/app/core/services/public-catalog.service.ts` (`PublicCatalogService`, estado por vista) |
| Puerto Repository | `src/app/core/repositories/public-catalog.repository.ts` (`PublicCatalogRepository`, token de inyección) |
| Infraestructura | `src/app/core/infrastructure/http-public-catalog.repository.ts`, `src/app/core/api/api-client.service.ts` |
| Contratos/validación/mapping | `src/app/core/api/public-catalog.dto.ts`, `public-catalog.validation.ts`, `public-product.mapper.ts`, `public-category.model.ts` |
| Modelo de presentación | `src/app/core/models/public-product.model.ts` |
| Preservación DEMO | `demo-catalog.service.ts`, `demo-checkout-state.service.ts`, `demo-order.factory.ts`, `in-memory-demo-order.repository.ts` y sus pruebas existentes |

Repository evita que la presentación conozca HttpClient y permite probar la aplicación con sustitutos del puerto. El token crea/resuelve el repositorio HTTP mediante DI; `ApiClientService` y `HttpPublicCatalogRepository` usan el alcance Singleton de Angular (`providedIn: 'root'`). `PublicCatalogService` se provee por vista para no compartir accidentalmente filtros entre Inicio, Catálogo y Detalle. Observer se utiliza mediante Observables, `switchMap`, señales y `takeUntilDestroyed`: una consulta nueva cancela la anterior y sus resultados tardíos no reemplazan el estado vigente. Los errores se capturan dentro de cada consulta para que el stream siga aceptando reintentos. La Factory de pedidos DEMO se reutiliza sin crear una Factory artificial para peticiones GET. No se declara Clean Architecture ni MVVM.

## C. Backend local comprobado

Evidencia sanitizada: `reports/public-catalog-local-contracts.json`, consultada el 27/oct/2026 a las 19:23:45 UTC. Las siete consultas GET devolvieron 200:

| Consulta | Resultado observado |
|---|---|
| Categorías activas | 10 categorías |
| Catálogo `page=0&size=1` | 68 productos; página 0 |
| Producto 313 | Jarana Huasteca Premium Modelo 8, SKU JARA-008, precio 6500, stock 18 |
| Latest | 8 productos, incluidos registros de prueba existentes en la BD |
| Featured `page=0&size=1` | 6 destacados en total |
| Catálogo `keyword=Jarana&categoryId=20&page=0&size=2` | 18 coincidencias |
| Catálogo `page=1&size=1` | Página 1, mismo total 68 |

Ejemplos sanitizados del JSON realmente recibido, reducidos a campos públicos:

```json
{"id":10,"name":"Accesorios","imageUrl":"","activeProductCount":28}
```

```json
{"content":[{"id":313,"sku":"JARA-008","name":"Jarana Huasteca Premium Modelo 8","price":6500.00,"discountPrice":null,"stock":18}],"number":0,"size":1,"totalElements":68,"totalPages":68,"first":true,"last":false}
```

Preflight OPTIONS local: `http://localhost:4200` y `https://localhost` respondieron 200 con el origen permitido correspondiente. `http://localhost` y `capacitor://localhost` devolvieron 403: no se ampliaron los orígenes. La aplicación Android Capacitor usa por defecto `https://localhost`; esto no acredita iOS. La consulta fue sólo lectura, sin credenciales ni acceso directo a PostgreSQL.

También se comprobó en navegador la aplicación real contra localhost: 68 productos, búsqueda Jarana + categoría 20 con 18 resultados, página 2 de 2, búsqueda sin coincidencias, novedades/destacados, detalle 313 con MX$6,500.00 y 18 unidades, y aviso que impide mezclarlo con la compra DEMO. A 320 × 640 no hubo desbordamiento horizontal; se corrigió una imagen que desbordaba el detalle, confirmando que imagen y contenedor miden 240 px de alto. Las capturas y snapshots están en `reports/public-catalog-*-320.*`. Esta revisión web no equivale a ejecución en dispositivo Android.

## D. Configuraciones y seguridad

| Configuración explícita | Backend | Datos de catálogo | HTTP Android |
|---|---|---|---|
| `development` web (`npm start`) | `http://localhost:8080` | Reales | No aplica al navegador |
| `development` en Android | `http://10.0.2.2:8080` | Reales | Excepción existente sólo Debug y sólo 10.0.2.2 |
| `production` (`npm run build`, predeterminada) | `https://casa-musica-castillo-backend.onrender.com` | Reales | Release sin excepción de cleartext |
| `demo` (`--configuration=demo`) | Configurada HTTPS; no se consulta para el recorrido DEMO | Fixtures explícitos de Actividad 4 | Sin nuevas excepciones |

Las configuraciones están en `src/environments/environment.ts`, `environment.prod.ts`, `environment.demo.ts` y `angular.json`. `PUBLIC_CATALOG_ENABLED` se resuelve desde configuración al construir; no cambia por errores de red. Los tests anteriores seleccionan DEMO explícitamente en `src/test-setup.ts`; las nuevas pruebas de integración sobrescriben el token a true y ejercitan las vistas HTTP. No se desactiva ninguna prueba.

No se añadieron secretos, tokens, interceptores de sesión ni almacenamiento de credenciales. Los mensajes visibles de error no muestran bodies internos, SQL ni stack traces. La configuración de seguridad Android Debug existente permite cleartext exclusivamente a 10.0.2.2; no se modificó. Se procesó el manifiesto Release: targetSdk 36, sin `usesCleartextTraffic=true` ni `networkSecurityConfig` de Debug. El build Angular de producción contiene la URL HTTPS; no se verificó disponibilidad ni paridad de contratos en Render durante este incremento.

## E. Pruebas y cobertura ejecutadas

| Script/comando real | Resultado | Evidencia |
|---|---|---|
| `npm run lint` | PASS | `reports/public-catalog-lint.log` |
| `npm test -- --watch=false` | 316 PASS, 41 archivos | `reports/public-catalog-tests.log` |
| `npm run test:integration` | 70 PASS, 4 archivos | `reports/public-catalog-integration.log`, `reports/integration-tests.xml` |
| `npm run test:coverage` | 316 PASS | `reports/public-catalog-coverage.log`, `reports/unit-tests.xml`, `coverage/app/coverage-summary.json` |
| `npm run build` | PASS; advertencias SCSS existentes | `reports/public-catalog-build.log` |
| `npm run build -- --configuration=demo --output-path=reports/public-catalog-demo-www` | PASS | `reports/public-catalog-demo-build.log` |
| `npm run build -- --configuration=development` | PASS; backend local por plataforma | `reports/public-catalog-development-build.log` |
| `npx cap sync android` | PASS | `reports/public-catalog-capacitor-sync.log` |
| `gradlew.bat assembleDebug processReleaseMainManifest --console=plain` | BUILD SUCCESSFUL (JDK 21) | `reports/public-catalog-android-build.log` |
| `npx cap sync android` después de development | PASS | `reports/public-catalog-development-sync.log` |
| `gradlew.bat assembleDebug --console=plain` con assets development | BUILD SUCCESSFUL | `reports/public-catalog-development-android.log` |
| `adb devices -l` | Sin dispositivos | `reports/public-catalog-adb.log` |
| Maestro / runtime Android real | NO EJECUTADO; requiere dispositivo/emulador | No se declara PASS |

Cobertura total del árbol instrumentado: statements **94.83%**, branches **93.58%**, functions **93.15%**, lines **97.20%**. La base anterior tenía 251 casos: se conservan los mismos y se añaden 65. Los 70 de integración son un subconjunto de los 316, no se suman como casos distintos. Los porcentajes incluyen código previo y el incremento; no se afirma cobertura total de Android ni del servidor. Las pruebas de integración usan HttpTestingController y componentes Angular; las consultas y recorrido contra Spring Boot local se documentan por separado.

Nuevas suites: `public-catalog.validation.spec.ts` (40), `http-public-catalog.repository.spec.ts` (9), `public-catalog.service.spec.ts` (5) y `public-catalog.integration.spec.ts` (11). Cubren parámetros codificados, categorías, página/tamaño, búsqueda, selección, precios y descuentos, stock 0/null, imágenes inseguras/rotas, JSON incompatible, timeout de transporte, HTTP 404/500/503, reintentos, filtros rápidos, cancelación HTTP y descarte de respuestas fuera de orden. El timeout se simula como evento de transporte y se comprueba el valor de 60 000 ms; no se afirma haber esperado 60 segundos contra un servidor bloqueado.

## F–G. Android y funciones que siguen DEMO

Se generan dos APK Debug reales separados: `reports/public-catalog-production-debug.apk` con configuración production/HTTPS y `reports/public-catalog-local-debug.apk` con configuración development/10.0.2.2 para emulador. El APK de `android/app/build/outputs/apk/debug/app-debug.apk` y los assets finales `www`/Capacitor quedan en **development local**, priorizando el backend local como se solicitó. El APK HTTPS separado se conserva sin desplegar. Ambos usan assets Angular y plugins Capacitor sincronizados. Los logs locales adicionales son `reports/public-catalog-development-build.log`, `public-catalog-development-sync.log` y `public-catalog-development-android.log`. Los hashes y rutas de APK disponibles se registran en `PUBLIC_CATALOG_SOURCE_MANIFEST.json`. Debug no es un APK Release firmado ni una publicación. La comprobación de manifiesto Release no equivale a compilar/firmar toda la variante Release. Advertencias observadas: presupuestos SCSS de componentes existentes, Gradle flatDir y diferencia de versiones del XML del SDK; no bloquearon el build.

Autenticación, registro, recuperación, sesión, carrito, entrega, pago, confirmación, pedidos/historial y perfil continúan DEMO. Favoritos sigue como pantalla pendiente. Los productos públicos no tienen acción de compra ni se convierten en IDs DEMO. El carrito existente contiene exclusivamente su estado demostrativo y sigue indicándolo visualmente. La integración pública no requiere TT-05; la compra/perfil autenticados sí dependen de TT-05 #19 y del contrato de sesión. No se tocó esa rama ni el PR de seguridad del backend.

## H. Correspondencia de GitHub para revisión

Consultar `PUBLIC_CATALOG_TRACEABILITY.md` y `PUBLIC_CATALOG_ISSUES_SNAPSHOT.json`. Son evidencia local de Issues y una propuesta de correspondencia; no cambian casillas, responsables, estados ni elementos remotos. El Project 1 devuelve 404 en esta sesión; Status, Iteración XP, Etapa DevOps y Prioridad no se pudieron verificar. Estado de Issue y estado del Project se distinguen explícitamente.

## I–J. Archivos y seguridad Git

`PUBLIC_CATALOG_SOURCE_MANIFEST.json` registra archivos añadidos/modificados en este incremento respecto del respaldo previo, archivos con cambios de Actividad 4 preservados, hashes fuente y referencias Git. La diferencia contra HEAD incluye ambas actividades porque la anterior todavía no tiene commit. No interpretar `git diff HEAD` como un incremento aislado sólo de catálogo real.

Se conserva la rama actual. Cualquier rama posterior, por ejemplo `[referencia de rama histórica omitida]`, debe partir del estado actual conservando los cambios de Actividad 4; no se debe hacer checkout/reset a develop para crearla. Estado final: 64 archivos con cambios respecto a HEAD (30 modificados y 34 nuevos), incluyendo el trabajo previo; de ellos, 34 archivos corresponden a este incremento (el inventario del manifest excluye su propio archivo). De los 33 archivos que ya tenían cambios antes de empezar, 30 permanecen idénticos byte a byte y sólo se amplían los tres controladores de presentación Home/Catalog/ProductDetail para seleccionar la vista HTTP; los 33 originales están respaldados y no falta ninguno. Ningún spec previo fue editado. No hay archivos staged ni commit nuevo. `git diff --check` y `git status --short` se guardan en `reports/public-catalog-git-final.log`.

## K. Preparación para commit, PR y CI — sin ejecutar acciones remotas

Título propuesto para revisión futura: `feat(catalog): integrar catálogo público Spring Boot y separar aceptación DEMO`.

Descripción propuesta: Inicio, catálogo y detalle consultan los endpoints públicos existentes con validación de contratos, mapeo de precios/stock/imágenes, filtros paginados y estados recuperables. Los productos HTTP no se pueden agregar al carrito DEMO. Se conservan las 251 pruebas de Actividad 4 y se agregan 65; se validaron 316 pruebas, 70 de integración, cobertura, build y Android. La compra autenticada, Maestro Android y revisión del Project siguen pendientes. La base contiene además los cambios de Actividad 4 que aún no tienen commit y debe revisarse como tal.

Referencias futuras sin autocierre: `Refs #17, #4, #5, #6, #7, #33, #34, #35, #36, #37, #38, #39, #40, #41, #42, #43, #61, #62, #63, #65, #67, #68, #69`. No usar `Closes` hasta satisfacer el DoD completo y obtener revisión.

Se preparan localmente `android-build.yml` y `acceptance.yml` para que publiquen dos artifacts distintos del mismo run/SHA: `casa-musica-castillo-debug-apk` con catálogo HTTP/HTTPS y `casa-musica-castillo-demo-debug-apk` construido explícitamente con configuración demo para los cuatro flujos Maestro existentes. La aceptación consume únicamente el segundo. Esto conserva la regresión DEMO sin presentar sus resultados como validación del backend. El resumen de CI distingue ambos builds. No se publicó ni ejecutó este cambio de workflow en GitHub; no existe check remoto de este árbol sin commit. Antes de integrar, revisar el diff, ejecutar Actions sobre el futuro SHA y adjuntar logs, artifacts y aprobación de Ivan/Brayan sin intervenir en PR ajenos. Los tests de catálogo HTTP ya forman parte del script estándar de CI; la aceptación contra backend requiere entorno/datos controlados y dispositivo.

## L. Riesgos y próximos incrementos

1. Revisar el Project con acceso adecuado y confirmar sus opciones reales antes de proponer actualizaciones. No cerrar HU/TT sólo por pruebas locales; falta PR, revisión y evidencia de CI.
2. Ejecutar el APK local real en emulador Android y pruebas de navegación/errores/imágenes; Maestro no se ejecutó porque `adb devices` está vacío.
3. La BD local contiene categorías/productos de prueba visibles. Se muestran tal como los devuelve la API; no se corrigió ni filtró arbitrariamente su contenido.
4. Algunas imágenes heredadas no pertenecen al origen esperado o no cargan: se muestra placeholder. El backend debe normalizar los recursos válidos; no se relaja HTTPS para aparentar que funcionan.
5. Confirmar en staging HTTPS la misma versión de endpoints y CORS antes de una prueba de producción. Este incremento comprobó Spring Boot local, no un deploy ni disponibilidad permanente de Render.
6. Coordinar TT-05 antes de conectar carrito, pedidos y perfil autenticados. Revalidar stock/precio del lado servidor en esa etapa; las consultas actuales no reservan existencias.
7. Completar las pruebas de seguridad del backend (autorización, sesión expirada, parámetros maliciosos contra consultas reales) y el recorrido Android; las pruebas cliente no acreditan por sí solas esos controles del servidor.
8. Mantener la evidencia académica sobre Ionic/Angular/Capacitor: el riesgo de aceptación del instrumento que enumera Flutter, React Native y Kotlin requiere confirmación docente. La compilación Android no sustituye esa confirmación.

Se detiene el trabajo para revisión. No se hicieron commit, push, PR, merge, deploy, cierres de Issues ni actualizaciones del Project.


---

## Incremento integral de módulos conectados (Auth, 2FA, Sesión TT-05 volátil, Carrito, Pedidos, Checkout seguro, Perfil y UI/UX)

Continuando sobre la misma rama `[referencia de rama histórica omitida]` (`HEAD efe9767082040971278e66595aad8c0bf82c4b81`) y conservando intactos el recorrido DEMO (`--configuration=demo` y configuración por defecto de `src/test-setup.ts`) y el catálogo público HTTP, se integraron los contratos reales de Spring Boot para las pantallas autenticadas y comerciales:

### 1. Contratos reales integrados

| Módulo | Endpoints consumidos | Contrato validado (`unknown` → modelo) | Comportamiento y salvaguardas |
|---|---|---|---|
| **Autenticación y 2FA** | `POST /api/auth/login`, `POST /api/2fa/send-login-code`, `POST /api/2fa/verify`, `POST /api/auth/register`, `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`, `POST /api/auth/password-reset/request`, `POST /api/auth/password-reset/confirm`, `POST /api/auth/logout` | `parseLoginOutcome`, `parseVerifyTwoFactorResponse`, `parseVoidEnvelope` (`src/app/core/api/auth.validation.ts`) | Distingue HTTP 200 autenticado (`data.jwtResponse`) de desafío 2FA (`data.twoFactorRequired: true`, `preAuthChallenge`, `availableMethods`). Registro envía `username`, `firstName`, `lastName`, `email`, `phone`, `password` por separado y exige verificación de correo antes de autenticar. Contraseñas nunca se almacenan ni registran en consola. |
| **Sesión y TT-05** | Interceptor `authInterceptor` + `REQUIRES_AUTH` + `authGuard` | `readJwtExpirationMs` (`src/app/core/security/jwt.util.ts`) + `MemorySessionStore` (`src/app/core/infrastructure/memory-session.store.ts`) | `persistent = false`: el JWT vive únicamente en memoria volátil del proceso (nunca en `localStorage` ni `sessionStorage`). `REQUIRES_AUTH` asegura que las rutas públicas (`/api/public/**`) jamás reciban `Authorization`. HTTP 401 limpia sesión y redirige a `/login` con aviso de expiración; HTTP 403 se muestra como acceso denegado sin destruir una sesión válida. |
| **Carrito real** | `GET /api/cart`, `GET /api/cart/summary`, `POST /api/cart/items`, `PUT /api/cart/items/{itemId}`, `DELETE /api/cart/items/{itemId}`, `DELETE /api/cart`, `GET /api/cart/validate` | `parseCart`, `parseCartSummary`, `parseCartValidation` (`src/app/core/api/cart.validation.ts`) | Separa `productId` (al agregar desde detalle público) de `itemId` (al modificar o eliminar partidas). El servidor es la única autoridad sobre `unitPrice`, `subtotal`, `tax`, `discount`, `total` y `canCheckout`. `DELETE /api/cart` actualiza el estado local sin invocar `GET /api/cart` para no recrear un carrito vacío. |
| **Pedidos reales** | `GET /api/orders/my`, `GET /api/orders/my/{id}`, `GET /api/orders/my/{id}/timeline` | `parseOrderPage`, `parseOrder`, `parseOrderTimeline` (`src/app/core/api/order.validation.ts`) | Distingue `id` numérico de ruta, `orderNumber` visible y tres estados independientes (`OrderStatus`, `PaymentStatus`, `ShippingStatus`). Defensa en profundidad (`assertOwned`): rechaza cualquier pedido cuyo `userId` no coincida con `auth.user().id` y bloquea folios `DEMO-*` antes de emitir peticiones HTTP. |
| **Checkout real seguro** | `POST /api/checkout/price-preview`, `POST /api/checkout` | `parsePricePreview` (`src/app/core/api/checkout.validation.ts`) y `parseOrder` | Separa cotización (`price-preview`) de confirmación (`POST /api/checkout`). El token `REAL_CHECKOUT_WRITE_ENABLED` permanece en `false` por defecto para bloquear la creación accidental de pedidos sobre producción o entornos compartidos; el contrato de escritura está tipado y probado con `HttpTestingController`. |
| **Perfil real** | `GET /api/users/profile` | `parseUserProfile` (`src/app/core/api/profile.validation.ts`) | Muestra `firstName`, `lastName`, `email`, `phone`, estado `enabled`, resumen de métodos 2FA, aviso de sesión volátil TT-05 y cierre de sesión real. En `/profile/edit` informa explícitamente que `UserController` aún no expone `PUT /api/users/profile` de autoservicio. |

### 2. Resultados de verificación del incremento

| Comando ejecutado | Resultado | Evidencia local |
|---|---|---|
| `npm run lint` | **PASS** (0 errores, 0 warnings) | `reports/final-lint.log` |
| `npm run test:coverage` | **PASS** — **59 archivos / 468 pruebas aprobadas** (Stmts **94.04%**, Branch **92.84%**, Funcs **91.20%**, Lines **97.75%**) | `reports/final-coverage.log`, `reports/unit-tests.xml`, `coverage/app/coverage-summary.json` |
| `npm run test:integration` | **PASS** — **10 archivos / 99 pruebas de integración aprobadas** | `reports/final-integration.log`, `reports/integration-tests.xml` |
| `npm run test:regression` | **PASS** — **27 archivos / 130 pruebas de regresión aprobadas** | `reports/final-regression.log`, `reports/regression-tests.xml` |
| `npm run build` (producción, demo y development) | **PASS** | `reports/final-build-prod.log`, `reports/final-build-demo.log`, `reports/final-build-dev.log` |
| `npx cap sync android` + `gradlew.bat assembleDebug` | **PASS** (`BUILD SUCCESSFUL`) | `reports/final-cap-sync.log`, `reports/final-gradle-debug.log` |
| `adb devices -l` / Maestro Android | **BLOQUEADO** localmente (sin dispositivo ni emulador conectado) | `reports/final-adb.log` |
