// frontend/src/components/ExportToExcel.js
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const EXCEL_STYLES = {
  header: {
    font: { bold: true, size: 14 },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    },
  },
  workshop: {
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "fffff3e0" },
    },
    font: { bold: true, size: 16 },
    border: {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    },
    alignment: { horizontal: "center", vertical: "middle" },
  },
  inactive: {
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "ffffffff" },
    },
    border: {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    },
    alignment: { horizontal: "center", vertical: "middle" },
  },
  goodScore: {
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "ffe8f5e9" },
    },
    font: {
      color: { argb: "ff009900" },
      bold: true,
      size: 14,
    },
    border: {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    },
    alignment: { horizontal: "center", vertical: "middle" },
  },
  badScore: {
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "ffffebee" },
    },
    font: {
      color: { argb: "ffff0000" },
      bold: true,
      size: 14,
    },
    border: {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    },
    alignment: { horizontal: "center", vertical: "middle" },
  },
  summary: {
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "ff1976d3" },
    },
    font: {
      bold: true,
      color: { argb: "ffffffff" },
    },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    },
  },
};

export class ExcelExportService {
  constructor(reportData, calculations) {
    this.reportData = reportData;
    this.calculations = calculations;
    this.workbook = new ExcelJS.Workbook();
    this.worksheet = this.workbook.addWorksheet("Report");
  }

  columnToLetter(num) {
    let letter = "";
    while (num > 0) {
      let rem = (num - 1) % 26;
      letter = String.fromCharCode(65 + rem) + letter;
      num = Math.floor((num - 1) / 26);
    }
    return letter;
  }

