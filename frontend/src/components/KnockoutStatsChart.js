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
const KnockoutStatsChart = ({ reportData }) => {
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
    // Tổng số điểm liệt của tất cả department hoạt động
    let totalKnockouts = 0;
    // Map để theo dõi loại điểm liệt của workshop
    let knockoutsByDept = new Map();

    // Kiểm tra và đếm department hoạt động
    workshop.departments.forEach((dept) => {
      const isActive = dept.phases.some((phase, phaseIndex) => {
        return !reportData.phases[phaseIndex]?.inactiveDepartments?.includes(
          dept.id_department
        );
      });

      if (isActive) {
        activeDepartments++;
        knockoutsByDept.set(dept.id_department, []);

        dept.phases.forEach((phase, phaseIndex) => {
          const isPhaseActive = !reportData.phases[
            phaseIndex
          ]?.inactiveDepartments?.includes(dept.id_department);

          if (isPhaseActive && phase.knockoutTypes) {
            const knockoutList = phase.knockoutTypes
              .split(",")
              .map((type) => type.trim());
            knockoutList.forEach((type) => {
              totalKnockouts++;
              if (type.includes("An toàn lao động")) {
                stats["ATLĐ"].count++;
                knockoutsByDept.get(dept.id_department).push("ATLĐ");
              }
              if (type.includes("Phòng ngừa kim loại")) {
                stats["PNKL"].count++;
                knockoutsByDept.get(dept.id_department).push("PNKL");
              }
              if (type.includes("QMS")) {
                stats["QMS"].count++;
                knockoutsByDept.get(dept.id_department).push("QMS");
              }
              if (type.includes("Trật tự nội vụ")) {
                stats["TTNV"].count++;
                knockoutsByDept.get(dept.id_department).push("TTNV");
              }
            });
          }
        });
      }
    });

    // Tính phần trăm dựa trên số department hoạt động
    if (activeDepartments > 0) {
      Object.keys(stats).forEach((key) => {
        // Số department có điểm liệt loại này / tổng số department hoạt động * 100
        const deptsWithThisKnockout = Array.from(
          knockoutsByDept.values()
        ).filter((knockouts) => knockouts.includes(key)).length;
        stats[key].total = Math.round(
          (deptsWithThisKnockout / activeDepartments) * 100
        );
      });
    }

    // Thêm metadata
    const statsWithInfo = {
      ...stats,
      _meta: {
        totalKnockouts,
        activeDepartments,
        workshopName,
      },
    };

    // Lọc bỏ các loại không có điểm liệt
    return Object.fromEntries(
      Object.entries(statsWithInfo).filter(
        ([key, value]) => key === "_meta" || value.count > 0
      )
    );
  };

  // Tạo dữ liệu cho các xưởng
  const workshops = ["XƯỞNG 1", "XƯỞNG 2", "XƯỞNG 3", "XƯỞNG 4"];
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
            text: "Số lượng điểm liệt",
            color: "#000",
            font: { size: 12 },
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
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 2,
        }}
      >
        {workshopStats.map((workshop) => (
          <Card key={workshop.name}>
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
        ))}
      </Box>
    </Box>
  );
};

export default KnockoutStatsChart;