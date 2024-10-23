// frontend/src/pages/CreatePhasePage.js
import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import Header from "../components/Header";
import API_URL from "../data/api";

const CreatePhasePage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [phaseName, setPhaseName] = useState("");
  const [phases, setPhases] = useState([]);
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
        setPhases(data);
      } else {
        console.error("Failed to fetch phases");
      }
    } catch (error) {
      console.error("Error fetching phases:", error);
    }
  };

  const handleOpenDialog = (mode, phase = null) => {
    if (!isSupervisor) return;
    setDialogMode(mode);
    setSelectedPhase(phase);
    setPhaseName(phase ? phase.name_phase : "");
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

  const handleSavePhase = async () => {
    if (!isSupervisor) return;
    if (phaseName.trim()) {
      try {
        const phaseData = {
          name_phase: phaseName,
          time_limit_start: startDate
            ? new Date(startDate).toISOString()
            : null,
          time_limit_end: endDate ? new Date(endDate).toISOString() : null,
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
            <Typography
              variant={{ xs: "h5", sm: "h4", md: "h3" }}
              component="h1"
            >
              {isSupervisor ? "Quản lý đợt chấm điểm" : "Các đợt chấm điểm"}
            </Typography>
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

          <Stack spacing={{ xs: 2, sm: 3 }}>
            {phases.map((phase) => (
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
            ))}
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
                onChange={(e) => setPhaseName(e.target.value)}
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
