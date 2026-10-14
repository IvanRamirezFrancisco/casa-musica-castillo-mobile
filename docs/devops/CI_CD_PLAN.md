# PLAN CI/CD Y EVIDENCIA DE PRUEBAS

Actualizado 13/10/2026. TT-43–50. Plataforma GitHub Actions; XP + DevOps. Evidencia del PR #73 en docs/testing/VALIDATION_REPORT.md.

## Base verificada

`develop` inicial `fc071671adea59d09776c0bc718a089ca3488327`. Se conservan los pasos existentes de los cuatro pipelines; no se reescriben versiones de acciones ya exitosas. La rama de trabajo parte de develop actualizado: `chore/test-pipelines-completion`. Integración mediante PR hacia develop, sin merge automático y sin escribir directamente main/develop.

Runs iniciales exitosos del mismo SHA:

- [CI](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/37987021496)
- [Security](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/37987021478)
- [Android](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/37987021517)
- [Staging](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/37987021399)

## Flujos implementados

| WORKFLOW | DISPARADOR | PASOS / TIPO DE PRUEBA | EVIDENCIA |
|---|---|---|---|
| `ci.yml` | PR/push develop/main, manual | npm ci, lint, UNITARIAS + cobertura V8, Angular build | `coverage-and-unit-tests`: HTML/lcov/JSON/JUnit |
| `security.yml` | PR/push develop/main, manual | audit producción bloqueante moderate, audit completo informativo; CodeQL JS/TS | Logs y Code scanning |
| `integration.yml` | PR/push develop: frontend; manual: frontend + API | INTEGRACIÓN TestBed; Postman CLI local con ambiente testing | JUnit frontend/API |
| `android-build.yml` | PR/push develop/main, manual, workflow_call | Build web, cap sync, Gradle debug y artifact; llama aceptación después | APK debug + aceptación |
| `acceptance.yml` | workflow_call desde Android | Descarga APK del mismo run, emulador KVM/API34, Maestro local | `acceptance-maestro-demo`: JUnit/capturas/debug |
| `regression.yml` | Manual | REGRESIÓN crítica Vitest/TestBed y reutiliza Android→Acceptance | critical-regression + APK + Maestro |
| `performance.yml` | PR solo valida scripts; carga exclusivamente manual | Job PERFORMANCE/LOAD o STRESS/ESFUERZO con k6 OSS, selección excluyente | Resumen y serie JSON |
| `staging-apk.yml` | Push develop/manual | Conserva build y entrega APK staging original | APK staging con número de run |

Android publica el APK antes de aceptación; si falla Maestro, el workflow falla aunque el artifact debug exista. No se afirma que staging dependa de CI/Security: actualmente son flujos paralelos. Descargar artifact no es desplegar backend ni publicar Play Store. Revisión humana debe comprobar gates del mismo SHA antes de entrega. No se alteran protecciones de rama ni relaciones del Project.

## Cobertura y automatización local

```
npm ci
npm run lint
npm test -- --configuration=ci
npm run test:integration
npm run test:regression
npm run build
```

Angular 22 utiliza `@angular/build:unit-test`, no Karma. V8 4.0.18 coincide con Vitest 4.0.18. Reportes en `coverage/app/`; se incluyen fuentes sin pruebas del alcance src/app y se excluyen specs/modelos de tipos. Gate 60 % para las cuatro métricas; metas 70 % intermedio/80 % crítico no se declaran por anticipado. Ver TEST_PLAN para alcance demo.

## Configuración de ambientes externos

Configurar ambiente GitHub **testing** con restricciones/aprobaciones apropiadas según disponibilidad del repositorio, sin compartir secretos con PRs de forks. Ningún job remoto API/k6 se dispara en PR. No se crean secretos vacíos para simular éxito.

API variables: `API_BASE_URL`, `API_AUTHORIZED_ORIGIN`, `API_TEST_AUTHORIZED=true`, `API_USER_ID` cuando corresponda. Secretos: `API_USER_TOKEN` (ROLE_USER fixture), `API_TEST_EMAIL`, `API_TEST_PASSWORD`. La opción manual elige PUBLIC_CONTRACT, AUTHENTICATED_CONTRACT o LOGIN_CONTRACT. Si falta configuración, el job remoto se omite y el resumen indica NO EJECUTADO; no cuenta como prueba aprobada. El runner local falla con mensaje BLOCKED. Ver [contrato](../testing/API_CONTRACT.md).

k6 variables: `K6_BASE_URL` HTTPS, `K6_AUTHORIZED_ORIGIN` idéntico al origen y `K6_TEST_AUTHORIZED=true`. El operador debe confirmar el permiso y la carga máxima 20 VUs en el input manual. Solo ambiente no productivo expresamente autorizado. El script rechaza configuración faltante y redirecciones; concurrencia única. Revisar métricas de servidor antes y después, abortar si hay impacto. Nunca usar credenciales embebidas en URLs.

