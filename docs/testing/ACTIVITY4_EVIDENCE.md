# ACTIVIDAD 4 — IMPLEMENTACIÓN Y EVIDENCIAS

> Documento histórico de octubre. Las referencias de ramas históricas se omiten para publicación; los originales permanecen en el respaldo manual. El estado y las validaciones de Etapa 1B están en [el informe actual](../etapa1b/README.md).


Fecha: 27/octubre/2026 (America/Mexico_City). Entrega: 29/octubre/2026.

## Identidad de la versión probada

- Rama local: `[referencia de rama histórica omitida]`.
- HEAD/base: `efe9767082040971278e66595aad8c0bf82c4b81` (PR #82 de develop).
- No hay commit de esta implementación: las pruebas corresponden al **árbol de trabajo sin commit**, no al HEAD limpio ni a una ejecución nueva de GitHub Actions.
- `ACTIVITY4_SOURCE_MANIFEST.json` registra SHA-256 de fuentes, tests, configuración y archivos Android versionables del estado probado. Excluye este informe, el propio manifiesto y artefactos generados/ignorados. Para reproducir: usar la base más estos archivos, verificar sus hashes e instalar con el lock existente.
- `main`, `develop` y `feature/TT-05-secure-session` conservan sus referencias iniciales. Sin commit, push, PR, merge, deploy o cambios de Project/Issues/PR existentes.

## Arquitectura real antes/después

Antes: componentes standalone por funcionalidades, estado DEMO compartido y datos de catálogo dentro de features. Checkout construía un objeto que no llegaba al historial; consultas de pedidos dependían directamente del estado de cuenta.

Después: se conserva la arquitectura Angular por funcionalidades con separación explícita y limitada:

| Responsabilidad | Clases / rutas |
|---|---|
| Presentación | `features/catalog/product-detail/ProductDetailPage`, `CartPage`, `CheckoutSummaryPage`, `ConfirmationPage`, `OrdersPage` y plantillas existentes |
| Aplicación | `core/services/DemoCatalogService`, `DemoCheckoutStateService`, `OrdersService`, `OrderDetailService` |
| Modelos | `core/models/catalog.model.ts`, `checkout.model.ts`, `account.model.ts` |
| Creación de pedidos | `core/factories/demo-order.factory.ts` — `DemoOrderFactory` |
| Contrato de almacenamiento | `core/repositories/demo-order.repository.ts` — `DemoOrderRepository` y `DEMO_ORDER_REPOSITORY` |
| Infraestructura DEMO | `core/infrastructure/in-memory-demo-order.repository.ts`, `demo-orders.data.ts`, `demo-catalog.data.ts` |

`features/catalog/catalog-demo.data.ts` conserva reexports para compatibilidad con consumidores previos. `DemoAccountStateService` mantiene la fachada de lectura del historial y el estado del perfil, pero el repositorio posee los pedidos. Las rutas Angular permanecen iguales.

No se declara Clean Architecture ni MVVM. El catálogo usa un servicio de consulta sobre fixtures; no se crea un repositorio adicional sin necesidad. La configuración DI selecciona explícitamente la implementación de memoria.

## Patrones demostrados

- **Repository:** `DemoOrderRepository` ofrece `list`, `findById`, `add` y lectura reactiva de pedidos. `InMemoryDemoOrderRepository` es la implementación concreta; se inyecta por token en checkout y consultas. Aísla referencias anidadas, rechaza IDs incompatibles y evita insertar el mismo ID dos veces. Se puede sustituir el provider sin cambiar las páginas. No implementa persistencia ni autorización.
- **Simple Factory:** `DemoOrderFactory.create` valida carrito, cantidades, precios y métodos; calcula totales, genera ID compatible con detalle y crea copias independientes. `toHistory` construye la representación de historial con estado `pending`, sin afirmar que hubo un pago. Es una Factory simple e inyectable; no se presenta como Abstract Factory/Factory Method GoF.
- **Singleton mediante DI:** servicios y repositorio usan `providedIn: 'root'`; el test verifica que token y clase resuelven la misma instancia por inyector raíz.
- **Observer/reactividad:** se reutilizan Observables de rutas y signals/computed del carrito. La UI y el badge reaccionan a las cantidades. No se agrega un bus de eventos artificial.

## Recorrido funcional

1. Abrir `/main/catalog`, filtrar y seleccionar `Ver información`.
2. `/products/:id` consulta el catálogo DEMO y ofrece `Agregar al carrito DEMO`, mensaje accesible y `Ver carrito`.
3. Agregar repetidamente acumula unidades. IDs `catalog-N` separan los productos seleccionados de las muestras históricas `p1/p3`, cuyos precios y tests se conservan.
4. `/main/cart` permite modificar cantidades, eliminar y revisar importes. El badge y resumen cuentan unidades. Un delta no entero no altera cantidades.
5. `/checkout` requiere carrito no vacío, entrega y pago. Envío gratuito se muestra como cero cuando ya está seleccionado, en lugar de “Por calcular”.
6. `/checkout/confirmation` usa aplicación → Factory → Repository. Una confirmación repetida sin cambios conserva el mismo ID y no duplica el historial. Una creación fallida muestra error genérico visible sin detalles internos. La confirmación se revalida al reentrar en una pantalla cacheada, sin repetir el pedido cuando no cambió el checkout.
7. Al salir a Inicio/Pedidos se limpia el carrito. El repositorio conserva el nuevo pedido durante la sesión. `/main/orders` recarga al volver a entrar en la pestaña cacheada de Ionic; una respuesta antigua no sobrescribe una consulta nueva.
8. `/orders/:id` lee del mismo repositorio y muestra partidas/importes del pedido creado.

Confirmación dice `Total DEMO`; el botón dice `Confirmar pedido DEMO`. Métodos de pago y entrega explican que son ilustrativos: no prometen transferencias, pasarelas ni entregas reales. Se actualizó solo el selector correspondiente de `.maestro/purchase-demo.yaml` para conservar el flujo existente.

## Verificación visual y límites

- Revisión real en navegador local de producto → carrito → entrega → pago → confirmación → historial. Caso: producto 1, dos unidades, subtotal 4,980 MXN + 150 MXN de envío = **5,130 MXN**. ID observado: `DEMO-44D41B9DF96C48E79AB24592`; apareció en historial y el carrito quedó vacío.
- Revisión del estado final en viewport **320×568 CSS px**, con aplicación real dentro de iframe del mismo origen. Catálogo pasa a una columna hasta 360 px. Se comprobó scroll, enlace a producto 5, botón de agregar, carrito y botón `Continuar compra` completamente por encima de la barra flotante al final del scroll.
- Búsqueda `sin-resultados-actividad4`: estado vacío visible y botón `Limpiar filtros`. Consulta de errores de consola del contenedor: lista vacía.
- El contenedor temporal se eliminó de `src/assets` antes del build final; queda una copia auxiliar en `reports/activity4-mobile-preview.html`. Los servidores de revisión se detuvieron.
- No es emulación de teclado/Chrome Android ni auditoría TalkBack. No había dispositivo/emulador conectado. Maestro no se reejecutó en esta implementación; no se atribuyen sus resultados históricos al árbol actual.

## Pruebas y resultados locales finales

| Comando real | Resultado / evidencia local |
|---|---|
| `npm run lint` | PASS, exit 0; `reports/activity4-lint.log` |
| `npm test -- --watch=false` | PASS, 37 archivos / **251 pruebas**; `reports/activity4-tests.log` |
| `npm run test:coverage` | PASS, 37 archivos / **251 pruebas**; `reports/activity4-coverage.log`, `reports/unit-tests.xml`, `coverage/app/` |
| `npm run test:integration` | PASS, 3 archivos / **59 pruebas**; `reports/activity4-integration.log`, `reports/integration-tests.xml` |
| `npm run build` | PASS, exit 0; `reports/activity4-build.log`; ocho warnings SCSS, budgets conservados |
| `npx cap sync android` | PASS; `reports/activity4-capacitor-sync.log` |
| `.\gradlew.bat assembleDebug --console=plain` desde `android/` | PASS, BUILD SUCCESSFUL; `reports/activity4-android-build.log` |

Las 33 suites originales / 224 casos se conservan sin modificar sus archivos. Se agregan 27 casos en cuatro archivos:

- `core/factories/demo-order.factory.spec.ts`: 10 casos; validación, importes, ID, copia y adaptación a historial.
- `core/infrastructure/in-memory-demo-order.repository.spec.ts`: 3; DI, aislamiento, duplicados e IDs inválidos.
- `core/services/demo-purchase.spec.ts`: 9; selección/acumulación, importes, confirmación repetida, limpieza e IDs de catálogo inválidos.
- `features/demo-purchase.integration.spec.ts`: 5; recorrido por rutas/componentes reales, pestaña cacheada/respuestas fuera de orden, carrito vacío, error de creación y reentrada a confirmación cacheada.

Los 59 casos de integración están incluidos en los 251; no se suman como pruebas distintas. Se mantiene la validación HTTP simulada de TT-03; no hubo tráfico comercial remoto.

Cobertura global final V8:

| Métrica | Porcentaje | Cubiertos / total |
|---|---:|---:|
| Statements | 96.31% | 757 / 786 |
| Branches | 94.68% | 481 / 508 |
| Functions | 95.00% | 247 / 260 |
| Lines | 96.03% | 508 / 529 |

Se conservaron umbrales y exclusiones existentes. La cobertura no demuestra HU comerciales terminadas.

Incidencias de validación: Vitest en sandbox falló antes de ejecutar casos por EPERM al renombrar caché temporal. Se ejecutaron los scripts fuera del sandbox. El primer recorrido nuevo excedió 5 s; se delimitó su timeout a 15 s por atravesar ocho rutas reales. Luego se corrigió la espera de la prueba hasta finalizar la carga Ionic, sin eliminar aserciones ni modificar pruebas anteriores. Las ejecuciones finales de la tabla son las aprobadas; los intentos iniciales no se presentan como PASS.

## Limitaciones y pendientes

- Datos únicamente en memoria; recargar/reiniciar la app reinicia la demostración. El carrito sigue precargado para compatibilidad; puede vaciarse desde la UI antes de seleccionar productos.
- Sin integración comercial Spring Boot, sesión segura TT-05, autenticación real, guards, pagos, stock real ni pedidos de producción.
- Favoritos, cupón y opciones de perfil mantienen el alcance previo. Esta actividad no los presenta como implementados.
- No se alteran #71, #77, #80 ni los campos del GitHub Project.
- Pendientes: revisión humana, aceptación académica de Ionic/Angular/Capacitor, prueba runtime Android/Maestro y accesibilidad/dispositivos adicionales. Los ocho avisos SCSS siguen abiertos; no se aumentaron budgets.
- Sin CI remota del árbol actual porque no hay push/PR. Evidencia actual = logs locales + base Git + manifiesto de fuentes.

## Archivos del cambio

- `.maestro/purchase-demo.yaml`
- `docs/testing/ACTIVITY4_EVIDENCE.md`
- `docs/testing/ACTIVITY4_SOURCE_MANIFEST.json`
- `src/app/core/factories/demo-order.factory.spec.ts`
- `src/app/core/factories/demo-order.factory.ts`
- `src/app/core/infrastructure/demo-catalog.data.ts`
- `src/app/core/infrastructure/demo-orders.data.ts`
- `src/app/core/infrastructure/in-memory-demo-order.repository.spec.ts`
- `src/app/core/infrastructure/in-memory-demo-order.repository.ts`
- `src/app/core/models/catalog.model.ts`
- `src/app/core/repositories/demo-order.repository.ts`
- `src/app/core/services/demo-account-state.service.ts`
- `src/app/core/services/demo-catalog.service.ts`
- `src/app/core/services/demo-checkout-state.service.ts`
- `src/app/core/services/demo-purchase.spec.ts`
- `src/app/core/services/order-detail.service.ts`
- `src/app/core/services/orders.service.ts`
- `src/app/features/cart/cart.page.html`
- `src/app/features/catalog/catalog-demo.data.ts`
- `src/app/features/catalog/catalog.page.scss`
- `src/app/features/catalog/catalog.page.ts`
- `src/app/features/catalog/product-detail/product-detail.page.ts`
- `src/app/features/checkout/checkout-summary/checkout-summary.page.html`
- `src/app/features/checkout/checkout-summary/checkout-summary.page.ts`
- `src/app/features/checkout/confirmation/confirmation.page.html`
- `src/app/features/checkout/confirmation/confirmation.page.ts`
- `src/app/features/checkout/delivery-method/delivery-method.page.html`
- `src/app/features/checkout/payment-method/payment-method.page.html`
- `src/app/features/checkout/payment-method/payment-method.page.ts`
- `src/app/features/demo-purchase.integration.spec.ts`
- `src/app/features/home/home.page.ts`
- `src/app/features/orders/orders.page.html`
- `src/app/features/orders/orders.page.ts`

## Cierre de compilación y Git

- Compilación Android definitiva: **BUILD SUCCESSFUL**, exit 0 (27 tareas ejecutadas / 186 actualizadas; 213 totales).
- Advertencias Android: repositorios `flatDir`; el intento inicial también informó diferencia de versiones de metadatos SDK. No impidieron compilar. No se alteró configuración de Android para ocultarlas.
- APK local: `android/app/build/outputs/apk/debug/app-debug.apk`.
- Tamaño: 5867226 bytes.
- SHA-256 APK: `a66092a69cbe90a62c2a5c02eb62abd97cd69d7c0d1bcc818e71dd96e2ee9ad0`.
- SHA-256 manifiesto: `5d8801a3a294888398f12f15a6639a1abdffdf70aa4b22a5b4d4a5da52684bf9`.
- Manifiesto verificado: 217 archivos coinciden con sus hashes después de todas las validaciones.
- `git diff --check`: exit 0, sin errores de whitespace. Git advierte normalización LF/CRLF en dos archivos generados de Capacitor; no aparecen como cambios de contenido en el diff.
- Sin archivos staged; originales `*.spec.ts` sin cambios. Estado intencionalmente sucio para revisión, sin commits.
- Resumen estructurado local: `reports/activity4-validation-summary.json`. Los logs y artefactos locales de `reports/`, `coverage/`, `www/` y `android/app/build/` siguen ignorados por Git.

```text
## [referencia de rama histórica omitida]
 M .maestro/purchase-demo.yaml
 M src/app/core/services/demo-account-state.service.ts
 M src/app/core/services/demo-checkout-state.service.ts
 M src/app/core/services/order-detail.service.ts
 M src/app/core/services/orders.service.ts
 M src/app/features/cart/cart.page.html
 M src/app/features/catalog/catalog-demo.data.ts
 M src/app/features/catalog/catalog.page.scss
 M src/app/features/catalog/catalog.page.ts
 M src/app/features/catalog/product-detail/product-detail.page.ts
 M src/app/features/checkout/checkout-summary/checkout-summary.page.html
 M src/app/features/checkout/checkout-summary/checkout-summary.page.ts
 M src/app/features/checkout/confirmation/confirmation.page.html
 M src/app/features/checkout/confirmation/confirmation.page.ts
 M src/app/features/checkout/delivery-method/delivery-method.page.html
 M src/app/features/checkout/payment-method/payment-method.page.html
 M src/app/features/checkout/payment-method/payment-method.page.ts
 M src/app/features/home/home.page.ts
 M src/app/features/orders/orders.page.html
 M src/app/features/orders/orders.page.ts
?? docs/testing/ACTIVITY4_EVIDENCE.md
?? docs/testing/ACTIVITY4_SOURCE_MANIFEST.json
?? src/app/core/factories/demo-order.factory.spec.ts
?? src/app/core/factories/demo-order.factory.ts
?? src/app/core/infrastructure/demo-catalog.data.ts
?? src/app/core/infrastructure/demo-orders.data.ts
?? src/app/core/infrastructure/in-memory-demo-order.repository.spec.ts
?? src/app/core/infrastructure/in-memory-demo-order.repository.ts
?? src/app/core/models/catalog.model.ts
?? src/app/core/repositories/demo-order.repository.ts
?? src/app/core/services/demo-catalog.service.ts
?? src/app/core/services/demo-purchase.spec.ts
?? src/app/features/demo-purchase.integration.spec.ts
```
