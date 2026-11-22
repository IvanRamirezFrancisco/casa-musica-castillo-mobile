# Validación móvil con el backend consolidado

Fecha: 20 de noviembre de 2026. Rama móvil: `feature/pen-dev-ui-unification`; HEAD inicial conservado `c9e7258cf09b1a155dc0cd1340129bfae3412a29`. Los cambios locales del rediseño se mantienen para revisión.

Entorno utilizado: Angular Development `http://localhost:4200`, Spring Boot `http://localhost:8080` desde la carpeta original `segundo proyecto`, rama `fix/account-activation-hardening`, PostgreSQL aislado `127.0.0.1:55439/cmc_development` y Mailpit 1025/8025. Se inspeccionaron los módulos realmente servidos por Angular: seleccionan `developmentEnvironment` con `localhost:8080`; no se cambiaron las opciones de Production.

## Correcciones acotadas

- `connected-login.page.ts`: usa el retorno de la URL actual, capturado al enviar las credenciales; mantiene esa intención durante MFA y descarta snapshots antiguos de Ionic. Login normal y confirmación de cambio de contraseña vuelven a Inicio después de autenticar.
- `auth.guard.ts`: rutas internas conocidas, sin bucles de autenticación/open redirects; una sesión vencida no conserva automáticamente el destino privado de la vista saliente. Se conserva el retorno de una entrada protegida intencional de invitado.
- `account-security.page.ts/html`: diferencia “Contrato incompatible” de un error temporal. No fuerza `passwordChangeAvailable()` ni debilita la comprobación de revocación.
- Pruebas de regresión para snapshot obsoleto, confirmación de contraseña, retorno tras MFA y contrato incompatible/reintento.

La prueba real autorizada obtuvo HTTP 200 en `/api/users/security-settings` con `data.passwordChangeRevokesSessions: true`; sin sesión, 401. El servidor histórico que ocupaba antes 8080 no incluía ese campo. Se sustituyó por el checkout actualizado sin usar Railway.

Se conservaron la pantalla de éxito centrada, el contador de seis segundos, limpieza al salir, botón manual, datos privados, formularios, validadores y MFA. No se reconstruyeron Registro, Login, Perfil ni Seguridad; no se modificaron Catálogo, Pedidos, Carrito, Favoritos ni Android en esta continuación.

## Resultados

| Grupo | Resultado |
|---|---|
| Navegación y sesión | 54/54 |
| Perfil, Seguridad, repositorio y Recuperación | 51/51; 105/105 específicas junto al grupo anterior |
| Integración, confirmación final | 268/268 |
| Regresión final | 281/281 |
| Suite completa final | 910/911: fallo intermitente previo de búsqueda compacta en `public-catalog.integration.spec.ts:393` |
| Lint | Aprobado |
| Builds Development y Production | Aprobados |
| `test:build-config` | 9/9 |
| Backend completo, PostgreSQL y empaquetado | 239/239, sin omisiones |

Los logs `dist/consolidation-*` conservan los intentos, incluidos un 266/268 bajo carga por Catálogo y la espera fija DEMO de Pedidos. La repetición controlada de integración aprobó ambas pruebas sin cambios. No se eliminó ni relajó ninguna aserción; el fallo de Catálogo en la suite completa permanece reportado.

La aceptación HTTP real comprobó registro/activación por OTP y enlace, capacidades, cambio autenticado concurrente con un solo éxito, dos JWT antiguos rechazados con 401, una notificación HTML/texto en Mailpit, Login con contraseña nueva y MFA, recuperación concurrente sin correo duplicado, respuesta neutral, consumo único del enlace y revocación. No se presenta esa prueba API como un E2E visual del navegador.

La automatización visual estuvo restringida: quedan para revisión manual Login→Inicio, retorno intencional tras MFA, tarjeta y formulario en Seguridad, contador 6→0, Back Android, responsive 320–1280 px, texto ampliado y correo en Mailpit. No se generaron capturas nuevas ni se afirmó prueba en Android físico/Gmail/Outlook.

## Arranque

En la carpeta móvil:

```powershell
npm start -- --configuration development --port 4200
```

En la carpeta original del backend, con su PostgreSQL aislado y Mailpit preparados:

```powershell
python scripts/prepare-local.py
mvn spring-boot:run "-Dspring-boot.run.profiles=local"
```

Informe completo, respaldos y restauración: `C:\Users\ivanf\Documents\7mo\Proyecto del login original y funcional\segundo proyecto\docs\LOCAL_CONSOLIDATION.md`. No hubo push, merge, despliegue ni cambios productivos. La promoción sigue pendiente de CI, fallo intermitente, revisión visual y los gates de seguridad aplicables.
