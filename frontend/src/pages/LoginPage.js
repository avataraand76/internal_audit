// frontend/src/pages/LoginPage.js
import React, { useState, useEffect } from "react";
import {
  Container,
  TextField,
  Button,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useTheme,
  useMediaQuery,
  IconButton,
  InputAdornment,
  FormHelperText,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import logoImage from "../assets/logo_ksnb.png";
import API_URL from "../data/api";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [openError, setOpenError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [formErrors, setFormErrors] = useState({
    username: false,
    password: false,
  });

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Check for CapsLock
  useEffect(() => {
    const handleCapsLock = (event) => {
      setCapsLockOn(event.getModifierState("CapsLock"));
    };

    window.addEventListener("keydown", handleCapsLock);
    window.addEventListener("keyup", handleCapsLock);

    return () => {
      window.removeEventListener("keydown", handleCapsLock);
      window.removeEventListener("keyup", handleCapsLock);
    };
  }, []);

  const validateForm = () => {
    const errors = {
      username: !username.trim(),
      password: !password.trim(),
    };
    setFormErrors(errors);
    return !errors.username && !errors.password;
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Login successful
        localStorage.setItem("user", JSON.stringify(data.user)); // Save user data to localStorage
        navigate("/", { state: { user: data.user } });
      } else {
        // Login failed
        setOpenError(true);
      }
    } catch (error) {
      console.error("Login error:", error);
      setOpenError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      handleLogin();
    }
  };

  const handleCloseError = () => {
    setOpenError(false);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Header />
      <Container
        component="main"
        maxWidth="xs"
        sx={{
          px: { xs: 2, sm: 0 },
        }}
      >
        <Box
          sx={{
            marginTop: { xs: 4, sm: 8 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Box
            component="img"
            src={logoImage}
            alt="Logo"
            sx={{
              width: { xs: 150, sm: 200 },
              height: { xs: 150, sm: 200 },
              mb: { xs: 1, sm: 2 },
            }}
          />
          <Typography
            component="h1"
            variant={isMobile ? "h6" : "h5"}
            fontWeight="bold"
            textTransform="uppercase"
            textAlign="center"
          >
            kiểm soát nội bộ
          </Typography>
          <Box
            component="form"
            noValidate
            sx={{
              mt: { xs: 2, sm: 3 },
              width: "100%",
            }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Tên đăng nhập"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setFormErrors((prev) => ({ ...prev, username: false }));
              }}
              onKeyPress={handleKeyPress}
              size={isMobile ? "small" : "medium"}
              error={formErrors.username}
              helperText={formErrors.username && "Vui lòng nhập tên đăng nhập"}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Mật khẩu"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFormErrors((prev) => ({ ...prev, password: false }));
              }}
              onKeyPress={handleKeyPress}
              size={isMobile ? "small" : "medium"}
              error={formErrors.password}
              helperText={formErrors.password && "Vui lòng nhập mật khẩu"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {capsLockOn && (
              <FormHelperText error sx={{ mt: 1 }}>
                CAPSLOCK đang bật
              </FormHelperText>
            )}
            <Button
              fullWidth
              variant="contained"
              sx={{
                mt: { xs: 2, sm: 3 },
                mb: { xs: 1, sm: 2 },
                py: { xs: 1.5, sm: 2 },
                backgroundColor: "#06d6a0",
                "&:hover": {
                  backgroundColor: "#00798c",
                },
              }}
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </Box>
        </Box>
      </Container>
      <Dialog
        open={openError}
        onClose={handleCloseError}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        // fullScreen={isMobile}
      >
        <DialogTitle id="alert-dialog-title">{"Lỗi đăng nhập"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng thử lại.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseError} autoFocus>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoginPage;
