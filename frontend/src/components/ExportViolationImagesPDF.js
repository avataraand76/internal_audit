// frontend/src/components/ExportViolationImagesPDF.js
export default class ExportViolationImagesPDF {
  constructor(month, year) {
    this.month = month;
    this.year = year;
  }

  addPrintStyles() {
    const style = document.createElement("style");
    style.id = "print-violation-styles";
    style.textContent = `
      @media print {
        @page {
          size: portrait;
          margin: 15mm;
        }

        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          background-color: white !important;
        }

        body > *:not(#print-violations-container) {
          display: none !important;
        }

        #print-violations-container {
          display: block !important;
          width: 100% !important;
          background: white !important;
          box-sizing: border-box !important;
        }

        .violation-page {
          page-break-before: always;
          page-break-inside: avoid;
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          box-sizing: border-box !important;
          padding: 5mm 0 !important;
        }

        /* Remove page break for first content */
        .violation-page:first-of-type {
          page-break-before: avoid !important;
          padding-top: 0 !important;
        }

        .violation-header {
          font-size: 16pt !important;
          font-weight: bold !important;
          text-align: center !important;
          color: black !important;
          width: 100% !important;
          padding-top: 10mm !important;
          margin-bottom: 20mm !important;
          page-break-after: avoid !important;
        }

        .workshop-title {
          font-size: 14pt !important;
          font-weight: bold !important;
          color: #1976d2 !important;
          margin-bottom: 3mm !important;
          width: 100% !important;
          text-align: left !important;
          page-break-after: avoid !important;
        }

        .department-title {
          font-size: 13pt !important;
          font-weight: bold !important;
          color: #2196f3 !important;
          margin-bottom: 3mm !important;
          width: 100% !important;
          text-align: left !important;
          page-break-after: avoid !important;
        }

        .phase-title {
          font-size: 12pt !important;
          font-weight: bold !important;
          margin-bottom: 3mm !important;
          width: 100% !important;
          text-align: left !important;
          page-break-after: avoid !important;
        }

        .criteria-title {
          font-size: 11pt !important;
          background-color: #f5f5f5 !important;
          padding: 2mm !important;
          margin-bottom: 3mm !important;
          width: 95% !important;
          border-radius: 2mm !important;
          text-align: left !important;
          page-break-after: avoid !important;
        }

        .image-section {
          display: flex !important;
          justify-content: space-between !important;
          width: 95% !important;
          margin-bottom: 5mm !important;
          gap: 5mm !important;
        }

        .image-container {
          flex: 1 !important;
          max-width: calc(50% - 2.5mm) !important;
        }

        .image-title {
          font-size: 11pt !important;
          font-weight: bold !important;
          margin-bottom: 2mm !important;
          text-align: left !important;
        }

        .violation-image {
          width: 100% !important;
          height: 80mm !important;
          max-height: 120mm !important;
          object-fit: contain !important;
          border: 1px solid #ddd !important;
          background-color: white !important;
        }

        .no-image-placeholder {
          width: 100% !important;
          height: 80mm !important;
          background-color: #f5f5f5 !important;
          border: 1px dashed #ccc !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #666 !important;
          font-size: 10pt !important;
        }

        /* Đảm bảo tất cả text đều rõ ràng khi in */
        * {
          text-rendering: optimizeLegibility !important;
          -webkit-font-smoothing: antialiased !important;
          color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        /* Đảm bảo các break-inside cho tất cả các phần tử quan trọng */
        .workshop-title,
        .department-title,
        .phase-title,
        .criteria-title,
        .image-section,
        .image-container {
          break-inside: avoid !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  removePrintStyles() {
    document.getElementById("print-violation-styles")?.remove();
    document.getElementById("print-violations-container")?.remove();
  }

  getDirectImageUrl(iframe) {
    if (!iframe?.src) return null;

    // Xử lý URL từ Google Drive
    if (iframe.src.includes("drive.google.com/file/d/")) {
      const fileId = iframe.src.match(/\/d\/(.*?)\/preview/);
      if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId[1]}`;
      }
    }
    return iframe.src;
  }

  async waitForImage(img) {
    return new Promise((resolve, reject) => {
      if (img.complete) {
        resolve();
      } else {
        img.onload = () => resolve();
        img.onerror = () => reject();
      }
    });
  }

  async createViolationPages(imagesRef) {
    const container = document.createElement("div");
    container.id = "print-violations-container";
    container.style.display = "none";

    // Add header instead of separate title page
    const titleHeader = document.createElement("div");
    titleHeader.className = "violation-header";
    titleHeader.textContent = `HÌNH ẢNH VI PHẠM TIÊU CHÍ THÁNG ${this.month}/${this.year}`;
    container.appendChild(titleHeader);

    // Process each workshop
    const workshops = imagesRef.current.querySelectorAll(
      ".MuiPaper-root > .MuiBox-root"
    );

    for (const workshop of workshops) {
      const workshopTitle = workshop.querySelector("h4");
      if (!workshopTitle) continue;

      // Process each department
      const departments = workshop.querySelectorAll(":scope > .MuiBox-root");
      for (const dept of departments) {
        const deptTitle = dept.querySelector("h5");
        if (!deptTitle) continue;

        // Process each phase
        const phases = dept.querySelectorAll(":scope > .MuiBox-root");
        for (const phase of phases) {
          const phaseTitle = phase.querySelector("h6");
          if (!phaseTitle) continue;

          // Process each criterion
          const criteria = phase.querySelectorAll(":scope > .MuiBox-root");
          for (const criterion of criteria) {
            const criteriaTitle = criterion.querySelector(
              ".MuiTypography-subtitle1"
            );
            if (!criteriaTitle) continue;

            const page = document.createElement("div");
            page.className = "violation-page";

            // Add headers
            const workshopHeading = document.createElement("div");
            workshopHeading.className = "workshop-title";
            workshopHeading.textContent = workshopTitle.textContent;
            page.appendChild(workshopHeading);

            const deptHeading = document.createElement("div");
            deptHeading.className = "department-title";
            deptHeading.textContent = deptTitle.textContent;
            page.appendChild(deptHeading);

            const phaseHeading = document.createElement("div");
            phaseHeading.className = "phase-title";
            phaseHeading.textContent = phaseTitle.textContent;
            page.appendChild(phaseHeading);

            const criteriaHeading = document.createElement("div");
            criteriaHeading.className = "criteria-title";
            criteriaHeading.textContent = criteriaTitle.textContent;
            page.appendChild(criteriaHeading);

            // Create image section
            const imageSection = document.createElement("div");
            imageSection.className = "image-section";

            // Before images
            const beforeContainer = document.createElement("div");
            beforeContainer.className = "image-container";

            const beforeTitle = document.createElement("div");
            beforeTitle.className = "image-title";
            beforeTitle.style.color = "#d32f2f";
            beforeTitle.textContent = "Ảnh vi phạm:";
            beforeContainer.appendChild(beforeTitle);

            const beforeIframes = criterion.querySelectorAll(
              ".MuiGrid-root > .MuiGrid-item:first-of-type iframe"
            );

            if (beforeIframes.length > 0) {
              for (const iframe of beforeIframes) {
                const imageUrl = this.getDirectImageUrl(iframe);
                if (imageUrl) {
                  const img = document.createElement("img");
                  img.className = "violation-image";
                  img.src = imageUrl;
                  img.crossOrigin = "anonymous";
                  beforeContainer.appendChild(img);

                  try {
                    await this.waitForImage(img);
                  } catch (error) {
                    console.error("Error loading image:", error);
                    const placeholder = document.createElement("div");
                    placeholder.className = "no-image-placeholder";
                    placeholder.textContent = "Không thể tải ảnh";
                    beforeContainer.appendChild(placeholder);
                  }
                }
              }
            } else {
              const placeholder = document.createElement("div");
              placeholder.className = "no-image-placeholder";
              placeholder.textContent = "Không có ảnh vi phạm";
              beforeContainer.appendChild(placeholder);
            }

            // After images
            const afterContainer = document.createElement("div");
            afterContainer.className = "image-container";

            const afterTitle = document.createElement("div");
            afterTitle.className = "image-title";
            afterTitle.style.color = "#2e7d32";
            afterTitle.textContent = "Ảnh sau khắc phục:";
            afterContainer.appendChild(afterTitle);

            const afterIframes = criterion.querySelectorAll(
              ".MuiGrid-root > .MuiGrid-item:last-of-type iframe"
            );

            if (afterIframes.length > 0) {
              for (const iframe of afterIframes) {
                const imageUrl = this.getDirectImageUrl(iframe);
                if (imageUrl) {
                  const img = document.createElement("img");
                  img.className = "violation-image";
                  img.src = imageUrl;
                  img.crossOrigin = "anonymous";
                  afterContainer.appendChild(img);

                  try {
                    await this.waitForImage(img);
                  } catch (error) {
                    console.error("Error loading image:", error);
                    const placeholder = document.createElement("div");
                    placeholder.className = "no-image-placeholder";
                    placeholder.textContent = "Không thể tải ảnh";
                    afterContainer.appendChild(placeholder);
                  }
                }
              }
            } else {
              const placeholder = document.createElement("div");
              placeholder.className = "no-image-placeholder";
              placeholder.textContent = "Không có ảnh khắc phục";
              afterContainer.appendChild(placeholder);
            }

            imageSection.appendChild(beforeContainer);
            imageSection.appendChild(afterContainer);
            page.appendChild(imageSection);

            container.appendChild(page);
          }
        }
      }
    }

    document.body.appendChild(container);
    return container;
  }

  async generatePdf(imagesRef) {
    return new Promise((resolve) => {
      try {
        setTimeout(async () => {
          await this.createViolationPages(imagesRef);
          this.addPrintStyles();

          const handleAfterPrint = () => {
            window.removeEventListener("afterprint", handleAfterPrint);
            this.removePrintStyles();
            resolve();
          };
          window.addEventListener("afterprint", handleAfterPrint);

          document.title = `Hinh_anh_vi_pham_Thang_${this.month}_${this.year}`;

          setTimeout(() => {
            window.print();
          }, 2000);
        }, 1000);
      } catch (error) {
        console.error("Error during violation images PDF generation:", error);
        this.removePrintStyles();
        resolve();
      }
    });
  }
}
