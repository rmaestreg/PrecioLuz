"use strict";

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
      loadSequence: 0
    };

    const $ = id => document.getElementById(id);
    const elements = {
      dateInput: $("date-input"),
      previousDayButton: $("previous-day-button"),
      nextDayButton: $("next-day-button"),
      todayButton: $("today-button"),
      dryerButton: $("dryer-button"),
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
      csvButton: $("csv-button")
    };

    

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

    function askDryer() {
      const index = currentDataIndex();
      if (index < 0) {
        window.alert("Selecciona “Hoy” y espera a que se carguen los precios actuales.");
        return;
      }

      const current = state.data[index];
      const daySummary = summary();
      const isGoodTime = current.level === "low" || current.priceKWh <= daySummary.average;
      const answer = isGoodTime ? "Sí, es una buena hora para poner la secadora." : "Mejor espera: ahora el precio está por encima de la media del día.";
      window.alert(`${answer}\n\nAhora (${current.label}): ${formatPrice(current.priceKWh)} €/kWh`);
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
        state.data = normalised.rows;
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
          state.data = cached.rows;
          state.sourceUpdatedAt = cached.sourceUpdatedAt;
          state.fetchedAt = cached.savedAt;
          state.currentSource = "copia local";
          setStatus("No se pudo conectar. Se muestra la última copia guardada.", "cached", `Guardada: ${formatDateTime(cached.savedAt)}`);
          renderAll();
        } else {
          state.data = [];
          state.sourceUpdatedAt = null;
          state.fetchedAt = null;
          state.currentSource = "";
          setStatus("No se pudieron cargar los precios.", "error", error.message);
          elements.currentTitle.textContent = "Datos no disponibles";
          elements.currentAdvice.textContent = "Comprueba la conexión y vuelve a pulsar “Actualizar”.";
          elements.currentPrice.textContent = "—";
          elements.rows.innerHTML = '<tr><td colspan="5">No se pudieron cargar los datos.</td></tr>';
          renderChart();
          elements.csvButton.disabled = true;
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
      state.followingToday = false;
      loadData(shiftDate(elements.dateInput.value, 1), { manual: true });
    });
    elements.dateInput.addEventListener("change", () => {
      if (!elements.dateInput.value) return;
      state.followingToday = elements.dateInput.value === todayKey();
      loadData(elements.dateInput.value, { manual: true });
    });
    elements.themeButton.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
    elements.dryerButton.addEventListener("click", askDryer);
    elements.csvButton.addEventListener("click", downloadCsv);

    document.querySelectorAll(".tab").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        state.activeFilter = button.dataset.filter;
        renderChart();
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
      if (!document.hidden && state.selectedDate === todayKey()) {
        updateHero();
        renderChart();
        renderTable();
        updateSimulator();
      }
    });

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

    initialiseTheme();
    state.selectedDate = todayKey();
    elements.dateInput.value = state.selectedDate;
    loadData(state.selectedDate);

    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(error => {
          console.warn("No se pudo registrar el modo instalable:", error);
        });
      });
    }
