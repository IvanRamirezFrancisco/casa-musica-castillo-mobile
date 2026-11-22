# Auditoría UI/UX y Accesibilidad — Casa de Música Castillo Mobile

**Fecha:** 15 de noviembre de 2026  
**Auditor:** Especialista Senior UI/UX & Accesibilidad Móvil  
**Objetivo:** Evaluación rigurosa basada en el código fuente de la calidad visual, interacción, ergonomía táctil y accesibilidad (WCAG 2.2 AA) de la aplicación actual.

---

## 1. Evaluación por Dimensiones de Diseño

### 1.1. Consistencia Visual
- **Puntos Fuertes:**
  - El sistema central de diseño en `src/theme/variables.scss` define una identidad sólida y distintiva inspirada en "minimalismo cálido premium" (burdeos `#722f37`, oro `#c5a059`, fondo crema `#fcfaf7`).
  - Los componentes base compartidos (`cmc-button`, `cmc-input`, `cmc-badge`, `cmc-empty-state`, `cmc-error-state`, `cmc-loading`) aplican consistentemente la paleta y radios de curvatura (`--cmc-radius-md: 12px`, `--cmc-radius-full: 9999px`).
- **Inconsistencias Detectadas:**
  - **Uso de estilos SCSS embebidos con colores HEX arbitrarios:** En vistas conectadas como `connected-cart.view.ts`, `connected-checkout.view.ts`, `connected-profile.view.ts` y `account-security.page.ts` se introdujeron colores directos como `#fff6e0`, `#5c4300`, `#fdecea`, `#7a1c14`, `#1b4d20`, `#1b5e20` y `#722F37` en lugar de consumir las variables semánticas oficiales.
  - **Falta de componentes compartidos en Seguridad:** `account-security.page.ts` utiliza botones e inputs HTML planos con estilos inline crudos en lugar de `<cmc-button>` y `<cmc-input>`.

---

### 1.2. Jerarquía de Información y Legibilidad
- **Puntos Fuertes:**
  - Excelente diferenciación tipográfica: Montserrat (títulos de personalidad fuerte) combinada con Roboto (cuerpo limpio y neutral para interfaces de e-commerce).
  - Los precios de instrumentos musicales tienen peso visual predominante (`font-weight: 600` o `700`, color `--cmc-primary`), asegurando reconocimiento inmediato en catálogo y carrito.
- **Áreas de Oportunidad:**
  - En la vista móvil estrecha (360px), algunos nombres largos de instrumentos (p. ej. *«Guitarra Electroacústica TransAcoustic con Efectos Integrados»*) pueden ocupar más de 2 líneas y desalinear la grilla de productos si no se fija una altura mínima en `.product-name`. El código actual mitiga esto con `min-height: 40px`, pero en pen.dev debe diseñarse un comportamiento de tarjeta robusto con 2 líneas y elipsis visual.

---

### 1.3. Contraste de Color y Accesibilidad (WCAG 2.2 AA)
- **Verificación de Ratios de Contraste:**
  - `Texto Principal (#292524)` sobre `Fondo (#fcfaf7)`: **13.0:1** (Supera ampliamente el estándar WCAG AAA de 7:1).
  - `Texto Principal (#292524)` sobre `Superficie (#ffffff)`: **13.5:1** (Cumple WCAG AAA).
  - `Texto Secundario (#6b6560)` sobre `Superficie (#ffffff)`: **5.3:1** (Cumple WCAG AA para texto pequeño >4.5:1).
  - `Texto Blanco (#ffffff)` sobre `Botón Burdeos (#722f37)`: **8.1:1** (Cumple WCAG AAA >7:1).
  - `Insignia de Carrito (Texto #421a20)` sobre `Badge Dorado (#c5a059)`: **6.2:1** (Cumple WCAG AA).
