// frontend/src/components/ScorePercentageChart.js
import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, Typography, Box } from "@mui/material";

// Chart component được định nghĩa trước
const Chart = ({ title, data }) => (
  <Card sx={{ width: "100%", mt: 4 }}>
    <CardContent>
      <Typography
        variant="h6"
        component="div"
        align="center"
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
        <BarChart
          width={1000}
          height={350}
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 40,
            bottom: 100,
          }}
        >
          <XAxis
            dataKey="name"
            interval={0}
            tick={(props) => {
              if (!props || !props.payload) return null;
              const { x, y, payload } = props;
              const isTotal = data[payload.index]?.isTotal;
              return (
                <text
                  x={x}
                  y={y}
                  dy={16}
                  textAnchor="end"
                  transform={`rotate(-45, ${x}, ${y})`}
                  fontSize={11}
                  fontWeight={isTotal ? "bold" : "normal"}
                >
                  {payload.value}
                </text>
              );
            }}
            height={100}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            label={{
              value: "Điểm đạt (%)",
              angle: -90,
              position: "insideLeft",
              offset: -10,
            }}
          />
          <Tooltip
            formatter={(value, name, props) =>
              props?.payload ? [`${value}%`, "Điểm đạt"] : []
            }
            labelFormatter={(label) => `Bộ phận: ${label}`}
          />
          <Bar
            dataKey="percentage"
            isAnimationActive={false}
            barSize={40}
            label={{
              position: "top",
              content: (props) => {
                if (!props || !props.payload) return null;
                const { x, y, value, width, payload } = props;
                return (
                  <text
                    x={x + width / 2}
                    y={y - 10}
                    fill={payload.isTotal ? payload.textColor : payload.color}
                    fontSize="12"
                    textAnchor="middle"
                    fontWeight={payload.isTotal ? "bold" : "normal"}
                  >
                    {`${value}%`}
                  </text>
                );
              },
            }}
            shape={(props) => {
              if (!props || !props.payload) return null;
              const { x, y, width, height, payload } = props;
              return (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={payload.color || "#000"}
                  stroke={payload.isTotal ? "#000" : "none"}
                  strokeWidth={payload.isTotal ? 2 : 0}
                />
              );
            }}
          />
        </BarChart>
      </Box>
    </CardContent>
  </Card>
);

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
      {mainWorkshopCharts}
      {supportWorkshopChart}
      {officeWorkshopChart}
    </Box>
  );
};

export default WorkshopScoreChart;
