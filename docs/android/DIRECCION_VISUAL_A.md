# Dirección Visual A

Base funcional Draft #90, SHA 3a64e735e4376755c5681bcf2b7a8df98732a8a8. Inicio, catálogo, detalle, autenticación, Seguridad, carrito, perfil y navegación usan los tokens de Dirección A. El panel lateral y el modal reutilizan el mismo formulario de filtros. Se conservan contratos, favoritos, formateo seguro y restricciones de compra y perfil.

Seguridad presenta correo, autenticador y recuperación en tarjetas con estados textuales y acciones de al menos 48 CSS px. Se mantienen las confirmaciones y la limpieza de QR, claves y códigos al abandonar la vista. El desafío MFA coloca el foco en su título, usa radios con leyenda, conserva teclado numérico y autocomplete de OTP y presenta solicitud, reenvío, carga y avisos con las acciones existentes.

## Reproducir la evidencia

Desde este worktree, ejecutar en terminales separadas npm start -- --configuration development --host 127.0.0.1 --port 4291 y node test/responsive-ui.mjs. Chrome usa un perfil aislado y el arnés intercepta HTTP mediante datos sintéticos. Capturas y medidas en reports/uiux/after. Para comparar, servir #90 en 127.0.0.1:4292 y ejecutar el mismo arnés con CMC_UI_PORT=4292 y --baseline. Las capturas comparables quedan bajo reports/uiux/before. Ambos conjuntos usan la misma imagen sintética exclusiva de pruebas.

La matriz abarca 320×640, 360×640, 375×667, 390×844, 412×915, 344×882 y 690×829 (plegable simulado), 768×1024, 820×1180, 1024×1366, 1280×800, 1024×768 y 667×375. Verifica separación de Bubble Navigation, ancho de sus objetivos, overflow, alcance de controles, insets, búsqueda conservada al redimensionar y texto al 200 %. El caso MFA conserva el valor al redimensionar y comprueba el error con la entrada ya borrada. Se simula el viewport. Quedan por comprobar teclado nativo, multiventana física y TalkBack.

Contrastes calculados para pares representativos. Blanco sobre naranja 5.20:1, carbón sobre mamey 10.41:1, burdeos sobre fondo cálido 9.26:1, error 7.60:1 y éxito 5.21:1. El arnés comprueba los tres primeros mediante CSS computado.

Cobertura de líneas. La base funcional tenía 2479/2531 (97.94 %). El borrador añadió 3 líneas cubiertas en catálogo y 4 en cuadrícula, 2 de ellas sin cubrir, para 2484/2538 (97.87 %). La suite final obtiene 2466/2516 (98.01 %). Mover la plantilla de Seguridad a HTML cambia la atribución de 45 a 21 líneas en el archivo TypeScript, ambas al 100 %. Se verifican oferta, valoración, retorno desde el corazón sin sesión, foco MFA y reenvío durante la carga. Umbrales y exclusiones se conservan.

## Aceptación física

Seguir [el procedimiento A55](ACCEPTANCE_A55.md) desde el HEAD de este Draft. El titular reportó login, restauración y MFA EMAIL con Mailpit en la APK anterior de #87. La aceptación física de la nueva interfaz, teclado, lector de pantalla, Release firmada y evidencia de expiración, revocación y borrado de TT-05 quedan pendientes. Las fotos reales del catálogo aislado requieren una fuente autorizada y disponible.
