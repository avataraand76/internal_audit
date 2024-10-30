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
  const workshops = ["XƯỞNG 1", "XƯỞNG 2", "XƯỞNG 3", "XƯỞNG 4"];

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
        const isActive = dept.phases.some((phase, phaseIndex) => {
          return !reportData.phases[phaseIndex]?.inactiveDepartments?.includes(
            dept.id_department
          );
        });

        if (isActive) {
          totalActiveDepts++;
          const latestPhase = dept.phases[dept.phases.length - 1];
          const isLatestPhaseActive = !reportData.phases[
            dept.phases.length - 1
          ]?.inactiveDepartments?.includes(dept.id_department);

          if (
            isLatestPhaseActive &&
            latestPhase &&
            !latestPhase.knockoutTypes &&
            latestPhase.scorePercentage >= 80
          ) {
            totalGreenStarDepts++;
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
        const isActive = dept.phases.some((phase, phaseIndex) => {
          return !reportData.phases[phaseIndex]?.inactiveDepartments?.includes(
            dept.id_department
          );
        });

        if (isActive) {
          const latestPhase = dept.phases[dept.phases.length - 1];
          const isLatestPhaseActive = !reportData.phases[
            dept.phases.length - 1
          ]?.inactiveDepartments?.includes(dept.id_department);

          if (
            isLatestPhaseActive &&
            latestPhase &&
            !latestPhase.knockoutTypes &&
            latestPhase.scorePercentage >= 80
          ) {
            greenStarDepts.push({
              workshopName: workshopName,
              deptName: dept.name_department,
              score: latestPhase.scorePercentage,
            });
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
          ATLĐ: { count: 0, deptCount: 0 },
          PNKL: { count: 0, deptCount: 0 },
          QMS: { count: 0, deptCount: 0 },
          TTNV: { count: 0, deptCount: 0 },
        };

        workshop.departments.forEach((dept) => {
          const isActive = dept.phases.some((phase, phaseIndex) => {
            return !reportData.phases[
              phaseIndex
            ]?.inactiveDepartments?.includes(dept.id_department);
          });

          if (isActive) {
            activeDepartments++;
            knockoutsByDept.set(dept.id_department, new Set());

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
                    knockoutsByDept.get(dept.id_department).add("ATLĐ");
                  }
                  if (knockout.includes("Phòng ngừa kim loại")) {
                    knockoutsByDept.get(dept.id_department).add("PNKL");
                  }
                  if (knockout.includes("QMS")) {
                    knockoutsByDept.get(dept.id_department).add("QMS");
                  }
                  if (knockout.includes("Trật tự nội vụ")) {
                    knockoutsByDept.get(dept.id_department).add("TTNV");
                  }
                });
              }
            });
          }
        });

        // Count departments with each type of knockout
        for (const knockouts of knockoutsByDept.values()) {
          if (knockouts.has("ATLĐ")) errorCounts.ATLĐ.deptCount++;
          if (knockouts.has("PNKL")) errorCounts.PNKL.deptCount++;
          if (knockouts.has("QMS")) errorCounts.QMS.deptCount++;
          if (knockouts.has("TTNV")) errorCounts.TTNV.deptCount++;
        }

        const percentages = {
          ATLĐ: 0,
          PNKL: 0,
          QMS: 0,
          TTNV: 0,
        };

        if (activeDepartments > 0) {
          Object.keys(errorCounts).forEach((key) => {
            percentages[key] = Math.round(
              (errorCounts[key].deptCount / activeDepartments) * 100
            );
          });
        }

        return {
          percentages,
          counts: errorCounts,
          activeDepartments,
        };
      })
      .filter(Boolean);

    // Calculate averages and total counts
    const averages = {
      ATLĐ: 0,
      PNKL: 0,
      QMS: 0,
      TTNV: 0,
    };

    const totalCounts = {
      ATLĐ: 0,
      PNKL: 0,
      QMS: 0,
      TTNV: 0,
    };

    let totalActiveDepartments = 0;

    workshopErrors.forEach((workshop) => {
      Object.keys(averages).forEach((key) => {
        averages[key] += workshop.percentages[key];
        totalCounts[key] += workshop.counts[key].deptCount;
      });
      totalActiveDepartments += workshop.activeDepartments;
    });

    Object.keys(averages).forEach((key) => {
      averages[key] = Math.round(averages[key] / workshopErrors.length);
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
                `Số chuyền đạt: ${totalStats.totalGreenStarDepts}`,
                `Tổng số chuyền: ${totalStats.totalActiveDepts}`,
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
        offset: -8,
        font: {
          size: 12,
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
          callback: (value) => `${value}%`,
        },
        title: {
          display: true,
          text: "Điểm đạt được (%)",
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
            labels.push(`Số chuyền không đạt: ${errorStats.totalCounts[type]}`);
            labels.push(
              `Tổng số chuyền hoạt động: ${errorStats.totalActiveDepartments}`
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
        offset: -10,
        font: {
          size: 12,
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
      {/* Green Star Statistics */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography
          variant="h5"
          align="center"
          sx={{
            fontWeight: "bold",
            mb: 3,
          }}
        >
          THỐNG KÊ CHUYỀN ĐẠT SAO XANH / 4 XƯỞNG
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
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography
          variant="h5"
          align="center"
          sx={{
            fontWeight: "bold",
            mb: 3,
          }}
        >
          THỐNG KÊ % HẠNG MỤC ĐIỂM LIỆT / 4 XƯỞNG
        </Typography>
        <Box sx={{ height: 400 }}>
          <Bar data={errorChartData} options={errorOptions} />
        </Box>
      </Paper>
    </Box>
  );
};

export default WorkshopStatistics;
