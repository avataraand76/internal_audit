// frontend/src/components/WorkshopTable.js
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";

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
  "&.workshop-row": {
    backgroundColor: "#fff3e0",
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:hover": {
    backgroundColor: "yellow",
  },
}));

const WorkshopTable = ({ workshopData, phases }) => {
  if (!workshopData || !phases) return null;

  const calculateDepartmentAverage = (dept) => {
    const activePhases = dept.phases.filter(
      (phase) => phase.scorePercentage !== ""
    );
    if (activePhases.length === 0) return null;
    const sum = activePhases.reduce(
      (acc, phase) => acc + phase.scorePercentage,
      0
    );
    return Math.round(sum / activePhases.length);
  };

  return (
    <TableContainer component={Paper} sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ p: 2, fontWeight: "bold" }}>
        {workshopData.workshopName}
      </Typography>
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
            {phases.map((phase) => (
              <StyledTableCell
                key={phase.id_phase}
                align="center"
                colSpan={3}
                className="phase-header"
              >
                {phase.name_phase}
              </StyledTableCell>
            ))}
            <StyledTableCell
              align="center"
              rowSpan={2}
              className="summary-header"
            >
              Tổng điểm đạt (%)
            </StyledTableCell>
          </TableRow>
          <TableRow>
            {phases.map((phase) => (
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
          {workshopData.departments.map((dept, index) => (
            <StyledTableRow key={index}>
              <StyledTableCell align="center">{index + 1}</StyledTableCell>
              <StyledTableCell>{dept.name_department}</StyledTableCell>
              <StyledTableCell align="center">
                {dept.max_points}
              </StyledTableCell>
              {dept.phases.map((phase, phaseIndex) => {
                const isInactive = phases[
                  phaseIndex
                ]?.inactiveDepartments?.includes(dept.id_department);

                return (
                  <React.Fragment key={phaseIndex}>
                    <StyledTableCell align="center">
                      {isInactive ? "" : phase.failedCount}
                    </StyledTableCell>
                    <StyledTableCell
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: (theme) => {
                          if (isInactive) return "#f5f5f5";
                          if (
                            phase.knockoutTypes ||
                            phase.hasKnockout ||
                            phase.scorePercentage < 80
                          ) {
                            return "#ffebee";
                          }
                          return "#e8f5e9";
                        },
                        color: (theme) => {
                          if (isInactive) return "inherit";
                          if (
                            phase.knockoutTypes ||
                            phase.hasKnockout ||
                            phase.scorePercentage < 80
                          ) {
                            return "#FF0000";
                          }
                          return "#009900";
                        },
                      }}
                    >
                      {isInactive ? "" : `${phase.scorePercentage}%`}
                    </StyledTableCell>
                    <StyledTableCell align="center">
                      {isInactive ? "" : phase.knockoutTypes}
                    </StyledTableCell>
                  </React.Fragment>
                );
              })}
              <StyledTableCell
                align="center"
                sx={{
                  fontWeight: "bold",
                  backgroundColor: (theme) => {
                    const avg = calculateDepartmentAverage(dept);
                    if (avg >= 80) return "#e8f5e9";
                    return "#ffebee";
                  },
                  color: (theme) => {
                    const avg = calculateDepartmentAverage(dept);
                    if (avg >= 80) return "#009900";
                    return "#FF0000";
                  },
                }}
              >
                {`${calculateDepartmentAverage(dept)}%`}
              </StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default WorkshopTable;
