/* Regiones eléctricas y zonas horarias compatibles con la API oficial. */
const REGION_STORAGE_KEY = "pvpc-dashboard-region-v1";
const REGION_CONFIG = Object.freeze({
  peninsula: Object.freeze({ key: "peninsula", geoLimit: "peninsular", geoId: 8741, timezone: "Europe/Madrid" }),
  canarias: Object.freeze({ key: "canarias", geoLimit: "canarias", geoId: 8742, timezone: "Atlantic/Canary" }),
  ceuta: Object.freeze({ key: "ceuta", geoLimit: "ceuta", geoId: 8744, timezone: "Europe/Madrid" }),
  melilla: Object.freeze({ key: "melilla", geoLimit: "melilla", geoId: 8745, timezone: "Europe/Madrid" })
});
function getRegionKey() {
  try { const value = localStorage.getItem(REGION_STORAGE_KEY); return REGION_CONFIG[value] ? value : "peninsula"; }
  catch { return "peninsula"; }
}
function setRegionKey(value) {
  const key = REGION_CONFIG[value] ? value : "peninsula";
  try { localStorage.setItem(REGION_STORAGE_KEY, key); } catch {}
  return key;
}
function activeRegionConfig() { return REGION_CONFIG[getRegionKey()]; }
function activeTimezone() { return activeRegionConfig().timezone; }

