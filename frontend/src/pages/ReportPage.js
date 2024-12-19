// frontend/src/pages/ReportPage.js
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Switch,
  Stack,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import ScorePercentageChart from "../components/ScorePercentageChart";
import KnockoutStatsChart from "../components/KnockoutStatsChart";
import WorkshopStatisticsChart from "../components/WorkshopStatisticsChart";
import ViolationImages from "../components/ViolationImages";
import Header from "../components/Header";
import NavigationBubble from "../components/NavigationBubble";
import ExcelExportService from "../components/ExportToExcel";
import ExportToPDF from "../components/ExportToPDF";
import BackupTableIcon from "@mui/icons-material/BackupTable";
import AssessmentIcon from "@mui/icons-material/Assessment";
import logoVLH from "../assets/logo_vlh.jpg";
import logoSIGP from "../assets/logo_sigp.jpg";
import PhaseSelectionBubble from "../components/PhaseSelectionBubble";
import StarIcon from "@mui/icons-material/Star";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  border: "1px solid rgba(240, 240, 240, 1)",
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
  // Sticky styles và widths cho các cột bên trái
  "&.sticky-left-0": {
    position: "sticky",
    left: 0,
    zIndex: 3,
  },
  "&.sticky-left-1": {
    position: "sticky",
    left: "41px", // Điều chỉnh left dựa trên width của cột STT
    zIndex: 3,
    width: "255px", // Chiều rộng cố định cho cột Tên bộ phận
    minWidth: "255px",
  },
  "&.sticky-left-2": {
    position: "sticky",
    left: "305px", // Điều chỉnh left = 50px + 255px
    zIndex: 3,
    width: "100px", // Chiều rộng cố định cho cột Điểm tối đa
    minWidth: "100px",
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
      color: "white",
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
  maxHeight: "calc(100vh - 100px)",
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

const Logo = styled("img")(({ isActive }) => ({
  width: "50px",
  height: "50px",
  objectFit: "contain",
  transition: "filter 0.3s",
  filter: isActive ? "none" : "grayscale(1) opacity(0.6)",
}));

const StarIconStyled = styled(StarIcon)(({ color }) => ({
  fontSize: "16px",
  verticalAlign: "middle",
  marginRight: "4px",
  color: color,
}));

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
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showOnlySIGP, setShowOnlySIGP] = useState(false);
  const [selectedPhaseOption, setSelectedPhaseOption] = useState("month");

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

  const handleSwitchChange = (event) => {
    setShowOnlySIGP(event.target.checked);
  };

  // Thêm logic lọc workshops
  const filteredWorkshops =
    reportData && reportData.workshops
      ? showOnlySIGP
        ? reportData.workshops.filter((w) => w.workshopName === "SIGP")
        : reportData.workshops.filter((w) => w.workshopName !== "SIGP")
      : [];

  useEffect(() => {
    if (!urlMonth) {
      navigate(`/report/${currentMonth}/${currentYear}`);
    }
  }, [urlMonth, currentMonth, currentYear, navigate]);

  const sortDepartments = useCallback((departments) => {
    return [...departments].sort((a, b) => {
      // Helper function to extract number from CHUYỀN
      const getChuyenInfo = (name) => {
        const match = name?.name_department.match(/CHUYỀN\s+(.+)/i);
        if (!match) return null;

        // Kiểm tra xem phần sau CHUYỀN có phải là số không
        const value = match[1];
        const numericValue = parseInt(value);
        return {
          isNumeric: !isNaN(numericValue),
          value: isNaN(numericValue) ? value : numericValue,
        };
      };

      const aInfo = getChuyenInfo(a);
      const bInfo = getChuyenInfo(b);

      // Nếu cả hai đều là CHUYỀN
      if (aInfo && bInfo) {
        // Nếu một cái là số và cái kia là chữ
        if (aInfo.isNumeric !== bInfo.isNumeric) {
          return aInfo.isNumeric ? -1 : 1; // Số đứng trước chữ
        }

        // Nếu cả hai đều là số hoặc cả hai đều là chữ
        if (aInfo.isNumeric) {
          return aInfo.value - bInfo.value; // So sánh số
        } else {
          return aInfo.value.localeCompare(bInfo.value); // So sánh chữ
        }
      }

      // Nếu chỉ một trong hai là CHUYỀN
      if (aInfo) return -1;
      if (bInfo) return 1;

      // Nếu không phải CHUYỀN thì sắp xếp theo alphabet
      return a.name_department?.localeCompare(b.name_department);
    });
  }, []);

  const sortReportData = useCallback(
    (reportData) => {
      if (!reportData || !reportData.workshops) return reportData;

      const sortedData = {
        ...reportData,
        workshops: reportData.workshops.map((workshop) => ({
          ...workshop,
          departments: sortDepartments(workshop.departments),
        })),
      };

      return sortedData;
    },
    [sortDepartments]
  );

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

        const sortedData = sortReportData(enrichedData);
        setReportData(sortedData);
        setError(null);
      } catch (error) {
        console.error("Error fetching report data:", error);
        setError("Lỗi tải dữ liệu báo cáo");
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [selectedMonth, year, sortReportData]);

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
    if (!reportData || !reportData.workshops) return "NaN";

    // Lấy tất cả các bộ phận từ các xưởng được lọc
    const allDepartments = filteredWorkshops.flatMap(
      (workshop) => workshop.departments
    );

    // Tính trung bình cho từng bộ phận
    const departmentAverages = allDepartments
      .map(calculateDepartmentAverage)
      .filter((avg) => avg !== "" && avg !== null); // Loại bỏ các giá trị không hợp lệ

    if (departmentAverages.length === 0) return "NaN";

    // Tính trung bình cộng của tất cả các bộ phận
    const sum = departmentAverages.reduce((acc, avg) => acc + avg, 0);
    return Math.round(sum / departmentAverages.length);
  };

  const handleMonthChange = (event) => {
    const newMonth = event.target.value;
    setSelectedMonth(newMonth);
    navigate(`/report/${newMonth}/${year}`);
  };

  const handlePhaseOptionChange = (option) => {
    setSelectedPhaseOption(option);
  };

  // Thêm state cho năm
  const [availableYears, setAvailableYears] = useState([]);

  // Thêm useEffect để fetch available years
  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        const response = await axios.get(`${API_URL}/available-dates`);
        const dates = response.data;
        const years = [...new Set(dates.map((d) => d.year))].sort(
          (a, b) => b - a
        );
        setAvailableYears(years);
      } catch (error) {
        console.error("Error fetching available dates:", error);
      }
    };

    fetchAvailableDates();
  }, []);

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

              {/* Stack cho năm và tháng */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", sm: "center" }}
                sx={{ minWidth: { xs: "100%", sm: "auto" } }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ width: "100%" }}
                >
                  <FormControl
                    sx={{
                      flex: 1,
                      minWidth: { xs: 0, sm: 120 },
                    }}
                  >
                    <Select
                      value={selectedMonth}
                      onChange={handleMonthChange}
                      size="small"
                      sx={{ fontWeight: "bold" }}
                    >
                      {months.map((month) => (
                        <MenuItem
                          key={month.value}
                          value={month.value}
                          sx={
                            month.value === currentMonth && year === currentYear
                              ? {
                                  fontWeight: "bold",
                                  backgroundColor: "action.hover",
                                }
                              : {}
                          }
                        >
                          {month.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl
                    sx={{
                      flex: 1,
                      minWidth: { xs: 0, sm: 150 },
                    }}
                  >
                    <Select
                      value={year}
                      onChange={(e) => {
                        const newYear = e.target.value;
                        navigate(`/report/${selectedMonth}/${newYear}`);
                      }}
                      size="small"
                      sx={{ fontWeight: "bold" }}
                    >
                      {availableYears.map((y) => (
                        <MenuItem
                          key={y}
                          value={y}
                          sx={
                            y.toString() === currentYear
                              ? {
                                  fontWeight: "bold",
                                  backgroundColor: "action.hover",
                                }
                              : {}
                          }
                        >
                          Năm {y}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>
            </Box>
          </Box>

          {/* Message khi không có dữ liệu */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "100px",
              bgcolor: "background.paper",
              borderRadius: 1,
              p: 3,
              boxShadow: 1,
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Không có dữ liệu cho tháng {selectedMonth} năm {year}
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  const exportToExcel = async () => {
    setIsExportingExcel(true);
    const calculations = {
      calculateWorkshopAverage,
      calculateDepartmentAverage,
      calculateWorkshopTotalAverage,
      calculateOverallAverage,
    };

    const exportData = {
      ...reportData,
      workshops: showOnlySIGP
        ? reportData.workshops.filter((w) => w.workshopName === "SIGP")
        : reportData.workshops.filter((w) => w.workshopName !== "SIGP"),
    };

    try {
      const excelService = new ExcelExportService(exportData, calculations);
      await excelService.exportToExcel(selectedMonth, year);
    } catch (error) {
      console.error("Error exporting Excel:", error);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const exportToPdf = async () => {
    setIsExportingPdf(true);
    const refs = {
      scoreChartRef,
      knockoutChartRef,
      workshopStatsRef,
      imagesRef,
    };

    try {
      const pdfExporter = new ExportToPDF(selectedMonth, year);
      await pdfExporter.generatePdf(refs);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setIsExportingPdf(false);
    }
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

            {/* Stack cho năm và tháng */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
              sx={{ minWidth: { xs: "100%", sm: "auto" } }}
            >
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ width: "100%" }}
              >
                <FormControl
                  sx={{
                    flex: 1,
                    minWidth: { xs: 0, sm: 120 },
                  }}
                >
                  <Select
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    size="small"
                    sx={{ fontWeight: "bold" }}
                  >
                    {months.map((month) => (
                      <MenuItem
                        key={month.value}
                        value={month.value}
                        sx={
                          month.value === currentMonth && year === currentYear
                            ? {
                                fontWeight: "bold",
                                backgroundColor: "action.hover",
                              }
                            : {}
                        }
                      >
                        {month.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl
                  sx={{
                    flex: 1,
                    minWidth: { xs: 0, sm: 150 },
                  }}
                >
                  <Select
                    value={year}
                    onChange={(e) => {
                      const newYear = e.target.value;
                      navigate(`/report/${selectedMonth}/${newYear}`);
                    }}
                    size="small"
                    sx={{ fontWeight: "bold" }}
                  >
                    {availableYears.map((y) => (
                      <MenuItem
                        key={y}
                        value={y}
                        sx={
                          y.toString() === currentYear
                            ? {
                                fontWeight: "bold",
                                backgroundColor: "action.hover",
                              }
                            : {}
                        }
                      >
                        Năm {y}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {/* Buttons */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                <Button
                  variant="contained"
                  sx={{
                    backgroundColor: "#217346",
                    "&:hover": { backgroundColor: "#1e6b3e" },
                    "&.Mui-disabled": {
                      backgroundColor: "#217346",
                      opacity: 0.7,
                    },
                  }}
                  startIcon={<BackupTableIcon size={20} />}
                  onClick={exportToExcel}
                  disabled={isExportingExcel || isExportingPdf}
                >
                  {isExportingExcel ? "Đang xuất Excel..." : "Xuất Excel"}
                </Button>

                <Button
                  variant="contained"
                  sx={{
                    backgroundColor: "#FF6347",
                    "&:hover": { backgroundColor: "#E5533F" },
                    "&.Mui-disabled": {
                      backgroundColor: "#FF6347",
                      opacity: 0.7,
                    },
                  }}
                  startIcon={<AssessmentIcon size={20} />}
                  onClick={exportToPdf}
                  disabled={isExportingExcel || isExportingPdf}
                >
                  {isExportingPdf ? "Đang xuất PDF..." : "Xuất PDF"}
                </Button>
              </Stack>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  bgcolor: "background.paper",
                  padding: "8px 12px",
                  borderRadius: "24px",
                  border: "1px solid #e0e0e0",
                }}
              >
                {/* VLH Label và Logo bên trái */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: !showOnlySIGP ? "primary.main" : "text.secondary",
                    transition: "color 0.3s",
                  }}
                >
                  <Logo src={logoVLH} alt="VLH" isActive={!showOnlySIGP} />
                  <Typography
                    sx={{
                      fontWeight: "bold",
                      fontSize: "1rem",
                    }}
                  >
                    VLH
                  </Typography>
                </Box>

                {/* Switch */}
                <Switch
                  checked={showOnlySIGP}
                  onChange={handleSwitchChange}
                  color="primary"
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": {
                      color: "#1976d2",
                    },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "#1976d2",
                    },
                    mx: 1,
                  }}
                />

                {/* SIGP Label và Logo bên phải */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: showOnlySIGP ? "primary.main" : "text.secondary",
                    transition: "color 0.3s",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: "bold",
                      fontSize: "1rem",
                    }}
                  >
                    SIGP
                  </Typography>
                  <Logo src={logoSIGP} alt="SIGP" isActive={showOnlySIGP} />
                </Box>
              </Box>
            </Stack>
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
              {filteredWorkshops.map((workshop, wIndex) => {
                // Tính STT bắt đầu cho workshop hiện tại
                const startIndex = filteredWorkshops
                  .slice(0, wIndex)
                  .reduce((sum, w) => sum + w.departments.length, 0);

                return (
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
                      <StyledTableCell
                        align="center"
                        sx={{ fontWeight: "bold" }}
                      >
                        {typeof calculateWorkshopTotalAverage(workshop) ===
                        "number"
                          ? `${calculateWorkshopTotalAverage(workshop)}%`
                          : `${calculateWorkshopTotalAverage(workshop)}%`}
                      </StyledTableCell>
                    </StyledTableRow>

                    {/* Department rows */}
                    {workshop.departments.map((dept, dIndex) => {
                      // Tính greenPhaseCount ở đây
                      const greenPhaseCount = dept.phases.filter(
                        (phase, index) => {
                          const isInactive = reportData.phases[
                            index
                          ]?.inactiveDepartments?.includes(dept.id_department);
                          // Chỉ đếm các đợt đang hoạt động và đạt điều kiện màu xanh
                          return (
                            !isInactive &&
                            !phase.has_red_star &&
                            phase.scorePercentage >= 80
                          );
                        }
                      ).length;

                      return (
                        <StyledTableRow key={`${wIndex}-${dIndex}`}>
                          <StyledTableCell
                            align="center"
                            className="sticky-left-0"
                          >
                            {startIndex + dIndex + 1}
                          </StyledTableCell>
                          <StyledTableCell className="sticky-left-1">
                            {dept.name_department}
                          </StyledTableCell>
                          <StyledTableCell
                            align="center"
                            className="sticky-left-2"
                          >
                            {dept.max_points}
                          </StyledTableCell>
                          {dept.phases.map((phase, pIndex) => {
                            const isInactive = reportData.phases[
                              pIndex
                            ]?.inactiveDepartments?.includes(
                              dept.id_department
                            );
                            const showGreenStar =
                              !phase.has_red_star &&
                              phase.scorePercentage >= 80;

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
                                              phase.has_red_star ||
                                              phase.scorePercentage < 80
                                            ) {
                                              return "#ffebee";
                                            }
                                            return "#e8f5e9";
                                          },
                                          color: (theme) => {
                                            if (
                                              phase.has_red_star ||
                                              phase.scorePercentage < 80
                                            ) {
                                              return "#FF0000";
                                            }
                                            return "#009900";
                                          },
                                          minWidth: "100px",
                                          "& .score-container": {
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                          },
                                        }),
                                  }}
                                >
                                  {isInactive ? (
                                    ""
                                  ) : (
                                    <Box className="score-container">
                                      {!isInactive && (
                                        <StarIconStyled
                                          color={
                                            showGreenStar
                                              ? "#009900"
                                              : "#FF0000"
                                          }
                                        />
                                      )}
                                      {`${phase.scorePercentage}%`}
                                    </Box>
                                  )}
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
                                      const avg =
                                        calculateDepartmentAverage(dept);
                                      if (greenPhaseCount >= 3 && avg >= 80) {
                                        return "#e8f5e9";
                                      }
                                      return "#ffebee";
                                    },
                                    color: (theme) => {
                                      const avg =
                                        calculateDepartmentAverage(dept);
                                      if (greenPhaseCount >= 3 && avg >= 80) {
                                        return "#009900";
                                      }
                                      return "#FF0000";
                                    },
                                    minWidth: "100px",
                                    "& .score-container": {
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    },
                                  }
                                : inactiveCellStyle),
                            }}
                          >
                            {typeof calculateDepartmentAverage(dept) ===
                            "number" ? (
                              <Box className="score-container">
                                <StarIconStyled
                                  color={
                                    greenPhaseCount >= 3 &&
                                    calculateDepartmentAverage(dept) >= 80
                                      ? "#009900"
                                      : "#FF0000"
                                  }
                                />
                                {`${calculateDepartmentAverage(dept)}%`}
                              </Box>
                            ) : (
                              calculateDepartmentAverage(dept)
                            )}
                          </StyledTableCell>
                        </StyledTableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })}
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
                    <StyledTableCell sx={{ color: "white" }} />
                    <StyledTableCell
                      align="center"
                      sx={{ fontWeight: "bold", color: "white" }}
                    >
                      {typeof calculateWorkshopAverage(
                        filteredWorkshops.flatMap((w) => w.departments),
                        index
                      ) === "number"
                        ? `${calculateWorkshopAverage(
                            filteredWorkshops.flatMap((w) => w.departments),
                            index
                          )}%`
                        : `${calculateWorkshopAverage(
                            filteredWorkshops.flatMap((w) => w.departments),
                            index
                          )}%`}
                    </StyledTableCell>
                    <StyledTableCell sx={{ color: "white" }} />
                  </React.Fragment>
                ))}
                <StyledTableCell
                  align="center"
                  sx={{ fontWeight: "bold", color: "white" }}
                >
                  {typeof calculateOverallAverage() === "number"
                    ? `${calculateOverallAverage()}%`
                    : `${calculateOverallAverage()}%`}
                </StyledTableCell>
              </TableRow>
            </TableBody>
          </Table>
        </StyledTableContainer>

        {reportData && (
          <>
            <Box ref={scoreChartRef}>
              <ScorePercentageChart
                reportData={
                  showOnlySIGP
                    ? { ...reportData, workshops: filteredWorkshops }
                    : reportData
                }
                selectedPhaseOption={selectedPhaseOption}
              />
            </Box>

            <Box ref={knockoutChartRef}>
              <KnockoutStatsChart
                reportData={
                  showOnlySIGP
                    ? { ...reportData, workshops: filteredWorkshops }
                    : reportData
                }
                selectedPhaseOption={selectedPhaseOption}
              />
            </Box>

            <Box ref={workshopStatsRef}>
              <WorkshopStatisticsChart
                reportData={
                  showOnlySIGP
                    ? { ...reportData, workshops: filteredWorkshops }
                    : reportData
                }
                selectedPhaseOption={selectedPhaseOption}
              />
            </Box>

            <Box ref={imagesRef}>
              <ViolationImages
                reportData={
                  showOnlySIGP
                    ? { ...reportData, workshops: filteredWorkshops }
                    : reportData
                }
                month={selectedMonth}
                year={year}
                selectedPhaseOption={selectedPhaseOption}
                onPhaseChange={handlePhaseOptionChange}
              />
            </Box>
          </>
        )}

        <NavigationBubble
          scrollRefs={{
            tableRef,
            scoreChartRef,
            knockoutChartRef,
            workshopStatsRef,
            imagesRef,
          }}
        />

        <PhaseSelectionBubble
          phases={reportData.phases}
          selectedOption={selectedPhaseOption}
          onOptionChange={handlePhaseOptionChange}
        />
      </Container>
    </Box>
  );
}
