# Auditoría UI/UX — Casa de Música Castillo Mobile

Fecha: 13 de octubre de 2026. Rama: `feature/catalog-integration`.

## 1. Diagnóstico general

Se mantuvo la aplicación existente y su identidad de minimalismo cálido premium. La prioridad fue corregir geometría, navegación, legibilidad y accesibilidad, conservando los datos demo y las rutas lazy.

Antes de editar se ejecutaron `git status`, `git branch --show-current`, `git diff`, `git diff --cached` y el inventario de archivos no rastreados. Existía una modificación de `app.routes.ts` para cargar CatalogPage y cuatro archivos nuevos de Catálogo. Se revisaron y conservaron su búsqueda, categorías, ordenamiento, estado vacío y 15 pruebas funcionales.

## 2. Problemas globales

Se encontraron mecanismos distintos de padding inferior, headers duplicados en SCSS, mínimos de altura incompatibles con el layout flex de Ionic, geometría incorrecta de la burbuja, controles pequeños y utilidades tipográficas utilizadas en HTML pero ausentes en los estilos globales.

Se inspeccionaron las rutas, todas las pantallas de features, layout, componentes compartidos, variables y estilos globales. También se consultó el código CSS instalado de Ionic para verificar sus safe areas y box sizing.

## 3. Causa del exceso de safe area superior

Home y Catálogo agregaban `--ion-safe-area-top` al padding interno del toolbar. Ionic ya aplica ese inset al primer toolbar desde ion-header. La suma duplicaba la reserva superior. Recuperación y Registro tenían compensaciones locales distintas.

Los headers dejan que Ionic gestione el inset. Las pantallas sin ion-header emplean `cmc-standalone-page` y un único token `--cmc-safe-area-top`, con fallback a `env`. No se suman ambos mecanismos.

## 4. Causa del scroll inferior insuficiente

La regla global `.cmc-page { min-height: 100%; }` afectaba directamente a ion-content. En Catálogo a 360 × 800, el header medía 112 px y el contenido seguía midiendo 800 px: su borde inferior quedaba en y=912. El último contenido quedaba fuera del viewport pese a reservar padding inferior.

Además, Ionic fuerza `content-box !important` dentro del host de ion-tab-bar. La altura declarada de 64 px más padding y borde producía una caja real de 73.6 px, mayor que la contemplada en el offset.

## 5. Solución común

Se cambió el mínimo de ion-content a cero para permitir que el layout flex use la altura restante. Las cinco raíces usan `cmc-root-page` y `--padding-bottom: var(--cmc-bubble-nav-offset)`, dentro del scroll real de Ionic.

El offset es: altura real de burbuja (64 px) + margen inferior (12 px) + separación respirable (16 px) + safe area inferior. Las pantallas contextuales reservan 24 px más el inset inferior, sin espacio de burbuja. No se usan parches de margen en el último elemento ni nuevos scrolls verticales anidados.

## 6. Bubble Navigation

Se conserva la cápsula premium y el comportamiento de tabs de Ionic. Posición fixed, ancho centrado con máximo de 448 px, inset inferior compartido, etiqueta accesible y foco visible. Los tabs tienen targets de al menos 48 px.

El host ya no añade padding/borde que alteren su altura: el borde visual se dibuja con sombra interna y los botones usan margen interior. Se midieron exactamente 64 px. Su bounding box queda limitado a la cápsula; no se añadió ningún overlay invisible.

## 7. Home

Header y buscador compartidos con Catálogo; grid de dos columnas con `minmax(0, 1fr)`; imágenes proporcionadas, nombres completos y precios alineados. Se conservan categorías, promoción, novedades y productos. Se eliminaron sombras y decoración locales innecesarias.

El buscador navega a Catálogo con el texto escrito, mediante Enter o la acción Buscar. Categorías y Ver más tienen navegación real. Favoritos son botones demo con `aria-pressed` y contador; no se añade persistencia.

## 8. Catálogo

Se conserva toda la lógica original. Se eliminan los 20 styles inline y los hexadecimales residuales de su presentación. Header, búsqueda, categorías y tarjetas comparten reglas con Home. Chips, ordenamiento y acciones tienen targets de 48 px; el botón de borrar búsqueda mide 44 px.

El detalle usa dialog nativo, role dialog, aria-modal y nombre accesible. La capa superior nativa aísla el fondo y gestiona el foco. Se puede cerrar con Escape, botón, acción inferior o clic fuera del rectángulo del diálogo. También se cierra al salir de la página cacheada de Ionic.

## 9. Auth y Splash

Inset único en pantallas sin header, botones de regreso de 48 px, enlaces accesibles por teclado, formularios con autofill email/name/tel/current-password/new-password. Los tipos de input mantienen los teclados móviles correspondientes.

Los heroes pueden crecer con el texto; las cards usan tokens y máximo de 480 px. Recuperación usa un botón nativo para regresar. Se conservan validaciones y mensajes. Splash usa mínimo flexible y padding de contenido.

