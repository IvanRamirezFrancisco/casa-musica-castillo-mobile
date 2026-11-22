# Plan Estratégico de Rediseño — Casa de Música Castillo Mobile

**Fecha:** 15 de noviembre de 2026  
**Área:** Arquitectura Frontend, UI/UX & Design Systems  
**Herramienta de diseño objetivo:** pen.dev  
**Objetivo:** Establecer una hoja de ruta por etapas para modernizar visual y ergonómicamente la aplicación en pen.dev y planificar su posterior implementación sin romper funcionalidades, modelos de datos ni cobertura de pruebas.

---

## 1. Principios Rectores y Restricciones Técnicas

1. **Preservación Estricta de Identidad:**
   - Se mantiene inalterable la tríada de color: **Burdeos (`#722f37`)**, **Dorado (`#c5a059`)** y **Fondo Crema Cálido (`#fcfaf7`)**.
   - No se adoptan paletas frías (grises azulados o negros puros `#000000`) ajenas a la tradición de la marca.
2. **Compatibilidad con Ionic 9 y Capacitor 8.5:**
   - Toda propuesta visual debe ser viable con el motor de componentes de Ionic (evitar layouts que rompan el scroll nativo de `ion-content` o los insets de `ion-header`).
   - La barra inferior flotante (**Bubble Navigation**) debe respetar la geometría validada: altura 64 px, ancho máximo 448 px y reserva inferior `--cmc-bubble-nav-offset`.
3. **Cero Regresiones Funcionales:**
   - La suite de **587 pruebas unitarias e integración en Vitest** debe mantenerse 100% aprobada.
   - No se alterarán nombres de controles de formularios reactivos (`loginForm`, `registerForm`, `codeForm`), ni selectores de datos accesibles (`aria-label`, `role="radiogroup"`, `output`).
4. **Separación de Responsabilidades:**
   - Las etapas actuales son de **análisis y diseño en pen.dev**. Ningún código productivo se modifica hasta que los mockups y flujos sean aprobados por el equipo.

---

## 2. Hoja de Ruta por Fases en pen.dev

### Fase 1: Creación del Design System en pen.dev (Días 1 a 3)
- [ ] Importar los design tokens desde `docs/design-audit/DESIGN_TOKENS.json`.
- [ ] Configurar estilos de color (Brand, Surfaces, Text, Semantic, Borders).
- [ ] Configurar estilos de texto con las familias tipográficas Google Fonts **Montserrat** y **Roboto**.
- [ ] Modelar componentes atómicos con sus variantes y estados interactivos:
  - `cmc-button` (Primary, Secondary, Ghost, Compact, FullWidth, Loading, Disabled).
  - `cmc-input` (Text, Email, Password con toggle de ojo, Tel, Number, Search, Estado Error).
  - `cmc-badge` (Neutral, Success, Warning, Error con color-mix).
  - `cmc-quantity` (+ / - con output).
  - `cmc-loading`, `cmc-empty-state`, `cmc-error-state`.
  - Cápsula flotante `Bubble Navigation` con las 5 pestañas y badge de carrito.

### Fase 2: Experiencia de Descubrimiento y Catálogo (Días 4 a 7)
- [ ] **Home / Inicio:**
  - Rediseñar el banner hero con estética editorial premium de instrumentos musicales.
  - Pulir la grilla de categorías con iconos e imágenes de fondo proporcionales.
  - Presentar la sección de productos destacados con tarjetas uniformes.
- [ ] **Catálogo (`/main/catalog`):**
  - Diseñar la cabecera con buscador en vivo y botón de filtros.
  - Modelar la hoja inferior (Bottom Sheet modal a 85% de altura) para selección de categorías y ordenamiento.
  - Diseñar estados de carga con esqueletos (skeletons) y estado vacío amigable con botón de limpiar filtros.
- [ ] **Ficha de Detalle de Producto (`/products/:id`):**
  - Galería visual con miniatura principal destacada y carrusel de fotografías secundarias.
  - Ficha de disponibilidad en tiempo real, selector de cantidad y botón de compra prominente.
  - Ficha técnica de especificaciones estructurada y sección de reseñas de usuarios.

### Fase 3: Embudo de Conversión (Carrito y Checkout) (Días 8 a 10)
- [ ] **Carrito (`/main/cart`):**
  - Tarjetas de artículos con miniaturas claras de instrumentos, controles táctiles y confirmación sutil de eliminación.
  - Desglose transparente de subtotal, descuentos, impuestos y aviso de envío.
  - Reemplazo visual de los colores directos de advertencia por componentes tokenizados.
