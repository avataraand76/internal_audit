// frontend/src/components/ScorePercentageChart.js
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Card, CardContent, Typography, Box } from "@mui/material";
import ChartDataLabels from "chartjs-plugin-datalabels";

// Đăng ký các components cần thiết
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

// Chart component được định nghĩa trước
const Chart = ({ title, data }) => {
  const chartData = {
    labels: data.map((item) => item.name),
    datasets: [
      {
        data: data.map((item) => item.percentage),
        backgroundColor: data.map((item) => item.color),
        borderColor: data.map((item) =>
          item.isTotal ? "#000" : "transparent"
        ),
        borderWidth: data.map((item) => (item.isTotal ? 2 : 0)),
        barThickness: 40,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          color: "#000",
        },
        title: {
          display: true,
          color: "#000",
          text: "Điểm đạt (%)",
          font: {
            size: 12,
          },
        },
      },
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 45,
          color: "#000",
          font: function (context) {
            const index = context.index;
            // Kiểm tra xem label có phải là "TỔNG XƯỞNG" không
            const isTotal = data[index]?.isTotal;
            return {
              size: isTotal ? 16 : 13,
              weight: isTotal ? "bold" : "normal",
            };
          },
          callback: function (value, index) {
            return this.getLabelForValue(value);
          },
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `Điểm đạt: ${context.parsed.y}%`;
          },
          title: function (context) {
            return `Bộ phận: ${context[0].label}`;
          },
        },
      },
      datalabels: {
        display: true,
        color: "#000",
        // Hiển thị label bên trên cột
        anchor: "end",
        align: "top",

        // Hiển thị label ở giữa cột
        // anchor: "center",
        // align: "center",

        offset: -25,
        font: {
          size: 15,
          weight: "bold",
        },
        formatter: function (value) {
          return value + "%";
        },
      },
    },
  };

  return (
    <Card sx={{ width: "100%", mt: 4 }}>
      <CardContent>
        <Typography
          variant="h6"
          component="div"
          align="center"
          color="#000"
          sx={{ fontWeight: "bold", mb: 2 }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            width: "100%",
            height: "400px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Bar data={chartData} options={options} />
        </Box>
      </CardContent>
    </Card>
  );
};

