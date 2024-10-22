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
  const [dialogMode, setDialogMode] = useState("create"); // "create" or "edit"
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [phaseName, setPhaseName] = useState("");
  const [phases, setPhases] = useState([]);
  const [user, setUser] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [phaseToDelete, setPhaseToDelete] = useState(null);

  useEffect(() => {
    fetchPhases();
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
    } else {
      navigate("/");
    }
  }, [navigate]);

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
    setDialogMode(mode);
    setSelectedPhase(phase);
    setPhaseName(phase ? phase.name_phase : "");
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setPhaseName("");
    setSelectedPhase(null);
  };

  const handleSavePhase = async () => {
    if (phaseName.trim()) {
      try {
        if (dialogMode === "create") {
          const response = await fetch(`${API_URL}/phases`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name_phase: phaseName,
            }),
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
              body: JSON.stringify({
                name_phase: phaseName,
              }),
            }
          );

          if (response.ok) {
            setPhases(
              phases.map((phase) =>
                phase.id_phase === selectedPhase.id_phase
                  ? { ...phase, name_phase: phaseName }
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
    setPhaseToDelete(phase);
    setOpenDeleteDialog(true);
  };

  const handleDeletePhase = async () => {
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
              Quản lý đợt chấm điểm
            </Typography>
            {!isMobile && (
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
                    <Typography
                      variant={{ xs: "h6", sm: "h5" }}
                      gutterBottom={{ xs: true, sm: false }}
                    >
                      {phase.name_phase}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {/* <Typography variant="body2" color="text.secondary">
                        ID: {phase.id_phase}
                      </Typography> */}
                      <Typography variant="body2" color="text.secondary">
                        Ngày tạo:{" "}
                        {new Date(phase.date_recorded).toLocaleDateString()}
                      </Typography>
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

        {isMobile && (
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
            <TextField
              autoFocus
              margin="dense"
              label="Tên đợt chấm điểm"
              fullWidth
              variant="outlined"
              value={phaseName}
              onChange={(e) => setPhaseName(e.target.value)}
            />
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
