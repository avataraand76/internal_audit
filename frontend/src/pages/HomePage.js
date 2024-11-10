// frontend/src/pages/HomePage.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Box,
  Stack,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import Header from "../components/Header";

function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      // Use ten_nv if available, otherwise fall back to name_user
      setDisplayName(storedUser.ten_nv || storedUser.name_user);
    } else {
      // Redirect to login if no user data is present
      navigate("/login");
    }
  }, [navigate]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Header />
      <Box
        sx={{
          p: { xs: 2, sm: 4 },
          maxWidth: "lg",
          mx: "auto",
        }}
      >
        <Stack
          spacing={{ xs: 2, sm: 3 }}
          alignItems="center"
          sx={{ mt: { xs: 2, sm: 4 } }}
        >
          <Typography
            variant={isMobile ? "h5" : "h4"}
            component="h1"
            textAlign="center"
          >
            Bạn đã đăng nhập thành công.
          </Typography>
          <Typography
            variant={isMobile ? "h5" : "h4"}
            component="h1"
            textAlign="center"
          >
            Xin chào {displayName}
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            width="100%"
            justifyContent="center"
          >
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate("/create-phase")}
              fullWidth={isMobile}
              sx={{
                minWidth: { xs: "100%", sm: "200px" },
                py: { xs: 1.5, sm: 2 },
              }}
            >
              Đợt chấm điểm
            </Button>

            <Button
              variant="contained"
              color="success"
              onClick={() => navigate("/report")}
              fullWidth={isMobile}
              sx={{
                minWidth: { xs: "100%", sm: "200px" },
                py: { xs: 1.5, sm: 2 },
              }}
            >
              Báo cáo tổng hợp
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

export default HomePage;
