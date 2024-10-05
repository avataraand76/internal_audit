import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
} from "@mui/material";
import Header from "../components/Header";

// Mock data for scoring criteria
const scoringCriteria = [
  {
    id: 1,
    name: "Chất lượng công việc",
    description: "Đánh giá mức độ hoàn thành và chất lượng công việc được giao",
    details:
      "Xem xét các yếu tố như độ chính xác, tính đầy đủ, và hiệu quả của công việc được giao. Đánh giá khả năng đáp ứng deadline và chất lượng đầu ra của công việc.",
  },
  {
    id: 2,
    name: "Tinh thần làm việc",
    description: "Đánh giá thái độ, tinh thần trách nhiệm trong công việc",
    details:
      "Xem xét mức độ nhiệt tình, sự chủ động, và tinh thần trách nhiệm trong công việc. Đánh giá khả năng làm việc độc lập và sự sẵn sàng hỗ trợ đồng nghiệp.",
  },
  {
    id: 3,
    name: "Kỹ năng giao tiếp",
    description: "Đánh giá khả năng giao tiếp và làm việc nhóm",
    details:
      "Xem xét khả năng truyền đạt ý tưởng, lắng nghe và phản hồi. Đánh giá kỹ năng làm việc nhóm, khả năng hợp tác và giải quyết xung đột.",
  },
];

const DetailedScoringPhasePage = () => {
  const { phaseId } = useParams();
  const [phase, setPhase] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCriterion, setSelectedCriterion] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    // In a real application, you would fetch the phase details and criteria from an API
    // For now, we'll use fake data
    const phase = {
      id: phaseId,
      name: `Đợt chấm điểm ${phaseId}`,
      status: "Đang diễn ra",
      startDate: "01/01/2024",
      endDate: "31/03/2024",
    };
    setPhase(phase);
    setCriteria(scoringCriteria);
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

  if (!phase) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Header />
      <Container
        maxWidth="lg"
        sx={{
          mt: { xs: 2, sm: 4 },
          px: { xs: 2, sm: 3 },
        }}
      >
        <Stack spacing={{ xs: 2, sm: 3, md: 4 }}>
          <Typography
            variant={isMobile ? "h5" : "h4"}
            component="h1"
            fontWeight="bold"
          >
            {phase.name}
          </Typography>
          <Card>
            <CardContent>
              <Typography
                variant={isMobile ? "h6" : "h5"}
                gutterBottom
                fontWeight="bold"
              >
                Thông tin chung
              </Typography>
              <Typography variant={isMobile ? "body2" : "body1"}>
                Trạng thái: {phase.status}
              </Typography>
              <Typography variant={isMobile ? "body2" : "body1"}>
                Thời gian: {phase.startDate} - {phase.endDate}
              </Typography>
            </CardContent>
          </Card>
          <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
            Tiêu chí chấm điểm
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {criteria.map((criterion) => (
              <Grid item xs={12} sm={6} md={4} key={criterion.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    "&:hover": {
                      boxShadow: 6,
                    },
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
                    <Typography
                      variant={isMobile ? "body2" : "body1"}
                      color="text.secondary"
                    >
                      {criterion.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Container>

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
              <Typography variant={isMobile ? "body2" : "body1"} gutterBottom>
                {selectedCriterion.description}
              </Typography>
              <Typography variant={isMobile ? "body2" : "body1"} paragraph>
                {selectedCriterion.details}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={handleCloseDialog}
                color="inherit"
                sx={{
                  minWidth: { xs: 80, sm: 100 },
                  py: { xs: 1, sm: 1.5 },
                }}
              >
                Hủy
              </Button>
              <Button
                onClick={() => handleScore("không đạt")}
                variant="contained"
                color="error"
                sx={{
                  minWidth: { xs: 100, sm: 120 },
                  py: { xs: 1, sm: 1.5 },
                }}
              >
                Không đạt
              </Button>
              <Button
                onClick={() => handleScore("đạt")}
                variant="contained"
                color="success"
                sx={{
                  minWidth: { xs: 100, sm: 120 },
                  py: { xs: 1, sm: 1.5 },
                }}
              >
                Đạt
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default DetailedScoringPhasePage;
