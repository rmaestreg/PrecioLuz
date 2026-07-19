/* Internacionalización: idioma persistente y traducción de textos de interfaz. */
(() => {
  const translations = { en: {
    "Tarifa regulada · España": "Regulated tariff · Spain", "Precio de la luz": "Electricity price",
    "Fecha": "Date", "Hoy": "Today", "Actualizar": "Refresh", "¿Cómo está la luz?": "How is the electricity price?",
    "Precio en este momento": "Current price", "Media diaria": "Daily average", "Precio mínimo": "Minimum price", "Precio máximo": "Maximum price",
    "Diferencia máx.–mín.": "Max.–min. difference", "Detalle horario": "Hourly detail", "Ver detalle": "Show details", "Ocultar detalle": "Hide details", "Exportar CSV": "Export CSV",
    "Histórico de precios": "Price history", "1 semana": "1 week", "1 mes": "1 month", "1 año": "1 year", "Mínimo": "Minimum", "Media": "Average", "Máximo": "Maximum",
    "Uso habitual": "Typical use", "Consumo total (kWh)": "Total consumption (kWh)", "Duración (horas)": "Duration (hours)", "Mejor franja": "Best time slot", "Precio por hora": "Hourly price",
    "Todos": "All", "Bajo": "Low", "Medio": "Medium", "Alto": "High", "Entendido": "Got it", "Cerrar": "Close", "Estado del precio": "Price status",
    "No hay datos históricos disponibles.": "No historical data available.", "No hay precios publicados para esta fecha.": "No prices have been published for this date.",
    "No se pudieron cargar los datos.": "The data could not be loaded.", "Datos no disponibles": "Data unavailable", "Sin datos": "No data",
    "Cargando histórico…": "Loading history…", "Cargando datos oficiales…": "Loading official data…", "Datos oficiales cargados correctamente.": "Official data loaded successfully.",
    "Sin conexión. Se muestran los últimos datos guardados.": "Offline. Showing the latest saved data.", "Conexión recuperada. Actualizando datos…": "Connection restored. Updating data…",
    "Controles de la página": "Page controls", "Día anterior": "Previous day", "Día siguiente": "Next day", "Cambiar tema": "Change theme",
    "Precio horario PVPC de la electricidad en España con datos oficiales de Red Eléctrica.": "Hourly PVPC electricity price in Spain using official Red Eléctrica data.",
    "Precio en este momento": "Current price", "La recomendación se calcula a partir del precio horario publicado.": "The recommendation is based on the published hourly price.",
    "€/kWh · término de energía": "€/kWh · energy charge", "Resumen diario": "Daily summary", "Gráfico de barras de precios horarios": "Hourly price bar chart",
    "Las barras permanecen en su posición al aplicar filtros. La línea discontinua marca la media diaria.": "Bars remain in position when filtering. The dashed line shows the daily average.",
    "Filtrar niveles de precio": "Filter price levels", "Umbrales de precio": "Price thresholds", "Bajo: menos de 0,10 €/kWh": "Low: below €0.10/kWh", "Medio: 0,10–0,15 €/kWh": "Medium: €0.10–0.15/kWh", "Alto: más de 0,15 €/kWh": "High: above €0.15/kWh",
    "Planificador de consumo": "Consumption planner", "Compara el coste del consumo indicado durante franjas consecutivas.": "Compare the cost of the selected consumption across consecutive time slots.",
    "Ordenador · 1 h · 0,25 kWh": "Computer · 1 h · 0.25 kWh", "Lavadora eco · 0,75 kWh": "Eco washing machine · 0.75 kWh", "Lavavajillas eco · 0,85 kWh": "Eco dishwasher · 0.85 kWh", "Secadora · 2 h · 1,50 kWh": "Tumble dryer · 2 h · 1.50 kWh", "Horno · 1 h · 2,00 kWh": "Oven · 1 h · 2.00 kWh", "Aire acondicionado · 1 h · 1,20 kWh": "Air conditioning · 1 h · 1.20 kWh", "Carga de vehículo · 20 kWh": "Vehicle charge · 20 kWh", "Personalizado": "Custom",
    "Coste en mejor franja": "Cost at best time", "Coste empezando ahora": "Cost starting now", "Introduce el consumo para calcular el ahorro posible.": "Enter consumption to calculate potential savings.",
    "Valores del día seleccionado.": "Values for the selected day.", "Franja": "Time slot", "Nivel": "Level", "Respecto a la media": "Compared with average", "Cargando datos…": "Loading data…", "Fuentes": "Sources",
    "Media, mínimo y máximo de los últimos días.": "Average, minimum and maximum over recent days.", "Estadísticas del histórico": "History statistics", "Leyenda del histórico": "History legend",
    "Mínimo registrado": "Recorded minimum", "Máximo registrado": "Recorded maximum", "Media del periodo": "Period average", "Diferencia": "Difference",
    "Los valores representan el término de facturación de energía activa del PVPC. La factura final también incluye potencia contratada, alquiler del contador e impuestos. Actualización automática cada 15 minutos; si falla la red, se muestra la última copia guardada y se identifica claramente.": "Values represent the PVPC active energy charge. The final bill also includes contracted power, meter rental and taxes. Automatically updated every 15 minutes; if the network fails, the latest saved copy is shown and clearly identified.",
    "Información PVPC": "PVPC information", "Gráfico histórico de precios": "Historical price chart", "Periodo del histórico": "History period", "Idioma": "Language",
    "No se ha podido asociar la hora actual con una franja publicada.": "The current time could not be matched to a published slot.", "Selecciona “Hoy” para ver el precio correspondiente a este momento.": "Select “Today” to see the price for the current time.",
    "prácticamente igual a la media": "practically equal to the average", "por debajo": "below", "por encima": "above", "Esta franja está": "This slot is", "Es una de las opciones más favorables del día para desplazar consumo flexible.": "It is one of the most favourable slots of the day for flexible consumption.", "Conviene posponer consumos flexibles cuando sea posible.": "Consider postponing flexible consumption when possible.", "El planificador permite comprobar si existe una ventana claramente más barata.": "The planner can check whether a clearly cheaper window is available.",
    "Selecciona “Hoy” y espera a que se cargue el precio actual.": "Select “Today” and wait for the current price to load.", "Está barata: es una buena franja para consumir.": "It is cheap: this is a good slot for consumption.", "Está en un nivel intermedio, cerca de la media del día.": "It is at a medium level, close to the daily average.", "Está cara: ahora": "It is expensive: now", "Conviene esperar.": "It is better to wait.", "No hay otra franja barata disponible en los datos publicados.": "No other cheap slot is available in the published data.",
    "Introduce un consumo y una duración válidos.": "Enter a valid consumption and duration.", "No aplicable": "Not applicable", "No quedan suficientes horas publicadas para completar esa duración empezando ahora.": "There are not enough published hours to complete that duration starting now.", "El coste empezando ahora solo se calcula cuando está seleccionado el día de hoy.": "The cost starting now is only calculated when today is selected.", "Diferencia absoluta del día": "Absolute difference for the day",
    "Publicación:": "Published:", "Consulta:": "Checked:", "Fuente:": "Source:", "Guardada:": "Saved:",
    "precio bajo": "low price", "precio medio": "medium price", "precio alto": "high price", " · ahora": " · now",
    "días con precios publicados.": "days with published prices.", "meses con precios publicados.": "months with published prices.", "franjas.": "time slots.", "franjas publicadas": "published time slots",
    "El máximo es": "The maximum is", "por debajo de la media": "below average", "por encima de la media": "above average", "frente a la media": "vs. average", "de la media": "of the average", "Diferencia absoluta del día": "Absolute difference for the day",
    "Desplazar este consumo a la mejor franja ahorraría aproximadamente": "Moving this consumption to the best time would save approximately", "La franja actual ya está entre las opciones más económicas para este consumo.": "The current slot is already among the cheapest options for this consumption.", "ahorraría aproximadamente": "would save approximately"
  }};
  const storageKey = "pvpc-language";
  let language = localStorage.getItem(storageKey) === "en" ? "en" : "es";
  function t(value) {
    if (language !== "en") return value;
    if (translations.en[value]) return translations.en[value];
    return Object.keys(translations.en)
      .sort((a, b) => b.length - a.length)
      .reduce((result, key) => result.split(key).join(translations.en[key]), value);
  }
  function translateDom() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (node.parentElement.closest("script, style")) return;
      const original = node.nodeValue.trim();
      if (!original) return;
    const translated = t(original);
      if (translated !== original) node.nodeValue = node.nodeValue.replace(original, translated);
    });
    document.querySelectorAll("[aria-label], [title], [placeholder]").forEach(element => {
      ["aria-label", "title", "placeholder"].forEach(attribute => {
        const value = element.getAttribute(attribute);
        if (value && translations.en[value]) element.setAttribute(attribute, t(value));
      });
    });
    document.documentElement.lang = language;
  }
  function applyLanguage(next) {
    language = next === "en" ? "en" : "es";
    localStorage.setItem(storageKey, language);
    location.reload();
  }
  window.i18n = { t, applyLanguage, get language() { return language; } };
  document.addEventListener("DOMContentLoaded", () => {
    const selector = document.getElementById("language-select");
    if (selector) { selector.value = language; selector.addEventListener("change", event => applyLanguage(event.target.value)); }
    translateDom();
    new MutationObserver(() => translateDom()).observe(document.body, { childList: true, subtree: true });
  });
})();
