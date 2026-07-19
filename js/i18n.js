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
    "Sin conexión. Se muestran los últimos datos guardados.": "Offline. Showing the latest saved data.", "Conexión recuperada. Actualizando datos…": "Connection restored. Updating data…"
  }};
  const storageKey = "pvpc-language";
  let language = localStorage.getItem(storageKey) === "en" ? "en" : "es";
  function t(value) { return language === "en" ? (translations.en[value] || value) : value; }
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
