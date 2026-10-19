# PLAN CI/CD Y EVIDENCIA DE PRUEBAS

Actualizado 18/10/2026. TT-43–50. Plataforma GitHub Actions; XP + DevOps. Evidencia del PR #73 en docs/testing/VALIDATION_REPORT.md.

## Base verificada

Base original `fc071671adea59d09776c0bc718a089ca3488327`; actualización segura con `develop` `c3d78a88fc68282598b6eb8869102a83da77b10f` mediante merge sin force-push. La rama sigue siendo `chore/test-pipelines-completion` y el PR #73 conserva destino `develop`, sin merge automático ni escritura directa en main/develop.

Runs iniciales exitosos del mismo SHA:

- [CI](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/37987021496)
- [Security](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/37987021478)
- [Android](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/37987021517)
- [Staging](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/37987021399)

## Flujos implementados

| WORKFLOW | DISPARADOR | PASOS / TIPO DE PRUEBA | EVIDENCIA |
|---|---|---|---|
| `ci.yml` | PR/push develop/main, manual | npm ci, lint, UNITARIAS + cobertura V8, Angular build; Quality Gate consolidado en PR/push | `coverage-and-unit-tests`, `devops-quality-gate`, Step Summary/comentario único |
| `security.yml` | PR/push develop/main, manual | audit producción bloqueante moderate, audit completo informativo; CodeQL JS/TS | Logs y Code scanning |
| `integration.yml` | PR/push develop/main: frontend; manual: frontend + API | INTEGRACIÓN TestBed; Postman CLI local con ambiente testing | JUnit frontend/API + Step Summary |
| `android-build.yml` | PR/push develop/main, manual, workflow_call | Build web, cap sync, Gradle debug y artifact; llama aceptación después | APK debug + aceptación |
| `acceptance.yml` | workflow_call desde Android | Descarga APK del mismo run, emulador KVM/API34, Maestro local | `acceptance-maestro-demo`: JUnit/capturas/debug |
| `regression.yml` | Manual | REGRESIÓN crítica Vitest/TestBed y reutiliza Android→Acceptance | critical-regression + APK + Maestro |
| `performance.yml` | Todo PR valida scripts; carga exclusivamente manual | Job PERFORMANCE/LOAD o STRESS/ESFUERZO con k6 OSS, selección excluyente | Step Summary explícito `LOAD/STRESS NO EJECUTADO` y serie JSON solo en ejecución real |
| `staging-apk.yml` | Push develop/manual | Exige `DEVOPS QUALITY GATE` PASS del mismo SHA; después build y entrega APK staging | Gate JSON, Step Summary y APK staging con número de run |

Android publica el APK antes de aceptación; si falla Maestro, el workflow falla aunque el artifact debug exista. CI, Security, Integration, Android y k6 inspect se inician en paralelo. Dentro de Android la secuencia real es Build → APK → Acceptance. `DEVOPS QUALITY GATE` consulta seis checks obligatorios del mismo SHA; staging espera ese gate y falla/bloquea la entrega si falta o no es PASS. Descargar artifact no es desplegar backend ni publicar Play Store.

En PR, el SHA correcto del gate es `github.event.pull_request.head.sha`; el `github.sha` del evento puede ser un merge SHA temporal sin esos check-runs. En push y Staging se usa `github.sha`, que identifica el commit integrado. El reporte muestra SHA/evento/PR/rama, checks buscados/encontrados, estados, intentos y timeout.

Los cinco workflows automáticos de PR (CI, Security, Integration, Android y k6 inspect) usan `concurrency` y cancelan únicamente runs obsoletos del mismo PR. Los dispatch manuales de regresión/API/LOAD/STRESS se conservan. Staging cancela una entrega aún en curso si llega un commit posterior a `develop`; no cancela dispatch manuales.

Para un bloque exclusivamente documental (`docs/**` o `*.md`), cada workflow inicia, detecta el alcance y deja los jobs pesados como `SKIPPED / NO APLICA`; de este modo el check existe y no queda pendiente. El gate permite continuar con NO APLICA solo bajo esa regla explícita. Cualquier workflow/script/configuración/fixture/código activa el recorrido completo.

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

API variables: `API_BASE_URL`, `API_AUTHORIZED_ORIGIN`, `API_TEST_AUTHORIZED=true`, `API_USER_ID` cuando corresponda. Secretos: `API_USER_TOKEN` (ROLE_USER fixture), `API_TEST_EMAIL`, `API_TEST_PASSWORD`. La opción manual elige PUBLIC_CONTRACT, AUTHENTICATED_CONTRACT o LOGIN_CONTRACT. Postman CLI 1.75.0 se validó contra el arnés loopback sin login/cloud; esa validación no acredita Spring Boot. Si falta configuración, el job remoto se omite y el resumen indica BLOCKED/NO EJECUTADO; no cuenta como prueba aprobada. Ver [contrato](../testing/API_CONTRACT.md).

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

La explicación operativa para personas no familiarizadas con Actions está en [WORKFLOWS_GUIDE](WORKFLOWS_GUIDE.md).

## Política de desarrollo y entrega conservada

PLAN se administra en GitHub Project (backlog, HU/TT, puntos, prioridades, responsables, XP, dependencias, sub-issues y PV). CODE usa ramas feature/* para funcionalidades, chore/* para infraestructura y fix/* para correcciones; develop integra trabajo revisado y main representa versiones estables. BUILD, TEST y SECURITY generan controles/evidencias; RELEASE requiere build y pruebas aprobados, ausencia de defectos bloqueantes y revisión del equipo. PV-01–05 siguen siendo los incrementos planificados.

DEPLOY actualmente distribuye APK de prueba mediante artifacts. Publicación en Google Play, firma de release y versionado por tags `v0.x.y` están PLANIFICADOS y requieren configuración/credenciales propias; no se declaran implementados ni se crean tags en esta actividad. MONITOR actualmente revisa Actions, defectos, vulnerabilidades e Issues; observabilidad de producción sigue PENDIENTE. Los checks candidatos obligatorios y el estado real de protección de `develop` se registran en VALIDATION_REPORT. API remota, regresión completa y k6 LOAD/STRESS son manuales/condicionales y no deben convertirse en required checks cotidianos.

El proceso exige que un PR corresponda a trabajo planificado, compile, pase controles obligatorios, no contenga secretos y tenga revisión antes de merge. En esta actividad se entrega el PR abierto y no se realiza merge. Un fallo se corrige en la rama con otro commit; nunca mediante cambios directos a main.
