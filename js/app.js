"use strict";

/* Estado de la interfaz, eventos, modo offline, histórico e inicialización. */

    const CONFIG = Object.freeze({
      timezone: "Europe/Madrid",
      apiBase: "https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real",
      refreshMs: 15 * 60 * 1000,
      requestTimeoutMs: 16000,
      cachePrefix: "pvpc-dashboard-v3:",
      lowThreshold: 0.10,
      highThreshold: 0.15
    });

    const state = {
      data: [],
      selectedDate: "",
      sourceUpdatedAt: null,
      fetchedAt: null,
      activeFilter: "all",
      followingToday: true,
      currentSource: "",
      loadSequence: 0,
      tomorrowAvailable: false,
      history: [],
      historyRange: 7,
      retryScheduled: false
    };

    const $ = id => document.getElementById(id);
    const elements = {
      dateInput: $("date-input"),
      previousDayButton: $("previous-day-button"),
      nextDayButton: $("next-day-button"),
      todayButton: $("today-button"),
      dryerButton: $("dryer-button"),
      lightDialog: $("light-dialog"),
      lightDialogMessage: $("light-dialog-message"),
      lightDialogClose: $("light-dialog-close"),
      lightDialogAccept: $("light-dialog-accept"),
      refreshButton: $("refresh-button"),
      themeButton: $("theme-button"),
      statusLine: $("status-line"),
      statusText: $("status-text"),
      statusMeta: $("status-meta"),
      currentTitle: $("current-title"),
      currentAdvice: $("current-advice"),
      currentPrice: $("current-price"),
      averagePrice: $("average-price"),
      averageDetail: $("average-detail"),
      minimumPrice: $("minimum-price"),
      minimumHour: $("minimum-hour"),
      maximumPrice: $("maximum-price"),
      maximumHour: $("maximum-hour"),
      priceSpread: $("price-spread"),
      spreadDetail: $("spread-detail"),
      chart: $("price-chart"),
      tooltip: $("tooltip"),
      rows: $("price-rows"),
      tableDescription: $("table-description"),
      applianceSelect: $("appliance-select"),
      energyInput: $("energy-input"),
      durationInput: $("duration-input"),
      bestWindow: $("best-window"),
      bestCost: $("best-cost"),
      currentCost: $("current-cost"),
      savingBox: $("saving-box"),
      csvButton: $("csv-button"),
      historyChart: $("history-chart"),
      historyStatus: $("history-status"),
      historyAverage: $("history-average"),
      historyMinimum: $("history-minimum"),
      historyMaximum: $("history-maximum"),
      historySpread: $("history-spread")
    };

    async function loadAppVersion() {
      try {
        const response = await fetch("./version.json", { cache: "no-store" });
        if (!response.ok) throw new Error("No se pudo cargar la versión");
        const { version } = await response.json();
        if (version) $("app-version").textContent = `v${version}`;
      } catch (error) {
        console.warn("No se pudo cargar la versión de la App", error);
      }
    }

    function showLightDialog(message) {
      elements.lightDialogMessage.textContent = message;
      elements.lightDialog.hidden = false;
      elements.lightDialogAccept.focus();
    }

    function closeLightDialog() { elements.lightDialog.hidden = true; }

    function syncHourlyDetails() {
      const details = document.getElementById("hourly-details");
      if (!details) return;
      details.open = !window.matchMedia("(max-width: 640px)").matches;
      updateHourlyDetailsLabel(details);
    }

    function updateHourlyDetailsLabel(details) {
      const label = document.getElementById("details-toggle-label");
      if (label) label.textContent = details.open ? "Ocultar detalle" : "Ver detalle";
    }

    

    function summary() {
      if (!state.data.length) return null;
      const prices = state.data.map(item => item.priceKWh);
      const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const minimum = state.data.reduce((best, item) => item.priceKWh < best.priceKWh ? item : best);
      const maximum = state.data.reduce((best, item) => item.priceKWh > best.priceKWh ? item : best);
      return { average, minimum, maximum, spread: maximum.priceKWh - minimum.priceKWh };
    }

    function currentDataIndex() {
      if (state.selectedDate !== todayKey()) return -1;
      const now = Date.now();
      return state.data.findIndex(item => now >= item.startMs && now < item.endMs);
    }

    function updateDateNavigation() {
      const today = todayKey();
      const tomorrow = shiftDate(today, 1);
      const selectedDate = elements.dateInput.value || state.selectedDate;
      elements.nextDayButton.disabled = selectedDate >= tomorrow || (selectedDate === today && !state.tomorrowAvailable);
    }

    async function checkTomorrowAvailability() {
      try {
        const tomorrow = shiftDate(todayKey(), 1);
        const { payload } = await fetchOfficialData(tomorrow);
        state.tomorrowAvailable = normaliseApiResponse(payload, tomorrow).rows.length > 0;
      } catch (error) {
        state.tomorrowAvailable = false;
      }
      updateDateNavigation();
    }

    function updateHero() {
      const daySummary = summary();
      const index = currentDataIndex();
      if (!daySummary || index < 0) {
        elements.currentTitle.textContent = state.selectedDate === todayKey() ? "Precio actual no disponible" : `Datos del ${formatDateLong(state.selectedDate)}`;
        elements.currentAdvice.textContent = state.selectedDate === todayKey()
          ? "No se ha podido asociar la hora actual con una franja publicada."
          : "Selecciona “Hoy” para ver el precio correspondiente a este momento.";
        elements.currentPrice.textContent = "—";
        return;
      }

      const current = state.data[index];
      const relation = ((current.priceKWh / daySummary.average) - 1) * 100;
      const relationText = Math.abs(relation) < .5
        ? "prácticamente igual a la media"
        : `${Math.abs(relation).toLocaleString("es-ES", { maximumFractionDigits: 1 })} % ${relation < 0 ? "por debajo" : "por encima"} de la media`;

      elements.currentTitle.textContent = `${current.label} · precio ${levelLabel(current.level).toLowerCase()}`;
      elements.currentPrice.textContent = formatPrice(current.priceKWh);

      if (current.level === "low") {
        elements.currentAdvice.textContent = `Esta franja está ${relationText}. Es una de las opciones más favorables del día para desplazar consumo flexible.`;
      } else if (current.level === "high") {
        elements.currentAdvice.textContent = `Esta franja está ${relationText}. Conviene posponer consumos flexibles cuando sea posible.`;
      } else {
        elements.currentAdvice.textContent = `Esta franja está ${relationText}. El planificador permite comprobar si existe una ventana claramente más barata.`;
      }
    }

    async function askLight() {
      const index = currentDataIndex();
      if (index < 0) {
        showLightDialog("Selecciona “Hoy” y espera a que se cargue el precio actual.");
        return;
      }

      const current = state.data[index];
      const daySummary = summary();
      if (current.level !== "high") {
        const answer = current.level === "low"
          ? "Está barata: es una buena franja para consumir."
          : "Está en un nivel intermedio, cerca de la media del día.";
        showLightDialog(`${answer}\n\nAhora (${current.label}): ${formatPrice(current.priceKWh)} €/kWh`);
        return;
      }

      let nextCheap = state.data.slice(index + 1).find(item => item.level === "low");
      let nextDate = todayKey();

      if (!nextCheap && state.tomorrowAvailable) {
        try {
          const tomorrow = shiftDate(todayKey(), 1);
          const cached = loadCache(tomorrow);
          let tomorrowRows = cached?.rows || [];
          if (!tomorrowRows.length) {
            const { payload } = await fetchOfficialData(tomorrow);
            tomorrowRows = normaliseApiResponse(payload, tomorrow).rows;
          }
          nextCheap = tomorrowRows.find(item => item.level === "low");
          nextDate = tomorrow;
        } catch (error) {
          console.warn("No se pudo consultar la próxima franja barata", error);
        }
      }

      const nextMessage = nextCheap
        ? `La próxima franja barata es el ${formatDateLong(nextDate)}, de ${nextCheap.label}, a ${formatPrice(nextCheap.priceKWh)} €/kWh.`
        : "No hay otra franja barata disponible en los datos publicados.";
      showLightDialog(`Está cara: ahora (${current.label}) cuesta ${formatPrice(current.priceKWh)} €/kWh. Conviene esperar.\n\n${nextMessage}`);
    }

    function updateMetricCards() {
      const daySummary = summary();
      if (!daySummary) return;
      elements.averagePrice.textContent = `${formatPrice(daySummary.average)} €`;
      elements.averageDetail.textContent = `${state.data.length} franjas publicadas`;
      elements.minimumPrice.textContent = `${formatPrice(daySummary.minimum.priceKWh)} €`;
      elements.minimumHour.textContent = daySummary.minimum.label;
      elements.maximumPrice.textContent = `${formatPrice(daySummary.maximum.priceKWh)} €`;
      elements.maximumHour.textContent = daySummary.maximum.label;
      elements.priceSpread.textContent = `${formatPrice(daySummary.spread)} €`;
      const ratio = daySummary.minimum.priceKWh === 0 ? null : daySummary.maximum.priceKWh / daySummary.minimum.priceKWh;
      elements.spreadDetail.textContent = ratio && ratio > 0
        ? `El máximo es ${ratio.toLocaleString("es-ES", { maximumFractionDigits: 2 })}× el mínimo`
        : "Diferencia absoluta del día";
    }

    

    

    function renderAll() {
      updateHero();
      updateMetricCards();
      renderChart();
      renderTable();
      updateSimulator();
      elements.csvButton.disabled = !state.data.length;
      elements.dryerButton.disabled = currentDataIndex() < 0;
      updateDateNavigation();
    }

    function renderHistory() {
      if (!state.history.length) {
        elements.historyAverage.textContent = "—";
        elements.historyMinimum.textContent = "—";
        elements.historyMaximum.textContent = "—";
        elements.historySpread.textContent = "—";
        elements.historyChart.innerHTML = '<p class="panel-description">No hay datos históricos disponibles.</p>';
        return;
      }
      const periodAverage = state.history.reduce((sum, item) => sum + item.average, 0) / state.history.length;
      const periodMinimum = Math.min(...state.history.map(item => item.minimum));
      const periodMaximum = Math.max(...state.history.map(item => item.maximum));
      elements.historyAverage.textContent = `${formatPrice(periodAverage)} €/kWh`;
      elements.historyMinimum.textContent = `${formatPrice(periodMinimum)} €/kWh`;
      elements.historyMaximum.textContent = `${formatPrice(periodMaximum)} €/kWh`;
      elements.historySpread.textContent = `${formatPrice(periodMaximum - periodMinimum)} €/kWh`;
      const maximum = Math.max(...state.history.map(item => item.maximum), .001);
      elements.historyChart.innerHTML = state.history.map(item => {
        const date = new Date(`${item.dateKey}T12:00:00`);
        const shortDate = state.historyRange === 365
          ? new Intl.DateTimeFormat("es-ES", { month: "short" }).format(date).replace(".", "").toUpperCase()
          : new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit" }).format(date);
        const bar = (value, type, label) => `<div class="history-bar ${type}" style="height:${Math.max(2, value / maximum * 100)}%" title="${label}: ${formatPrice(value)} €/kWh"></div>`;
        const tooltip = `${shortDate}\nMínimo: ${formatPrice(item.minimum)} €/kWh\nMedia: ${formatPrice(item.average)} €/kWh\nMáximo: ${formatPrice(item.maximum)} €/kWh`;
        return `<div class="history-day" aria-label="${tooltip.replaceAll("\n", ", ")}"><div class="history-bars"><span class="history-tooltip">${tooltip}</span>${bar(item.minimum, "minimum", "Mínimo")}${bar(item.average, "average", "Media")}${bar(item.maximum, "maximum", "Máximo")}</div><span class="history-day-label">${shortDate}</span></div>`;
      }).join("");
      const periodLabel = state.historyRange === 365 ? "meses" : "días";
      elements.historyStatus.textContent = `${state.history.length} ${periodLabel} con precios publicados.`;
    }

    async function loadHistory() {
      const dates = Array.from({ length: state.historyRange }, (_, index) => shiftDate(todayKey(), -index));
      const results = [];
      if (state.historyRange <= 7) {
        for (const dateKey of dates) {
          const cached = loadCache(dateKey);
          let rows = cached?.rows || [];
          if (!rows.length) {
            try { rows = normaliseApiResponse((await fetchOfficialData(dateKey)).payload, dateKey).rows; } catch (error) { rows = []; }
          }
          if (rows.length) {
            const prices = rows.map(item => item.priceKWh);
            results.push({ dateKey, average: prices.reduce((sum, price) => sum + price, 0) / prices.length, minimum: Math.min(...prices), maximum: Math.max(...prices) });
          }
        }
      } else {
        const startDate = dates.at(-1);
        const ranges = [];
        let cursor = new Date(`${startDate}T12:00:00`);
        const endDate = todayKey();
        while (cursor <= new Date(`${endDate}T12:00:00`)) {
          const monthStart = [cursor.getFullYear(), String(cursor.getMonth() + 1).padStart(2, "0"), "01"].join("-");
          const nextMonth = new Date(cursor);
          nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
          const monthEnd = shiftDate([nextMonth.getFullYear(), String(nextMonth.getMonth() + 1).padStart(2, "0"), String(nextMonth.getDate()).padStart(2, "0")].join("-"), -1);
          ranges.push({ start: monthStart < startDate ? startDate : monthStart, end: monthEnd > endDate ? endDate : monthEnd });
          cursor = nextMonth;
        }
        const chunks = await Promise.all(ranges.map(async range => {
          try {
            const { payload } = await fetchOfficialRange(range.start, range.end);
            return normaliseHistoricalPayload(payload, range.start, range.end);
          } catch (error) {
            return [];
          }
        }));
        results.push(...chunks.flat());
      }
      const available = results.filter(Boolean);
      if (state.historyRange === 365) {
        const months = new Map();
        available.forEach(item => {
          const month = item.dateKey.slice(0, 7);
          const group = months.get(month) || { dateKey: `${month}-01`, averages: [], minimum: Infinity, maximum: -Infinity };
          group.averages.push(item.average);
          group.minimum = Math.min(group.minimum, item.minimum);
          group.maximum = Math.max(group.maximum, item.maximum);
          months.set(month, group);
        });
        state.history = [...months.values()].map(item => ({ dateKey: item.dateKey, average: item.averages.reduce((sum, value) => sum + value, 0) / item.averages.length, minimum: item.minimum, maximum: item.maximum }));
      } else {
        state.history = available;
      }
      state.history.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
      renderHistory();
    }

    function clearViewForMissingData(message = "No hay datos disponibles.") {
      state.data = [];
      state.sourceUpdatedAt = null;
      state.fetchedAt = null;
      state.currentSource = "";

      elements.currentTitle.textContent = "Datos no disponibles";
      elements.currentAdvice.textContent = "Comprueba la conexión y vuelve a intentarlo.";
      elements.currentPrice.textContent = "—";
      elements.averagePrice.textContent = "—";
      elements.averageDetail.textContent = "Sin datos";
      elements.minimumPrice.textContent = "—";
      elements.minimumHour.textContent = "—";
      elements.maximumPrice.textContent = "—";
      elements.maximumHour.textContent = "—";
      elements.priceSpread.textContent = "—";
      elements.spreadDetail.textContent = "—";
      elements.rows.innerHTML = `<tr><td colspan="5">${message}</td></tr>`;
      elements.csvButton.disabled = true;
      elements.dryerButton.disabled = true;
      updateSimulator();
      renderChart();
      updateDateNavigation();
    }

    async function loadData(dateKey, { manual = false } = {}) {
      const sequence = ++state.loadSequence;
      state.selectedDate = dateKey;
      elements.dateInput.value = dateKey;
      elements.refreshButton.disabled = true;
      setStatus(manual ? "Actualizando datos oficiales…" : "Cargando datos oficiales…", "loading", formatDateLong(dateKey));

      try {
        const { payload, source } = await fetchOfficialData(dateKey);
        if (sequence !== state.loadSequence) return;
        const normalised = normaliseApiResponse(payload, dateKey);
        if (!normalised.rows.length) {
          setStatus("No hay precios publicados para esta fecha.", "error", formatDateLong(dateKey));
          clearViewForMissingData("No hay precios publicados para esta fecha.");
          return;
        }
        state.data = normalised.rows;
        if (dateKey === shiftDate(todayKey(), 1) && state.data.length) state.tomorrowAvailable = true;
        state.sourceUpdatedAt = normalised.sourceUpdatedAt;
        state.fetchedAt = new Date().toISOString();
        state.currentSource = source;
        saveCache(dateKey, normalised);
        const publication = state.sourceUpdatedAt ? `Publicación: ${formatDateTime(state.sourceUpdatedAt)} · ` : "";
        setStatus("Datos oficiales cargados correctamente.", "ready", `${publication}Consulta: ${formatDateTime(state.fetchedAt)} · Fuente: ${source}`);
        renderAll();
      } catch (error) {
        console.error(error);
        if (sequence !== state.loadSequence) return;
        const cached = loadCache(dateKey);
        if (cached) {
          if (!cached.rows.length) {
            setStatus("No hay precios publicados para esta fecha.", "error", formatDateLong(dateKey));
            clearViewForMissingData("No hay precios publicados para esta fecha.");
            return;
          }
          state.data = cached.rows;
          state.sourceUpdatedAt = cached.sourceUpdatedAt;
          state.fetchedAt = cached.savedAt;
          state.currentSource = "copia local";
          setStatus("No se pudo conectar. Se muestra la última copia guardada.", "cached", `Guardada: ${formatDateTime(cached.savedAt)}`);
          renderAll();
        } else {
          setStatus("No se pudieron cargar los precios.", "error", error.message);
          clearViewForMissingData("No se pudieron cargar los datos.");
        }
      } finally {
        if (sequence === state.loadSequence) elements.refreshButton.disabled = false;
      }
    }

    function downloadCsv() {
      if (!state.data.length) return;
      const lines = [
        ["fecha", "franja", "precio_EUR_MWh", "precio_EUR_kWh", "nivel"],
        ...state.data.map(item => [state.selectedDate, item.label, item.priceMWh.toFixed(5), item.priceKWh.toFixed(8), levelLabel(item.level)])
      ];
      const csv = lines.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pvpc-${state.selectedDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    function safeStorageGet(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    }

    function safeStorageSet(key, value) {
      try { localStorage.setItem(key, value); } catch { /* El archivo puede abrirse en un contexto sin almacenamiento. */ }
    }

    function applyTheme(theme) {
      document.documentElement.dataset.theme = theme;
      safeStorageSet("pvpc-theme", theme);
      const themeMeta = document.getElementById("theme-color-meta");
      if (themeMeta) themeMeta.content = theme === "dark" ? "#0c111b" : "#315ee7";
      elements.themeButton.textContent = theme === "dark" ? "☀" : "◐";
      elements.themeButton.setAttribute("aria-label", theme === "dark" ? "Activar tema claro" : "Activar tema oscuro");
      if (state.data.length) renderChart();
    }

    function initialiseTheme() {
      const saved = safeStorageGet("pvpc-theme");
      const preferred = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      applyTheme(saved === "dark" || saved === "light" ? saved : preferred);
    }

    elements.refreshButton.addEventListener("click", () => loadData(state.selectedDate, { manual: true }));
    elements.todayButton.addEventListener("click", () => {
      state.followingToday = true;
      loadData(todayKey(), { manual: true });
    });
    elements.previousDayButton.addEventListener("click", () => {
      if (!elements.dateInput.value) return;
      state.followingToday = false;
      loadData(shiftDate(elements.dateInput.value, -1), { manual: true });
    });
    elements.nextDayButton.addEventListener("click", () => {
      if (!elements.dateInput.value) return;
      if (elements.nextDayButton.disabled) return;
      state.followingToday = false;
      loadData(shiftDate(elements.dateInput.value, 1), { manual: true });
    });
    elements.dateInput.addEventListener("change", () => {
      if (!elements.dateInput.value) return;
      const latestAllowedDate = state.tomorrowAvailable ? shiftDate(todayKey(), 1) : todayKey();
      if (elements.dateInput.value > latestAllowedDate) {
        elements.dateInput.value = state.selectedDate;
        updateDateNavigation();
        return;
      }
      state.followingToday = elements.dateInput.value === todayKey();
      loadData(elements.dateInput.value, { manual: true });
    });
    elements.themeButton.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
    elements.dryerButton.addEventListener("click", askLight);
    elements.lightDialogClose.addEventListener("click", closeLightDialog);
    elements.lightDialogAccept.addEventListener("click", closeLightDialog);
    elements.lightDialog.addEventListener("click", event => {
      if (event.target === elements.lightDialog) closeLightDialog();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !elements.lightDialog.hidden) closeLightDialog();
    });
    elements.csvButton.addEventListener("click", downloadCsv);

    document.querySelectorAll(".tabs .tab").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        state.activeFilter = button.dataset.filter;
        renderChart();
      });
    });

    document.querySelectorAll(".history-tab").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".history-tab").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        state.historyRange = Number(button.dataset.historyRange);
        elements.historyStatus.textContent = "Cargando histórico…";
        loadHistory();
      });
    });

    elements.applianceSelect.addEventListener("change", () => {
      if (elements.applianceSelect.value !== "custom") {
        const [energy, duration] = elements.applianceSelect.value.split(",");
        elements.energyInput.value = energy;
        elements.durationInput.value = duration;
      }
      updateSimulator();
    });
    elements.energyInput.addEventListener("input", updateSimulator);
    elements.durationInput.addEventListener("input", updateSimulator);

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderChart, 100);
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && navigator.onLine && state.currentSource === "copia local") retryAfterConnection();
      if (!document.hidden && state.selectedDate === todayKey()) {
        updateHero();
        renderChart();
        renderTable();
        updateSimulator();
      }
    });

    function retryAfterConnection() {
      if (!state.selectedDate || state.retryScheduled) return;
      state.retryScheduled = true;
      setStatus("Conexión recuperada. Actualizando datos…", "loading", formatDateLong(state.selectedDate));
      window.setTimeout(() => {
        state.retryScheduled = false;
        if (!navigator.onLine) return;
        loadData(state.selectedDate, { manual: true });
        loadHistory();
      }, 700);
    }

    window.addEventListener("offline", () => {
      setStatus("Sin conexión. Se muestran los últimos datos guardados.", "cached", "Los precios se actualizarán al recuperar Internet.");
    });
    window.addEventListener("online", retryAfterConnection);

    window.setInterval(() => {
      const newToday = todayKey();
      if (state.followingToday && newToday !== state.selectedDate) {
        loadData(newToday);
        return;
      }
      updateHero();
      renderChart();
      renderTable();
      updateSimulator();
    }, 60 * 1000);

    window.setInterval(() => {
      if (!document.hidden) loadData(state.selectedDate);
    }, CONFIG.refreshMs);

    window.setInterval(() => {
      if (!document.hidden && navigator.onLine && state.currentSource === "copia local") retryAfterConnection();
    }, 15 * 1000);

    initialiseTheme();
    loadAppVersion();
    syncHourlyDetails();
    document.getElementById("hourly-details")?.addEventListener("toggle", event => updateHourlyDetailsLabel(event.currentTarget));
    window.matchMedia("(max-width: 640px)").addEventListener("change", syncHourlyDetails);
    state.selectedDate = todayKey();
    elements.dateInput.value = state.selectedDate;
    updateDateNavigation();
    checkTomorrowAvailability();
    loadData(state.selectedDate);
    loadHistory();

    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(error => {
          console.warn("No se pudo registrar el modo instalable:", error);
        });
      });
    }
