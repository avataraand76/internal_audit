// src/components/Header.js
import React from "react";
import { AppBar, Toolbar, Box, Container } from "@mui/material";
import { styled } from "@mui/system";
import { useTheme } from "@mui/material/styles";
import logo from "../assets/logo_cty.png";
import { useNavigate } from "react-router-dom";

const CustomAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: "white",
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
  borderRadius: "20px",
  padding: "0 16px",
  position: "relative",
  marginBottom: "30px",
  [theme.breakpoints.down(340)]: {
    padding: "0 8px",
    marginBottom: "20px",
  },
}));

const CompanyName = styled("div")(({ theme }) => ({
  color: "black",
  textAlign: "center",
  textTransform: "uppercase",
  fontWeight: "bold",
  fontSize: "1.2rem",
  display: "flex",
  flexDirection: "column",
  [theme.breakpoints.down(340)]: {
    fontSize: "1rem",
  },
}));

const Header = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const handleLogoClick = () => {
    navigate("/home");
  };

  return (
    <CustomAppBar position="static">
      <Container maxWidth="md">
        <Toolbar disableGutters>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            width="100%"
          >
            <img
              src={logo}
              alt="Company Logo"
              onClick={handleLogoClick}
              style={{
                marginRight: "16px",
                height: "50px",
                cursor: "pointer",
                [theme.breakpoints.down(340)]: {
                  height: "40px",
                  marginRight: "8px",
                },
              }}
            />
            <CompanyName>
              <span style={{ whiteSpace: "nowrap" }}>CÔNG TY TNHH MAY</span>
              <span style={{ whiteSpace: "nowrap" }}>VIỆT LONG HƯNG</span>
            </CompanyName>
          </Box>
        </Toolbar>
      </Container>
    </CustomAppBar>
  );
};

export default Header;
