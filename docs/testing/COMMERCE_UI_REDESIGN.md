# Experiencia comercial móvil — revisión local

> Documento histórico de octubre. Las referencias de ramas históricas se omiten para publicación; los originales permanecen en el respaldo manual. El estado y las validaciones de Etapa 1B están en [el informe actual](../etapa1b/README.md).


Fecha: 29/octubre/2026, America/Mexico_City. Rama `feature/actividad-4-integracion-movil`; base `efe9767082040971278e66595aad8c0bf82c4b81`. No se crean commits ni acciones remotas.

## Veredicto y alcance

Rediseño implementado y recorrido público validado contra el backend local desde el APK actualizado; **no equivale a aprobación de producción**. La evidencia definitiva, hashes, inventario y resultados están en `COMMERCE_SOURCE_MANIFEST.json`. Las pantallas privadas se validan con HttpTestingController y fixtures explícitas; no se usaron cuentas personales, administradores o clientes. Creación comercial de pedidos y pagos sigue bloqueada.

El árbol inicial pasó de nuevo sus 507 pruebas. Se respaldaron los 176 archivos con cambios previos en `reports/commerce-redesign/before.zip` y su inventario SHA-256 en `before.json`. Las cifras históricas de la entrega anterior no se usan como resultado del incremento actual.

## A–C. Problemas y sistema visual

Se encontraron encabezados sin jerarquía comercial, enlaces de invitado dispersos, filtros nativos básicos, duplicación de estilos, fotos que dominaban la tarjeta, información técnica sin agrupación y formularios sin control de contraseña visible. El layout anterior de autenticación dependía de una cabecera alta y una tarjeta con desplazamiento negativo.

Se conserva burdeos `#722F37`, dorado `#C5A059`, marfil `#FCFAF7`, superficies blancas y la tipografía existente. Se consolidan superficies, espaciado de sección, alturas táctiles, buscador, botones, encabezados, cuadrículas y estados en `shared/ui/styles/_commerce.scss` y `_auth-shell.scss`, apoyados en los tokens existentes. No se añaden bibliotecas, iconos emoji, imágenes generadas ni un framework nuevo.

Componentes compartidos:

| Pieza | Responsabilidad |
|---|---|
| `CmcIconComponent` | Ionicons SVG existentes, nombres tipados, iconos decorativos dentro de controles etiquetados |
| `CmcMoneyPipe` | `Intl.NumberFormat('es-MX', {currency:'MXN'})` |
| `CmcQuantityComponent` | Límite mínimo/máximo, botones de 48 px, anuncio de cantidad y estados deshabilitados |
| `CmcInputComponent` | Mostrar/ocultar contraseña sin alterar su valor o emitir otro cambio; foco, estado accesible, required e inputmode |
| `PublicProductGridComponent` | Imagen proporcionada, nombre completo, precio, descuento real, stock y detalle |

No se encontró logo ni fotografía comercial de portada verificables en los assets locales o en el árbol backend consultado. Se usa una portada tipográfica de marca y fotografías de productos devueltas por la API en las tarjetas. No se presenta una fotografía genérica de prueba como banner.

## D. Inicio

- Marca completa, favoritos accesible, buscador con iconos y hero con una acción principal.
- Acceso invitado compacto; las opciones de login/registro no se muestran como si fueran datos de una cuenta.
- Categorías de la API con ID real, nombre completo, cantidad de instrumentos y fotografía segura cuando exista; alternativa vectorial cuando no existe imagen.
- Categorías en una fila desplazable en teléfono, con cuadrícula en pantalla amplia. El desplazamiento está limitado al contenedor, no al documento.
- Destacados disponibles antes de novedades; se conservan los órdenes recibidos dentro de cada selección y sólo se presentan hasta cuatro productos con stock confirmado por sección.
- Esta selección se realiza **dentro de seis destacados recibidos y ocho novedades**. No es un ordenamiento global de inventario ni modifica el paginado del catálogo. Sin productos disponibles se presenta un estado vacío honesto.

La API local devolvió novedades llamadas `Prueba_` y `sdf`, ambas con stock 0. Su procedencia es el backend, no fixtures inyectadas por el móvil. Se requiere clasificación editorial/datos de prueba en el backend antes de una presentación comercial definitiva. No se borraron ni modificaron registros ni se ocultan arbitrariamente nombres por heurísticas.

## E. Catálogo

