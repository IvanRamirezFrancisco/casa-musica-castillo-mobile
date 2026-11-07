# Verificación del incremento 2B

3 de noviembre de 2026. Base móvil `9177f3f`, rama aislada `feature/privacidad-play-compliance`. Los PR #83/#84 permanecen Draft y no se modifica su contenido/ramas. La propuesta backend es [Draft PR #4](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-backend/pull/4), SHA `e4fb37b`, un documento, sin código ni producción.

| Validación local | Resultado |
|---|---|
| `npm ci --prefer-offline` tras resolver/normalizar lock | PASS normal, sin legacy-peer-deps/force |
| `npm run test:coverage -- --runner-config=test/vitest.serial.config.mjs` | 625 PASS, 68 archivos, cero rechazos pendientes tras completar dos fixtures de navegación antiguos |
| Cobertura | Líneas 97.90 %, instrucciones 95.86 %, funciones 93.86 %, ramas 93.96 %; umbrales originales |
| `npm run test:regression -- --runner-config=test/vitest.serial.config.mjs` | 154 PASS, 29 archivos |
| `npm run test:white-box` | 122 PASS, 10 archivos |
| Nuevos casos de privacidad | 27 incluidos en general: persistencia/retiro/error/corrupción, control accesible, GET propio, ID ajeno, 401, ruta protegida y limpieza al salir/cache/logout |
| `npm run test:build-config` | 5 PASS independientes de la suite Angular |
| `npm run lint` | PASS |
| `npm run build -- --configuration=development` | PASS |
| `npm run android:demo` | Angular DEMO + sync + APK Debug PASS |
| `npm run android:release` / `npm run android:verify-release` | Production + sync + APK/AAB técnicos unsigned, R8/manifest/paquetes PASS |
| Audit | 29 iniciales a 23 moderadas; altas/críticas/runtime cero. `npm audit --audit-level=high` exit 0 |
| Revisión staged y `git diff --check` | Sin secretos/artefactos detectados; fixtures reservados separados de credenciales reales |

Regresión/caja blanca e integración HTTP controlada son selecciones solapadas con general y no se suman como casos únicos. Las pruebas de API usan HttpTestingController y datos sintéticos; no certifican PostgreSQL, proveedores, correos o eliminación reales. No se cambiaron thresholds ni budgets. Hay warnings CSS/deprecaciones Gradle existentes.

Los builds locales anteriores al commit identifican árbol modificado y SHA de origen; no se presentan como paquetes finales de un commit limpio. Evidencia final de SHA, hashes y siete controles CI se registra en la descripción del Draft PR y artifacts del mismo HEAD, evitando un commit posterior solo documental que sustituya una validación completa.

Maestro conserva los cuatro recorridos previos y agrega uno para ocultar contacto, reiniciar sin borrar datos, verificar persistencia y retirar preferencia. El resultado válido debe incluir los cinco flujos. La intermitencia 2A (pantalla vacía; proceso terminado por Android `remove task`; repetición mismo APK 4/4) sigue documentada, sin causa definitiva ni cambio de timeout para ocultarla. No se asume ejecución local de Maestro; usar el emulador CI cuando no esté disponible.

El primer run 2B (41762586784, HEAD d7eb55a) devolvió 4/4: faltaba registrar privacy-demo.yaml en la lista explícita config.yaml. Ese verde no se acepta como evidencia de la función nueva. Se registra el quinto flujo y se agrega verificación obligatoria de que todas las definiciones raíz estén registradas y aparezcan exactamente una vez con SUCCESS en JUnit, sin casos omitidos/fallidos/skipped. Cinco pruebas Python comprueban el verificador y el JUnit incompleto real es rechazado; la evidencia final debe proceder del siguiente HEAD.

Backend PR #4: compilación/pipeline heredado PASS; el paso de escaneo está declarado simulado y no prueba análisis de seguridad. SonarQube run 41761402438 FAIL con HTTP 403 al obtener metadatos JRE de SonarCloud, bootstrap previo al análisis. El log indica revisar autorización/SONAR_TOKEN, sin demostrar cuál sea la causa específica. No se modifica/solicita el secreto ni se omite el control; requiere custodio/configuración externa. No se declara CI global backend aprobado.

La firma de distribución y aceptación funcional Release siguen pendientes: no upload key nueva, no firma autorizada, no instalación de Release ni paquetes en Play. ARCO/eliminación/contacto/representación/URL públicas no están aceptados; ver matriz factual y propuesta separada. El control local de presentación no es consentimiento comercial.
