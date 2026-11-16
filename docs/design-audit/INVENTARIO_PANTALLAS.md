# Inventario de Pantallas Reales — Casa de Música Castillo Mobile

**Fecha:** 15 de noviembre de 2026  
**Proyecto:** Casa de Música Castillo  
**Rutas base:** [src/app/app.routes.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/app.routes.ts) y [src/app/features/checkout/checkout.routes.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/checkout/checkout.routes.ts)

---

## Resumen Ejecutivo de Cobertura de Pantallas

| # | Pantalla | Ruta | Tipo de Vista | Estado Real | Archivo Principal |
|---|---|---|---|---|---|
| 1 | Splash Screen | `/splash` | Única | Terminada | `src/app/features/splash/splash.page.ts` |
| 2 | Iniciar Sesión (Login) | `/login` | Dual (Demo / Conectada) | Terminada / Conectada | `src/app/features/auth/login/login.page.ts` |
| 3 | Registro | `/register` | Dual (Demo / Conectada) | Terminada / Conectada | `src/app/features/auth/register/register.page.ts` |
| 4 | Recuperar Contraseña | `/forgot-password` | Dual (Demo / Conectada) | Terminada / Conectada | `src/app/features/auth/forgot-password/forgot-password.page.ts` |
| 5 | Verificar Correo | `/verify-email` | Conectada | Terminada | `src/app/features/auth/connected/verify-email.page.ts` |
| 6 | Inicio (Home) | `/main/home` | Dual (Demo / Conectada) | Terminada / Conectada | `src/app/features/home/home.page.ts` |
| 7 | Catálogo | `/main/catalog` | Dual (Demo / Conectada) | Terminada / Conectada | `src/app/features/catalog/catalog.page.ts` |
| 8 | Detalle de Producto | `/products/:id` | Dual (Demo / Conectada) | Terminada / Conectada | `src/app/features/catalog/product-detail/product-detail.page.ts` |
| 9 | Carrito | `/main/cart` | Dual (Demo / Conectada) | Terminada / Conectada | `src/app/features/cart/cart.page.ts` |
| 10 | Resumen Checkout | `/checkout` | Dual (Demo / Conectada) | Terminada / Conectada | `src/app/features/checkout/checkout-summary/checkout-summary.page.ts` |
| 11 | Método de Entrega | `/checkout/delivery` | Demo (Checkout local) | Parcial / Demo | `src/app/features/checkout/delivery-method/delivery-method.page.ts` |
| 12 | Método de Pago | `/checkout/payment` | Demo (Checkout local) | Parcial / Demo | `src/app/features/checkout/payment-method/payment-method.page.ts` |
| 13 | Confirmación Pedido | `/checkout/confirmation` | Dual (Demo / Conectada) | Terminada / Conectada | `src/app/features/checkout/confirmation/confirmation.page.ts` |
| 14 | Mis Pedidos | `/main/orders` | Dual (Demo / Conectada) | Terminada / Conectada | `src/app/features/orders/orders.page.ts` |
| 15 | Detalle de Pedido | `/orders/:id` | Dual (Demo / Conectada) | Terminada / Conectada | `src/app/features/orders/order-detail/order-detail.page.ts` |
| 16 | Perfil | `/main/profile` | Dual (Demo / Conectada) | Terminada / Conectada | `src/app/features/profile/profile.page.ts` |
| 17 | Editar Perfil | `/profile/edit` | Dual (Demo / Conectada) | Parcial (Sin endpoint PUT) | `src/app/features/profile/edit-profile/edit-profile.page.ts` |
| 18 | Seguridad de Cuenta | `/profile/security` | Conectada | Funcional (Estilos crudos) | `src/app/features/profile/account-security.page.ts` |
| 19 | Favoritos | `/favorites` | Dual (Demo / Conectada) | Terminada / Conectada | `src/app/features/favorites/favorites.page.ts` |
| 20 | Diagnóstico de API | `/api-connection` | Utilidad Técnica | Terminada | `src/app/features/api-connection/api-connection.page.ts` |
| 21 | Foundation Preview | `/foundation-preview` | Utilidad Interna UI | Terminada | `src/app/features/foundation-preview/foundation-preview.page.ts` |
| 22 | Página No Encontrada | `/not-found`, `**` | Única | Terminada | `src/app/features/not-found/not-found.page.ts` |

---

## Análisis Detallado por Pantalla

