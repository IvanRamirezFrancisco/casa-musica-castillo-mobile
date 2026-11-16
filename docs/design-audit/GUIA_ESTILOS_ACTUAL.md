# Guía de Estilos Actual — Casa de Música Castillo Mobile

**Fecha de auditoría:** 15 de noviembre de 2026  
**Proyecto:** Casa de Música Castillo (Aplicación Móvil)  
**Repositorio:** `https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile`  
**Stack tecnológico verificado:** Ionic 9.0.0, Angular 22.2.1 (Standalone), Capacitor 8.5.2, TypeScript 6.0, SCSS nativo (sin Tailwind).  
**Propósito:** Recuperar, clasificar y documentar con evidencia estricta del código fuente la identidad visual, tokens, geometría, componentes y reglas de diseño existentes para su traslado a la herramienta de diseño **pen.dev**, sin alterar la identidad de marca ni romper la funcionalidad.

---

## 1. Identidad Visual de Marca y Elementos Gráficos

### 1.1. Denominación y Copywriting de Marca
- **Nombre comercial oficial:** Casa de Música Castillo (registrado en [android/app/src/main/res/values/strings.xml:4](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/android/app/src/main/res/values/strings.xml#L4) e [src/index.html:6](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/index.html#L6)).
- **Subtítulo / descriptor de categoría:** *Instrumentos musicales* ([src/app/shared/ui/styles/_commerce.scss:27](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/shared/ui/styles/_commerce.scss#L27)).
- **Lemas y promesas de valor verificadas en pantallas:**
  - *"Tu próxima historia empieza con música."* ([src/app/features/public-catalog/public-home.view.html:7](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/public-catalog/public-home.view.html#L7)).
  - *"Tu música comienza aquí."* ([src/app/features/auth/login/login.page.html:10](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/auth/login/login.page.html#L10)).
  - *"Encuentra tu sonido — Instrumentos seleccionados para cada etapa de tu aprendizaje musical."* ([src/app/features/catalog/catalog.page.html:46](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/catalog/catalog.page.html#L46)).
  - *"Sonido Premium — Descubre nuestra nueva colección de cuerdas artesanales"* ([src/app/features/home/home.page.html:31](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/home/home.page.html#L31)).

### 1.2. Recursos Gráficos e Iconografía de Marca
- **Símbolo identificador:** No existe un archivo PNG/SVG de isotipo comercial cerrado en `src/assets/`. La identidad visual utiliza programáticamente el icono de dos notas musicales de Ionicons: `musical-notes-outline` (alias `music` en `cmc-icon`).
- **Implementación del logotipo móvil:**
  1. *Splash Screen* ([src/app/features/splash/splash.page.html:3-9](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/splash/splash.page.html#L3-L9)): Círculo blanco de 120 × 120 px con elevación de marca (`--cmc-shadow-brand`), icono centrado de 64 px en color burdeos (`--cmc-primary`), título en Montserrat 700 blanco de 1.75 rem y subtítulo en Montserrat 500 dorado de 1.25 rem (`--cmc-accent-gold`).
  2. *Cabeceras de Tienda* ([src/app/shared/ui/styles/_discovery.scss:13-26](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/shared/ui/styles/_discovery.scss#L13-L26) y [_commerce.scss:24-28](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/shared/ui/styles/_commerce.scss#L24-L28)): Icono `cmc-icon name="music"` de 28 px en color `--cmc-primary` alineado con título de 1 rem a 1.25 rem en peso 700 y subtítulo en mayúsculas pequeñas.
  3. *Cabeceras de Autenticación* ([src/app/shared/ui/styles/_auth-shell.scss:3-6](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/shared/ui/styles/_auth-shell.scss#L3-L6)): Icono `musical-notes-outline` de 32 px en color dorado (`--cmc-accent-gold`), título burdeos 1.1 rem peso 700 y subtítulo gris cálido 0.8 rem.

---

## 2. Paleta de Colores y Tokens Verificados en Código

Toda la paleta base del proyecto está centralizada en [src/theme/variables.scss:1-153](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/theme/variables.scss#L1-L153). No se han inferido valores arbitrarios.

### 2.1. Colores de Marca (Brand)

| Variable CSS | Valor HEX | Valor RGB | Rol en el Sistema | Ubicación en Código |
|---|---|---|---|---|
| `--cmc-primary` | `#722f37` | `114, 47, 55` | Color principal de marca (Burdeos / Wine). Botones primarios, enlaces, tabs activos, títulos clave. | `variables.scss:11` |
| `--cmc-primary-soft` | `#a64d5b` | `166, 77, 91` | Variante suave para estados de `:hover` en pantallas con puntero y acentos sutiles. | `variables.scss:12` |
| `--cmc-primary-dark` | `#421a20` | `66, 26, 32` | Variante profunda para `:active` en botones táctiles y contraste alto de insignias. | `variables.scss:13` |
| `--cmc-accent-gold` | `#c5a059` | `197, 160, 89` | Acento dorado cálido. Utilizado en badges de carrito, iconos hero, estrellas y detalles premium. | `variables.scss:14` |

### 2.2. Superficies y Fondos (Surfaces)

| Variable CSS | Valor HEX / Alpha | Valor RGB | Rol en el Sistema | Ubicación en Código |
|---|---|---|---|---|
| `--cmc-background` | `#fcfaf7` | `252, 250, 247` | Fondo global de la aplicación (crema/marfil muy suave, alejado del blanco digital frío). | `variables.scss:20` |
| `--cmc-surface` | `#ffffff` | `255, 255, 255` | Superficie de tarjetas, inputs, diálogos modales y barra de navegación flotante. | `variables.scss:21` |
| `--cmc-surface-alt` | `#f5efe8` | `245, 239, 232` | Superficie alterna para placeholders de imágenes, contenedores deshabilitados y estados `:active`. | `variables.scss:22` |
| `--cmc-surface-overlay` | `rgb(255 255 255 / 92%)` | `rgba(255,255,255,0.92)` | Fondo translúcido para controles y cabeceras superpuestas. | `variables.scss:93` |
| `--cmc-overlay-backdrop` | `rgb(41 37 36 / 65%)` | `rgba(41,37,36,0.65)` | Telón de fondo (backdrop) cálido para diálogos modales. | `variables.scss:92` |

### 2.3. Tipografía y Contraste (Text)

| Variable CSS | Valor HEX | Valor RGB | Ratio de Contraste vs Superficie | Rol | Ubicación en Código |
|---|---|---|---|---|---|
| `--cmc-text-primary` | `#292524` | `41, 37, 36` | **13.5:1** (sobre `#ffffff`) / **13.0:1** (sobre `#fcfaf7`) | Texto principal, encabezados, títulos y valores de inputs. | `variables.scss:28` |
| `--cmc-text-secondary` | `#6b6560` | `107, 101, 96` | **5.3:1** (sobre `#ffffff`) / **5.1:1** (sobre `#fcfaf7`) | Subtítulos, labels secundarios, metadatos y placeholders. | `variables.scss:29` |
| `--cmc-text-disabled` | `#8f8985` | `143, 137, 133` | **3.2:1** (no destinado a texto largo) | Estados deshabilitados y controles bloqueados. | `variables.scss:30` |
| `--cmc-text-on-primary` | `#ffffff` | `255, 255, 255` | **8.1:1** (sobre `#722f37`) | Texto sobre botones primarios, chips activos y tarjetas seleccionadas. | `variables.scss:31` |

### 2.4. Bordes y Divisores (Borders)

| Variable CSS | Valor HEX / Alpha | Rol | Ubicación en Código |
|---|---|---|---|
| `--cmc-border` | `#e7ded5` | Borde sutil para tarjetas, separadores de lista y chips. | `variables.scss:37` |
| `--cmc-border-strong` | `#d4c8bd` | Borde enfatizado para inputs en reposo y botones secundarios. | `variables.scss:38` |
| `--cmc-on-primary-border` | `rgb(255 255 255 / 35%)` | Borde divisor sobre fondos de color burdeos. | `variables.scss:94` |

### 2.5. Estados Semánticos (Feedback)

| Variable CSS | Valor HEX | Texto Semántico Asociado | Fondo Tintado Semántico | Rol | Ubicación |
|---|---|---|---|---|---|
| `--cmc-success` | `#10b981` | `--cmc-success-text`: `#047857` | `color-mix(var(--cmc-success) 14%, #fff)` | Éxito, pedidos pagados, existencias disponibles. | `variables.scss:44, 97` |
| `--cmc-warning` | `#f59e0b` | `--cmc-warning-text`: `#914201` | `--cmc-warning-surface`: `#fff1dc` | Advertencias, pedidos pendientes, stock bajo. | `variables.scss:45, 95-96` |
| `--cmc-error` | `#dc2626` | `#7a1c14` (histórico/alerta) | `#fdecea` (alerta conectada) | Errores de validación, fallos de red, pedidos cancelados. | `variables.scss:46` |

> [!NOTE]
> **Modo Oscuro:** En [src/global.scss:34-38](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/global.scss#L34-L38) se documenta expresamente que el modo oscuro está deshabilitado de forma intencional en la versión actual para asegurar la consistencia cálida e identidad editorial de Casa de Música Castillo.

---

## 3. Tipografía y Jerarquías de Texto

El proyecto importa paquetes locales autocontenidos de Fontsource en [src/global.scss:9-15](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/global.scss#L9-L15):
- `@fontsource/montserrat` (pesos 400, 600, 700)
- `@fontsource/roboto` (pesos 400, 500, 600)

### 3.1. Escala Tipográfica Implementada

| Nivel Semántico | Familia Tipográfica | Tamaño (px / rem) | Altura de Línea (line-height) | Peso (font-weight) | Clase / Selector |
|---|---|---|---|---|---|
| **Display / Splash** | Montserrat | `28px` / `1.75rem` | `1.2` (~34px) | 700 (Bold) | `.cmc-splash-title` |
| **H1 Principal** | Montserrat | `24px` / `1.5rem` | `32px` | 700 (Bold) | `.cmc-title`, `h1` |
| **H1 Toolbar** | Montserrat | `20px` / `1.25rem` | `28px` | 700 (Bold) | `ion-title.cmc-title`, `h1.cmc-title` |
| **H2 Sección** | Montserrat | `20px` / `1.25rem` | `28px` | 600 (SemiBold) | `.cmc-section-title`, `h2` |
| **H3 / Card Title** | Roboto / Montserrat | `16px` / `1.0rem` | `24px` | 600 (SemiBold) | `.product-name`, `.item-header h3` |
| **Body (Normal)** | Roboto | `16px` / `1.0rem` | `24px` (`1.5`) | 400 (Regular) | `body`, `.cmc-body`, `p` |
| **Body (Compact)** | Roboto | `14px` / `0.875rem` | `20px` | 400 (Regular) | `.cmc-body`, `.category-chip` |
| **Control / Input** | Roboto | `16px` / `1.0rem` | `24px` | 400 (Regular) | `.cmc-input__control` (evita zoom en iOS) |
| **Control / Botón** | Montserrat | `16px` / `1.0rem` | `24px` | 600 (SemiBold) | `.cmc-button` |
| **Botón Compacto** | Montserrat | `14px` / `0.875rem` | `20px` | 600 (SemiBold) | `.cmc-button--compact` |
| **Caption / Metadatos** | Roboto | `12px` / `0.75rem` | `16px` | 400 o 500 | `.cmc-caption`, `.category-name` |
| **Micro / Badge** | Roboto | `12px` / `0.75rem` | `16px` | 500 (Medium) | `.cmc-badge`, `ion-badge` (10px) |
| **Eyebrow** | Montserrat / Roboto | `12px` / `0.75rem` | `16px` | 700 (Uppercase, letter-spacing 0.12em) | `.eyebrow`, `.hero-eyebrow` |

---

## 4. Espaciados, Geometría y Elevación

### 4.1. Escala de Espaciado (Base 4-Point Grid)
Definida en [src/theme/variables.scss:53-63](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/theme/variables.scss#L53-L63):

| Token | Valor (px) | Usos Típicos en Código |
|---|---|---|
| `--cmc-space-1` | `4px` | Micro-separación, indicador de tab bar, gap de etiquetas. |
| `--cmc-space-2` | `8px` | Gap de botones con icono, relleno de chips, separación de subtítulos. |
| `--cmc-space-3` | `12px` | Padding interno de tarjetas compactas, gap en grilla de productos. |
| `--cmc-space-4` | `16px` | Padding lateral estándar de páginas móviles, gaps de formularios. |
| `--cmc-space-5` | `20px` | Padding en tarjetas de checkout y contenedores de opciones. |
| `--cmc-space-6` | `24px` | Padding en tarjetas de autenticación y separación inferior contextual. |
| `--cmc-space-8` | `32px` | Margen entre bloques de formulario y acciones principales. |
| `--cmc-section-gap` | `32px` | Separación vertical entre secciones en catálogo y storefront. |
| `--cmc-control-height` | `48px` | Altura estándar de botones, inputs y targets táctiles. |

### 4.2. Border Radius
Definido en [src/theme/variables.scss:68-73](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/theme/variables.scss#L68-L73):

| Token | Valor (px) | Elementos que lo implementan |
|---|---|---|
| `--cmc-radius-xs` | `4px` | Indicadores de foco o micro-elementos. |
| `--cmc-radius-sm` | `8px` | Botones de visibilidad de contraseña, imágenes thumbnail secundarias. |
| `--cmc-radius-md` | `12px` | Botones principales, inputs, tarjetas de producto, tarjetas de resumen. |
| `--cmc-radius-lg` | `16px` | Superficies de tienda (`.surface`), items de la barra de tabs (`ion-tab-button`). |
| `--cmc-radius-xl` | `24px` | Tarjeta flotante de Bubble Navigation, tarjetas de autenticación (`.auth-card`). |
| `--cmc-radius-full` | `9999px` | Badges, chips de categorías, barra de búsqueda en forma de píldora. |

### 4.3. Elevación y Sombras (Box Shadows)
Definido en [src/theme/variables.scss:79-82](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/theme/variables.scss#L79-L82):
- `--cmc-shadow-subtle`: `0 1px 2px rgb(41 37 36 / 5%)` (tarjetas planas en reposo, inputs).
- `--cmc-shadow-card`: `0 2px 8px rgb(41 37 36 / 10%)` (tarjetas de productos, pedidos y carrito).
- `--cmc-shadow-medium`: `0 4px 12px rgb(41 37 36 / 12%)` (cápsula Bubble Navigation flotante).
- `--cmc-shadow-brand`: `0 4px 12px rgb(114 47 55 / 15%)` (botón primario y pestaña seleccionada).

---

## 5. Catálogo de Componentes Compartidos

### 5.1. Botón (`cmc-button`)
- **Ubicación:** [src/app/shared/ui/button/cmc-button.component.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/shared/ui/button/cmc-button.component.ts), `.html`, `.scss`.
- **Variantes:**
  - `primary`: Fondo `--cmc-primary`, texto `--cmc-text-on-primary`, sombra `--cmc-shadow-brand`. Active: `--cmc-primary-dark`. Hover: `--cmc-primary-soft`.
  - `secondary`: Fondo `--cmc-surface`, borde 1px `--cmc-primary`, texto `--cmc-primary`. Active/Hover: `--cmc-surface-alt`.
  - `ghost`: Fondo transparente, texto `--cmc-primary`. Active/Hover: `--cmc-surface-alt`.
- **Tamaños:**
  - `default`: Altura mínima de 48 px, padding de 8px 24px, font-size 16 px.
  - `compact`: Altura mínima de 48 px (conserva target accesible táctil), padding de 0 16px, font-size 14 px.
- **Estados:** `normal`, `hover`, `active` (scale 0.98), `loading` (spinner giratorio animado o estático si `prefers-reduced-motion`, texto para lector de pantalla), `disabled` (fondo `--cmc-surface-alt`, borde `--cmc-border`, texto `--cmc-text-disabled`, pointer-events none).
- **Modificadores:** `fullWidth` (ancho 100%).

### 5.2. Campo de Texto (`cmc-input`)
- **Ubicación:** [src/app/shared/ui/input/cmc-input.component.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/shared/ui/input/cmc-input.component.ts), `.html`, `.scss`.
- **Integración:** `ControlValueAccessor` nativo para Formularios Reactivos de Angular.
- **Tipos soportados:** `text`, `email`, `password`, `tel`, `number`, `search`, `url`.
- **Características:**
  - Label superior de 14 px, peso 500. Asterisco `--cmc-error` si es requerido.
  - Contenedor de input con altura mínima de 48 px, padding de 0 16px, borde 1px `--cmc-border-strong`.
  - Enfoque (`:focus-within`): borde `--cmc-primary` y outline visible de 2 px.
  - Modo Password: botón integrado para alternar visibilidad (`eye` / `hidden`) con target de 48 × 48 px.
  - Mensaje de ayuda (`hint`) y error (`error`): fuente de 12 px, el error toma precedencia y conecta `aria-describedby`.

### 5.3. Insignia de Estado (`cmc-badge`)
- **Ubicación:** [src/app/shared/ui/badge/cmc-badge.component.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/shared/ui/badge/cmc-badge.component.ts), `.html`, `.scss`.
- **Variantes:**
  - `neutral`: Borde y punto `--cmc-text-secondary`, fondo tintado sutil.
  - `success`: Borde y punto `--cmc-success`, fondo tintado con `color-mix`.
  - `warning`: Borde y punto `--cmc-warning`, fondo tintado con `color-mix`.
  - `error`: Borde y punto `--cmc-error`, fondo tintado con `color-mix`.
- **Geometría:** Altura mínima 24 px, borde redondeado completo (`--cmc-radius-full`), punto decorativo izquierdo de 6 × 6 px, texto siempre en `--cmc-text-primary` con contraste superior a 7:1.

### 5.4. Selector de Cantidad (`cmc-quantity`)
- **Ubicación:** [src/app/shared/ui/quantity/cmc-quantity.component.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/shared/ui/quantity/cmc-quantity.component.ts).
- **Geometría:** Grid horizontal con botones de 48 × 48 px para decremento (`remove`) e incremento (`add`), y display central accesible (`<output aria-live="polite">`).

### 5.5. Estados de Interfaz (`cmc-loading`, `cmc-empty-state`, `cmc-error-state`)
- **Ubicación:** `src/app/shared/ui/{loading,empty-state,error-state}/`.
- **Comportamiento:** Estructura vertical centrada con padding generoso (32px 16px), título en Montserrat 600 de 20 px, descripción en Roboto de 14 px y acción opcional de reintento (`cmc-button`).

### 5.6. Navegación Flotante (`app-main-navigation` / Bubble Navigation)
- **Ubicación:** [src/app/layout/main-navigation/main-navigation.component.ts](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/layout/main-navigation/main-navigation.component.ts), `.html`, `.scss`.
- **Geometría de cápsula:**
  - `position: fixed`, centrado horizontalmente (`left: 50%; transform: translateX(-50%)`).
  - Ancho: `calc(100% - 32px)`, con ancho máximo de `448px`.
  - Altura exacta: `64px` (`--cmc-bubble-nav-height`).
  - Borde redondeado: `24px` (`--cmc-radius-xl`).
  - Fondo: `--cmc-surface` (`#ffffff`) con sombra compuesta `--cmc-shadow-medium` e inset border de 1px `--cmc-border`.
  - Pestañas (5 pestañas): Inicio (`home`), Catálogo (`grid`), Carrito (`cart` con badge numérico dorado), Pedidos (`receipt`), Perfil (`person`).
  - Pestaña activa: cápsula interna en color burdeos (`--cmc-primary`), iconos y texto en blanco (`--cmc-text-on-primary`), sombra `--cmc-shadow-brand`.
  - Espacio de reserva inferior (`--cmc-bubble-nav-offset`): `64px + 12px + 16px + env(safe-area-inset-bottom) = 92px + safe-area-bottom`.

---

## 6. Inconsistencias y Desviaciones Detectadas en el Código

Durante la auditoría exhaustiva de todos los módulos y vistas se detectaron las siguientes discrepancias respecto a los tokens centrales:

1. **Uso de Colores HEX Directos en Vistas Conectadas:**
   - En [connected-cart.view.ts:33-34](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/cart/connected-cart.view.ts#L33-L34): `.warn` utiliza `background: #fff6e0; color: #5c4300;` y `.err` utiliza `background: #fdecea; color: #7a1c14;` en lugar de las variables semánticas `--cmc-warning-surface`, `--cmc-warning-text` y `--cmc-error`.
   - En [connected-checkout.view.ts:63-65](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/checkout/connected-checkout.view.ts#L63-L65): se define `border: 1px solid rgba(114, 47, 55, 0.14)` y banners con `#fff6e0`, `#5c4300` y borde izquierdo `#c59b27` (variante no tokenizada del dorado).
   - En [connected-checkout.view.ts:88](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/checkout/connected-checkout.view.ts#L88): icono de confirmación con estilo en línea `color: #1b5e20` (verde oscuro no tokenizado).
   - En [account-security.page.ts:11](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/profile/account-security.page.ts#L11): botón con `background: #722F37` en mayúsculas sin utilizar la variable CSS.
   - En [edit-profile.page.html:15](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/app/features/profile/edit-profile/edit-profile.page.html#L15): bloque con estilo en línea `style="... border: 1px solid rgba(114,47,55,0.18); background: #fff;"`.

2. **Divergencia entre Componentes Compartidos y Vistas Conectadas:**
   - Varias vistas conectadas (como `account-security.page.ts`, `connected-favorites.view.ts`, `connected-checkout.view.ts`) declaran elementos `<button>` e `<input>` nativos con estilos SCSS encapsulados en el componente en lugar de reutilizar `<cmc-button>` y `<cmc-input>`.

3. **Bifurcación de Modos de Presentación (Conectado vs Demo):**
   - El árbol cuenta con una dualidad estructural: vistas DEMO (heredadas para demostraciones locales sin servidor) y vistas CONECTADAS (que se comunican con los endpoints REST de Spring Boot). Ambas deben alinearse visualmente para que la experiencia de usuario sea idéntica en diseño sin importar el backend.
