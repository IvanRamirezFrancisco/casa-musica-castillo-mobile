# Correcciones de aceptación Android

| Observación | Clasificación y evidencia | Criterio de aceptación |
| --- | --- | --- |
| El CTA de detalle invade la barra de Android | El relleno final del contenido no limitaba su área visible. El detalle reserva el inset inferior de SystemBars. | El control completo se alcanza con navegación por gestos y por tres botones, también en horizontal. |
| El registro y la recuperación reciben enlaces web | Spring Boot emite /verify-account y /reset-password. En Android se puede pegar el enlace o su token. La app extrae el token y llama a su API configurada. | Alta sintética, activación, primer acceso y cambio de contraseña contra el backend aislado. Validar también los formularios en el dispositivo. |
| Los productos muestran valoraciones sin opiniones | Los siete productos del PostgreSQL TT-05 tenían agregados precargados, mientras el listado público devolvía cero. Se sincronizaron solo los siete registros aislados que carecían de reseñas aprobadas. | Catálogo y listado público muestran cero reseñas para esos productos. |
| Fotos ausentes en la APK | Los siete registros aislados incluyen imageUrl. Una URL en el DTO no acredita disponibilidad ni compatibilidad con la política de imágenes. | Validar con una foto aprobada, accesible y permitida. Mantener el fallback accesible. |

## Verificación de los contratos

Spring Boot aislado usó el SHA 9494d60f7b7295daa34dff52d6d671ab990c8e20 y PostgreSQL TT-05 en loopback. Mailpit recibió los enlaces de alta y recuperación. Se usó una instancia de captura adicional restringida a direcciones sintéticas con formato admitido por el validador. La cuenta de prueba se eliminó al finalizar.

- Alta inválida 400. Alta válida 200. Acceso sin verificar 401. Verificación, primer acceso y perfil 200. Alta duplicada 200 con respuesta uniforme.
- Solicitudes para cuenta existente e inexistente 200 con el mismo mensaje. Tokens inválido, expirado y reutilizado 400. Cambio válido 200. JWT y contraseña anteriores 401. Acceso con contraseña nueva y cierre de sesión 200.

Los resultados HTTP corresponden a una cuenta sintética. La aceptación en el Galaxy A55 del nuevo paquete sigue pendiente. El enlace de correo también puede abrirse en el cliente web configurado por Spring Boot cuando esté disponible. El flujo móvil funciona pegando el enlace y no requiere configurar Android App Links.
