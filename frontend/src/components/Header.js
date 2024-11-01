// frontend/src/components/Header.js
import React, { useState, useEffect } from "react";
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
  ListItemButton,
  useMediaQuery,
  Typography,
  Avatar,
} from "@mui/material";
import { styled } from "@mui/system";
import { useTheme } from "@mui/material/styles";
import { useNavigate, useLocation } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import GradeIcon from "@mui/icons-material/Grade";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import logo from "../assets/logo_cty.png";
import API_URL from "../data/api";

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
  color:
    isactive === "true" ? theme.palette.primary?.main || "#1976d2" : "black",
  marginLeft: theme.spacing(2),
  "&:hover": {
    backgroundColor: theme.palette.primary?.light || "#e3f2fd",
    color: theme.palette.primary?.main || "#1976d2",
  },
}));

const UserInfo = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginRight: theme.spacing(2),
  [theme.breakpoints.down("sm")]: {
    display: "none",
  },
}));

const LogoutButton = styled(Button)({
  color: "#d32f2f",
  marginLeft: "16px",
  "&:hover": {
    backgroundColor: "#ffebee",
    color: "#d32f2f",
  },
});

const Header = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoginPage = location.pathname === "/login";
  const [displayName, setDisplayName] = useState("");
  const [isSupervisor, setIsSupervisor] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      // Use ten_nv if available, otherwise fall back to name_user
      setDisplayName(user.ten_nv || user.name_user);
      checkUserRole(user.id_user);
    }
  }, []);

  const checkUserRole = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/check-supervisor/${userId}`);
      const data = await response.json();
      setIsSupervisor(data.isSupervisor);
    } catch (error) {
      console.error("Error checking user role:", error);
    }
  };

  // Tạo navItems dựa trên vai trò của user
  const getNavItems = () => {
    const baseItems = [
      { text: "Trang chủ", path: "/", icon: <HomeIcon /> },
      {
        text: "Đợt chấm điểm",
        path: "/create-phase",
        icon: <GradeIcon />,
      },
    ];

    // Thêm nút báo cáo chỉ cho supervisor
    if (isSupervisor) {
      baseItems.push({
        text: "Báo cáo",
        path: "/report",
        icon: <AssessmentIcon />,
      });
    }

    return baseItems;
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Filter out navigation items based on current route
  const filteredNavItems = getNavItems().filter((item) => {
    if (location.pathname === "/" && item.path === "/") return false;
    if (location.pathname === "/create-phase" && item.path === "/create-phase")
      return false;
    if (location.pathname === "/report" && item.path === "/report")
      return false;
    return true;
  });

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: "center" }}>
      <List>
        {!isLoginPage && (
          <ListItem>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <AccountCircleIcon />
            </ListItemIcon>
            <ListItemText primary={displayName} />
          </ListItem>
        )}
        {!isLoginPage &&
          filteredNavItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={location.pathname === item.path}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        {!isLoginPage && (
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon sx={{ minWidth: 40, color: "#d32f2f" }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Đăng xuất" sx={{ color: "#d32f2f" }} />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Box>
  );

  if (isLoginPage) {
    return null; // Don't render the header on the login page
  }

  return (
    <CustomAppBar position="static">
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: "space-between" }}>
          <Box
            display="flex"
            alignItems="center"
            onClick={() => handleNavigation("/")}
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
            <Box display="flex" alignItems="center">
              <UserInfo>
                <Avatar sx={{ width: 32, height: 32, marginRight: 1 }}>
                  <AccountCircleIcon />
                </Avatar>
                <Typography variant="body2" color="black">
                  {displayName}
                </Typography>
              </UserInfo>
              {filteredNavItems.map((item) => (
                <NavButton
                  key={item.text}
                  startIcon={item.icon}
                  onClick={() => handleNavigation(item.path)}
                  isactive={location.pathname === item.path ? "true" : "false"}
                >
                  {item.text}
                </NavButton>
              ))}
              <LogoutButton startIcon={<LogoutIcon />} onClick={handleLogout}>
                Đăng xuất
              </LogoutButton>
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
          keepMounted: true,
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
