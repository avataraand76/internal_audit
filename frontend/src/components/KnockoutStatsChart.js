// frontend/src/components/KnockoutStatsChart.js
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Card, CardContent, Typography, Box } from "@mui/material";
import ChartDataLabels from "chartjs-plugin-datalabels";

// Đăng ký các components cần thiết
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

// Chart component cho thống kê điểm liệt
const KnockoutStatsChart = ({ reportData, selectedPhaseOption }) => {
  // Hàm để tính tổng số điểm liệt theo danh mục cho một xưởng
  const calculateKnockoutStats = (workshopName) => {
    const workshop = reportData.workshops.find(
      (w) => w.workshopName.trim() === workshopName
    );
    if (!workshop) return null;

    const stats = {
      ATLĐ: { count: 0, total: 0 },
      PNKL: { count: 0, total: 0 },
      QMS: { count: 0, total: 0 },
      TTNV: { count: 0, total: 0 },
    };

    // Đếm số department hoạt động
    let activeDepartments = 0;
    // Map để theo dõi loại điểm liệt của mỗi department
    let knockoutsByDept = new Map();

    workshop.departments.forEach((dept) => {
      if (selectedPhaseOption === "month") {
        // Logic hiện tại cho toàn bộ tháng
        const isActive = dept.phases.some((phase, phaseIndex) => {
          return !reportData.phases[phaseIndex]?.inactiveDepartments?.includes(
            dept.id_department
          );
        });

        if (isActive) {
          activeDepartments++;
          // Sử dụng Set để lưu unique knockout types cho mỗi department
          const deptKnockouts = new Set();

          dept.phases.forEach((phase, phaseIndex) => {
            const isPhaseActive = !reportData.phases[
              phaseIndex
            ]?.inactiveDepartments?.includes(dept.id_department);

            if (isPhaseActive && phase.knockoutTypes) {
              const knockoutList = phase.knockoutTypes
                .split(",")
                .map((type) => type.trim());

              knockoutList.forEach((type) => {
                if (type.includes("An toàn lao động"))
                  deptKnockouts.add("ATLĐ");
                if (type.includes("Phòng ngừa kim loại"))
                  deptKnockouts.add("PNKL");
                if (type.includes("QMS")) deptKnockouts.add("QMS");
                if (type.includes("Trật tự nội vụ")) deptKnockouts.add("TTNV");
              });
            }
          });

          // Lưu các loại knockout unique của department
          knockoutsByDept.set(dept.id_department, Array.from(deptKnockouts));
          deptKnockouts.forEach((type) => {
            stats[type].count++;
          });
        }
      } else {
        // Logic cho phase cụ thể
        const phaseId = parseInt(selectedPhaseOption.split("-")[1]);
        const phaseIndex = dept.phases.findIndex(
          (p, index) => reportData.phases[index].id_phase === phaseId
        );

        if (phaseIndex !== -1) {
          const phase = dept.phases[phaseIndex];
          const isPhaseActive = !reportData.phases[
            phaseIndex
          ]?.inactiveDepartments?.includes(dept.id_department);

          if (isPhaseActive) {
            activeDepartments++;
            const deptKnockouts = new Set();

            if (phase.knockoutTypes) {
              const knockoutList = phase.knockoutTypes
                .split(",")
                .map((type) => type.trim());

              knockoutList.forEach((type) => {
                if (type.includes("An toàn lao động"))
                  deptKnockouts.add("ATLĐ");
                if (type.includes("Phòng ngừa kim loại"))
                  deptKnockouts.add("PNKL");
                if (type.includes("QMS")) deptKnockouts.add("QMS");
                if (type.includes("Trật tự nội vụ")) deptKnockouts.add("TTNV");
              });

              knockoutsByDept.set(
                dept.id_department,
                Array.from(deptKnockouts)
              );
              deptKnockouts.forEach((type) => {
                stats[type].count++;
              });
            }
          }
        }
      }
    });

    // Tính tỷ lệ phần trăm dựa trên số department hoạt động
    if (activeDepartments > 0) {
      Object.keys(stats).forEach((key) => {
        const deptsWithThisKnockout = Array.from(
          knockoutsByDept.values()
        ).filter((knockouts) => knockouts.includes(key)).length;
        stats[key].total = Math.round(
          (deptsWithThisKnockout / activeDepartments) * 100
        );
      });
    }

    return {
      ...stats,
      _meta: {
        activeDepartments,
        workshopName,
      },
    };
  };

  // Kiểm tra nếu đang ở chế độ chỉ hiện SIGP
  const isSIGPOnly = reportData.workshops.every(
    (w) => w.workshopName === "SIGP"
  );

  // Tạo dữ liệu cho các xưởng
  const workshops = isSIGPOnly
    ? ["SIGP"]
    : ["XƯỞNG 1", "XƯỞNG 2", "XƯỞNG 3", "XƯỞNG 4"];

  // Thêm ID chart cho SIGP
  const getChartId = (workshop) => {
    if (workshop === "SIGP") return "knockout-chart-sigp";
    const num = workshop.match(/\d+/)?.[0];
    return num ? `knockout-chart-xuong${num}` : workshop.toLowerCase();
  };

  const workshopStats = workshops
    .map((name) => ({
      name,
      stats: calculateKnockoutStats(name),
    }))
    .filter((w) => w.stats !== null);

  // Cấu hình cho từng biểu đồ riêng biệt
  const createChartConfig = (workshop) => {
    const stats = workshop.stats;
    // Lọc bỏ các labels không xác định và _meta
    const labels = Object.keys(stats).filter(
      (key) => key !== "_meta" && stats[key] !== undefined
    );
    const data = labels.map((key) => stats[key].count);

    // Map hiển thị tên đầy đủ
    const labelMap = {
      ATLĐ: "An toàn lao động",
      PNKL: "Phòng ngừa kim loại",
      QMS: "QMS",
      TTNV: "Trật tự nội vụ",
    };

    const backgroundColors = {
      ATLĐ: "#42A5F5",
      PNKL: "#ffc000",
      QMS: "#FF5722",
      TTNV: "#4CAF50",
    };

    const chartData = {
      // Chỉ hiển thị các labels đã được lọc và map với tên đầy đủ
      labels: labels.filter(Boolean).map((label) => labelMap[label] || label),
      datasets: [
        {
          data,
          backgroundColor: labels.map((label) => backgroundColors[label]),
          borderWidth: 1,
          barThickness: 40,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: "#000",
          },
          title: {
            display: true,
            text: "Số lượng bộ phận bị điểm liệt",
            color: "#000",
            font: { size: 14 },
          },
        },
        y: {
          ticks: {
            color: "#000",
            font: {
              size: 13,
              weight: "bold",
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          position: "nearest",
          mode: "index",
          callbacks: {
            label: (context) => {
              const dataIndex = context.dataIndex;
              const key = labels[dataIndex];
              const value = stats[key].count;
              const percentage = stats[key].total;
              const activeDepts = stats._meta?.activeDepartments || 0;
              return [
                `Số lượng: ${value}`,
                `Tỷ lệ: ${percentage}%`,
                `Trên tổng số: ${activeDepts} bộ phận đang hoạt động`,
              ];
            },
          },
        },
        datalabels: {
          display: true,
          color: "#000",
          anchor: "center",
          align: "center",
          offset: 0,
          font: {
            size: 13,
            weight: "bold",
          },
          formatter: (value, context) => {
            if (value === 0) return "";

            const dataIndex = context.dataIndex;
            const key = labels[dataIndex];
            const percentage = stats[key]?.total;
            return percentage !== undefined
              ? `${value} (${percentage}%)`
              : value;
          },
        },
      },
    };

    return { data: chartData, options };
  };

  return (
    <Box sx={{ width: "100%", mt: 1 }}>
      <Typography
        variant="h5"
        align="center"
        sx={{ fontWeight: "bold", mb: 2, mt: 4 }}
      >
        THỐNG KÊ ĐIỂM LIỆT THEO HẠNG MỤC
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: isSIGPOnly ? "1fr" : "repeat(2, 1fr)",
          gap: 2,
        }}
      >
        {workshopStats.map((workshop) => {
          const chartId = getChartId(workshop.name);

          return (
            <Card key={workshop.name} data-chart-id={chartId}>
              <CardContent>
                <Typography
                  variant="h6"
                  component="div"
                  align="center"
                  color="#000"
                  sx={{ fontWeight: "bold", mb: 2 }}
                >
                  HẠNG MỤC ĐIỂM LIỆT {workshop.name}
                </Typography>
                <Box sx={{ height: "400px" }}>
                  <Bar
                    data={createChartConfig(workshop).data}
                    options={createChartConfig(workshop).options}
                  />
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};

export default KnockoutStatsChart;
