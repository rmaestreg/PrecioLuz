"use strict";

/* Estado de la interfaz, eventos, modo offline, histórico e inicialización. */

    const CONFIG = Object.freeze({
      apiBase: "https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real",
      refreshMs: 15 * 60 * 1000,
      requestTimeoutMs: 16000,
      cachePrefix: "pvpc-dashboard-v4:",
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
      historyLoadSequence: 0,
      plannerNextDayKey: "",
      plannerNextDayRows: [],
      plannerNextDayLoading: false,
      retryScheduled: false,
      statusKey: "status.loading",
      statusType: "loading",
      statusValues: {},
      statusMeta: "",
      comparisonLoadSequence: 0,
      comparisons: { loading: true, yesterday: null, weeklyAverage: null, weeklyCount: 0 }
    };

    const $ = id => document.getElementById(id);
    const elements = {
      dateInput: $("date-input"),
      todayTab: $("today-tab"),
      tomorrowTab: $("tomorrow-tab"),
      todayTabDate: $("today-tab-date"),
      tomorrowTabStatus: $("tomorrow-tab-status"),
      regionSelect: $("region-select"),
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
      comparisonYesterdayValue: $("comparison-yesterday-value"),
      comparisonYesterdayDetail: $("comparison-yesterday-detail"),
      comparisonWeekValue: $("comparison-week-value"),
      comparisonWeekDetail: $("comparison-week-detail"),
      practicalWindowValue: $("practical-window-value"),
      practicalWindowDetail: $("practical-window-detail"),
      chart: $("price-chart"),
      tooltip: $("tooltip"),
      rows: $("price-rows"),
      tableDescription: $("table-description"),
      applianceSelect: $("appliance-select"),
      profileSaveButton: $("profile-save-button"),
      profileDeleteButton: $("profile-delete-button"),
      plannerStartTime: $("planner-start-time"),
      plannerEndTime: $("planner-end-time"),
      energyInput: $("energy-input"),
      durationInput: $("duration-input"),
      bestWindow: $("best-window"),
      bestCost: $("best-cost"),
      bestDayWindow: $("best-day-window"),
      bestDayCost: $("best-day-cost"),
      currentCost: $("current-cost"),
      savingBox: $("saving-box"),
      smartTaskForm: $("smart-task-form"),
      smartTaskName: $("smart-task-name"),
      smartTaskEnergy: $("smart-task-energy"),
      smartTaskDuration: $("smart-task-duration"),
      smartTaskDeadline: $("smart-task-deadline"),
      smartTaskPower: $("smart-task-power"),
      smartTaskAnytime: $("smart-task-anytime"),
      smartTaskInterruptible: $("smart-task-interruptible"),
      smartContractedPower: $("smart-contracted-power"),
      smartTaskList: $("smart-task-list"),
      smartQueueStatus: $("smart-queue-status"),
      smartQueuePlan: $("smart-queue-plan"),
      csvButton: $("csv-button"),
      historyChart: $("history-chart"),
      historyStatus: $("history-status"),
      historyAverage: $("history-average"),
      historyMinimum: $("history-minimum"),
      historyMaximum: $("history-maximum"),
      historySpread: $("history-spread"),
      updateButton: $("update-button") || {
        hidden: true,
        disabled: true,
        setAttribute() {},
        removeAttribute() {}
      }
    };

    const tr = (key, values = {}) => window.i18n?.t(key, values) || key;

    function setLocalizedStatus(key, type = "ready", meta = "", values = {}) {
      state.statusKey = key;
      state.statusType = type;
      state.statusValues = values;
      state.statusMeta = meta;
      setStatus(tr(key, values), type, meta);
    }

    const versionElement = $("app-version");
    const runningVersion = versionElement ? versionElement.textContent.trim().replace(/[()]/g, "").replace(/^v/i, "") : "—";
    let availableVersion = runningVersion;
    let serviceWorkerRegistration = null;
    let updateActivationStarted = false;

    async function loadAppVersion() {
      try {
        const response = await fetch(`./version.json?check=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("No se pudo cargar la versión");
        const { version } = await response.json();
        if (version) {
          availableVersion = String(version).replace(/^v/i, "");
        }
      } catch (error) {
        console.warn("No se pudo cargar la versión de la App", error);
      }
    }

    function showUpdateNotice(version = "") {
      if (updateActivationStarted) return;
      elements.updateButton.hidden = false;
      elements.updateButton.textContent = "↻";
      elements.updateButton.title = version ? tr("update.to", { version }) : tr("update.generic");
      elements.updateButton.setAttribute("aria-label", tr("controls.installUpdate"));
      elements.updateButton.disabled = false;
      elements.updateButton.removeAttribute("aria-busy");
    }

    function hideUpdateNotice() {
      if (updateActivationStarted) return;
      elements.updateButton.hidden = true;
      elements.updateButton.disabled = false;
      elements.updateButton.removeAttribute("aria-busy");
    }

    loadAppVersion();

    function activateWaitingWorker(registration, worker = registration?.waiting) {
      const waiting = registration?.waiting || worker;
      if (!waiting) return false;
      updateActivationStarted = true;
      elements.updateButton.hidden = true;
      elements.updateButton.disabled = true;
      elements.updateButton.setAttribute("aria-busy", "true");
      navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
      waiting.postMessage({ type: "SKIP_WAITING" });
      return true;
    }

    function waitForWaitingWorker(registration, timeoutMs = 10000) {
      if (registration?.waiting) return Promise.resolve(registration.waiting);

      return new Promise(resolve => {
        let finished = false;
        let timer;
        const finish = worker => {
          if (finished) return;
          finished = true;
          window.clearTimeout(timer);
          resolve(worker || null);
        };
        const watch = worker => {
          if (!worker) return;
          if (worker.state === "installed") {
            finish(registration.waiting || worker);
            return;
          }
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed") finish(registration.waiting || worker);
            if (worker.state === "redundant") finish(null);
          });
        };

        if (registration.installing) watch(registration.installing);
        registration.addEventListener("updatefound", () => watch(registration.installing), { once: true });
        timer = window.setTimeout(() => finish(registration.waiting), timeoutMs);
      });
    }

    async function checkForUpdates() {
      await loadAppVersion();
      const registration = serviceWorkerRegistration;
      if (!registration || updateActivationStarted) return;

      try {
        // update() solo descarga e instala el nuevo worker en estado waiting;
        // no lo activa porque sw.js no llama a skipWaiting automáticamente.
        await registration.update();
      } catch (error) {
        console.warn("No se pudo comprobar si hay una actualización", error);
      }

      if (registration.waiting) showUpdateNotice(availableVersion !== runningVersion ? availableVersion : "");
      else if (availableVersion !== runningVersion && runningVersion !== "—") showUpdateNotice(availableVersion);
      else hideUpdateNotice();
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
      if (!details.dataset.initialized) {
        details.open = false;
        details.dataset.initialized = "true";
      }
      updateHourlyDetailsLabel(details);
    }

    function updateHourlyDetailsLabel(details) {
      const label = document.getElementById("details-toggle-label");
      if (label) label.textContent = window.i18n?.t(details.open ? "detail.hide" : "detail.show") || (details.open ? "Ocultar detalle" : "Ver detalle");
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

    function updateDaySwitch() {
      const today = todayKey();
      const tomorrow = shiftDate(today, 1);
      const isToday = state.selectedDate === today;
      const isTomorrow = state.selectedDate === tomorrow;
      elements.todayTab?.classList.toggle("active", isToday);
      elements.tomorrowTab?.classList.toggle("active", isTomorrow);
      elements.todayTab?.setAttribute("aria-selected", String(isToday));
      elements.tomorrowTab?.setAttribute("aria-selected", String(isTomorrow));
      if (elements.todayTabDate) elements.todayTabDate.textContent = formatDateLong(today).replace(/^[^,]+,?\s*/u, "");
      if (elements.tomorrowTabStatus) elements.tomorrowTabStatus.textContent = state.tomorrowAvailable
        ? formatDateLong(tomorrow).replace(/^[^,]+,?\s*/u, "")
        : tr("day.notPublished");
      if (elements.tomorrowTab) elements.tomorrowTab.disabled = !state.tomorrowAvailable;
      if (elements.regionSelect) elements.regionSelect.value = getRegionKey();
    }

    function updateDateNavigation() {
      const today = todayKey();
      const tomorrow = shiftDate(today, 1);
      const selectedDate = elements.dateInput.value || state.selectedDate;
      elements.nextDayButton.disabled = selectedDate >= tomorrow || (selectedDate === today && !state.tomorrowAvailable);
      updateDaySwitch();
    }

    async function checkTomorrowAvailability() {
      const tomorrow = shiftDate(todayKey(), 1);
      const cached = loadCache(tomorrow);
      if (cached?.rows?.length) {
        state.tomorrowAvailable = true;
        state.plannerNextDayKey = tomorrow;
        state.plannerNextDayRows = cached.rows;
        updateDateNavigation();
      }
      try {
        const { payload } = await fetchOfficialData(tomorrow);
        const normalised = normaliseApiResponse(payload, tomorrow);
        state.tomorrowAvailable = normalised.rows.length > 0;
        if (state.tomorrowAvailable) {
          saveCache(tomorrow, normalised);
          state.plannerNextDayKey = tomorrow;
          state.plannerNextDayRows = normalised.rows;
        }
      } catch (error) {
        if (!cached?.rows?.length) state.tomorrowAvailable = false;
      }
      updateDateNavigation();
      if (typeof updateSimulator === "function") updateSimulator();
      if (typeof updateSmartQueue === "function") updateSmartQueue();
      window.PriceLuzTools?.refreshPriceData?.();
    }

    async function ensurePlannerFollowingDay(nextDate) {
      if (!nextDate || state.plannerNextDayKey === nextDate || state.plannerNextDayLoading) return;
      const cached = loadCache(nextDate);
      if (cached?.rows?.length) {
        state.plannerNextDayKey = nextDate;
        state.plannerNextDayRows = cached.rows;
        updateSimulator();
        return;
      }
      if (state.selectedDate !== todayKey() || !state.tomorrowAvailable) return;
      state.plannerNextDayLoading = true;
      updateSimulator();
      try {
        const { payload } = await fetchOfficialData(nextDate);
        const normalised = normaliseApiResponse(payload, nextDate);
        state.plannerNextDayKey = nextDate;
        state.plannerNextDayRows = normalised.rows;
        saveCache(nextDate, normalised);
      } catch (error) {
        console.warn("No se pudo cargar el día siguiente para el planificador", error);
      } finally {
        state.plannerNextDayLoading = false;
        updateSimulator();
        window.PriceLuzTools?.refreshPriceData?.();
      }
    }

    function updateHero() {
      const daySummary = summary();
      const index = currentDataIndex();
      if (!daySummary || index < 0) {
        elements.currentTitle.textContent = state.selectedDate === todayKey() ? tr("hero.unavailable") : tr("hero.dataFor", { date: formatDateLong(state.selectedDate) });
        elements.currentAdvice.textContent = state.selectedDate === todayKey()
          ? tr("hero.noCurrentSlot")
          : tr("hero.selectToday");
        elements.currentPrice.textContent = "—";
        return;
      }

      const current = state.data[index];
      const relation = ((current.priceKWh / daySummary.average) - 1) * 100;
      const relationText = Math.abs(relation) < .5
        ? tr("hero.relationEqual")
        : `${Math.abs(relation).toLocaleString(window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES", { maximumFractionDigits: 1 })} % ${relation < 0 ? tr("hero.relationBelow") : tr("hero.relationAbove")}`;

      elements.currentTitle.textContent = tr("hero.currentTitle", { slot: current.label, level: levelLabel(current.level).toLowerCase() });
      elements.currentPrice.textContent = formatPrice(current.priceKWh);

      if (current.level === "low") {
        elements.currentAdvice.textContent = tr("hero.lowAdvice", { relation: relationText });
      } else if (current.level === "high") {
        elements.currentAdvice.textContent = tr("hero.highAdvice", { relation: relationText });
      } else {
        elements.currentAdvice.textContent = tr("hero.mediumAdvice", { relation: relationText });
      }
    }

    function formatSignedPercent(value, decimals = 0) {
      const locale = window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES";
      const number = Math.abs(value).toLocaleString(locale, { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
      return `${value < 0 ? "−" : value > 0 ? "+" : ""}${number}`;
    }

    function formatPercent(value, decimals = 1) {
      const locale = window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES";
      return Math.abs(value).toLocaleString(locale, { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
    }

    function formatWaitDuration(milliseconds) {
      const minutes = Math.max(0, Math.round(milliseconds / 60000));
      if (minutes < 1) return tr("light.lessThanMinute");
      if (minutes < 60) return `${minutes} ${tr("light.minutesUnit")}`;
      const hours = Math.floor(minutes / 60);
      const remaining = minutes % 60;
      return remaining ? `${hours} ${tr("light.hoursUnit")} ${remaining} ${tr("light.minutesUnit")}` : `${hours} ${tr("light.hoursUnit")}`;
    }

    function findFutureWindow(rows, duration) {
      if (!Number.isInteger(duration) || duration < 1 || rows.length <= duration) return null;
      let best = null;
      for (let start = 1; start <= rows.length - duration; start += 1) {
        const slice = rows.slice(start, start + duration);
        const average = slice.reduce((sum, item) => sum + item.priceKWh, 0) / duration;
        if (!best || average < best.average) best = { rows: slice, average };
      }
      return best;
    }

    function windowLabel(rows) {
      const first = rows[0];
      const last = rows.at(-1);
      return `${first.label.split("–")[0]}–${last.label.split("–")[1]}`;
    }

    async function askLight() {
      const index = currentDataIndex();
      if (index < 0) {
        showLightDialog(tr("light.selectToday"));
        return;
      }

      const current = state.data[index];
      if (current.level !== "high") {
        const answer = current.level === "low" ? tr("light.cheap") : tr("light.medium");
        showLightDialog(`${answer}\n\n${tr("light.now", { slot: current.label, price: formatPrice(current.priceKWh) })}`);
        return;
      }

      let tomorrowRows = [];
      if (state.tomorrowAvailable) {
        try {
          const tomorrow = shiftDate(todayKey(), 1);
          const cached = loadCache(tomorrow);
          tomorrowRows = cached?.rows || [];
          if (!tomorrowRows.length) {
            const { payload } = await fetchOfficialData(tomorrow);
            tomorrowRows = normaliseApiResponse(payload, tomorrow).rows;
          }
        } catch (error) {
          console.warn("No se pudo consultar la próxima ventana barata", error);
        }
      }

      const today = todayKey();
      const futureRows = [
        ...state.data.slice(index).map(row => ({ ...row, dateKey: today })),
        ...tomorrowRows.map(row => ({ ...row, dateKey: shiftDate(today, 1) }))
      ];
      const nextCheap = futureRows.slice(1).find(item => item.level === "low");
      const nextSlot = nextCheap
        ? nextCheap.dateKey === today ? nextCheap.label.split("–")[0] : `${formatDateLong(nextCheap.dateKey)}, ${nextCheap.label.split("–")[0]}`
        : null;
      const difference = nextCheap ? (nextCheap.priceKWh / current.priceKWh - 1) * 100 : null;
      const waitText = nextCheap ? formatWaitDuration(nextCheap.startMs - Date.now()) : null;
      const rawDuration = Number(elements.durationInput.value);
      const duration = Number.isFinite(rawDuration) ? Math.max(1, Math.round(rawDuration)) : 1;
      const energy = Number(elements.energyInput.value);
      const currentRows = futureRows.slice(0, duration);
      const currentCost = Number.isFinite(energy) && energy > 0 && currentRows.length === duration
        ? energy * currentRows.reduce((sum, row) => sum + row.priceKWh, 0) / duration
        : null;
      const bestFuture = Number.isFinite(energy) && energy > 0 ? findFutureWindow(futureRows, duration) : null;
      const bestCost = bestFuture ? energy * bestFuture.average : null;
      const saving = currentCost !== null && bestCost !== null ? Math.max(0, currentCost - bestCost) : null;
      const savingPercent = currentCost > 0 && saving !== null ? saving / currentCost * 100 : null;
      const consumption = Number.isFinite(energy) && energy > 0
        ? `\n\n${tr("light.consumptionHeader", { energy: formatPrice(energy, 2), hours: duration })}\n${currentCost !== null ? tr("light.currentConsumption", { cost: formatCurrency(currentCost) }) : tr("planner.notApplicable")}\n${bestFuture ? tr("light.bestWindow", { slot: windowLabel(bestFuture.rows), price: formatPrice(bestFuture.average) }) : tr("light.noWindow")}\n${bestCost !== null ? currentCost !== null ? tr("light.bestConsumption", { cost: formatCurrency(bestCost), saving: formatCurrency(saving), percent: formatPercent(savingPercent, 1) }) : tr("light.futureCost", { cost: formatCurrency(bestCost) }) : ""}`
        : "";
      const comparison = nextCheap
        ? `${tr("light.waitUntil", { slot: nextSlot })}\n${tr("light.thenPrice", { price: formatPrice(nextCheap.priceKWh) })}\n${tr("light.difference", { percent: formatSignedPercent(difference) })}\n${tr("light.waitTime", { duration: waitText })}`
        : tr("light.noNextCheap");
      showLightDialog(`${tr("light.expensiveHeadline")}\n\n${tr("light.currentPrice", { price: formatPrice(current.priceKWh) })}\n${comparison}${consumption}`);
    }

    function updateMetricCards() {
      const daySummary = summary();
      if (!daySummary) return;
      const metricValue = value => `<span class="metric-number">${formatPrice(value)}</span><span class="metric-unit">€/kWh</span>`;
      elements.averagePrice.innerHTML = metricValue(daySummary.average);
      elements.averageDetail.textContent = `${state.data.length} ${tr("detail.publishedCount")}`;
      elements.minimumPrice.innerHTML = metricValue(daySummary.minimum.priceKWh);
      elements.minimumHour.textContent = daySummary.minimum.label;
      elements.maximumPrice.innerHTML = metricValue(daySummary.maximum.priceKWh);
      elements.maximumHour.textContent = daySummary.maximum.label;
      elements.priceSpread.innerHTML = metricValue(daySummary.spread);
      const relativeDifference = daySummary.minimum.priceKWh > 0 ? daySummary.spread / daySummary.minimum.priceKWh * 100 : null;
      elements.spreadDetail.textContent = relativeDifference !== null
        ? tr("metrics.relativeDifference", { value: formatPercent(relativeDifference, 1) })
        : tr("metrics.absoluteDifference", { value: formatPrice(daySummary.spread) });
    }

    

    

    function practicalWindow(duration = 3) {
      if (!state.data.length) return null;
      let best = null;
      for (let index = 0; index <= state.data.length - duration; index += 1) {
        const rows = state.data.slice(index, index + duration);
        const first = rows[0];
        const last = rows.at(-1);
        if (first.hour < 8 || first.hour + duration > 24) continue;
        let contiguous = true;
        for (let i = 0; i < rows.length - 1; i += 1) if (rows[i + 1].startMs > rows[i].endMs + 5 * 60 * 1000) contiguous = false;
        if (!contiguous) continue;
        const average = rows.reduce((sum, row) => sum + row.priceKWh, 0) / rows.length;
        if (!best || average < best.average) best = { rows, average, duration };
      }
      return best;
    }

    function renderComparison(valueElement, detailElement, comparison, referenceKey) {
      if (!valueElement || !detailElement) return;
      if (!Number.isFinite(comparison)) {
        valueElement.textContent = "—";
        detailElement.textContent = state.comparisons.loading ? tr("insights.loading") : tr("insights.noComparison");
        valueElement.classList.remove("good-comparison", "bad-comparison");
        return;
      }
      valueElement.textContent = `${formatSignedPercent(comparison, 1)} %`;
      valueElement.classList.toggle("good-comparison", comparison < 0);
      valueElement.classList.toggle("bad-comparison", comparison > 0);
      detailElement.textContent = tr(comparison < 0 ? "insights.cheaper" : comparison > 0 ? "insights.moreExpensive" : "insights.same", {
        reference: tr(referenceKey)
      });
    }

    function renderInsights() {
      const daySummary = summary();
      const yesterdayComparison = daySummary && Number.isFinite(state.comparisons.yesterday) && state.comparisons.yesterday !== 0
        ? (daySummary.average / state.comparisons.yesterday - 1) * 100 : null;
      const weekComparison = daySummary && Number.isFinite(state.comparisons.weeklyAverage) && state.comparisons.weeklyAverage !== 0
        ? (daySummary.average / state.comparisons.weeklyAverage - 1) * 100 : null;
      renderComparison(elements.comparisonYesterdayValue, elements.comparisonYesterdayDetail, yesterdayComparison, "insights.referenceYesterday");
      renderComparison(elements.comparisonWeekValue, elements.comparisonWeekDetail, weekComparison, "insights.referenceWeek");
      const practical = practicalWindow(3) || practicalWindow(2);
      if (practical && elements.practicalWindowValue && elements.practicalWindowDetail) {
        elements.practicalWindowValue.textContent = windowLabel(practical.rows);
        elements.practicalWindowDetail.textContent = tr("insights.practicalDetail", { hours: practical.duration, price: formatPrice(practical.average) });
      } else if (elements.practicalWindowValue && elements.practicalWindowDetail) {
        elements.practicalWindowValue.textContent = "—";
        elements.practicalWindowDetail.textContent = tr("insights.noPractical");
      }
    }

    async function loadComparisons(dateKey) {
      const sequence = ++state.comparisonLoadSequence;
      state.comparisons = { loading: true, yesterday: null, weeklyAverage: null, weeklyCount: 0 };
      renderInsights();
      const start = shiftDate(dateKey, -7);
      const end = shiftDate(dateKey, -1);
      let daily = [];
      try {
        const { payload } = await fetchOfficialRange(start, end);
        daily = normaliseHistoricalPayload(payload, start, end);
      } catch (error) {
        for (let offset = 1; offset <= 7; offset += 1) {
          const key = shiftDate(dateKey, -offset);
          const cached = loadCache(key);
          if (!cached?.rows?.length) continue;
          const prices = cached.rows.map(row => row.priceKWh);
          daily.push({ dateKey: key, average: prices.reduce((sum, price) => sum + price, 0) / prices.length });
        }
      }
      if (sequence !== state.comparisonLoadSequence) return;
      const yesterday = daily.find(item => item.dateKey === end)?.average ?? null;
      const averages = daily.map(item => item.average).filter(Number.isFinite);
      state.comparisons = {
        loading: false,
        yesterday,
        weeklyAverage: averages.length ? averages.reduce((sum, value) => sum + value, 0) / averages.length : null,
        weeklyCount: averages.length
      };
      renderInsights();
    }

    function renderAll() {
      updateHero();
      updateMetricCards();
      renderInsights();
      renderChart();
      renderTable();
      updateSimulator();
      if (typeof updateSmartQueue === "function") updateSmartQueue();
      window.PriceLuzTools?.refreshPriceData?.();
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
        elements.historyChart.innerHTML = `<p class="panel-description">${tr("history.noData")}</p>`;
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
          ? new Intl.DateTimeFormat(window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES", { month: "short" }).format(date).replace(".", "").toUpperCase()
          : new Intl.DateTimeFormat(window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES", { day: "2-digit", month: "2-digit" }).format(date);
        const minimumLabel = tr("history.minimumShort");
        const averageLabel = tr("history.averageShort");
        const maximumLabel = tr("history.maximumShort");
        const bar = (value, type, label) => `<div class="history-bar ${type}" style="height:${Math.max(2, value / maximum * 100)}%" title="${label}: ${formatPrice(value)} €/kWh"></div>`;
        const tooltip = `${shortDate}\n${minimumLabel}: ${formatPrice(item.minimum)} €/kWh\n${averageLabel}: ${formatPrice(item.average)} €/kWh\n${maximumLabel}: ${formatPrice(item.maximum)} €/kWh`;
        return `<div class="history-day" aria-label="${tooltip.replaceAll("\n", ", ")}"><div class="history-bars"><span class="history-tooltip">${tooltip}</span>${bar(item.minimum, "minimum", minimumLabel)}${bar(item.average, "average", averageLabel)}${bar(item.maximum, "maximum", maximumLabel)}</div><span class="history-day-label">${shortDate}</span></div>`;
      }).join("");
      const periodKey = state.historyRange === 365 ? "history.publishedMonths" : "history.publishedDays";
      elements.historyStatus.textContent = `${state.history.length} ${tr(periodKey)}`;
    }

    async function mapWithConcurrency(items, limit, worker) {
      const results = new Array(items.length);
      let nextIndex = 0;
      async function runWorker() {
        while (nextIndex < items.length) {
          const index = nextIndex++;
          results[index] = await worker(items[index], index);
        }
      }
      await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runWorker));
      return results;
    }

    function summariseHistoricalRows(rows, monthKey) {
      if (!rows.length) return null;
      return {
        monthKey,
        dateKey: `${monthKey}-01`,
        average: rows.reduce((sum, item) => sum + item.average, 0) / rows.length,
        minimum: Math.min(...rows.map(item => item.minimum)),
        maximum: Math.max(...rows.map(item => item.maximum))
      };
    }

    function setHistoryProgress(current, total) {
      elements.historyStatus.textContent = tr("history.loadingMonths", { current, total });
    }

    async function loadHistory() {
      const sequence = ++state.historyLoadSequence;
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
          const range = { start: monthStart < startDate ? startDate : monthStart, end: monthEnd > endDate ? endDate : monthEnd };
          const monthKey = monthStart.slice(0, 7);
          const complete = range.start === monthStart && range.end === monthEnd && monthEnd < endDate;
          const cached = complete ? loadHistoricalMonthCache(monthKey) : null;
          if (cached) results.push(cached);
          else ranges.push({ ...range, monthKey, complete });
          cursor = nextMonth;
        }

        let completed = results.length;
        if (sequence !== state.historyLoadSequence) return;
        setHistoryProgress(completed, ranges.length + results.length);
        const chunks = await mapWithConcurrency(ranges, 3, async range => {
          try {
            const { payload } = await fetchOfficialRange(range.start, range.end);
            const daily = normaliseHistoricalPayload(payload, range.start, range.end);
            if (range.complete) {
              const summary = summariseHistoricalRows(daily, range.monthKey);
              if (summary) {
                saveHistoricalMonthCache(range.monthKey, summary);
                return [summary];
              }
            }
            return daily;
          } catch (error) {
            return [];
          } finally {
            completed += 1;
            if (sequence === state.historyLoadSequence) setHistoryProgress(completed, ranges.length + results.length);
          }
        });
        if (sequence !== state.historyLoadSequence) return;
        results.push(...chunks.flat());
      }
      if (sequence !== state.historyLoadSequence) return;
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

    function clearViewForMissingData(message = tr("detail.noData")) {
      state.data = [];
      state.sourceUpdatedAt = null;
      state.fetchedAt = null;
      state.currentSource = "";

      elements.currentTitle.textContent = tr("common.unavailable");
      elements.currentAdvice.textContent = tr("status.loadError");
      elements.currentPrice.textContent = "—";
      elements.averagePrice.textContent = "—";
      elements.averageDetail.textContent = tr("common.noData");
      elements.minimumPrice.textContent = "—";
      elements.minimumHour.textContent = "—";
      elements.maximumPrice.textContent = "—";
      elements.maximumHour.textContent = "—";
      elements.priceSpread.textContent = "—";
      elements.spreadDetail.textContent = "—";
      state.comparisons = { loading: false, yesterday: null, weeklyAverage: null, weeklyCount: 0 };
      renderInsights();
      elements.rows.innerHTML = `<tr><td colspan="5">${message}</td></tr>`;
      elements.csvButton.disabled = true;
      elements.dryerButton.disabled = true;
      updateSimulator();
      if (typeof updateSmartQueue === "function") updateSmartQueue();
      renderChart();
      updateDateNavigation();
    }

    async function loadData(dateKey, { manual = false } = {}) {
      const sequence = ++state.loadSequence;
      const requestRegion = getRegionKey();
      const previousDate = state.selectedDate;
      state.selectedDate = dateKey;
      if (previousDate && previousDate !== dateKey) {
        state.plannerNextDayKey = "";
        state.plannerNextDayRows = [];
        state.plannerNextDayLoading = false;
      }
      elements.dateInput.value = dateKey;
      elements.refreshButton.disabled = true;
      setLocalizedStatus(manual ? "status.refreshing" : "status.loading", "loading", formatDateLong(dateKey));

      try {
        const { payload, source } = await fetchOfficialData(dateKey);
        if (sequence !== state.loadSequence || requestRegion !== getRegionKey()) return;
        const normalised = normaliseApiResponse(payload, dateKey);
        if (!normalised.rows.length) {
          setLocalizedStatus("status.noPricesForDate", "error", formatDateLong(dateKey));
          clearViewForMissingData(tr("status.noPricesForDate"));
          return;
        }
        state.data = normalised.rows;
        if (dateKey === shiftDate(todayKey(), 1) && state.data.length) state.tomorrowAvailable = true;
        state.sourceUpdatedAt = normalised.sourceUpdatedAt;
        state.fetchedAt = new Date().toISOString();
        state.currentSource = source;
        saveCache(dateKey, normalised);
        const publication = state.sourceUpdatedAt ? tr("status.publication", { date: formatDateTime(state.sourceUpdatedAt) }) : "";
        setLocalizedStatus("status.loaded", "ready", `${publication}${tr("status.consultation", { date: formatDateTime(state.fetchedAt), source })}`);
        renderAll();
        loadComparisons(dateKey);
      } catch (error) {
        console.error(error);
        if (sequence !== state.loadSequence || requestRegion !== getRegionKey()) return;
        const cached = loadCache(dateKey);
        if (cached) {
          if (!cached.rows.length) {
            setLocalizedStatus("status.noPricesForDate", "error", formatDateLong(dateKey));
            clearViewForMissingData(tr("status.noPricesForDate"));
            return;
          }
          state.data = cached.rows;
          state.sourceUpdatedAt = cached.sourceUpdatedAt;
          state.fetchedAt = cached.savedAt;
          state.currentSource = "copia local";
          setLocalizedStatus("status.cached", "cached", tr("status.savedAt", { date: formatDateTime(cached.savedAt) }));
          renderAll();
          loadComparisons(dateKey);
        } else {
          setLocalizedStatus("status.loadError", "error");
          clearViewForMissingData(tr("status.loadDataError"));
        }
      } finally {
        if (sequence === state.loadSequence) elements.refreshButton.disabled = false;
      }
    }

    function downloadCsv() {
      if (!state.data.length) return;
      const region = activeRegionConfig();
      const lines = [
        ["fecha", "region", "franja", "periodo", "precio_EUR_MWh", "precio_EUR_kWh", "nivel"],
        ...state.data.map(item => [
          state.selectedDate,
          region.key,
          item.label,
          tariffPeriodLabel(item.tariffPeriod),
          item.priceMWh.toFixed(5),
          item.priceKWh.toFixed(8),
          levelLabel(item.level)
        ])
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
      if (themeMeta) themeMeta.content = theme === "dark" ? "#101816" : "#16856c";
      elements.themeButton.textContent = theme === "dark" ? "☀" : "◐";
      elements.themeButton.setAttribute("aria-label", theme === "dark" ? tr("theme.light") : tr("theme.dark"));
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
    elements.todayTab?.addEventListener("click", () => {
      state.followingToday = true;
      loadData(todayKey(), { manual: true });
    });
    elements.tomorrowTab?.addEventListener("click", () => {
      if (!state.tomorrowAvailable) return;
      state.followingToday = false;
      loadData(shiftDate(todayKey(), 1), { manual: true });
    });
    elements.regionSelect?.addEventListener("change", () => {
      setRegionKey(elements.regionSelect.value);
      state.tomorrowAvailable = false;
      state.plannerNextDayKey = "";
      state.plannerNextDayRows = [];
      state.history = [];
      state.comparisons = { loading: true, yesterday: null, weeklyAverage: null, weeklyCount: 0 };
      state.followingToday = true;
      const regionalToday = todayKey();
      state.selectedDate = regionalToday;
      elements.dateInput.value = regionalToday;
      updateDateNavigation();
      checkTomorrowAvailability();
      loadData(regionalToday, { manual: true });
      loadHistory();
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
        elements.historyStatus.textContent = tr("history.loading");
        loadHistory();
      });
    });

    window.addEventListener("languagechange", () => {
      syncHourlyDetails();
      if (typeof refreshPlannerProfileOptions === "function") refreshPlannerProfileOptions((elements.applianceSelect.value || "").replace(/^saved:/, ""));
      updateDaySwitch();
      if (state.data.length) renderAll();
      else clearViewForMissingData();
      renderHistory();
      let localizedMeta = state.statusMeta;
      if (["status.loading", "status.refreshing", "status.online", "status.noPricesForDate"].includes(state.statusKey)) localizedMeta = state.selectedDate ? formatDateLong(state.selectedDate) : state.statusMeta;
      if (state.statusKey === "status.loaded") {
        const publication = state.sourceUpdatedAt ? tr("status.publication", { date: formatDateTime(state.sourceUpdatedAt) }) : "";
        localizedMeta = `${publication}${tr("status.consultation", { date: formatDateTime(state.fetchedAt), source: state.currentSource })}`;
      }
      if (state.statusKey === "status.cached") localizedMeta = tr("status.savedAt", { date: formatDateTime(state.fetchedAt) });
      if (state.statusKey === "status.offline") localizedMeta = tr("status.offlineDetail");
      setStatus(tr(state.statusKey, state.statusValues), state.statusType, localizedMeta);
      if (!elements.updateButton.hidden) showUpdateNotice(availableVersion !== runningVersion ? availableVersion : "");
    });

    elements.applianceSelect.addEventListener("change", () => {
      const selected = elements.applianceSelect.value;
      if (selected.startsWith("saved:")) {
        applyPlannerProfile(selected.slice(6));
      } else if (selected !== "custom") {
        const [energy, duration] = selected.split(",");
        elements.energyInput.value = energy;
        elements.durationInput.value = duration;
        if (elements.profileDeleteButton) elements.profileDeleteButton.disabled = true;
        updateSimulator();
      } else {
        if (elements.profileDeleteButton) elements.profileDeleteButton.disabled = true;
        updateSimulator();
      }
    });
    elements.plannerStartTime.addEventListener("change", updateSimulator);
    elements.plannerEndTime.addEventListener("change", updateSimulator);
    elements.energyInput.addEventListener("input", updateSimulator);
    elements.durationInput.addEventListener("input", updateSimulator);
    if (typeof initialisePlannerProfiles === "function") initialisePlannerProfiles();
    if (typeof initialiseSmartQueue === "function") initialiseSmartQueue();

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
      setLocalizedStatus("status.online", "loading", formatDateLong(state.selectedDate));
      window.setTimeout(() => {
        state.retryScheduled = false;
        if (!navigator.onLine) return;
        loadData(state.selectedDate, { manual: true });
        loadHistory();
      }, 700);
    }

    window.addEventListener("offline", () => {
      setLocalizedStatus("status.offline", "cached", tr("status.offlineDetail"));
    });
    window.addEventListener("online", retryAfterConnection);

    window.setInterval(() => {
      const newToday = todayKey();
      if (state.followingToday && newToday !== state.selectedDate) {
        loadData(newToday);
        return;
      }
      updateDaySwitch();
      updateHero();
      renderChart();
      renderTable();
      updateSimulator();
    }, 60 * 1000);

    window.setInterval(() => {
      if (!document.hidden) loadData(state.selectedDate);
    }, CONFIG.refreshMs);

    window.setInterval(() => {
      if (!document.hidden && navigator.onLine) checkTomorrowAvailability();
    }, 10 * 60 * 1000);

    window.setInterval(() => {
      if (!document.hidden && navigator.onLine && state.currentSource === "copia local") retryAfterConnection();
    }, 15 * 1000);

    initialiseTheme();
    syncHourlyDetails();
    document.getElementById("hourly-details")?.addEventListener("toggle", event => updateHourlyDetailsLabel(event.currentTarget));
    window.matchMedia("(max-width: 640px)").addEventListener("change", syncHourlyDetails);
    if (elements.regionSelect) elements.regionSelect.value = getRegionKey();
    state.selectedDate = todayKey();
    elements.dateInput.value = state.selectedDate;
    updateDateNavigation();
    checkTomorrowAvailability();
    loadData(state.selectedDate);
    loadHistory();
    elements.updateButton.addEventListener?.("click", async () => {
      const registration = serviceWorkerRegistration;
      if (!registration || updateActivationStarted) return;

      elements.updateButton.hidden = true;
      elements.updateButton.disabled = true;
      elements.updateButton.setAttribute("aria-busy", "true");
      try {
        if (!registration.waiting) await registration.update();
        const waiting = await waitForWaitingWorker(registration);
        if (waiting) activateWaitingWorker(registration, waiting);
        else showUpdateNotice(availableVersion !== runningVersion ? availableVersion : "");
      } catch (error) {
        console.warn("No se pudo preparar la actualización", error);
        showUpdateNotice(availableVersion !== runningVersion ? availableVersion : "");
      }
    });
    window.setInterval(checkForUpdates, 15 * 60 * 1000);

    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then(registration => {
          serviceWorkerRegistration = registration;
          if (registration.waiting) showUpdateNotice(availableVersion !== runningVersion ? availableVersion : "");
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            if (worker) worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller && !updateActivationStarted) {
                showUpdateNotice(availableVersion !== runningVersion ? availableVersion : "");
              }
            });
          });
          // La comprobación se hace al arrancar, pero el worker nuevo queda
          // esperando hasta que el usuario pulse el botón.
          checkForUpdates();
        }).catch(error => {
          console.warn("No se pudo registrar el modo instalable:", error);
        });
      });
    }

    const appViewLinks = document.querySelectorAll(".ios-tab[data-app-view]");
    const tabSelection = document.querySelector(".ios-tab-selection");
    const appViewOrder = ["home", "chart", "planner", "queue", "tools", "history"];
    let currentAppView = "home";
    const moveTabSelection = () => {
      const activeLink = [...appViewLinks].find(link => link.classList.contains("active"));
      if (!activeLink || !tabSelection) return;
      const navRect = tabSelection.parentElement.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      const size = Math.max(38, Math.min(linkRect.width - 8, linkRect.height));
      tabSelection.style.setProperty("--tab-size", `${size}px`);
      tabSelection.style.setProperty("--tab-x", `${linkRect.left - navRect.left + (linkRect.width - size) / 2}px`);
      tabSelection.style.setProperty("--tab-y", `${linkRect.top - navRect.top + (linkRect.height - size) / 2}px`);
    };
    const setAppView = view => {
      const nextView = appViewOrder.includes(view) ? view : "home";
      document.body.dataset.appView = nextView;
      appViewLinks.forEach(link => {
        const active = link.dataset.appView === nextView;
        link.classList.toggle("active", active);
        link.setAttribute("aria-current", active ? "page" : "false");
      });
      if (currentAppView !== nextView) currentAppView = nextView;
      requestAnimationFrame(moveTabSelection);
      if (nextView === "chart") requestAnimationFrame(() => typeof renderChart === "function" && renderChart());
      if (nextView === "planner" || nextView === "queue") requestAnimationFrame(() => {
        if (typeof updateSimulator === "function") updateSimulator();
        if (typeof updateSmartQueue === "function") updateSmartQueue();
      });
      if (nextView === "tools") requestAnimationFrame(() => window.PriceLuzTools?.refresh?.());
    };
    const activateAppView = view => {
      setAppView(view);
      const link = [...appViewLinks].find(item => item.dataset.appView === view);
      history.replaceState(null, "", link?.getAttribute("href") || "#app-top");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    appViewLinks.forEach(link => link.addEventListener("click", event => {
      event.preventDefault();
      activateAppView(link.dataset.appView);
    }));

    // Navegación táctil entre fichas: horizontal cambia de vista y vertical conserva el scroll.
    const swipeSurface = document.querySelector(".shell");
    const swipeExcludedSelector = [
      "a", "button", "input", "select", "textarea", "summary", "[role='button']",
      "canvas", "svg", "table", ".table-scroll", ".table-wrap", ".chart-container",
      ".history-chart", "[data-horizontal-scroll]"
    ].join(", ");
    let swipeStart = null;
    let swipeAnimating = false;
    const swipeViewport = () => Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
    const swipeDuration = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 240;
    const setSwipeOffset = offset => swipeSurface?.style.setProperty("--swipe-offset", `${offset}px`);
    const resetSwipe = () => {
      if (!swipeSurface) return;
      swipeSurface.classList.remove("swipe-dragging");
      swipeSurface.classList.add("swipe-settling");
      setSwipeOffset(0);
      window.setTimeout(() => swipeSurface.classList.remove("swipe-settling"), swipeDuration());
    };
    const clearSwipe = () => {
      swipeStart = null;
      if (!swipeAnimating) resetSwipe();
    };
    const isSwipeExcluded = target => target instanceof Element && Boolean(target.closest(swipeExcludedSelector));
    swipeSurface?.addEventListener("pointerdown", event => {
      if (swipeAnimating || (event.pointerType !== "touch" && event.pointerType !== "pen") || isSwipeExcluded(event.target)) return;
      swipeStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    }, { passive: true });
    swipeSurface?.addEventListener("pointermove", event => {
      if (!swipeStart || swipeStart.pointerId !== event.pointerId || swipeAnimating) return;
      const deltaX = event.clientX - swipeStart.x;
      const deltaY = event.clientY - swipeStart.y;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
      swipeSurface.classList.add("swipe-dragging");
      setSwipeOffset(Math.max(-swipeViewport() * .82, Math.min(swipeViewport() * .82, deltaX)));
    }, { passive: true });
    swipeSurface?.addEventListener("pointerup", event => {
      if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;
      const { x, y } = swipeStart;
      swipeStart = null;
      const deltaX = event.clientX - x;
      const deltaY = event.clientY - y;
      if (Math.abs(deltaX) < 60 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) {
        resetSwipe();
        return;
      }
      const currentIndex = appViewOrder.indexOf(currentAppView);
      const nextIndex = currentIndex + (deltaX < 0 ? 1 : -1);
      const nextView = appViewOrder[nextIndex];
      if (!nextView || !swipeSurface) {
        resetSwipe();
        return;
      }
      swipeAnimating = true;
      swipeSurface.classList.remove("swipe-dragging");
      swipeSurface.classList.add("swipe-settling");
      const direction = deltaX < 0 ? -1 : 1;
      setSwipeOffset(direction * swipeViewport());
      window.setTimeout(() => {
        activateAppView(nextView);
        setSwipeOffset(-direction * swipeViewport());
        swipeSurface.classList.remove("swipe-settling");
        void swipeSurface.offsetWidth;
        swipeSurface.classList.add("swipe-settling");
        setSwipeOffset(0);
        window.setTimeout(() => {
          swipeSurface.classList.remove("swipe-settling");
          swipeAnimating = false;
        }, swipeDuration());
      }, swipeDuration());
    }, { passive: true });
    swipeSurface?.addEventListener("pointercancel", clearSwipe, { passive: true });
    setAppView("home");
    window.addEventListener("resize", moveTabSelection);