El backend también acepta `brandId`, pero el listado localizado de marcas es `/api/admin/brands` y exige permisos administrativos. El permiso genérico GET `/api/brands/**` en SecurityConfig no acredita que exista un controlador público correspondiente. Por ello se deja pendiente un selector de marca completo; no se reutiliza administración ni se deriva una lista global desde una página de productos.

Buscador con limpiar, debounce de URL y cancelación RxJS conservados. Filtros y orden se presentan en un Ionic Modal inferior: borrador separado de selección aplicada, aplicar, limpiar, cerrar y restaurar al reabrir. Sólo se ofrecen categoría y los órdenes admitidos (`featured`, `price_asc`, `price_desc`, `name_asc`). La búsqueda conserva la relevancia del servidor; no se promete ordenar por precio una búsqueda cuyo contrato no lo permite.

Chips de filtros activos y paginado HTTP conservan categoría/orden. La cuadrícula usa una columna cuando dos no caben de forma legible, dos en teléfonos con espacio suficiente y tres/cuatro en pantallas amplias. No descarga el catálogo completo ni reordena páginas localmente.

## F–H. Detalle, cantidad, carrito, favoritos y opiniones

Galería con imagen principal, miniaturas reales, indicador activo y placeholder. El producto real 313 sólo devolvió una imagen: el cambio entre varias fotografías se verificó con respuestas controladas, no en ese recorrido real. Se agrupan categoría/marca, título, calificación real, precio MXN, disponibilidad, SKU, cantidad y acciones. Descripción expandible y especificaciones usan únicamente campos del DTO; no se inventan unidades de peso, atributos o reseñas.

`PurchaseIntentService` conserva únicamente producto/cantidad durante diez minutos, en memoria y con un solo consumo. Al volver del login se recupera la selección, **sin escritura automática**. Se descarta al cerrar sesión. No guarda credenciales, precios o JWT ni compite con TT-05.

Antes de agregar al carrito se vuelve a leer el producto. Si cambió el precio o falta stock, se actualiza la información y se exige revisar antes de continuar. Si sigue válido se envía sólo `{productId, quantity}` a `/api/cart/items`; importes y badge provienen del servidor. Solicitudes repetidas, cambio rápido de ruta y fin de sesión quedan protegidos/cancelados.

Favoritos consulta su estado real, agrega por productId y elimina por wishlistId. No cambia el corazón a guardado antes de una respuesta satisfactoria. Si la consulta inicial falla y al recuperarla el producto ya estaba guardado, se informa su estado y no se elimina accidentalmente.

| Contrato existente | Uso móvil | Nivel de prueba |
|---|---|---|
| `GET /api/public/categories/active` | Categorías e imágenes seguras | GET local y HTTP controlado |
| `GET /api/public/products/catalog` | Búsqueda, categoría, orden y página | GET local previo/Android y HTTP controlado; el recorrido definitivo queda registrado en el manifiesto |
| `GET /api/public/products/latest` | Ocho novedades del servidor | GET público; selección disponible documentada |
| `GET /api/public/products/featured?page=0&size=6` | Selección de destacados | GET público; sin orden global ficticio |
| `GET /api/public/products/{id}` | Detalle y revalidación antes del carrito | DTO validado; lecturas públicas y mocks |
| `GET/POST /api/wishlist`, `DELETE /api/wishlist/{wishlistId}` | Consulta y toggle autenticado | HTTP controlado; no mutaciones reales |
| `POST /api/cart/items` | Cantidad seleccionada | HTTP controlado; no escritura real |
| `GET /api/reviews/product/{id}?page=0&size=10&sortBy=RECENT` | Opiniones públicas bajo demanda | Endpoint/controlador y DTO inspeccionados; local respondió 200/0 opiniones para 313 |
| `GET /api/reviews/product/{id}/eligibility` | Comprobación autenticada de compra previa/no duplicado | HTTP controlado |
| `POST /api/reviews` | `{productId,rating,title,comment}` | HTTP controlado; no publicación real |

Se validan `ReviewListResponse` y `ReviewResponse`, sin conservar IDs internos de usuarios. Se muestra nombre público, fecha, calificación, comentario y compra verificada cuando lo indique el servidor. Texto interpolado, no HTML ejecutable. Las opiniones se cargan bajo demanda para evitar peticiones innecesarias. Crear exige sesión y elegibilidad coherente; sólo el backend decide autorización y moderación. Un envío satisfactorio informa recepción, sin inventar que la opinión ya está publicada.

