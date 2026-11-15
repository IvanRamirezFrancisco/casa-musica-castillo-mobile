# Caja blanca — Actividad 4

Desde la raíz: `npm ci` y `npm run test:white-box` (Node 22 o superior compatible con el proyecto).

`run-white-box.mjs` es un punto de ejecución real en `/test`: invoca Angular TestBed/Vitest y selecciona diez archivos originales en `src/app`. No copia, reimporta ni multiplica casos. La ubicación física de las especificaciones sigue la convención Angular de colocarlas junto a su clase. La selección se ejecuta también dentro de la suite completa: **no sumar sus casos al total**.

La rúbrica menciona `/test`; aquí quedan el ejecutor, configuración reproducible y la [matriz de caja blanca](WHITE_BOX_MATRIX.md). Si se exige que cada especificación resida físicamente allí, esa interpretación requiere confirmación docente; no se afirma una aceptación no obtenida.

Comandos adicionales:

```sh
npm test -- --watch=false --runner-config=test/vitest.serial.config.mjs
npm run test:coverage -- --runner-config=test/vitest.serial.config.mjs
npm run test:integration -- --runner-config=test/vitest.serial.config.mjs
npm run test:regression -- --runner-config=test/vitest.serial.config.mjs
```

La configuración serial controla concurrencia, sin modificar umbrales ni aserciones. Cobertura HTML: `coverage/app/index.html`; resumen: `coverage/app/coverage-summary.json`; JUnit: `reports/unit-tests.xml`. Resultados del cierre: [docs/activity4](../docs/activity4/README.md). Los logs completos permanecen en `reports/activity4-close/`, excluidos de Git por contener detalles del entorno local.

Estas pruebas inspeccionan ramas internas y adaptadores mediante respuestas controladas. No acreditan autenticación, stock, compra o autorización reales del servidor.

Evidencias locales: `node test/verify-evidence.mjs` comprueba hashes, sin ejecutar suites. Para Android real, `android-public-smoke.mjs` y `android-layout-smoke.mjs` requieren APK Debug instalado, emulador y backend local; consultar los límites/resultado parcial de la matriz actual en `docs/activity4/ANDROID.md`. No forman parte de Vitest ni deben ejecutarse como CI sin ese entorno.
