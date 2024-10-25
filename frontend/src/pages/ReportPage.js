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

export default function ReportPage() {
  const { phaseId } = useParams();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const response = await axios.get(`${API_URL}/report/${phaseId}`);
        setReportData(response.data);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [phaseId]);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text("CÔNG TY TNHH MAY VIỆT LONG HƯNG", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text("Ban Kiểm soát Hệ thống Tuần Thủ", 105, 30, { align: "center" });
    doc.text(
      `BẢNG TỔNG HỢP ĐIỂM KSNB CỦA CÁC BỘ PHẬN THÁNG ${reportData?.phase?.report_month}`,
      105,
      40,
      { align: "center" }
    );

    // Prepare table data
    const tableData = [];
    let stt = 1;

    reportData?.workshops.forEach((workshop) => {
      workshop.departments.forEach((dept) => {
        tableData.push([
          stt++,
          dept.name,
          dept.maxPoints,
          dept.totalDeductions || "",
          `${dept.scorePercentage}%`,
          dept.knockoutTypes || "",
          "",
          "100%",
          "",
          `${dept.scorePercentage}%`,
          "",
        ]);
      });

      // Add workshop summary row
      tableData.push([
        "",
        workshop.name,
        "",
        "",
        `${workshop.averageScore}%`,
        "",
        "",
        "100%",
        "",
        `${workshop.averageScore}%`,
        "",
      ]);
    });

    // Add table to PDF
    doc.autoTable({
      head: [
        [
          { content: "STT", rowSpan: 2 },
          { content: "Tên bộ phận", rowSpan: 2 },
          { content: "Điểm tối đa", rowSpan: 2 },
          { content: "Đợt kiểm tra thứ nhất", colSpan: 3 },
          { content: "Đợt kiểm tra thứ hai", colSpan: 3 },
          { content: "THÁNG", colSpan: 2 },
        ],
        [
          "Tổng điểm trừ",
          "% Điểm đạt",
          "Hạng mục Điểm liệt",
          "Tổng điểm trừ",
          "% Điểm đạt",
          "Hạng mục Điểm liệt",
          "% Điểm đạt",
          "MAU SAO",
        ],
      ],
      body: tableData,
      styles: {
        cellPadding: 2,
        fontSize: 8,
        halign: "center",
        valign: "middle",
        font: "helvetica",
      },
      theme: "grid",
    });

    doc.save(`baocao-ksnb-${reportData?.phase?.report_month}.pdf`);
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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          CÔNG TY TNHH MAY VIỆT LONG HƯNG
        </Typography>
        <Typography variant="h6" gutterBottom>
          Ban Kiểm soát Hệ thống Tuần Thủ
        </Typography>
        <Typography variant="h5" fontWeight="bold">
          BẢNG TỔNG HỢP ĐIỂM KSNB CỦA CÁC BỘ PHẬN THÁNG{" "}
          {reportData?.phase?.report_month}
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
      <TableContainer
        component={Paper}
        sx={{ border: "1px solid rgba(224, 224, 224, 1)" }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#e0f7fa" }}>
              <TableCell align="center" rowSpan={2}>
                STT
              </TableCell>
              <TableCell align="center" rowSpan={2}>
                Tên bộ phận
              </TableCell>
              <TableCell align="center" rowSpan={2}>
                Điểm tối đa
              </TableCell>
              <TableCell align="center" colSpan={3}>
                Đợt kiểm tra thứ nhất
              </TableCell>
              <TableCell align="center" colSpan={3}>
                Đợt kiểm tra thứ hai
              </TableCell>
              <TableCell align="center" colSpan={2}>
                THÁNG
              </TableCell>
            </TableRow>
            <TableRow sx={{ backgroundColor: "#e0f7fa" }}>
              <TableCell align="center">Tổng điểm trừ</TableCell>
              <TableCell align="center">% Điểm đạt</TableCell>
              <TableCell align="center">Hạng mục Điểm liệt</TableCell>
              <TableCell align="center">Tổng điểm trừ</TableCell>
              <TableCell align="center">% Điểm đạt</TableCell>
              <TableCell align="center">Hạng mục Điểm liệt</TableCell>
              <TableCell align="center">% Điểm đạt</TableCell>
              <TableCell align="center">MAU SAO</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reportData?.workshops.map((workshop, wIndex) => (
              <React.Fragment key={workshop.id}>
                {workshop.departments.map((dept, dIndex) => (
                  <TableRow key={dept.id}>
                    <TableCell align="center">{dIndex + 1}</TableCell>
                    <TableCell>{dept.name}</TableCell>
                    <TableCell align="center">{dept.maxPoints}</TableCell>
                    <TableCell align="center">{dept.totalDeductions}</TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        backgroundColor:
                          dept.scorePercentage < 80 ? "#ffebee" : "inherit",
                      }}
                    >
                      {dept.scorePercentage}%
                    </TableCell>
                    <TableCell align="center">{dept.knockoutTypes}</TableCell>
                    <TableCell align="center"></TableCell>
                    <TableCell align="center">100%</TableCell>
                    <TableCell align="center"></TableCell>
                    <TableCell align="center">
                      {dept.scorePercentage}%
                    </TableCell>
                    <TableCell align="center"></TableCell>
                  </TableRow>
                ))}
                {/* Workshop Summary Row */}
                <TableRow sx={{ backgroundColor: "#fff3e0" }}>
                  <TableCell colSpan={4}>{workshop.name}</TableCell>
                  <TableCell align="center">{workshop.averageScore}%</TableCell>
                  <TableCell colSpan={3} align="center">
                    100%
                  </TableCell>
                  <TableCell colSpan={2} align="center">
                    {workshop.averageScore}%
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
