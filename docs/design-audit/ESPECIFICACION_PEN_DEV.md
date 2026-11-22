# Especificación de Design System para pen.dev — Casa de Música Castillo

**Objetivo:** Guía de especificación técnica y de diseño visual para la construcción del Design System y pantallas de alta fidelidad en **pen.dev**, respetando la identidad histórica, la arquitectura móvil y los componentes verificados.

---

## 1. Clasificación de Valores y Fuentes de Verdad

Para garantizar total transparencia y evitar invenciones:
1. **Valores Verificados en Código:** Extraídos directamente de `variables.scss`, `global.scss` y componentes compartidos existentes.
2. **Valores Documentados pero No Implementados:** Modo oscuro (planificado a futuro pero deliberadamente omitido en el código actual).
3. **Recomendaciones Nuevas (Pendientes de Aprobación):** Tokenización formal de banners de alerta y diseño vectorial de imagotipo comercial.
4. **Información Desconocida / No Verificable:** Archivo original vectorial SVG del logotipo comercial en alta resolución (actualmente sustituido por el icono de Ionicons).

---

## 2. Tokens de Diseño para pen.dev

### 2.1. Tokens de Color Oficiales

```json
{
  "color": {
    "brand-primary": "#722f37",
    "brand-primary-soft": "#a64d5b",
    "brand-primary-dark": "#421a20",
    "brand-accent-gold": "#c5a059",
    "surface-background": "#fcfaf7",
    "surface-card": "#ffffff",
    "surface-alt": "#f5efe8",
    "surface-overlay": "rgba(255, 255, 255, 0.92)",
    "text-primary": "#292524",
    "text-secondary": "#6b6560",
    "text-disabled": "#8f8985",
    "text-on-primary": "#ffffff",
    "border-default": "#e7ded5",
    "border-strong": "#d4c8bd",
    "semantic-success": "#10b981",
    "semantic-success-text": "#047857",
    "semantic-warning": "#f59e0b",
    "semantic-warning-surface": "#fff1dc",
    "semantic-warning-text": "#914201",
    "semantic-error": "#dc2626"
  }
}
```

### 2.2. Tokens de Tipografía

- **Familia Display / Cabeceras:** `Montserrat` (Google Fonts), pesos 600 y 700.
- **Familia Textos / Controles:** `Roboto` (Google Fonts), pesos 400, 500 y 600.
- **Escala:**
  - `Hero / Splash`: 28 px / 36 px line-height / Bold (700)
  - `H1 / Page Title`: 24 px / 32 px line-height / Bold (700)
  - `H2 / Section Title`: 20 px / 28 px line-height / SemiBold (600)
  - `Body / Inputs`: 16 px / 24 px line-height / Regular (400)
  - `Body Compact`: 14 px / 20 px line-height / Regular (400) o Medium (500)
  - `Caption`: 12 px / 16 px line-height / Regular (400)
  - `Micro / Badges`: 10 px a 12 px / 16 px line-height / Medium (500)
  - `Eyebrow`: 12 px / 16 px / Bold (700), Uppercase, letter-spacing +1.2px

### 2.3. Espaciado y Cuadrícula (4px System)
- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 12px
- `space-4`: 16px (margen exterior móvil predeterminado)
- `space-5`: 20px
- `space-6`: 24px
- `space-8`: 32px (separación entre secciones)
- `control-height`: 48px (altura interactiva mínima)

### 2.4. Radios de Curvatura (Border Radius)
- `radius-sm`: 8px
- `radius-md`: 12px (botones, inputs, tarjetas de producto)
- `radius-lg`: 16px (superficies de tienda, contenedores de cuenta)
- `radius-xl`: 24px (cápsula Bubble Navigation, tarjetas de autenticación)
- `radius-full`: 9999px (badges, chips de filtro, barra de búsqueda)

---

## 3. Especificación de Componentes Clave en pen.dev

### 3.1. Botón Primario y Secundario (`cmc-button`)
- **Dimensiones:** Ancho variable o `fullWidth` (100%), altura fija de `48px`, radio `12px`.
- **Variante Primaria:**
  - Reposo: Fondo `#722f37`, texto blanco `#ffffff`, sombra `0 4px 12px rgba(114, 47, 55, 0.15)`.
  - Hover: Fondo `#a64d5b`.
  - Presionado (Active): Fondo `#421a20`, escala 0.98.
  - Cargando: Texto accesible oculto, spinner centrado de 18 px giratorio.
  - Deshabilitado: Fondo `#f5efe8`, borde `#e7ded5`, texto `#8f8985`.
- **Variante Secundaria:**
  - Reposo: Fondo `#ffffff`, borde de 1px `#722f37`, texto `#722f37`.
  - Active/Hover: Fondo `#f5efe8`.

