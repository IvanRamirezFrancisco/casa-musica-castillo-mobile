# TRAZABILIDAD — ACTUALIZACIÓN VERIFICABLE 12/10/2026

Los casos PF/PS del registro conservado abajo siguen siendo el contrato de aceptación. **PASS de una prueba DEMO no cambia su estado a APROBADO**. Los IDs `API-*` identifican verificaciones parciales del contrato externo; no reemplazan `PF-*`/`PS-*`. Ninguna HU se cierra por esta matriz.

## TT-04 — TRAZABILIDAD DE NAVEGACIÓN (25/10/2026)

| Criterio TT-04 | Evidencia automatizada | Límite |
|---|---|---|
| Entrada, splash y cinco tabs | `app.routes.integration.spec.ts`, `main-navigation.component.spec.ts` | Rutas/componentes reales; no autenticación |
| Búsqueda/categoría y atrás/adelante | `catalog.page.spec.ts`, `app.routes.integration.spec.ts` | Filtrado DEMO, q/categoria públicos, replaceUrl |
| Favoritos | `home.page.spec.ts`, `app.routes.integration.spec.ts` | Página informativa, sin colección compartida/persistida |
| Producto | `app.routes.integration.spec.ts`, `catalog.page.spec.ts` | IDs enteros positivos seguros; datos DEMO; HU-07 pendiente |
| Pedido | `order-detail.page.spec.ts`, servicio existente, integración de rutas | Validación existente; autorización real pendiente |
| Perfil/checkout secundarios | Specs existentes ampliados e integración de rutas | Solo dirección de retorno; lógica funcional conservada |
| Ruta desconocida | `app.routes.integration.spec.ts` | NotFound conserva URL, destino fijo a Inicio |
| Android API 36 y botón físico | `.maestro/navigation-demo.yaml` y flujos previos | Resultado ejecutado en [TT04_NAVIGATION.md](TT04_NAVIGATION.md) |

Fuera de alcance: autenticación, sesión, guards, APIs de producto/favoritos, persistencia, backend y App Links externos. Las pruebas no cierran HU-07/HU-08 ni demuestran seguridad de autorización.

## AUTOMATIZACIÓN ACTUAL Y BRECHAS

Rutas de specs relativas a `src/app/`; JUnit/cobertura en CI. Maestro produce evidencia de UI DEMO. API/k6 requieren ambiente autorizado. Todos los tipos de prueba se definen en [TEST_PLAN](TEST_PLAN.md), herramientas en [TEST_TOOLS](TEST_TOOLS.md) e iteraciones en [TEST_SCHEDULE](TEST_SCHEDULE.md).

