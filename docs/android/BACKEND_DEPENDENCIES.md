# Backend: comprobación pública y dependencias

El 3 de noviembre de 2026 se realizaron únicamente GET públicos contra el origen de producción configurado. No se crearon cuentas, pedidos, correos ni pagos, ni se modificó Render/PostgreSQL.

| Solicitud | Observación |
|---|---|
| `/api/public/categories/active` | HTTP 200 JSON, 10 categorías, campos compatibles con catálogo móvil |
| `/api/public/products/catalog?page=0&size=1` | HTTP 200, un producto paginado compatible con DTO público |
| `/api/public/products/0` | HTTP 404 con cuerpo vacío; no asumir JSON en todos los errores |

curl verificó TLS (`ssl_verify_result=0`). Hubo timeouts iniciales de 25 segundos antes de las respuestas satisfactorias; no se atribuyen sin evidencia a una causa concreta. Los GET respaldan contrato público y origen previsto; no prueban SHA desplegado, contratos privados, pinning ni E2E PostgreSQL. No se publican datos comerciales recibidos.

## Staging pendiente, sin desplegar

Se inspeccionaron de lectura perfiles Spring `local`, `dev` y `production`, controladores pertinentes y correo. Los tests no constituyen staging desplegable. No se modificó el repositorio backend.

En una intervención autorizada posterior: usar el perfil existente apropiado y overrides, PostgreSQL independiente, usuario limitado, datos sintéticos y credenciales/JWT fuera de Git. Comprobar que configuración efectiva de URL/base/usuario no corresponde a producción antes de permitir escrituras.

Seleccionar explícitamente el proveedor SMTP existente hacia captura local/aislada, sin autenticación solo si el capturador local lo admite. No usar proveedor automático con claves comerciales Brevo/Resend/SMTP. Mantener MercadoPago deshabilitado mediante su configuración existente. Verificar HTTPS y CORS del cliente de pruebas. No inventar perfil, REST ni URL remota.

## Dependencias futuras, sin implementación en 2A

| Área | Verificar en entorno aislado |
|---|---|
| Registro/verificación/recuperación | Contratos, validaciones, tokens, expiración y correo capturado |
| Login/MFA EMAIL-TOTP/códigos | Respuestas efectivas, errores y límites |
| JWT / TT-05 | Bearer, expiración, 401, logout y almacenamiento Android cifrado; no asumir refresh token |
| Carrito/favoritos | Persistencia y aislamiento por usuario, distinguida de fixtures |
| Perfil/contacto/direcciones | GET perfil existente; contratos de edición/derechos por verificar |
| Cotizaciones/inventario/pedidos | Reglas comerciales, historial, estados y autorización, sin pagos reales |
| Eliminación/ARCO | Flujo autenticado y vía web, alcance, retención y excepciones por acordar; sin aceptación móvil verificada |

Formularios y mocks no acreditan operación del servicio desplegado. Etapa 3 requiere backend aislado y contratos comprobados.
