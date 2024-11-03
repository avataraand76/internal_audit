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
          size: A4;
          margin: 10mm;
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
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          box-sizing: border-box !important;
          padding: 5mm 0 !important;
          min-height: 0 !important;
          page-break-after: always !important;
        }

        .violation-page:last-child {
          page-break-after: auto !important;
        }

        .violation-header {
          font-size: 16pt !important;
          font-weight: bold !important;
          text-align: center !important;
          color: black !important;
          width: 100% !important;
          padding-top: 5mm !important;
          margin-bottom: 5mm !important;
        }

        .workshop-title {
          font-size: 12pt !important;
          font-weight: bold !important;
          color: #1976d2 !important;
          margin-bottom: 1mm !important;
          width: 100% !important;
          text-align: left !important;
        }

        .department-title {
          font-size: 11pt !important;
          font-weight: bold !important;
          color: #9c27b0 !important;
          margin-bottom: 1mm !important;
          width: 100% !important;
          text-align: left !important;
        }

        .phase-title {
          font-size: 10pt !important;
          font-weight: bold !important;
          margin-bottom: 1mm !important;
          width: 100% !important;
          text-align: left !important;
        }

        .criteria-title {
          font-size: 10pt !important;
          background-color: #f5f5f5 !important;
          padding: 1mm !important;
          margin-bottom: 1mm !important;
          width: 95% !important;
          border-radius: 1mm !important;
          text-align: left !important;
        }

        .image-section {
          display: flex !important;
          flex-direction: column !important;
          width: 100% !important;
          gap: 5mm !important;
          margin-bottom: 5mm !important;
        }

        .image-row {
          display: flex !important;
          justify-content: space-between !important;
          width: 100% !important;
          gap: 5mm !important;
        }

        .image-container {
          flex: 1 1 calc(50% - 2.5mm) !important;
          display: flex !important;
          flex-direction: column !important;
          min-height: 50mm !important;
        }

        .image-title {
          font-size: 10pt !important;
          font-weight: bold !important;
          margin-bottom: 1mm !important;
          text-align: left !important;
        }

        .violation-image {
          width: 100% !important;
          height: 45mm !important;
          object-fit: contain !important;
          border: 1px solid #ddd !important;
          background-color: white !important;
        }

        .no-image-placeholder {
          width: 100% !important;
          height: 45mm !important;
          background-color: #f5f5f5 !important;
          border: 1px dashed #ccc !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #666 !important;
          font-size: 9pt !important;
        }

        * {
          text-rendering: optimizeLegibility !important;
          -webkit-font-smoothing: antialiased !important;
          color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
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

    const titleHeader = document.createElement("div");
    titleHeader.className = "violation-header";
    titleHeader.textContent = `HÌNH ẢNH VI PHẠM TIÊU CHÍ THÁNG ${this.month}/${this.year}`;
    container.appendChild(titleHeader);

    const workshops = imagesRef.current.querySelectorAll(
      ".MuiPaper-root > .MuiBox-root"
    );

    for (const workshop of workshops) {
      const workshopTitle = workshop.querySelector("h4");
      if (!workshopTitle) continue;

      const departments = workshop.querySelectorAll(":scope > .MuiBox-root");
      for (const dept of departments) {
        const deptTitle = dept.querySelector("h5");
        if (!deptTitle) continue;

        const phases = dept.querySelectorAll(":scope > .MuiBox-root");
        for (const phase of phases) {
          const phaseTitle = phase.querySelector("h6");
          if (!phaseTitle) continue;

          const criteria = phase.querySelectorAll(":scope > .MuiBox-root");
          for (const criterion of criteria) {
            const criteriaTitle = criterion.querySelector(
              ".MuiTypography-subtitle1"
            );
            if (!criteriaTitle) continue;

            const page = document.createElement("div");
            page.className = "violation-page";

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

            const imageSection = document.createElement("div");
            imageSection.className = "image-section";

            // Get all images
            const beforeIframes = criterion.querySelectorAll(
              ".MuiGrid-root > .MuiGrid-item:first-of-type iframe"
            );
            const afterIframes = criterion.querySelectorAll(
              ".MuiGrid-root > .MuiGrid-item:last-of-type iframe"
            );

            // Always show violation images section
            const beforeRow = document.createElement("div");
            beforeRow.className = "image-row";

            // First violation container
            const beforeContainer = document.createElement("div");
            beforeContainer.className = "image-container";
            const beforeTitle = document.createElement("div");
            beforeTitle.className = "image-title";
            beforeTitle.style.color = "#d32f2f";
            beforeTitle.textContent = "Ảnh vi phạm:";
            beforeContainer.appendChild(beforeTitle);

            if (beforeIframes.length > 0) {
              const imageUrl = this.getDirectImageUrl(beforeIframes[0]);
              if (imageUrl) {
                const img = document.createElement("img");
                img.className = "violation-image";
                img.src = imageUrl;
                img.crossOrigin = "anonymous";
                beforeContainer.appendChild(img);
                try {
                  await this.waitForImage(img);
                } catch (error) {
                  const placeholder = document.createElement("div");
                  placeholder.className = "no-image-placeholder";
                  placeholder.textContent = "Không thể tải ảnh";
                  beforeContainer.appendChild(placeholder);
                }
              }
            } else {
              const placeholder = document.createElement("div");
              placeholder.className = "no-image-placeholder";
              placeholder.textContent = "Không có ảnh vi phạm";
              beforeContainer.appendChild(placeholder);
            }
            beforeRow.appendChild(beforeContainer);

            // Second violation container
            if (beforeIframes.length > 1) {
              const beforeContainer2 = document.createElement("div");
              beforeContainer2.className = "image-container";
              const beforeTitle2 = document.createElement("div");
              beforeTitle2.className = "image-title";
              beforeTitle2.style.color = "#d32f2f";
              beforeTitle2.textContent = "Ảnh vi phạm 2:";
              beforeContainer2.appendChild(beforeTitle2);

              const imageUrl = this.getDirectImageUrl(beforeIframes[1]);
              if (imageUrl) {
                const img = document.createElement("img");
                img.className = "violation-image";
                img.src = imageUrl;
                img.crossOrigin = "anonymous";
                beforeContainer2.appendChild(img);
                try {
                  await this.waitForImage(img);
                } catch (error) {
                  const placeholder = document.createElement("div");
                  placeholder.className = "no-image-placeholder";
                  placeholder.textContent = "Không thể tải ảnh";
                  beforeContainer2.appendChild(placeholder);
                }
              }
              beforeRow.appendChild(beforeContainer2);
            }

            imageSection.appendChild(beforeRow);

            // Always show fixed images section
            const afterRow = document.createElement("div");
            afterRow.className = "image-row";

            // First fixed container
            const afterContainer = document.createElement("div");
            afterContainer.className = "image-container";
            const afterTitle = document.createElement("div");
            afterTitle.className = "image-title";
            afterTitle.style.color = "#2e7d32";
            afterTitle.textContent = "Ảnh sau khắc phục:";
            afterContainer.appendChild(afterTitle);

            if (afterIframes.length > 0) {
              const imageUrl = this.getDirectImageUrl(afterIframes[0]);
              if (imageUrl) {
                const img = document.createElement("img");
                img.className = "violation-image";
                img.src = imageUrl;
                img.crossOrigin = "anonymous";
                afterContainer.appendChild(img);
                try {
                  await this.waitForImage(img);
                } catch (error) {
                  const placeholder = document.createElement("div");
                  placeholder.className = "no-image-placeholder";
                  placeholder.textContent = "Không thể tải ảnh";
                  afterContainer.appendChild(placeholder);
                }
              }
            } else {
              const placeholder = document.createElement("div");
              placeholder.className = "no-image-placeholder";
              placeholder.textContent = "Không có ảnh khắc phục";
              afterContainer.appendChild(placeholder);
            }
            afterRow.appendChild(afterContainer);

            // Second fixed container
            if (afterIframes.length > 1) {
              const afterContainer2 = document.createElement("div");
              afterContainer2.className = "image-container";
              const afterTitle2 = document.createElement("div");
              afterTitle2.className = "image-title";
              afterTitle2.style.color = "#2e7d32";
              afterTitle2.textContent = "Ảnh sau khắc phục 2:";
              afterContainer2.appendChild(afterTitle2);

              const imageUrl = this.getDirectImageUrl(afterIframes[1]);
              if (imageUrl) {
                const img = document.createElement("img");
                img.className = "violation-image";
                img.src = imageUrl;
                img.crossOrigin = "anonymous";
                afterContainer2.appendChild(img);
                try {
                  await this.waitForImage(img);
                } catch (error) {
                  const placeholder = document.createElement("div");
                  placeholder.className = "no-image-placeholder";
                  placeholder.textContent = "Không thể tải ảnh";
                  afterContainer2.appendChild(placeholder);
                }
              }
              afterRow.appendChild(afterContainer2);
            }

            imageSection.appendChild(afterRow);

            // Process remaining violation images if any
            if (beforeIframes.length > 2) {
              for (let i = 2; i < beforeIframes.length; i += 2) {
                const row = document.createElement("div");
                row.className = "image-row";

                // First image of the pair
                const container1 = document.createElement("div");
                container1.className = "image-container";
                const title1 = document.createElement("div");
                title1.className = "image-title";
                title1.style.color = "#d32f2f";
                title1.textContent = `Ảnh vi phạm ${i + 1}:`;
                container1.appendChild(title1);

                const imageUrl1 = this.getDirectImageUrl(beforeIframes[i]);
                if (imageUrl1) {
                  const img = document.createElement("img");
                  img.className = "violation-image";
                  img.src = imageUrl1;
                  img.crossOrigin = "anonymous";
                  container1.appendChild(img);
                  try {
                    await this.waitForImage(img);
                  } catch (error) {
                    const placeholder = document.createElement("div");
                    placeholder.className = "no-image-placeholder";
                    placeholder.textContent = "Không thể tải ảnh";
                    container1.appendChild(placeholder);
                  }
                }
                row.appendChild(container1);

                // Second image of the pair if it exists
                if (i + 1 < beforeIframes.length) {
                  const container2 = document.createElement("div");
                  container2.className = "image-container";
                  const title2 = document.createElement("div");
                  title2.className = "image-title";
                  title2.style.color = "#d32f2f";
                  title2.textContent = `Ảnh vi phạm ${i + 2}:`;
                  container2.appendChild(title2);

                  const imageUrl2 = this.getDirectImageUrl(
                    beforeIframes[i + 1]
                  );
                  if (imageUrl2) {
                    const img = document.createElement("img");
                    img.className = "violation-image";
                    img.src = imageUrl2;
                    img.crossOrigin = "anonymous";
                    container2.appendChild(img);
                    try {
                      await this.waitForImage(img);
                    } catch (error) {
                      const placeholder = document.createElement("div");
                      placeholder.className = "no-image-placeholder";
                      placeholder.textContent = "Không thể tải ảnh";
                      container2.appendChild(placeholder);
                    }
                  }
                  row.appendChild(container2);
                }

                imageSection.appendChild(row);
              }
            }

            // Process remaining fixed images if any
            if (afterIframes.length > 2) {
              for (let i = 2; i < afterIframes.length; i += 2) {
                const row = document.createElement("div");
                row.className = "image-row";

                // First image of the pair
                const container1 = document.createElement("div");
                container1.className = "image-container";
                const title1 = document.createElement("div");
                title1.className = "image-title";
                title1.style.color = "#2e7d32";
                title1.textContent = `Ảnh sau khắc phục ${i + 1}:`;
                container1.appendChild(title1);

                const imageUrl1 = this.getDirectImageUrl(afterIframes[i]);
                if (imageUrl1) {
                  const img = document.createElement("img");
                  img.className = "violation-image";
                  img.src = imageUrl1;
                  img.crossOrigin = "anonymous";
                  container1.appendChild(img);
                  try {
                    await this.waitForImage(img);
                  } catch (error) {
                    const placeholder = document.createElement("div");
                    placeholder.className = "no-image-placeholder";
                    placeholder.textContent = "Không thể tải ảnh";
                    container1.appendChild(placeholder);
                  }
                }
                row.appendChild(container1);

                // Second image of the pair if it exists
                if (i + 1 < afterIframes.length) {
                  const container2 = document.createElement("div");
                  container2.className = "image-container";
                  const title2 = document.createElement("div");
                  title2.className = "image-title";
                  title2.style.color = "#2e7d32";
                  title2.textContent = `Ảnh sau khắc phục ${i + 2}:`;
                  container2.appendChild(title2);

                  const imageUrl2 = this.getDirectImageUrl(afterIframes[i + 1]);
                  if (imageUrl2) {
                    const img = document.createElement("img");
                    img.className = "violation-image";
                    img.src = imageUrl2;
                    img.crossOrigin = "anonymous";
                    container2.appendChild(img);
                    try {
                      await this.waitForImage(img);
                    } catch (error) {
                      const placeholder = document.createElement("div");
                      placeholder.className = "no-image-placeholder";
                      placeholder.textContent = "Không thể tải ảnh";
                      container2.appendChild(placeholder);
                    }
                  }
                  row.appendChild(container2);
                }

                imageSection.appendChild(row);
              }
            }

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
