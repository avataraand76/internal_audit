// frontend/src/pages/CreatePhasePage.js
import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactSelect from "react-select";
import {
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Container,
  useTheme,
  useMediaQuery,
  MenuItem,
  FormControl,
  Select as MuiSelect,
  InputLabel,
  Box,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  FilterAlt as FilterAltIcon,
} from "@mui/icons-material";
import Header from "../components/Header";
import API_URL from "../data/api";
import moment from "moment";
import axios from "axios";

// ResizeObserverWrapper
const ResizeObserverWrapper = memo(({ children }) => {
  const [ready, setReady] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setReady(true);
    return () => setReady(false);
  }, []);

  // Disable ResizeObserver on unmount
  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    const resizeObserver = new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        if (!Array.isArray(entries) || !entries.length) return;
      });
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: "100%" }}>
      {ready ? children : null}
    </div>
  );
});

// Thêm hàm sortDepartments trước DepartmentSelectionDialog component
const sortDepartments = (departments) => {
  return [...departments].sort((a, b) => {
    // Helper function to extract number from CHUYỀN
    const getChuyenInfo = (name) => {
      const match = name.toLowerCase().match(/chuyền\s+(.+)/i);
      if (!match) return null;

      // Kiểm tra xem phần sau CHUYỀN có phải là số không
      const value = match[1];
      const numericValue = parseInt(value);
      return {
        isNumeric: !isNaN(numericValue),
        value: isNaN(numericValue) ? value : numericValue,
      };
    };

    const aInfo = getChuyenInfo(a.label);
    const bInfo = getChuyenInfo(b.label);

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
    return a.label.localeCompare(b.label);
  });
};