  async exportToExcel(selectedMonth, year) {
    const lastColumn = 3 + this.reportData.phases.length * 3 + 1;
    const lastColLetter = this.columnToLetter(lastColumn);

    this.addHeaders(lastColLetter, selectedMonth, year);
    this.addTableStructure(lastColLetter);
    this.addData(lastColumn);
    this.setColumnWidths();

    const buffer = await this.workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `Bao_cao_KSNB_Thang_${selectedMonth}_${year}.xlsx`);
  }

  addHeaders(lastColLetter, selectedMonth, year) {
    // Title
    this.worksheet.mergeCells(`A1:${lastColLetter}1`);
    this.worksheet.getCell("A1").value = "BAN KIỂM SOÁT NỘI BỘ";
    this.worksheet.getCell("A1").style = {
      ...EXCEL_STYLES.header,
      font: { bold: true, size: 16 },
    };

    // Subtitle
    this.worksheet.mergeCells(`A2:${lastColLetter}2`);
    this.worksheet.getCell(
      "A2"
    ).value = `BẢNG TỔNG HỢP ĐIỂM KSNB CỦA CÁC BỘ PHẬN - THÁNG ${selectedMonth}/${year}`;
    this.worksheet.getCell("A2").style = {
      ...EXCEL_STYLES.header,
      font: { bold: true, size: 14 },
    };

    this.worksheet.addRow([]); // Empty row
  }

  addTableStructure(lastColLetter) {
    // 1. Tạo header chính với đợt và cột tổng điểm đạt
    const mainHeaders = ["STT", "Tên bộ phận", "Điểm tối đa"];

    // Thêm tên các đợt và cột tổng điểm
    this.reportData.phases.forEach((phase) => {
      const phaseName = phase.name_phase;
      mainHeaders.push(phaseName, "", ""); // Push 3 ô cho mỗi đợt (1 cho tên và 2 trống để merge)
    });
    // Thêm cột tổng điểm đạt
    mainHeaders.push("Tổng điểm đạt (%)");

    const mainHeaderRow = this.worksheet.addRow(mainHeaders);
    mainHeaderRow.height = 30;

    // 2. Tạo sub-headers
    const subHeaders = ["", "", ""]; // 3 cột đầu trống
    this.reportData.phases.forEach(() => {
      subHeaders.push("Tổng điểm trừ", "% Điểm đạt", "Hạng mục Điểm liệt");
    });
    subHeaders.push(""); // Cột tổng điểm đạt

    const subHeaderRow = this.worksheet.addRow(subHeaders);
    subHeaderRow.height = 30;

    // 3. Merge cells
    // Merge các cột cố định theo chiều dọc
    this.worksheet.mergeCells("A4:A5"); // STT
    this.worksheet.mergeCells("B4:B5"); // Tên bộ phận
    this.worksheet.mergeCells("C4:C5"); // Điểm tối đa
    this.worksheet.mergeCells(`${lastColLetter}4:${lastColLetter}5`); // Tổng điểm đạt

    // Merge cells cho từng đợt
    let startCol = 4; // Bắt đầu từ cột D
    this.reportData.phases.forEach((phase) => {
      // Merge 3 cột cho header của mỗi đợt
      const startLetter = this.columnToLetter(startCol);
      const endLetter = this.columnToLetter(startCol + 2);
      this.worksheet.mergeCells(`${startLetter}4:${endLetter}4`);
      startCol += 3;
    });

    // 4. Style cho headers
    [mainHeaderRow, subHeaderRow].forEach((row) => {
      row.eachCell((cell, colNumber) => {
        if (cell.value) {
          // Style mặc định cho các header
          let headerStyle = {
            ...EXCEL_STYLES.header,
            fill: {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "ff1976d3" }, // Màu xanh mặc định
            },
            font: {
              bold: true,
              color: { argb: "ffffffff" },
            },
          };

          const whiteHeaderCells = ["STT", "Tên bộ phận", "Điểm tối đa"];
          if (whiteHeaderCells.includes(cell.value)) {
            headerStyle = {
              ...headerStyle,
              fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "ffffffff" },
              },
              font: {
                bold: true,
                color: { argb: "ff000000" },
              },
            };
          }

          // Nếu là ô "Tổng điểm đạt (%)" thì đổi màu thành tím
          if (cell.value === "Tổng điểm đạt (%)") {
            headerStyle = {
              ...headerStyle,
              fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "ffba68c8" }, // Màu tím
              },
            };
          }

          cell.style = headerStyle;
        }
      });
    });

    // 5. Thêm border cho tất cả các cells
    [mainHeaderRow, subHeaderRow].forEach((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // 6. Custom width cho các cột
    this.setColumnWidths();
  }

  setColumnWidths() {
    this.worksheet.columns = [
      { width: 5 }, // STT
      { width: 30 }, // Tên bộ phận
      { width: 10 }, // Điểm tối đa
      ...Array(this.reportData.phases.length * 3).fill({ width: 15 }), // Các cột cho đợt
      { width: 15 }, // Tổng điểm đạt
    ];
  }

  addData(lastColumn) {
    let stt = 1;
    this.reportData.workshops.forEach((workshop) => {
      this.addWorkshopRow(workshop);
      this.addDepartmentRows(workshop, stt, lastColumn);
      stt += workshop.departments.length;
    });
    this.addSummaryRow(lastColumn);
  }

  addWorkshopRow(workshop) {
    const workshopData = ["", workshop.workshopName, ""];
    this.reportData.phases.forEach((_, phaseIndex) => {
      workshopData.push(
        "",
        `${this.calculations.calculateWorkshopAverage(
          workshop.departments,
          phaseIndex
        )}%`,
        ""
      );
    });
    workshopData.push(
      `${this.calculations.calculateWorkshopTotalAverage(workshop)}%`
    );

    const workshopRow = this.worksheet.addRow(workshopData);
    workshopRow.height = 25;
    workshopRow.eachCell((cell) => {
      cell.style = EXCEL_STYLES.workshop;
    });
  }

  addDepartmentRows(workshop, stt, lastColumn) {
    workshop.departments.forEach((dept) => {
      const deptData = this.prepareDepartmentData(dept, stt++);
      const deptRow = this.worksheet.addRow(deptData);
      deptRow.height = 25;
      this.styleDepartmentRow(deptRow, dept, lastColumn);
    });
  }

  prepareDepartmentData(dept, stt) {
    const deptData = [stt, dept.name_department, dept.max_points];

    dept.phases.forEach((phase, pIndex) => {
      const isInactive = this.reportData.phases[
        pIndex
      ]?.inactiveDepartments?.includes(dept.id_department);

      if (isInactive) {
        deptData.push("", "", "");
      } else {
        deptData.push(
          phase.failedCount,
          `${phase.scorePercentage}%`,
          phase.knockoutTypes || ""
        );
      }
    });

    const deptAvg = this.calculations.calculateDepartmentAverage(dept);
    deptData.push(typeof deptAvg === "number" ? `${deptAvg}%` : "");

    return deptData;
  }

  styleDepartmentRow(deptRow, dept, lastColumn) {
    deptRow.eachCell((cell, colNumber) => {
      cell.style = {
        ...EXCEL_STYLES.header,
        alignment: { horizontal: "center", vertical: "middle" },
      };

      if (this.isInactiveCell(dept, colNumber)) {
        cell.style = EXCEL_STYLES.inactive;
      } else if (this.isScoreCell(colNumber)) {
        this.applyScoreStyle(cell, dept, colNumber);
      } else if (this.isTotalScoreCell(colNumber, lastColumn)) {
        this.applyTotalScoreStyle(cell, dept);
      }
    });
  }

  isInactiveCell(dept, colNumber) {
    return this.reportData.phases.some((_, pIndex) => {
      const startCol = 4 + pIndex * 3;
      return (
        this.reportData.phases[pIndex]?.inactiveDepartments?.includes(
          dept.id_department
        ) &&
        colNumber >= startCol &&
        colNumber < startCol + 3
      );
    });
  }

  isScoreCell(colNumber) {
    return colNumber > 3 && (colNumber - 4) % 3 === 1;
  }

  isTotalScoreCell(colNumber, lastColumn) {
    return colNumber === lastColumn;
  }

  applyScoreStyle(cell, dept, colNumber) {
    const phaseIndex = Math.floor((colNumber - 4) / 3);
    const phase = dept.phases[phaseIndex];
    if (phase) {
      const isRed =
        phase.knockoutTypes || phase.has_knockout || phase.scorePercentage < 80;
      cell.style = isRed ? EXCEL_STYLES.badScore : EXCEL_STYLES.goodScore;
    }
  }

  applyTotalScoreStyle(cell, dept) {
    const deptAvg = this.calculations.calculateDepartmentAverage(dept);
    if (typeof deptAvg === "number") {
      const isGreen =
        deptAvg >= 80 && this.calculations.isLatestPhaseGreen(dept);
      cell.style = isGreen ? EXCEL_STYLES.goodScore : EXCEL_STYLES.badScore;
    }
  }

  addSummaryRow(lastColumn) {
    const summaryData = ["", "TỔNG KẾT", ""];
    this.reportData.phases.forEach((_, index) => {
      summaryData.push(
        "",
        `${this.calculations.calculateWorkshopAverage(
          this.reportData.workshops.flatMap((w) => w.departments),
          index
        )}%`,
        ""
      );
    });
    summaryData.push(`${this.calculations.calculateOverallAverage()}%`);

    const summaryRow = this.worksheet.addRow(summaryData);
    summaryRow.height = 25;
    summaryRow.eachCell((cell) => {
      cell.style = EXCEL_STYLES.summary;
    });
  }
}

export default ExcelExportService;