## 10. Carrito

Targets de cantidad y eliminación de 44 px, labels que identifican el producto, anuncio de cantidad y layout estrecho a 360 px. Cupón alineado y adaptable; resumen y acción final usan la reserva común.

Se corrigió un estado vacío que pasaba actionLabel/action a un componente que no los implementaba. Ahora existe un cmc-button real para explorar el Catálogo. Se mantiene la lógica demo.

## 11. Checkout

Tarjetas de navegación convertidas a botones nativos. Entrega/pago usan radios nativos, selección accesible y navegación con flechas. Se unifica su SCSS idéntico. Se corrigió la especificidad que ocultaba el precio burdeos sobre selección burdeos; se verificó blanco sobre `rgb(114, 47, 55)`.

La navegación directa a Confirmación sin entrega, pago o productos producía un TypeError. Se vuelve a Checkout en ese caso, sin renderizar éxito ni un pedido inválido. El flujo completo conserva su confirmación demo. No se añadieron campos de tarjeta ni cobros.

## 12. Pedidos

Padding/scroll comunes, headers consistentes y filas que pueden envolver para conservar estado, identificador y totales. Se mantienen badges y timeline. Order Detail sigue fuera del layout con burbuja.

## 13. Perfil

Card con texto adaptable, opciones agrupadas y reserva inferior común. Las configuraciones que ya eran solamente visuales aparecen deshabilitadas con una explicación de disponibilidad; Editar perfil continúa funcionando. Edit Profile conserva validaciones/autofill y no muestra Bubble Navigation.

## 14. Componentes compartidos

cmc-button: tamaño compact con target real de 48 px, sin pseudoelemento que ampliaba artificialmente la caja táctil; padding vertical para texto largo. cmc-input: host con min-width cero para layouts flex estrechos.

cmc-badge, cmc-loading, cmc-empty-state y cmc-error-state se revisaron y conservaron, al contar ya con estados/semántica apropiados. Nuevos archivos SCSS compartidos: `_discovery.scss` y `_checkout-options.scss`. No hay componentes duplicados ni librerías nuevas.

## 15. Accesibilidad

Foco visible, acciones nativas, encabezados de nivel 1 en ion-title, jerarquía de Checkout, aria-pressed para favoritos/filtros, radios con estado checked, labels de cantidades, autofill y aislamiento del modal. Se mantiene reduced motion global y de loading. Los campos ya tenían aria-invalid, aria-describedby y errores anunciados.

No se añadieron any, innerHTML ni bypassSecurityTrust. La comprobación no constituye una certificación formal de accesibilidad ni una prueba completa con TalkBack.

## 16. Responsive y límites de validación

Se midieron las cinco raíces en navegador a 360, 375, 390, 412, 430 y 480 px, altura 800 px. En los 30 casos no hubo overflow horizontal y la burbuja midió 64 px. Al finalizar el scroll, Home/Catálogo/Carrito dejaron 16 px de separación; Orders/Profile tuvieron separación mayor por contenido más corto.

Se comprobaron los mismos seis anchos en Login, Register, Forgot Password, Checkout, Delivery, Payment, Confirmation, Order Detail, Edit Profile y Foundation Preview. Se verificaron búsqueda Home→Catálogo, Escape/restauración de foco del modal y flechas de radios. La entrada directa inválida a Confirmación se verificó como redirección.

La validación geométrica fue en navegador. No se ejecutó el emulador Pixel 8 API 36, teclado Android, TalkBack ni cámara/gestos nativos. Esos casos quedan para revisión del APK en el dispositivo habitual.

## 17. Inline y colores

Catálogo queda sin style inline ni colores hex locales. Blanco sobre burdeos usa text-on-primary. Overlay y superficie translúcida se centralizan en tokens documentados; etiquetas demo usan burdeos para mejorar contraste. El color oscuro de warning se mantiene como token semántico, sin sustituirlo por amarillo de bajo contraste.

Se sustituyó spacing repetido por tokens. Se mantienen medidas físicas de iconos/targets e intenciones semánticas; no se realiza una sustitución mecánica de todos los valores.

## 18. Inventario y alcance

La lista completa se encuentra al final de este documento. app.routes.ts conserva únicamente el cambio previo de integración de Catálogo. No se modificaron servicios/modelos demo, configuración de backend, dependencias, Android nativo ni budgets.

## 19. Pruebas agregadas/modificadas

Se preservaron todas las pruebas existentes y las 15 funcionales originales de Catálogo. Se añadieron 9: Home (favoritos y enlace sincronizado), Catálogo (cancelación nativa, clic interior/backdrop y salida de página), Delivery/Payment (selección mediante radio real), Cart (acción del estado vacío) y Confirmation (entrada directa incompleta).

src/test-setup.ts modela open/close de dialog solamente para jsdom. El aislamiento y la restitución real de foco se verificaron por separado en navegador.

## 20–23. Validación final

