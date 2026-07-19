/* Internacionalización: idioma persistente y traducción de textos de interfaz. */
(() => {
  const translations = { en: {
    "Tarifa regulada · España": "Regulated tariff · Spain", "Precio de la luz": "Electricity price",
    "Fecha": "Date", "Hoy": "Today", "Actualizar": "Refresh", "¿Cómo está la luz?": "How is the price?",
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
    "Ahora": "Now", "ahora": "now", "precio bajo": "low price", "precio medio": "medium price", "precio alto": "high price", " · ahora": " · now",
    "días con precios publicados.": "days with published prices.", "meses con precios publicados.": "months with published prices.", "franjas.": "time slots.", "franjas publicadas": "published time slots",
    "El máximo es": "The maximum is", "por debajo de la media": "below average", "por encima de la media": "above average", "frente a la media": "vs. average", "de la media": "of the average", "Diferencia absoluta del día": "Absolute difference for the day",
    "Desplazar este consumo a la mejor franja ahorraría aproximadamente": "Moving this consumption to the best time would save approximately", "La franja actual ya está entre las opciones más económicas para este consumo.": "The current slot is already among the cheapest options for this consumption.", "ahorraría aproximadamente": "would save approximately"
  }, fr: {
    "Tarifa regulada · España": "Tarif réglementé · Espagne", "Precio de la luz": "Prix de l’électricité", "Fecha": "Date", "Hoy": "Aujourd’hui", "Actualizar": "Actualiser", "¿Cómo está la luz?": "Quel est le prix?",
    "Precio en este momento": "Prix actuel", "Media diaria": "Moyenne quotidienne", "Precio mínimo": "Prix minimum", "Precio máximo": "Prix maximum", "Diferencia máx.–mín.": "Écart max.–min.",
    "Detalle horario": "Détail horaire", "Ver detalle": "Afficher le détail", "Ocultar detalle": "Masquer le détail", "Exportar CSV": "Exporter CSV", "Histórico de precios": "Historique des prix",
    "1 semana": "1 semaine", "1 mes": "1 mois", "1 año": "1 an", "Mínimo": "Minimum", "Media": "Moyenne", "Máximo": "Maximum", "Uso habitual": "Utilisation habituelle",
    "Consumo total (kWh)": "Consommation totale (kWh)", "Duración (horas)": "Durée (heures)", "Mejor franja": "Meilleur créneau", "Precio por hora": "Prix horaire", "Todos": "Tous", "Bajo": "Bas", "Medio": "Moyen", "Alto": "Élevé",
    "Entendido": "Compris", "Cerrar": "Fermer", "Estado del precio": "État du prix", "No hay datos históricos disponibles.": "Aucune donnée historique disponible.", "No hay precios publicados para esta fecha.": "Aucun prix publié pour cette date.",
    "No se pudieron cargar los datos.": "Impossible de charger les données.", "Datos no disponibles": "Données indisponibles", "Sin datos": "Aucune donnée", "Cargando histórico…": "Chargement de l’historique…", "Cargando datos oficiales…": "Chargement des données officielles…",
    "Datos oficiales cargados correctamente.": "Données officielles chargées.", "Sin conexión. Se muestran los últimos datos guardados.": "Hors connexion. Affichage des dernières données enregistrées.", "Conexión recuperada. Actualizando datos…": "Connexion rétablie. Mise à jour des données…",
    "Día anterior": "Jour précédent", "Día siguiente": "Jour suivant", "Planificador de consumo": "Planificateur de consommation", "Personalizado": "Personnalisé", "Coste en mejor franja": "Coût au meilleur créneau", "Coste empezando ahora": "Coût en commençant maintenant",
    "Valores del día seleccionado.": "Valeurs du jour sélectionné.", "Franja": "Créneau", "Nivel": "Niveau", "Respecto a la media": "Par rapport à la moyenne", "Fuentes": "Sources", "Estadísticas del histórico": "Statistiques de l’historique", "Diferencia": "Écart",
    "Media del periodo": "Moyenne de la période", "Mínimo registrado": "Minimum enregistré", "Máximo registrado": "Maximum enregistré", "Publicación:": "Publication :", "Consulta:": "Consultation :", "Fuente:": "Source :", "Guardada:": "Enregistrée :",
    "Ahora": "Maintenant", "ahora": "maintenant", "precio bajo": "prix bas", "precio medio": "prix moyen", "precio alto": "prix élevé", " · ahora": " · maintenant", "días con precios publicados.": "jours avec des prix publiés.", "meses con precios publicados.": "mois avec des prix publiés.", "franjas.": "créneaux.", "franjas publicadas": "créneaux publiés",
    "El máximo es": "Le maximum est", "frente a la media": "par rapport à la moyenne", "Diferencia absoluta del día": "Écart absolu du jour",
    "Precio horario PVPC de la electricidad en España con datos oficiales de Red Eléctrica.": "Prix horaire de l’électricité PVPC en Espagne avec les données officielles de Red Eléctrica.",
    "La recomendación se calcula a partir del precio horario publicado.": "La recommandation est calculée à partir du prix horaire publié.", "€/kWh · término de energía": "€/kWh · part énergie", "Resumen diario": "Résumé quotidien", "Gráfico de barras de precios horarios": "Graphique des prix horaires",
    "Las barras permanecen en su posición al aplicar filtros. La línea discontinua marca la media diaria.": "Les barres restent à leur place lors du filtrage. La ligne pointillée indique la moyenne quotidienne.", "Filtrar niveles de precio": "Filtrer les niveaux de prix", "Umbrales de precio": "Seuils de prix", "Bajo: menos de 0,10 €/kWh": "Bas : moins de 0,10 €/kWh", "Medio: 0,10–0,15 €/kWh": "Moyen : 0,10–0,15 €/kWh", "Alto: más de 0,15 €/kWh": "Élevé : plus de 0,15 €/kWh",
    "Compara el coste del consumo indicado durante franjas consecutivas.": "Comparez le coût de la consommation indiquée sur des créneaux consécutifs.", "Ordenador · 1 h · 0,25 kWh": "Ordinateur · 1 h · 0,25 kWh", "Lavadora eco · 0,75 kWh": "Lave-linge éco · 0,75 kWh", "Lavavajillas eco · 0,85 kWh": "Lave-vaisselle éco · 0,85 kWh", "Secadora · 2 h · 1,50 kWh": "Sèche-linge · 2 h · 1,50 kWh", "Horno · 1 h · 2,00 kWh": "Four · 1 h · 2,00 kWh", "Aire acondicionado · 1 h · 1,20 kWh": "Climatisation · 1 h · 1,20 kWh", "Carga de vehículo · 20 kWh": "Recharge de véhicule · 20 kWh", "Introduce el consumo para calcular el ahorro posible.": "Saisissez la consommation pour calculer l’économie possible.",
    "Cargando datos…": "Chargement des données…", "La recomendación se calcula a partir del precio horario publicado.": "La recommandation est calculée à partir du prix horaire publié.", "Los valores representan el término de facturación de energía activa del PVPC. La factura final también incluye potencia contratada, alquiler del contador e impuestos. Actualización automática cada 15 minutos; si falla la red, se muestra la última copia guardada y se identifica claramente.": "Les valeurs représentent la part énergie active du PVPC. La facture finale comprend aussi la puissance souscrite, la location du compteur et les taxes. Mise à jour automatique toutes les 15 minutes ; en cas de panne réseau, la dernière copie enregistrée est affichée et identifiée.",
    "Información PVPC": "Informations PVPC", "Gráfico histórico de precios": "Graphique historique des prix", "Periodo del histórico": "Période de l’historique", "Idioma": "Langue", "Leyenda del histórico": "Légende de l’historique", "Estadísticas del histórico": "Statistiques de l’historique",
    "No se ha podido asociar la hora actual con una franja publicada.": "L’heure actuelle n’a pas pu être associée à un créneau publié.", "Selecciona “Hoy” para ver el precio correspondiente a este momento.": "Sélectionnez « Aujourd’hui » pour voir le prix correspondant à ce moment.", "prácticamente igual a la media": "pratiquement égal à la moyenne", "por debajo": "en dessous de", "por encima": "au-dessus de", "Esta franja está": "Ce créneau est", "Es una de las opciones más favorables del día para desplazar consumo flexible.": "C’est l’un des créneaux les plus avantageux pour déplacer une consommation flexible.", "Conviene posponer consumos flexibles cuando sea posible.": "Il est préférable de reporter les consommations flexibles si possible.", "El planificador permite comprobar si existe una ventana claramente más barata.": "Le planificateur permet de vérifier s’il existe une période nettement moins chère.",
    "Selecciona “Hoy” y espera a que se cargue el precio actual.": "Sélectionnez « Aujourd’hui » et attendez le chargement du prix actuel.", "Está barata: es una buena franja para consumir.": "L’électricité est bon marché : c’est un bon créneau pour consommer.", "Está en un nivel intermedio, cerca de la media del día.": "Le prix est intermédiaire, proche de la moyenne du jour.", "Está cara: ahora": "Le prix est élevé : actuellement", "Conviene esperar.": "Il est préférable d’attendre.", "No hay otra franja barata disponible en los datos publicados.": "Aucun autre créneau bon marché n’est disponible dans les données publiées.", "Introduce un consumo y una duración válidos.": "Saisissez une consommation et une durée valides.", "No aplicable": "Non applicable", "No quedan suficientes horas publicadas para completar esa duración empezando ahora.": "Il ne reste pas assez d’heures publiées pour compléter cette durée en commençant maintenant.", "El coste empezando ahora solo se calcula cuando está seleccionado el día de hoy.": "Le coût en commençant maintenant est calculé uniquement lorsque la date du jour est sélectionnée.", "Desplazar este consumo a la mejor franja ahorraría aproximadamente": "Déplacer cette consommation vers le meilleur créneau permettrait d’économiser environ", "La franja actual ya está entre las opciones más económicas para este consumo.": "Le créneau actuel fait déjà partie des options les moins chères pour cette consommation.", "ahorraría aproximadamente": "permettrait d’économiser environ"
  }};
  const storageKey = "pvpc-language";
  let language = ["es", "en", "fr"].includes(localStorage.getItem(storageKey)) ? localStorage.getItem(storageKey) : "es";
  function t(value) {
    if (language === "es") return value;
    const dictionary = translations[language] || translations.en;
    if (dictionary[value]) return dictionary[value];
    return Object.keys(dictionary)
      .sort((a, b) => b.length - a.length)
      .reduce((result, key) => result.split(key).join(dictionary[key]), value);
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
        if (value && ((translations[language] && translations[language][value]) || translations.en[value])) element.setAttribute(attribute, t(value));
      });
    });
    document.documentElement.lang = language;
  }
  function applyLanguage(next) {
    language = ["es", "en", "fr"].includes(next) ? next : "es";
    localStorage.setItem(storageKey, language);
    location.reload();
  }
  window.i18n = { t, applyLanguage, get language() { return language; } };
  document.addEventListener("DOMContentLoaded", () => {
    const picker = document.getElementById("language-picker");
    const button = document.getElementById("language-button");
    const flag = document.getElementById("language-flag");
    const name = document.getElementById("language-name");
    const languages = { es: ["🇪🇸", "Español"], en: ["🇬🇧", "English"], fr: ["🇫🇷", "Français"] };
    if (button) button.addEventListener("click", () => { const open = picker.classList.toggle("open"); button.setAttribute("aria-expanded", String(open)); });
    document.querySelectorAll("[data-language]").forEach(option => {
      option.setAttribute("aria-selected", String(option.dataset.language === language));
      option.addEventListener("click", () => applyLanguage(option.dataset.language));
    });
    const selected = languages[language] || languages.es;
    if (flag) flag.textContent = selected[0];
    if (name) name.textContent = selected[1];
    if (button) button.setAttribute("aria-label", selected[1]);
    document.addEventListener("click", event => { if (picker && !picker.contains(event.target)) { picker.classList.remove("open"); button?.setAttribute("aria-expanded", "false"); } });
    translateDom();
    new MutationObserver(() => translateDom()).observe(document.body, { childList: true, subtree: true });
  });
})();
