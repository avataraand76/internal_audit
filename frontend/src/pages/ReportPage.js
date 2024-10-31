// frontend/src/pages/ReportPage.js
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import API_URL from "../data/api";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  Button,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import ScorePercentageChart from "../components/ScorePercentageChart";
import KnockoutStatsChart from "../components/KnockoutStatsChart";
import WorkshopStatistics from "../components/WorkshopStatistics";
import ViolationImages from "../components/ViolationImages";
import Header from "../components/Header";
import NavigationBubble from "../components/NavigationBubble";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  border: "1px solid rgba(240, 240, 240, 1)",
  // border: "1px solid black",
  padding: "8px",
  whiteSpace: "nowrap",
  "&.phase-header": {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
  },
  "&.summary-header": {
    backgroundColor: theme.palette.secondary.light,
    color: theme.palette.secondary.contrastText,
  },
  // Sticky styles cho header dọc
  "&.sticky-top-row": {
    position: "sticky",
    top: 0,
    zIndex: 5,
  },
  "&.sticky-bottom-row": {
    position: "sticky",
    top: "41px",
    zIndex: 5,
  },
  // Sticky styles cho các cột bên trái
  "&.sticky-left-0": {
    position: "sticky",
    left: 0,
    zIndex: 3,
  },
  "&.sticky-left-1": {
    position: "sticky",
    left: "41px",
    zIndex: 3,
  },
  "&.sticky-left-2": {
    position: "sticky",
    left: "291px",
    zIndex: 3,
  },
  // Màu nền mặc định cho sticky cells
  "&.sticky-left-0, &.sticky-left-1, &.sticky-left-2": {
    backgroundColor: "#fff",
  },
  // Màu nền cho các workshop row sticky
  ".workshop-row &.sticky-left-0, .workshop-row &.sticky-left-1, .workshop-row &.sticky-left-2":
    {
      backgroundColor: "#fff3e0",
    },
  // Màu nền cho các header sticky
  "&.sticky-top-row.phase-header, &.sticky-bottom-row.phase-header": {
    backgroundColor: theme.palette.primary.light,
  },
  "&.sticky-top-row.summary-header": {
    backgroundColor: theme.palette.secondary.light,
  },
  // Màu nền cho ô tổng kết cuối bảng
  ".summary-row &.sticky-left-0, .summary-row &.sticky-left-1, .summary-row &.sticky-left-2":
    {
      backgroundColor: "#1976d3",
      color: "black",
    },
  // Tăng z-index cho các cell vừa sticky ngang vừa dọc
  "&.sticky-top-row.sticky-left-0, &.sticky-top-row.sticky-left-1, &.sticky-top-row.sticky-left-2":
    {
      zIndex: 6,
      backgroundColor: "#fff",
    },
  "&.sticky-bottom-row.sticky-left-0, &.sticky-bottom-row.sticky-left-1, &.sticky-bottom-row.sticky-left-2":
    {
      zIndex: 6,
      backgroundColor: "#fff",
    },
}));

const StyledTableContainer = styled(TableContainer)({
  maxHeight: "calc(100vh - 250px)",
  overflow: "auto",
  "& .MuiTable-root": {
    borderCollapse: "separate",
    borderSpacing: 0,
  },
  // Đảm bảo màu cho workshop row
  "& .workshop-row": {
    backgroundColor: "#fff3e0",
    "&:hover": {
      backgroundColor: "yellow",
    },
  },
  // Đảm bảo màu cho inactive cells
  "& .inactive-cell": {
    backgroundColor: "#f5f5f5",
  },
});

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&.workshop-row": {
    backgroundColor: "#fff3e0",
  },
  "&:hover": {
    backgroundColor: "yellow",
  },
}));

const inactiveCellStyle = {
  backgroundColor: "#f5f5f5", // Màu xám nhạt
  position: "relative",
  // Dấu chéo thứ nhất (từ trên phải xuống dưới trái)
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      "linear-gradient(to right top, transparent 47.75%, #999 49.5%, transparent 52.25%)",
    zIndex: 1,
  },
  // Dấu chéo thứ hai (từ trên trái xuống dưới phải)
  "&::after": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      "linear-gradient(to left top, transparent 47.75%, #999 49.5%, transparent 52.25%)",
    zIndex: 1,
  },
};

