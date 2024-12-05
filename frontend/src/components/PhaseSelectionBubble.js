import React from "react";
import { Box, IconButton, Paper, Tooltip } from "@mui/material";
import DateRangeIcon from "@mui/icons-material/DateRange";
import PhaseIcon from "@mui/icons-material/Layers";

const PhaseSelectionBubble = ({ phases, selectedOption, onOptionChange }) => {
  const actions = [
    {
      icon: <DateRangeIcon />,
      name: "TỔNG THÁNG",
      value: "month",
    },
    ...phases.map((phase) => ({
      icon: <PhaseIcon />,
      name: phase.name_phase,
      value: `phase-${phase.id_phase}`,
    })),
  ];

  return (
    <Paper
      elevation={3}
      sx={{
        position: "fixed",
        bottom: 160,
        right: 16,
        borderRadius: "25px",
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        backgroundColor: "background.paper",
        zIndex: 1000,
      }}
    >
      {actions.map((action) => (
        <Tooltip key={action.value} title={action.name} placement="left" arrow>
          <Box>
            <IconButton
              onClick={() => onOptionChange(action.value)}
              sx={{
                width: 40,
                height: 40,
                backgroundColor:
                  selectedOption === action.value
                    ? "primary.main"
                    : "background.paper",
                color:
                  selectedOption === action.value
                    ? "common.white"
                    : "primary.main",
                "&:hover": {
                  backgroundColor:
                    selectedOption === action.value
                      ? "primary.dark"
                      : "primary.light",
                },
                transition: "all 0.3s",
              }}
            >
              {action.icon}
            </IconButton>
          </Box>
        </Tooltip>
      ))}
    </Paper>
  );
};

export default PhaseSelectionBubble;
