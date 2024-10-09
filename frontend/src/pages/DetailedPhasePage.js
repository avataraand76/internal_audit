// frontend/src/pages/DetailedPhasePage.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  MenuItem,
  IconButton,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Header from "../components/Header";
import axios from "axios";
import API_URL from "../data/api";

// Mock data for departments
const departments = [
  { id: 1, name: "Phòng Kỹ thuật" },
  { id: 2, name: "Phòng Kinh doanh" },
  { id: 3, name: "Phòng Nhân sự" },
  { id: 4, name: "Phòng Marketing" },
];

const DetailedPhasePage = () => {
  const { phaseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [phase, setPhase] = useState(null);
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCriterion, setSelectedCriterion] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [score, setScore] = useState(100);
  const [department, setDepartment] = useState(departments[0].name);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [anchorEl, setAnchorEl] = useState(null);
  const getStarColor = (score) => {
    if (score >= 80) return "#4CAF50";
    return "#FF0000";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch phase details
        const phaseResponse = await axios.get(`${API_URL}/phases/${phaseId}`);
        setPhase(phaseResponse.data);

        // Get user ID from location state
        const userId = location.state?.user?.id_user;

        if (!userId) {
          console.error("User ID not found");
          // Hiển thị thông báo lỗi cho người dùng
          alert("Không thể tải thông tin người dùng. Vui lòng đăng nhập lại.");
          navigate("/"); // Chuyển hướng đến trang đăng nhập
          return;
        }

        // Fetch categories and criteria for the specific user
        const categoriesResponse = await axios.get(
          `${API_URL}/categories/${userId}`
        );
        setCategories(categoriesResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        // Hiển thị thông báo lỗi chung
        alert("Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.");
      }
    };

    fetchData();
  }, [phaseId, location.state, navigate]);
  const handleCriterionClick = (criterion) => {
    setSelectedCriterion(criterion);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCriterion(null);
  };

  const handleDepartmentClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleDepartmentClose = () => {
    setAnchorEl(null);
  };

  const handleDepartmentSelect = (dept) => {
    setDepartment(dept.name);
    handleDepartmentClose();
    // Here you would typically fetch new data for the selected department
  };

  const handleScore = (score) => {
    // Here you would typically send the score to your backend
    console.log(`Scored criterion ${selectedCriterion.id} as ${score}`);
    handleCloseDialog();
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const criterionMatchesSearch = (criterion, searchLower) => {
    return (
      criterion.name.toLowerCase().includes(searchLower) ||
      criterion.codename.toLowerCase().includes(searchLower) ||
      criterion.description.toLowerCase().includes(searchLower)
    );
  };

  const categoryMatchesSearch = (category, searchLower) => {
    return category.name.toLowerCase().includes(searchLower);
  };
  const filteredCategories = categories
    .map((category) => ({
      ...category,
      criteria: category.criteria.filter((criterion) =>
        criterionMatchesSearch(criterion, searchTerm.toLowerCase())
      ),
    }))
    .filter(
      (category) =>
        categoryMatchesSearch(category, searchTerm.toLowerCase()) ||
        category.criteria.length > 0
    );

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
          position: "sticky",
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
              variant={isMobile ? "h5" : "h4"}
              component="h1"
              fontWeight="bold"
              sx={{ flexGrow: 1 }}
            >
              {phase?.name}
            </Typography>
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
              {department}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleDepartmentClose}
            >
              {departments.map((dept) => (
                <MenuItem
                  key={dept.id}
                  onClick={() => handleDepartmentSelect(dept)}
                >
                  {dept.name}
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Thẻ Thông tin chung */}
          <Card sx={{ mb: 2, border: "1px solid black" }}>
            <CardContent>
              <Typography
                variant={isMobile ? "h6" : "h5"}
                gutterBottom
                fontWeight="bold"
              >
                Thông tin chung
              </Typography>
              {/* <Typography variant={isMobile ? "body2" : "body1"}>
                Trạng thái: {phase?.status}
              </Typography>
              <Typography variant={isMobile ? "body2" : "body1"}>
                Thời gian: {phase?.startDate} - {phase?.endDate}
              </Typography> */}
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Typography
                  variant={isMobile ? "body2" : "body1"}
                  sx={{ mr: 1 }}
                >
                  Điểm: {score} - {department}
                </Typography>
                <StarIcon sx={{ color: getStarColor(score) }} />
              </Box>
            </CardContent>
          </Card>

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
            <Accordion key={category.id} sx={{ border: "1px solid black" }}>
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
                          border: "1px solid black",
                        }}
                        onClick={() => handleCriterionClick(criterion)}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography
                            gutterBottom
                            variant={isMobile ? "subtitle1" : "h6"}
                            component="div"
                            fontWeight="bold"
                          >
                            {criterion.name}
                          </Typography>
                          {/* <Typography
                            variant={isMobile ? "body2" : "body1"}
                            color="text.secondary"
                          >
                            {criterion.description}
                          </Typography> */}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 1, display: "block" }}
                          >
                            Mã: {criterion.codename}
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
        fullScreen={isMobile}
      >
        {selectedCriterion && (
          <>
            <DialogTitle>
              <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
                {selectedCriterion.name}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Mã: {selectedCriterion.codename}
              </Typography>
              <Typography variant={isMobile ? "body2" : "body1"} paragraph>
                {selectedCriterion.description}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog} color="inherit">
                Hủy
              </Button>
              <Button
                onClick={() =>
                  handleScore(
                    selectedCriterion.failingPointType === 1 ? "safe" : "unsafe"
                  )
                }
                variant="contained"
                color={
                  selectedCriterion.failingPointType === 1 ? "success" : "error"
                }
              >
                {selectedCriterion.failingPointType === 1 ? "Đạt" : "Không đạt"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default DetailedPhasePage;
