# DATOS DE PRUEBA

Los datos son sintéticos, reproducibles y no contienen secretos. URLs e IDs no sensibles se configuran como GitHub Variables; contraseñas, tokens y credenciales se suministran únicamente mediante GitHub Secrets del ambiente `testing`. Ningún fixture versionado representa una cuenta real.

| CLASE | HU / PF / PS | DATOS | SUITE / WORKFLOW | AMBIENTE | PROCEDENCIA Y USO |
|---|---|---|---|---|---|
| DATOS VÁLIDOS | HU-01–04, PF de formularios | `qa@example.test`, contraseña literal `demo-only` | Specs auth y Maestro / CI, Acceptance | DEMO local | Valores de formulario; la app actual no los envía ni autentica en backend |
| DATOS INVÁLIDOS | HU-01–03, validación cliente | correo vacío, formato inválido, campos requeridos ausentes | Specs auth / CI, Regression | DEMO local | Construidos por cada spec para conservar claridad del caso |
| DATOS VÁLIDOS | HU-05–07 | productos DEMO, categorías, orden y texto de búsqueda | `catalog.page.spec.ts` / CI | DEMO local | Catálogo en memoria incorporado en `develop`; no es respuesta REST |
| DATOS LÍMITE | HU-06, PS-HU06 | búsqueda vacía, sin resultados, caracteres tratados como texto | Catálogo / CI | DEMO local | Cobertura de filtrado UI; límites del servidor siguen pendientes |
| DATOS VÁLIDOS | HU-09–11 | Guitarra Yamaha, cantidades, entrega tienda/domicilio, transferencia, totales | Servicios/cart/checkout, integración y Maestro / CI, Integration, Acceptance | DEMO local | `DemoCheckoutStateService`; no acredita stock/precio servidor ni pago |
| DATOS LÍMITE | HU-09–10 | incremento/decremento, eliminación y carrito vacío | Specs cart/servicio / CI, Regression | DEMO local | Casos locales; límites y recálculo del backend siguen pendientes |
| DATOS VÁLIDOS | HU-12–14 | pedidos `DEMO-*` y `Usuario Demo` | `DemoAccountStateService`, páginas y Maestro | DEMO local | Conjunto estable en memoria; no demuestra aislamiento entre usuarios |
| DATOS DE SEGURIDAD | HU-01–14, PS aplicables | token ausente/inválido, ID inexistente `9223372036854775807`, respuesta 401/403/404 | Colección Postman / Integration manual | Backend testing autorizado | Token/cuenta se inyectan por Secrets; ID no sensible por Variable/valor por defecto |
| DATOS VÁLIDOS | HU-01–14 según suite API | cuenta sintética ROLE_USER, `API_USER_ID`, email de testing | `PUBLIC_CONTRACT`, `AUTHENTICATED_CONTRACT`, `LOGIN_CONTRACT` | Backend testing autorizado | Nunca se versionan credenciales; colección no guarda cuerpos sensibles |
| DATOS DE SEGURIDAD | Quality Gate | seis check-runs sintéticos exitosos | `tests/fixtures/quality-gate/all-success.json` | Validación local/CI | Verifica el evaluador sin llamar GitHub ni suplantar resultados reales |
| DATOS VÁLIDOS / LÍMITE | HU-04–06 | endpoint real de catálogo, 2–5 VUs LOAD; 5→10→20 VUs STRESS | k6 / Performance manual | Solo testing autorizado | URL/origen por Variables; máximo 20 VUs; no producción |

## Reglas de mantenimiento

- Cada prueba debe restaurar estado o crear un estado nuevo; Maestro usa `clearState: true` por flujo.
- Datos repetidos permanecen junto a la prueba cuando centralizarlos reduciría legibilidad. Los servicios DEMO son la fuente compartida de carrito/pedidos/perfil.
- Para API, el runner crea un environment efímero con permiso `0600` y lo elimina al finalizar.
- Los reportes no guardan contraseñas, tokens, cookies ni cuerpos de autenticación.
- `k6 inspect` usa `example.invalid` y no realiza tráfico; no genera datos de rendimiento.
- Incorporar fixtures de backend solo después de disponer de un ambiente y una cuenta sintética autorizados.