- Tests: **116 PASS** en 24 archivos; Catálogo **18 PASS**, incluyendo sus 15 originales.
- `git diff --check`: sin salida.
- `npm run lint`: PASS.
- `npm run build`: PASS.

En Windows se utilizó npm.cmd porque npm.ps1 está bloqueado por ExecutionPolicy. Angular se ejecutó con el acceso de lectura necesario fuera del sandbox después de que su compilador recibiera Access is denied. No se alteró la política de PowerShell.

## 24. Warnings restantes

El build mantiene el límite de advertencia de anyComponentStyle de 2 kB. No hay errores por límite máximo:

| Archivo | Tamaño compilado |
| --- | ---: |
| cmc-button.component.scss | 2.82 kB |
| forgot-password.page.scss | 2.86 kB |
| catalog.page.scss | 3.44 kB |
| cart.page.scss | 3.20 kB |
| checkout-summary.page.scss | 2.05 kB |
| confirmation.page.scss | 2.14 kB |
| delivery-method.page.scss | 3.30 kB |
| payment-method.page.scss | 3.30 kB |

Browserslist también declara versiones fuera del soporte de Angular 22: Chrome/Edge 107–118, Firefox 106–118 e iOS Safari/Safari 16.1–16.7. No se cambió esa configuración para ocultar el warning.

## 25–27. Confirmaciones de alcance

- angular.json no fue modificado; no se aumentaron budgets.
- No se conectó backend, HTTP, JWT, interceptores, Mercado Pago real, 2FA ni almacenamiento de credenciales. No se inició integración REST.
- No se cambió de rama ni se ejecutaron git add, commit, push, merge, reset, restore, clean o checkout. Todo queda sin staging para revisión manual; el trabajo previo se conserva.

## Archivos modificados o nuevos

El inventario que sigue incluye los archivos previos de Catálogo, los cambios UI/UX y este reporte.

- `docs/ui-ux-audit.md`
- `src/app/app.routes.ts`
- `src/app/features/auth/forgot-password/forgot-password.page.html`
- `src/app/features/auth/forgot-password/forgot-password.page.scss`
- `src/app/features/auth/login/login.page.html`
- `src/app/features/auth/login/login.page.scss`
- `src/app/features/auth/register/register.page.html`
- `src/app/features/auth/register/register.page.scss`
- `src/app/features/cart/cart.page.html`
- `src/app/features/cart/cart.page.scss`
- `src/app/features/cart/cart.page.spec.ts`
- `src/app/features/catalog/catalog.page.html`
- `src/app/features/catalog/catalog.page.scss`
- `src/app/features/catalog/catalog.page.spec.ts`
- `src/app/features/catalog/catalog.page.ts`
- `src/app/features/checkout/checkout-summary/checkout-summary.page.html`
- `src/app/features/checkout/checkout-summary/checkout-summary.page.scss`
- `src/app/features/checkout/confirmation/confirmation.page.html`
- `src/app/features/checkout/confirmation/confirmation.page.scss`
- `src/app/features/checkout/confirmation/confirmation.page.spec.ts`
- `src/app/features/checkout/confirmation/confirmation.page.ts`
- `src/app/features/checkout/delivery-method/delivery-method.page.html`
- `src/app/features/checkout/delivery-method/delivery-method.page.scss`
- `src/app/features/checkout/delivery-method/delivery-method.page.spec.ts`
- `src/app/features/checkout/payment-method/payment-method.page.html`
- `src/app/features/checkout/payment-method/payment-method.page.scss`
- `src/app/features/checkout/payment-method/payment-method.page.spec.ts`
- `src/app/features/foundation-preview/foundation-preview.page.html`
- `src/app/features/foundation-preview/foundation-preview.page.scss`
- `src/app/features/home/home.page.html`
- `src/app/features/home/home.page.scss`
- `src/app/features/home/home.page.spec.ts`
- `src/app/features/home/home.page.ts`
- `src/app/features/orders/order-detail/order-detail.page.html`
- `src/app/features/orders/order-detail/order-detail.page.scss`
- `src/app/features/orders/orders.page.html`
- `src/app/features/orders/orders.page.scss`
- `src/app/features/profile/edit-profile/edit-profile.page.html`
- `src/app/features/profile/edit-profile/edit-profile.page.scss`
- `src/app/features/profile/profile.page.html`
- `src/app/features/profile/profile.page.scss`
- `src/app/features/splash/splash.page.html`
- `src/app/features/splash/splash.page.scss`
- `src/app/layout/main-navigation/main-navigation.component.html`
- `src/app/layout/main-navigation/main-navigation.component.scss`
- `src/app/shared/ui/button/cmc-button.component.scss`
- `src/app/shared/ui/input/cmc-input.component.scss`
- `src/app/shared/ui/styles/_checkout-options.scss`
- `src/app/shared/ui/styles/_discovery.scss`
- `src/global.scss`
- `src/test-setup.ts`
- `src/theme/variables.scss`