// DepartmentSelectionDialog component
const DepartmentSelectionDialog = memo(
  ({
    open,
    onClose,
    departments,
    selectedInactiveDepartments,
    onDepartmentSelection,
    onSave,
    isMobile,
    selectedPhase,
    formatDate,
  }) => {
    const [menuPortalTarget, setMenuPortalTarget] = useState(null);
    const contentRef = useRef(null);

    useEffect(() => {
      if (open) {
        setMenuPortalTarget(document.body);
        return () => setMenuPortalTarget(null);
      }
    }, [open]);

    // Hàm chuyển đổi tiếng Việt có dấu thành không dấu
    const removeVietnameseAccents = (str) => {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
    };

    // Convert departments array to react-select format
    const options = departments
      .reduce((acc, dept) => {
        const workshop = dept.workshopName;
        if (!acc.find((group) => group.label === workshop)) {
          acc.push({
            label: workshop,
            options: [],
          });
        }
        const workshopGroup = acc.find((group) => group.label === workshop);
        workshopGroup.options.push({
          value: dept.id,
          label: dept.name,
          normalizedLabel: removeVietnameseAccents(dept.name.toLowerCase()),
          workshop: workshop,
        });
        return acc;
      }, [])
      .map((group) => ({
        ...group,
        options: sortDepartments(group.options),
      }));

    // Convert selected departments to react-select format
    const selectedOptions = departments
      .filter((dept) => selectedInactiveDepartments.includes(dept.id))
      .map((dept) => ({
        value: dept.id,
        label: dept.name,
        normalizedLabel: removeVietnameseAccents(dept.name.toLowerCase()),
        workshop: dept.workshopName,
      }));

    // GroupHeading component
    const GroupHeading = ({ children, ...props }) => {
      const workshop = props.data.label;
      const workshopDepartments = departments.filter(
        (dept) => dept.workshopName === workshop
      );
      const isAllSelected = workshopDepartments.every((dept) =>
        selectedInactiveDepartments.includes(dept.id)
      );

      const handleWorkshopClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const workshopDeptIds = workshopDepartments.map((dept) => dept.id);
        let newSelectedIds;

        if (isAllSelected) {
          newSelectedIds = selectedInactiveDepartments.filter(
            (id) => !workshopDeptIds.includes(id)
          );
        } else {
          newSelectedIds = [
            ...new Set([...selectedInactiveDepartments, ...workshopDeptIds]),
          ];
        }
        onDepartmentSelection(newSelectedIds);
      };

      return (
        <div
          style={{
            padding: "8px",
            cursor: "pointer",
            backgroundColor: isAllSelected ? "#e3f2fd" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "background-color 0.2s ease",
            userSelect: "none",
          }}
          onClick={handleWorkshopClick}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div
            style={{
              fontWeight: "bold",
              fontSize: "1.25rem",
              color: "#2684ff",
            }}
          >
            {children}
          </div>
          <div style={{ fontSize: "1rem", color: "#000" }}>
            Bấm để {isAllSelected ? "bỏ" : ""} chọn tất cả
          </div>
        </div>
      );
    };

    // Updated styles
    const customStyles = {
      control: (base) => ({
        ...base,
        minHeight: 60,
        backgroundColor: "white",
      }),
      menu: (base) => ({
        ...base,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        backgroundColor: "white",
      }),
      menuList: (base) => ({
        ...base,
        maxHeight: "300px",
        padding: "5px",
      }),
      menuPortal: (base) => ({
        ...base,
        zIndex: 9999,
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
          ? "#2684ff"
          : state.isFocused
          ? "#deebff"
          : "white",
        cursor: "pointer",
      }),
      group: (base) => ({
        ...base,
        paddingTop: 8,
        paddingBottom: 8,
      }),
      groupHeading: (base) => ({
        ...base,
        margin: 0,
        padding: 0,
      }),
      multiValue: (base) => ({
        ...base,
        backgroundColor: "#e3f2fd",
      }),
      multiValueLabel: (base) => ({
        ...base,
        color: "#1976d2",
      }),
      multiValueRemove: (base) => ({
        ...base,
        ":hover": {
          backgroundColor: "#F28B82",
          color: "#C02615",
        },
      }),
    };

    const customFilter = (option, searchText) => {
      if (!searchText) return true;

      // Chuẩn hóa chuỗi tìm kiếm
      const normalizedSearch = removeVietnameseAccents(
        searchText.toLowerCase()
      );

      // Kiểm tra cả chuỗi gốc và chuỗi không dấu
      return (
        option.label.toLowerCase().includes(searchText.toLowerCase()) || // Tìm kiếm bình thường
        option.normalizedLabel.includes(normalizedSearch) // Tìm kiếm không dấu
      );
    };

    return (
      <Dialog
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: "100%",
            maxWidth: { xs: "100%", sm: 600 },
            m: { xs: 0, sm: 2 },
          },
        }}
      >
        <DialogTitle>
          <Stack direction="column" spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <BusinessIcon />
              <Typography>Chọn bộ phận không hoạt động</Typography>
            </Stack>
            {selectedPhase && (
              <Typography variant="subtitle1" color="text.secondary">
                {selectedPhase.name_phase} -{" "}
                {formatDate(selectedPhase.date_recorded)}
              </Typography>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent ref={contentRef}>
          <Box sx={{ mt: 2 }}>
            <ResizeObserverWrapper>
              <ReactSelect
                isMulti
                options={options}
                value={selectedOptions}
                onChange={(selected) => {
                  const selectedIds = selected
                    ? selected.map((option) => option.value)
                    : [];
                  onDepartmentSelection(selectedIds);
                }}
                styles={customStyles}
                components={{
                  GroupHeading,
                }}
                menuPortalTarget={menuPortalTarget}
                menuPosition="fixed"
                menuPlacement="auto"
                placeholder="Chọn bộ phận..."
                noOptionsMessage={() => "Không có bộ phận nào"}
                className="basic-multi-select"
                classNamePrefix="select"
                filterOption={(option, inputValue) =>
                  customFilter(option.data, inputValue)
                }
              />
            </ResizeObserverWrapper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button onClick={onSave} variant="contained">
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
);

// Thêm hàm để tạo tên đợt tự động
const generatePhaseName = (phases) => {
  const currentMonth = moment().format("M");

  // Đếm số đợt trong tháng hiện tại
  const currentMonthPhases = phases.filter((phase) => {
    const phaseDate = moment(phase.date_recorded);
    return (
      phaseDate.format("M") === currentMonth &&
      phaseDate.format("YYYY") === moment().format("YYYY")
    );
  });

  // Số thứ tự của đợt mới sẽ là tổng số đợt + 1
  const nextOrder = currentMonthPhases.length + 1;

  return `THÁNG ${currentMonth} - ĐỢT ${nextOrder}`;
};

const CreatePhasePage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // States
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [phaseName, setPhaseName] = useState("");
  const [phases, setPhases] = useState([]);
  const [filteredPhases, setFilteredPhases] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(moment().format("M"));
  const [selectedYear, setSelectedYear] = useState(moment().format("YYYY"));
  const [user, setUser] = useState(null);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [phaseToDelete, setPhaseToDelete] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedInactiveDepartments, setSelectedInactiveDepartments] =
    useState([]);
  const [openDepartmentDialog, setOpenDepartmentDialog] = useState(false);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);

  // Initial data fetching
  useEffect(() => {
    const initializePage = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (!storedUser) {
          navigate("/");
          return;
        }
        setUser(storedUser);

        // Check all roles
        const [supervisorResponse, adminResponse] = await Promise.all([
          axios.get(`${API_URL}/check-supervisor/${storedUser.id_user}`),
          axios.get(`${API_URL}/check-admin/${storedUser.id_user}`),
        ]);

        setIsSupervisor(supervisorResponse.data.isSupervisor);
        setIsAdmin(adminResponse.data.isAdmin);

        await fetchPhases();
        await fetchDepartments();
      } catch (error) {
        console.error("Error initializing page:", error);
      }
    };

    initializePage();
  }, [navigate]);

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_URL}/workshops`);
      if (response.ok) {
        const data = await response.json();
        const allDepartments = data.reduce((acc, workshop) => {
          const departmentsWithWorkshop = workshop.departments.map((dept) => ({
            ...dept,
            workshopName: workshop.name,
            workshopId: workshop.id,
          }));
          return [...acc, ...departmentsWithWorkshop];
        }, []);
        setDepartments(allDepartments);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  // Fetch phases
  const fetchPhases = async () => {
    try {
      const response = await fetch(`${API_URL}/phases`);
      if (response.ok) {
        const data = await response.json();
        setPhases(data);
      }
    } catch (error) {
      console.error("Error fetching phases:", error);
    }
  };

  // Filter phases by month
  const filterPhases = useCallback(
    (month) => {
      const currentMonth = moment().format("M");
      const currentYear = moment().format("YYYY");

      if (month === "all") {
        const filtered = phases.filter((phase) => {
          const phaseDate = moment(phase.date_recorded);
          return (
            phaseDate.format("M") === currentMonth &&
            phaseDate.format("YYYY") === currentYear
          );
        });
        setFilteredPhases(filtered);
      } else {
        const filtered = phases.filter((phase) => {
          if (!phase.date_recorded) return false;
          const phaseDate = moment(phase.date_recorded);
          return (
            phaseDate.isValid() &&
            phaseDate.format("M") === month &&
            phaseDate.format("YYYY") === currentYear
          );
        });

        const sortedFiltered = [...filtered].sort(
          (a, b) =>
            moment(b.date_recorded).valueOf() -
            moment(a.date_recorded).valueOf()
        );
        setFilteredPhases(sortedFiltered);
      }
    },
    [phases]
  );

  useEffect(() => {
    filterPhases(selectedMonth);
  }, [filterPhases, selectedMonth]);

  const handlePhaseNameChange = (e) => {
    setPhaseName(e.target.value.toUpperCase());
  };

  const handleOpenDialog = (mode, phase = null) => {
    if (!isSupervisor) return;
    setDialogMode(mode);
    setSelectedPhase(phase);
    setPhaseName(
      phase ? phase.name_phase.toUpperCase() : generatePhaseName(phases)
    );
    setStartDate(
      phase?.time_limit_start ? phase.time_limit_start.split("T")[0] : ""
    );
    setEndDate(phase?.time_limit_end ? phase.time_limit_end.split("T")[0] : "");
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setPhaseName("");
    setSelectedPhase(null);
    setStartDate("");
    setEndDate("");
  };

  const handleSavePhase = async () => {
    if (!isSupervisor || !phaseName.trim()) return;

    try {
      const standardizeDate = (dateString, isEndDate = false) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        if (isEndDate) {
          date.setHours(23, 59, 59, 0); // Thời gian kết thúc: 23:59:59.999
        } else {
          date.setHours(0, 0, 0, 0); // Thời gian bắt đầu: 00:00:00.000
        }
        return date.toISOString();
      };

      const phaseData = {
        name_phase: phaseName.toUpperCase(),
        time_limit_start: standardizeDate(startDate, false), // isEndDate = false
        time_limit_end: standardizeDate(endDate, true), // isEndDate = true
      };

      if (dialogMode === "create") {
        const response = await fetch(`${API_URL}/phases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(phaseData),
        });

        if (response.ok) {
          const savedPhase = await response.json();
          setPhases([savedPhase, ...phases]);
          filterPhases(selectedMonth);
        }
      } else {
        const response = await fetch(
          `${API_URL}/phases/${selectedPhase.id_phase}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(phaseData),
          }
        );

        if (response.ok) {
          setPhases(
            phases.map((phase) =>
              phase.id_phase === selectedPhase.id_phase
                ? { ...phase, ...phaseData }
                : phase
            )
          );
          filterPhases(selectedMonth);
        }
      }
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving phase:", error);
    }
  };

  const handleOpenDeleteDialog = (phase) => {
    if (!isSupervisor) return;
    setPhaseToDelete(phase);
    setOpenDeleteDialog(true);
  };

  const handleDeletePhase = async () => {
    if (!isAdmin) return;

    try {
      const response = await fetch(
        `${API_URL}/phases/${phaseToDelete.id_phase}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setPhases(
          phases.filter((phase) => phase.id_phase !== phaseToDelete.id_phase)
        );
        filterPhases(selectedMonth);
      }
    } catch (error) {
      console.error("Error deleting phase:", error);
    }
    setOpenDeleteDialog(false);
    setPhaseToDelete(null);
  };

  const handleDepartmentSelection = (selectedIds) => {
    setSelectedInactiveDepartments(selectedIds);
  };

  const handleSaveInactiveDepartments = async () => {
    try {
      const response = await fetch(
        `${API_URL}/inactive-departments/${selectedPhase.id_phase}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inactiveDepartments: selectedInactiveDepartments,
          }),
        }
      );

      if (response.ok) {
        setOpenDepartmentDialog(false);
      }
    } catch (error) {
      console.error("Error saving inactive departments:", error);
    }
  };

  const handleViewDetails = (phaseId) => {
    navigate(`/scoring-phases/${phaseId}`, { state: { user } });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return moment(dateString).format("DD/MM/YYYY");
  };

  // Move fetchInactiveDepartments inside component
  const fetchInactiveDepartments = async (phaseId) => {
    try {
      const response = await axios.get(
        `${API_URL}/inactive-departments/${phaseId}`
      );
      if (response.data) {
        setSelectedInactiveDepartments(
          response.data
            .filter((d) => d.is_inactive === 1)
            .map((d) => d.id_department)
        );
      }
    } catch (error) {
      console.error("Error fetching inactive departments:", error);
    }
  };

  // Thêm useEffect để fetch available dates
  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        const response = await axios.get(`${API_URL}/available-dates`);
        const dates = response.data;

        // Extract unique years
        const years = [...new Set(dates.map((d) => d.year))];
        setAvailableYears(years);

        // Get months for selected year
        const monthsForYear = dates
          .filter((d) => d.year.toString() === selectedYear)
          .map((d) => d.month.toString())
          .sort((a, b) => a - b);
        setAvailableMonths(monthsForYear);
      } catch (error) {
        console.error("Error fetching available dates:", error);
      }
    };

    fetchAvailableDates();
  }, [selectedYear]);

  // Sửa lại phần filter phases
  useEffect(() => {
    if (phases.length > 0) {
      let filtered = [...phases];

      // Luôn filter theo năm và tháng hiện tại khi khởi tạo
      filtered = filtered.filter((phase) => {
        const phaseYear = moment(phase.date_recorded).format("YYYY");
        const phaseMonth = moment(phase.date_recorded).format("M");

        const yearMatch = selectedYear === "all" || phaseYear === selectedYear;
        const monthMatch =
          selectedMonth === "all" || phaseMonth === selectedMonth;

        return yearMatch && monthMatch;
      });

      setFilteredPhases(filtered);
    }
  }, [phases, selectedMonth, selectedYear]);

  // Thêm useEffect để tự động chọn tháng khi component mount
  useEffect(() => {
    const currentMonth = moment().format("M");
    const currentYear = moment().format("YYYY");

    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
  }, []); // Chỉ chạy 1 lần khi component mount

  // Thêm hàm handleClearFilters
  const handleClearFilters = () => {
    setSelectedMonth(moment().format("M"));
    setSelectedYear(moment().format("YYYY"));
  };

  // JSX
  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 } }}>
        <Stack spacing={{ xs: 2, sm: 3, md: 4 }}>
          {/* Header Section */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
            width="100%"
          >
            {/* Tiêu đề bên trái */}
            <Typography
              variant="h4"
              component="h1"
              sx={{
                typography: {
                  xs: "h5",
                  sm: "h4",
                  md: "h3",
                },
              }}
            >
              {isSupervisor ? "Quản lý đợt chấm điểm" : "Đợt chấm điểm"}
            </Typography>

            {/* Controls bên phải */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              {/* Stack cho năm và tháng */}
              <Stack
                direction={{ xs: "row", sm: "row" }}
                spacing={2}
                alignItems="center"
                sx={{ width: "100%" }}
              >
                <FormControl
                  variant="outlined"
                  sx={{
                    flex: 1,
                    minWidth: { xs: 0, sm: 120 },
                  }}
                >
                  <InputLabel>Năm</InputLabel>
                  <MuiSelect
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    label="Năm"
                    size={isMobile ? "small" : "medium"}
                  >
                    <MenuItem value="all">Tất cả</MenuItem>
                    {availableYears.map((year) => (
                      <MenuItem
                        key={year}
                        value={year.toString()}
                        sx={
                          year.toString() === moment().format("YYYY")
                            ? {
                                fontWeight: "bold",
                                backgroundColor: "action.hover",
                              }
                            : {}
                        }
                      >
                        {year}
                      </MenuItem>
                    ))}
                  </MuiSelect>
                </FormControl>

                <FormControl
                  variant="outlined"
                  sx={{
                    flex: 1,
                    minWidth: { xs: 0, sm: 120 },
                  }}
                >
                  <InputLabel>Tháng</InputLabel>
                  <MuiSelect
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    label="Tháng"
                    size={isMobile ? "small" : "medium"}
                  >
                    <MenuItem value="all">Tất cả</MenuItem>
                    {availableMonths.map((month) => (
                      <MenuItem
                        key={month}
                        value={month}
                        sx={
                          month === moment().format("M") &&
                          selectedYear === moment().format("YYYY")
                            ? {
                                fontWeight: "bold",
                                backgroundColor: "action.hover",
                              }
                            : {}
                        }
                      >
                        Tháng {month}
                      </MenuItem>
                    ))}
                  </MuiSelect>
                </FormControl>
              </Stack>

              {/* Nút xóa bộ lọc */}
              <Button
                startIcon={<FilterAltIcon />}
                onClick={handleClearFilters}
                variant="outlined"
                fullWidth
                sx={{
                  minWidth: 0,
                  width: "100%",
                }}
              >
                Xóa bộ lọc
              </Button>

              {/* Nút tạo đợt chấm điểm */}
              {!isMobile && isSupervisor && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog("create")}
                  sx={{
                    minWidth: { sm: "200px" },
                    py: { sm: 1, md: 1.5 },
                  }}
                >
                  Tạo đợt chấm điểm mới
                </Button>
              )}
            </Stack>
          </Stack>

          {/* Phases List */}
          <Stack spacing={{ xs: 2, sm: 3 }}>
            {filteredPhases.length === 0 ? (
              <Card>
                <CardContent>
                  <Typography align="center" color="text.secondary">
                    Không có đợt chấm điểm nào trong tháng này
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              filteredPhases.map((phase) => (
                <Card key={phase.id_phase}>
                  <CardContent>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      spacing={{ xs: 1, sm: 0 }}
                    >
                      <Stack spacing={1}>
                        <Typography
                          variant="h5"
                          sx={{
                            typography: { xs: "h6", sm: "h5" },
                            fontSize: { xs: "1.5rem", sm: "2rem" },
                            fontWeight: "bold",
                            mb: 1,
                          }}
                        >
                          {phase.name_phase}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Ngày tạo: {formatDate(phase.date_recorded)}
                        </Typography>
                        {phase.time_limit_start && phase.time_limit_end && (
                          <Typography variant="body2" color="text.secondary">
                            Thời hạn khắc phục:{" "}
                            {formatDate(phase.time_limit_start)} -{" "}
                            {formatDate(phase.time_limit_end)}
                          </Typography>
                        )}
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {isSupervisor && (
                          <>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenDialog("edit", phase)}
                              title="Chỉnh sửa"
                            >
                              <EditIcon />
                            </IconButton>
                            {isAdmin && (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleOpenDeleteDialog(phase)}
                                title="Xóa"
                              >
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ flexWrap: "wrap", gap: 1, px: 2, pb: 2 }}>
                    <Button
                      size={isMobile ? "small" : "medium"}
                      variant="contained"
                      onClick={() => handleViewDetails(phase.id_phase)}
                      sx={{
                        minWidth: { xs: "100%", sm: "auto" },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        whiteSpace: { xs: "nowrap", sm: "normal" },
                        typography: {
                          xs: "caption",
                          sm: "button",
                        },
                        py: { xs: 1, sm: 1.5 },
                        px: { xs: 2, sm: 3 },
                      }}
                    >
                      Xem chi tiết
                    </Button>
                    {isSupervisor && (
                      <Button
                        size={isMobile ? "small" : "medium"}
                        variant="outlined"
                        startIcon={<BusinessIcon />}
                        onClick={() => {
                          setSelectedPhase(phase);
                          fetchInactiveDepartments(phase.id_phase);
                          setOpenDepartmentDialog(true);
                        }}
                        sx={{
                          minWidth: { xs: "100%", sm: "auto" },
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          whiteSpace: { xs: "nowrap", sm: "normal" },
                          typography: {
                            xs: "caption",
                            sm: "button",
                          },
                          py: { xs: 1, sm: 1.5 },
                          px: { xs: 2, sm: 3 },
                          marginLeft: "0px !important",
                        }}
                      >
                        {isMobile
                          ? "BỘ PHẬN KHÔNG HĐ"
                          : "BỘ PHẬN KHÔNG HOẠT ĐỘNG"}
                      </Button>
                    )}
                  </CardActions>
                </Card>
              ))
            )}
          </Stack>
        </Stack>

        {/* Floating Action Button for mobile */}
        {isMobile && isSupervisor && (
          <Fab
            color="primary"
            sx={{
              position: "fixed",
              bottom: 16,
              right: 16,
              zIndex: theme.zIndex.fab,
            }}
            onClick={() => handleOpenDialog("create")}
          >
            <AddIcon />
          </Fab>
        )}

        {/* Create/Edit Phase Dialog */}
        <Dialog
          // fullScreen={isMobile}
          open={openDialog}
          onClose={handleCloseDialog}
          PaperProps={{
            sx: {
              width: "100%",
              maxWidth: { xs: "100%", sm: 500 },
              m: { xs: 0, sm: 2 },
            },
          }}
        >
          <DialogTitle>
            <Stack direction="row" spacing={1} alignItems="center">
              {dialogMode === "create" ? <AddIcon /> : <EditIcon />}
              <Typography>
                {dialogMode === "create"
                  ? "Tạo đợt chấm điểm mới"
                  : "Chỉnh sửa đợt chấm điểm"}
              </Typography>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                autoFocus
                margin="dense"
                label="Tên đợt chấm điểm"
                fullWidth
                variant="outlined"
                value={phaseName}
                onChange={handlePhaseNameChange}
                inputProps={{
                  style: { textTransform: "uppercase" },
                }}
                required
                error={!phaseName.trim()}
                helperText={
                  !phaseName.trim() && "Vui lòng nhập tên đợt chấm điểm"
                }
              />
              <TextField
                type="date"
                label="Ngày bắt đầu khắc phục"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                fullWidth
                variant="outlined"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="date"
                label="Ngày kết thúc khắc phục"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                fullWidth
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: startDate }}
                error={Boolean(
                  endDate &&
                    startDate &&
                    new Date(endDate) < new Date(startDate)
                )}
                helperText={
                  endDate &&
                  startDate &&
                  new Date(endDate) < new Date(startDate) &&
                  "Ngày kết thúc phải sau ngày bắt đầu"
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Button onClick={handleCloseDialog}>Hủy</Button>
            <Button
              onClick={handleSavePhase}
              variant="contained"
              disabled={Boolean(
                !phaseName.trim() ||
                  (endDate &&
                    startDate &&
                    new Date(endDate) < new Date(startDate))
              )}
            >
              {dialogMode === "create" ? "Tạo" : "Lưu"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          // fullScreen={isMobile}
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
          PaperProps={{
            sx: {
              width: "100%",
              maxWidth: { xs: "100%", sm: 400 },
              m: { xs: 0, sm: 2 },
            },
          }}
        >
          <DialogTitle>
            <Stack direction="row" spacing={1} alignItems="center">
              <DeleteIcon color="error" />
              <Typography
                sx={{
                  color: "error.main",
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                }}
              >
                Xác nhận xóa đợt
              </Typography>
            </Stack>
          </DialogTitle>
          <DialogContent>
            {/* <Alert severity="warning" sx={{ mb: 2 }}>
              Hành động này không thể hoàn tác!
            </Alert> */}
            <Box
              sx={{
                mb: 2,
                bgcolor: "#ffebee",
                p: 2,
                borderRadius: 1,
                border: "1px solid #ef5350",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  color: "#c62828",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                Lưu ý: Hành động này không thể hoàn tác!
              </Typography>
            </Box>
            <Typography>
              Bạn có chắc chắn muốn xóa đợt chấm điểm "
              {phaseToDelete?.name_phase} -{" "}
              {formatDate(phaseToDelete?.date_recorded)}" không?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenDeleteDialog(false)}>Hủy</Button>
            <Button
              onClick={handleDeletePhase}
              color="error"
              variant="contained"
            >
              Xóa
            </Button>
          </DialogActions>
        </Dialog>

        {/* Department Selection Dialog */}
        <DepartmentSelectionDialog
          open={openDepartmentDialog}
          onClose={() => {
            setOpenDepartmentDialog(false);
            // Reset selected departments when closing without saving
            fetchInactiveDepartments(selectedPhase?.id_phase);
          }}
          departments={departments}
          selectedInactiveDepartments={selectedInactiveDepartments}
          onDepartmentSelection={handleDepartmentSelection}
          onSave={handleSaveInactiveDepartments}
          isMobile={isMobile}
          selectedPhase={selectedPhase}
          formatDate={formatDate}
        />
      </Container>
    </>
  );
};

export default CreatePhasePage;
