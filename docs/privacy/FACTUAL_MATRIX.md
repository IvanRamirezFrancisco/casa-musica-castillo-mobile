# Matriz factual de privacidad y checklist Play — Etapa 2B

3 de noviembre de 2026. Documento técnico, no política legal ni formulario enviado. Base móvil `9177f3f`; backend publicado main `46bc32d8b0417370ab35e99866cabbeaaf830bba`. El checkout backend original `44df7468` tiene cambios pendientes; PR backend #2/#3 abiertos. Se leen esas versiones distinguiéndolas, sin atribuir su estado a producción. No hubo altas, correos, compras, pagos o eliminaciones reales. Los GET públicos de 2A son antecedentes, no nuevas ejecuciones.

**Confirmado por el titular:** el responsable legal y autorización de representación del negocio están pendientes. Ivan Ramirez Software es solo el nombre de su perfil desarrollador. No hay contacto ARCO ni URL públicas de privacidad/eliminación aprobadas. No se inventan identidad legal, correo, domicilio ni conservación.

A: tratamiento implementado en código revisado cuando se ejerce el flujo, sin acreditar E2E comercial. B: modelo/formulario/contrato de integración aún por aceptar. C: fixtures y pruebas sintéticas. D: no verificable sin configuración efectiva o decisiones del responsable. Tests HTTP usan C para comprobar A/B, no PostgreSQL real.

| Flujo / datos | Fuente y clase | Finalidad técnica y candidato Data Safety | Confirmaciones pendientes |
|---|---|---|---|
| Registro: username, nombre/apellidos, email, password y teléfono opcional | A: RegisterInput/HttpAuthRepository; AuthController/UserService/User; C: auth.testing | Cuenta/autenticación; datos personales/contacto/ID/credenciales según definiciones de Play. Contrato exige usuario/nombre/email/password; teléfono opcional móvil | Necesidad, finalidad, retención y proveedor efectivo de correo. PasswordEncoder en código no demuestra operación desplegada |
| Login, MFA, verificación y recuperación: credenciales, desafíos, códigos y tokens | A: AuthService/repositorios, Auth/TwoFactor controllers; C: códigos/JWT sintéticos | Seguridad; no publicidad | Tratamiento/almacenamiento servidor de secretos y códigos, transporte/correo activos. No exportar JWT, hashes, TOTP ni códigos de respaldo |
| Perfil: id, nombre, email, teléfono, flags cuenta/MFA y fechas | A: GET `/api/users/profile`, principal autenticado y profile.validation | Acceso propio parcial; información personal/ID | No hay contrato publicado de PATCH propio encontrado. Métodos internos/update/delete/admin no autorizan autoservicio |
| Direcciones y contacto checkout: envío/facturación, estado/ciudad/CP, autorizados, notas, tipo entrega/pago | B: RealCheckoutInput/PricePreviewInput, contratos de integración; C: checkout DEMO | Entrega/cotización; dirección y compra según operación efectiva, no GPS | Verificar servidor/despliegue/reglas y conservación. Enum CREDIT_CARD/STRIPE no prueba captura de números ni proveedor activo |
| Favoritos: usuario, productos y opciones de aviso soportadas por backend | A: WishlistController/Service/entidad/repositorio; B: comportamiento remoto/avisos | Actividad/personalización y notificaciones si se habilitan | Finalidades/consentimientos/proveedores por aprobar; esta etapa no activa avisos comerciales |
| Carrito: cuenta o identificador de sesión, productos, cantidades, importes/cupones | A: ShoppingCartController/Service y repositorio cliente; C: DEMO en memoria | Función comercial/actividad de app | Retención de carritos anónimos y enlace con cuenta, propiedad y persistencia E2E |
| Pedidos/historial: usuario/folio, fechas, importes, productos y estados pedido/pago/envío | A: entidad Order/relaciones main; B: RealOrder y endpoints de integración no todos publicados en main; C: DemoAccountOrder | Historial de compras/financiera según datos efectivos | Conservación fiscal/comprobantes, procesamiento y destinatarios. Borrar cuenta no implica borrar pedidos |
| Sesión cliente: JWT y usuario | Actualización 3A: Android conectado cifra AuthSession (JWT/exp, id/email/nombres/teléfono/roles/flag MFA) con Keystore/AES-GCM; navegador/iOS/DEMO siguen volátiles. Bearer, `credentials: omit` | Autenticación; no JWT plaintext en localStorage/Preferences; backup/transferencia excluidos. Restauración revalidada por /me | Evidencia aislada y límites en [TT-05](../security/TT05_SESSION.md). Falta aceptación física/Release y revisión del responsable; no demuestra ausencia absoluta de cookies/estado WebView |
| Servidor: JTI, IP, user-agent, actividad, expiración, revocación; auditoría de actor/evento/entidad/fechas | A: ActiveSession/SessionManagementService, AuditLog/Service | Seguridad/identificadores/diagnósticos según fin efectivo | Scheduler revisado corta sesiones revocadas antiguas a 7 días; no es política global ni prueba de ejecución. Retención real de logs/backups/proveedores: D |
| Nueva preferencia `hideContact` | A: repositorio local, clave `cmc.privacy.presentation.v1`, solo versión y booleano | Presentación opcional inicialmente desmarcada, modificable; no enviada ni asociada a usuario | Afecta todas las cuentas de esa instalación. Se pierde al borrar datos. No prueba consentimiento comercial ni recopilación fuera de dispositivo |
| Servicios/SDK | A: Ionic/Angular/Capacitor App/Haptics/Keyboard/StatusBar y core; soporte backend de varios proveedores; D: cuáles están activos | Infraestructura y función según despliegue | Render observado previamente. No presumir activos Brevo/Resend/SMTP/Cloudinary/Supabase/MercadoPago/Stripe solo por código. No se añade analítica/ads |

