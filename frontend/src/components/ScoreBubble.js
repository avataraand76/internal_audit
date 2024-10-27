// frontend/src/components/ScoreBubble.js
import React, { useState, useEffect } from "react";
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
import StarIcon from "@mui/icons-material/Star";
import useScrollTrigger from "@mui/material/useScrollTrigger";

const ScoreBubble = ({
  score,
  hasRedStar,
  hasTypeTwo,
  hasAbsoluteKnockout,
  departmentName = "",
  failedCount = 0,
  totalCriteria = 0,
  redStarCriteria = [],
  qmsAtldCriteria = [],
  pnklCriteria = [],
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const trigger = useScrollTrigger({
    threshold: 500,
    disableHysteresis: true,
  });

  // Close the popper when scrolling above threshold
  useEffect(() => {
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
  const id = open ? "score-popper" : undefined;

  const bubbleSize = isMobile ? 60 : 80;

  if (!trigger) {
    return null;
  }

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box>
        <Fade in={trigger}>
          <Box
            onClick={handleClick}
            aria-describedby={id}
            sx={{
              position: "fixed",
              top: isMobile ? "16px" : "80px",
              right: "16px",
              backgroundColor: "white",
              borderRadius: "50%",
              width: bubbleSize,
              height: bubbleSize,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: 3,
              border:
                hasAbsoluteKnockout || hasTypeTwo
                  ? "2px solid #FF0000"
                  : "1px solid #1976d2",
              zIndex: 1000,
              cursor: "pointer",
              "&:hover": {
                boxShadow: 6,
              },
            }}
          >
            <Typography
              variant={isMobile ? "h6" : "h5"}
              component="div"
              sx={{
                fontWeight: "bold",
                color:
                  hasAbsoluteKnockout || hasTypeTwo ? "#FF0000" : "inherit",
                lineHeight: 1,
              }}
            >
              {score}%
            </Typography>
            <StarIcon
              sx={{
                fontSize: isMobile ? 16 : 20,
                color:
                  hasRedStar || hasAbsoluteKnockout || hasTypeTwo
                    ? "#FF0000"
                    : score >= 80
                    ? "#4CAF50"
                    : "#FF0000",
              }}
            />
          </Box>
        </Fade>
        <Popper
          id={id}
          open={open}
          anchorEl={anchorEl}
          placement={isMobile ? "bottom" : "left"}
          sx={{
            zIndex: 1000,
            ...(isMobile && {
              position: "fixed !important",
              left: "0 !important",
              right: "0 !important",
              bottom: "0 !important",
              top: "auto !important",
              width: "100%",
              transform: "none !important",
            }),
          }}
        >
          <Paper
            elevation={4}
            sx={{
              p: 2,
              maxWidth: isMobile ? "none" : 400,
              minWidth: isMobile ? "none" : 300,
              mr: isMobile ? 0 : 2,
              borderRadius: isMobile ? "16px 16px 0 0" : 2,
              ...(isMobile && {
                width: "100%",
                maxHeight: "80vh",
                overflow: "auto",
                margin: 0,
              }),
            }}
          >
            <Typography
              variant={isMobile ? "subtitle1" : "h6"}
              component="div"
              fontWeight="bold"
              color="primary"
              gutterBottom
            >
              {departmentName}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mb: 2,
                fontWeight: "medium",
              }}
            >
              Số tiêu chí không đạt: {failedCount} / {totalCriteria}
            </Typography>

            <Typography
              variant="subtitle2"
              sx={{
                color: "text.primary",
                fontWeight: "medium",
                mb: 1.5,
              }}
            >
              Danh sách các tiêu chí điểm liệt:
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {/* Giữ nguyên các Box cho các loại tiêu chí */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontWeight: "medium" }}
                >
                  Tiêu chí điểm liệt:
                </Typography>
                <Typography variant="body2" color="error.light">
                  {redStarCriteria.length > 0
                    ? redStarCriteria.join(", ")
                    : "Không có"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontWeight: "medium" }}
                >
                  Tiêu chí điểm liệt ATLĐ:
                </Typography>
                <Typography variant="body2" color="warning.main">
                  {qmsAtldCriteria.filter((c) => c.category === 1).length > 0
                    ? qmsAtldCriteria
                        .filter((c) => c.category === 1)
                        .map((c) => c.code)
                        .join(", ")
                    : "Không có"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontWeight: "medium" }}
                >
                  Tiêu chí điểm liệt QMS:
                </Typography>
                <Typography variant="body2" color="warning.main">
                  {qmsAtldCriteria.filter((c) => c.category === 5).length > 0
                    ? qmsAtldCriteria
                        .filter((c) => c.category === 5)
                        .map((c) => c.code)
                        .join(", ")
                    : "Không có"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontWeight: "medium" }}
                >
                  Tiêu chí điểm liệt PNKL:
                </Typography>
                <Typography variant="body2" color="error.dark">
                  {pnklCriteria.length > 0
                    ? pnklCriteria.join(", ")
                    : "Không có"}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
};

export default ScoreBubble;
