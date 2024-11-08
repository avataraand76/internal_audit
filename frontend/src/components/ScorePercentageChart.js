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
  let chartId = "score-chart-";
  if (title.includes("XƯỞNG")) {
    if (title.includes("CẮT") || title.includes("KHO")) {
      // For support section (Xưởng cắt and Kho)
      chartId += "support";
    } else {
      // For main workshops
      const num = title.match(/\d+/);
      if (num) {
        chartId += `xuong${num[0]}`;
      }
    }
  } else if (title.includes("SIGP")) {
    // For SIGP chart
    chartId += "sigp";
  } else {
    // For office section
    chartId += "phongban";
  }

  console.log("Chart title:", title); // Debug log
  console.log("Chart ID:", chartId); // Debug log

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
          callback: (value) => `${value}%`,
        },
        title: {
          display: true,
          color: "#000",
          text: "Điểm đạt (%)",
          font: {
            size: 12,
            weight: "bold",
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
        align: "end",

        // Hiển thị label ở giữa cột
        // anchor: "center",
        // align: "center",

        offset: -6,
        font: {
          size: 13,
          weight: "bold",
        },
        formatter: function (value) {
          return value + "%";
        },
      },
    },
  };

  return (
    <Card sx={{ width: "100%", mt: 4 }} data-chart-id={chartId}>
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

  const isOfficeType = (deptName) => {
    // Danh sách các phòng ban (để dễ bảo trì và kiểm tra)
    const officeDepartments = [
      "PHÒNG NHÂN SỰ",
      "PHÒNG HÀNH CHÍNH QUẢN TRỊ",
      "BẢO VỆ",
      "NHÀ ĂN",
      "PHÒNG KẾ TOÁN",
      "PHÒNG KẾ HOẠCH",
      "PHÒNG KỸ THUẬT",
      "MAY MẪU",
      "PHÒNG QA",
      "PHÒNG CN-LEAN",
      "BỘ PHẬN CƠ ĐIỆN",
    ];

    return officeDepartments.some((dept) =>
      deptName.trim().toUpperCase().includes(dept)
    );
  };

  const getWorkshopType = (workshop) => {
    // Kiểm tra xem workshop có chứa cả departments support và office không
    const hasSupportAndOffice =
      workshop.departments.some((dept) =>
        /(XƯỞNG CẮT|KHO THÀNH PHẨM|KHO NGUYÊN PHỤ LIỆU)/i.test(
          dept.name_department.trim()
        )
      ) &&
      workshop.departments.some((dept) =>
        /PHÒNG KẾ HOẠCH/i.test(dept.name_department.trim())
      );

    if (workshop.workshopName === "SIGP") {
      return "sigp";
    }
    if (/^XƯỞNG\s+[1-4]$/i.test(workshop.workshopName.trim())) {
      return "main";
    }

    // Nếu workshop chứa cả hai loại, clone nó cho cả hai nhóm
    if (hasSupportAndOffice) {
      return "mixed";
    }

    // Các kiểm tra còn lại như cũ
    const hasSupportDepartment = workshop.departments.some((dept) =>
      /(XƯỞNG CẮT|KHO THÀNH PHẨM|KHO NGUYÊN PHỤ LIỆU)/i.test(
        dept.name_department.trim()
      )
    );

    if (hasSupportDepartment) {
      return "support";
    }

    const hasOfficeDepartment = workshop.departments.some((dept) =>
      isOfficeType(dept.name_department)
    );

    if (hasOfficeDepartment) {
      return "office";
    }

    return "";
  };

  // Kiểm tra xem dữ liệu hiện tại có phải chỉ chứa SIGP không
  const isSIGPOnly = reportData.workshops.every(
    (w) => w.workshopName === "SIGP"
  );

  const groupedData = reportData.workshops.reduce(
    (acc, workshop) => {
      const type = getWorkshopType(workshop);

      switch (type) {
        case "sigp":
          if (isSIGPOnly) {
            if (!acc.sigp) acc.sigp = [];
            acc.sigp.push(workshop);
          }
          break;
        case "main":
          if (!isSIGPOnly) {
            if (!acc.main) acc.main = [];
            acc.main.push(workshop);
          }
          break;
        case "mixed":
          // Thêm vào cả support và office với các departments được lọc tương ứng
          if (!isSIGPOnly) {
            if (!acc.support) acc.support = [];
            acc.support.push({
              ...workshop,
              departments: workshop.departments.filter((dept) =>
                /(XƯỞNG CẮT|KHO THÀNH PHẨM|KHO NGUYÊN PHỤ LIỆU)/i.test(
                  dept.name_department.trim()
                )
              ),
            });

            if (!acc.office) acc.office = [];
            acc.office.push({
              ...workshop,
              departments: workshop.departments.filter((dept) =>
                isOfficeType(dept.name_department)
              ),
            });
          }
          break;
        case "support":
          if (!isSIGPOnly) {
            if (!acc.support) acc.support = [];
            acc.support.push({
              ...workshop,
              departments: workshop.departments.filter((dept) =>
                /(XƯỞNG CẮT|KHO THÀNH PHẨM|KHO NGUYÊN PHỤ LIỆU)/i.test(
                  dept.name_department.trim()
                )
              ),
            });
          }
          break;
        case "office":
          if (!isSIGPOnly) {
            if (!acc.office) acc.office = [];
            acc.office.push({
              ...workshop,
              departments: workshop.departments.filter((dept) =>
                isOfficeType(dept.name_department)
              ),
            });
          }
          break;
        default:
          break;
      }
      return acc;
    },
    { main: [], support: [], office: [], sigp: [] }
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
  const mainWorkshopCharts =
    !isSIGPOnly &&
    groupedData.main.map((workshop) => (
      <Chart
        key={workshop.workshopName}
        title={`% ĐIỂM ĐẠT - MÀU SAO ${workshop.workshopName}`}
        data={createChartData([workshop])}
      />
    ));

  // Biểu đồ cho nhóm hỗ trợ
  const supportWorkshopChart =
    !isSIGPOnly && groupedData.support.length > 0 ? (
      <Chart
        title="% ĐIỂM ĐẠT - MÀU SAO XƯỞNG CẮT, KHO TP, KHO NPL"
        data={createChartData(groupedData.support)}
      />
    ) : null;

  // Biểu đồ cho nhóm phòng ban
  const officeWorkshopChart =
    !isSIGPOnly && groupedData.office.length > 0 ? (
      <Chart
        title="% ĐIỂM ĐẠT - MÀU SAO PHÒNG BAN"
        data={createChartData(groupedData.office)}
      />
    ) : null;

  // Biểu đồ SIGP
  const sigpWorkshopChart =
    isSIGPOnly && groupedData.sigp.length > 0 ? (
      <Chart
        title="% ĐIỂM ĐẠT - MÀU SAO SIGP"
        data={createChartData(groupedData.sigp)}
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
      {isSIGPOnly ? (
        // Khi ở chế độ SIGP, chỉ hiện biểu đồ SIGP
        sigpWorkshopChart
      ) : (
        // Khi không ở chế độ SIGP, hiện các biểu đồ khác
        <>
          {mainWorkshopCharts}
          {supportWorkshopChart}
          {officeWorkshopChart}
        </>
      )}
    </Box>
  );
};

export default WorkshopScoreChart;