export default function MonthlyReportPage() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const tableRef = useRef(null);
  const scoreChartRef = useRef(null);
  const knockoutChartRef = useRef(null);
  const workshopStatsRef = useRef(null);
  const imagesRef = useRef(null);

  // Lấy tham số tháng và năm từ URL
  const { month: urlMonth, year: urlYear } = useParams();

  // Lấy ngày hiện tại
  const currentDate = new Date();
  const currentMonth = (currentDate.getMonth() + 1).toString();
  const currentYear = currentDate.getFullYear().toString();

  // Khởi tạo state với tháng từ URL hoặc tháng hiện tại
  const [selectedMonth, setSelectedMonth] = useState(urlMonth || currentMonth);
  const year = urlYear || currentYear;

  // Array of months for the dropdown
  const months = [
    { value: "1", label: "Tháng 1" },
    { value: "2", label: "Tháng 2" },
    { value: "3", label: "Tháng 3" },
    { value: "4", label: "Tháng 4" },
    { value: "5", label: "Tháng 5" },
    { value: "6", label: "Tháng 6" },
    { value: "7", label: "Tháng 7" },
    { value: "8", label: "Tháng 8" },
    { value: "9", label: "Tháng 9" },
    { value: "10", label: "Tháng 10" },
    { value: "11", label: "Tháng 11" },
    { value: "12", label: "Tháng 12" },
  ];

  useEffect(() => {
    if (!urlMonth) {
      navigate(`/report/${currentMonth}/${currentYear}`);
    }
  }, [urlMonth, currentMonth, currentYear, navigate]);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const reportResponse = await axios.get(
          `${API_URL}/monthly-report/${selectedMonth}/${year}`
        );

        // Nếu không có phases hoặc workshops, set reportData là null
        if (
          !reportResponse.data.phases?.length ||
          !reportResponse.data.workshops?.length
        ) {
          setReportData(null);
          setError(null);
          setLoading(false);
          return;
        }

        // Fetch inactive departments data for each phase
        const inactiveDepartmentsPromises = reportResponse.data.phases.map(
          (phase) =>
            axios.get(`${API_URL}/inactive-departments/${phase.id_phase}`)
        );
        const inactiveDepartmentsResponses = await Promise.all(
          inactiveDepartmentsPromises
        );

        // Create map of inactive departments for each phase
        const inactiveDepartmentsMap = {};
        inactiveDepartmentsResponses.forEach((response, index) => {
          const phaseId = reportResponse.data.phases[index].id_phase;
          inactiveDepartmentsMap[phaseId] = response.data.reduce(
            (acc, dept) => {
              acc[dept.id_department] = dept.is_inactive;
              return acc;
            },
            {}
          );
        });

        // Add inactive info to report data
        const enrichedData = {
          ...reportResponse.data,
          inactiveDepartments: inactiveDepartmentsMap,
        };

        setReportData(enrichedData);
        setError(null);
      } catch (error) {
        console.error("Error fetching report data:", error);
        setError("Lỗi tải dữ liệu báo cáo");
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [selectedMonth, year]);

  const calculateWorkshopAverage = (departments, phaseIndex) => {
    const activeDepartments = departments.filter((dept) => {
      return !reportData.phases[phaseIndex]?.inactiveDepartments?.includes(
        dept.id_department
      );
    });

    if (activeDepartments.length === 0) return "NaN";

    const sum = activeDepartments.reduce((acc, dept) => {
      return acc + (dept.phases[phaseIndex]?.scorePercentage || 0);
    }, 0);

    return Math.round(sum / activeDepartments.length);
  };

  const calculateDepartmentAverage = (dept) => {
    // Kiểm tra xem có phải tất cả các phase đều không hoạt động không
    const allPhasesInactive = dept.phases.every((phase, index) => {
      return reportData.phases[index]?.inactiveDepartments?.includes(
        dept.id_department
      );
    });

    if (allPhasesInactive) {
      return "";
    }

    const activePhases = dept.phases.filter((phase, index) => {
      return !reportData.phases[index]?.inactiveDepartments?.includes(
        dept.id_department
      );
    });

    if (activePhases.length === 0) return null;

    const sum = activePhases.reduce((acc, phase) => {
      return acc + (phase.scorePercentage || 0);
    }, 0);

    return Math.round(sum / activePhases.length);
  };

  const calculateWorkshopTotalAverage = (workshop) => {
    const departmentAverages = workshop.departments
      .map(calculateDepartmentAverage)
      .filter((avg) => avg !== "" && avg !== null);

    if (departmentAverages.length === 0) return "NaN";

    const sum = departmentAverages.reduce((acc, avg) => acc + avg, 0);
    return Math.round(sum / departmentAverages.length);
  };

  const calculateOverallAverage = () => {
    const workshopAverages = reportData.workshops
      .map(calculateWorkshopTotalAverage)
      .filter((avg) => avg !== "NaN" && typeof avg === "number");

    if (workshopAverages.length === 0) return "NaN";

    const sum = workshopAverages.reduce((acc, avg) => acc + avg, 0);
    return Math.round(sum / workshopAverages.length);
  };

  const isLatestPhaseGreen = (dept) => {
    // Lặp từ đợt gần nhất về đợt cũ nhất
    for (let i = dept.phases.length - 1; i >= 0; i--) {
      const phase = dept.phases[i];
      const isPhaseInactive = reportData.phases[
        i
      ]?.inactiveDepartments?.includes(dept.id_department);

      // Nếu tìm thấy đợt hoạt động, kiểm tra điều kiện màu xanh
      if (!isPhaseInactive && phase) {
        return !(
          phase.knockoutTypes ||
          phase.has_knockout ||
          phase.scorePercentage < 80
        );
      }
    }

    // Nếu không tìm thấy đợt nào hoạt động
    return false;
  };

  const handleMonthChange = (event) => {
    const newMonth = event.target.value;
    setSelectedMonth(newMonth);
    navigate(`/report/${newMonth}/${year}`);
  };

  if (loading) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <Header />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="calc(100vh - 64px)" // Trừ đi chiều cao của header
        >
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <Header />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Typography color="error" align="center">
            {error}
          </Typography>
        </Container>
      </Box>
    );
  }

  if (!reportData || !reportData.workshops || !reportData.phases?.length) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <Header />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              BAN KIỂM SOÁT NỘI BỘ
            </Typography>
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              gap={2}
            >
              <Typography variant="h5" fontWeight="bold">
                BẢNG TỔNG HỢP ĐIỂM KSNB CỦA CÁC BỘ PHẬN
              </Typography>
              <FormControl sx={{ minWidth: 120 }}>
                <Select
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  size="small"
                  sx={{ fontWeight: "bold" }}
                >
                  {months.map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="h5" fontWeight="bold">
                / {year}
              </Typography>
            </Box>
          </Box>

          {/* Thông báo không có dữ liệu */}
          <Paper sx={{ p: 4, mt: 4 }}>
            <Typography variant="h6" align="center" color="text.secondary">
              Không có dữ liệu cho tháng {selectedMonth} năm {year}
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  const exportToExcel = async () => {
    // Tạo workbook mới
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Report");

    // Style cho header
    const headerStyle = {
      font: { bold: true, size: 14 },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    };

    // Style cho workshop row
    const workshopStyle = {
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "fffff3e0" },
      },
      font: { bold: true },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
      alignment: { horizontal: "center", vertical: "middle" },
    };

    // Style cho inactive cells
    const inactiveStyle = {
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "ff999999" },
      },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
      alignment: { horizontal: "center", vertical: "middle" },
    };

    // Style cho điểm đạt tốt
    const goodScoreStyle = {
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "ffe8f5e9" },
      },
      font: {
        color: { argb: "ff009900" },
        bold: true,
      },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
      alignment: { horizontal: "center", vertical: "middle" },
    };

    // Style cho điểm không đạt
    const badScoreStyle = {
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "ffffebee" },
      },
      font: {
        color: { argb: "ffff0000" },
        bold: true,
      },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
      alignment: { horizontal: "center", vertical: "middle" },
    };

    // Style cho dòng tổng kết
    const summaryStyle = {
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
    };

    // Hàm chuyển đổi số cột sang chữ cái Excel
    const columnToLetter = (num) => {
      let letter = "";
      while (num > 0) {
        let rem = (num - 1) % 26;
        letter = String.fromCharCode(65 + rem) + letter;
        num = Math.floor((num - 1) / 26);
      }
      return letter;
    };

    // Tính toán số cột cuối cùng
    const lastColumn = 3 + reportData.phases.length * 3 + 1;
    const lastColLetter = columnToLetter(lastColumn);

    // Thêm tiêu đề và merge cells
    worksheet.mergeCells(`A1:${lastColLetter}1`);
    worksheet.getCell("A1").value = "BAN KIỂM SOÁT NỘI BỘ";
    worksheet.getCell("A1").style = {
      ...headerStyle,
      font: { bold: true, size: 16 },
    };

    worksheet.mergeCells(`A2:${lastColLetter}2`);
    worksheet.getCell(
      "A2"
    ).value = `BẢNG TỔNG HỢP ĐIỂM KSNB CỦA CÁC BỘ PHẬN - THÁNG ${selectedMonth}/${year}`;
    worksheet.getCell("A2").style = {
      ...headerStyle,
      font: { bold: true, size: 14 },
    };

    // Thêm dòng trống
    worksheet.addRow([]);

    // Tạo cấu trúc header
    const headers = [];
    // Tạo header chính
    reportData.phases.forEach((phase) => {
      headers.push(`${phase.name_phase}`);
    });

    // Tạo row header chính
    const mainHeaderRow = worksheet.addRow([
      "STT",
      "Tên bộ phận",
      "Điểm tối đa",
      ...headers,
      "Tổng điểm đạt (%)",
    ]);
    mainHeaderRow.height = 30;

    // Merge cells cho các đợt
    let startCol = 4; // Bắt đầu từ cột D
    headers.forEach(() => {
      const startLetter = columnToLetter(startCol);
      const endLetter = columnToLetter(startCol + 2);
      worksheet.mergeCells(`${startLetter}4:${endLetter}4`);
      startCol += 3;
    });

    // Tạo sub headers cho các đợt
    const subHeaders = ["", "", ""];
    reportData.phases.forEach(() => {
      subHeaders.push("Tổng điểm trừ", "% Điểm đạt", "Hạng mục Điểm liệt");
    });
    subHeaders.push("");

    // Add sub header row
    const subHeaderRow = worksheet.addRow(subHeaders);
    subHeaderRow.height = 30;

    // Merge cells theo chiều dọc cho các cột cố định và cột cuối
    worksheet.mergeCells("A4:A5"); // STT
    worksheet.mergeCells("B4:B5"); // Tên bộ phận
    worksheet.mergeCells("C4:C5"); // Điểm tối đa
    worksheet.mergeCells(`${lastColLetter}4:${lastColLetter}5`); // Tổng điểm đạt

    // Style cho header rows
    [mainHeaderRow, subHeaderRow].forEach((row) => {
      row.eachCell((cell) => {
        if (cell.value) {
          cell.style = {
            ...headerStyle,
            fill: {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF1976D3" },
            },
            font: {
              bold: true,
              color: { argb: "FFFFFFFF" },
            },
            alignment: {
              horizontal: "center",
              vertical: "middle",
              wrapText: true,
            },
          };
        }
      });
    });

    // Thêm dữ liệu workshop và department
    let stt = 1;
    reportData.workshops.forEach((workshop) => {
      // Workshop row
      const workshopData = ["", workshop.workshopName, ""];
      reportData.phases.forEach((phase, phaseIndex) => {
        workshopData.push(
          "",
          `${calculateWorkshopAverage(workshop.departments, phaseIndex)}%`,
          ""
        );
      });
      workshopData.push(`${calculateWorkshopTotalAverage(workshop)}%`);

      const workshopRow = worksheet.addRow(workshopData);
      workshopRow.height = 25;
      workshopRow.eachCell((cell) => {
        cell.style = workshopStyle;
      });

      // Department rows
      workshop.departments.forEach((dept) => {
        const deptData = [stt++, dept.name_department, dept.max_points];

        dept.phases.forEach((phase, pIndex) => {
          const isInactive = reportData.phases[
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

        const deptAvg = calculateDepartmentAverage(dept);
        deptData.push(typeof deptAvg === "number" ? `${deptAvg}%` : "");

        const deptRow = worksheet.addRow(deptData);
        deptRow.height = 25;

        // Apply styles cho từng cell
        deptRow.eachCell((cell, colNumber) => {
          // Style mặc định cho tất cả các cell
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          cell.alignment = { horizontal: "center", vertical: "middle" };

          // Style cho inactive cells
          if (
            reportData.phases.some((_, pIndex) => {
              const startCol = 4 + pIndex * 3;
              return (
                reportData.phases[pIndex]?.inactiveDepartments?.includes(
                  dept.id_department
                ) &&
                colNumber >= startCol &&
                colNumber < startCol + 3
              );
            })
          ) {
            cell.style = inactiveStyle;
          }
          // Style cho % điểm đạt
          else if (colNumber > 3 && (colNumber - 4) % 3 === 1 && cell.value) {
            const phaseIndex = Math.floor((colNumber - 4) / 3);
            const phase = dept.phases[phaseIndex];
            if (phase) {
              const isRed =
                phase.knockoutTypes ||
                phase.has_knockout ||
                phase.scorePercentage < 80;
              cell.style = isRed ? badScoreStyle : goodScoreStyle;
            }
          }
          // Style cho tổng điểm đạt
          else if (colNumber === lastColumn && typeof deptAvg === "number") {
            const isGreen = deptAvg >= 80 && isLatestPhaseGreen(dept);
            cell.style = isGreen ? goodScoreStyle : badScoreStyle;
          }
        });
      });
    });

    // Add summary row
    const summaryData = ["", "TỔNG KẾT", ""];
    reportData.phases.forEach((phase, index) => {
      summaryData.push(
        "",
        `${calculateWorkshopAverage(
          reportData.workshops.flatMap((w) => w.departments),
          index
        )}%`,
        ""
      );
    });
    summaryData.push(`${calculateOverallAverage()}%`);

    const summaryRow = worksheet.addRow(summaryData);
    summaryRow.height = 25;
    summaryRow.eachCell((cell) => {
      cell.style = summaryStyle;
    });

    // Set column widths
    worksheet.columns = [
      { width: 5 }, // STT
      { width: 30 }, // Tên bộ phận
      { width: 10 }, // Điểm tối đa
      ...Array(reportData.phases.length * 3).fill({ width: 15 }),
      { width: 15 }, // Tổng điểm đạt
    ];

    // Generate và save file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `Bao_cao_KSNB_Thang_${selectedMonth}_${year}.xlsx`);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Header />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box textAlign="center" mb={4}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            BAN KIỂM SOÁT NỘI BỘ
          </Typography>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            gap={2}
          >
            <Typography ref={tableRef} variant="h5" fontWeight="bold">
              BẢNG TỔNG HỢP ĐIỂM KSNB CỦA CÁC BỘ PHẬN
            </Typography>
            <FormControl sx={{ minWidth: 120 }}>
              <Select
                value={selectedMonth}
                onChange={handleMonthChange}
                size="small"
                sx={{ fontWeight: "bold" }}
              >
                {months.map((month) => (
                  <MenuItem key={month.value} value={month.value}>
                    {month.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="h5" fontWeight="bold">
              / {year}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<FileDownloadIcon />}
              onClick={exportToExcel}
            >
              Xuất Excel
            </Button>
          </Box>
        </Box>

        {/* Report Table */}
        <StyledTableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <StyledTableCell
                  align="center"
                  rowSpan={2}
                  className="sticky-top-row sticky-left-0"
                >
                  STT
                </StyledTableCell>
                <StyledTableCell
                  align="center"
                  rowSpan={2}
                  className="sticky-top-row sticky-left-1"
                >
                  Tên bộ phận
                </StyledTableCell>
                <StyledTableCell
                  align="center"
                  rowSpan={2}
                  className="sticky-top-row sticky-left-2"
                >
                  Điểm tối đa
                </StyledTableCell>
                {reportData.phases.map((phase) => (
                  <StyledTableCell
                    key={phase.id_phase}
                    align="center"
                    colSpan={3}
                    className="phase-header sticky-top-row"
                  >
                    {phase.name_phase}
                  </StyledTableCell>
                ))}
                <StyledTableCell
                  align="center"
                  rowSpan={2}
                  className="summary-header sticky-top-row"
                >
                  Tổng điểm đạt (%)
                </StyledTableCell>
              </TableRow>
              <TableRow>
                {reportData.phases.map((phase) => (
                  <React.Fragment key={`headers-${phase.id_phase}`}>
                    <StyledTableCell
                      align="center"
                      className="phase-header sticky-bottom-row"
                    >
                      Tổng điểm trừ
                    </StyledTableCell>
                    <StyledTableCell
                      align="center"
                      className="phase-header sticky-bottom-row"
                    >
                      % Điểm đạt
                    </StyledTableCell>
                    <StyledTableCell
                      align="center"
                      className="phase-header sticky-bottom-row"
                    >
                      Hạng mục Điểm liệt
                    </StyledTableCell>
                  </React.Fragment>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.workshops.map((workshop, wIndex) => (
                <React.Fragment key={wIndex}>
                  {/* Workshop header row with average scores */}
                  <StyledTableRow className="workshop-row">
                    <StyledTableCell
                      colSpan={2}
                      className="sticky-left-0"
                      sx={{ backgroundColor: "#fff3e0" }}
                    >
                      <Typography variant="subtitle1" fontWeight="bold">
                        {workshop.workshopName}
                      </Typography>
                    </StyledTableCell>
                    <StyledTableCell
                      className="sticky-left-2"
                      sx={{ backgroundColor: "#fff3e0" }}
                    >
                      {/* Ô trống để giữ alignment*/}
                    </StyledTableCell>
                    {reportData.phases.map((phase, phaseIndex) => {
                      const avgScore = calculateWorkshopAverage(
                        workshop.departments,
                        phaseIndex
                      );

                      return (
                        <React.Fragment key={`avg-${phaseIndex}`}>
                          <StyledTableCell align="center">
                            {/* Empty cell for total points deducted */}
                          </StyledTableCell>
                          <StyledTableCell
                            align="center"
                            sx={{
                              fontWeight: "bold",
                            }}
                          >
                            {typeof avgScore === "number"
                              ? `${avgScore}%`
                              : `${avgScore}%`}
                          </StyledTableCell>
                          <StyledTableCell align="center">
                            {/* Empty cell for knockout types */}
                          </StyledTableCell>
                        </React.Fragment>
                      );
                    })}
                    <StyledTableCell align="center" sx={{ fontWeight: "bold" }}>
                      {typeof calculateWorkshopTotalAverage(workshop) ===
                      "number"
                        ? `${calculateWorkshopTotalAverage(workshop)}%`
                        : `${calculateWorkshopTotalAverage(workshop)}%`}
                    </StyledTableCell>
                  </StyledTableRow>

                  {/* Department rows */}
                  {workshop.departments.map((dept, dIndex) => (
                    <StyledTableRow key={`${wIndex}-${dIndex}`}>
                      <StyledTableCell align="center" className="sticky-left-0">
                        {dIndex + 1}
                      </StyledTableCell>
                      <StyledTableCell className="sticky-left-1">
                        {dept.name_department}
                      </StyledTableCell>
                      <StyledTableCell align="center" className="sticky-left-2">
                        {dept.max_points}
                      </StyledTableCell>
                      {dept.phases.map((phase, pIndex) => {
                        const isInactive = reportData.phases[
                          pIndex
                        ]?.inactiveDepartments?.includes(dept.id_department);

                        return (
                          <React.Fragment key={`${dIndex}-${pIndex}`}>
                            <StyledTableCell
                              align="center"
                              sx={isInactive ? inactiveCellStyle : {}}
                            >
                              {isInactive ? "" : phase.failedCount}
                            </StyledTableCell>
                            <StyledTableCell
                              align="center"
                              sx={{
                                ...(isInactive
                                  ? inactiveCellStyle
                                  : {
                                      fontWeight: "bold",
                                      backgroundColor: (theme) => {
                                        if (
                                          phase.knockoutTypes ||
                                          phase.has_knockout ||
                                          phase.scorePercentage < 80
                                        ) {
                                          return "#ffebee";
                                        }
                                        return "#e8f5e9";
                                      },
                                      color: (theme) => {
                                        if (
                                          phase.knockoutTypes ||
                                          phase.has_knockout ||
                                          phase.scorePercentage < 80
                                        ) {
                                          return "#FF0000";
                                        }
                                        return "#009900";
                                      },
                                    }),
                              }}
                            >
                              {isInactive ? "" : `${phase.scorePercentage}%`}
                            </StyledTableCell>
                            <StyledTableCell
                              align="center"
                              sx={isInactive ? inactiveCellStyle : {}}
                            >
                              {isInactive ? "" : phase.knockoutTypes}
                            </StyledTableCell>
                          </React.Fragment>
                        );
                      })}
                      <StyledTableCell
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          ...(typeof calculateDepartmentAverage(dept) ===
                          "number"
                            ? {
                                backgroundColor: (theme) => {
                                  const avg = calculateDepartmentAverage(dept);
                                  // Tô màu xanh chỉ khi tổng điểm >= 80 và ô đợt cuối có màu xanh
                                  if (avg >= 80 && isLatestPhaseGreen(dept)) {
                                    return "#e8f5e9";
                                  }
                                  return "#ffebee";
                                },
                                color: (theme) => {
                                  const avg = calculateDepartmentAverage(dept);
                                  if (avg >= 80 && isLatestPhaseGreen(dept)) {
                                    return "#009900";
                                  }
                                  return "#FF0000";
                                },
                              }
                            : inactiveCellStyle),
                        }}
                      >
                        {typeof calculateDepartmentAverage(dept) === "number"
                          ? `${calculateDepartmentAverage(dept)}%`
                          : calculateDepartmentAverage(dept)}
                      </StyledTableCell>
                    </StyledTableRow>
                  ))}
                </React.Fragment>
              ))}
              {/* Summary Rows */}
              <TableRow
                className="summary-row"
                sx={{ backgroundColor: "#1976d3" }}
              >
                <StyledTableCell
                  colSpan={2}
                  align="center"
                  className="sticky-left-0"
                  sx={{
                    backgroundColor: "#1976d3",
                    color: "white",
                  }}
                >
                  <Typography fontWeight="bold">TỔNG KẾT</Typography>
                </StyledTableCell>
                <StyledTableCell
                  className="sticky-left-2"
                  sx={{
                    backgroundColor: "#1976d3",
                    color: "white",
                  }}
                >
                  {/* Ô trống để giữ alignment*/}
                </StyledTableCell>
                {reportData.phases.map((phase, index) => (
                  <React.Fragment key={`summary-${index}`}>
                    <StyledTableCell />
                    <StyledTableCell align="center" sx={{ fontWeight: "bold" }}>
                      {typeof calculateWorkshopAverage(
                        reportData.workshops.flatMap((w) => w.departments),
                        index
                      ) === "number"
                        ? `${calculateWorkshopAverage(
                            reportData.workshops.flatMap((w) => w.departments),
                            index
                          )}%`
                        : `${calculateWorkshopAverage(
                            reportData.workshops.flatMap((w) => w.departments),
                            index
                          )}%`}
                    </StyledTableCell>
                    <StyledTableCell />
                  </React.Fragment>
                ))}
                <StyledTableCell align="center" sx={{ fontWeight: "bold" }}>
                  {typeof calculateOverallAverage() === "number"
                    ? `${calculateOverallAverage()}%`
                    : `${calculateOverallAverage()}%`}
                </StyledTableCell>
              </TableRow>
            </TableBody>
          </Table>
        </StyledTableContainer>

        <Box ref={scoreChartRef}>
          <ScorePercentageChart reportData={reportData} />
        </Box>

        <Box ref={knockoutChartRef}>
          <KnockoutStatsChart reportData={reportData} />
        </Box>

        <Box ref={workshopStatsRef}>
          <WorkshopStatistics reportData={reportData} />
        </Box>

        <Box ref={imagesRef}>
          <ViolationImages reportData={reportData} />
        </Box>

        <NavigationBubble
          scrollRefs={{
            tableRef,
            scoreChartRef,
            knockoutChartRef,
            workshopStatsRef,
            imagesRef,
          }}
        />
      </Container>
    </Box>
  );
}
