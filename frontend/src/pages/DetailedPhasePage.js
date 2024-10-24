// frontend/src/pages/DetailedPhasePage.js
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Typography,
  Container,
  Stack,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Menu,
  IconButton,
  Paper,
  Collapse,
  List,
  ListItemButton,
  SwipeableDrawer,
  styled,
} from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Header from "../components/Header";
import axios from "axios";
import API_URL from "../data/api";
import ImageHandler from "../components/ImageHandler";
import LoadingOverlay from "../components/LoadingOverlay";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import Zoom from "@mui/material/Zoom";
import useScrollTrigger from "@mui/material/useScrollTrigger";
import { Link } from "@mui/material";
import { FormControlLabel, Switch } from "@mui/material";

const WorkshopText = styled(Typography)(({ theme }) => ({
  fontWeight: "bold",
  fontSize: "1.2rem",
  color: theme.palette.primary.main,
  textTransform: "uppercase",
  borderRadius: "4px",
  padding: "2px",
  display: "inline-block",
  margin: "2px",
}));

const DepartmentText = styled(Typography)(({ theme }) => ({
  fontSize: "0.9rem",
  // fontStyle: "italic",
  // color: theme.palette.text.secondary,
  color: "#000000",
  borderRadius: "4px",
  padding: "2px",
  display: "inline-block",
  margin: "2px",
}));