- [ ] **Checkout (`/checkout`):**
  - Tarjetas de selección accesibles para método de entrega (Recoger en tienda vs Envíos).
  - Tarjetas de método de pago (Mercado Pago, Transferencia, Tarjeta, Contra entrega).
  - Pantalla de confirmación con folio de orden y diseño de felicitación de alta confianza.

### Fase 4: Autenticación, Perfil y Seguridad (Días 11 a 13)
- [ ] **Autenticación (Login, Registro, Recuperación, Verificación):**
  - Tarjeta de autenticación elevada con jerarquía limpia sobre fondo burdeos suave.
  - Flujo de verificación de dos pasos (2FA) con selección elegante entre Correo y Autenticador.
- [ ] **Seguridad de la Cuenta (`/profile/security`):**
  - Rediseño completo de la interfaz de activación TOTP: visualización clara del código QR con contraste, botón para copiar clave y visor seguro de los 10 códigos de respaldo.
- [ ] **Perfil y Pedidos (`/main/profile`, `/main/orders`):**
  - Cabecera de cuenta con avatar estilizado.
  - Línea de tiempo visual para el seguimiento de pedidos (Confirmado → Preparando → Enviado → Entregado).

---

## 3. Plan de Mitigación de Inconsistencias Técnicas

Durante la posterior implementación frontend de los diseños de pen.dev se ejecutarán las siguientes correcciones sin alterar lógica de negocio:

| Inconsistencia Detectada en Auditoría | Acción Correctiva de Implementación | Archivos Involucrados |
|---|---|---|
| Colores hex `#fff6e0`, `#5c4300` en alertas de carrito y checkout | Reemplazar por `--cmc-warning-surface` y `--cmc-warning-text` | `connected-cart.view.ts`, `connected-checkout.view.ts` |
| Colores hex `#fdecea`, `#7a1c14` en errores de autenticación y carrito | Reemplazar por variables semánticas `--cmc-error` | `connected-login.page.ts`, `connected-cart.view.ts` |
| Estilos planos y crudos en pantalla de seguridad | Reemplazar `<button>` e `<input>` nativos por `<cmc-button>` y `<cmc-input>` | `account-security.page.ts` |
| Estilos en línea con `rgba` y `background: #fff` en edición de perfil | Mover a clases SCSS asociadas a `--cmc-surface` y `--cmc-border` | `edit-profile.page.html` |
| Ausencia de logotipo vectorial propio | Incorporar recurso SVG optimizado para la marca | `splash.page.html`, cabeceras |

---

## 4. Estrategia de Pruebas y Validación Post-Diseño

1. **Pruebas de Regresión Visual:**
   - Validar en navegador y emulador Android a anchos estándar:
     - 320 × 568 px (pantalla ultracompacta / iPhone SE)
     - 360 × 800 px (pantalla estándar Android)
     - 393 × 852 px (pantalla estándar iOS)
     - 412 × 915 px (pantalla grande Android)
     - 768 × 1024 px (tableta vertical)
2. **Verificación de Ergonomía Táctil:**
   - Confirmar que todos los botones e inputs conservan un target mínimo de **48 × 48 px**.
   - Comprobar que ningún elemento de la grilla de productos o carrito queda tapado por la Bubble Navigation en el final del scroll.
3. **Suite Automatizada:**
   - Ejecutar `npm run test` (100% pass en 587 tests).
   - Ejecutar `npm run lint` (0 errores).
   - Ejecutar `npm run build` (verificar presupuestos de tamaño sin alertas excesivas).

---

## 5. Referencia de Capturas Existentes en el Repositorio

El repositorio ya cuenta con capturas de pantalla de la aplicación ejecutándose en Android y navegador, ubicadas en:
- `docs/activity4/android/` (23 capturas: `inicio.png`, `catalogo.png`, `detalle.png`, `filtros.png`, `cantidad.png`, `busqueda.png`, `login.png`, `registro.png`, `recuperacion.png`, `verificacion.png`, `orden.png`, `opiniones.png`, `cart-protegido.png`, etc.).
- `docs/testing/commerce-ui/` (30 capturas con diferentes resoluciones: 320x568, 360x800, 393x852, 412x915, tableta y horizontal).

Estas capturas sirven como base de referencia visual inmediata para contrastar el estado actual contra los nuevos diseños que se elaboren en pen.dev.
