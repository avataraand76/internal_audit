// frontend/src/components/WorkshopStatistics.js
import React from "react";
import { Paper, Typography, Box } from "@mui/material";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const WorkshopStatistics = ({ reportData }) => {
  // Kiểm tra xem đang ở chế độ SIGP
  const isSIGPOnly = reportData.workshops.every(
    (w) => w.workshopName === "SIGP"
  );

  // Điều chỉnh danh sách workshops dựa trên chế độ
  const workshops = isSIGPOnly
    ? ["SIGP"]
    : ["XƯỞNG 1", "XƯỞNG 2", "XƯỞNG 3", "XƯỞNG 4"];
  // Calculate total active departments and green star departments
  const calculateTotalStats = () => {
    let totalActiveDepts = 0;
    let totalGreenStarDepts = 0;

    workshops.forEach((workshopName) => {
      const workshop = reportData.workshops.find(
        (w) => w.workshopName.trim() === workshopName
      );
      if (!workshop) return;

      workshop.departments.forEach((dept) => {
        // Kiểm tra xem bộ phận có hoạt động không
        const isActive = dept.phases.some((phase, phaseIndex) => {
          return !reportData.phases[phaseIndex]?.inactiveDepartments?.includes(
            dept.id_department
          );
        });

        if (isActive) {
          totalActiveDepts++;

          // Đếm số đợt đạt màu xanh (điểm >= 80% và không có điểm liệt)
          const greenPhaseCount = dept.phases.filter((phase, index) => {
            const isPhaseActive = !reportData.phases[
              index
            ]?.inactiveDepartments?.includes(dept.id_department);
            return (
              isPhaseActive &&
              !phase.knockoutTypes &&
              !phase.has_knockout &&
              phase.scorePercentage >= 80
            );
          }).length;

          // Tính điểm trung bình của các đợt hoạt động
          const activePhases = dept.phases.filter((phase, index) => {
            return !reportData.phases[index]?.inactiveDepartments?.includes(
              dept.id_department
            );
          });

          if (activePhases.length > 0) {
            const avgScore = Math.round(
              activePhases.reduce((acc, phase) => {
                return acc + (phase.scorePercentage || 0);
              }, 0) / activePhases.length
            );

            // Bộ phận đạt sao xanh khi:
            // 1. Có ít nhất 3 đợt đạt màu xanh
            // 2. Điểm trung bình >= 80%
            if (greenPhaseCount >= 3 && avgScore >= 80) {
              totalGreenStarDepts++;
            }
          }
        }
      });
    });

    return {
      totalActiveDepts,
      totalGreenStarDepts,
      percentage: Math.round((totalGreenStarDepts / totalActiveDepts) * 100),
    };
  };

  // Calculate green star departments with inactive check
  const calculateGreenStarDepts = () => {
    let greenStarDepts = [];

    workshops.forEach((workshopName) => {
      const workshop = reportData.workshops.find(
        (w) => w.workshopName.trim() === workshopName
      );
      if (!workshop) return;

      workshop.departments.forEach((dept) => {
        // Kiểm tra xem bộ phận có hoạt động không
        const isActive = dept.phases.some((phase, phaseIndex) => {
          return !reportData.phases[phaseIndex]?.inactiveDepartments?.includes(
            dept.id_department
          );
        });

        if (isActive) {
          // Đếm số đợt đạt màu xanh (điểm >= 80% và không có điểm liệt)
          const greenPhaseCount = dept.phases.filter((phase, index) => {
            const isPhaseActive = !reportData.phases[
              index
            ]?.inactiveDepartments?.includes(dept.id_department);
            return (
              isPhaseActive &&
              !phase.knockoutTypes &&
              !phase.has_knockout &&
              phase.scorePercentage >= 80
            );
          }).length;

          // Tính điểm trung bình của các đợt hoạt động
          const activePhases = dept.phases.filter((phase, index) => {
            return !reportData.phases[index]?.inactiveDepartments?.includes(
              dept.id_department
            );
          });

          if (activePhases.length > 0) {
            const avgScore = Math.round(
              activePhases.reduce((acc, phase) => {
                return acc + (phase.scorePercentage || 0);
              }, 0) / activePhases.length
            );

            // Bộ phận đạt sao xanh khi:
            // 1. Có ít nhất 3 đợt đạt màu xanh
            // 2. Điểm trung bình >= 80%
            if (greenPhaseCount >= 3 && avgScore >= 80) {
              greenStarDepts.push({
                workshopName: workshopName,
                deptName: dept.name_department,
                score: avgScore,
                greenPhases: greenPhaseCount,
              });
            }
          }
        }
      });
    });

    return greenStarDepts;
  };

  // Calculate error statistics with inactive check
  const calculateAverageErrorStats = () => {
    const workshopErrors = workshops
      .map((workshopName) => {
        const workshop = reportData.workshops.find(
          (w) => w.workshopName.trim() === workshopName
        );
        if (!workshop) return null;

        let activeDepartments = 0;
        let knockoutsByDept = new Map();

        const errorCounts = {
          ATLĐ: { deptCount: 0 },
          PNKL: { deptCount: 0 },
          QMS: { deptCount: 0 },
          TTNV: { deptCount: 0 },
        };

        // Collect all departments that are active
        workshop.departments.forEach((dept) => {
          const isActive = dept.phases.some((phase, phaseIndex) => {
            return !reportData.phases[
              phaseIndex
            ]?.inactiveDepartments?.includes(dept.id_department);
          });

          if (isActive) {
            activeDepartments++;
            const deptKnockouts = new Set();

            dept.phases.forEach((phase, phaseIndex) => {
              const isPhaseActive = !reportData.phases[
                phaseIndex
              ]?.inactiveDepartments?.includes(dept.id_department);

              if (isPhaseActive && phase.knockoutTypes) {
                const knockouts = phase.knockoutTypes
                  .split(",")
                  .map((k) => k.trim());

                knockouts.forEach((knockout) => {
                  if (knockout.includes("An toàn lao động")) {
                    deptKnockouts.add("ATLĐ");
                  }
                  if (knockout.includes("Phòng ngừa kim loại")) {
                    deptKnockouts.add("PNKL");
                  }
                  if (knockout.includes("QMS")) {
                    deptKnockouts.add("QMS");
                  }
                  if (knockout.includes("Trật tự nội vụ")) {
                    deptKnockouts.add("TTNV");
                  }
                });
              }
            });

            knockoutsByDept.set(dept.id_department, deptKnockouts);
          }
        });

        // Count departments with knockouts
        for (const knockouts of knockoutsByDept.values()) {
          if (knockouts.has("ATLĐ")) errorCounts.ATLĐ.deptCount++;
          if (knockouts.has("PNKL")) errorCounts.PNKL.deptCount++;
          if (knockouts.has("QMS")) errorCounts.QMS.deptCount++;
          if (knockouts.has("TTNV")) errorCounts.TTNV.deptCount++;
        }

        return {
          counts: errorCounts,
          activeDepartments,
        };
      })
      .filter(Boolean);

    const totalCounts = {
      ATLĐ: 0,
      PNKL: 0,
      QMS: 0,
      TTNV: 0,
    };

    let totalActiveDepartments = 0;

    // Sum up all counts and active departments
    workshopErrors.forEach((workshop) => {
      Object.keys(totalCounts).forEach((key) => {
        totalCounts[key] += workshop.counts[key].deptCount;
      });
      totalActiveDepartments += workshop.activeDepartments;
    });

    // Calculate percentages based on total counts divided by total active departments
    const averages = {
      ATLĐ: 0,
      PNKL: 0,
      QMS: 0,
      TTNV: 0,
    };

    Object.keys(averages).forEach((key) => {
      averages[key] = Math.round(
        (totalCounts[key] / totalActiveDepartments) * 100
      );
    });

    return {
      averages,
      totalCounts,
      totalActiveDepartments,
    };
  };

  const greenStarDepts = calculateGreenStarDepts();
  const totalStats = calculateTotalStats();
  const errorStats = calculateAverageErrorStats();

  // Configuration for Green Star chart
  const greenStarChartData = {
    labels: [
      ...greenStarDepts.map((d) => `${d.deptName} (${d.workshopName})`),
      "TỔNG TỶ LỆ % ĐẠT SAO XANH",
    ],
    datasets: [
      {
        label: "Điểm đạt được",
        data: [...greenStarDepts.map((d) => d.score), totalStats.percentage],
        backgroundColor: (context) => {
          // Use a different color for the total column
          return context.index === greenStarDepts.length
            ? "#FFA000"
            : "#4CAF50";
        },
        borderColor: (context) => {
          return context.index === greenStarDepts.length
            ? "#F57C00"
            : "#388E3C";
        },
        borderWidth: 1,
        barThickness: 40,
      },
    ],
  };

  // Configuration for Average Error Statistics chart
  const errorChartData = {
    labels: [
      "An toàn lao động",
      "Phòng ngừa kim loại",
      "QMS",
      "Trật tự nội vụ",
    ],
    datasets: [
      {
        data: [
          errorStats.averages.ATLĐ,
          errorStats.averages.PNKL,
          errorStats.averages.QMS,
          errorStats.averages.TTNV,
        ],
        backgroundColor: ["#42A5F5", "#ffc000", "#FF5722", "#4CAF50"],
        borderColor: ["#1976D2", "#FFA000", "#E64A19", "#388E3C"],
        borderWidth: 1,
        barThickness: 60,
      },
    ],
  };

  // Options for Green Star chart
  const greenStarOptions = {
    indexAxis: "x",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            if (context.dataIndex === greenStarDepts.length) {
              return [
                `Tổng tỷ lệ: ${context.parsed.y}%`,
                `Số bộ phận đạt: ${totalStats.totalGreenStarDepts}`,
                `Tổng số bộ phận: ${totalStats.totalActiveDepts}`,
              ];
            }
            return `Điểm đạt: ${context.parsed.y}%`;
          },
        },
      },
      datalabels: {
        display: true,
        color: "#000",
        anchor: "end",
        align: "end",
        offset: -6,
        font: {
          size: 13,
          weight: "bold",
        },
        formatter: (value, context) => {
          if (context.dataIndex === greenStarDepts.length) {
            return `${value}% (${totalStats.totalGreenStarDepts}/${totalStats.totalActiveDepts})`;
          }
          return `${value}%`;
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          callback: (value) => `${value}%`,
        },
        title: {
          display: true,
          text: "Điểm đạt (%)",
          font: {
            weight: "bold",
          },
        },
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 12,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  // Options for Error Statistics chart
  const errorOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const labels = [];
            const typeMap = {
              0: "ATLĐ",
              1: "PNKL",
              2: "QMS",
              3: "TTNV",
            };
            const type = typeMap[context.dataIndex];
            labels.push(`Tỷ lệ: ${context.parsed.y}%`);
            labels.push(
              `Số bộ phận không đạt: ${errorStats.totalCounts[type]}`
            );
            labels.push(
              `Tổng số bộ phận hoạt động: ${errorStats.totalActiveDepartments}`
            );
            return labels;
          },
        },
      },
      datalabels: {
        display: true,
        color: "#000",
        anchor: "end",
        align: "end",
        offset: -6,
        font: {
          size: 13,
          weight: "bold",
        },
        formatter: (value, context) => {
          const typeMap = {
            0: "ATLĐ",
            1: "PNKL",
            2: "QMS",
            3: "TTNV",
          };
          const type = typeMap[context.dataIndex];
          return `${value}% (${errorStats.totalCounts[type]}/${errorStats.totalActiveDepartments})`;
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          callback: (value) => `${value}%`,
        },
        title: {
          display: true,
          text: "Tỷ lệ (%)",
          font: {
            weight: "bold",
          },
        },
      },
      x: {
        ticks: {
          font: {
            weight: "bold",
          },
        },
      },
    },
  };

  return (
    <Box sx={{ width: "100%", mt: 4, mb: 4 }}>
      <Typography
        variant="h5"
        align="center"
        sx={{ fontWeight: "bold", mb: 2, mt: 4 }}
      >
        {isSIGPOnly
          ? "THỐNG KÊ SAO XANH VÀ % ĐIỂM LIỆT CÁC BỘ PHẬN SIGP"
          : "THỐNG KÊ SAO XANH VÀ % ĐIỂM LIỆT CÁC BỘ PHẬN / 4 XƯỞNG"}
      </Typography>

      {/* Green Star Statistics */}
      <Paper
        elevation={3}
        sx={{ p: 3, mb: 4 }}
        data-chart-id="green-star-chart"
      >
        <Typography
          variant="h5"
          align="center"
          sx={{
            fontWeight: "bold",
            mb: 3,
          }}
        >
          {isSIGPOnly
            ? "BỘ PHẬN ĐẠT SAO XANH SIGP"
            : "BỘ PHẬN ĐẠT SAO XANH / 4 XƯỞNG"}
        </Typography>
        <Box
          sx={{
            height: "500px",
            maxHeight: "500px",
            position: "relative",
            overflowX: "auto",
            overflowY: "hidden",
          }}
        >
          <Box
            sx={{
              height: "100%",
              minWidth: `${Math.max((greenStarDepts.length + 1) * 80, 100)}px`,
              position: "relative",
            }}
          >
            <Bar data={greenStarChartData} options={greenStarOptions} />
          </Box>
        </Box>
      </Paper>

      {/* Average Error Statistics */}
      <Paper elevation={3} sx={{ p: 3 }} data-chart-id="error-stats-chart">
        <Typography
          variant="h5"
          align="center"
          sx={{
            fontWeight: "bold",
            mb: 3,
          }}
        >
          {isSIGPOnly
            ? "% HẠNG MỤC ĐIỂM LIỆT CÁC BỘ PHẬN SIGP"
            : "% HẠNG MỤC ĐIỂM LIỆT CÁC BỘ PHẬN / 4 XƯỞNG"}
        </Typography>
        <Box sx={{ height: 400 }}>
          <Bar data={errorChartData} options={errorOptions} />
        </Box>
      </Paper>
    </Box>
  );
};

export default WorkshopStatistics;
