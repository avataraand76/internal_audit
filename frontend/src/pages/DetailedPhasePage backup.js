// frontend/src/pages/DetailedPhasePage.js
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Typography,
  Container,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Header from "../components/Header";
import axios from "axios";
import API_URL from "../data/api";
import DepartmentSelector from "../components/DepartmentSelector";
import CategoriesDisplay from "../components/CategoriesDisplay";
import CriterionDialog from "../components/ImageHandler2";

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
  const [totalPoint, setTotalPoint] = useState(100);
  const [totalCriteria, setTotalCriteria] = useState({ total: 0 });
  const [failedCriteria, setFailedCriteria] = useState({});
  const [hasRedStar, setHasRedStar] = useState(false);
  const [hasAbsoluteKnockout, setHasAbsoluteKnockout] = useState(false);
  const [redStarCriteria, setRedStarCriteria] = useState([]);
  const [absoluteKnockoutCriteria, setAbsoluteKnockoutCriteria] = useState([]);

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
              <DepartmentSelector
                workshops={workshops}
                selectedDepartment={selectedDepartment}
                onDepartmentSelect={(dept) => {
                  setSelectedDepartment(dept);
                  setSearchTerm("");
                  setExpandedCategories(new Set());
                }}
              />
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
        <CategoriesDisplay
          categories={filteredCategories}
          expandedCategories={expandedCategories}
          onExpandCategory={(categoryId) => {
            setExpandedCategories((prev) => {
              const newExpanded = new Set(prev);
              if (newExpanded.has(categoryId)) {
                newExpanded.delete(categoryId);
              } else {
                newExpanded.add(categoryId);
              }
              return newExpanded;
            });
          }}
          failedCriteria={failedCriteria}
          selectedDepartment={selectedDepartment}
          onCriterionClick={handleCriterionClick}
          isMobile={isMobile}
        />
      </Container>

      {/* Dialog chi tiết tiêu chí */}
      <CriterionDialog
        open={openDialog}
        onClose={async (score) => {
          if (score) {
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
            await updateInfoCard();
          }
          setOpenDialog(false);
          setSelectedCriterion(null);
        }}
        criterion={selectedCriterion}
        selectedDepartment={selectedDepartment}
        failedCriteria={failedCriteria}
        phaseId={phaseId}
        user={user}
      />
    </Box>
  );
};

export default DetailedPhasePage;
