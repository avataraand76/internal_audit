// frontend/src/pages/CreatePhasePage.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  Select,
  InputLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import Header from "../components/Header";
import API_URL from "../data/api";
import moment from "moment";

const CreatePhasePage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [phaseName, setPhaseName] = useState("");
  const [phases, setPhases] = useState([]);
  const [filteredPhases, setFilteredPhases] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [user, setUser] = useState(null);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [phaseToDelete, setPhaseToDelete] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchPhases();
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      checkUserRole(storedUser.id_user);
    } else {
      navigate("/");
    }
  }, [navigate]);

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

  const fetchPhases = async () => {
    try {
      const response = await fetch(`${API_URL}/phases`);
      if (response.ok) {
        const data = await response.json();
        setPhases(data); // Lưu trữ tất cả dữ liệu
      } else {
        console.error("Failed to fetch phases");
      }
    } catch (error) {
      console.error("Error fetching phases:", error);
    }
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
      phase && phase.time_limit_start
        ? phase.time_limit_start.split("T")[0]
        : ""
    );
    setEndDate(
      phase && phase.time_limit_end ? phase.time_limit_end.split("T")[0] : ""
    );
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setPhaseName("");
    setSelectedPhase(null);
    setStartDate("");
    setEndDate("");
  };

  const filterPhases = useCallback(
    (month) => {
      if (month === "all") {
        // Khi xem tất cả, chỉ hiển thị 3 tháng gần nhất
        const threeMonthsAgo = moment().subtract(3, "months");
        const filtered = phases.filter((phase) =>
          moment(phase.date_recorded).isAfter(threeMonthsAgo)
        );
        setFilteredPhases(filtered);
      } else {
        const filtered = phases.filter((phase) => {
          // Ensure we have a valid date
          if (!phase.date_recorded) return false;

          // Parse the date with moment to handle different date formats
          const phaseDate = moment(phase.date_recorded);
          if (!phaseDate.isValid()) return false;

          // Get month and convert both to strings for comparison
          const phaseMonth = phaseDate.format("M");

          // Debug logging
          console.log("Comparing:", {
            date: phase.date_recorded,
            phaseMonth: phaseMonth,
            selectedMonth: month,
            isMatch: phaseMonth === month,
          });

          return phaseMonth === month;
        });

        // Sort filtered phases by date in descending order
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

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
  };

  const handleSavePhase = async () => {
    if (!isSupervisor) return;
    if (phaseName.trim()) {
      try {
        // Standardize time to 07:00:00
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
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(phaseData),
          });

          if (response.ok) {
            const savedPhase = await response.json();
            setPhases([savedPhase, ...phases]);
          }
        } else if (dialogMode === "edit") {
          const response = await fetch(
            `${API_URL}/phases/${selectedPhase.id_phase}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(phaseData),
            }
          );

          if (response.ok) {
            setPhases(
              phases.map((phase) =>
                phase.id_phase === selectedPhase.id_phase
                  ? {
                      ...phase,
                      name_phase: phaseName,
                      time_limit_start: phaseData.time_limit_start,
                      time_limit_end: phaseData.time_limit_end,
                    }
                  : phase
              )
            );
          }
        }
        handleCloseDialog();
      } catch (error) {
        console.error("Error saving phase:", error);
      }
    }
  };

  const handleOpenDeleteDialog = (phase) => {
    if (!isSupervisor) return;
    setPhaseToDelete(phase);
    setOpenDeleteDialog(true);
  };

  const handleDeletePhase = async () => {
    if (!isSupervisor) return;
    if (phaseToDelete) {
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
        }
      } catch (error) {
        console.error("Error deleting phase:", error);
      }
      setOpenDeleteDialog(false);
      setPhaseToDelete(null);
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

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 } }}>
        <Stack spacing={{ xs: 2, sm: 3, md: 4 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
          >
            <div>
              <Typography
                variant={{ xs: "h5", sm: "h4", md: "h3" }}
                component="h1"
              >
                {isSupervisor ? "Quản lý đợt chấm điểm" : "Đợt chấm điểm"}
              </Typography>
              {/* <Typography
                variant="subtitle1"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                Hiển thị các đợt chấm điểm trong 3 tháng gần nhất
              </Typography> */}
            </div>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl variant="outlined" sx={{ minWidth: 120 }}>
                <InputLabel>Tháng</InputLabel>
                <Select
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
                </Select>
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
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenDeleteDialog(phase)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ flexWrap: "wrap", gap: 1 }}>
                    <Button
                      size={isMobile ? "small" : "medium"}
                      variant={isMobile ? "text" : "outlined"}
                      onClick={() => handleViewDetails(phase.id_phase)}
                    >
                      Xem chi tiết
                    </Button>
                  </CardActions>
                </Card>
              ))
            )}
          </Stack>
        </Stack>

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

        {/* Create/Edit Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          // fullScreen={isMobile}
          PaperProps={{
            sx: {
              width: "100%",
              maxWidth: { xs: "100%", sm: 500 },
              m: { xs: 0, sm: 2 },
            },
          }}
        >
          <DialogTitle>
            {dialogMode === "create"
              ? "Tạo đợt chấm điểm mới"
              : "Chỉnh sửa đợt chấm điểm"}
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
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Button onClick={handleCloseDialog}>Hủy</Button>
            <Button onClick={handleSavePhase} variant="contained">
              {dialogMode === "create" ? "Tạo" : "Lưu"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
        >
          <DialogTitle>Xác nhận xóa</DialogTitle>
          <DialogContent>
            <Typography>
              Bạn có chắc chắn muốn xóa đợt chấm điểm "
              {phaseToDelete?.name_phase}" không?
            </Typography>
          </DialogContent>
          <DialogActions>
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
      </Container>
    </>
  );
};

export default CreatePhasePage;
