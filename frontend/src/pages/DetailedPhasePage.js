// frontend/src/pages/DetailedPhasePage.js
import React, { useState, useEffect } from "react";
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
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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
  const [phase, setPhase] = useState(null);
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCriterion, setSelectedCriterion] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [score, setScore] = useState(100);
  const [department, setDepartment] = useState(departments[0].name);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const getStarColor = (score) => {
    if (score >= 80) return "#4CAF50";
    return "#FF0000";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch phase details (bạn cần implement endpoint này)
        const phaseResponse = await axios.get(`${API_URL}/phases/${phaseId}`);
        setPhase(phaseResponse.data);

        // Fetch categories và criteria
        const categoriesResponse = await axios.get(`${API_URL}/categories`);
        setCategories(categoriesResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [phaseId]);

  const handleCriterionClick = (criterion) => {
    setSelectedCriterion(criterion);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCriterion(null);
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

  const handleDepartmentChange = (event) => {
    setDepartment(event.target.value);
    // Here you would typically fetch new data for the selected department
  };

  const handleBack = () => {
    navigate("/create-phase"); // Adjust this path according to your routing setup
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Header />
      <Container
        maxWidth="lg"
        sx={{ mt: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}
      >
        <Stack spacing={{ xs: 2, sm: 3, md: 4 }}>
          {/* Header với Back button, Title, và Department selector */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
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
            <Select
              value={department}
              onChange={handleDepartmentChange}
              sx={{ minWidth: 200 }}
            >
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.name}>
                  {dept.name}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Thẻ Thông tin chung */}
          <Card>
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
              <Box sx={{ mt: 2, display: "flex", alignItems: "center" }}>
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

          {/* Phần Hạng mục chấm điểm */}
          <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
            Hạng mục và tiêu chí chấm điểm
          </Typography>

          {/* Danh sách Accordion cho các hạng mục */}
          {filteredCategories.map((category) => (
            <Accordion key={category.id}>
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