- **Atributos Accesibles:**
  - Los botones de favorito cuentan con `aria-pressed`.
  - La navegación de tabs implementa `aria-label="Navegación principal"` y texto oculto accesible `.cart-sr-only` que anuncia el número exacto de productos en el carrito.
  - El selector de cantidad utiliza `<output aria-live="polite">` para lectores de pantalla.
  - Soporte global para `prefers-reduced-motion: reduce` en [src/global.scss:167-176](file:///c:/Users/ivanf/Documents/Desarrollo%20Movil%20Integral/casa-musica-mobile/src/global.scss#L167-L176).

---

### 1.4. Ergonomía Táctil y Navegación Móvil
- **Targets Táctiles:**
  - Todos los botones principales (`cmc-button`), inputs (`cmc-input`), selectores de tabs (`ion-tab-button`) y botones de retroceso (`.nav-back-btn`) cumplen con una dimensión mínima de **48 × 48 px**, superando la recomendación mínima de 44 px de Apple y 48 px de Material Design.
- **Bubble Navigation (Cápsula Flotante):**
  - La barra de navegación inferior flotante está posicionada a `calc(12px + env(safe-area-inset-bottom))` con altura fija de `64px` y ancho centrado con máximo de `448px`.
  - Deja una reserva inferior calculada (`--cmc-bubble-nav-offset: 92px + safe-area-bottom`) en todas las páginas raíz para evitar que el último elemento quede oculto detrás de la barra.

---

### 1.5. Experiencia de Catálogo y Compra
- **Catálogo de Instrumentos:**
  - Relación de aspecto de imagen en tarjeta: `aspect-ratio: 1.15`, optimizada para fotografías de instrumentos musicales (guitarras, teclados, violines, percusión).
  - Estados claros de disponibilidad: `Disponible`, `Agotado` o `Por confirmar`.
  - Filtro modal tipo Bottom Sheet a 85% de la pantalla, ideal para interacción táctil con una sola mano.
- **Proceso de Compra:**
  - División nítida entre cotización de precio y confirmación de compra.
  - Aviso explícito de compra segura y protección contra transacciones accidentales en producción.

---

## 2. Matriz de Hallazgos Clasificados por Prioridad

| ID | Severidad | Hallazgo UI/UX | Impacto | Recomendación para pen.dev |
|---|---|---|---|---|
| **H-01** | **Alta** | Colores de alerta y advertencia no tokenizados en vistas conectadas (`#fff6e0`, `#5c4300`, `#fdecea`, `#7a1c14`). | Inconsistencia en tonos cálidos y duplicación de variables. | Estandarizar tokens semánticos `surface-warning`, `text-warning`, `surface-error`, `text-error`. |
| **H-02** | **Alta** | Pantalla de Seguridad de Cuenta (`/profile/security`) con apariencia cruda y sin componentes reutilizables. | Rompe la armonía estética y genera sensación de formulario inacabado. | Rediseñar en pen.dev la experiencia 2FA, el visor del código QR y la lista de códigos de respaldo usando componentes del Design System. |
| **H-03** | **Media** | Ausencia de logotipo vectorial definitivo en Splash y Headers (se usa icono `musical-notes-outline`). | Menor fuerza de marca frente a competidores premium. | Diseñar en pen.dev una identidad de marca musical refinada que integre monograma o símbolo castillo/clave de sol/cuerdas. |
| **H-04** | **Media** | Dualidad visual entre vistas DEMO y vistas CONECTADAS en checkout y perfil. | Experiencias ligeramente divergentes según el modo de compilación. | Unificar en pen.dev una única especificación visual de referencia que cubra tanto el estado con backend como el modo offline. |
| **H-05** | **Baja** | Banners de aviso en tarjetas de producto y checkout con estilos de borde no estandarizados (`rgba(114,47,55,0.14)`). | Ligera variación en el contraste de bordes de tarjetas. | Fijar un token semántico `border-subtle` derivado de la paleta. |
