// frontend/src/pages/ScoringPage.js
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

const API_URL = "http://localhost:8081";

const ScoringPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [openDialog, setOpenDialog] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [phases, setPhases] = useState([]);

  useEffect(() => {
    fetchPhases();
  }, []);

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

  const generatePhaseId = () => {
    const lastPhase = phases[0];
    if (lastPhase) {
      const lastId = parseInt(lastPhase.id_phase.slice(2), 10);
      return `PH${String(lastId + 1).padStart(3, "0")}`;
    }
    return "PH001";
  };

  const handleCreatePhase = async () => {
    if (newPhaseName.trim()) {
      const newPhase = {
        id_phase: generatePhaseId(),
        name_phase: newPhaseName,
      };

      try {
        const response = await fetch(`${API_URL}/phases`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newPhase),
        });

        if (response.ok) {
          const savedPhase = await response.json();
          setPhases([savedPhase, ...phases]);
          setNewPhaseName("");
          setOpenDialog(false);
        } else {
          console.error("Failed to save new phase");
        }
      } catch (error) {
        console.error("Error saving new phase:", error);
      }
    }
  };

  const handleViewDetails = (phaseId) => {
    navigate(`/scoring-phases/${phaseId}`);
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
                onClick={() => setOpenDialog(true)}
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
                      <Typography variant="body2" color="text.secondary">
                        ID: {phase.id_phase}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Ngày tạo:{" "}
                        {new Date(phase.date_recorded).toLocaleDateString()}
                      </Typography>
                      <IconButton size="small" color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error">
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
            onClick={() => setOpenDialog(true)}
          >
            <AddIcon />
          </Fab>
        )}

        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              width: "100%",
              maxWidth: { xs: "100%", sm: 500 },
              m: { xs: 0, sm: 2 },
            },
          }}
        >
          <DialogTitle>Tạo đợt chấm điểm mới</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Tên đợt chấm điểm"
              fullWidth
              variant="outlined"
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
            <Button onClick={handleCreatePhase} variant="contained">
              Tạo
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default ScoringPage;
