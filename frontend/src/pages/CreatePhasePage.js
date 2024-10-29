// frontend/src/pages/CreatePhasePage.js
import React, { useState, useEffect, useCallback, memo } from "react";
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
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import Header from "../components/Header";
import API_URL from "../data/api";
import moment from "moment";

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
  }) => {
    // Hàm chuyển đổi tiếng Việt có dấu thành không dấu
    const removeVietnameseAccents = (str) => {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
    };

    // Convert departments array to react-select format
    const options = departments.reduce((acc, dept) => {
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
    }, []);

    // Convert selected departments to react-select format
    const selectedOptions = departments
      .filter((dept) => selectedInactiveDepartments.includes(dept.id))
      .map((dept) => ({
        value: dept.id,
        label: dept.name,
        normalizedLabel: removeVietnameseAccents(dept.name.toLowerCase()),
        workshop: dept.workshopName,
      }));

    const customStyles = {
      control: (base) => ({
        ...base,
        minHeight: 60,
        backgroundColor: "white",
      }),
      menu: (base) => ({
        ...base,
        zIndex: 9999,
      }),
      group: (base) => ({
        ...base,
        paddingTop: 8,
        paddingBottom: 8,
      }),
      groupHeading: (base) => ({
        ...base,
        fontWeight: "bold",
        fontSize: "1.25rem",
        color: "#2684ff",
        marginBottom: 8,
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
          ? "#2684ff"
          : state.isFocused
          ? "#deebff"
          : "white",
        ":active": {
          backgroundColor: "#b7d4ff",
        },
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
          <Stack direction="row" spacing={1} alignItems="center">
            <BusinessIcon />
            <Typography>Chọn bộ phận không hoạt động</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
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
            placeholder="Chọn bộ phận..."
            noOptionsMessage={() => "Không có bộ phận nào"}
            className="basic-multi-select"
            classNamePrefix="select"
            menuPlacement="auto"
            menuPosition="fixed"
            maxMenuHeight={300}
            isClearable={true}
            filterOption={(option, inputValue) =>
              customFilter(option.data, inputValue)
            }
          />
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
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [user, setUser] = useState(null);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [phaseToDelete, setPhaseToDelete] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedInactiveDepartments, setSelectedInactiveDepartments] =
    useState([]);
  const [openDepartmentDialog, setOpenDepartmentDialog] = useState(false);

  // Initial data fetching
  useEffect(() => {
    const initializePage = async () => {
      await fetchPhases();
      await fetchDepartments();
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser) {
        setUser(storedUser);
        await checkUserRole(storedUser.id_user);
      } else {
        navigate("/");
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

  // Check user role
  const checkUserRole = async (userId) => {
    try {
      // Kiểm tra xem user có trong tb_user_supervisor không
      const response = await fetch(`${API_URL}/check-supervisor/${userId}`);
      const data = await response.json();
      setIsSupervisor(data.isSupervisor);
    } catch (error) {
      console.error("Error checking user role:", error);
    }
  };

  // Fetch inactive departments
  const fetchInactiveDepartments = async (phaseId) => {
    try {
      const response = await fetch(
        `${API_URL}/inactive-departments/${phaseId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSelectedInactiveDepartments(
          data.filter((d) => d.is_inactive).map((d) => d.id_department)
        );
      }
    } catch (error) {
      console.error("Error fetching inactive departments:", error);
    }
  };

  // Filter phases by month
  const filterPhases = useCallback(
    (month) => {
      if (month === "all") {
        const threeMonthsAgo = moment().subtract(3, "months");
        const filtered = phases.filter((phase) =>
          moment(phase.date_recorded).isAfter(threeMonthsAgo)
        );
        setFilteredPhases(filtered);
      } else {
        const filtered = phases.filter((phase) => {
          if (!phase.date_recorded) return false;
          const phaseDate = moment(phase.date_recorded);
          return phaseDate.isValid() && phaseDate.format("M") === month;
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

  // Handlers
  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
  };

  const handlePhaseNameChange = (e) => {
    setPhaseName(e.target.value.toUpperCase());
  };

  const handleOpenDialog = (mode, phase = null) => {
    if (!isSupervisor) return;
    setDialogMode(mode);
    setSelectedPhase(phase);
    setPhaseName(phase ? phase.name_phase.toUpperCase() : "");
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
      const standardizeDate = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        date.setHours(7, 0, 0, 0);
        return date.toISOString();
      };

      const phaseData = {
        name_phase: phaseName.toUpperCase(),
        time_limit_start: standardizeDate(startDate),
        time_limit_end: standardizeDate(endDate),
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
    if (!isSupervisor || !phaseToDelete) return;

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
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
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
          >
            <Typography
              variant={{ xs: "h5", sm: "h4", md: "h3" }}
              component="h1"
            >
              {isSupervisor ? "Quản lý đợt chấm điểm" : "Đợt chấm điểm"}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl variant="outlined" sx={{ minWidth: 120 }}>
                <InputLabel>Tháng</InputLabel>
                <MuiSelect
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  label="Tháng"
                  size={isMobile ? "small" : "medium"}
                  startAdornment={
                    <FilterIcon
                      sx={{ mr: 1, ml: -0.5, color: "action.active" }}
                    />
                  }
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                    <MenuItem key={month} value={month.toString()}>
                      Tháng {month}
                    </MenuItem>
                  ))}
                </MuiSelect>
              </FormControl>
              {!isMobile && isSupervisor && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog("create")}
                  sx={{ minWidth: { sm: "200px" }, py: { sm: 1, md: 1.5 } }}
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
                          variant={{ xs: "h6", sm: "h5" }}
                          sx={{
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
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenDeleteDialog(phase)}
                              title="Xóa"
                            >
                              <DeleteIcon />
                            </IconButton>
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
                error={
                  endDate &&
                  startDate &&
                  new Date(endDate) < new Date(startDate)
                }
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
              disabled={
                !phaseName.trim() ||
                (endDate &&
                  startDate &&
                  new Date(endDate) < new Date(startDate))
              }
            >
              {dialogMode === "create" ? "Tạo" : "Lưu"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
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
              <Typography>Xác nhận xóa</Typography>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Hành động này không thể hoàn tác!
            </Alert>
            <Typography>
              Bạn có chắc chắn muốn xóa đợt chấm điểm "
              {phaseToDelete?.name_phase}" không?
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
        />
      </Container>
    </>
  );
};

export default CreatePhasePage;
