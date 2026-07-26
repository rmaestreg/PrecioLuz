"use strict";

/* Calculadoras locales de la versión 1.2. No requieren backend. */
(() => {
  const STORAGE_KEY = "pvpc-dashboard-tools-v12";
  const q = id => document.getElementById(id);
  const tr = (key, values = {}) => window.i18n?.t(key, values) || key;
  const locale = () => window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES";
  const number = (id, fallback = 0) => {
    const value = Number(q(id)?.value);
    return Number.isFinite(value) ? value : fallback;
  };
  const money = value => Number.isFinite(value)
    ? value.toLocaleString(locale(), { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";
  const decimal = (value, digits = 2) => Number.isFinite(value)
    ? value.toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : "—";
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const safeText = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

  const DEFAULTS = {
    activeTool: "bill",
    bill: {
      days: 30, consumption: 250, energySource: "day", energyPrice: 0.15,
      powerPeak: 4.6, powerValley: 4.6, powerPricePeak: 0.073773, powerPriceValley: 0.001986,
      meterRental: 0.02663, services: 0, electricityTax: 5.1127, vat: 21
    },
    power: {
      baseLoad: 0.4, margin: 10, current: 4.6, fixedPrice: 0.075759,
      appliances: [
        { id: "fridge", key: "appliance.fridge", kw: 0.30, selected: true, custom: false },
        { id: "oven", key: "appliance.oven", kw: 2.20, selected: true, custom: false },
        { id: "induction", key: "appliance.induction", kw: 2.00, selected: true, custom: false },
        { id: "washer", key: "appliance.washer", kw: 2.00, selected: false, custom: false },
        { id: "dishwasher", key: "appliance.dishwasher", kw: 1.80, selected: false, custom: false },
        { id: "dryer", key: "appliance.dryer", kw: 2.50, selected: false, custom: false },
        { id: "water-heater", key: "appliance.waterHeater", kw: 1.50, selected: false, custom: false },
        { id: "ac", key: "appliance.ac", kw: 1.20, selected: false, custom: false },
        { id: "ev", key: "appliance.ev", kw: 3.70, selected: false, custom: false }
      ]
    },
    consumption: {
      priceSource: "day", price: 0.15,
      rows: [
        { id: "c-fridge", nameKey: "appliance.fridge", name: "", watts: 150, hours: 8, days: 30, quantity: 1 },
        { id: "c-washer", nameKey: "appliance.washer", name: "", watts: 2000, hours: 1, days: 12, quantity: 1 },
        { id: "c-computer", nameKey: "appliance.computer", name: "", watts: 150, hours: 4, days: 30, quantity: 1 }
      ]
    },
    ev: {
      capacity: 60, currentSoc: 25, targetSoc: 80, efficiency: 90, chargerPower: 7.4,
      contractedPower: 9.2, reservePower: 1.5, startTime: "20:00", departureTime: "08:00", interruptible: false
    }
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function loadModel() {
    const model = clone(DEFAULTS);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return model;
      model.activeTool = ["bill", "power", "consumption", "ev"].includes(saved.activeTool) ? saved.activeTool : model.activeTool;
      Object.assign(model.bill, saved.bill || {});
      Object.assign(model.ev, saved.ev || {});
      Object.assign(model.power, saved.power || {});
      if (Array.isArray(saved.power?.appliances)) model.power.appliances = saved.power.appliances;
      Object.assign(model.consumption, saved.consumption || {});
      if (Array.isArray(saved.consumption?.rows)) model.consumption.rows = saved.consumption.rows;
    } catch (error) {
      console.warn("No se pudieron leer las calculadoras guardadas", error);
    }
    return model;
  }

  let model = loadModel();
  let saveTimer = null;
  function saveModel() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(model)); }
      catch (error) { console.warn("No se pudieron guardar las calculadoras", error); }
    }, 80);
  }

  function selectedDayAverage() {
    if (typeof state === "undefined" || !Array.isArray(state.data) || !state.data.length) return null;
    const values = state.data.map(row => Number(row.priceKWh)).filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  function setTool(name) {
    if (!["bill", "power", "consumption", "ev"].includes(name)) name = "bill";
    model.activeTool = name;
    document.querySelectorAll(".calculator-tab").forEach(button => {
      const active = button.dataset.toolTarget === name;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll(".calculator-pane").forEach(pane => {
      const active = pane.dataset.toolPane === name;
      pane.classList.toggle("active", active);
      pane.hidden = !active;
    });
    saveModel();
    refresh();
  }

  function applyBillModel() {
    const mapping = {
      "bill-days": "days", "bill-consumption": "consumption", "bill-energy-source": "energySource", "bill-energy-price": "energyPrice",
      "bill-power-peak": "powerPeak", "bill-power-valley": "powerValley", "bill-power-price-peak": "powerPricePeak", "bill-power-price-valley": "powerPriceValley",
      "bill-meter-rental": "meterRental", "bill-services": "services", "bill-electricity-tax": "electricityTax", "bill-vat": "vat"
    };
    Object.entries(mapping).forEach(([id, key]) => { if (q(id)) q(id).value = model.bill[key]; });
  }

  function readBillModel() {
    model.bill = {
      days: number("bill-days", 30), consumption: number("bill-consumption"), energySource: q("bill-energy-source")?.value || "day", energyPrice: number("bill-energy-price"),
      powerPeak: number("bill-power-peak"), powerValley: number("bill-power-valley"), powerPricePeak: number("bill-power-price-peak"), powerPriceValley: number("bill-power-price-valley"),
      meterRental: number("bill-meter-rental"), services: number("bill-services"), electricityTax: number("bill-electricity-tax"), vat: number("bill-vat")
    };
  }

  function updateBill() {
    if (!q("bill-form")) return;
    readBillModel();
    const average = selectedDayAverage();
    const useDay = model.bill.energySource === "day";
    if (useDay && Number.isFinite(average)) {
      model.bill.energyPrice = average;
      q("bill-energy-price").value = average.toFixed(5);
    }
    q("bill-energy-price").readOnly = useDay && Number.isFinite(average);
    q("bill-energy-price").classList.toggle("readonly", q("bill-energy-price").readOnly);

    const days = Math.max(0, model.bill.days);
    const consumption = Math.max(0, model.bill.consumption);
    const energyPrice = Math.max(0, model.bill.energyPrice);
    const energy = consumption * energyPrice;
    const power = days * (Math.max(0, model.bill.powerPeak) * Math.max(0, model.bill.powerPricePeak) + Math.max(0, model.bill.powerValley) * Math.max(0, model.bill.powerPriceValley));
    const electricityTax = (energy + power) * clamp(model.bill.electricityTax, 0, 100) / 100;
    const rental = days * Math.max(0, model.bill.meterRental);
    const services = Math.max(0, model.bill.services);
    const beforeVat = energy + power + electricityTax + rental + services;
    const vat = beforeVat * clamp(model.bill.vat, 0, 100) / 100;
    const total = beforeVat + vat;

    q("bill-energy-cost").textContent = money(energy);
    q("bill-power-cost").textContent = money(power);
    q("bill-electricity-tax-cost").textContent = money(electricityTax);
    q("bill-rental-cost").textContent = money(rental);
    q("bill-services-cost").textContent = money(services);
    q("bill-vat-cost").textContent = money(vat);
    q("bill-total").textContent = money(total);
    q("bill-effective-price").textContent = consumption > 0 ? `${money(total / consumption)}/kWh` : "—";
    saveModel();
  }

  function applyPowerModel() {
    const mapping = { "power-base-load": "baseLoad", "power-margin": "margin", "power-current": "current", "power-fixed-price": "fixedPrice" };
    Object.entries(mapping).forEach(([id, key]) => { if (q(id)) q(id).value = model.power[key]; });
    renderPowerAppliances();
  }

  function powerName(item) { return item.key ? tr(item.key) : item.name || tr("appliance.custom"); }
  function renderPowerAppliances() {
    const container = q("power-appliances");
    if (!container) return;
    container.innerHTML = model.power.appliances.map((item, index) => `
      <label class="power-appliance" data-index="${index}">
        <input type="checkbox" data-power-field="selected" ${item.selected ? "checked" : ""}>
        <span>${safeText(powerName(item))}</span>
        <input type="number" min="0.01" max="100" step="0.01" value="${Number(item.kw) || 0}" data-power-field="kw" aria-label="kW">
        ${item.custom ? `<button class="remove-mini" type="button" data-power-remove="${index}" aria-label="${safeText(tr("common.remove"))}">×</button>` : "<span></span>"}
      </label>`).join("");
  }

  function readPowerModel() {
    model.power.baseLoad = number("power-base-load", 0);
    model.power.margin = number("power-margin", 0);
    model.power.current = number("power-current", 0);
    model.power.fixedPrice = number("power-fixed-price", 0);
  }

  function updatePower() {
    if (!q("power-appliances")) return;
    readPowerModel();
    const selectedLoad = model.power.appliances.filter(item => item.selected).reduce((sum, item) => sum + Math.max(0, Number(item.kw) || 0), 0);
    const rawLoad = Math.max(0, model.power.baseLoad) + selectedLoad;
    const withMargin = rawLoad * (1 + clamp(model.power.margin, 0, 100) / 100);
    const recommended = withMargin > 0 ? Math.ceil((withMargin - 1e-9) * 10) / 10 : 0;
    const difference = model.power.current - recommended;
    const annual = Math.abs(difference) * Math.max(0, model.power.fixedPrice) * 365;

    q("power-selected-load").textContent = `${decimal(rawLoad, 2)} kW`;
    q("power-with-margin").textContent = `${decimal(withMargin, 2)} kW`;
    q("power-recommended").textContent = `${decimal(recommended, 1)} kW`;
    q("power-difference").textContent = `${difference >= 0 ? "+" : "−"}${decimal(Math.abs(difference), 1)} kW`;
    q("power-annual-saving").textContent = difference > .049 ? `−${money(annual)}/año` : difference < -.049 ? `+${money(annual)}/año` : money(0);

    const advice = q("power-advice");
    advice.classList.toggle("good", difference >= 0);
    advice.classList.toggle("warning", difference < 0);
    if (difference >= 0) {
      advice.textContent = difference > .049
        ? `${tr("power.enough")} ${tr("power.saving", { amount: money(annual) })}`
        : tr("power.enough");
    } else {
      advice.textContent = `${tr("power.insufficient", { difference: decimal(Math.abs(difference), 1) })} ${tr("power.extraCost", { amount: money(annual) })}`;
    }
    saveModel();
  }

  const CONSUMPTION_PRESETS = [
    { key: "appliance.fridge", watts: 150, hours: 8, days: 30 },
    { key: "appliance.washer", watts: 2000, hours: 1, days: 12 },
    { key: "appliance.dishwasher", watts: 1800, hours: 1.5, days: 15 },
    { key: "appliance.dryer", watts: 2500, hours: 1.2, days: 8 },
    { key: "appliance.oven", watts: 2200, hours: 0.7, days: 12 },
    { key: "appliance.waterHeater", watts: 1500, hours: 2, days: 30 },
    { key: "appliance.ac", watts: 1200, hours: 4, days: 20 },
    { key: "appliance.computer", watts: 150, hours: 4, days: 30 },
    { key: "appliance.tv", watts: 100, hours: 3, days: 30 },
    { key: "appliance.microwave", watts: 1200, hours: .15, days: 30 },
    { key: "appliance.custom", watts: 1000, hours: 1, days: 30 }
  ];

  function applyConsumptionModel() {
    if (q("consumption-price-source")) q("consumption-price-source").value = model.consumption.priceSource;
    if (q("consumption-price")) q("consumption-price").value = model.consumption.price;
    renderConsumptionPresets();
    renderConsumptionRows();
  }

  function renderConsumptionPresets() {
    const select = q("consumption-preset");
    if (!select) return;
    const current = select.value;
    select.innerHTML = CONSUMPTION_PRESETS.map((preset, index) => `<option value="${index}">${safeText(tr(preset.key))}</option>`).join("");
    if ([...select.options].some(option => option.value === current)) select.value = current;
  }

  function consumptionRowName(row) { return row.nameKey ? tr(row.nameKey) : row.name || tr("appliance.custom"); }
  function rowKwh(row) {
    return Math.max(0, Number(row.watts) || 0) / 1000 * Math.max(0, Number(row.hours) || 0) * Math.max(0, Number(row.days) || 0) * Math.max(0, Number(row.quantity) || 0);
  }

  function renderConsumptionRows() {
    const container = q("consumption-list");
    if (!container) return;
    if (!model.consumption.rows.length) {
      container.innerHTML = `<p class="panel-description">${safeText(tr("consumption.empty"))}</p>`;
      return;
    }
    const price = Math.max(0, Number(model.consumption.price) || 0);
    container.innerHTML = model.consumption.rows.map((row, index) => {
      const kwh = rowKwh(row);
      return `<div class="consumption-row" data-consumption-index="${index}">
        <input type="text" value="${safeText(consumptionRowName(row))}" data-consumption-field="name" maxlength="50" aria-label="${safeText(tr("consumption.appliance"))}">
        <input type="number" value="${Number(row.watts) || 0}" min="0" max="100000" step="1" data-consumption-field="watts" aria-label="${safeText(tr("consumption.powerW"))}">
        <input type="number" value="${Number(row.hours) || 0}" min="0" max="24" step="0.05" data-consumption-field="hours" aria-label="${safeText(tr("consumption.hoursDay"))}">
        <input type="number" value="${Number(row.days) || 0}" min="0" max="31" step="1" data-consumption-field="days" aria-label="${safeText(tr("consumption.daysMonth"))}">
        <input type="number" value="${Number(row.quantity) || 1}" min="0" max="100" step="1" data-consumption-field="quantity" aria-label="${safeText(tr("consumption.quantity"))}">
        <output data-consumption-output="kwh">${decimal(kwh, 2)}</output>
        <output data-consumption-output="cost">${money(kwh * price)}</output>
        <button class="remove-consumption" type="button" data-consumption-remove="${index}" aria-label="${safeText(tr("common.remove"))}">×</button>
      </div>`;
    }).join("");
  }

  function updateConsumption({ rerender = false } = {}) {
    if (!q("consumption-list")) return;
    model.consumption.priceSource = q("consumption-price-source")?.value || "day";
    const average = selectedDayAverage();
    if (model.consumption.priceSource === "day" && Number.isFinite(average)) {
      model.consumption.price = average;
      q("consumption-price").value = average.toFixed(5);
    } else {
      model.consumption.price = number("consumption-price", 0);
    }
    q("consumption-price").readOnly = model.consumption.priceSource === "day" && Number.isFinite(average);
    q("consumption-price").classList.toggle("readonly", q("consumption-price").readOnly);
    const price = Math.max(0, Number(model.consumption.price) || 0);
    const stats = model.consumption.rows.map(row => ({ row, kwh: rowKwh(row) }));
    const total = stats.reduce((sum, item) => sum + item.kwh, 0);
    const top = [...stats].sort((a, b) => b.kwh - a.kwh)[0];
    q("consumption-total-kwh").textContent = `${decimal(total, 2)} kWh`;
    q("consumption-total-cost").textContent = money(total * price);
    q("consumption-top").textContent = top && top.kwh > 0 ? `${consumptionRowName(top.row)} · ${decimal(top.kwh, 1)} kWh` : "—";
    if (rerender) renderConsumptionRows();
    else {
      document.querySelectorAll("[data-consumption-index]").forEach(element => {
        const row = model.consumption.rows[Number(element.dataset.consumptionIndex)];
        if (!row) return;
        const kwh = rowKwh(row);
        element.querySelector('[data-consumption-output="kwh"]').textContent = decimal(kwh, 2);
        element.querySelector('[data-consumption-output="cost"]').textContent = money(kwh * price);
      });
    }
    saveModel();
  }

  function timeMinutes(value, fallback = 0) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || "");
    return match ? Number(match[1]) * 60 + Number(match[2]) : fallback;
  }
  function rowMinutes(row) {
    const match = String(row.label || "").match(/^(\d{2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : (Number(row.hour) || 0) * 60;
  }
  function evRows() {
    if (typeof state === "undefined") return [];
    const base = state.selectedDate || (typeof todayKey === "function" ? todayKey() : "");
    const next = base && typeof shiftDate === "function" ? shiftDate(base, 1) : "";
    const current = Array.isArray(state.data) ? state.data.map(row => ({ ...row, toolDay: 0, toolDate: base })) : [];
    const following = state.plannerNextDayKey === next && Array.isArray(state.plannerNextDayRows)
      ? state.plannerNextDayRows.map(row => ({ ...row, toolDay: 1, toolDate: next }))
      : [];
    return [...current, ...following];
  }
  function contiguous(rows) {
    for (let index = 0; index < rows.length - 1; index += 1) {
      if (rows[index + 1].startMs > rows[index].endMs + 5 * 60 * 1000) return false;
    }
    return true;
  }
  function evAllocation(rows, energy, power) {
    let remaining = energy;
    const allocations = [];
    for (const row of rows) {
      if (remaining <= 1e-8) break;
      const slotHours = Math.max(.25, (row.endMs - row.startMs) / 3600000);
      const amount = Math.min(remaining, power * slotHours);
      allocations.push({ row, energy: amount, cost: amount * row.priceKWh });
      remaining -= amount;
    }
    return { allocations, remaining: Math.max(0, remaining), cost: allocations.reduce((sum, item) => sum + item.cost, 0) };
  }
  function evDateLabel(row) {
    const baseIsToday = typeof state !== "undefined" && typeof todayKey === "function" && state.selectedDate === todayKey();
    if (baseIsToday) return row.toolDay === 0 ? tr("ev.dayToday") : tr("ev.dayTomorrow");
    const [year, month, day] = String(row.toolDate || "").split("-").map(Number);
    if (![year, month, day].every(Number.isFinite)) return row.toolDay === 0 ? tr("ev.dayToday") : tr("ev.dayTomorrow");
    return new Intl.DateTimeFormat(locale(), { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
  }
  function applyEvModel() {
    const mapping = {
      "ev-capacity": "capacity", "ev-current-soc": "currentSoc", "ev-target-soc": "targetSoc", "ev-efficiency": "efficiency", "ev-charger-power": "chargerPower",
      "ev-contracted-power": "contractedPower", "ev-reserve-power": "reservePower", "ev-start-time": "startTime", "ev-departure-time": "departureTime"
    };
    Object.entries(mapping).forEach(([id, key]) => { if (q(id)) q(id).value = model.ev[key]; });
    if (q("ev-interruptible")) q("ev-interruptible").checked = Boolean(model.ev.interruptible);
  }
  function readEvModel() {
    model.ev = {
      capacity: number("ev-capacity", 0), currentSoc: number("ev-current-soc", 0), targetSoc: number("ev-target-soc", 0), efficiency: number("ev-efficiency", 90),
      chargerPower: number("ev-charger-power", 0), contractedPower: number("ev-contracted-power", 0), reservePower: number("ev-reserve-power", 0),
      startTime: q("ev-start-time")?.value || "00:00", departureTime: q("ev-departure-time")?.value || "23:59", interruptible: Boolean(q("ev-interruptible")?.checked)
    };
  }
  function clearEvResult(message) {
    q("ev-cost").textContent = "—";
    q("ev-schedule").textContent = "—";
    q("ev-status").textContent = message;
    q("ev-status").className = "recommendation-box warning";
  }
  function updateEv() {
    if (!q("ev-form")) return;
    readEvModel();
    const batteryEnergy = Math.max(0, model.ev.capacity) * (clamp(model.ev.targetSoc, 0, 100) - clamp(model.ev.currentSoc, 0, 100)) / 100;
    const efficiency = clamp(model.ev.efficiency, 1, 100) / 100;
    const gridEnergy = batteryEnergy > 0 ? batteryEnergy / efficiency : 0;
    const effectivePower = Math.min(Math.max(0, model.ev.chargerPower), Math.max(0, model.ev.contractedPower - model.ev.reservePower));
    const duration = effectivePower > 0 ? gridEnergy / effectivePower : null;
    q("ev-battery-energy").textContent = `${decimal(Math.max(0, batteryEnergy), 2)} kWh`;
    q("ev-grid-energy").textContent = `${decimal(Math.max(0, gridEnergy), 2)} kWh`;
    q("ev-effective-power").textContent = `${decimal(effectivePower, 2)} kW`;
    q("ev-duration").textContent = duration !== null ? `${decimal(duration, 2)} h` : "—";

    if (batteryEnergy <= 0) { clearEvResult(tr("ev.invalidSoc")); saveModel(); return; }
    if (effectivePower <= 0) { clearEvResult(tr("ev.noPower")); saveModel(); return; }

    const start = timeMinutes(model.ev.startTime, 0);
    const rawEnd = timeMinutes(model.ev.departureTime, 1439);
    const end = rawEnd <= start ? rawEnd + 1440 : rawEnd;
    const nextDate = typeof state !== "undefined" && state.selectedDate && typeof shiftDate === "function" ? shiftDate(state.selectedDate, 1) : "";
    if (end > 1440 && typeof ensurePlannerFollowingDay === "function" && state.plannerNextDayKey !== nextDate) {
      ensurePlannerFollowingDay(nextDate);
    }
    const now = Date.now();
    const rows = evRows().filter(row => {
      const slotStart = rowMinutes(row) + row.toolDay * 1440;
      const slotEnd = slotStart + Math.max(1, Math.round((row.endMs - row.startMs) / 60000));
      const notPast = state.selectedDate !== todayKey() || row.endMs > now;
      return notPast && slotStart >= start && slotEnd <= end;
    });

    let result = null;
    if (model.ev.interruptible) {
      const sorted = [...rows].sort((a, b) => a.priceKWh - b.priceKWh || a.startMs - b.startMs);
      const allocation = evAllocation(sorted, gridEnergy, effectivePower);
      if (allocation.remaining <= 1e-6) {
        allocation.allocations.sort((a, b) => a.row.startMs - b.row.startMs);
        result = allocation;
      }
    } else {
      let best = null;
      for (let begin = 0; begin < rows.length; begin += 1) {
        for (let finish = begin; finish < rows.length; finish += 1) {
          const candidate = rows.slice(begin, finish + 1);
          if (!contiguous(candidate)) break;
          const capacity = candidate.reduce((sum, row) => sum + effectivePower * Math.max(.25, (row.endMs - row.startMs) / 3600000), 0);
          if (capacity + 1e-8 < gridEnergy) continue;
          const allocation = evAllocation(candidate, gridEnergy, effectivePower);
          if (!best || allocation.cost < best.cost) best = allocation;
          break;
        }
      }
      result = best;
    }

    if (!result) {
      q("ev-cost").textContent = "—";
      q("ev-schedule").textContent = "—";
      const loading = end > 1440 && typeof state !== "undefined" && state.plannerNextDayLoading;
      q("ev-status").textContent = loading ? tr("ev.loadingNextDay") : tr("ev.noData");
      q("ev-status").className = "recommendation-box warning";
      saveModel();
      return;
    }

    q("ev-cost").textContent = money(result.cost);
    q("ev-schedule").innerHTML = result.allocations.map(item => `<div class="ev-slot"><span>${safeText(evDateLabel(item.row))} · ${safeText(item.row.label)}</span><span>${decimal(item.energy, 2)} kWh · ${money(item.cost)}</span></div>`).join("");
    q("ev-status").textContent = tr("ev.complete");
    q("ev-status").className = "recommendation-box good";
    saveModel();
  }

  function downloadConsumptionCsv() {
    const price = Math.max(0, Number(model.consumption.price) || 0);
    const rows = [["Aparato", "Potencia_W", "Horas_dia", "Dias_mes", "Unidades", "kWh_mes", "Coste_EUR"]];
    model.consumption.rows.forEach(row => {
      const kwh = rowKwh(row);
      rows.push([consumptionRowName(row), row.watts, row.hours, row.days, row.quantity, kwh.toFixed(3), (kwh * price).toFixed(3)]);
    });
    const csv = "\ufeff" + rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `consumo-mensual-${typeof state !== "undefined" && state.selectedDate ? state.selectedDate : "estimacion"}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function resetSection(section) {
    if (section === "bill") { model.bill = clone(DEFAULTS.bill); applyBillModel(); updateBill(); }
    if (section === "power") { model.power = clone(DEFAULTS.power); applyPowerModel(); updatePower(); }
    if (section === "consumption") { model.consumption = clone(DEFAULTS.consumption); applyConsumptionModel(); updateConsumption({ rerender: true }); }
    if (section === "ev") { model.ev = clone(DEFAULTS.ev); applyEvModel(); updateEv(); }
    saveModel();
  }

  function refreshPriceData() {
    updateBill();
    updateConsumption({ rerender: false });
    updateEv();
  }
  function refresh() {
    updateBill();
    updatePower();
    updateConsumption({ rerender: false });
    updateEv();
  }

  function initialise() {
    if (!q("tools-section")) return;
    applyBillModel();
    applyPowerModel();
    applyConsumptionModel();
    applyEvModel();
    setTool(model.activeTool);

    document.querySelectorAll(".calculator-tab").forEach(button => button.addEventListener("click", () => setTool(button.dataset.toolTarget)));
    q("bill-form")?.addEventListener("input", updateBill);
    q("bill-form")?.addEventListener("change", updateBill);
    q("bill-reset")?.addEventListener("click", () => resetSection("bill"));

    ["power-base-load", "power-margin", "power-current", "power-fixed-price"].forEach(id => q(id)?.addEventListener("input", updatePower));
    q("power-appliances")?.addEventListener("input", event => {
      const wrapper = event.target.closest("[data-index]");
      if (!wrapper) return;
      const item = model.power.appliances[Number(wrapper.dataset.index)];
      if (!item) return;
      if (event.target.dataset.powerField === "selected") item.selected = event.target.checked;
      if (event.target.dataset.powerField === "kw") item.kw = Number(event.target.value) || 0;
      updatePower();
    });
    q("power-appliances")?.addEventListener("click", event => {
      const button = event.target.closest("[data-power-remove]");
      if (!button) return;
      model.power.appliances.splice(Number(button.dataset.powerRemove), 1);
      renderPowerAppliances(); updatePower();
    });
    q("power-add-custom")?.addEventListener("click", () => {
      const name = q("power-custom-name")?.value.trim();
      const kw = number("power-custom-kw", 0);
      if (!name || kw <= 0) return;
      model.power.appliances.push({ id: `custom-${Date.now()}`, name, key: "", kw, selected: true, custom: true });
      q("power-custom-name").value = "";
      renderPowerAppliances(); updatePower();
    });
    q("power-reset")?.addEventListener("click", () => resetSection("power"));

    q("consumption-price-source")?.addEventListener("change", () => updateConsumption({ rerender: true }));
    q("consumption-price")?.addEventListener("input", () => updateConsumption({ rerender: false }));
    q("consumption-add")?.addEventListener("click", () => {
      const preset = CONSUMPTION_PRESETS[Number(q("consumption-preset")?.value) || 0];
      if (!preset) return;
      model.consumption.rows.push({ id: `consumption-${Date.now()}`, nameKey: preset.key === "appliance.custom" ? "" : preset.key, name: preset.key === "appliance.custom" ? tr("appliance.custom") : "", watts: preset.watts, hours: preset.hours, days: preset.days, quantity: 1 });
      renderConsumptionRows(); updateConsumption({ rerender: false });
    });
    q("consumption-list")?.addEventListener("input", event => {
      const wrapper = event.target.closest("[data-consumption-index]");
      if (!wrapper) return;
      const row = model.consumption.rows[Number(wrapper.dataset.consumptionIndex)];
      if (!row) return;
      const field = event.target.dataset.consumptionField;
      if (field === "name") { row.name = event.target.value; row.nameKey = ""; }
      else if (field) row[field] = Number(event.target.value) || 0;
      updateConsumption({ rerender: false });
    });
    q("consumption-list")?.addEventListener("click", event => {
      const button = event.target.closest("[data-consumption-remove]");
      if (!button) return;
      model.consumption.rows.splice(Number(button.dataset.consumptionRemove), 1);
      renderConsumptionRows(); updateConsumption({ rerender: false });
    });
    q("consumption-export")?.addEventListener("click", downloadConsumptionCsv);
    q("consumption-reset")?.addEventListener("click", () => resetSection("consumption"));

    q("ev-form")?.addEventListener("input", updateEv);
    q("ev-form")?.addEventListener("change", updateEv);
    q("ev-reset")?.addEventListener("click", () => resetSection("ev"));

    window.addEventListener("languagechange", () => {
      renderPowerAppliances();
      renderConsumptionPresets();
      renderConsumptionRows();
      refresh();
    });

    refresh();
  }

  window.PriceLuzTools = { refresh, refreshPriceData, setTool };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialise, { once: true });
  else initialise();
})();
