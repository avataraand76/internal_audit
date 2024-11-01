// frontend/src/components/NavigationBubble.js
import React, { useState } from "react";
import {
  Fade,
  Box,
  Typography,
  Popper,
  Paper,
  ClickAwayListener,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  TableChart,
  BarChart,
  Image,
  KeyboardArrowUp,
  Menu,
} from "@mui/icons-material";
import useScrollTrigger from "@mui/material/useScrollTrigger";

const NavigationBubble = ({ scrollRefs }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const trigger = useScrollTrigger({
    threshold: -10,
    disableHysteresis: true,
  });

  // Close the popper when scrolling above threshold
  React.useEffect(() => {
    if (!trigger) {
      setAnchorEl(null);
    }
  }, [trigger]);

  const handleClick = (event) => {
    if (trigger) {
      setAnchorEl(anchorEl ? null : event.currentTarget);
    }
  };

  const handleClickAway = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl) && trigger;
  const id = open ? "nav-popper" : undefined;

  const bubbleSize = isMobile ? 60 : 80;

  const scrollToRef = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
    setAnchorEl(null);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setAnchorEl(null);
  };

  if (!trigger) {
    return null;
  }

  const navigationItems = [
    {
      icon: <TableChart />,
      label: "Bảng tổng hợp điểm",
      onClick: () => scrollToRef(scrollRefs.tableRef),
      color: theme.palette.primary.main,
    },
    {
      icon: <BarChart />,
      label: "Thống kê % điểm đạt",
      onClick: () => scrollToRef(scrollRefs.scoreChartRef),
      color: theme.palette.success.main,
    },
    {
      icon: <BarChart />,
      label: "Thống kê điểm liệt",
      onClick: () => scrollToRef(scrollRefs.knockoutChartRef),
      color: theme.palette.warning.main,
    },
    {
      icon: <BarChart />,
      label: "Thống kê 4 xưởng",
      onClick: () => scrollToRef(scrollRefs.workshopStatsRef),
      color: theme.palette.info.main,
    },
    {
      icon: <Image />,
      label: "Hình ảnh vi phạm",
      onClick: () => scrollToRef(scrollRefs.imagesRef),
      color: theme.palette.error.main,
    },
    {
      icon: <KeyboardArrowUp />,
      label: "Lên đầu trang",
      onClick: scrollToTop,
      color: theme.palette.grey[700],
    },
  ];

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box>
        <Fade in={trigger}>
          <Box
            onClick={handleClick}
            aria-describedby={id}
            sx={{
              position: "fixed",
              bottom: "16px",
              right: "16px",
              backgroundColor: "white",
              borderRadius: "50%",
              width: bubbleSize,
              height: bubbleSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: 3,
              border: `1px solid ${theme.palette.primary.main}`,
              zIndex: 1000,
              cursor: "pointer",
              "&:hover": {
                boxShadow: 6,
              },
            }}
          >
            <Menu
              sx={{
                fontSize: isMobile ? 24 : 32,
                color: theme.palette.primary.main,
              }}
            />
          </Box>
        </Fade>

        <Popper
          id={id}
          open={open}
          anchorEl={anchorEl}
          placement="top"
          sx={{
            zIndex: 1000,
            position: "fixed !important",
            left: "auto !important",
            right: "16px !important",
            bottom: `${bubbleSize + 16}px !important`,
            transform: "none !important",
          }}
        >
          <Paper
            elevation={4}
            sx={{
              p: 2,
              width: 250,
              mb: 1,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {navigationItems.map((item, index) => (
                <Box
                  key={index}
                  onClick={item.onClick}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 1.5,
                    borderRadius: 1,
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.04)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: item.color,
                      color: "white",
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Typography
                    sx={{
                      fontWeight: 500,
                      flex: 1,
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
};

export default NavigationBubble;