### 3.2. Campo de Entrada (`cmc-input`)
- **Estructura:**
  - Label superior: Roboto 14 px / SemiBold 500, color `#292524`.
  - Contenedor de entrada: Altura 48 px, fondo `#ffffff`, borde 1px `#d4c8bd`, radio `12px`, padding 0 16px.
  - Placeholder: Roboto 16 px, color `#6b6560`.
  - Foco activo: Borde `#722f37`, outline exterior de 2 px `#722f37` con offset de 2 px.
  - Estado de Error: Borde `#dc2626`, sombra de 1 px `#dc2626`, mensaje inferior en `#dc2626` (12 px).
  - Campo Password: Botón de alternancia de ojo a la derecha con área táctil de 48 × 48 px.

### 3.3. Barra de Navegación Flotante (Bubble Navigation)
- **Geometría en pen.dev:**
  - Marco móvil base de 393 × 852 px (o 360 × 800 px).
  - Contenedor flotante: Posición inferior, margen inferior de `12px + safe-area-bottom`, centrado horizontal, ancho `361px` (o `max-width: 448px`), altura `64px`, radio `24px`.
  - Relleno: `#ffffff` con sombra `0 4px 12px rgba(41, 37, 36, 0.12)` y borde interno de 1px `#e7ded5`.
  - 5 Pestañas distribuidas equitativamente:
    1. **Inicio** (`home-outline`)
    2. **Catálogo** (`grid-outline`)
    3. **Carrito** (`cart-outline`) con badge dorado circular (`#c5a059`, texto `#421a20`, 18 px)
    4. **Pedidos** (`receipt-outline`)
    5. **Perfil** (`person-outline`)
  - Pestaña Activa: Cápsula interior burdeos `#722f37`, radio `16px`, altura `56px`, icono y etiqueta en blanco `#ffffff`.

### 3.4. Tarjeta de Producto (`product-card`)
- **Geometría:** Grilla de 2 columnas con separación de 12 px (`--cmc-space-3`).
- **Contenedor:** Fondo `#ffffff`, borde 1px `#e7ded5`, radio `12px`, sombra `0 2px 8px rgba(41, 37, 36, 0.10)`.
- **Imagen:** Relación de aspecto `1.15`, fondo `#f5efe8`, botón flotante circular de favorito en esquina superior derecha (36 × 36 px o 44 × 44 px).
- **Cuerpo de Información:**
  - Categoría: Caption 12 px `#6b6560`.
  - Nombre del Instrumento: Roboto 14-16 px, peso 500, máximo 2 líneas.
  - Precio: Montserrat / Roboto 16 px, peso 600, color `#722f37`.
  - Badge de Disponibilidad: `Disponible` (verde), `Agotado` (rojo) o `Por confirmar` (dorado/ámbar).

---

## 4. Reglas de Accesibilidad y Ergonomía Móvil para pen.dev

1. **Zonas de Alcance con el Pulgar (Thumb Zone):**
   - Todas las acciones primarias ("Agregar al carrito", "Finalizar compra", navegación de tabs) deben ubicarse en el tercio inferior de la pantalla.
2. **Targets Táctiles Mínimos:**
   - Ningún elemento interactivo (botones, iconos de cierre, radios, flechas) debe medir menos de **48 × 48 px**.
3. **Safe Areas:**
   - Diseñar las pantallas contemplando un recorte superior de 48 px (Status bar / Dynamic Island) y un recorte inferior de 34 px (Home indicator).

---

## 5. Lista Priorizada de Pantallas para Rediseño en pen.dev

| Prioridad | Pantalla | Objetivo de Rediseño |
|---|---|---|
| **P1** | **Catálogo y Filtros (`/main/catalog`)** | Elevar la estética visual del listado de instrumentos y la hoja modal de filtros. |
| **P2** | **Ficha de Detalle de Producto (`/products/:id`)** | Diseñar una experiencia inmersiva para instrumentos (galería múltiple, selector de cantidad, especificaciones, reseñas). |
| **P3** | **Inicio / Storefront (`/main/home`)** | Fortalecer la bienvenida de marca con banner hero musical, categorías visuales y destacados. |
| **P4** | **Carrito y Resumen de Compra (`/main/cart`, `/checkout`)** | Optimizar la claridad financiera, cálculo de envío y confianza del usuario. |
| **P5** | **Autenticación (Login / Registro / 2FA)** | Modernizar la experiencia de inicio de sesión y el desafío en dos pasos. |
| **P6** | **Seguridad y Perfil (`/profile/security`, `/main/profile`)** | Transformar la pantalla cruda de 2FA en un panel de seguridad moderno y consistente. |
| **P7** | **Historial y Detalle de Pedidos (`/main/orders`, `/orders/:id`)** | Pulir la línea de tiempo de entrega y el desglose de productos comprados. |