Fuente backend consultada en lectura: rama `[referencia de rama histórica omitida]`, HEAD `44df7468f65180e1aebda161eabe66d94355d95d`, con cambios de otro proceso. No se afirma identidad entre ese árbol y el binario ejecutado.

## I–J. Autenticación y pantallas privadas

Login/registro comparten una tarjeta sin márgenes negativos ni altura de viewport forzada. Contraseñas tienen un ojo accesible; confirmación/reset reutilizan el mismo componente. Los errores siguen dependiendo de interacción o intento de envío. El segundo factor mantiene EMAIL/TOTP/BACKUP_CODE; se presenta teclado numérico para OTP y textual para respaldos. No cambia la emisión de JWT ni se persisten claves.

Verificación permanece tras registro y como ayuda secundaria desplegable en login. Ante 403 se ofrece de forma condicional, sin asegurar que toda cuenta prohibida esté sin verificar. Recuperación conserva la respuesta no enumerable y no normaliza contraseñas.

Carrito, pedidos, detalle de pedido, perfil, favoritos, checkout y seguridad adoptan superficies/anchos/espaciado compartidos. Se elimina padding inferior duplicado de perfil/checkout; una sola capa reserva el espacio de navegación. Se conservan importes, estados, timeline, validaciones, logout y contratos existentes. Perfil conserva accesos permanentes a pedidos, favoritos y seguridad, independientes de la futura persistencia de sesión. Se sustituyen mensajes técnicos de almacenamiento por una explicación comprensible del reinicio de sesión. No se simula edición de perfil: falta un contrato de autoservicio confirmado. Las operaciones comerciales productivas siguen bloqueadas.

Estas pantallas privadas tienen renderizado y flujos con datos controlados en pruebas. Sin una cuenta sintética autorizada y BD aislada **no se acreditan recorridos Android privados ni aislamiento real entre usuarios**.

## K–N. Pruebas, Android, accesibilidad y seguridad

Resultados del árbol final: **575 pruebas en 64 archivos**, **165 de integración HTTP controlada** y **142 de regresión**. Cobertura: **95.79% instrucciones, 93.79% ramas, 93.99% funciones y 97.87% líneas**. La base comprobada al inicio fue 507 pruebas; sus coberturas fueron 94.50/92.97/91.72/97.83%, respectivamente. Las cuatro métricas aumentan.

Lint, build Angular development/production, Capacitor sync, Gradle Debug e instalación del APK terminaron correctamente. Producción conserva nueve avisos de presupuesto CSS; uno corresponde al nuevo Home (41 bytes sobre 2 KB). No se redujeron presupuestos. Se verificó el manifiesto Release; no se ejecutó un APK Release.

Logs, comandos e inventario: manifiesto final y `reports/commerce-redesign/`. Se usan los scripts reales de package.json con un solo worker, sin quitar casos, rebajar umbrales o añadir skips. Las suites de integración/regresión se solapan con la completa y no se suman como casos únicos.

Se agregan casos de visibilidad de contraseña/foco, required, cantidad/límites, intención temporal/expiración/logout, stock/precio cambiado, no duplicación, cambios rápidos de ruta, favoritos existentes/errores, borradores de filtros, galería, reactividad y reseñas: JSON inválido, texto no ejecutable, paginado, error/reintento, elegibilidad/autorización, moderación y limpieza de borradores.

Comandos reproducibles (PowerShell, JDK 21/SDK Android configurados):

```powershell
npm run lint
npm test -- --watch=false --runner-config=reports/mobile-stabilization/vitest.serial.config.mjs
npm run test:integration -- --runner-config=reports/mobile-stabilization/vitest.serial.config.mjs
npm run test:regression -- --runner-config=reports/mobile-stabilization/vitest.serial.config.mjs
npm run test:coverage -- --runner-config=reports/mobile-stabilization/vitest.serial.config.mjs
npm run build -- --configuration=production
npm run build -- --configuration=development
npx cap sync android
# Desde android/:
.\gradlew.bat assembleDebug processReleaseMainManifest
# Desde la raíz:
git diff --check
```

La configuración serial contiene `export default {test:{maxWorkers:1,fileParallelism:false}};`. Los logs conservan los argumentos efectivamente ejecutados. Se sincronizó development al final para que el APK de prueba use el backend local; la compilación production se verificó por separado.