const DetailedPhasePage = () => {
  const { phaseId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [phase, setPhase] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCriterion, setSelectedCriterion] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [workshops, setWorkshops] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [anchorEl, setAnchorEl] = useState(null);
  const [openWorkshops, setOpenWorkshops] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [totalPoint, setTotalPoint] = useState(100);
  const [totalCriteria, setTotalCriteria] = useState({ total: 0 });
  const [failedCriteria, setFailedCriteria] = useState({});
  const [hasRedStar, setHasRedStar] = useState(false);
  const [hasAbsoluteKnockout, setHasAbsoluteKnockout] = useState(false);
  const [redStarCriteria, setRedStarCriteria] = useState([]);
  const [absoluteKnockoutCriteria, setAbsoluteKnockoutCriteria] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [criterionStatus, setCriterionStatus] = useState("");
  const [criteriaStatuses, setCriteriaStatuses] = useState({});
  const [showNotFixed, setShowNotFixed] = useState(true);
  const [showFixed, setShowFixed] = useState(true);
  const [criterionImages, setCriterionImages] = useState({
    before: [],
    after: [],
  });
  const [phaseTimeLimit, setPhaseTimeLimit] = useState({
    start: null,
    end: null,
  });
  const [showTimeLimitDialog, setShowTimeLimitDialog] = useState(false);
  const [pendingScore, setPendingScore] = useState(null);
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [timeLimitError, setTimeLimitError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (!storedUser) {
          console.error("User information not found");
          alert("Không thể tải thông tin người dùng. Vui lòng đăng nhập lại.");
          navigate("/login");
          return;
        }
        setUser(storedUser);

        // Kiểm tra role của user
        const supervisorResponse = await axios.get(
          `${API_URL}/check-supervisor/${storedUser.id_user}`
        );
        setIsSupervisor(supervisorResponse.data.isSupervisor);

        // Fetch phase details
        const phaseResponse = await axios.get(`${API_URL}/phases/${phaseId}`);
        setPhase(phaseResponse.data);
        setPhaseTimeLimit({
          start: phaseResponse.data.time_limit_start
            ? new Date(phaseResponse.data.time_limit_start)
            : null,
          end: phaseResponse.data.time_limit_end
            ? new Date(phaseResponse.data.time_limit_end)
            : null,
        });

        // Fetch workshops theo user ID
        const workshopsResponse = await axios.get(
          `${API_URL}/workshops/${storedUser.id_user}`
        );
        setWorkshops(workshopsResponse.data);

        // Nếu là user supervised, tự động chọn workshop đầu tiên
        if (workshopsResponse.data.length === 1) {
          setOpenWorkshops({ [workshopsResponse.data[0].id]: true });
          if (workshopsResponse.data[0].departments.length === 1) {
            setSelectedDepartment(workshopsResponse.data[0].departments[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.");
      }
    };

    fetchData();
  }, [phaseId, navigate]);

  useEffect(() => {
    const fetchFailedCriteria = async () => {
      if (phaseId) {
        try {
          const response = await axios.get(
            `${API_URL}/failed-check/${phaseId}`
          );
          const newFailedCriteria = {};
          response.data.forEach((item) => {
            if (!newFailedCriteria[item.id_department]) {
              newFailedCriteria[item.id_department] = new Set();
            }
            newFailedCriteria[item.id_department].add(item.id_criteria);
          });
          setFailedCriteria(newFailedCriteria);
        } catch (error) {
          console.error("Error fetching failed criteria:", error);
        }
      }
    };

    fetchFailedCriteria();
  }, [phaseId]);

  // Add a new useEffect to fetch categories when department changes
  useEffect(() => {
    const fetchCategoriesForDepartment = async () => {
      if (selectedDepartment && user) {
        try {
          let response;
          if (isSupervisor) {
            response = await axios.get(
              `${API_URL}/categories/${user.id_user}/${selectedDepartment.id}`
            );
          } else {
            response = await axios.get(
              `${API_URL}/supervised-categories/${user.id_user}/${selectedDepartment.id}`
            );
          }
          setAllCategories(response.data);
          setExpandedCategories(new Set());
        } catch (error) {
          console.error("Error fetching categories for department:", error);
          alert(
            "Không thể tải danh sách hạng mục cho bộ phận này. Vui lòng thử lại sau."
          );
        }
      }
    };

    fetchCategoriesForDepartment();
  }, [selectedDepartment, user, isSupervisor]);

  useEffect(() => {
    const fetchTotalPoint = async () => {
      if (selectedDepartment && phaseId) {
        try {
          const response = await axios.get(
            `${API_URL}/total-point/${phaseId}/${selectedDepartment.id}`
          );
          setTotalPoint(response.data.total_point);
          setHasRedStar(response.data.has_red_star);
          setHasAbsoluteKnockout(response.data.has_absolute_knockout);
        } catch (error) {
          console.error("Error fetching total point:", error);
        }
      }
    };

    const fetchTotalCriteria = async () => {
      if (selectedDepartment) {
        try {
          const response = await axios.get(
            `${API_URL}/total-criteria/${selectedDepartment.id}`
          );
          setTotalCriteria((prev) => ({
            ...prev,
            total: response.data.total_criteria,
            [selectedDepartment.id]:
              failedCriteria[selectedDepartment.id]?.size || 0,
          }));
        } catch (error) {
          console.error("Error fetching total criteria count:", error);
        }
      }
    };

    fetchTotalPoint();
    fetchTotalCriteria();
  }, [selectedDepartment, phaseId, failedCriteria]);

  useEffect(() => {
    const fetchKnockoutCriteria = async () => {
      if (selectedDepartment && phaseId) {
        try {
          const response = await axios.get(
            `${API_URL}/knockout-criteria/${phaseId}/${selectedDepartment.id}`
          );
          setRedStarCriteria(response.data.redStar);
          setAbsoluteKnockoutCriteria(response.data.absoluteKnockout);
        } catch (error) {
          console.error("Error fetching knockout criteria:", error);
        }
      }
    };

    fetchKnockoutCriteria();
  }, [selectedDepartment, phaseId]);

  // fetch status of criteria of department
  useEffect(() => {
    const fetchCriteriaStatuses = async (departmentId) => {
      try {
        const response = await axios.get(
          `${API_URL}/criteria-statuses/${phaseId}/${departmentId}`
        );
        const statuses = {};
        response.data.forEach((item) => {
          statuses[item.id_criteria] = item.status_phase_details;
        });
        setCriteriaStatuses(statuses);
      } catch (error) {
        console.error("Error fetching criteria statuses:", error);
      }
    };

    if (selectedDepartment) {
      fetchCriteriaStatuses(selectedDepartment.id);
    }
  }, [selectedDepartment, phaseId]);

  // check time limit
  const isWithinTimeLimit = () => {
    if (!phaseTimeLimit.start || !phaseTimeLimit.end) return true;
    const now = new Date();
    return now >= phaseTimeLimit.start && now <= phaseTimeLimit.end;
  };

  const handleTimeLimitUpdate = async () => {
    if (!newStartDate || !newEndDate) {
      setTimeLimitError("Vui lòng chọn cả ngày bắt đầu và kết thúc");
      return;
    }

    if (new Date(newEndDate) <= new Date(newStartDate)) {
      setTimeLimitError("Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }

    try {
      // Cập nhật thời hạn trong database
      await axios.put(`${API_URL}/phases/${phaseId}`, {
        name_phase: phase.name_phase,
        time_limit_start: newStartDate,
        time_limit_end: newEndDate,
      });

      // Cập nhật state local
      setPhaseTimeLimit({
        start: new Date(newStartDate),
        end: new Date(newEndDate),
      });

      // Tiếp tục chấm điểm
      if (pendingScore) {
        const scoreData = {
          id_department: selectedDepartment.id,
          id_criteria: selectedCriterion.id,
          id_phase: phaseId,
          id_user: user.id_user,
          is_fail: pendingScore === "không đạt" ? 1 : 0,
          date_updated: new Date().toISOString(),
          status_phase_details:
            pendingScore === "không đạt" ? "CHƯA KHẮC PHỤC" : null,
        };

        setIsUploading(
          pendingScore === "không đạt" && selectedImages.length > 0
        );

        // Lưu điểm
        await axios.post(`${API_URL}/phase-details`, scoreData);

        // Xử lý upload ảnh nếu cần
        if (pendingScore === "không đạt" && selectedImages.length > 0) {
          const formData = new FormData();
          for (const image of selectedImages) {
            let file;
            if (image.file) {
              file = image.file;
            } else if (image.url && image.url.startsWith("data:image")) {
              const response = await fetch(image.url);
              const blob = await response.blob();
              file = new File([blob], image.name, { type: "image/jpeg" });
            }

            if (file) {
              formData.append("photos", file);
            }
          }

          const uploadResponse = await axios.post(
            `${API_URL}/upload`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );

          if (uploadResponse.data.success) {
            const imageUrls = uploadResponse.data.uploadedFiles.map(
              (file) => file.webViewLink
            );

            await axios.post(`${API_URL}/save-image-urls`, {
              id_department: selectedDepartment.id,
              id_criteria: selectedCriterion.id,
              id_phase: phaseId,
              imageUrls: imageUrls,
            });
          }
        }

        // Cập nhật failed criteria state
        setFailedCriteria((prev) => {
          const newFailedCriteria = { ...prev };
          if (!newFailedCriteria[selectedDepartment.id]) {
            newFailedCriteria[selectedDepartment.id] = new Set();
          }
          if (pendingScore === "không đạt") {
            newFailedCriteria[selectedDepartment.id].add(selectedCriterion.id);
          } else {
            newFailedCriteria[selectedDepartment.id].delete(
              selectedCriterion.id
            );
          }
          return newFailedCriteria;
        });

        await updateInfoCard();
      }

      setShowTimeLimitDialog(false);
      setPendingScore(null);
      setNewStartDate("");
      setNewEndDate("");
      setTimeLimitError("");
      handleCloseDialog();
    } catch (error) {
      console.error("Error updating time limits:", error);
      alert("Có lỗi xảy ra khi cập nhật thời hạn. Vui lòng thử lại.");
    }
  };

  // fetch criterion status
  const fetchCriterionStatus = async (departmentId, criterionId) => {
    try {
      const response = await axios.get(
        `${API_URL}/phase-details-status/${phaseId}/${departmentId}/${criterionId}`
      );
      setCriterionStatus(response.data.status_phase_details || "");
    } catch (error) {
      console.error("Error fetching criterion status:", error);
      setCriterionStatus("");
    }
  };

  // fetch images
  const fetchCriterionImages = async (departmentId, criterionId) => {
    try {
      const response = await axios.get(
        `${API_URL}/phase-details-images/${phaseId}/${departmentId}/${criterionId}`
      );
      const { imgURL_before, imgURL_after } = response.data;
      setCriterionImages({
        before: imgURL_before
          ? imgURL_before.split("; ").filter((url) => url)
          : [],
        after: imgURL_after
          ? imgURL_after.split("; ").filter((url) => url)
          : [],
      });
    } catch (error) {
      console.error("Error fetching criterion images:", error);
      setCriterionImages({ before: [], after: [] });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleCriterionClick = (criterion) => {
    setSelectedCriterion(criterion);
    if (selectedDepartment) {
      fetchCriterionStatus(selectedDepartment.id, criterion.id);
      fetchCriterionImages(selectedDepartment.id, criterion.id);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCriterion(null);
    handleClearImages(); // Clear images when closing the dialog
  };

  const handleDepartmentClick = (event) => {
    if (isMobile) {
      setDrawerOpen(true);
    } else {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleDepartmentClose = () => {
    if (isMobile) {
      setDrawerOpen(false);
    } else {
      setAnchorEl(null);
    }
  };

  const handleWorkshopClick = (workshopId) => {
    setOpenWorkshops((prev) => {
      const newOpenWorkshops = { ...prev };
      Object.keys(newOpenWorkshops).forEach((key) => {
        if (key !== workshopId.toString()) {
          newOpenWorkshops[key] = false;
        }
      });
      newOpenWorkshops[workshopId] = !prev[workshopId];
      return newOpenWorkshops;
    });
  };

  const handleDepartmentSelect = (dept) => {
    setSelectedDepartment(dept);
    setSearchTerm(""); // Clear the search term
    setExpandedCategories(new Set()); // Reset expanded categories
    handleDepartmentClose();
  };

  const handleClearImages = () => {
    setSelectedImages([]);
  };

  const handleRemediate = async () => {
    if (!selectedImages.length) {
      alert("Vui lòng chụp hoặc tải ảnh lên trước khi khắc phục.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();

      // Process each image for upload
      for (const image of selectedImages) {
        let file;
        if (image.file) {
          file = image.file;
        } else if (image.url && image.url.startsWith("data:image")) {
          const response = await fetch(image.url);
          const blob = await response.blob();
          file = new File([blob], image.name, { type: "image/jpeg" });
        }

        if (file) {
          formData.append("photos", file);
        }
      }

      // Upload images to Google Drive
      const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (uploadResponse.data.success) {
        const imageUrls = uploadResponse.data.uploadedFiles.map(
          (file) => file.webViewLink
        );

        // Cập nhật trạng thái trong database
        await axios.post(`${API_URL}/phase-details`, {
          id_department: selectedDepartment.id,
          id_criteria: selectedCriterion.id,
          id_phase: phaseId,
          id_user: user.id_user,
          date_updated: new Date().toISOString(),
          status_phase_details: "ĐÃ KHẮC PHỤC",
          imgURL_after: imageUrls.join("; "),
        });

        // Cập nhật state criteriaStatuses
        setCriteriaStatuses((prev) => ({
          ...prev,
          [selectedCriterion.id]: "ĐÃ KHẮC PHỤC",
        }));

        setIsUploading(false);
        handleCloseDialog();
      }
    } catch (error) {
      console.error("Error in handleRemediate:", error);
      setIsUploading(false);
      alert("Có lỗi xảy ra khi xử lý ảnh khắc phục. Vui lòng thử lại.");
    }
  };

  const searchPlaceholder = isSupervisor
    ? "Tìm kiếm theo tên hạng mục, mã tiêu chí hoặc tên tiêu chí..."
    : "Tìm kiếm trong các tiêu chí không đạt...";

  const renderDepartmentMenuContent = () => (
    <List component="nav" dense>
      {workshops.map((workshop) => (
        <React.Fragment key={workshop.id}>
          <ListItemButton onClick={() => handleWorkshopClick(workshop.id)}>
            <WorkshopText>{workshop.name}</WorkshopText>
            {openWorkshops[workshop.id] ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse
            in={openWorkshops[workshop.id]}
            timeout="auto"
            unmountOnExit
          >
            <List component="div" disablePadding>
              {workshop.departments.map((dept) => (
                <ListItemButton
                  key={dept.id}
                  sx={{
                    pl: 4,
                    backgroundColor:
                      selectedDepartment && selectedDepartment.id === dept.id
                        ? theme.palette.action.selected
                        : "inherit",
                  }}
                  onClick={() => handleDepartmentSelect(dept)}
                >
                  <DepartmentText
                    sx={{
                      fontWeight:
                        selectedDepartment && selectedDepartment.id === dept.id
                          ? "bold"
                          : "normal",
                      // textDecoration:
                      //   selectedDepartment && selectedDepartment.id === dept.id
                      //     ? "underline"
                      //     : "none",
                      // color:
                      //   selectedDepartment && selectedDepartment.id === dept.id
                      //     ? "#000000"
                      //     : "inherit",
                      // border:
                      //   selectedDepartment && selectedDepartment.id === dept.id
                      //     ? "2px solid #1976d2"
                      //     : "2px solid transparent",
                    }}
                  >
                    {dept.name}
                  </DepartmentText>
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        </React.Fragment>
      ))}
    </List>
  );

  const ScrollToTop = () => {
    const trigger = useScrollTrigger({
      threshold: 400,
      disableHysteresis: true,
    });

    const handleClick = () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

    return (
      <Zoom in={trigger}>
        <Box
          onClick={handleClick}
          role="presentation"
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <Button
            variant="contained"
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              minWidth: "unset",
              backgroundColor: (theme) => theme.palette.primary.main,
              "&:hover": {
                backgroundColor: (theme) => theme.palette.primary.dark,
              },
              boxShadow: 3,
            }}
          >
            <KeyboardArrowUpIcon />
          </Button>
        </Box>
      </Zoom>
    );
  };

  // Render workshop/department menu
  const renderDepartmentMenu = () => (
    <Box>
      <Button
        variant="outlined"
        onClick={handleDepartmentClick}
        endIcon={<ArrowDropDownIcon />}
        sx={{
          borderRadius: "20px",
          textTransform: "none",
          minWidth: 200,
          justifyContent: "space-between",
        }}
      >
        {selectedDepartment ? selectedDepartment.name : "Chọn bộ phận"}
      </Button>
      {isMobile ? (
        <SwipeableDrawer
          anchor="right"
          open={drawerOpen}
          onClose={handleDepartmentClose}
          onOpen={() => setDrawerOpen(true)}
          disableSwipeToOpen={false}
          ModalProps={{
            keepMounted: true,
          }}
          PaperProps={{
            sx: {
              width: "75%",
              maxWidth: 300,
              height: "100%",
              top: "0 !important",
              borderBottomLeftRadius: "30px",
              borderTopLeftRadius: "30px",
              boxShadow: 3,
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Chọn bộ phận
            </Typography>
            {renderDepartmentMenuContent()}
          </Box>
        </SwipeableDrawer>
      ) : (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleDepartmentClose}
        >
          {renderDepartmentMenuContent()}
        </Menu>
      )}
    </Box>
  );

  // Update the Card content in your JSX to use selectedDepartment
  const renderInfoCard = () => (
    <Card sx={{ mb: 2, border: "1px solid black" }}>
      <CardContent>
        <Typography
          variant={isMobile ? "h6" : "h5"}
          gutterBottom
          fontWeight="bold"
        >
          Thông tin chung
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography
              variant={isMobile ? "body2" : "body1"}
              fontWeight="bold"
            >
              {selectedDepartment
                ? selectedDepartment.name
                : "Chưa chọn bộ phận"}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography
              variant={isMobile ? "h4" : "h3"}
              sx={{
                fontWeight: "bold",
                color: hasAbsoluteKnockout ? "#FF0000" : "inherit",
                lineHeight: 1,
              }}
            >
              {hasAbsoluteKnockout ? 0 : totalPoint}%
            </Typography>
            <StarIcon
              sx={{
                fontSize: isMobile ? 40 : 48,
                color:
                  hasRedStar || hasAbsoluteKnockout
                    ? "#FF0000"
                    : totalPoint >= 80
                    ? "#4CAF50"
                    : "#FF0000",
                ml: 1,
              }}
            />
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          {isSupervisor ? (
            <>
              Số tiêu chí không đạt:{" "}
              {selectedDepartment
                ? totalCriteria[selectedDepartment.id] || 0
                : 0}{" "}
              / {totalCriteria.total || 0}
            </>
          ) : (
            <>
              Số tiêu chí không đạt:{" "}
              {selectedDepartment
                ? totalCriteria[selectedDepartment.id] || 0
                : 0}
            </>
          )}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Tiêu chí điểm liệt:{" "}
          {redStarCriteria.map((c) => c.codename).join(", ") || "Không có"}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Tiêu chí điểm liệt PNKL:{" "}
          {absoluteKnockoutCriteria.map((c) => c.codename).join(", ") ||
            "Không có"}
        </Typography>
      </CardContent>
    </Card>
  );

  const updateInfoCard = async () => {
    if (selectedDepartment && phaseId) {
      try {
        const totalPointResponse = await axios.get(
          `${API_URL}/total-point/${phaseId}/${selectedDepartment.id}`
        );
        setTotalPoint(totalPointResponse.data.total_point);
        setHasRedStar(totalPointResponse.data.has_red_star);
        setHasAbsoluteKnockout(totalPointResponse.data.has_absolute_knockout);

        // Cập nhật số tiêu chí không đạt
        const failedCount = failedCriteria[selectedDepartment.id]?.size || 0;
        setTotalCriteria((prevTotal) => ({
          ...prevTotal,
          [selectedDepartment.id]: failedCount,
        }));

        // Fetch and update knockout criteria
        const knockoutResponse = await axios.get(
          `${API_URL}/knockout-criteria/${phaseId}/${selectedDepartment.id}`
        );
        setRedStarCriteria(knockoutResponse.data.redStar);
        setAbsoluteKnockoutCriteria(knockoutResponse.data.absoluteKnockout);
      } catch (error) {
        console.error("Error updating info card:", error);
      }
    }
  };

  const handleSearch = (event) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);

    // Automatically expand categories with matching criteria
    if (newSearchTerm.trim()) {
      const categoriesToExpand = new Set();
      allCategories.forEach((category) => {
        if (
          category.criteria.some((criterion) =>
            criterionMatchesSearch(criterion, newSearchTerm)
          )
        ) {
          categoriesToExpand.add(category.id);
        }
      });
      setExpandedCategories(categoriesToExpand);
    } else {
      setExpandedCategories(new Set());
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setExpandedCategories(new Set());
  };

  const criterionMatchesSearch = (criterion, searchTerm) => {
    const searchLower = searchTerm.toLowerCase().trim();

    // If searching for a number, match exact number in codename
    if (/^\d+$/.test(searchTerm)) {
      const codeNumber = criterion.codename.match(/\d+/)?.[0] || "";
      return codeNumber === searchTerm;
    }

    // Otherwise, check if the search term is in the name or exact codename
    return (
      criterion.name.toLowerCase().includes(searchLower) ||
      criterion.codename.toLowerCase().includes(searchLower)
    );
  };

  // Update the filteredCategories memo to include search filtering
  const filteredCategories = useMemo(() => {
    // Bắt đầu với danh sách categories ban đầu
    let processedCategories = allCategories;

    // Nếu là user supervised, lọc theo trạng thái khắc phục
    if (!isSupervisor) {
      processedCategories = allCategories
        .map((category) => ({
          ...category,
          criteria: category.criteria.filter((criterion) => {
            const isFailed = failedCriteria[selectedDepartment?.id]?.has(
              criterion.id
            );
            if (!isFailed) return false;

            const isFixed = criteriaStatuses[criterion.id] === "ĐÃ KHẮC PHỤC";

            // Lọc theo trạng thái switch
            if (isFixed && !showFixed) return false;
            if (!isFixed && !showNotFixed) return false;

            return true;
          }),
        }))
        .filter((category) => category.criteria.length > 0);
    }

    // Áp dụng tìm kiếm nếu có
    if (searchTerm.trim()) {
      return processedCategories
        .map((category) => ({
          ...category,
          criteria: category.criteria.filter((criterion) =>
            criterionMatchesSearch(criterion, searchTerm)
          ),
        }))
        .filter((category) => category.criteria.length > 0);
    }

    return processedCategories;
  }, [
    allCategories,
    searchTerm,
    isSupervisor,
    failedCriteria,
    selectedDepartment,
    criteriaStatuses,
    showFixed,
    showNotFixed,
  ]);

  const formatDateForInput = (date) => {
    return date.toISOString().split("T")[0];
  };

  const handleScore = async (score) => {
    if (!selectedCriterion || !selectedDepartment || !user) {
      console.error("Missing required data for scoring");
      return;
    }

    // Nếu supervisor đang chấm không đạt và đã hết thời hạn, hiện dialog cập nhật thời hạn
    if (isSupervisor && score === "không đạt" && !isWithinTimeLimit()) {
      setPendingScore(score);
      setShowTimeLimitDialog(true);
      setNewStartDate(formatDateForInput(new Date()));
      setNewEndDate(
        formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      ); // Mặc định 7 ngày
      return;
    }

    setIsUploading(score === "không đạt" && selectedImages.length > 0);

    const scoreData = {
      id_department: selectedDepartment.id,
      id_criteria: selectedCriterion.id,
      id_phase: phaseId,
      id_user: user.id_user,
      is_fail: score === "không đạt" ? 1 : 0,
      date_updated: new Date().toISOString(),
      status_phase_details: score === "không đạt" ? "CHƯA KHẮC PHỤC" : null,
    };

    try {
      // Save the score first
      await axios.post(`${API_URL}/phase-details`, scoreData);

      // If score is "không đạt" and there are images, handle the upload
      if (score === "không đạt" && selectedImages.length > 0) {
        const formData = new FormData();

        // Process each image for upload
        for (const image of selectedImages) {
          let file;
          if (image.file) {
            file = image.file;
          } else if (image.url && image.url.startsWith("data:image")) {
            const response = await fetch(image.url);
            const blob = await response.blob();
            file = new File([blob], image.name, { type: "image/jpeg" });
          }

          if (file) {
            formData.append("photos", file);
          }
        }

        // Upload images to Google Drive
        const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (uploadResponse.data.success) {
          const imageUrls = uploadResponse.data.uploadedFiles.map(
            (file) => file.webViewLink
          );

          await axios.post(`${API_URL}/save-image-urls`, {
            id_department: selectedDepartment.id,
            id_criteria: selectedCriterion.id,
            id_phase: phaseId,
            imageUrls: imageUrls,
          });
        }
      }

      // Update failed criteria state
      setFailedCriteria((prev) => {
        const newFailedCriteria = { ...prev };
        if (!newFailedCriteria[selectedDepartment.id]) {
          newFailedCriteria[selectedDepartment.id] = new Set();
        }
        if (score === "không đạt") {
          newFailedCriteria[selectedDepartment.id].add(selectedCriterion.id);
        } else {
          newFailedCriteria[selectedDepartment.id].delete(selectedCriterion.id);
        }
        return newFailedCriteria;
      });

      await updateInfoCard();
      setIsUploading(false);
      handleCloseDialog();
    } catch (error) {
      console.error("Error in handleScore:", error);
      setIsUploading(false);
      alert("Có lỗi xảy ra khi lưu điểm hoặc tải ảnh lên. Vui lòng thử lại.");
    }
  };

  if (!phase) {
    return <Typography>Loading...</Typography>;
  }

  const handleBack = () => {
    navigate("/create-phase"); // Adjust this path according to your routing setup
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Header />
      <Paper
        elevation={3}
        sx={{
          // position: "sticky",
          top: 0,
          zIndex: 1100,
          backgroundColor: "background.paper",
          marginBottom: 2,
          border: "1px solid black",
        }}
      >
        <Container maxWidth="lg" sx={{ py: 2 }}>
          {/* Header với Back button, Title, và Department selector */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
              mb: 2,
            }}
          >
            <IconButton
              onClick={handleBack}
              sx={{ mr: { xs: 0, sm: 2 } }}
              aria-label="back"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography
              variant={isMobile ? "h6" : "h4"}
              component="h1"
              fontWeight="bold"
              sx={{
                flexGrow: 1,
                textAlign: { xs: "left", sm: "left" },
                order: { xs: 2, sm: 1 },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              {phase?.name_phase}
            </Typography>
            <Box
              sx={{
                order: { xs: 3, sm: 2 },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              {renderDepartmentMenu()}
            </Box>
          </Box>
          {renderInfoCard()}

          {/* Thanh tìm kiếm */}
          <TextField
            fullWidth
            variant="outlined"
            // sx={{ border: "1px solid black" }}
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="clear search"
                    onClick={handleClearSearch}
                    edge="end"
                    size="small"
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {/* Thêm switch cho user supervised */}
          {!isSupervisor && (
            <Box sx={{ mt: 2, display: "flex", gap: 3, alignItems: "center" }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showNotFixed}
                    onChange={(e) => setShowNotFixed(e.target.checked)}
                    color="warning"
                  />
                }
                label="Chưa khắc phục"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showFixed}
                    onChange={(e) => setShowFixed(e.target.checked)}
                    color="success"
                  />
                }
                label="Đã khắc phục"
              />
            </Box>
          )}
        </Container>
      </Paper>

      <Container
        maxWidth="lg"
        sx={{ mt: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}
      >
        <Stack spacing={{ xs: 2, sm: 3, md: 4 }}>
          {/* Phần Hạng mục chấm điểm */}
          <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
            Hạng mục và tiêu chí chấm điểm
          </Typography>

          {/* Danh sách Accordion cho các hạng mục */}
          {filteredCategories.map((category) => (
            <Accordion
              key={category.id}
              sx={{ border: "1px solid black" }}
              expanded={expandedCategories.has(category.id)}
              onChange={() => {
                setExpandedCategories((prev) => {
                  const newExpanded = new Set(prev);
                  if (newExpanded.has(category.id)) {
                    newExpanded.delete(category.id);
                  } else {
                    newExpanded.add(category.id);
                  }
                  return newExpanded;
                });
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`category-${category.id}-content`}
                id={`category-${category.id}-header`}
              >
                <Typography
                  variant={isMobile ? "subtitle1" : "h6"}
                  fontWeight="bold"
                >
                  {category.name}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                  {category.criteria.map((criterion) => (
                    <Grid item xs={12} sm={6} md={4} key={criterion.id}>
                      <Card
                        sx={{
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          cursor: "pointer",
                          "&:hover": { boxShadow: 6 },
                          border: failedCriteria[selectedDepartment?.id]?.has(
                            criterion.id
                          )
                            ? "2px solid #FF0000"
                            : "1px solid black",
                          backgroundColor: failedCriteria[
                            selectedDepartment?.id
                          ]?.has(criterion.id)
                            ? "#FFEBEE"
                            : "inherit",
                        }}
                        onClick={() => handleCriterionClick(criterion)}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mt: 1, display: "block" }}
                            >
                              Mã: {criterion.codename}
                            </Typography>
                            {failedCriteria[selectedDepartment?.id]?.has(
                              criterion.id
                            ) && (
                              <Box
                                sx={{
                                  bgcolor:
                                    criteriaStatuses[criterion.id] ===
                                    "ĐÃ KHẮC PHỤC"
                                      ? "success.main"
                                      : "warning.main",
                                  color: "white",
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  fontSize: "0.75rem",
                                  fontWeight: "medium",
                                }}
                              >
                                {criteriaStatuses[criterion.id] ||
                                  "CHƯA KHẮC PHỤC"}
                              </Box>
                            )}
                          </Box>
                          <Typography
                            gutterBottom
                            variant={isMobile ? "subtitle1" : "h6"}
                            component="div"
                            fontWeight="bold"
                          >
                            {criterion.name}
                          </Typography>
                          <Typography
                            variant={isMobile ? "body2" : "body1"}
                            color="text.secondary"
                          >
                            {criterion.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </Container>

      <ScrollToTop />

      {/* Dialog chi tiết tiêu chí */}
      <Dialog
        open={openDialog}
        onClose={!isUploading ? handleCloseDialog : undefined}
        maxWidth="sm"
        fullWidth
        // fullScreen={isMobile}
      >
        {selectedCriterion && (
          <>
            <DialogTitle>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                  >
                    Mã: {selectedCriterion.codename}
                  </Typography>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    fontWeight="bold"
                  >
                    {selectedCriterion.name}
                  </Typography>
                </Box>
                {failedCriteria[selectedDepartment?.id]?.has(
                  selectedCriterion.id
                ) && (
                  <Box
                    sx={{
                      bgcolor:
                        criterionStatus === "ĐÃ KHẮC PHỤC"
                          ? "success.main"
                          : "warning.main",
                      color: "white",
                      px: 2,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: "0.875rem",
                      fontWeight: "medium",
                    }}
                  >
                    {criterionStatus || "CHƯA KHẮC PHỤC"}
                  </Box>
                )}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant={isMobile ? "body2" : "body1"} paragraph>
                {selectedCriterion.description}
              </Typography>

              {/* Hiển thị thông tin về thời hạn khắc phục */}
              {phaseTimeLimit.start && phaseTimeLimit.end && (
                <Typography
                  variant="body2"
                  color={isWithinTimeLimit() ? "text.secondary" : "error"}
                  sx={{ mt: 2 }}
                >
                  Thời hạn khắc phục: {formatDate(phaseTimeLimit.start)} -{" "}
                  {formatDate(phaseTimeLimit.end)}
                  {!isWithinTimeLimit() && (
                    <Box
                      component="span"
                      sx={{
                        color: "error.main",
                        fontWeight: "bold",
                        display: "block",
                      }}
                    >
                      Đã hết thời hạn khắc phục
                    </Box>
                  )}
                </Typography>
              )}

              {/* Phần hiển thị hình ảnh vi phạm */}
              {criterionImages.before.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    fontWeight="bold"
                  >
                    Hình ảnh vi phạm:
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {criterionImages.before.map((url, index) => (
                      <Link
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          color: "primary.main",
                          textDecoration: "none",
                          "&:hover": {
                            textDecoration: "underline",
                          },
                        }}
                      >
                        Hình ảnh vi phạm {index + 1}
                      </Link>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Phần hiển thị hình ảnh đã khắc phục */}
              {criterionImages.after.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    fontWeight="bold"
                  >
                    Hình ảnh đã khắc phục:
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {criterionImages.after.map((url, index) => (
                      <Link
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          color: "primary.main",
                          textDecoration: "none",
                          "&:hover": {
                            textDecoration: "underline",
                          },
                        }}
                      >
                        Hình ảnh khắc phục {index + 1}
                      </Link>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Hiển thị ImageHandler cho supervisor hoặc user trong thời hạn */}
              {(isSupervisor ||
                (failedCriteria[selectedDepartment?.id]?.has(
                  selectedCriterion.id
                ) &&
                  isWithinTimeLimit())) && (
                <>
                  <Box sx={{ mt: 3 }}>
                    <Typography
                      variant="subtitle1"
                      gutterBottom
                      fontWeight="bold"
                    >
                      Chụp/tải lên hình ảnh mới:
                    </Typography>
                  </Box>
                  <ImageHandler
                    onImagesChange={(updatedImages) => {
                      setSelectedImages(updatedImages);
                    }}
                    images={selectedImages}
                    disabled={isUploading}
                  />
                </>
              )}
            </DialogContent>

            {/* Time Limit Update Dialog */}
            <Dialog
              open={showTimeLimitDialog}
              onClose={() => {
                setShowTimeLimitDialog(false);
                setPendingScore(null);
                setNewStartDate("");
                setNewEndDate("");
                setTimeLimitError("");
              }}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Cập nhật thời hạn khắc phục</DialogTitle>
              <DialogContent>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Đã hết thời hạn khắc phục. Vui lòng cập nhật thời hạn mới:
                </Typography>
                {timeLimitError && (
                  <Typography color="error" sx={{ mb: 2 }}>
                    {timeLimitError}
                  </Typography>
                )}
                <Stack spacing={3} sx={{ mt: 2 }}>
                  <TextField
                    type="date"
                    label="Ngày bắt đầu khắc phục"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    fullWidth
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    type="date"
                    label="Ngày kết thúc khắc phục"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    fullWidth
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: newStartDate }}
                  />
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => {
                    setShowTimeLimitDialog(false);
                    setPendingScore(null);
                    setNewStartDate("");
                    setNewEndDate("");
                    setTimeLimitError("");
                  }}
                  color="inherit"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleTimeLimitUpdate}
                  variant="contained"
                  color="primary"
                >
                  Xác nhận
                </Button>
              </DialogActions>
            </Dialog>

            <DialogActions>
              <Button
                onClick={handleCloseDialog}
                color="inherit"
                disabled={isUploading}
              >
                Hủy
              </Button>
              {isSupervisor ? (
                // Nút cho supervisor
                <>
                  {failedCriteria[selectedDepartment?.id]?.has(
                    selectedCriterion.id
                  ) ? (
                    <Button
                      onClick={() => handleScore("đạt")}
                      variant="contained"
                      color="success"
                      disabled={
                        isUploading ||
                        criterionStatus === "ĐÃ KHẮC PHỤC" ||
                        !isWithinTimeLimit() // Thêm điều kiện kiểm tra thời hạn
                      }
                    >
                      Đạt
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleScore("không đạt")}
                      variant="contained"
                      color="error"
                      disabled={isUploading}
                    >
                      Không đạt
                    </Button>
                  )}
                </>
              ) : (
                // Nút cho user thường - chỉ hiển thị nếu trong thời hạn
                failedCriteria[selectedDepartment?.id]?.has(
                  selectedCriterion.id
                ) &&
                isWithinTimeLimit() && (
                  <Button
                    onClick={handleRemediate}
                    variant="contained"
                    color="primary"
                    disabled={isUploading || selectedImages.length === 0}
                  >
                    Khắc phục
                  </Button>
                )
              )}
            </DialogActions>
          </>
        )}
        {isUploading && <LoadingOverlay />}
      </Dialog>
    </Box>
  );
};

export default DetailedPhasePage;
