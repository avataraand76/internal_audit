// src/pages/ScoringPage.js
import React, { useState } from "react";
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

const scoringPhases = [
  {
    id: 1,
    name: "Đợt chấm điểm Quý 1/2024",
    status: "Đang diễn ra",
    startDate: "01/01/2024",
    endDate: "31/03/2024",
  },
  {
    id: 2,
    name: "Đợt chấm điểm Quý 4/2023",
    status: "Đã kết thúc",
    startDate: "01/10/2023",
    endDate: "31/12/2023",
  },
  {
    id: 3,
    name: "Đợt chấm điểm Quý 4/2023",
    status: "Đã kết thúc",
    startDate: "01/10/2023",
    endDate: "31/12/2023",
  },
];

const ScoringPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [openDialog, setOpenDialog] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [phases, setPhases] = useState(scoringPhases);

  const handleCreatePhase = () => {
    if (newPhaseName.trim()) {
      const newPhase = {
        id: phases.length + 1,
        name: newPhaseName,
        status: "Đang diễn ra",
        startDate: new Date().toLocaleDateString(),
        endDate: "-- / -- / ----",
      };
      setPhases([newPhase, ...phases]);
      setNewPhaseName("");
      setOpenDialog(false);
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
                sx={{
                  minWidth: { sm: "200px" },
                  py: { sm: 1, md: 1.5 },
                }}
              >
                Tạo đợt chấm điểm mới
              </Button>
            )}
          </Stack>

          <Stack spacing={{ xs: 2, sm: 3 }}>
            {phases.map((phase) => (
              <Card key={phase.id}>
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
                      {phase.name}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ display: { xs: "none", sm: "block" } }}
                      >
                        Trạng thái: {phase.status}
                      </Typography>
                      <IconButton size="small" color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: { xs: 1, sm: 0.5 },
                      display: { xs: "block", sm: "none" },
                    }}
                  >
                    Trạng thái: {phase.status}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    Thời gian: {phase.startDate} - {phase.endDate}
                  </Typography>
                </CardContent>
                <CardActions sx={{ flexWrap: "wrap", gap: 1 }}>
                  <Button
                    size={isMobile ? "small" : "medium"}
                    variant={isMobile ? "text" : "outlined"}
                    onClick={() => handleViewDetails(phase.id)}
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
