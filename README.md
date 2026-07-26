# Precio Luz

PWA estática para consultar el precio horario del PVPC en España con datos de Red Eléctrica, comparar franjas de consumo y revisar el histórico reciente.

## Funcionalidades

- Vista **Hoy** con precio actual, recomendación y resumen diario.
- **Gráfico** horario con filtros por nivel de precio y detalle exportable a CSV.
- **Plan** para calcular la mejor ventana consecutiva de consumo, con límites de inicio y final.
- **Cola** para añadir varias tareas domésticas y calcular un calendario de menor coste considerando duración, potencia, límite horario e interrupciones.
- **Histórico** con medias, mínimos y máximos de una semana, un mes o un año.
- Idiomas español, inglés y francés.
- Tema claro/oscuro, diseño responsive y navegación inferior con composición móvil también en pantallas grandes.
- Funcionamiento offline mediante service worker y caché local de los datos consultados.

## Estructura

```text
index.html                  Punto de entrada y estructura de la interfaz
css/app.css                 Estilos, temas, vistas y diseño responsive
js/api.js                   API de Red Eléctrica, normalización y caché local
js/chart.js                 Gráfico horario, filtros y tabla de detalle
js/planner.js               Planificador y cola inteligente de tareas
js/i18n.js                  Traducciones y preferencia de idioma
js/app.js                   Estado, eventos, histórico e inicialización
manifest.webmanifest        Configuración de la PWA
sw.js                       Caché del shell y estrategia offline
version.json                Versión actual de la aplicación
scripts/bump-version.ps1    Actualización de versión y caché
icons/                      Iconos de la PWA
```

## Datos y funcionamiento offline

Al iniciar, `app.js` selecciona la fecha actual y solicita los datos a la API pública de Red Eléctrica. `api.js` normaliza las franjas horarias, convierte los precios a €/kWh y guarda copias locales por fecha.

El service worker almacena los recursos estáticos y sirve la aplicación desde caché cuando no hay conexión. Los datos previamente consultados pueden seguir mostrándose, identificados como datos guardados. Al recuperar la conexión, la aplicación reintenta actualizar la fecha seleccionada y el histórico.

La primera visita necesita conexión para descargar los recursos y los datos iniciales. El modo instalable requiere `https://` o `localhost`.

## Desarrollo y publicación

No hay proceso de compilación ni dependencias externas. Para ejecutar la aplicación localmente, sirve la carpeta raíz con cualquier servidor HTTP estático. Por ejemplo, con Python:

```powershell
python -m http.server 8000
```

Después, abre `http://localhost:8000` en el navegador. Para GitHub Pages, publica el contenido del repositorio y activa Pages desde `Settings → Pages`.

## Versionado

La versión se define en `version.json`. Para incrementar el parche:

```powershell
.\scripts\bump-version.ps1
```

También se puede incrementar una versión menor o mayor:

```powershell
.\scripts\bump-version.ps1 -Part minor
.\scripts\bump-version.ps1 -Part major
```

El script actualiza `version.json`, el número mostrado en la interfaz y el nombre de caché del service worker.

## Fuentes y alcance de los precios

Los precios proceden de la API pública de datos de Red Eléctrica. La aplicación muestra el término horario de energía en €/kWh; una factura real puede incluir potencia contratada, cargos regulados, alquiler, impuestos y otros conceptos.


## Versión 1.1.0

- Acceso directo a Hoy y Mañana con detección automática de publicación.
- Comparación con ayer y con la media de los siete días anteriores.
- Recomendación del mejor tramo práctico diurno de 2–3 horas.
- Selector para Península/Baleares, Canarias, Ceuta y Melilla, con zona horaria y caché separadas.
- Identificación visual de periodos P1, P2 y P3.
- Perfiles personalizados de consumo guardados en el dispositivo.
