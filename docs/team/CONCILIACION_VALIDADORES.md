# Conciliación de validadores y cierre TT-05 — 4 noviembre 2026

Base exacta: `b35de93bbe1c7ad495ac68161ca1f02462fae091`, #87 abierto sobre #85. Incremento aislado en `feature/conciliacion-validadores-equipo`; el Draft debe apuntar a `feature/tt05-sesion-segura`. No se modifican ramas ni revisiones ajenas. Las aportaciones de validación y casos provienen de Brayan Lara Barrios (Tackalay), PR #77/#80, adaptadas al contrato y arquitectura actuales; no se atribuye la implementación original a quien hace esta conciliación.

## TT-05: cierre de CI, no aceptación física

Se solicitó por API repetir únicamente el job DEVOPS QUALITY GATE de run [41863468716](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/41863468716), sin cambiar el SHA. Artifact actualizado `devops-quality-gate`, id 13345780928, 17:01:27 UTC: **8/8 PASS**, `docsOnly=false`, sin timeout, una consulta. Retroalimentación del PR actualizada a las 17:01:28 UTC.

| Control obligatorio | Resultado |
|---|---|
| Lint, Tests y Build | PASS |
| frontend | PASS |
| Auditoria de dependencias | PASS |
| CodeQL JavaScript y TypeScript | PASS |
| Compilar APK Android Debug | PASS |
| ACEPTACIÓN móvil DEMO / maestro | PASS |
| Verificar Android Release sin firma | PASS |
| Sesión segura Android | PASS |

Todos pertenecen al HEAD `b35de93…`. La [repetición Android 41866047987](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/41866047987) conserva cinco casos SUCCESS en JUnit, artifact 13344120389. La primera ejecución 41863468772 conserva 4/5, captura vacía y jerarquía solo System UI al esperar Novedades en account-demo; coinciden errores ColorBuffer del emulador. Eso sustenta un arranque incompleto observado, pero no distingue de forma concluyente renderizado, WebView, automatización o aplicación. No hay evidencia suficiente de navegación defectuosa ni causa raíz demostrada. No se alteraron aserciones, timeouts, reintentos ni exclusiones para aprobar. Si se reproduce: capturar lifecycle/Logcat de la app y datos gráficos, sin credenciales, antes de proponer una corrección.

TT-05 sigue **En pruebas / TEST**: Samsung A55 y runtime Release firmado pendientes. No hay cambios al almacenamiento cifrado en esta conciliación.

## HEAD remotos y revisión actual

- #71: `890e13e70399755095743ab69d44249071dab85c`; módulos antiguos y budgets; cinco checks de su alcance histórico PASS, revisión con cambios solicitados. Comentario de 4 noviembre propone rescatar solo partes útiles.
- #77: `136ddc3ff9090951d97519605791e345619826cf`; correo corregido, checks y gate de seis controles de esa rama PASS. Se leyeron commits, discusión e inline; las observaciones antiguas sobre puntos/dominios ya están corregidas en su código.
- #80: `5b1995aa458bff99b9b95ecfeaaaf7624fe6478d`; nombres/teléfonos corregidos y alineación con develop. **Sin checks asociados a ese HEAD al consultar**; el comentario de gate PASS pertenece a `6b5955d…`, no acredita el HEAD actual. Su descripción inicial aún contradice parcialmente la actualización final sobre nombres/espacios y cantidad de pruebas: conviene reescribirla, no añadir otra nota.

## Matriz de conciliación