const WorkshopScoreChart = ({ reportData }) => {
  function calculateDepartmentAverage(dept) {
    const allPhasesInactive = dept.phases.every((phase, index) => {
      return reportData.phases[index]?.inactiveDepartments?.includes(
        dept.id_department
      );
    });

    if (allPhasesInactive) {
      return null;
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
  }

  const calculateWorkshopAverage = (departments) => {
    const activeDepartments = departments
      .map(calculateDepartmentAverage)
      .filter((avg) => avg !== null);

    if (activeDepartments.length === 0) return null;

    const sum = activeDepartments.reduce((acc, avg) => acc + avg, 0);
    return Math.round(sum / activeDepartments.length);
  };

  const isLatestPhaseGreen = (dept) => {
    for (let i = dept.phases.length - 1; i >= 0; i--) {
      const phase = dept.phases[i];
      const isPhaseInactive = reportData.phases[
        i
      ]?.inactiveDepartments?.includes(dept.id_department);

      if (!isPhaseInactive && phase) {
        return !(
          phase.knockoutTypes ||
          phase.has_knockout ||
          phase.scorePercentage < 80
        );
      }
    }
    return false;
  };

  const getWorkshopType = (workshop) => {
    if (/^XƯỞNG\s+[1-4]$/i.test(workshop.workshopName.trim())) {
      return "main";
    }
    // Kiểm tra xem workshop có chứa department nào thuộc nhóm support không
    const hasSupportDepartment = workshop.departments.some((dept) =>
      /(XƯỞNG CẮT|KHO THÀNH PHẨM|KHO NGUYÊN PHỤ LIỆU)/i.test(
        dept.name_department.trim()
      )
    );

    if (hasSupportDepartment) {
      return "support";
    }

    return "office";
  };

  const groupedData = reportData.workshops.reduce(
    (acc, workshop) => {
      const type = getWorkshopType(workshop);

      if (type === "main") {
        // Với xưởng chính, giữ nguyên cấu trúc
        if (!acc.main) acc.main = [];
        acc.main.push(workshop);
      } else if (type === "support") {
        // Với nhóm support, chỉ lấy các department phù hợp
        if (!acc.support) acc.support = [];
        const supportDepts = workshop.departments.filter((dept) =>
          /(XƯỞNG CẮT|KHO THÀNH PHẨM|KHO NGUYÊN PHỤ LIỆU)/i.test(
            dept.name_department.trim()
          )
        );
        if (supportDepts.length > 0) {
          acc.support.push({
            ...workshop,
            departments: supportDepts,
          });
        }
      } else {
        // Với office, lấy các department còn lại
        if (!acc.office) acc.office = [];
        const officeDepts = workshop.departments.filter(
          (dept) =>
            !/(XƯỞNG CẮT|KHO THÀNH PHẨM|KHO NGUYÊN PHỤ LIỆU)/i.test(
              dept.name_department.trim()
            ) && !/^XƯỞNG\s+[1-4]$/i.test(workshop.workshopName.trim())
        );
        if (officeDepts.length > 0) {
          acc.office.push({
            ...workshop,
            departments: officeDepts,
          });
        }
      }
      return acc;
    },
    { main: [], support: [], office: [] }
  );

  const createChartData = (workshops) => {
    let allData = [];
    workshops.forEach((workshop) => {
      const activeDepartments = workshop.departments.filter((dept) => {
        const average = calculateDepartmentAverage(dept);
        return average !== null;
      });

      activeDepartments.forEach((dept) => {
        const average = calculateDepartmentAverage(dept);
        const isGreen = average >= 80 && isLatestPhaseGreen(dept);
        allData.push({
          name: dept.name_department,
          percentage: average,
          color: isGreen ? "#009900" : "#FF0000",
        });
      });

      // Thêm cột tổng chỉ cho xưởng chính (1-4)
      if (/^XƯỞNG\s+[1-4]$/i.test(workshop.workshopName.trim())) {
        const workshopAverage = calculateWorkshopAverage(workshop.departments);
        if (workshopAverage !== null) {
          allData.push({
            name: `TỔNG ${workshop.workshopName}`,
            percentage: workshopAverage,
            color: "#FFD700",
            isTotal: true,
            textColor: "#000000",
          });
        }
      }
    });
    return allData;
  };

  // Tạo các biểu đồ riêng cho xưởng chính
  const mainWorkshopCharts = groupedData.main.map((workshop) => (
    <Chart
      key={workshop.workshopName}
      title={`% ĐIỂM ĐẠT - MÀU SAO ${workshop.workshopName}`}
      data={createChartData([workshop])}
    />
  ));

  // Biểu đồ cho nhóm hỗ trợ
  const supportWorkshopChart =
    groupedData.support.length > 0 ? (
      <Chart
        title="% ĐIỂM ĐẠT - MÀU SAO XƯỞNG CẮT, KHO TP, KHO NPL"
        data={createChartData(groupedData.support)}
      />
    ) : null;

  // Biểu đồ cho nhóm phòng ban
  const officeWorkshopChart =
    groupedData.office.length > 0 ? (
      <Chart
        title="% ĐIỂM ĐẠT - MÀU SAO PHÒNG BAN"
        data={createChartData(groupedData.office)}
      />
    ) : null;

  return (
    <Box sx={{ width: "100%" }}>
      <Typography
        variant="h5"
        align="center"
        sx={{ fontWeight: "bold", mb: 2, mt: 4 }}
      >
        THỐNG KÊ % ĐIỂM ĐẠT - MÀU SAO
      </Typography>
      {mainWorkshopCharts}
      {supportWorkshopChart}
      {officeWorkshopChart}
    </Box>
  );
};

export default WorkshopScoreChart;