### 1. Splash Screen
- **Ruta:** `/splash` (Redirección inicial de `/`).
- **Archivos:** [splash.page.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/splash/splash.page.ts), `.html`, `.scss`.
- **Componentes:** `IonContent`, `IonIcon` (`musical-notes-outline`).
- **Interacciones:** Animación de entrada `fadeIn` (1.5s), transición automática hacia `/main/home` tras timeout (2000 ms).
- **Problemas UI/UX:** El isotipo musical es un icono genérico de Ionicons dentro de un contenedor circular, sin logotipo vectorial formal.
- **Oportunidades de mejora en pen.dev:** Incorporar un logotipo vectorial premium de Casa de Música Castillo con microinteracción elegante.
- **Restricciones:** Respetar los tokens `--cmc-primary` (#722f37) y `--cmc-accent-gold` (#c5a059).

---

### 2. Iniciar Sesión (Login)
- **Ruta:** `/login`.
- **Archivos:** [login.page.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/auth/login/login.page.ts), [connected-login.page.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/auth/connected/connected-login.page.ts), `connected-login.page.html`.
- **Componentes:** `cmc-input`, `cmc-button`, `IonContent`, `IonIcon`.
- **Interacciones y Funciones:**
  - Login con email y password.
  - Flujo de desafío de segundo factor (2FA / TOTP challenge si la cuenta lo requiere: email o authenticator).
  - Enlaces a `/forgot-password`, `/register` y `/verify-email`.
  - Validación reactiva (email válido, password >= 6 caracteres).
- **Estados visuales:** Reposo, formulario inválido/tocado, enviando (`submitting`), error de credenciales (`auth-alert--error`), sesión expirada, desafío 2FA activo.
- **Problemas UI/UX:**
  - Banners de alerta con colores hex directos (`#fdecea`, `#7a1c14`, `#fff6e0`).
  - El selector de métodos 2FA utiliza radios HTML básicos con estilo nativo.
- **Oportunidades de mejora:** Tarjeta flotante con jerarquía pulida, transición suave entre credenciales y paso 2FA.

---

### 3. Registro de Cuenta
- **Ruta:** `/register`.
- **Archivos:** [register.page.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/auth/register/register.page.ts), [connected-register.page.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/auth/connected/connected-register.page.ts).
- **Componentes:** `cmc-input`, `cmc-button`, `IonContent`, `IonIcon`.
- **Interacciones:** Formulario de nombre completo, email, teléfono (10 dígitos), contraseña y confirmación. En modo conectado, tras enviar se redirige a `/verify-email`.
- **Estados visuales:** Normal, error de contraseñas no coincidentes, botón de envío con estado de carga, alerta de error del servidor.

---

### 4. Recuperación de Contraseña
- **Ruta:** `/forgot-password`.
- **Archivos:** [forgot-password.page.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/auth/forgot-password/forgot-password.page.ts), [connected-forgot-password.page.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/auth/connected/connected-forgot-password.page.ts).
- **Interacciones:** Envío de correo para solicitar token de restablecimiento. Paso 2 en modo conectado: captura de token/código y nueva contraseña.

---

### 5. Verificación de Correo
- **Ruta:** `/verify-email`.
- **Archivos:** [verify-email.page.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/auth/connected/verify-email.page.ts), `.html`.
- **Interacciones:** Entrada de email y token numérico de verificación de 6 dígitos. Reenvío de código tras espera.

---

### 6. Inicio / Home
- **Ruta:** `/main/home` (Dentro de `app-main-navigation`).
- **Archivos:** [home.page.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/home/home.page.ts), [public-home.view.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/public-catalog/public-home.view.ts), `.html`, `.scss`.
- **Componentes:** `cmc-icon`, `cmc-loading`, `cmc-error-state`, `cmc-empty-state`, `cmc-public-image`, `cmc-public-product-grid`.
- **Interacciones:**
  - Barra de búsqueda superior con navegación hacia `/main/catalog?q=...`.
  - Acceso directo a Favoritos (`/favorites`).
  - Banner Hero: "Tu próxima historia empieza con música".
  - Banner informativo para invitados (invita a iniciar sesión si `!auth.hasValidSession()`).
  - Grid de categorías horizontales/mosaicos con conteo de instrumentos activos.
  - Sección "Destacados disponibles" (filtrado con stock).
  - Sección "Novedades".
- **Estados visuales:** Carga con spinner (`cmc-loading`), error de carga con reintento (`cmc-error-state`), grilla de productos con badges de disponibilidad.

---

### 7. Catálogo
- **Ruta:** `/main/catalog`.
- **Archivos:** [catalog.page.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/catalog/catalog.page.ts), [public-catalog.view.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/public-catalog/public-catalog.view.ts), `.html`, `.scss`.
- **Componentes:** `cmc-icon`, `cmc-loading`, `cmc-error-state`, `cmc-empty-state`, `cmc-public-product-grid`, `ion-modal` (hoja inferior de filtros).
- **Interacciones:**
  - Búsqueda en vivo (`#catalog-search`) con debounce y botón para limpiar.
  - Botón de apertura de filtros y ordenamiento en modal sheet (0.85 altura de viewport).
  - Píldoras de filtros activos (`active-filters`) con eliminación individual.
  - Paginación server-side (Anterior / Siguiente, Página X de Y).
- **Estados visuales:** Esqueleto de carga (`catalog-skeleton`), vacío sin resultados con botón "Limpiar filtros", error con reintento.

---

### 8. Detalle del Producto
- **Ruta:** `/products/:id`.
- **Archivos:** [product-detail.page.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/catalog/product-detail/product-detail.page.ts), [public-product-detail.view.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/public-catalog/public-product-detail.view.ts), [product-reviews.component.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/public-catalog/product-reviews.component.ts).
- **Componentes:** `cmc-quantity`, `cmc-button`, `cmc-icon`, `cmc-public-image`, `cmc-product-reviews`, `CmcMoneyPipe`.
- **Interacciones:**
  - Galería de imágenes con miniaturas seleccionables e indicador "Imagen X de N".
  - Información de marca, categoría, SKU y calificación con estrellas.
  - Indicador de precio actual y precio tachado si existe descuento.
  - Estado de disponibilidad (`Disponible · N unidades`, `Agotado` o `Por confirmar`).
  - Selector de cantidad (`cmc-quantity`) con límite de stock.
  - Botón "Agregar al carrito" con verificación reactiva de stock.
  - Botón "Guardar en favoritos" (`aria-pressed`).
  - Bloque expandible de descripción larga ("Leer más" / "Leer menos").
  - Ficha técnica de especificaciones (`<dl class="spec-list">`).
  - Sección de opiniones y calificaciones de clientes.

---

### 9. Carrito de Compras
- **Ruta:** `/main/cart` (Protegida por `authGuard`).
- **Archivos:** [cart.page.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/cart/cart.page.ts), [connected-cart.view.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/cart/connected-cart.view.ts).
- **Componentes:** `cmc-button`, `cmc-empty-state`, `cmc-loading`, `cmc-error-state`, `cmc-public-image`.
- **Interacciones:**
  - Listado de items con imagen thumbnail (72 × 72 px), título, precio unitario y subtotal.
  - Controles de cantidad (+/-) y eliminación con botón papelera (`trash-outline`).
  - Alertas en línea por cambios de disponibilidad o stock bajo en items individuales.
  - Tarjeta de desglose financiero: Subtotal, Descuentos, Impuestos, Total.
  - Botón de avance a Checkout ("Continuar compra" / "Validando").
- **Problemas UI/UX:** Las clases `.warn` y `.err` tienen colores hex fijos no derivados de tokens.

---

### 10 a 13. Flujo de Checkout
- **Rutas:** `/checkout`, `/checkout/delivery`, `/checkout/payment`, `/checkout/confirmation`.
- **Archivos:** [connected-checkout.view.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/checkout/connected-checkout.view.ts), `checkout-summary.page.ts`, `delivery-method.page.ts`, `payment-method.page.ts`, `confirmation.page.ts`.
- **Interacciones y Reglas:**
  - Selección de entrega: Recoger en sucursal (Huejutla), Envío local (Huasteca), Envío nacional.
  - Opciones de pago: Transferencia bancaria, Mercado Pago, Pago contra entrega, Tarjetas.
  - Vista previa de precios conectada (`POST /api/checkout/price-preview`).
  - Guardia de seguridad (`REAL_CHECKOUT_WRITE_ENABLED = false` por defecto para prevenir cobros accidentales).
  - Pantalla de confirmación con folio de orden, resumen y navegación a Mis Pedidos.

---

### 14 y 15. Mis Pedidos y Detalle de Pedido
- **Rutas:** `/main/orders`, `/orders/:id` (Protegidas).
- **Archivos:** [orders.page.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/orders/orders.page.ts), [connected-orders.view.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/orders/connected-orders.view.ts), [order-detail.page.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/orders/order-detail/order-detail.page.ts), [connected-order-detail.view.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/orders/order-detail/connected-order-detail.view.ts).
- **Componentes:** `cmc-badge` (mapeo semántico: `COMPLETED` -> success, `CANCELLED` -> error, `PENDING` -> warning), `cmc-loading`, `cmc-empty-state`.
- **Interacciones:** Línea de tiempo de estados (`timeline`), lista de artículos con precios, desglose de envío y total, botón de navegación hacia atrás.

---

### 16 a 18. Perfil, Editar Perfil y Seguridad
- **Rutas:** `/main/profile`, `/profile/edit`, `/profile/security`.
- **Archivos:** `profile.page.ts`, `connected-profile.view.ts`, `edit-profile.page.ts`, `account-security.page.ts`.
- **Interacciones y Funciones:**
  - Avatar circular con inicial del usuario (`.avatar`).
  - Datos de cuenta (Nombre, Email, Teléfono, Estado de 2FA).
  - Aviso de sesión honesto (almacenamiento en memoria volátil por seguridad).
  - Pantalla de Seguridad (`/profile/security`): Activación de 2FA con TOTP, renderizado de código QR privado, clave manual, confirmación de 6 dígitos, generación de 10 códigos de respaldo (`BACKUP_CODES`).
- **Problemas UI/UX:** `account-security.page.ts` tiene estilos en línea crudos con inputs y botones HTML sin envolver en componentes compartidos.

---

### 19. Favoritos
- **Ruta:** `/favorites`.
- **Archivos:** [favorites.page.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/favorites/favorites.page.ts), [connected-favorites.view.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/favorites/connected-favorites.view.ts).
- **Interacciones:** Conexión con `WishlistRepository`. Listado de instrumentos marcados, estado de disponibilidad en tiempo real, enlace directo a la ficha del producto y acción de eliminación ("Quitar").
