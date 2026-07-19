/* Cálculo de ventanas consecutivas y costes del planificador. */
function bestWindow(duration) {
      if (!state.data.length || duration < 1 || duration > state.data.length) return null;
      let best = null;
      for (let start = 0; start <= state.data.length - duration; start++) {
        const slice = state.data.slice(start, start + duration);
        const average = slice.reduce((sum, item) => sum + item.priceKWh, 0) / duration;
        if (!best || average < best.average) best = { start, end: start + duration - 1, average };
      }
      return best;
    }

    function updateSimulator() {
      const energy = Number(elements.energyInput.value);
      const duration = Math.max(1, Math.round(Number(elements.durationInput.value)));
      elements.durationInput.value = String(duration);

      if (!state.data.length || !Number.isFinite(energy) || energy <= 0 || !Number.isFinite(duration) || duration > state.data.length) {
        elements.bestWindow.textContent = "—";
        elements.bestCost.textContent = "—";
        elements.currentCost.textContent = "—";
        elements.savingBox.textContent = "Introduce un consumo y una duración válidos.";
        return;
      }

      const best = bestWindow(duration);
      const first = state.data[best.start];
      const last = state.data[best.end];
      const bestCost = energy * best.average;
      elements.bestWindow.textContent = `${first.label.split("–")[0]}–${last.label.split("–")[1]}`;
      elements.bestCost.textContent = formatCurrency(bestCost);

      const currentIndex = currentDataIndex();
      if (currentIndex >= 0 && currentIndex + duration <= state.data.length) {
        const currentSlice = state.data.slice(currentIndex, currentIndex + duration);
        const currentAverage = currentSlice.reduce((sum, item) => sum + item.priceKWh, 0) / duration;
        const currentCost = energy * currentAverage;
        const saving = Math.max(0, currentCost - bestCost);
        const savingPercent = currentCost > 0 ? saving / currentCost * 100 : 0;
        elements.currentCost.textContent = formatCurrency(currentCost);
        elements.savingBox.textContent = saving > .0005
          ? `Desplazar este consumo a la mejor franja ahorraría aproximadamente ${formatCurrency(saving)} (${savingPercent.toLocaleString(window.i18n?.language === "en" ? "en-US" : "es-ES", { maximumFractionDigits: 1 })} %).`
          : "La franja actual ya está entre las opciones más económicas para este consumo.";
      } else {
        elements.currentCost.textContent = "No aplicable";
        elements.savingBox.textContent = state.selectedDate === todayKey()
          ? "No quedan suficientes horas publicadas para completar esa duración empezando ahora."
          : "El coste empezando ahora solo se calcula cuando está seleccionado el día de hoy.";
      }
    }
