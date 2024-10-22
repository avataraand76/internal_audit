// frontend/src/components/LoadingOverlay.js
import React from "react";
import { CircularProgress, Box, Typography, Paper } from "@mui/material";

const LoadingOverlay = () => {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 9999,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          p: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: 250,
          backgroundColor: "white",
          borderRadius: 2,
        }}
      >
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="body1" fontWeight="medium" sx={{ mb: 1 }}>
          Đang tải ảnh lên...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Vui lòng không đóng cửa sổ này
        </Typography>
      </Paper>
    </Box>
  );
};

export default LoadingOverlay;