| HU / XP | CRITERIO PF RELACIONADO | UNITARIAS / INTEGRACIÓN EXISTENTE O AÑADIDA | ACEPTACIÓN / API / RENDIMIENTO | ESTADO REAL / SEGURIDAD |
|---|---|---|---|---|
| 01 / XP1 | PF-HU01-03; 01 pendiente servidor | features/auth/login/login.page.spec.ts | auth-demo; API-HU01-01/02/03 | Formulario/demo; token/sesión/HTTPS PS pendientes |
| 02 / XP1 | PF-HU02-02/03 parcial | features/auth/register/register.page.spec.ts | auth-demo visita registro | No registro real ni logs/validación servidor comprobados |
| 03 / XP1 | PF-HU03-02 | features/auth/forgot-password/forgot-password.page.spec.ts | auth-demo visita recuperación | No envío/token temporal/enumeración comprobados |
| 04 / XP2 | PF-HU04-01/02 parcial | features/home/home.page.spec.ts, layout/main-navigation | auth-demo e Inicio | Contenido demo; PS de sesión/rutas pendientes |
| 05 / XP2 | PF-HU05-01/03 contrato parcial | catalog.page.spec.ts; routing TT-04; catálogo DEMO | API-HU05-01; k6 LOAD/STRESS | Contrato preparado sin ejecutar; errores/sensible PS pendientes |
| 06 / XP2 | PF-HU06-02 contrato parcial | Filtros DEMO q/categoria; integración routing TT-04 | API-HU06-01; k6 agrupado catálogo | Falta inyección/límites/búsqueda con fixture positiva |
| 07 / XP3 | PF-HU07-02 contrato | Ruta /products/:id DEMO; integración TT-04 | API-HU07-01/02 | 400/404 preparados; contenido remoto inseguro pendiente |
| 08 / XP3 | PF-HU08-01–04 | Ruta /favorites informativa; integración TT-04 | navigation-demo; funcionalidad pendiente | PS autenticación/aislamiento usuarios pendiente |
| 09 / XP4 | PF-HU09-03 parcial; 01/02 pendientes | core/services/demo-checkout-state.service.spec.ts | purchase-demo usa carrito precargado; API-HU09-01/02 | No agregar real ni stock/precio servidor; PS pendiente |
| 10 / XP4 | PF-HU10-01/02/03; 04 estado vacío parcial | cart.page.spec.ts, critical.integration.spec.ts, demo-checkout-state.service.spec.ts | purchase-demo | PASS solo cantidades/totales demo; límites/propiedad servidor pendientes |
| 11 / XP4 | PF-HU11-02; 01/04 demo parcial | checkout/**/*.spec.ts, critical.integration.spec.ts | purchase-demo | No checkout servidor/idempotencia; PS pendiente |
| 12 / XP5 | PF-HU12-01/02 demo parcial | orders/orders.page.spec.ts, demo-account-state.service.spec.ts | account-demo; API-HU12-01 solo deniega administración | No endpoint pedidos propios; aislamiento pendiente |
| 13 / XP5 | PF-HU13-01/02 demo parcial | orders/order-detail/order-detail.page.spec.ts | account-demo | IDs del conjunto demo; autorización servidor pendiente |
| 14 / XP5 | PF-HU14-02/03 parcial | profile/**/*.spec.ts, critical.integration.spec.ts, demo-account-state.service.spec.ts | account-demo; API-HU14-01/02 | Validación/copia local; persistencia/PS pendientes |

**ANÁLISIS DE CÓDIGO ESTÁTICO:** transversal a HU-01–14 mediante lint/compiler y Security; aplica al código que existe, no demuestra funcionalidades ausentes.

**PRUEBAS DE REGRESIÓN:** `test:regression` reutiliza auth/inicio/carrito/checkout/pedidos/perfil/servicios en ese orden de prioridad conceptual. Catálogo/búsqueda/favoritos se mantienen como brecha. Android reutiliza los tres flujos Maestro, sin copiar código.

**PRUEBAS DE RENDIMIENTO / PRUEBAS DE ESFUERZO / ESTRÉS:** se agrupan HU-04/05/06 por el endpoint de catálogo real. No se asignan a login/pedido si eso implicara inventar endpoints o generar transacciones. Ampliar en XP4/5 después de validar contrato y permisos. Guardar requests, error rate, p90/p95 y fases recuperación; inspección sintáctica ≠ carga ejecutada.

## REGISTRO DE EVIDENCIA

Para cada ejecución: ID de prueba, criterio, HU, SHA, fecha, responsable, ambiente/fixture, comando, resultado PASÓ/FALLÓ/BLOQUEADO, run y artifact. Usar [VALIDATION_REPORT.md](VALIDATION_REPORT.md) para esta rama. PF/PS que dependen de servidor siguen PENDIENTES hasta ejecutarse contra el ambiente real autorizado. No inventar porcentaje de casos aprobados a partir de cobertura de código.

