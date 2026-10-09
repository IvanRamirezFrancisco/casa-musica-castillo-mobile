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
