/* Planificador de ventanas consecutivas, con restricciones horarias y costes. */
const plannerText = (key, values = {}) => window.i18n?.t(key, values) || key;

function timeToMinutes(value, fallback) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : fallback;
}

function rowStartMinutes(row) {
  const match = String(row.label || "").match(/^(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : row.hour * 60;
}

function planningContext() {
  const startMinutes = timeToMinutes(elements.plannerStartTime?.value, 0);
  const endMinutes = timeToMinutes(elements.plannerEndTime?.value, 1439);
  const overnight = endMinutes <= startMinutes;
  const endLimit = overnight ? endMinutes + 1440 : endMinutes === 1439 ? 1440 : endMinutes;
  const nextDate = state.selectedDate ? shiftDate(state.selectedDate, 1) : "";
  const rows = state.data.map(row => ({ ...row, plannerDay: 0 }));
  const needsNextDay = overnight;
  if (state.plannerNextDayKey === nextDate) rows.push(...state.plannerNextDayRows.map(row => ({ ...row, plannerDay: 1 })));
  return { rows, startMinutes, endLimit, overnight, nextDate, needsNextDay };
}

function plannerRowStart(row) { return rowStartMinutes(row) + row.plannerDay * 1440; }

function plannerWindowAllowed(rows, start, duration, context) {
  if (start < 0 || start + duration > rows.length) return false;
  const first = rows[start];
  const last = rows[start + duration - 1];
  const lastDuration = Math.max(1, Math.round((last.endMs - last.startMs) / 60000));
  if (plannerRowStart(first) < context.startMinutes || plannerRowStart(last) + lastDuration > context.endLimit) return false;
  for (let index = start; index < start + duration - 1; index += 1) {
    if (rows[index + 1].startMs > rows[index].endMs + 5 * 60 * 1000) return false;
  }
  return true;
}

function bestWindow(duration, rows = state.data, context = planningContext(), firstAllowedIndex = 0) {
  if (!rows.length || duration < 1 || duration > rows.length) return null;
  const firstIndex = Math.max(0, Number.isInteger(firstAllowedIndex) ? firstAllowedIndex : 0);
  if (firstIndex > rows.length - duration) return null;
  let best = null;
  for (let start = firstIndex; start <= rows.length - duration; start += 1) {
    if (!plannerWindowAllowed(rows, start, duration, context)) continue;
    const slice = rows.slice(start, start + duration);
    const average = slice.reduce((sum, item) => sum + item.priceKWh, 0) / duration;
    if (!best || average < best.average) best = { start, end: start + duration - 1, rows: slice, average };
  }
  return best;
}

function plannerWindowLabel(rows) {
  const first = rows[0];
  const last = rows.at(-1);
  return `${first.label.split("–")[0]}–${last.label.split("–")[1]}`;
}

function updateSimulator() {
  const energy = Number(elements.energyInput.value);
  const rawDuration = Number(elements.durationInput.value);
  const duration = Number.isFinite(rawDuration) ? Math.max(1, Math.round(rawDuration)) : 1;
  elements.durationInput.value = String(duration);
  const context = planningContext();

  if (context.needsNextDay && typeof ensurePlannerFollowingDay === "function") ensurePlannerFollowingDay(context.nextDate);

  if (!state.data.length || !Number.isFinite(energy) || energy <= 0 || !Number.isFinite(rawDuration) || duration > 12) {
    elements.bestWindow.textContent = "—";
    elements.bestCost.textContent = "—";
    elements.bestDayWindow.textContent = "—";
    elements.bestDayCost.textContent = "—";
    elements.currentCost.textContent = "—";
    elements.savingBox.textContent = plannerText("planner.invalid");
    return;
  }

  const currentIndex = currentDataIndex();
  const firstAllowedIndex = state.selectedDate === todayKey() ? currentIndex : 0;
  const bestAvailable = firstAllowedIndex >= 0
    ? bestWindow(duration, context.rows, context, firstAllowedIndex)
    : null;
  const bestDay = bestWindow(duration, context.rows, context, 0);

  if (!bestAvailable && !bestDay) {
    elements.bestWindow.textContent = "—";
    elements.bestCost.textContent = "—";
    elements.bestDayWindow.textContent = "—";
    elements.bestDayCost.textContent = "—";
    elements.currentCost.textContent = plannerText("planner.notApplicable");
    elements.savingBox.textContent = state.plannerNextDayLoading ? plannerText("planner.loadingNextDay") : plannerText("planner.noWindow");
    return;
  }

  const bestAvailableCost = bestAvailable ? energy * bestAvailable.average : null;
  const bestDayCost = bestDay ? energy * bestDay.average : null;
  elements.bestWindow.textContent = bestAvailable ? plannerWindowLabel(bestAvailable.rows) : "—";
  elements.bestCost.textContent = bestAvailableCost !== null ? formatCurrency(bestAvailableCost) : "—";
  elements.bestDayWindow.textContent = bestDay ? plannerWindowLabel(bestDay.rows) : "—";
  elements.bestDayCost.textContent = bestDayCost !== null ? formatCurrency(bestDayCost) : "—";

  if (currentIndex >= 0 && plannerWindowAllowed(context.rows, currentIndex, duration, context)) {
    const currentSlice = context.rows.slice(currentIndex, currentIndex + duration);
    const currentAverage = currentSlice.reduce((sum, item) => sum + item.priceKWh, 0) / duration;
    const currentCost = energy * currentAverage;
    const saving = bestAvailableCost !== null ? Math.max(0, currentCost - bestAvailableCost) : 0;
    const savingPercent = currentCost > 0 ? saving / currentCost * 100 : 0;
    elements.currentCost.textContent = formatCurrency(currentCost);
    elements.savingBox.textContent = bestAvailableCost !== null && saving > .0005
      ? plannerText("planner.saving", { saving: formatCurrency(saving), percent: savingPercent.toLocaleString(window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES", { maximumFractionDigits: 1 }) })
      : plannerText("planner.currentCheap");
  } else {
    elements.currentCost.textContent = plannerText("planner.notApplicable");
    elements.savingBox.textContent = state.selectedDate === todayKey()
      ? plannerText("planner.noHours")
      : plannerText("planner.todayOnly");
  }
}