| Origen / archivo original | Aporte / estado actual | Duplicación y corrección de origen | Corrección necesaria / decisión | Justificación / pruebas |
|---|---|---|---|---|
| #71 `src/app/registro/registro.page.ts/html` | Mensajes, mostrar contraseña, confirmación | Ya cubiertos por connected-register y cmc-input; exige 10 caracteres y cuatro tipos | **Adaptar** mensaje de longitud a 8; conservar reglas 3 tipos/72 bytes | Contrato real, sin endurecer artificialmente; connected-auth.integration |
| #71 registro `acceptTerms` | Casilla obligatoria con documentos pendientes | No hay documentos/responsable legal aprobados | **Descartar ahora** | No presentar aceptación legal inexistente; privacidad existente preservada |
| #71 `src/app/catalogo/**`, rutas y angular.json | Filtros y productos locales | Duplica catálogo HTTP y rutas; emojis/budgets | **No adoptar** | Sin mejora faltante demostrada; public-catalog.integration y rutas preservadas |
| #77 `shared/validators/email.validator.ts` | Puntos/local/dominio, 64/63 y trim corregidos | Duplicado también en #80; total 254 | **Adaptar** a auth-fields.validation, total 100 | RegisterRequest y entidad User (@Size max=100); una regla para login/registro/recuperación/reenvío y DEMO; team-validators.spec |
| #77 `email.validator.spec.ts` | Casos válidos/invalidos y límites | Correcciones ya presentes, no repetir diagnóstico de octubre | **Conservar como pruebas adaptadas** | 64/65 local, 63/64 etiqueta, 100/101 total, espacios; team-validators.spec |
| #77 `forgot-password.page.ts/html/spec.ts` | Neutralidad, errores, carga, doble envío, otro correo | Conectado ya ofrece HTTP real y errores neutrales; servicio de origen DEMO | **Conservar** HTTP; **adaptar** otro correo con limpieza y mensajes | No copiar PasswordRecoveryService simulado; connected-auth.integration |
| #80 `edit-profile.page.ts` NAME_PATTERN | Separadores repetidos corregidos, acentos, apóstrofos, puntos | Nombre completo DEMO de 3–80; registro usa dos campos 2–50 sin puntos | **Adaptar** política DEMO explícita y reforzar campos reales con separadores simples | Normalización previa a longitud/envío; no unir ambos contratos; team-validators.spec |
| #80 `phone.validator.ts/spec.ts` | Grupos 3-3-4 / 2-4-4, rechaza separadores mal puestos | Corrección de origen ya presente; backend normaliza teléfono | **Adaptar** regla única en auth-fields y normalizar después de validar | Registro opcional, perfil DEMO obligatorio; no aceptar cadenas arbitrarias por quitar símbolos |
| #80 `edit-profile.page.html/spec.ts` | Mensajes accesibles, whitelist, normalización | Conectado no permite editar; DEMO guarda solo estado local | **Adaptar** DEMO; conservar bloqueo conectado | Nunca simular escritura remota; edit-profile.page.spec + integración perfil/privacidad |

## Contrato comprobado y límites

Backend leído sin cambios: worktree independiente a `9494d60f7b7295daa34dff52d6d671ab990c8e20`. `User.email` declara @Size(max=100); no se presupone el tamaño físico de la columna. `RegisterRequest`: email @Email con expresión ASCII y @Size(max=100), dominio sujeto a ValidEmailDomain; nombres @ValidName y max=50. `ValidNameValidator` normaliza espacios, exige mínimo 2 y admite acentos latinos, guion/apóstrofo; no punto. `InputSanitizationService.sanitizeName/Phone` y UserService confirman normalización. `LoginRequest` y `PasswordResetRequest` usan @Email pero no declaran ese max=100 en el DTO; el límite común se conserva por identidad persistida y registro. No se aplica una whitelist de proveedores al login/recuperación: esa política de negocio corresponde al servidor en registro. No se afirma equivalencia total de la validación cliente con el servidor ni despliegue de esos commits en Render.

El correo conserva mayúsculas al enviarse al backend, como antes; solo el perfil DEMO normaliza a minúsculas conforme a #80. El nombre se valida y mide tras normalizar espacios; registro envía esa misma forma antes de @Size. El teléfono acepta 10 dígitos o grupos mexicanos y envía solo dígitos. No soporta prefijo +52 ni cualquier agrupación arbitraria; es la política UI actual, no un validador mundial. Los puntos y límite 80 solo pertenecen al nombre completo DEMO.

