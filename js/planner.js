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

/* Cola inteligente: planificación conjunta de varias tareas sobre hoy y mañana. */
const SMART_QUEUE_STORAGE_KEY = "pvpc-dashboard-smart-queue-v1";
let smartQueueTasks = [];

function smartQueueLocale() {
  return window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES";
}

function smartQueueEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function smartQueueRows() {
  const today = todayKey();
  const tomorrow = shiftDate(today, 1);
  const todayCache = typeof loadCache === "function" ? loadCache(today) : null;
  const tomorrowCache = typeof loadCache === "function" ? loadCache(tomorrow) : null;
  const todayRows = state.selectedDate === today && state.data.length ? state.data : todayCache?.rows || [];
  const tomorrowRows = state.plannerNextDayKey === tomorrow && state.plannerNextDayRows.length
    ? state.plannerNextDayRows
    : tomorrowCache?.rows || [];
  return [
    ...todayRows.map(row => ({ ...row, smartDate: today, smartDay: 0 })),
    ...tomorrowRows.map(row => ({ ...row, smartDate: tomorrow, smartDay: 1 }))
  ];
}

function smartQueueReadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(SMART_QUEUE_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(task => task && task.name) : [];
  } catch (error) {
    console.warn("No se pudo leer la cola inteligente", error);
    return [];
  }
}

function smartQueueSaveTasks() {
  try {
    localStorage.setItem(SMART_QUEUE_STORAGE_KEY, JSON.stringify(smartQueueTasks));
  } catch (error) {
    console.warn("No se pudo guardar la cola inteligente", error);
  }
}

function smartQueueEndMinutes(row) {
  return rowStartMinutes(row) + Math.max(1, Math.round((row.endMs - row.startMs) / 60000));
}

function smartQueueDeadline(rows, time, anytime = false) {
  if (anytime) {
    const tomorrow = rows.filter(row => row.smartDate === shiftDate(todayKey(), 1));
    const today = rows.filter(row => row.smartDate === todayKey());
    return (tomorrow.at(-1) || today.at(-1))?.endMs || null;
  }
  const targetMinutes = timeToMinutes(time, 1439);
  const now = Date.now();
  for (const dateKey of [todayKey(), shiftDate(todayKey(), 1)]) {
    const dayRows = rows.filter(row => row.smartDate === dateKey);
    if (!dayRows.length) continue;
    const last = dayRows.at(-1);
    const deadlineRow = targetMinutes >= 1439
      ? last
      : dayRows.find(row => smartQueueEndMinutes(row) === targetMinutes);
    if (!deadlineRow) continue;
    const deadlineMs = targetMinutes >= 1439 ? last.endMs : deadlineRow.endMs;
    if (deadlineMs > now) return deadlineMs;
  }
  return null;
}

function smartQueueContiguous(rows) {
  for (let index = 0; index < rows.length - 1; index += 1) {
    if (rows[index + 1].startMs > rows[index].endMs + 5 * 60 * 1000) return false;
  }
  return true;
}

function smartQueueCost(rows, task) {
  const energyPerSlot = task.energy / task.duration;
  return rows.reduce((sum, row) => sum + row.priceKWh * energyPerSlot, 0);
}

function smartQueueAvailable(row, task, load, contractedPower) {
  return (load.get(row.startMs) || 0) + task.power <= contractedPower + 0.0001;
}

function smartQueueSchedule(tasks, rows, contractedPower) {
  const load = new Map();
  const now = Date.now();
  const ordered = tasks.map(task => ({
    ...task,
    energy: Number(task.energy),
    duration: Math.max(1, Math.round(Number(task.duration))),
    power: Number(task.power) > 0 ? Number(task.power) : Number(task.energy) / Math.max(1, Number(task.duration)),
    deadlineMs: smartQueueDeadline(rows, task.deadline, task.anytime)
  })).sort((a, b) => {
    const aDeadline = a.deadlineMs ?? Number.MAX_SAFE_INTEGER;
    const bDeadline = b.deadlineMs ?? Number.MAX_SAFE_INTEGER;
    return aDeadline - bDeadline || Number(a.interruptible) - Number(b.interruptible) || b.duration - a.duration;
  });

  const results = [];
  for (const task of ordered) {
    const result = { task, rows: [], reason: "" };
    if (!Number.isFinite(task.energy) || task.energy <= 0 || !Number.isFinite(task.duration) || task.duration < 1) {
      result.reason = plannerText("planner.queue.invalidTask");
      results.push(result);
      continue;
    }
    if (!task.deadlineMs) {
      result.reason = plannerText("planner.queue.noDeadlineData");
      results.push(result);
      continue;
    }
    if (task.power > contractedPower + 0.0001) {
      result.reason = plannerText("planner.queue.powerExceeded");
      results.push(result);
      continue;
    }

    const eligible = rows.filter(row => row.startMs >= now - 60 * 1000 && row.endMs <= task.deadlineMs);
    if (task.interruptible) {
      result.rows = eligible
        .filter(row => smartQueueAvailable(row, task, load, contractedPower))
        .sort((a, b) => a.priceKWh - b.priceKWh)
        .slice(0, task.duration)
        .sort((a, b) => a.startMs - b.startMs);
    } else {
      const candidates = [];
      for (let start = 0; start <= eligible.length - task.duration; start += 1) {
        const candidate = eligible.slice(start, start + task.duration);
        if (candidate.length !== task.duration || !smartQueueContiguous(candidate)) continue;
        if (candidate.every(row => smartQueueAvailable(row, task, load, contractedPower))) candidates.push(candidate);
      }
      candidates.sort((a, b) => smartQueueCost(a, task) - smartQueueCost(b, task));
      result.rows = candidates[0] || [];
    }

    if (result.rows.length !== task.duration) {
      result.rows = [];
      result.reason = plannerText("planner.queue.noWindow");
      results.push(result);
      continue;
    }
    result.rows.forEach(row => load.set(row.startMs, (load.get(row.startMs) || 0) + task.power));
    result.cost = smartQueueCost(result.rows, task);
    results.push(result);
  }
  return results;
}

function smartQueueShortDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(smartQueueLocale(), { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function smartQueueSlotLabel(rows, split = false) {
  if (!rows.length) return "—";
  if (split) return rows.map(row => `${smartQueueShortDate(row.smartDate)} · ${row.label}`).join(", ");
  const dates = [...new Set(rows.map(row => row.smartDate))];
  const dateLabel = dates.length === 1 ? smartQueueShortDate(dates[0]) : `${smartQueueShortDate(dates[0])}–${smartQueueShortDate(dates.at(-1))}`;
  const times = rows.length === 1 ? rows[0].label : `${rows[0].label.split("–")[0]}–${rows.at(-1).label.split("–")[1]}`;
  return `${dateLabel} · ${times}`;
}

function renderSmartQueueTasks() {
  if (!elements.smartTaskList) return;
  elements.smartTaskList.innerHTML = smartQueueTasks.length
    ? smartQueueTasks.map(task => `<div class="smart-task-item"><div><strong>${smartQueueEscape(task.name)}</strong><small>${formatPrice(Number(task.energy), 2)} kWh · ${task.duration} h · ${task.anytime ? plannerText("planner.queue.anytime") : smartQueueEscape(task.deadline)}</small></div><button class="button icon-button smart-task-remove" type="button" data-task-id="${smartQueueEscape(task.id)}" aria-label="${plannerText("planner.queue.remove")}" title="${plannerText("planner.queue.remove")}">×</button></div>`).join("")
    : `<p class="smart-task-empty">${plannerText("planner.queue.noTasks")}</p>`;
}

function updateSmartQueue() {
  if (!elements.smartQueueStatus || !elements.smartQueuePlan) return;
  renderSmartQueueTasks();
  if (!smartQueueTasks.length) {
    elements.smartQueueStatus.textContent = plannerText("planner.queue.empty");
    elements.smartQueuePlan.innerHTML = "";
    return;
  }
  const rows = smartQueueRows();
  if (!rows.length) {
    elements.smartQueueStatus.textContent = plannerText("planner.queue.noData");
    elements.smartQueuePlan.innerHTML = "";
    return;
  }
  const contractedPower = Number(elements.smartContractedPower?.value);
  const results = smartQueueSchedule(smartQueueTasks, rows, Number.isFinite(contractedPower) && contractedPower > 0 ? contractedPower : 0);
  const scheduled = results.filter(result => result.rows.length).length;
  const totalCost = results.reduce((sum, result) => sum + (result.cost || 0), 0);
  elements.smartQueueStatus.textContent = scheduled === results.length
    ? plannerText("planner.queue.summary", { scheduled, total: results.length, cost: formatCurrency(totalCost) })
    : plannerText("planner.queue.partial", { scheduled, total: results.length });
  elements.smartQueuePlan.innerHTML = results.map(result => result.rows.length
    ? `<div class="smart-plan-item"><div><strong>${smartQueueEscape(result.task.name)}</strong><small>${smartQueueSlotLabel(result.rows, result.task.interruptible)}${result.task.interruptible ? ` · ${plannerText("planner.queue.split")}` : ""}</small></div><strong>${formatCurrency(result.cost)}</strong></div>`
    : `<div class="smart-plan-item unavailable"><div><strong>${smartQueueEscape(result.task.name)}</strong><small>${smartQueueEscape(result.reason)}</small></div><strong>—</strong></div>`
  ).join("");
}

function initialiseSmartQueue() {
  if (!elements.smartTaskForm || elements.smartTaskForm.dataset.initialised) return;
  elements.smartTaskForm.dataset.initialised = "true";
  smartQueueTasks = smartQueueReadTasks();
  elements.smartTaskForm.addEventListener("submit", event => {
    event.preventDefault();
    const name = elements.smartTaskName.value.trim();
    const energy = Number(elements.smartTaskEnergy.value);
    const duration = Math.max(1, Math.round(Number(elements.smartTaskDuration.value)));
    const deadline = elements.smartTaskDeadline.value || "23:59";
    const power = Number(elements.smartTaskPower.value) || energy / duration;
    if (!name || !Number.isFinite(energy) || energy <= 0 || !Number.isFinite(duration) || duration > 24 || power <= 0) return;
    smartQueueTasks.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name, energy, duration, deadline, power, anytime: elements.smartTaskAnytime.checked, interruptible: elements.smartTaskInterruptible.checked });
    smartQueueSaveTasks();
    elements.smartTaskName.value = "";
    updateSmartQueue();
  });
  elements.smartTaskList.addEventListener("click", event => {
    const button = event.target.closest("[data-task-id]");
    if (!button) return;
    smartQueueTasks = smartQueueTasks.filter(task => task.id !== button.dataset.taskId);
    smartQueueSaveTasks();
    updateSmartQueue();
  });
  elements.smartTaskAnytime.addEventListener("change", () => {
    elements.smartTaskDeadline.disabled = elements.smartTaskAnytime.checked;
  });
  elements.smartContractedPower.addEventListener("input", updateSmartQueue);
  updateSmartQueue();
}