La ocultación evita renderizar email/teléfono en DOM del perfil; no cifra la respuesta ni sustituye bloqueo de pantalla. La consulta propia sí muestra esos datos cuando el usuario autenticado la solicita.

## Controles y derechos realmente disponibles

`/privacy` pública desde registro y perfil informa estado y ofrece preferencia local persistente; no registra consentimiento por visitar ni solicita aceptar política inexistente. `/privacy/my-data` protegida usa GET existente, valida ID contra sesión, informa carga/error y limpia/cancela al cerrar sesión/abandonar. DEMO no consulta API ni inventa recepción de solicitudes. Hay acceso parcial al perfil y navegación a pedidos, no exportación integral ARCO.

Rectificación, oposición, consentimiento comercial, recepción de solicitudes y eliminación: **sin contrato/proceso verificado disponible**. La UI lo explica sin botones de éxito decorativos. El checkbox local no pretende sustituir derechos o retirar consentimientos del servidor. [Propuesta backend en Draft PR #4](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-backend/pull/4), archivo `docs/privacy/ARCO_CONTRACT_PROPOSAL.md`, rama `feature/privacy-contract-proposal`; sus rutas están expresamente propuestas, no implementadas ni consumidas aquí.

## Checklist de distribución y decisiones del titular

| Elemento | Estado y aceptación necesaria |
|---|---|
| Nombre / desarrollador | Casa de Música Castillo / Ivan Ramirez Software; confirmar autorización y responsable legal |
| AppId, versión, Android | `com.casademusicacastillo.app`, versionCode 1, versionName 1.0, min 24, compile/target 36 conservados. Revisar código de versión antes de subir |
| AAB/firma | Release optimizado técnico, sin firma de distribución. [Runbook privado](../android/UPLOAD_KEY_RUNBOOK.md), pendiente de autorización/custodia |
| Política pública y aviso | Falta revisión factual/legal: responsable/contacto, finalidades, destinatarios/transferencias, conservación y procedimientos; ninguna URL aprobada |
| Eliminación app y web | Falta backend operativo, verificación/recibo/procesamiento y URL HTTPS externa real; logout/deshabilitación no sustituyen eliminación |
| Data Safety | Matriz candidata, no declaración final. Confirmar categorías transmitidas/compartidas, finalidad, obligatoriedad, cifrado, proveedores y eliminación |
| Permisos | INTERNET, VIBRATE heredado y receptor AndroidX de firma; sin peligrosos nuevos. Verificar cada manifiesto final |
| Revisores | Cuenta sintética y entorno autorizado, MFA/instrucciones/credenciales por canal privado; nunca Git/chat/artifacts ni cuenta comercial |
| Ficha/recursos | Identidad existente; capturas fieles a funciones conectadas comprobadas, descripción/clasificación/contacto/recursos por aprobar. No vender fixtures como comercio aceptado |
| Compatibilidad | R8/manifest/paquetes estáticos verificables; falta Release firmado en A55, puente/plugins, backup OEM y páginas 16 KB cuando corresponda |
| Pruebas interna/cerrada | Sin iniciar ni crear app remota. Identidad/teléfono/dispositivo/Console por confirmar por titular; requieren firma y requisitos anteriores |

Google exige vías dentro/fuera de apps que crean cuentas: [eliminación](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en). SDK y WebView controlado cuentan en las declaraciones: [Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en). Revisar [User Data/política](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en) antes de publicar un texto legal. No se publica nada aquí.

Condiciones consultadas de cuentas personales nuevas: 12 participantes inscritos continuamente 14 días en prueba cerrada antes de solicitar producción, sin garantía de aprobación ([fuente](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)). La entrega del 26 de noviembre no sustituye esos requisitos.

Antes de TT-05/Etapa 3: conciliar PR backend, PostgreSQL y SMTP aislados con perfiles existentes, seleccionar almacenamiento nativo cifrado compatible con Capacitor/R8 y verificar JWT/401/logout/expiración/MFA. La presencia de `/refresh` en una versión de backend no acredita soporte funcional móvil; no se inventa refresh token. Ese era el cierre de 2B. La actualización técnica de sesión, pruebas aisladas y límites de 3A se registra en [TT-05](../security/TT05_SESSION.md); no implica aceptación comercial ni cumplimiento legal.
