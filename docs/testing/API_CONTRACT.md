# CONTRATO DE PRUEBAS API

Inspección de solo lectura: `IvanRamirezFrancisco/backend_`, commit `46bc32d8b0417370ab35e99866cabbeaaf830bba`. La app móvil no consume aún esta API. No se modificó el backend ni se ejecutaron solicitudes contra su despliegue.

| Ruta real | Fuente en `src/main/java/com/security/` | Casos / HU |
|---|---|---|
| GET `/api/public/products/catalog` | controller/PublicProductController.java | 200, página acotada, búsqueda; HU-04/05/06 |
| GET `/api/public/products/{id}` | mismo controlador | 400 ID no numérico; 404 ID ausente; HU-07 |
| POST `/api/auth/login` | controller/AuthController.java, dto/request/LoginRequest.java | 400 datos inválidos; 200 cuenta fixture o desafío 2FA; HU-01 |
| POST `/api/auth/refresh` | controller/AuthController.java | 401 token inválido; HU-01/04 |
| GET `/api/cart` | controller/ShoppingCartController.java | 401 sin sesión, 200 usuario fixture; HU-09/10 |
| GET `/api/users/profile` | controller/UserController.java | 401 token inválido; 200 perfil e ID propio; HU-14 |
| GET `/api/admin/orders` | controller/admin/AdminOrderController.java, config/SecurityConfig.java | 403 con ROLE_USER; no equivale a pedidos propios HU-12/13 |

`SecurityConfig` permite rutas públicas/auth, exige sesión en carrito/perfil y rol ADMIN/SUPER_ADMIN en administración. La colección exige códigos exactos: un 403 en lugar del 401 esperado falla y requiere investigar la configuración desplegada. No se acepta cualquier 4xx como éxito. Las respuestas de error se inspeccionan para detectar trazas Java/SQL. Las respuestas GET no deben exponer campos de secretos.

## Ejecución

Instalar `postman-cli@1.73.0` desde npm oficial. Usar `npm run test:api` con variables de entorno:

| Variable | Uso |
|---|---|
| `API_BASE_URL` | URL HTTPS del backend de pruebas (sin query, credenciales o fragmento) |
| `API_AUTHORIZED_ORIGIN` | Origen exacto autorizado, p.ej. esquema y host del ambiente testing |
| `API_TEST_AUTHORIZED` | `true` únicamente con autorización del propietario |
| `API_TEST_SUITE` | `PUBLIC_CONTRACT`, `AUTHENTICATED_CONTRACT` o `LOGIN_CONTRACT` |
| `API_MISSING_PRODUCT_ID` | ID numérico que la fixture confirma inexistente; por defecto máximo Long positivo |
| `API_USER_TOKEN`, `API_USER_ID` | Token de usuario sintético ROLE_USER e ID esperado, para AUTHENTICATED_CONTRACT |
| `API_TEST_EMAIL`, `API_TEST_PASSWORD` | Cuenta sintética para LOGIN_CONTRACT, almacenada como secretos de testing |

El runner usa un archivo temporal 0600, lo borra al terminar y no pone secretos en argumentos. Ejecuta colección local, sin login de Postman y sin enviar eventos a cloud; produce CLI/JUnit, no exporta cuerpos completos. No usar `--insecure`. Un loopback HTTP se permite solo para validar el arnés local, nunca como evidencia de TLS del backend.

PUBLIC_CONTRACT no requiere credenciales: 8 solicitudes, sin creación de cuentas ni correos. AUTHENTICATED_CONTRACT contiene 3 lecturas: `GET /api/cart` puede crear el carrito vacío del usuario fixture en backend. LOGIN_CONTRACT crea una sesión real del usuario de prueba; no repetir masivamente, respetar límites y no usar cuentas personales. Si requiere 2FA, el 200 demuestra solo el desafío; no intentar eludirlo ni afirmar que existe sesión completa. El token de los otros contratos se suministra separadamente.

## Brechas explícitas

No se encontró controlador de checkout ni rutas de pedidos del cliente; solo administración de pedidos. No inventar `/api/checkout`, `/api/orders` o endpoints de edición de perfil. Se encontraron rutas de carrito/validación, pero su aceptación de cantidades/stock/precio y aislamiento con dos usuarios aún requiere fixtures y autorización de un ambiente dedicado. HU-02/03 requieren validar registro/recuperación sin disparar correos reales; HU-08 requiere pruebas específicas de wishlist. Esos casos PF/PS conservan estado PENDIENTE en la matriz.

No se declara cobertura completa del contrato, aislamiento ni manejo frontend de errores. Añadir casos positivos de detalle con producto conocido y mutaciones controladas de carrito cuando exista fixture reproducible; no usar recursos reales. Para cumplir HU-11–13, acordar primero el contrato de usuario final y la integración móvil. No se modifican dichos contratos en esta rama.
