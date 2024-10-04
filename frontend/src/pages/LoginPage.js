// src/pages/LoginPage.js
import React, { useState } from "react";
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
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import logoImage from "../assets/logo_ksnb.png";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [openError, setOpenError] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    if (username === "admin" && password === "password") {
      navigate("/home");
    } else {
      setOpenError(true);
    }
  };

  const handleCloseError = () => {
    setOpenError(false);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Header />
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Box
            component="img"
            src={logoImage}
            alt="Logo"
            sx={{ width: 200, height: 200, mb: 2 }}
          />
          <Typography
            component="h1"
            variant="h5"
            fontWeight="bold"
            textTransform="uppercase"
          >
            kiểm soát nội bộ
          </Typography>
          <Box component="form" noValidate sx={{ mt: 1 }}>
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
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Mật khẩu"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                backgroundColor: "#06d6a0",
                "&:hover": {
                  backgroundColor: "#00798c",
                },
              }}
              onClick={handleLogin}
            >
              Đăng nhập
            </Button>
          </Box>
        </Box>
      </Container>
      <Dialog
        open={openError}
        onClose={handleCloseError}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
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
