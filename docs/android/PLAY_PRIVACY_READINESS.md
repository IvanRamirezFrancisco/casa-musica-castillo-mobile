# Privacidad y Google Play: preparación técnica

Actualización 2B (3 de noviembre): [matriz factual y checklist vigente](../privacy/FACTUAL_MATRIX.md) y [procedimiento privado de firma](UPLOAD_KEY_RUNBOOK.md). El titular confirmó responsable legal/representación/contacto y URL públicas pendientes; esta preparación 2A no sustituye esas confirmaciones. La nueva preferencia local solo guarda versión/booleano de presentación, no JWT ni consentimiento comercial.

Documento de trabajo, no política legal publicada. No se interactuó con Play Console ni se creó aplicación remota. Identidad/documentos, teléfono y dispositivo permanecen pendientes de confirmación por Google según lo informado por el titular.

## Inventario y límites

| Información | Capacidad observada / tratamiento pendiente de comprobar |
|---|---|
| Registro | Formularios/contratos de nombre, correo y contraseña; verificar transmisión y correo en backend aislado |
| Perfil/contacto/direcciones | Módulos existentes; no se ejercieron endpoints privados de producción |
| Catálogo | GET públicos transmiten información técnica de red; esta fase solo leyó categorías/productos |
| Carrito/favoritos/cotización/pedidos | Estado, fixtures y contratos; persistencia comercial exige aceptación posterior |
| Sesión | `MemorySessionStore` conserva JWT/identidad solo en memoria, sin localStorage/sessionStorage/Preferences; la persistencia cifrada Android sigue pendiente en TT-05 |
| Datos locales | Estado/preferencias/WebView deben probarse en logout/backup; las nuevas políticas excluyen dominios de datos |
| Logs | Contenido/acceso/retención de logs servidor y console propia por inventariar; desactivar logging Capacitor no prueba ausencia total |
| Terceros | Hosting Render y correo/pagos según configuración efectiva; no asumir activos todos los proveedores soportados |

Un campo/fixture no demuestra recopilación efectiva ni ausencia de transmisión. No se realizaron altas, correos, pagos o pedidos comerciales para este inventario. No se añade telemetría.

## Decisiones y aceptación pendientes

- Confirmar responsable/contacto, finalidades, categorías, destinatarios, transferencias, medidas, retención y excepciones de eliminación con negocio/backend/proveedores.
- Revisar política pública HTTPS sin login y aviso dentro de la app, antes de publicar un texto legal. [Política de Google Play](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).
- Definir consentimiento cuando corresponda, versión/registro, acceso, rectificación, ARCO y Opt-Out con comportamiento verificable; no una casilla cosmética.
- Implementar/probar eliminación dentro de la app y recurso web para solicitarla, con retenciones justificadas. Ambas vías son necesarias cuando la app permite crear cuentas. [Eliminación](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).
- Completar Data Safety después de verificar transmisiones, datos compartidos, propósitos, obligatoriedad, cifrado y eliminación en cliente/backend/SDK. Incluye transmisiones del WebView controlado. [Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).
- Preparar cuentas sintéticas y credenciales de revisión por canal privado, resolviendo MFA/expiración; nunca secretos en Git/PR.
- Preparar capturas fieles al producto conectado, iconos, clasificación, contacto y metadatos; no presentar fixtures como comercio aceptado.

## Distribución consultada

El requisito consultado para apps nuevas/actualizaciones es target API 36 y se conserva 36. [API objetivo](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en). Los paquetes locales no contienen `.so`; repetir al cambiar plugins/SDK y comprobar dispositivos con páginas de 16 KB. [Android: tamaño de página](https://developer.android.com/guide/practices/page-sizes).

Las cuentas personales nuevas requieren al menos 12 participantes inscritos continuamente durante 14 días en prueba cerrada antes de solicitar acceso a producción; no garantiza aprobación. [Pruebas requeridas](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-419). La entrega académica del 26 de noviembre no sustituye esos plazos ni verificaciones.

Faltan firma autorizada, aceptación Release en Android, staging aislado, sesión segura y decisiones de privacidad. AAB técnico sin firma no está listo para Play. Etapas 2B/3A/3B/3C/4 son trabajo futuro y no se ejecutan automáticamente.
