# Aceptación de staging en el Galaxy A55

1. Confirmar con el operador un origen autorizado, DNS A/AAAA, certificado de confianza y salud desde una red permitida. Repetir desde una red no autorizada y registrar el rechazo.
2. Vincular el despliegue al backend candidato `a7e027d33272e93158a6236b57ce7eff64ed2af1` y a la configuración `f2f6fa1b27f8579c7c0ebdb290c5747f70cac86f`. Usar la red interna de Compose y un volumen nuevo. Antes de iniciar Spring, confirmar que el datasource efectivo apunta al servicio `postgres` y verificar `current_database()`, `current_user` e `inet_server_port()` desde el contenedor dedicado. Cualquier conexión al PostgreSQL habitual de Windows bloquea el ensayo. Verificar Flyway V52 y Mailpit antes de crear cuentas.
3. Confirmar bloqueo de checkout, pagos, administración y webhooks en la pasarela. Preparar dos cuentas sintéticas y un pedido sintético del propietario. Obtener enlaces y códigos por el acceso privado de Mailpit.
4. Compilar mediante la selección staging con el origen verificado y `--isolated`. Registrar firma, huellas, CORS y resultados. Comprobar certificado y versión antes de actualizar una instalación con el mismo ID.

| Caso | Resultado esperado |
|---|---|
| Registro, verificación y sesión | Bloqueo antes de verificar, login tras verificación, persistencia al cerrar y abrir, limpieza tras logout/401. |
| Recuperación | Cambio de contraseña mediante correo capturado. Rechazo de la contraseña anterior y del token reutilizado. |
| MFA EMAIL y TOTP | Código válido permite acceso, código erróneo se rechaza, límites efectivos. TOTP enrolado persiste y se puede desactivar según el flujo autorizado. |
| Favoritos y carrito | Los cambios persisten. La cuenta B no hereda datos de A. Las validaciones responden a cambios autorizados de precio y stock. |
| Perfil y pedidos | A consulta su perfil y su pedido sintético. B no puede consultar el pedido de A. Verificar ID inválido y reintento. |
| Red y límites | Repetir por Wi-Fi sin cable, registrar error y recuperación. Checkout y pagos siguen bloqueados. |

Registrar por caso SHA del APK, revisión del backend, dispositivo, red y resultado. Excluir credenciales, tokens, códigos y datos personales de la evidencia. Las suites de Angular y Postman cubren parte del contrato. La aceptación de esta tabla requiere staging autorizado. OWASP y SonarCloud quedan pendientes antes de promover el candidato.