Se añade la base `feature/tt05-sesion-segura` a los filtros de PR de CI existentes para ejecutar los ocho controles en el Draft apilado. No cambian reglas de alcance, permisos, umbrales, gates ni disparadores de producción.

## Plan de integración propuesto — no ejecutado

1. Revisión formal y aceptación del alcance de #83; conciliar primero lo que realmente bloquea develop. No fusionar #71 completo: duplicaría arquitectura y budgets.
2. Orden de la cadena: **#83 → #84 → #85 → #87 → Draft de conciliación**. Antes de cada merge, CI completo del HEAD/base vigente y revisión independiente. #84 requiere validar políticas/paquetes; #85 mantiene pendientes legales/ARCO; #87 requiere aceptación física adicional para cerrar TT-05.
3. Preferir una estrategia que conserve los commits originales de la cadena. Tras integrar la base, comprobar ascendencia y diff antes de proponer cambiar la base del siguiente PR a develop. No cambiarla antes de que la dependencia esté integrada.
4. Si se elige squash/rebase en GitHub, no asumir ascendencia ni que desaparece el diff heredado: crear una propuesta de conciliación desde develop actualizado y portar únicamente commits exclusivos, sin force push ni reescribir ramas ajenas. Mantener los PR anteriores hasta acordar el reemplazo.
5. Si develop avanzó, realizar la conciliación en un worktree limpio y rama de integración autorizada, preservando ambos historiales; resolver conflictos con revisión del propietario. No se ejecuta aquí ningún merge, rebase ni cambio de base de PR ajeno.
6. Repetir lint/tests/cobertura, integración controlada, regresión, Debug, DEMO cinco recorridos, Release/R8 y sesión nativa sobre cada SHA que resulte de resolver conflictos o cambiar la base; validar backend aislado si cambia autenticación/contrato. Un gate antiguo no acredita un SHA nuevo.
7. #77/#80: proponer revisión de la adaptación con Brayan; no fusionar su servicio DEMO ni sus formularios completos sobre los conectados. Después de integrar la cadena y comprobar equivalencia, acordar actualizar/reducir sus PR o cerrarlos como sustituidos, conservando enlaces y autoría. Ningún cierre/aprobación automático.
8. Projects: vincular el Draft a HU-02, HU-03, HU-14, TT-16 y TT-18. Conservar responsables/SP; mantener estados de las HU mientras su aceptación completa esté pendiente. TT-05 continúa En pruebas por A55/Release runtime, aunque CI haya cerrado.

## Propuestas de respuesta — no publicadas

- #71: «Revisamos tu propuesta del 4 de noviembre. Conservamos el catálogo HTTP y recuperamos la intención de mensajes del registro según el contrato vigente. La casilla legal queda pendiente de documentos aprobados. Propongo acordar la sustitución del PR completo para evitar módulos/rutas duplicados, sin perder la referencia a tus aportaciones».
- #77: «Las correcciones de puntos, dominios y límites ya están presentes en tu HEAD 136ddc3. Adaptamos esos casos a la regla única existente y al límite de 100 del registro, conservando HTTP y mensajes neutrales. ¿Revisamos juntos el Draft de conciliación antes de decidir cómo reducir o sustituir este PR?».
- #80: «Las correcciones de separadores ya están presentes en 5b1995a. Las adaptamos al perfil DEMO y a teléfonos normalizados; el perfil conectado sigue sin guardar remotamente. Falta CI del HEAD actual y unificar la descripción. Propongo revisar la adaptación y acordar el destino del PR después de estabilizar la cadena».

Resultados finales y artifact hashes se registran en la descripción del Draft y en reports/conciliacion, excluidos de Git; no se crea un commit documental por cada actualización de CI. No se inicia Etapa 3B.
