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
import API_URL from "../data/api";

function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [username, setUsername] = useState("");
  const [isSupervisor, setIsSupervisor] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUsername(storedUser.name_user);
      checkUserRole(storedUser.id_user);
    } else {
      // Redirect to login if no user data is present
      navigate("/login");
    }
  }, [navigate]);

  const checkUserRole = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/check-supervisor/${userId}`);
      const data = await response.json();
      setIsSupervisor(data.isSupervisor);
    } catch (error) {
      console.error("Error checking user role:", error);
    }
  };

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
            Chào mừng {username}
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            width="100%"
            justifyContent="center"
          >
            {isSupervisor ? (
              // UI cho Supervisor
              <>
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
                  Tạo đợt chấm điểm
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
              </>
            ) : (
              // UI cho Supervised
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
                Các đợt chấm điểm
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

export default HomePage;
