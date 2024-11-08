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
          box-sizing: border-box !important;
        }

        .chart-page {
          page-break-before: always;
          page-break-inside: avoid;
          min-height: calc(100vh - 20mm) !important; /* Account for page margins */
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important; /* Center vertically */
          align-items: center !important;
          box-sizing: border-box !important;
          padding: 0 !important; /* Remove padding to allow true centering */
        }

        .chart-page:first-child {
          page-break-before: avoid;
        }

        .chart-title {
          font-size: 16pt !important;
          font-weight: bold !important;
          text-align: center !important;
          margin: 0 0 20mm 0 !important; /* Add bottom margin for spacing */
          color: black !important;
          display: block !important;
          width: 100% !important;
        }

        .chart-container {
          width: 85% !important; /* Slightly reduce width for better margins */
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          margin: 0 auto !important;
          box-sizing: border-box !important;
        }

        canvas {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 0 auto !important;
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
    // Log ID để debug
    console.log("Processing chart ID:", elementId);

    // Kiểm tra xem có phải chế độ SIGP không (có thể truyền qua constructor)
    const isSIGPOnly = this.charts?.some((chart) =>
      chart.dataset.chartId?.includes("sigp")
    );

    // Map chart IDs
    const titles = {
      // Main workshop score charts
      "score-chart-xuong1": "% ĐIỂM ĐẠT - MÀU SAO XƯỞNG 1",
      "score-chart-xuong2": "% ĐIỂM ĐẠT - MÀU SAO XƯỞNG 2",
      "score-chart-xuong3": "% ĐIỂM ĐẠT - MÀU SAO XƯỞNG 3",
      "score-chart-xuong4": "% ĐIỂM ĐẠT - MÀU SAO XƯỞNG 4",
      "score-chart-support": "% ĐIỂM ĐẠT - MÀU SAO XƯỞNG CẮT, KHO TP, KHO NPL",
      "score-chart-phongban": "% ĐIỂM ĐẠT - MÀU SAO PHÒNG BAN",
      "score-chart-sigp": "% ĐIỂM ĐẠT - MÀU SAO SIGP",

      // Knockout charts
      "knockout-chart-xuong1": "HẠNG MỤC ĐIỂM LIỆT XƯỞNG 1",
      "knockout-chart-xuong2": "HẠNG MỤC ĐIỂM LIỆT XƯỞNG 2",
      "knockout-chart-xuong3": "HẠNG MỤC ĐIỂM LIỆT XƯỞNG 3",
      "knockout-chart-xuong4": "HẠNG MỤC ĐIỂM LIỆT XƯỞNG 4",
      "knockout-chart-sigp": "HẠNG MỤC ĐIỂM LIỆT SIGP",

      // Workshop stats
      "green-star-chart": isSIGPOnly
        ? "BỘ PHẬN ĐẠT SAO XANH SIGP"
        : "BỘ PHẬN ĐẠT SAO XANH / 4 XƯỞNG",
      "error-stats-chart": isSIGPOnly
        ? "% HẠNG MỤC ĐIỂM LIỆT CÁC BỘ PHẬN SIGP"
        : "% HẠNG MỤC ĐIỂM LIỆT CÁC BỘ PHẬN / 4 XƯỞNG",
    };

    return titles[elementId] || elementId;
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

    // Lưu tất cả charts để kiểm tra mode
    this.charts = [
      ...refs.scoreChartRef.current.querySelectorAll(".MuiCard-root"),
      ...refs.knockoutChartRef.current.querySelectorAll(".MuiCard-root"),
      ...refs.workshopStatsRef.current.querySelectorAll(
        ".MuiCard-root, .MuiPaper-root"
      ),
    ];

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

          // Đổi tên file theo chế độ
          const isSIGPOnly = this.charts?.some((chart) =>
            chart.dataset.chartId?.includes("sigp")
          );
          const filePrefix = isSIGPOnly
            ? "Bao_cao_bieu_do_KSNB_SIGP"
            : "Bao_cao_bieu_do_KSNB_VLH";
          document.title = `${filePrefix}_Thang_${this.month}_${this.year}`;

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