/* API, normalización de franjas horarias y caché local por fecha. */
function partsInSpain(date = new Date()) {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: activeTimezone(),
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }).formatToParts(date);
      const values = Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, p.value]));
      return {
        dateKey: `${values.year}-${values.month}-${values.day}`,
        hour: Number(values.hour),
        minute: Number(values.minute)
      };
    }

    function todayKey() { return partsInSpain().dateKey; }

    function shiftDate(dateKey, days) {
      const date = new Date(`${dateKey}T12:00:00`);
      date.setDate(date.getDate() + days);
      return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    }

    function formatDateLong(dateKey) {
      const [year, month, day] = dateKey.split("-").map(Number);
      const safeDate = new Date(Date.UTC(year, month - 1, day, 12));
      return new Intl.DateTimeFormat(window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES", {
        timeZone: "UTC",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(safeDate);
    }

    function formatPrice(value, decimals = 5) {
      if (!Number.isFinite(value)) return "—";
      return value.toLocaleString(window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    }

    function formatCurrency(value) {
      if (!Number.isFinite(value)) return "—";
      return value.toLocaleString(window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 3 });
    }

    function formatDateTime(date) {
      if (!date || Number.isNaN(new Date(date).getTime())) return "—";
      return new Intl.DateTimeFormat(window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES", {
        timeZone: activeTimezone(),
        dateStyle: "short",
        timeStyle: "short"
      }).format(new Date(date));
    }

    function withTimeout(promiseFactory, milliseconds = CONFIG.requestTimeoutMs) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), milliseconds);
      return promiseFactory(controller.signal).finally(() => clearTimeout(timeout));
    }

    function setStatus(message, type = "ready", meta = "") {
      elements.statusText.textContent = message;
      elements.statusMeta.textContent = meta;
      elements.statusLine.classList.toggle("loading", type === "loading");
      elements.statusLine.classList.toggle("error", type === "error");
      elements.statusLine.classList.toggle("cached", type === "cached");
    }

    function getLevel(price) {
      if (price < CONFIG.lowThreshold) return "low";
      if (price <= CONFIG.highThreshold) return "medium";
      return "high";
    }

    function levelLabel(level) {
      return window.i18n?.t(`levels.${level}`) || (level === "low" ? "Bajo" : level === "high" ? "Alto" : "Medio");
    }

    function extractOffset(datetime) {
      const match = String(datetime).match(/([+-]\d{2}:?\d{2}|Z)$/);
      return match ? match[1] : "";
    }

    function localDateHour(datetime) {
      const date = new Date(datetime);
      if (Number.isNaN(date.getTime())) throw new Error("La API devolvió una fecha no válida.");
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: activeTimezone(),
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }).formatToParts(date);
      const values = Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, p.value]));
      return {
        date,
        dateKey: `${values.year}-${values.month}-${values.day}`,
        hour: Number(values.hour),
        minute: Number(values.minute),
        offset: extractOffset(datetime)
      };
    }

    function normaliseApiResponse(payload, dateKey) {
      if (!payload || !Array.isArray(payload.included)) throw new Error("Formato inesperado en la respuesta de Red Eléctrica.");

      const series = payload.included.find(item => String(item.id) === "1001") ||
        payload.included.find(item => /PVPC/i.test(item?.attributes?.title || item?.type || ""));

      if (!series || !Array.isArray(series?.attributes?.values)) throw new Error("No se encontró la serie PVPC en la respuesta.");

      const buckets = new Map();
      for (const value of series.attributes.values) {
        const numericValue = Number(value.value);
        if (!Number.isFinite(numericValue) || !value.datetime) continue;
        const local = localDateHour(value.datetime);
        if (local.dateKey !== dateKey) continue;
        const bucketKey = `${local.dateKey}|${String(local.hour).padStart(2, "0")}|${local.offset}`;
        if (!buckets.has(bucketKey)) {
          buckets.set(bucketKey, { start: local.date, hour: local.hour, offset: local.offset, values: [] });
        }
        buckets.get(bucketKey).values.push(numericValue);
      }

      const ordered = [...buckets.values()].sort((a, b) => a.start - b.start);
      if (ordered.length < 23 || ordered.length > 25) {
        throw new Error(`Se obtuvieron ${ordered.length} franjas; se esperaban entre 23 y 25.`);
      }

      return {
        rows: ordered.map((bucket, index) => {
          const next = ordered[index + 1];
          const end = next ? next.start : new Date(bucket.start.getTime() + 60 * 60 * 1000);
          const priceMWh = bucket.values.reduce((sum, number) => sum + number, 0) / bucket.values.length;
          const locale = window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES";
          const startHour = new Intl.DateTimeFormat(locale, { timeZone: activeTimezone(), hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(bucket.start);
          const endHour = new Intl.DateTimeFormat(locale, { timeZone: activeTimezone(), hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(end);
          return {
            index,
            startIso: bucket.start.toISOString(),
            endIso: end.toISOString(),
            startMs: bucket.start.getTime(),
            endMs: end.getTime(),
            hour: bucket.hour,
            label: `${startHour}–${endHour}`,
            shortLabel: startHour,
            priceMWh,
            priceKWh: priceMWh / 1000,
            level: getLevel(priceMWh / 1000),
            tariffPeriod: tariffPeriodFor(dateKey, bucket.hour)
          };
        }),
        sourceUpdatedAt: series.attributes["last-update"] || payload?.data?.attributes?.["last-update"] || null
      };
    }

    function buildApiUrl(dateKey, endDateKey = dateKey) {
      const start = `${dateKey}T00:00`;
      const end = `${endDateKey}T23:59`;
      const region = activeRegionConfig();
      const query = new URLSearchParams({
        start_date: start,
        end_date: end,
        time_trunc: "hour",
        geo_trunc: "electric_system",
        geo_limit: region.geoLimit,
        geo_ids: String(region.geoId),
        cached: "false"
      });
      return `${CONFIG.apiBase}?${query.toString()}`;
    }

    async function requestJson(url) {
      return withTimeout(async signal => {
        const response = await fetch(url, { cache: "no-store", signal, headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      });
    }

    async function fetchOfficialData(dateKey) {
      return fetchOfficialRange(dateKey, dateKey).then(result => ({ payload: result.payload, source: result.source }));
    }

    async function fetchOfficialRange(startDateKey, endDateKey) {
      const url = buildApiUrl(startDateKey, endDateKey);
      const attempts = [
        { name: "Red Eléctrica", run: () => requestJson(url) },
        { name: "Red Eléctrica mediante respaldo CORS", run: () => requestJson(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`) }
      ];

      const errors = [];
      for (const attempt of attempts) {
        try {
          return { payload: await attempt.run(), source: attempt.name };
        } catch (error) {
          errors.push(`${attempt.name}: ${error.message}`);
        }
      }
      throw new Error(errors.join(" · "));
    }

    function normaliseHistoricalPayload(payload, startDateKey, endDateKey) {
      if (!payload || !Array.isArray(payload.included)) throw new Error("Formato inesperado en el histórico.");
      const series = payload.included.find(item => String(item.id) === "1001") || payload.included.find(item => /PVPC/i.test(item?.attributes?.title || item?.type || ""));
      if (!series || !Array.isArray(series?.attributes?.values)) throw new Error("No se encontró la serie PVPC histórica.");

      const grouped = new Map();
      for (const value of series.attributes.values) {
        const price = Number(value.value);
        if (!Number.isFinite(price) || !value.datetime) continue;
        const local = localDateHour(value.datetime);
        if (local.dateKey < startDateKey || local.dateKey > endDateKey) continue;
        if (!grouped.has(local.dateKey)) grouped.set(local.dateKey, []);
        grouped.get(local.dateKey).push(price / 1000);
      }

      return [...grouped.entries()].map(([dateKey, prices]) => ({
        dateKey,
        average: prices.reduce((sum, price) => sum + price, 0) / prices.length,
        minimum: Math.min(...prices),
        maximum: Math.max(...prices)
      }));
    }

    function cacheKey(dateKey) { return `${CONFIG.cachePrefix}${getRegionKey()}:${dateKey}`; }

    function saveCache(dateKey, normalised) {
      try {
        localStorage.setItem(cacheKey(dateKey), JSON.stringify({
          savedAt: new Date().toISOString(),
          sourceUpdatedAt: normalised.sourceUpdatedAt,
          rows: normalised.rows
        }));
      } catch (error) {
        console.warn("No se pudo guardar la caché local", error);
      }
    }

    function loadCache(dateKey) {
      try {
        const raw = localStorage.getItem(cacheKey(dateKey));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.rows) || parsed.rows.length < 23) return null;
        return parsed;
      } catch (error) {
        console.warn("No se pudo leer la caché local", error);
        return null;
      }
    }

    function historicalMonthCacheKey(monthKey) { return `${CONFIG.cachePrefix}${getRegionKey()}:history-month:${monthKey}`; }

    function saveHistoricalMonthCache(monthKey, summary) {
      try {
        localStorage.setItem(historicalMonthCacheKey(monthKey), JSON.stringify({
          savedAt: new Date().toISOString(),
          ...summary
        }));
      } catch (error) {
        console.warn("No se pudo guardar la caché mensual del histórico", error);
      }
    }

    function loadHistoricalMonthCache(monthKey) {
      try {
        const raw = localStorage.getItem(historicalMonthCacheKey(monthKey));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed.monthKey !== monthKey || ![parsed.average, parsed.minimum, parsed.maximum].every(Number.isFinite)) return null;
        return parsed;
      } catch (error) {
        console.warn("No se pudo leer la caché mensual del histórico", error);
        return null;
      }
    }



/* Periodos 2.0TD: laborables P1/P2/P3; fines de semana y festivos nacionales, P3. */
function easterSundayDateKey(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function isNationalHoliday(dateKey) {
  const fixed = new Set(["01-01", "01-06", "08-15", "10-12", "11-01", "12-06", "12-08", "12-25"]);
  if (fixed.has(dateKey.slice(5))) return true;
  const year = Number(dateKey.slice(0, 4));
  return dateKey === shiftDate(easterSundayDateKey(year), -2);
}
function tariffPeriodFor(dateKey, hour) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  if (weekday === 0 || weekday === 6 || isNationalHoliday(dateKey)) return "p3";
  if ((hour >= 10 && hour < 14) || (hour >= 18 && hour < 22)) return "p1";
  if ((hour >= 8 && hour < 10) || (hour >= 14 && hour < 18) || (hour >= 22 && hour < 24)) return "p2";
  return "p3";
}
function tariffPeriodLabel(period) { return window.i18n?.t(`tariff.${period}`) || period.toUpperCase(); }
