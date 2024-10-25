// frontend/src/pages/ReportPage.js
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import API_URL from "../data/api";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import {
  Button,
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
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { styled } from "@mui/material/styles";
import Header from "../components/Header";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  border: "1px solid rgba(224, 224, 224, 1)",
  padding: "8px",
  whiteSpace: "nowrap",
  "&.phase-header": {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&.workshop-row": {
    backgroundColor: theme.palette.action.hover,
  },
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export default function MonthlyReportPage() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get month and year from URL params or current date
  const { month: urlMonth, year: urlYear } = useParams();
  const currentDate = new Date("2024-09-25"); // Using the date from database
  const month = urlMonth || (currentDate.getMonth() + 1).toString();
  const year = urlYear || currentDate.getFullYear().toString();

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/monthly-report/${month}/${year}`
        );
        if (response.data && response.data.workshops) {
          setReportData(response.data);
          setError(null);
        } else {
          setError("No data available for this period");
        }
      } catch (error) {
        console.error("Error fetching report data:", error);
        setError("Failed to load report data");
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [month, year]);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text("CÔNG TY TNHH MAY VIỆT LONG HƯNG", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text("Ban Kiểm soát Hệ thống Tuần Thủ", 105, 30, { align: "center" });
    doc.text(
      `BẢNG TỔNG HỢP ĐIỂM KSNB CỦA CÁC BỘ PHẬN THÁNG ${month}/${year}`,
      105,
      40,
      { align: "center" }
    );

    // Prepare table data
    const tableData = [];
    let stt = 1;

    reportData.workshops.forEach((workshop) => {
      // Add workshop header row
      tableData.push([
        "",
        workshop.workshopName,
        "",
        ...reportData.phases.flatMap(() => ["", "", ""]),
      ]);

      // Add department rows
      workshop.departments.forEach((dept) => {
        const row = [stt++, dept.name_department, dept.max_points];

        // Add data for each phase
        dept.phases.forEach((phase) => {
          row.push(
            phase.failedCount,
            `${phase.scorePercentage}%`,
            phase.knockoutTypes || ""
          );
        });

        tableData.push(row);
      });
    });

    // Create dynamic headers based on number of phases
    const headers = [
      [
        { content: "STT", rowSpan: 2 },
        { content: "Tên bộ phận", rowSpan: 2 },
        { content: "Điểm tối đa", rowSpan: 2 },
        ...reportData.phases.map((phase) => ({
          content: phase.name_phase,
          colSpan: 3,
        })),
      ],
      [
        ...reportData.phases.flatMap(() => [
          "Tổng điểm trừ",
          "% Điểm đạt",
          "Hạng mục Điểm liệt",
        ]),
      ],
    ];

    // Add table to PDF
    doc.autoTable({
      head: headers,
      body: tableData,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 },
      },
    });

    doc.save(`baocao-ksnb-${month}-${year}.pdf`);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!reportData || !reportData.workshops) {
    return (
      <Box p={3}>
        <Typography>No data available for this period</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Header />

      {/* Header */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          BAN KIỂM SOÁT NỘI BỘ
        </Typography>
        <Typography variant="h5" fontWeight="bold">
          BẢNG TỔNG HỢP ĐIỂM KSNB CỦA CÁC BỘ PHẬN THÁNG {month}/{year}
        </Typography>
      </Box>

      {/* Download Button */}
      <Box mb={3}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadPDF}
        >
          Tải xuống PDF
        </Button>
      </Box>

      {/* Report Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <StyledTableCell align="center" rowSpan={2}>
                STT
              </StyledTableCell>
              <StyledTableCell align="center" rowSpan={2}>
                Tên bộ phận
              </StyledTableCell>
              <StyledTableCell align="center" rowSpan={2}>
                Điểm tối đa
              </StyledTableCell>
              {reportData.phases.map((phase) => (
                <StyledTableCell
                  key={phase.id_phase}
                  align="center"
                  colSpan={3}
                  className="phase-header"
                >
                  {phase.name_phase}
                </StyledTableCell>
              ))}
            </TableRow>
            <TableRow>
              {reportData.phases.map((phase) => (
                <React.Fragment key={`headers-${phase.id_phase}`}>
                  <StyledTableCell align="center" className="phase-header">
                    Tổng điểm trừ
                  </StyledTableCell>
                  <StyledTableCell align="center" className="phase-header">
                    % Điểm đạt
                  </StyledTableCell>
                  <StyledTableCell align="center" className="phase-header">
                    Hạng mục Điểm liệt
                  </StyledTableCell>
                </React.Fragment>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {reportData.workshops.map((workshop, wIndex) => (
              <React.Fragment key={wIndex}>
                {/* Workshop header row */}
                <StyledTableRow className="workshop-row">
                  <StyledTableCell colSpan={3 + reportData.phases.length * 3}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {workshop.workshopName}
                    </Typography>
                  </StyledTableCell>
                </StyledTableRow>
                {/* Department rows */}
                {workshop.departments.map((dept, dIndex) => (
                  <StyledTableRow key={`${wIndex}-${dIndex}`}>
                    <StyledTableCell align="center">
                      {dIndex + 1}
                    </StyledTableCell>
                    <StyledTableCell>{dept.name_department}</StyledTableCell>
                    <StyledTableCell align="center">
                      {dept.max_points}
                    </StyledTableCell>
                    {dept.phases.map((phase, pIndex) => (
                      <React.Fragment key={`${dIndex}-${pIndex}`}>
                        <StyledTableCell align="center">
                          {phase.failedCount}
                        </StyledTableCell>
                        <StyledTableCell
                          align="center"
                          sx={{
                            backgroundColor:
                              phase.scorePercentage < 80
                                ? "#ffebee"
                                : "inherit",
                            color:
                              phase.scorePercentage < 80
                                ? "error.main"
                                : "inherit",
                          }}
                        >
                          {phase.scorePercentage}%
                        </StyledTableCell>
                        <StyledTableCell align="center">
                          {phase.knockoutTypes}
                        </StyledTableCell>
                      </React.Fragment>
                    ))}
                  </StyledTableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
