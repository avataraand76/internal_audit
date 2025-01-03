// frontend/src/pages/DetailedPhasePage.js
import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import Header from "../components/Header";
import axios from "axios";
import API_URL from "../data/api";
import ImageHandler from "../components/ImageHandler";
import LoadingOverlay from "../components/LoadingOverlay";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import Zoom from "@mui/material/Zoom";
import useScrollTrigger from "@mui/material/useScrollTrigger";
import { MenuItem } from "@mui/material";
import ScoreBubble from "../components/ScoreBubble";
import DeleteIcon from "@mui/icons-material/Delete";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

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
  const [typeTwoCriteria, setTypeTwoCriteria] = useState([]);
  const [hasTypeTwoQMS, setHasTypeTwoQMS] = useState(false);
  const [hasTypeTwoATLD, setHasTypeTwoATLD] = useState(false);
  const [hasTypeTwoTTNV, setHasTypeTwoTTNV] = useState(false);
  const [criteriaFilter, setCriteriaFilter] = useState("all");
  const [failingTypeTwoCounts, setFailingTypeTwoCounts] = useState({
    atld: 0,
    qms: 0,
    ttnv: 0,
  });
  const [showImageLimitWarning, setShowImageLimitWarning] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  // Add new state for image preview
  const [previewImage, setPreviewImage] = useState(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Add helper function to convert URLs to thumbnails
  const convertToThumbnailUrl = (url) => {
    if (!url) return "";
    if (url.includes("drive.google.com/file/d/")) {
      const fileId = url.match(/\/d\/(.*?)\/|\/d\/(.*?)$/);
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${
          fileId[1] || fileId[2]
        }&sz=w2000`;
      }
    }
    return url;
  };

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

        // Kiểm tra các role của user
        const [supervisorResponse] = await Promise.all([
          axios.get(`${API_URL}/check-supervisor/${storedUser.id_user}`),
        ]);

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

        // Fetch workshops theo user ID, including phaseId in query
        const workshopsResponse = await axios.get(
          `${API_URL}/workshops/${storedUser.id_user}?phaseId=${phaseId}`
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
  }, [navigate, phaseId]);

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
          setHasTypeTwoQMS(response.data.has_type_two_qms);
          setHasTypeTwoATLD(response.data.has_type_two_atld);
          setHasTypeTwoTTNV(response.data.has_type_two_ttnv);
          setHasAbsoluteKnockout(response.data.has_type_three);
          setFailingTypeTwoCounts({
            atld: response.data.failing_type2_counts?.[1] || 0,
            qms: response.data.failing_type2_counts?.[5] || 0,
            ttnv: response.data.failing_type2_counts?.[6] || 0,
          });
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
          setTypeTwoCriteria(response.data.typeTwo);
          setAbsoluteKnockoutCriteria(response.data.PNKL);
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

    // Close dialog immediately
    setShowTimeLimitDialog(false);

    // Set loading state
    setIsUploading(true);

    try {
      // Standardize time to 00:00:00 for start date and 23:59:59 for end date
      const standardizeDate = (dateString, isEndDate = false) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        if (isEndDate) {
          date.setHours(23, 59, 59, 0); // Thời gian kết thúc: 23:59:59.000
        } else {
          date.setHours(0, 0, 0, 0); // Thời gian bắt đầu: 00:00:00.000
        }
        return date.toISOString();
      };

      // Cập nhật thời hạn trong database
      await axios.put(`${API_URL}/phases/${phaseId}`, {
        name_phase: phase.name_phase,
        time_limit_start: standardizeDate(newStartDate, false),
        time_limit_end: standardizeDate(newEndDate, true),
      });

      // Cập nhật state local
      setPhaseTimeLimit({
        start: new Date(standardizeDate(newStartDate, false)),
        end: new Date(standardizeDate(newEndDate, true)),
      });

      // Process pending score if exists
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

        // Save the score
        await axios.post(`${API_URL}/phase-details`, scoreData);

        // Handle image upload if needed
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

          formData.append("phase", phase?.name_phase || "");
          formData.append("department", selectedDepartment?.name || "");
          formData.append("criteria", selectedCriterion?.codename || "");
          formData.append("isRemediation", "false");
          // Add IDs for counting existing images
          formData.append("phaseId", phaseId);
          formData.append("departmentId", selectedDepartment.id);
          formData.append("criterionId", selectedCriterion.id);

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

        // Update failed criteria state
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

      // Reset all states
      setPendingScore(null);
      setNewStartDate("");
      setNewEndDate("");
      setTimeLimitError("");
      handleCloseDialog();
    } catch (error) {
      console.error("Error updating time limits:", error);
      alert("Có lỗi xảy ra khi cập nhật thời hạn. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
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
      // Tránh gọi API nhiều lần
      if (isUploading) return;

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

      // Add all required info
      formData.append("phase", phase?.name_phase || "");
      formData.append("department", selectedDepartment?.name || "");
      formData.append("criteria", selectedCriterion?.codename || "");
      formData.append("isRemediation", "true");
      // Add IDs for counting existing images
      formData.append("phaseId", phaseId);
      formData.append("departmentId", selectedDepartment.id);
      formData.append("criterionId", selectedCriterion.id);

      // Upload images to Google Drive
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        // Reset state sau khi upload thành công
        setSelectedImages([]);
        setIsUploading(false);
        // Refresh data nếu cần
        if (selectedDepartment && selectedCriterion) {
          await fetchCriterionStatus(
            selectedDepartment.id,
            selectedCriterion.id
          );
          await fetchCriterionImages(
            selectedDepartment.id,
            selectedCriterion.id
          );
        }
      }

      // Cập nhật criteriaStatuses
      setCriteriaStatuses((prev) => ({
        ...prev,
        [selectedCriterion.id]: "ĐÃ KHẮC PHỤC",
      }));

      // Cập nhật lại allCategories để refresh trạng thái
      const updatedCategories = allCategories.map((category) => ({
        ...category,
        criteria: category.criteria.map((criterion) =>
          criterion.id === selectedCriterion.id
            ? { ...criterion, status_phase_details: "ĐÃ KHẮC PHỤC" }
            : criterion
        ),
      }));
      setAllCategories(updatedCategories);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
    }
  };

  const searchPlaceholder = isSupervisor
    ? "Tìm kiếm theo mã tiêu chí, tên tiêu chí hoặc nội dung..."
    : "Tìm kiếm trong các tiêu chí không đạt...";

  const renderDepartmentMenuContent = () => {
    const sortDepartments = (departments) => {
      return [...departments].sort((a, b) => {
        // Helper function to extract number from CHUYỀN
        const getChuyenInfo = (name) => {
          const match = name.match(/CHUYỀN\s+(.+)/i);
          if (!match) return null;

          // Kiểm tra xem phần sau CHUYỀN có phải là số không
          const value = match[1];
          const numericValue = parseInt(value);
          return {
            isNumeric: !isNaN(numericValue),
            value: isNaN(numericValue) ? value : numericValue,
          };
        };

        const aInfo = getChuyenInfo(a.name);
        const bInfo = getChuyenInfo(b.name);

        // Nếu cả hai đều là CHUYỀN
        if (aInfo && bInfo) {
          // Nếu một cái là số và cái kia là chữ
          if (aInfo.isNumeric !== bInfo.isNumeric) {
            return aInfo.isNumeric ? -1 : 1; // Số đứng trước chữ
          }

          // Nếu cả hai đều là số hoặc cả hai đều là chữ
          if (aInfo.isNumeric) {
            return aInfo.value - bInfo.value; // So sánh số
          } else {
            return aInfo.value.localeCompare(bInfo.value); // So sánh chữ
          }
        }

        // Nếu chỉ một trong hai là CHUYỀN
        if (aInfo) return -1;
        if (bInfo) return 1;

        // Nếu không phải CHUYỀN thì sắp xếp theo alphabet
        return a.name.localeCompare(b.name);
      });
    };

    return (
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
                {sortDepartments(workshop.departments).map((dept) => (
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
                          selectedDepartment &&
                          selectedDepartment.id === dept.id
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
  };

  const ScrollToTop = () => {
    const trigger = useScrollTrigger({
      threshold: 500,
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
              width: 50,
              height: 50,
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
              variant={isMobile ? "h5" : "h6"}
              component="div"
              fontWeight="bold"
              color="primary"
              gutterBottom
            >
              {selectedDepartment
                ? selectedDepartment.name
                : "Chưa chọn bộ phận"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant={isMobile ? "h4" : "h3"}
              sx={{
                fontWeight: "bold",
                color: hasRedStar
                  ? "#FF0000"
                  : totalPoint >= 80
                  ? "#inherit"
                  : "#FF0000",
                lineHeight: 1,
              }}
            >
              {totalPoint}%
            </Typography>
            <StarIcon
              sx={{
                fontSize: isMobile ? 40 : 48,
                color: hasRedStar
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

        {/* Box chứa danh sách tiêu chí điểm liệt */}
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{ color: "text.primary", fontWeight: "medium" }}
          >
            Danh sách các tiêu chí điểm liệt:
          </Typography>

          {/* Tiêu chí điểm liệt loại 1 không còn dùng nữa*/}
          {/* <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", minWidth: "140px" }}
            >
              Tiêu chí điểm liệt sao đỏ:
            </Typography>
            <Typography variant="body2" color="error.light">
              {redStarCriteria?.length > 0
                ? redStarCriteria.map((c) => c.codename).join(", ")
                : "Không có"}
            </Typography>
          </Box> */}

          {/* Tiêu chí ATLĐ loại 2 */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", minWidth: "140px" }}
            >
              Tiêu chí điểm liệt ATLĐ:
            </Typography>
            <Typography variant="body2" color="warning.main">
              {typeTwoCriteria?.filter((c) => c.id_category === 1)?.length > 0
                ? typeTwoCriteria
                    .filter((c) => c.id_category === 1)
                    .map((c) => c.codename)
                    .join(", ")
                : "Không có"}
            </Typography>
          </Box>

          {/* Tiêu chí QMS loại 2 */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", minWidth: "140px" }}
            >
              Tiêu chí điểm liệt QMS:
            </Typography>
            <Typography variant="body2" color="warning.main">
              {typeTwoCriteria?.filter((c) => c.id_category === 5)?.length > 0
                ? typeTwoCriteria
                    .filter((c) => c.id_category === 5)
                    .map((c) => c.codename)
                    .join(", ")
                : "Không có"}
            </Typography>
          </Box>

          {/* Tiêu chí TTNV loại 2 */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", minWidth: "140px" }}
            >
              Tiêu chí điểm liệt TTNV:
            </Typography>
            <Typography variant="body2" color="warning.main">
              {typeTwoCriteria?.filter((c) => c.id_category === 6)?.length > 0
                ? typeTwoCriteria
                    .filter((c) => c.id_category === 6)
                    .map((c) => c.codename)
                    .join(", ")
                : "Không có"}
            </Typography>
          </Box>

          {/* Tiêu chí PNKL loại 3 */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", minWidth: "140px" }}
            >
              Tiêu chí điểm liệt PNKL:
            </Typography>
            <Typography variant="body2" color="error.dark">
              {absoluteKnockoutCriteria?.length > 0
                ? absoluteKnockoutCriteria.map((c) => c.codename).join(", ")
                : "Không có"}
            </Typography>
          </Box>
        </Box>

        {/* Box chứa tất cả các thông báo vi phạm */}
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          {/* ATLĐ violation message */}
          {hasTypeTwoATLD && (
            <Typography
              variant="body2"
              sx={{
                p: 1,
                bgcolor: "warning.main",
                color: "white",
                borderRadius: 1,
                fontWeight: "medium",
              }}
            >
              Phát hiện vi phạm ATLĐ - Trừ {failingTypeTwoCounts.atld} điểm
              (tổng số tiêu chí điểm liệt ATLĐ)
            </Typography>
          )}

          {/* QMS violation message */}
          {hasTypeTwoQMS && (
            <Typography
              variant="body2"
              sx={{
                p: 1,
                bgcolor: "warning.main",
                color: "white",
                borderRadius: 1,
                fontWeight: "medium",
              }}
            >
              Phát hiện vi phạm QMS - Trừ {failingTypeTwoCounts.qms} điểm (tổng
              số tiêu chí điểm liệt QMS)
            </Typography>
          )}

          {/* TTNV violation message */}
          {hasTypeTwoTTNV && (
            <Typography
              variant="body2"
              sx={{
                p: 1,
                bgcolor: "warning.main",
                color: "white",
                borderRadius: 1,
                fontWeight: "medium",
              }}
            >
              Phát hiện vi phạm TTNV - Trừ {failingTypeTwoCounts.ttnv} điểm
              (tổng số tiêu chí điểm liệt TTNV)
            </Typography>
          )}

          {/* PNKL violation message */}
          {hasAbsoluteKnockout && (
            <Typography
              variant="body2"
              sx={{
                p: 1,
                bgcolor: "error.dark",
                color: "white",
                borderRadius: 1,
                fontWeight: "medium",
              }}
            >
              Phát hiện vi phạm PNKL - Trừ tất cả điểm hạng mục PNKL
            </Typography>
          )}
        </Box>
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

  const removeDiacritics = useCallback((str) => {
    if (!str) return "";
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D"); // Handle special case for 'd'
  }, []);

  const criterionMatchesSearch = useCallback(
    (criterion, searchTerm) => {
      const searchLower = searchTerm.toLowerCase().trim();
      const searchWithoutDiacritics = removeDiacritics(searchLower);

      // If searching for a number, match exact number in codename
      if (/^\d+$/.test(searchTerm)) {
        const codeNumber = criterion.codename.match(/\d+/)?.[0] || "";
        return codeNumber === searchTerm;
      }

      // Check if the search term matches the name, codename, or description
      return (
        removeDiacritics(criterion.name.toLowerCase()).includes(
          searchWithoutDiacritics
        ) ||
        removeDiacritics(criterion.codename.toLowerCase()).includes(
          searchWithoutDiacritics
        ) ||
        removeDiacritics(criterion.description.toLowerCase()).includes(
          searchWithoutDiacritics
        )
      );
    },
    [removeDiacritics]
  );

  // Update the filteredCategories memo to include search filtering
  const filteredCategories = useMemo(() => {
    let processedCategories = allCategories;

    processedCategories = allCategories
      .map((category) => ({
        ...category,
        criteria: category.criteria.filter((criterion) => {
          const isFailed = failedCriteria[selectedDepartment?.id]?.has(
            criterion.id
          );
          const isFixed = criteriaStatuses[criterion.id] === "ĐÃ KHẮC PHỤC";

          // Apply supervisor filters
          if (isSupervisor) {
            // Apply criteria type filter
            switch (criteriaFilter) {
              case "failed":
                if (!isFailed) return false;
                break;
              case "failing_point":
                if (!criterion.failingPointType) return false;
                break;
              // case "ttnv":
              //   if (criterion.failingPointType !== 1) return false;
              //   break;
              // case "atlđ":
              //   if (
              //     !(
              //       criterion.failingPointType === 2 &&
              //       criterion.id_category === 1
              //     )
              //   )
              //     return false;
              //   break;
              // case "qms":
              //   if (
              //     !(
              //       criterion.failingPointType === 2 &&
              //       criterion.id_category === 5
              //     )
              //   )
              //     return false;
              //   break;
              // case "pnkl":
              //   if (criterion.failingPointType !== 3) return false;
              //   break;
              default:
                return true;
            }

            // Apply status filters
            if (showFixed && !showNotFixed) return isFailed && isFixed;
            if (!showFixed && showNotFixed) return isFailed && !isFixed;
            if (!showFixed && !showFixed) return false;
          } else {
            // For non-supervisor users
            if (!isFailed) return false;
            if (isFixed && !showFixed) return false;
            if (!isFixed && !showNotFixed) return false;
          }

          return true;
        }),
      }))
      .filter((category) => category.criteria.length > 0);

    // Apply search filter if there's a search term
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
    criteriaFilter,
    criterionMatchesSearch,
  ]);

  const handleCriteriaFilterChange = (event) => {
    const value = event.target.value;
    setCriteriaFilter(value);
    setExpandedCategories(new Set(allCategories.map((cat) => cat.id)));
  };

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

    try {
      // Prepare score data
      const scoreData = {
        id_department: selectedDepartment.id,
        id_criteria: selectedCriterion.id,
        id_phase: phaseId,
        id_user: user.id_user,
        is_fail: score === "không đạt" ? 1 : 0,
        date_updated: new Date().toISOString(),
        status_phase_details: score === "không đạt" ? "CHƯA KHẮC PHỤC" : null,
        clearBefore: score === "đạt",
      };

      // Save the score
      await axios.post(`${API_URL}/phase-details`, scoreData);

      // Handle image upload if necessary
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

        // Add phase, department, criteria info
        formData.append("phase", phase?.name_phase || "");
        formData.append("department", selectedDepartment?.name || "");
        formData.append("criteria", selectedCriterion?.codename || "");
        formData.append("isRemediation", "false");
        // Add IDs for counting existing images
        formData.append("phaseId", phaseId);
        formData.append("departmentId", selectedDepartment.id);
        formData.append("criterionId", selectedCriterion.id);

        // Upload images to Google Drive
        const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
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

      // Update local states for realtime feedback
      const updateLocalStates = async () => {
        try {
          // Fetch total point and other statuses
          const totalPointResponse = await axios.get(
            `${API_URL}/total-point/${phaseId}/${selectedDepartment.id}`
          );

          setTotalPoint(totalPointResponse.data.total_point);
          setHasRedStar(totalPointResponse.data.has_red_star);
          setHasTypeTwoATLD(totalPointResponse.data.has_type_two_atld);
          setHasTypeTwoQMS(totalPointResponse.data.has_type_two_qms);
          setHasTypeTwoTTNV(totalPointResponse.data.has_type_two_ttnv);
          setHasAbsoluteKnockout(totalPointResponse.data.has_type_three);
          setFailingTypeTwoCounts({
            atld: totalPointResponse.data.failing_type2_counts?.[1] || 0,
            qms: totalPointResponse.data.failing_type2_counts?.[5] || 0,
            ttnv: totalPointResponse.data.failing_type2_counts?.[6] || 0,
          });

          // Fetch updated knockout criteria
          const knockoutResponse = await axios.get(
            `${API_URL}/knockout-criteria/${phaseId}/${selectedDepartment.id}`
          );

          setRedStarCriteria(knockoutResponse.data.redStar);
          setTypeTwoCriteria(knockoutResponse.data.typeTwo);
          setAbsoluteKnockoutCriteria(knockoutResponse.data.PNKL);

          // Update failed criteria state
          setFailedCriteria((prev) => {
            const newFailedCriteria = { ...prev };
            if (!newFailedCriteria[selectedDepartment.id]) {
              newFailedCriteria[selectedDepartment.id] = new Set();
            }
            if (score === "không đạt") {
              newFailedCriteria[selectedDepartment.id].add(
                selectedCriterion.id
              );
            } else {
              newFailedCriteria[selectedDepartment.id].delete(
                selectedCriterion.id
              );
            }
            return newFailedCriteria;
          });

          // Update total criteria count
          setTotalCriteria((prev) => ({
            ...prev,
            [selectedDepartment.id]:
              score === "không đạt"
                ? (prev[selectedDepartment.id] || 0) + 1
                : Math.max(0, (prev[selectedDepartment.id] || 0) - 1),
          }));

          // Update criteria statuses
          const statusResponse = await axios.get(
            `${API_URL}/criteria-statuses/${phaseId}/${selectedDepartment.id}`
          );
          const statuses = {};
          statusResponse.data.forEach((item) => {
            statuses[item.id_criteria] = item.status_phase_details;
          });
          setCriteriaStatuses(statuses);
        } catch (error) {
          console.error("Error updating local states:", error);
          throw error;
        }
      };

      await updateLocalStates();

      setIsUploading(false);
      handleCloseDialog();
    } catch (error) {
      console.error("Error in handleScore:", error);
      setIsUploading(false);
      alert("Có lỗi xảy ra khi lưu điểm hoặc tải ảnh lên. Vui lòng thử lại.");
    }
  };

  const handleSupplementaryUpload = async () => {
    // Prevent double submission
    if (isUploading) return;

    try {
      setIsUploading(true);

      const formData = new FormData();

      // Thêm ảnh vào formData
      selectedImages.forEach((image) => {
        if (image.file) {
          formData.append("photos", image.file);
        }
      });

      // Thêm thông tin khác
      formData.append("phase", phase?.name_phase || "");
      formData.append("department", selectedDepartment?.name || "");
      formData.append("criteria", selectedCriterion?.codename || "");
      formData.append("isRemediation", "false"); // hoặc "true" tùy trường hợp
      formData.append("phaseId", phaseId);
      formData.append("departmentId", selectedDepartment.id);
      formData.append("criterionId", selectedCriterion.id);

      // Gọi API một lần duy nhất
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setSelectedImages([]);
        // Refresh data
        await fetchCriterionImages(selectedDepartment.id, selectedCriterion.id);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
    }
  };

  // Add handler for image preview
  const handlePreviewImage = (url, title, type, index) => {
    setPreviewImage({ url, title, type, index });
    setShowPreviewDialog(true);
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

          {/* Status filters for all users */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "flex-start",
              mt: 2,
              gap: 2,
            }}
          >
            {/* Criteria Type Filter (chỉ hiển thị cho supervisor) */}
            {isSupervisor && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Lọc tiêu chí:
                </Typography>
                <TextField
                  select
                  size="small"
                  value={criteriaFilter}
                  onChange={handleCriteriaFilterChange}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="all">Tất cả tiêu chí</MenuItem>
                  <MenuItem value="failed">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        color: "error.light",
                        gap: 1,
                      }}
                    >
                      <Typography>Tiêu chí không đạt</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="failing_point">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        color: "error.dark",
                        gap: 1,
                      }}
                    >
                      <Typography>Tiêu chí điểm liệt</Typography>
                    </Box>
                  </MenuItem>
                  {/* <MenuItem value="ttnv">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        color: "error.light",
                        gap: 1,
                      }}
                    >
                      <Typography>Tiêu chí TTNV</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="atlđ">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        color: "warning.main",
                        gap: 1,
                      }}
                    >
                      <Typography>Tiêu chí ATLĐ</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="qms">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        color: "warning.main",
                        gap: 1,
                      }}
                    >
                      <Typography>Tiêu chí QMS</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="pnkl">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        color: "error.dark",
                        gap: 1,
                      }}
                    >
                      <Typography>Tiêu chí PNKL</Typography>
                    </Box>
                  </MenuItem> */}
                </TextField>
              </Box>
            )}

            {/* Status Filter */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Lọc trạng thái:
              </Typography>
              <TextField
                select
                size="small"
                value={
                  showFixed && showNotFixed
                    ? "all"
                    : showFixed
                    ? "fixed"
                    : "notFixed"
                }
                onChange={(e) => {
                  switch (e.target.value) {
                    case "all":
                      setShowFixed(true);
                      setShowNotFixed(true);
                      break;
                    case "fixed":
                      setShowFixed(true);
                      setShowNotFixed(false);
                      break;
                    case "notFixed":
                      setShowFixed(false);
                      setShowNotFixed(true);
                      break;
                    default:
                      setShowFixed(false);
                      setShowNotFixed(false);
                  }
                }}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="all">Tất cả trạng thái</MenuItem>
                <MenuItem value="fixed">
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      color: "success.main",
                      gap: 1,
                    }}
                  >
                    <Typography>Đã khắc phục</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="notFixed">
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      color: "warning.main",
                      gap: 1,
                    }}
                  >
                    <Typography>Chưa khắc phục</Typography>
                  </Box>
                </MenuItem>
              </TextField>
            </Box>
          </Box>
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
                              sx={{ mt: 1 }}
                            >
                              Mã: {criterion.codename}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 0.5 }}>
                              {criterion.failing_point_type > 0 && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    backgroundColor:
                                      criterion.failing_point_type === 1
                                        ? "error.light"
                                        : criterion.failing_point_type === 2
                                        ? "warning.light"
                                        : "error.dark",
                                    color: "white",
                                  }}
                                >
                                  {criterion.failing_point_type === 1
                                    ? "Điểm liệt"
                                    : criterion.failing_point_type === 2
                                    ? "QMS/ATLĐ"
                                    : "PNKL"}
                                </Typography>
                              )}
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

      <ScoreBubble
        score={totalPoint}
        hasRedStar={hasRedStar}
        hasTypeTwoATLD={hasTypeTwoATLD}
        hasTypeTwoQMS={hasTypeTwoQMS}
        hasTypeTwoTTNV={hasTypeTwoTTNV}
        hasAbsoluteKnockout={hasAbsoluteKnockout}
        departmentName={selectedDepartment?.name || ""}
        failedCount={totalCriteria[selectedDepartment?.id] || 0}
        totalCriteria={totalCriteria.total || 0}
        redStarCriteria={redStarCriteria?.map((c) => c.codename) || []}
        typeTwoCriteria={
          typeTwoCriteria?.map((c) => ({
            code: c.codename,
            category: c.id_category,
            count:
              c.id_category === 1
                ? typeTwoCriteria.filter((x) => x.id_category === 1).length
                : c.id_category === 5
                ? typeTwoCriteria.filter((x) => x.id_category === 5).length
                : c.id_category === 6
                ? typeTwoCriteria.filter((x) => x.id_category === 6).length
                : 0,
          })) || []
        }
        pnklCriteria={absoluteKnockoutCriteria?.map((c) => c.codename) || []}
      />

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

              {/* Add Image Preview Dialog */}
              <Dialog
                open={showPreviewDialog}
                onClose={() => setShowPreviewDialog(false)}
                maxWidth="md"
                fullWidth
              >
                <DialogTitle sx={{ pb: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                      sx={{
                        fontWeight: "bold",
                        fontSize: "1.2rem",
                      }}
                    >
                      {previewImage?.title || ""}
                    </Typography>
                  </Stack>
                </DialogTitle>
                <DialogContent>
                  {previewImage?.url && (
                    <Box
                      sx={{
                        width: "100%",
                        height: "500px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        bgcolor: "grey.100",
                        borderRadius: 1,
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={convertToThumbnailUrl(previewImage.url)}
                        alt={previewImage.title || ""}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </Box>
                  )}
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                  {((previewImage?.type === "before" &&
                    isSupervisor &&
                    criterionImages.after.length === 0) ||
                    (previewImage?.type === "after" && !isSupervisor)) && (
                    <Button
                      onClick={() => {
                        setImageToDelete(previewImage);
                        setShowDeleteDialog(true);
                      }}
                      startIcon={<DeleteIcon />}
                      color="error"
                      variant="outlined"
                      sx={{
                        mr: "auto",
                        minWidth: { xs: 80, sm: 120 },
                        borderColor: "error.main",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        py: { xs: 0.5, sm: 1 },
                        px: { xs: 1, sm: 2 },
                        "&:hover": {
                          backgroundColor: "error.light",
                          borderColor: "error.dark",
                        },
                      }}
                    >
                      Xóa ảnh
                    </Button>
                  )}
                  <Button
                    onClick={() =>
                      previewImage?.url &&
                      window.open(previewImage.url, "_blank")
                    }
                    startIcon={<ZoomOutMapIcon />}
                    variant="outlined"
                    color="primary"
                    disabled={!previewImage?.url}
                    sx={{
                      minWidth: { xs: 120, sm: 160 },
                      mr: 1,
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      py: { xs: 0.5, sm: 1 },
                      px: { xs: 1, sm: 2 },
                    }}
                  >
                    Phóng to ảnh
                  </Button>
                  <Button
                    onClick={() => setShowPreviewDialog(false)}
                    variant="contained"
                    sx={{
                      minWidth: { xs: 60, sm: 100 },
                      bgcolor: "primary.main",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      py: { xs: 0.5, sm: 1 },
                      px: { xs: 1, sm: 2 },
                      "&:hover": {
                        bgcolor: "primary.dark",
                      },
                    }}
                  >
                    Đóng
                  </Button>
                </DialogActions>
              </Dialog>

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
                      <Box
                        key={index}
                        component="span"
                        onClick={() =>
                          handlePreviewImage(
                            url,
                            `Hình ảnh vi phạm ${index + 1}`,
                            "before",
                            index
                          )
                        }
                        sx={{
                          color: "primary.main",
                          textDecoration: "none",
                          cursor: "pointer",
                          "&:hover": {
                            textDecoration: "underline",
                          },
                        }}
                      >
                        Hình ảnh vi phạm {index + 1}
                      </Box>
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
                      <Box
                        key={index}
                        component="span"
                        onClick={() =>
                          handlePreviewImage(
                            url,
                            `Hình ảnh khắc phục ${index + 1}`,
                            "after",
                            index
                          )
                        }
                        sx={{
                          color: "primary.main",
                          textDecoration: "none",
                          cursor: "pointer",
                          "&:hover": {
                            textDecoration: "underline",
                          },
                        }}
                      >
                        Hình ảnh khắc phục {index + 1}
                      </Box>
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
                    {showImageLimitWarning && (
                      <Typography
                        color="error"
                        sx={{
                          mt: 1,
                          p: 1,
                          bgcolor: "error.light",
                          color: "error.contrastText",
                          borderRadius: 1,
                        }}
                      >
                        Chỉ được phép tải lên tối đa 20 hình ảnh. Vui lòng xóa
                        bớt hình ảnh.
                      </Typography>
                    )}
                  </Box>
                  <ImageHandler
                    onImagesChange={(updatedImages) => {
                      setSelectedImages(updatedImages);
                      setShowImageLimitWarning(updatedImages.length > 20);
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
                  Gia hạn
                </Button>
              </DialogActions>
            </Dialog>

            <DialogActions
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                gap: { xs: 0.5, sm: 1 },
                flexWrap: "wrap",
                p: { xs: 1, sm: 2 },
              }}
            >
              {/* Bổ sung ảnh button - chỉ hiển thị cho supervisor khi:
                  1. Tiêu chí không đạt 
                  2. Chưa khắc phục
                  3. Còn trong thời hạn khắc phục */}
              {isSupervisor &&
                failedCriteria[selectedDepartment?.id]?.has(
                  selectedCriterion?.id
                ) &&
                criterionStatus !== "ĐÃ KHẮC PHỤC" &&
                isWithinTimeLimit() && (
                  <Button
                    onClick={() => handleSupplementaryUpload()}
                    variant="outlined"
                    color="primary"
                    disabled={
                      isUploading ||
                      selectedImages.length === 0 ||
                      showImageLimitWarning
                    }
                    startIcon={<AddPhotoAlternateIcon />}
                    sx={{
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      py: { xs: 0.5, sm: 1 },
                      px: { xs: 1, sm: 2 },
                      whiteSpace: "nowrap",
                    }}
                  >
                    Bổ sung ảnh
                  </Button>
                )}

              {/* Spacer để đẩy các nút còn lại sang phải */}
              <Box sx={{ flexGrow: 1 }} />

              {/* Các nút điều khiển chính */}
              <Button
                onClick={handleCloseDialog}
                color="inherit"
                disabled={isUploading}
                sx={{
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  py: { xs: 0.5, sm: 1 },
                  px: { xs: 1, sm: 2 },
                  minWidth: { xs: "60px", sm: "auto" },
                }}
              >
                Hủy
              </Button>

              {isSupervisor ? (
                // Các nút cho supervisor
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
                        !isWithinTimeLimit()
                      }
                      sx={{
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        py: { xs: 0.5, sm: 1 },
                        px: { xs: 1, sm: 2 },
                        minWidth: { xs: "60px", sm: "auto" },
                      }}
                    >
                      Đạt
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleScore("không đạt")}
                      variant="contained"
                      color="error"
                      disabled={isUploading || showImageLimitWarning}
                      sx={{
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        py: { xs: 0.5, sm: 1 },
                        px: { xs: 1, sm: 2 },
                        minWidth: { xs: "60px", sm: "auto" },
                      }}
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
                    disabled={
                      isUploading ||
                      selectedImages.length === 0 ||
                      showImageLimitWarning
                    }
                    sx={{
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      py: { xs: 0.5, sm: 1 },
                      px: { xs: 1, sm: 2 },
                      minWidth: { xs: "60px", sm: "auto" },
                    }}
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

      {/* Dialog xác nhận xóa ảnh */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <DeleteIcon color="error" />
            <Typography
              sx={{
                color: "error.main",
                fontWeight: "bold",
                fontSize: "1.2rem",
              }}
            >
              Xác nhận xóa ảnh
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Bạn có chắc chắn muốn xóa {imageToDelete?.title}?
          </Typography>

          {/* Cảnh báo khi xóa ảnh khắc phục cuối cùng */}
          {!isSupervisor &&
            imageToDelete?.type === "after" &&
            criterionImages.after.length === 1 && (
              <Box
                sx={{
                  mt: 2,
                  mb: 2,
                  bgcolor: "#fff3e0",
                  p: 2,
                  borderRadius: 1,
                  border: "1px solid #ffb74d",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <WarningIcon color="warning" />
                <Typography
                  sx={{
                    color: "warning.dark",
                    fontWeight: "medium",
                  }}
                >
                  Đây là ảnh khắc phục cuối cùng. Nếu xóa, tiêu chí này sẽ
                  chuyển về trạng thái chưa khắc phục.
                </Typography>
              </Box>
            )}

          {/* Thông báo không thể hoàn tác */}
          <Box
            sx={{
              mt: 2,
              bgcolor: "#ffebee",
              p: 2,
              borderRadius: 1,
              border: "1px solid #ef5350",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <ErrorOutlineIcon color="error" />
            <Typography
              variant="subtitle2"
              sx={{
                color: "#c62828",
                fontWeight: "bold",
              }}
            >
              Lưu ý: Hành động này không thể hoàn tác!
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setShowDeleteDialog(false)}
            variant="outlined"
            color="inherit"
            sx={{
              minWidth: 100,
              mr: 1,
              color: "grey.700",
              borderColor: "grey.400",
              "&:hover": {
                backgroundColor: "grey.100",
                borderColor: "grey.500",
              },
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={async () => {
              if (imageToDelete) {
                try {
                  // Nếu là user thường xóa ảnh khắc phục cuối cùng
                  if (
                    !isSupervisor &&
                    imageToDelete.type === "after" &&
                    criterionImages.after.length === 1
                  ) {
                    // Gọi API để cập nhật trạng thái tiêu chí thành chưa khắc phục
                    await axios.post(`${API_URL}/update-criterion-status`, {
                      phaseId,
                      departmentId: selectedDepartment.id,
                      criterionId: selectedCriterion.id,
                      status: false, // false = chưa khắc phục
                    });

                    // Cập nhật trạng thái local
                    setCriterionStatus("CHƯA KHẮC PHỤC");
                    setCriteriaStatuses((prev) => ({
                      ...prev,
                      [selectedCriterion.id]: "CHƯA KHẮC PHỤC",
                    }));

                    // Cập nhật allCategories để refresh trạng thái
                    setAllCategories((prevCategories) =>
                      prevCategories.map((category) => ({
                        ...category,
                        criteria: category.criteria.map((criterion) =>
                          criterion.id === selectedCriterion.id
                            ? {
                                ...criterion,
                                status_phase_details: "CHƯA KHẮC PHỤC",
                              }
                            : criterion
                        ),
                      }))
                    );
                  }

                  // Xóa ảnh
                  await axios.delete(
                    `${API_URL}/delete-image/${phaseId}/${selectedDepartment.id}/${selectedCriterion.id}/${imageToDelete.type}/${imageToDelete.index}`,
                    {
                      headers: {
                        "Content-Type": "application/json",
                      },
                    }
                  );

                  // Refresh images after deletion
                  await fetchCriterionImages(
                    selectedDepartment.id,
                    selectedCriterion.id
                  );
                  setShowDeleteDialog(false);
                  setShowPreviewDialog(false);
                } catch (error) {
                  console.error("Error deleting image:", error);
                  if (error.response) {
                    // Nếu server trả về lỗi
                    alert(
                      error.response.data.message ||
                        "Không thể xóa ảnh. Vui lòng thử lại."
                    );
                  } else if (error.request) {
                    // Nếu không nhận được response
                    alert(
                      "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng."
                    );
                  } else {
                    // Lỗi khác
                    alert("Có lỗi xảy ra. Vui lòng thử lại.");
                  }
                }
              }
            }}
            variant="contained"
            color="error"
            sx={{
              minWidth: 100,
              bgcolor: "error.main",
              "&:hover": {
                bgcolor: "error.dark",
              },
            }}
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DetailedPhasePage;
