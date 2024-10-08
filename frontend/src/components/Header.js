// frontend/src/components/Header.js
import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Container,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useMediaQuery,
} from "@mui/material";
import { styled } from "@mui/system";
import { useTheme } from "@mui/material/styles";
import { useNavigate, useLocation } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import GradeIcon from "@mui/icons-material/Grade";
import AssessmentIcon from "@mui/icons-material/Assessment";
import logo from "../assets/logo_cty.png";

const CustomAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: "white",
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
  borderRadius: "20px",
  padding: "0 16px",
  position: "relative",
  marginBottom: "30px",
  [theme.breakpoints.down("sm")]: {
    padding: "0 8px",
    marginBottom: "20px",
    borderRadius: "0",
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
  [theme.breakpoints.down("sm")]: {
    fontSize: "1rem",
  },
}));

const NavButton = styled(Button)(({ theme, isactive }) => ({
  color: isactive === "true" ? theme.palette.primary?.main : "black",
  marginLeft: theme.spacing(2),
  "&:hover": {
    backgroundColor: theme.palette.primary?.light || "#e0e0e0",
    color: theme.palette.primary?.main,
  },
}));

const navItems = [
  { text: "Trang chủ", path: "/home", icon: <HomeIcon /> },
  { text: "Chấm điểm", path: "/create-phase", icon: <GradeIcon /> },
  { text: "Báo cáo", path: "/report", icon: <AssessmentIcon /> },
];

const Header = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: "center" }}>
      <List>
        {navItems.map((item) => (
          <ListItem
            key={item.text}
            button
            onClick={() => handleNavigation(item.path)}
            selected={location.pathname === item.path}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <CustomAppBar position="static">
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: "space-between" }}>
          <Box
            display="flex"
            alignItems="center"
            onClick={() => handleNavigation("/home")}
            sx={{ cursor: "pointer" }}
          >
            <img
              src={logo}
              alt="Company Logo"
              style={{
                height: isMobile ? "40px" : "50px",
                marginRight: isMobile ? "8px" : "16px",
              }}
            />
            <CompanyName>
              <span style={{ whiteSpace: "nowrap" }}>CÔNG TY TNHH MAY</span>
              <span style={{ whiteSpace: "nowrap" }}>VIỆT LONG HƯNG</span>
            </CompanyName>
          </Box>

          {isMobile ? (
            <IconButton
              color="primary"
              aria-label="open drawer"
              edge="end"
              onClick={handleDrawerToggle}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <Box>
              {navItems.map((item) => (
                <NavButton
                  key={item.text}
                  startIcon={item.icon}
                  onClick={() => handleNavigation(item.path)}
                  isactive={location.pathname === item.path ? "true" : "false"}
                >
                  {item.text}
                </NavButton>
              ))}
            </Box>
          )}
        </Toolbar>
      </Container>

      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: 240 },
        }}
      >
        {drawer}
      </Drawer>
    </CustomAppBar>
  );
};

export default Header;
