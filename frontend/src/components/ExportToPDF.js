// frontend/src/components/ExportToPDF.js
export default class ExportToPDF {
  constructor(month, year) {
    this.month = month;
    this.year = year;
  }

  addPrintStyles() {
    const style = document.createElement("style");
    style.id = "print-styles";
    style.textContent = `
      @media print {
        @page {
          size: landscape;
          margin: 10mm;
        }

        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          background-color: white !important;
        }

        body > *:not(#print-container) {
          display: none !important;
        }

        #print-container {
          display: block !important;
          width: 100% !important;
          background: white !important;
        }

        .chart-page {
          page-break-before: always;
          page-break-inside: avoid;
          height: calc(100vh - 20mm) !important;
          width: 100% !important;
          padding: 10mm !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
        }

        .chart-page:first-child {
          page-break-before: avoid;
        }

        .chart-title {
          font-size: 16pt !important;
          font-weight: bold !important;
          text-align: center !important;
          margin-bottom: 10mm !important;
          color: black !important;
          display: block !important;
        }

        .chart-container {
          flex: 1;
          width: 100% !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
        }

        canvas {
          max-width: 100% !important;
          height: auto !important;
        }

        /* Remove other titles */
        .MuiTypography-root:not(.chart-title) {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  removePrintStyles() {
    document.getElementById("print-styles")?.remove();
    document.getElementById("print-container")?.remove();
  }

  getChartTitle(elementId) {
    // Map of chart IDs to their titles
    const titles = {
      "score-chart-xuong-1": "ĐIỂM ĐẠT - MÀU SAO XƯỞNG 1",
      "score-chart-xuong-2": "ĐIỂM ĐẠT - MÀU SAO XƯỞNG 2",
      "score-chart-xuong-3": "ĐIỂM ĐẠT - MÀU SAO XƯỞNG 3",
      "score-chart-xuong-4": "ĐIỂM ĐẠT - MÀU SAO XƯỞNG 4",
      "score-chart-support": "ĐIỂM ĐẠT - MÀU SAO XƯỞNG CẮT, KHO TP, KHO NPL",
      "score-chart-office": "ĐIỂM ĐẠT - MÀU SAO PHÒNG BAN",
      "knockout-chart-1": "HẠNG MỤC ĐIỂM LIỆT XƯỞNG 1",
      "knockout-chart-2": "HẠNG MỤC ĐIỂM LIỆT XƯỞNG 2",
      "knockout-chart-3": "HẠNG MỤC ĐIỂM LIỆT XƯỞNG 3",
      "knockout-chart-4": "HẠNG MỤC ĐIỂM LIỆT XƯỞNG 4",
      "green-star-chart": "CHUYỀN ĐẠT SAO XANH / 4 XƯỞNG",
      "error-stats-chart": "% HẠNG MỤC ĐIỂM LIỆT / 4 XƯỞNG",
    };
    return titles[elementId] || "BIỂU ĐỒ THỐNG KÊ";
  }

  async captureChart(chartElement, title) {
    return new Promise((resolve) => {
      const canvas = chartElement.querySelector("canvas");
      if (!canvas) {
        resolve(null);
        return;
      }

      // Create page container
      const pageContainer = document.createElement("div");
      pageContainer.className = "chart-page";

      // Add title
      const titleElement = document.createElement("div");
      titleElement.className = "chart-title";
      titleElement.textContent = title;
      pageContainer.appendChild(titleElement);

      // Create chart container
      const chartContainer = document.createElement("div");
      chartContainer.className = "chart-container";

      // Clone canvas
      const newCanvas = canvas.cloneNode(true);
      const ctx = newCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, 0);
      chartContainer.appendChild(newCanvas);

      pageContainer.appendChild(chartContainer);
      resolve(pageContainer);
    });
  }

  async createPrintContainer(refs) {
    const container = document.createElement("div");
    container.id = "print-container";
    container.style.display = "none";

    // Capture Score Charts (6 charts)
    const scoreCharts =
      refs.scoreChartRef.current.querySelectorAll(".MuiCard-root");
    for (const chart of scoreCharts) {
      const chartId = chart.dataset.chartId || "score-chart";
      const chartPage = await this.captureChart(
        chart,
        this.getChartTitle(chartId)
      );
      if (chartPage) container.appendChild(chartPage);
    }

    // Capture Knockout Charts (4 charts)
    const knockoutCharts =
      refs.knockoutChartRef.current.querySelectorAll(".MuiCard-root");
    for (const chart of knockoutCharts) {
      const chartId = chart.dataset.chartId || "knockout-chart";
      const chartPage = await this.captureChart(
        chart,
        this.getChartTitle(chartId)
      );
      if (chartPage) container.appendChild(chartPage);
    }

    // Capture Workshop Stats Charts (2 charts)
    const workshopCharts = refs.workshopStatsRef.current.querySelectorAll(
      ".MuiCard-root, .MuiPaper-root"
    );
    for (const chart of workshopCharts) {
      const chartId = chart.dataset.chartId || "workshop-chart";
      const chartPage = await this.captureChart(
        chart,
        this.getChartTitle(chartId)
      );
      if (chartPage) container.appendChild(chartPage);
    }

    document.body.appendChild(container);
    return container;
  }

  async generatePdf(refs) {
    return new Promise((resolve) => {
      try {
        setTimeout(async () => {
          await this.createPrintContainer(refs);
          this.addPrintStyles();

          const handleAfterPrint = () => {
            window.removeEventListener("afterprint", handleAfterPrint);
            this.removePrintStyles();
            resolve();
          };
          window.addEventListener("afterprint", handleAfterPrint);

          document.title = `Bao_cao_KSNB_Thang_${this.month}_${this.year}`;

          setTimeout(() => {
            window.print();
          }, 500);
        }, 1000);
      } catch (error) {
        console.error("Error during PDF generation:", error);
        this.removePrintStyles();
        resolve();
      }
    });
  }

  validateRefs(refs) {
    const requiredRefs = [
      "scoreChartRef",
      "knockoutChartRef",
      "workshopStatsRef",
    ];
    return requiredRefs.every((ref) => refs[ref]?.current);
  }
}