Para inspección estática sin red:

```
k6 inspect -e K6_BASE_URL=https://example.invalid -e K6_AUTHORIZED_ORIGIN=https://example.invalid -e K6_TEST_AUTHORIZED=true tests/performance/load.js
k6 inspect -e K6_BASE_URL=https://example.invalid -e K6_AUTHORIZED_ORIGIN=https://example.invalid -e K6_TEST_AUTHORIZED=true tests/performance/stress.js
```

`inspect` evalúa opciones sin enviar carga. El dominio reservado anterior sirve exclusivamente para inspección, no es un ambiente de backend ni evidencia de rendimiento. Ningún resultado de inspect demuestra thresholds cumplidos.

## Aceptación móvil

Maestro 2.11.0 se descarga de release oficial fijado; Java 21, Android AOSP API34 (`default`)/x86_64/Pixel6 y KVM en runner Ubuntu. No se usa maestro cloud ni API key. `.maestro/config.yaml` selecciona tres flujos, el formulario de login común se reutiliza como subflujo y cada flujo inicializa la app una vez. Datos `example.test` y contraseña de demostración solo alimentan formularios locales, sin autenticar una cuenta real. Los tres flujos aprobaron en run 38401961421 sobre `3057af9`. La imagen AOSP evita el fallo observado del proveedor de fuentes GMS; no acredita integración con Google Play Services.

Ejecutar localmente con APK instalado y dispositivo/emulador disponible:

```
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
maestro test --format JUNIT --output reports/maestro/results.xml --test-output-dir reports/maestro --debug-output reports/maestro/debug .maestro
```

Los flujos verifican UI demo y no satisfacen automáticamente PS ni aceptación de servidor. La suite se debe extender cuando catálogo/favoritos/API estén implementados. No emitir un PASS por la sola validez de YAML.

## Seguridad, evidencia y operación

Permisos mínimos de lectura salvo CodeQL que necesita security-events:write ya existente. Sin `pull_request_target`, sin secretos en aceptación/coverage, sin modificar backend. npm audit completo sigue informativo; producción sigue bloqueante. Revisar CodeQL incluso si el job pasa: subir análisis no significa cero hallazgos.

Artifacts de pruebas se suben con `if: always()` para diagnosticar fallos. Ausencia de reporte no es éxito. Retención de entrega 14 días; descargar evidencia antes de expirar. Solo estadísticas/JUnit/capturas demo, nunca respuestas de login o archivos temporales de credenciales. `.gitignore` excluye reports/coverage.

En cada run registrar SHA, fecha, versión, comando, resultado y ambiente. Ante fallo, consultar job/log, corregir en rama, repetir checks del cambio y enlazar run final. Mantener historial de fallos relevante; no ocultarlos con continue-on-error en pruebas. Tras PR no hacer merge ni cerrar Issues sin cumplir sus criterios.

Ver [TEST_SCHEDULE](../testing/TEST_SCHEDULE.md) y [TEST_TOOLS](../testing/TEST_TOOLS.md) para calendario, responsables y fuentes. En Word/PDF las actividades de prueba irán EN MAYÚSCULAS y con fuente de color diferente.

## Política de desarrollo y entrega conservada

PLAN se administra en GitHub Project (backlog, HU/TT, puntos, prioridades, responsables, XP, dependencias, sub-issues y PV). CODE usa ramas feature/* para funcionalidades, chore/* para infraestructura y fix/* para correcciones; develop integra trabajo revisado y main representa versiones estables. BUILD, TEST y SECURITY generan controles/evidencias; RELEASE requiere build y pruebas aprobados, ausencia de defectos bloqueantes y revisión del equipo. PV-01–05 siguen siendo los incrementos planificados.

DEPLOY actualmente distribuye APK de prueba mediante artifacts. Publicación en Google Play, firma de release y versionado por tags `v0.x.y` están PLANIFICADOS y requieren configuración/credenciales propias; no se declaran implementados ni se crean tags en esta actividad. MONITOR actualmente revisa Actions, defectos, vulnerabilidades e Issues; observabilidad de producción sigue PENDIENTE. Protección de ramas/checks obligatorios es una decisión posterior del equipo, no una configuración acreditada por este documento.

El proceso exige que un PR corresponda a trabajo planificado, compile, pase controles obligatorios, no contenga secretos y tenga revisión antes de merge. En esta actividad se entrega el PR abierto y no se realiza merge. Un fallo se corrige en la rama con otro commit; nunca mediante cambios directos a main.