Las capturas finales se conservan sólo si corresponden al APK definitivo y se enlazan por hash en el manifiesto. `reports/commerce-redesign/*preview*` identifica revisiones intermedias, no evidencia final. No se reutilizan las imágenes de `docs/testing/android/` de la entrega anterior como si fueran el rediseño actual.

El backend dejó de escuchar en 8080 durante la primera navegación: la WebView registró primero 200 en Home y después fallos de conexión, y Windows confirmó ausencia del listener/ECONNREFUSED. Se informó al usuario, quien indicó que lo volvería a dejar disponible. No se reinició Spring ni se ejecutaron migraciones/SQL. Tras restablecerse el proceso, Windows obtuvo 200 en salud, categorías, destacados, novedades, detalle y opiniones públicas. El recorrido final Android completó Inicio → categoría → filtros/orden → búsqueda → detalle → opiniones → cantidad → login y formularios públicos, además de guards de invitado. Se provocó desconexión sólo en la WebView de prueba y se comprobó estado recuperable/reintento contra la API. No se cambió el backend.

El APK definitivo tiene SHA-256 `8634e4082f0434e2f904259df15e38bad4fb9c910046811b6cfee3402c0a8008`; el APK extraído del emulador coincide. Sus 293 assets web coinciden byte a byte con la compilación sincronizada. Dispositivo: `emulator-5554`, Pixel 8 API 36, versión 1.0/código 1. Origen WebView `https://localhost`; API de desarrollo `http://10.0.2.2:8080`; consultas Windows `http://127.0.0.1:8080`. Sin cambio automático de entorno.

Matriz nativa: Login en 320×568, 360×800, 393×852, 412×915, tableta 800×1280 y horizontal 914×411; Inicio/Catálogo/Detalle en pequeño y tableta; Catálogo horizontal; texto Android ampliado a 1.3. Sin overflow horizontal del documento en las observaciones finales. En 320 px se corrigió el padding de navegación para conservar etiquetas completas. Los formularios largos mantienen scroll vertical necesario. Se restauraron densidad/tamaño/orientación y escala de texto. Un lote inicial perdió la conexión de depuración tras cuatro teléfonos; se conserva el fallo y se completan tableta/horizontal/texto con conexiones nuevas, sin presentarlo como una ejecución ininterrumpida.

Se conservan 31 capturas del APK final en [commerce-ui](commerce-ui/), entre ellas [Inicio](commerce-ui/inicio.png), [Detalle](commerce-ui/detalle.png) y [Login pequeño](commerce-ui/login-320x568.png). Pruebas mediante ADB y WebView Debug; no se afirma ejecución de Maestro. No hay certificación de teclado completo, TalkBack ni teléfono físico.

Controles de accesibilidad comprobados: foco visible, etiquetas de iconos interactivos, botones de al menos 48 px, campos de 16 px, anuncios de error/estado, zoom del usuario preservado, imágenes sin deformación y contenido adaptable. Contrastes calculados: blanco/burdeos 9.65:1, texto principal/marfil 14.56:1, secundario/marfil 5.51:1, disponibilidad/blanco 5.48:1. El dorado queda como acento decorativo; no se certifica WCAG AA completa sin TalkBack y pruebas restantes.

Se mantienen interceptor acotado al backend, guards, 401/403, expiración JWT, separación local/producción y validación de respuestas. Sin secretos nuevos, HTML dinámico inseguro, bypass TLS, fallback DEMO, almacenamiento de JWT en localStorage o cambios al almacén TT-05. HTTP local sigue limitado a Android Debug para 10.0.2.2; producción utiliza HTTPS. `https://localhost` es el origen de recursos de Capacitor, no el backend.

Riesgos residuales: sesión volátil y persistencia segura TT-05 pendiente; política de copias/capturas sensibles por revisar antes de persistir factores; enlace de verificación web del backend; datos editoriales de prueba; pruebas reales autenticadas, TalkBack, teclado completo y teléfono físico; horizontal sí se comprobó en el emulador. Compilar no acredita calidad visual ni ausencia total de vulnerabilidades.

## O–Q. Archivos, Git, trazabilidad y contratos pendientes

El manifiesto enumera modificaciones de este incremento, archivos heredados intactos, nuevos archivos, status Git, SHA base y hash agregado de fuentes. Incluye hash del APK compilado/instalado y logs. No se hace commit, push, PR, merge, deploy ni cambio remoto. No se alteran main/develop, TT-05 o PR de Tackalay; las superposiciones funcionales requieren revisión antes de integrar.

