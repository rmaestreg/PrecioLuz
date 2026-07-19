# Precio Luz

WebApp estática para consultar el precio horario del PVPC en España, planificar consumos y consultar un histórico reciente.

## Estructura

```text
index.html                  Estructura HTML y punto de entrada
css/app.css                 Estilos, temas y diseño responsive
js/api.js                   API de Red Eléctrica, normalización y caché
js/chart.js                 Gráfico de precios por hora y tabla horaria
js/planner.js               Cálculo de la mejor ventana de consumo
js/app.js                   Estado, eventos, histórico e inicialización
manifest.webmanifest        Configuración de la PWA
sw.js                       Caché del shell y funcionamiento offline
version.json                Versión visible de la aplicación
scripts/bump-version.ps1    Incremento de versión y caché
icons/                      Iconos de la PWA
```

## Funcionamiento

Al iniciar, `app.js` carga la fecha actual y solicita los datos a la API oficial de Red Eléctrica. `api.js` convierte la respuesta en franjas horarias normalizadas y guarda una copia local por fecha.

La aplicación muestra:

- precio actual y recomendación de consumo;
- gráfico horario con filtros por nivel;
- planificador de consumo;
- histórico de una semana, un mes o un año;
- detalle horario exportable a CSV.

El histórico consulta los días disponibles y, para el periodo anual, agrupa los resultados por meses (`ENE`, `FEB`, `MAR`, etc.).

## Modo offline

El service worker almacena el shell de la aplicación, los recursos estáticos y los datos consultados. Si falla la red:

- la interfaz sigue cargando si ya se visitó anteriormente;
- se muestran los datos guardados indicando que pueden estar desactualizados;
- las nuevas consultas sin copia local muestran la aplicación sin datos;
- al recuperar la conexión se reintenta automáticamente la fecha seleccionada y el histórico.

La primera visita necesita conexión para guardar estos recursos.

## Desarrollo y publicación

No hay proceso de compilación ni dependencias externas. Se puede servir la carpeta con cualquier servidor HTTP local. Para GitHub Pages, publica todo el contenido en la raíz del repositorio y activa Pages desde `Settings → Pages`.

Es necesario usar `https://` o `localhost` para que el service worker funcione.

## Versionado

La versión se define en `version.json` y se muestra junto al título. Para incrementar el parche:

```powershell
.\scripts\bump-version.ps1
```

También se puede incrementar una versión mayor o menor:

```powershell
.\scripts\bump-version.ps1 -Part minor
.\scripts\bump-version.ps1 -Part major
```

El script actualiza `version.json`, `index.html` y el nombre de caché del service worker.

## Fuentes

Los precios proceden de la API pública de datos de Red Eléctrica. La aplicación muestra el término horario de energía; la factura final incluye además otros conceptos regulados e impuestos.
