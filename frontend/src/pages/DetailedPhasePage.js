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
  const [categories, setCategories] = useState([]);
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

        // Fetch phase details
        const phaseResponse = await axios.get(`${API_URL}/phases/${phaseId}`);
        setPhase(phaseResponse.data);

        // Fetch workshops and departments
        const workshopsResponse = await axios.get(`${API_URL}/workshops`);
        setWorkshops(workshopsResponse.data);
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
          const response = await axios.get(
            `${API_URL}/categories/${user.id_user}/${selectedDepartment.id}`
          );
          setCategories(response.data);
          // Reset expanded categories when changing department
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
  }, [selectedDepartment, user]);

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

  const handleCriterionClick = (criterion) => {
    setSelectedCriterion(criterion);
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
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant={isMobile ? "body2" : "body1"} sx={{ mr: 1 }}>
            Điểm: {hasAbsoluteKnockout ? 0 : totalPoint}% -{" "}
            {selectedDepartment ? selectedDepartment.name : "Chưa chọn bộ phận"}
          </Typography>
          <StarIcon
            sx={{
              color:
                hasRedStar || hasAbsoluteKnockout
                  ? "#FF0000"
                  : totalPoint >= 80
                  ? "#4CAF50"
                  : "#FF0000",
            }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          Số tiêu chí không đạt:{" "}
          {selectedDepartment ? totalCriteria[selectedDepartment.id] || 0 : 0} /{" "}
          {totalCriteria.total || 0}
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
      categories.forEach((category) => {
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
    if (!searchTerm.trim()) {
      return categories;
    }

    return categories
      .map((category) => ({
        ...category,
        criteria: category.criteria.filter((criterion) =>
          criterionMatchesSearch(criterion, searchTerm)
        ),
      }))
      .filter((category) => category.criteria.length > 0);
  }, [categories, searchTerm]);

  const handleScore = async (score) => {
    if (!selectedCriterion || !selectedDepartment || !user) {
      console.error("Missing required data for scoring");
      return;
    }

    const scoreData = {
      id_department: selectedDepartment.id,
      id_criteria: selectedCriterion.id,
      id_phase: phaseId,
      id_user: user.id_user,
      is_fail: score === "không đạt" ? 1 : 0,
      date_updated: new Date().toISOString(),
    };

    try {
      // First, save the score
      await axios.post(`${API_URL}/phase-details`, scoreData);

      // If the score is "không đạt" and there are images, upload them
      if (score === "không đạt" && selectedImages.length > 0) {
        const formData = new FormData();
        selectedImages.forEach((image, index) => {
          if (image.file) {
            formData.append("photos", image.file, image.name);
          } else {
            // For images captured by camera, we need to convert the dataURI to a file
            fetch(image.url)
              .then((res) => res.blob())
              .then((blob) => {
                const file = new File([blob], image.name, {
                  type: "image/jpeg",
                });
                formData.append("photos", file, image.name);
              });
          }
        });

        const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        console.log("Images uploaded successfully:", uploadResponse.data);

        // Save image URLs to the database
        const imageUrls = uploadResponse.data.mediaItems.map(
          (item) => item.productUrl
        );
        await axios.post(`${API_URL}/save-image-urls`, {
          id_department: selectedDepartment.id,
          id_criteria: selectedCriterion.id,
          id_phase: phaseId,
          imageUrls: imageUrls,
        });
      }

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

      handleCloseDialog();
    } catch (error) {
      console.error("Error saving score or uploading images:", error);
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
            placeholder="Tìm kiếm theo tên hạng mục, mã tiêu chí hoặc tên tiêu chí..."
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
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 1, display: "block" }}
                          >
                            Mã: {criterion.codename}
                          </Typography>
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

      {/* Dialog chi tiết tiêu chí */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        // fullScreen={isMobile}
      >
        {selectedCriterion && (
          <>
            <DialogTitle>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Mã: {selectedCriterion.codename}
              </Typography>
              <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
                {selectedCriterion.name}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Typography variant={isMobile ? "body2" : "body1"} paragraph>
                {selectedCriterion.description}
              </Typography>
              <ImageHandler
                onImagesChange={(updatedImages) => {
                  setSelectedImages(updatedImages);
                  // Thực hiện bất kỳ xử lý bổ sung nào cần thiết
                }}
                images={selectedImages}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog} color="inherit">
                Hủy
              </Button>
              {failedCriteria[selectedDepartment?.id]?.has(
                selectedCriterion.id
              ) ? (
                <Button
                  onClick={() => handleScore("đạt")}
                  variant="contained"
                  color="success"
                >
                  Đạt
                </Button>
              ) : (
                <Button
                  onClick={() => handleScore("không đạt")}
                  variant="contained"
                  color="error"
                >
                  Không đạt
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default DetailedPhasePage;