Estado final: 65 archivos tracked modificados y 172 untracked, ninguno staged ni eliminado. De los 176 archivos heredados, 153 conservan exactamente su hash y 23 reciben cambios incrementales; ninguno falta. Las 337 fuentes congeladas para pruebas y build conservan sus hashes al generar el manifiesto. `git diff --check` termina con código 0. El estado incluye trabajo anterior; no se atribuyen sus 237 archivos completos exclusivamente a este incremento.

Denominaciones verificadas mediante consulta actual de Issues; todos continúan abiertos. Snapshot: `COMMERCE_ISSUES_SNAPSHOT.json`. No se inventan Status/Iteración XP del Project ni se marca Done.

| Issue real | Mejora relacionada | Aceptación pendiente |
|---|---|---|
| [HU-01 · Iniciar sesión](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/1) | Contraseña visible/oculta, validación y retorno | Login/MFA reales, TT-05 |
| [HU-02 · Registrarse](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/2) | Formulario y confirmación conservados | Registro/correo reales autorizados |
| [HU-03 · Recuperar contraseña](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/3) | Solicitud/reset y estados de carga | Buzón/tokens reales |
| [HU-04 · Inicio](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/4) | Portada, categorías, selección disponible | Revisión editorial y visual final |
| [HU-05 · Catálogo](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/5) | Cuadrícula y paginado | Matriz visual completa |
| [HU-06 · Buscar productos](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/6) | Buscar/limpiar, filtros y relevancia | Revisión funcional con el equipo |
| [HU-07 · Detalle de producto](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/7) | Galería, cantidad, especificaciones, opiniones | Acciones privadas con cuenta de prueba |
| [HU-08 · Favoritos](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/8) | Consulta/toggle y errores | Persistencia/propiedad reales |
| [HU-09 · Agregar al carrito](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/9) | Cantidad, revalidación, intención de invitado | POST real aislado |
| [HU-10 · Administrar carrito](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/10) | Superficies, cantidades/importes conservados | Mutaciones reales e inventario |
| [HU-11 · Checkout](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/11) | Resumen visual y bloqueos conservados | Entorno comercial aislado y autorización |
| [HU-12 · Mis pedidos](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/12) | Tarjetas de historial y estados | Propiedad real con cuentas de prueba |
| [HU-13 · Detalle de pedido](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/13) | Resumen/timeline e importes conservados | IDs propios/ajenos en entorno aislado |
| [HU-14 · Perfil](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/14) | Datos, seguridad y superficies | Contrato de edición y pruebas reales |

Dependencias técnicas compartidas: TT-03 API, TT-04 navegación, TT-05 sesión, TT-06 errores. No se crea una HU adicional para reseñas: se presenta como ampliación de detalle sujeta a revisión del backlog. Antes de integrar se requiere revisión conjunta con Tackalay sobre HU-02/03/04/05/07/12/13/14, que están asignadas a él en el snapshot.

Contratos/mejoras backend pendientes: filtro paginado de disponibilidad para selección comercial global, clasificación de contenido editorial/de prueba, edición de perfil de autoservicio con lista de campos permitidos y enlaces móviles de verificación. Los endpoints de reseñas ya existen; su publicación real sigue pendiente de una cuenta compradora sintética y autorización. No se fabrican endpoints ni se consume administración para suplirlos.

Arquitectura conservada: Angular por funcionalidades, páginas/presentación, estado de aplicación, modelos/contratos Repository y adaptadores HTTP. Se amplía Repository para reseñas y Observer para cancelación/fin de sesión; servicios root siguen Singleton por DI. Factory existente del recorrido DEMO no se usa para producir pedidos reales. No se afirma Clean Architecture o MVVM completos.

## R. Revisión siguiente

Revisar capturas y diff locales; el recorrido público y horizontal ya se comprobaron. Completar teclado/TalkBack/dispositivo físico y preparar cuenta sintética, buzón y BD aislada para autenticación, MFA, favoritos, carrito, perfil y pedidos propios. No se ejecutaron envíos autenticados, registros, pedidos ni pagos reales. Mantener las HU abiertas hasta cumplir aceptación funcional, seguridad y revisión. CI remoto sólo podrá acreditar un SHA futuro después de la autorización correspondiente; los checks locales no se presentan como checks de GitHub.
