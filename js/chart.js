/* Renderizado del gráfico horario y de la tabla de detalle. */
const chartText = (key, values = {}) => window.i18n?.t(key, values) || key;

function colourForLevel(level) {
      const styles = getComputedStyle(document.documentElement);
      return styles.getPropertyValue(level === "low" ? "--low" : level === "high" ? "--high" : "--medium").trim();
    }

    function renderChart() {
      const svg = elements.chart;
      const isMobile = window.innerWidth < 640;
      // Usar el ancho real del panel evita imponer una anchura mínima que
      // deje espacio sin utilizar en tabletas y paneles estrechos.
      const width = svg.clientWidth || (isMobile ? 320 : 720);
      // Mantener la misma proporción que el alto definido en CSS evita que
      // preserveAspectRatio deje bandas vacías dentro del panel.
      const height = isMobile ? 320 : 360;
      const margin = width < 280
        ? { top: 8, right: 26, bottom: 46, left: 24 }
        : width < 640
          ? { top: 10, right: 34, bottom: 50, left: 28 }
          : { top: 10, right: 54, bottom: 52, left: 42 };
      const plotWidth = width - margin.left - margin.right;
      const plotHeight = height - margin.top - margin.bottom;
      const ns = "http://www.w3.org/2000/svg";
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.innerHTML = "";

      const add = (tag, attributes = {}, text) => {
        const node = document.createElementNS(ns, tag);
        Object.entries(attributes).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== "") node.setAttribute(key, String(value));
        });
        if (text !== undefined) node.textContent = text;
        svg.appendChild(node);
        return node;
      };

      if (!state.data.length) {
        add("text", { x: width / 2, y: height / 2, "text-anchor": "middle", class: "empty-chart" }, chartText("chart.empty"));
        return;
      }

      const daySummary = summary();
      const values = state.data.map(item => item.priceKWh);
      const minimumValue = Math.min(...values);
      const maximumValue = Math.max(...values, 0);
      const padding = Math.max((maximumValue - minimumValue) * .06, .006);
      const minY = minimumValue < 0
        ? Math.floor((minimumValue - padding) / .025) * .025
        : 0;
      const maxY = Math.max(.025, Math.ceil((maximumValue + padding) / .025) * .025);
      const range = maxY - minY || 1;
      const ticks = 5;
      const slot = plotWidth / state.data.length;
      const barWidth = Math.max(
        isMobile ? 7 : 12,
        Math.min(isMobile ? 19 : 30, slot * (isMobile ? .82 : .84))
      );
      const currentIndex = currentDataIndex();
      const yFor = value => margin.top + plotHeight - ((value - minY) / range) * plotHeight;
      const zeroY = yFor(0);

      for (let i = 0; i <= ticks; i++) {
        const value = minY + range * (i / ticks);
        const y = yFor(value);
        add("line", { x1: margin.left, y1: y, x2: width - margin.right, y2: y, class: "grid-line" });
        add("text", { x: margin.left - 9, y: y + 4, "text-anchor": "end", class: "axis-text" }, value.toLocaleString(window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 3 }));
      }

      const averageY = yFor(daySummary.average);
      add("line", { x1: margin.left, y1: averageY, x2: width - margin.right, y2: averageY, class: "average-line" });

      state.data.forEach((item, index) => {
        const period = item.tariffPeriod || tariffPeriodFor(state.selectedDate, item.hour);
        add("rect", {
          x: margin.left + index * slot,
          y: margin.top + plotHeight + 31,
          width: Math.max(1, slot),
          height: 7,
          class: `tariff-strip ${period}`,
          "aria-hidden": "true"
        });
      });

      state.data.forEach((item, index) => {
        const x = margin.left + index * slot + (slot - barWidth) / 2;
        const valueY = yFor(item.priceKWh);
        const y = Math.min(valueY, zeroY);
        const barHeight = Math.max(1, Math.abs(zeroY - valueY));
        const isDimmed = state.activeFilter !== "all" && state.activeFilter !== item.level;
        const rect = add("rect", {
          x, y, width: barWidth, height: barHeight,
          rx: Math.min(5, barWidth / 3),
          fill: colourForLevel(item.level),
          class: `bar${isDimmed ? " dimmed" : ""}`,
          tabindex: "0",
          "aria-label": `${item.label}: ${formatPrice(item.priceKWh)} ${chartText("chart.eurosPerKWh")}`
        });

        if (index === currentIndex) {
          add("rect", { x: x - 3, y: y - 3, width: barWidth + 6, height: barHeight + 6, rx: Math.min(7, barWidth / 3 + 2), class: "now-outline" });
        }

        const showEvery = width < 280 ? 6 : width >= 1000 ? 1 : width >= 800 ? 2 : 3;
        if (index % showEvery === 0) {
          const labelX = x + barWidth / 2;
          const labelY = margin.top + plotHeight + 21;
          add("text", {
            x: labelX, y: labelY, "text-anchor": "middle", class: "axis-text",
            transform: width < 900 ? `rotate(-45 ${labelX} ${labelY})` : ""
          }, item.shortLabel);
        }

        const showTooltip = event => {
          const box = rect.getBoundingClientRect();
          const relative = ((item.priceKWh / daySummary.average) - 1) * 100;
          const period = item.tariffPeriod || tariffPeriodFor(state.selectedDate, item.hour);
          elements.tooltip.innerHTML = `<strong>${item.label}</strong><br>${formatPrice(item.priceKWh)} €/kWh · ${tariffPeriodLabel(period)}<br>${relative >= 0 ? "+" : ""}${relative.toLocaleString(window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES", { maximumFractionDigits: 1 })} % ${chartText("chart.relativeAverage")}`;
          elements.tooltip.style.left = `${event.clientX || box.left + box.width / 2}px`;
          elements.tooltip.style.top = `${event.clientY || box.top}px`;
          elements.tooltip.style.opacity = "1";
        };
        const hideTooltip = () => { elements.tooltip.style.opacity = "0"; };
        rect.addEventListener("mousemove", showTooltip);
        rect.addEventListener("mouseenter", showTooltip);
        rect.addEventListener("focus", showTooltip);
        rect.addEventListener("mouseleave", hideTooltip);
        rect.addEventListener("blur", hideTooltip);
      });

      const averageLabel = formatPrice(daySummary.average, 3);
      const lastBarRight = margin.left + (state.data.length - 1) * slot + (slot + barWidth) / 2;
      const averageLabelX = Math.min(lastBarRight + 7, width - margin.right + 2);
      add("rect", { x: averageLabelX - 4, y: averageY - 10, width: 54, height: 20, rx: 4, class: "average-label-bg" });
      add("text", { x: averageLabelX, y: averageY + 4, "text-anchor": "start", class: "axis-text average-label" }, averageLabel);
      add("text", { x: 15, y: margin.top + plotHeight / 2, "text-anchor": "middle", class: "axis-text", transform: `rotate(-90 15 ${margin.top + plotHeight / 2})` }, "€/kWh");
    }

    function renderTable() {
      const daySummary = summary();
      if (!daySummary) {
        elements.rows.innerHTML = `<tr><td colspan="5">${chartText("detail.noData")}</td></tr>`;
        return;
      }

      const currentIndex = currentDataIndex();
      elements.rows.innerHTML = state.data.map((item, index) => {
        const difference = ((item.priceKWh / daySummary.average) - 1) * 100;
        return `<tr class="${index === currentIndex ? "current-row" : ""}">
          <td><strong>${item.label}</strong>${index === currentIndex ? ` ${chartText("detail.currentNow")}` : ""}</td>
          <td><strong>${formatPrice(item.priceKWh)}</strong></td>
          <td><span class="badge ${item.level}">${levelLabel(item.level)}</span></td>
          <td><span class="tariff-badge ${item.tariffPeriod || tariffPeriodFor(state.selectedDate, item.hour)}">${(item.tariffPeriod || tariffPeriodFor(state.selectedDate, item.hour)).toUpperCase()}</span></td>
          <td>${difference >= 0 ? "+" : ""}${difference.toLocaleString(window.i18n?.language === "en" ? "en-US" : window.i18n?.language === "fr" ? "fr-FR" : "es-ES", { maximumFractionDigits: 1 })} %</td>
        </tr>`;
      }).join("");

      elements.tableDescription.textContent = `${formatDateLong(state.selectedDate)} · ${state.data.length} ${chartText("detail.publishedSlots")}`;
    }