En Word/PDF presentar actividades de prueba EN MAYÚSCULAS y con color de fuente diferente (azul #1F4E79).

---

## REGISTRO DE CRITERIOS PF/PS CONSERVADO

# Matriz de Trazabilidad de Pruebas

## Casa de Música Castillo - Aplicación Móvil

## 1. Propósito

Esta matriz relaciona las Historias de Usuario con sus pruebas funcionales y de seguridad.

Su objetivo es demostrar la trazabilidad entre:

```text
Historia de Usuario
        ↓
Criterios de aceptación
        ↓
Pruebas PF / PS
        ↓
Resultado
        ↓
Evidencia
```

---

## 2. Convenciones

Prueba funcional:

```text
PF-HUXX-YY
```

Prueba de seguridad:

```text
PS-HUXX-YY
```

Estados posibles:

- PENDIENTE
- APROBADA
- FALLIDA
- BLOQUEADA

---

## 3. Matriz general

| HU    | Funcionalidad              | Pruebas funcionales     | Pruebas de seguridad    | Estado    |
| ----- | -------------------------- | ----------------------- | ----------------------- | --------- |
| HU-01 | Inicio de sesión           | PF-HU01-01 a PF-HU01-04 | PS-HU01-01 a PS-HU01-05 | PENDIENTE |
| HU-02 | Registro                   | PF-HU02-01 a PF-HU02-04 | PS-HU02-01 a PS-HU02-04 | PENDIENTE |
| HU-03 | Recuperación de contraseña | PF-HU03-01 a PF-HU03-03 | PS-HU03-01 a PS-HU03-04 | PENDIENTE |
| HU-04 | Pantalla de inicio         | PF-HU04-01 a PF-HU04-03 | PS-HU04-01 a PS-HU04-03 | PENDIENTE |
| HU-05 | Catálogo                   | PF-HU05-01 a PF-HU05-04 | PS-HU05-01 a PS-HU05-03 | PENDIENTE |
| HU-06 | Búsqueda                   | PF-HU06-01 a PF-HU06-03 | PS-HU06-01 a PS-HU06-04 | PENDIENTE |
| HU-07 | Detalle de producto        | PF-HU07-01 a PF-HU07-03 | PS-HU07-01 a PS-HU07-03 | PENDIENTE |
| HU-08 | Favoritos                  | PF-HU08-01 a PF-HU08-04 | PS-HU08-01 a PS-HU08-03 | PENDIENTE |
| HU-09 | Agregar al carrito         | PF-HU09-01 a PF-HU09-03 | PS-HU09-01 a PS-HU09-03 | PENDIENTE |
| HU-10 | Administrar carrito        | PF-HU10-01 a PF-HU10-04 | PS-HU10-01 a PS-HU10-03 | PENDIENTE |
| HU-11 | Checkout                   | PF-HU11-01 a PF-HU11-04 | PS-HU11-01 a PS-HU11-04 | PENDIENTE |
| HU-12 | Mis pedidos                | PF-HU12-01 a PF-HU12-03 | PS-HU12-01 a PS-HU12-03 | PENDIENTE |
| HU-13 | Detalle de pedido          | PF-HU13-01 a PF-HU13-03 | PS-HU13-01 a PS-HU13-03 | PENDIENTE |
| HU-14 | Perfil                     | PF-HU14-01 a PF-HU14-04 | PS-HU14-01 a PS-HU14-04 | PENDIENTE |

---

## 4. Casos de prueba

### HU-01 - Inicio de sesión

| ID         | Tipo      | Objetivo                                        |
| ---------- | --------- | ----------------------------------------------- |
| PF-HU01-01 | Funcional | Iniciar sesión con credenciales válidas         |
| PF-HU01-02 | Funcional | Validar credenciales incorrectas                |
| PF-HU01-03 | Funcional | Validar campos obligatorios y formato de correo |
| PF-HU01-04 | Funcional | Manejar error de API o red                      |
| PS-HU01-01 | Seguridad | Verificar que la contraseña no se almacene      |
| PS-HU01-02 | Seguridad | Impedir acceso privado sin sesión               |
| PS-HU01-03 | Seguridad | Rechazar token inválido o expirado              |
| PS-HU01-04 | Seguridad | Comprobar uso de HTTPS                          |
| PS-HU01-05 | Seguridad | Comprobar almacenamiento seguro de sesión       |

### HU-02 - Registro

| ID         | Tipo      | Objetivo                                 |
| ---------- | --------- | ---------------------------------------- |
| PF-HU02-01 | Funcional | Registrar usuario con datos válidos      |
| PF-HU02-02 | Funcional | Validar campos obligatorios              |
| PF-HU02-03 | Funcional | Validar formatos y errores de API        |
| PF-HU02-04 | Funcional | Mostrar confirmación correcta            |
| PS-HU02-01 | Seguridad | Evitar exposición de contraseña          |
| PS-HU02-02 | Seguridad | Rechazar campos manipulados              |
| PS-HU02-03 | Seguridad | Verificar HTTPS                          |
| PS-HU02-04 | Seguridad | Evitar exposición de información interna |

### HU-03 - Recuperación de contraseña

| ID         | Tipo      | Objetivo                                        |
| ---------- | --------- | ----------------------------------------------- |
| PF-HU03-01 | Funcional | Solicitar recuperación correctamente            |
| PF-HU03-02 | Funcional | Validar formato del correo                      |
| PF-HU03-03 | Funcional | Manejar error de API                            |
| PS-HU03-01 | Seguridad | Evitar enumeración de cuentas                   |
| PS-HU03-02 | Seguridad | Evitar exposición de tokens                     |
| PS-HU03-03 | Seguridad | Rechazar token inválido, reutilizado o expirado |
| PS-HU03-04 | Seguridad | Verificar HTTPS                                 |

### HU-04 - Pantalla de inicio

| ID         | Tipo      | Objetivo                            |
| ---------- | --------- | ----------------------------------- |
| PF-HU04-01 | Funcional | Cargar pantalla de inicio           |
| PF-HU04-02 | Funcional | Validar navegación                  |
| PF-HU04-03 | Funcional | Manejar estados de carga y error    |
| PS-HU04-01 | Seguridad | Proteger contenido privado          |
| PS-HU04-02 | Seguridad | Gestionar sesión expirada           |
| PS-HU04-03 | Seguridad | Evitar detalles internos en errores |

### HU-05 - Catálogo

| ID         | Tipo      | Objetivo                                          |
| ---------- | --------- | ------------------------------------------------- |
| PF-HU05-01 | Funcional | Mostrar catálogo                                  |
| PF-HU05-02 | Funcional | Mostrar estado sin productos                      |
| PF-HU05-03 | Funcional | Validar carga, paginación y selección             |
| PF-HU05-04 | Funcional | Manejar error de API                              |
| PS-HU05-01 | Seguridad | Evitar exposición de datos sensibles innecesarios |
| PS-HU05-02 | Seguridad | Mostrar errores controlados                       |
| PS-HU05-03 | Seguridad | Validar parámetros e identificadores              |

### HU-06 - Búsqueda

| ID         | Tipo      | Objetivo                                       |
| ---------- | --------- | ---------------------------------------------- |
| PF-HU06-01 | Funcional | Buscar productos con resultados                |
| PF-HU06-02 | Funcional | Buscar productos sin resultados                |
| PF-HU06-03 | Funcional | Manejar error de API                           |
| PS-HU06-01 | Seguridad | Procesar caracteres especiales de forma segura |
| PS-HU06-02 | Seguridad | Evitar ejecución de HTML o JavaScript          |
| PS-HU06-03 | Seguridad | Limitar entradas excesivas                     |
| PS-HU06-04 | Seguridad | Evitar detalles internos en errores            |

### HU-07 - Detalle de producto

| ID         | Tipo      | Objetivo                              |
| ---------- | --------- | ------------------------------------- |
| PF-HU07-01 | Funcional | Consultar producto válido             |
| PF-HU07-02 | Funcional | Manejar producto inexistente          |
| PF-HU07-03 | Funcional | Comprobar acciones disponibles        |
| PS-HU07-01 | Seguridad | Validar identificador manipulado      |
| PS-HU07-02 | Seguridad | Evitar ejecución de contenido remoto  |
| PS-HU07-03 | Seguridad | Evitar información interna en errores |

### HU-08 - Favoritos

| ID         | Tipo      | Objetivo                           |
| ---------- | --------- | ---------------------------------- |
| PF-HU08-01 | Funcional | Agregar favorito                   |
| PF-HU08-02 | Funcional | Eliminar favorito                  |
| PF-HU08-03 | Funcional | Sincronizar estado                 |
| PF-HU08-04 | Funcional | Manejar error sin inconsistencias  |
| PS-HU08-01 | Seguridad | Exigir autenticación               |
| PS-HU08-02 | Seguridad | Impedir modificar favoritos ajenos |
| PS-HU08-03 | Seguridad | Rechazar sesión inválida           |

### HU-09 - Agregar al carrito

| ID         | Tipo      | Objetivo                          |
| ---------- | --------- | --------------------------------- |
| PF-HU09-01 | Funcional | Agregar producto válido           |
| PF-HU09-02 | Funcional | Validar cantidad y disponibilidad |
| PF-HU09-03 | Funcional | Actualizar indicador del carrito  |
| PS-HU09-01 | Seguridad | Evitar manipulación de precios    |
| PS-HU09-02 | Seguridad | Validar cantidades en backend     |
| PS-HU09-03 | Seguridad | Proteger carrito del usuario      |

### HU-10 - Administración del carrito

| ID         | Tipo      | Objetivo                              |
| ---------- | --------- | ------------------------------------- |
| PF-HU10-01 | Funcional | Modificar cantidad                    |
| PF-HU10-02 | Funcional | Eliminar producto                     |
| PF-HU10-03 | Funcional | Recalcular totales                    |
| PF-HU10-04 | Funcional | Manejar carrito vacío o error         |
| PS-HU10-01 | Seguridad | Impedir acceso a carrito ajeno        |
| PS-HU10-02 | Seguridad | Validar stock y cantidad en servidor  |
| PS-HU10-03 | Seguridad | Evitar manipulación de precio o total |

### HU-11 - Checkout

| ID         | Tipo      | Objetivo                                 |
| ---------- | --------- | ---------------------------------------- |
| PF-HU11-01 | Funcional | Completar checkout válido                |
| PF-HU11-02 | Funcional | Validar campos requeridos                |
| PF-HU11-03 | Funcional | Manejar cambios de stock o errores       |
| PF-HU11-04 | Funcional | Verificar generación del pedido          |
| PS-HU11-01 | Seguridad | Exigir autenticación                     |
| PS-HU11-02 | Seguridad | Validar precios y totales en servidor    |
| PS-HU11-03 | Seguridad | Evitar pedidos duplicados                |
| PS-HU11-04 | Seguridad | Evitar almacenamiento de datos sensibles |

### HU-12 - Mis pedidos

| ID         | Tipo      | Objetivo                         |
| ---------- | --------- | -------------------------------- |
| PF-HU12-01 | Funcional | Listar pedidos                   |
| PF-HU12-02 | Funcional | Mostrar estado vacío             |
| PF-HU12-03 | Funcional | Manejar error de API             |
| PS-HU12-01 | Seguridad | Exigir autenticación             |
| PS-HU12-02 | Seguridad | Impedir acceso a pedidos ajenos  |
| PS-HU12-03 | Seguridad | Limitar información de respuesta |

### HU-13 - Detalle de pedido

| ID         | Tipo      | Objetivo                                |
| ---------- | --------- | --------------------------------------- |
| PF-HU13-01 | Funcional | Mostrar pedido propio                   |
| PF-HU13-02 | Funcional | Manejar identificador inexistente       |
| PF-HU13-03 | Funcional | Manejar error de API                    |
| PS-HU13-01 | Seguridad | Impedir consulta de pedido ajeno        |
| PS-HU13-02 | Seguridad | Exigir autenticación                    |
| PS-HU13-03 | Seguridad | Evitar información sensible innecesaria |

### HU-14 - Perfil

| ID         | Tipo      | Objetivo                                   |
| ---------- | --------- | ------------------------------------------ |
| PF-HU14-01 | Funcional | Consultar perfil                           |
| PF-HU14-02 | Funcional | Modificar campo permitido                  |
| PF-HU14-03 | Funcional | Validar datos inválidos                    |
| PF-HU14-04 | Funcional | Comprobar persistencia                     |
| PS-HU14-01 | Seguridad | No exponer contraseña, token o secretos    |
| PS-HU14-02 | Seguridad | Rechazar modificación de campos protegidos |
| PS-HU14-03 | Seguridad | Impedir acceso a perfil ajeno              |
| PS-HU14-04 | Seguridad | Verificar HTTPS                            |

---

## 5. Registro de ejecución

Cuando una prueba se ejecute se podrá registrar:

```text
ID:
HU:
Fecha:
Responsable:
Precondición:
Resultado esperado:
Resultado obtenido:
Estado:
Evidencia:
Commit/PR:
Observaciones:
```

---

## 6. Mantenimiento

La matriz deberá actualizarse cuando:

- se agregue una Historia de Usuario;
- cambien criterios de aceptación;
- aparezcan nuevas pruebas;
- se eliminen pruebas;
- se automatice una prueba previamente manual.

La matriz deberá mantenerse consistente con los GitHub Issues correspondientes.
