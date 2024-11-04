// frontend/src/components/ViolationImages.js
import React, { useState, useEffect, Suspense } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Grid,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import axios from "axios";
import API_URL from "../data/api";

const LazyIframe = React.lazy(() =>
  Promise.resolve({
    default: ({ src, title }) => (
      <iframe
        src={src}
        width="300px"
        height="300px"
        allow="autoplay"
        style={{ border: "none" }}
        title={title}
      />
    ),
  })
);

const ViolationImages = ({ reportData }) => {
  const [violationImages, setViolationImages] = useState({});
  const [expandedWorkshop, setExpandedWorkshop] = useState(false);
  const [expandedDepartment, setExpandedDepartment] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState(false);

  const convertToIframeSrc = (url) => {
    if (!url) return null;
    const urls = url.split(";").map((u) => u.trim());
    return urls
      .map((url) => {
        if (url.includes("drive.google.com/file/d/")) {
          const fileId = url.match(/\/d\/(.*?)\/|\/d\/(.*?)$/);
          if (fileId) {
            return `https://drive.google.com/file/d/${
              fileId[1] || fileId[2]
            }/preview`;
          }
        }
        return url;
      })
      .filter(Boolean);
  };

  useEffect(() => {
    const fetchViolationImages = async () => {
      const imagesData = {};

      for (const workshop of reportData.workshops) {
        imagesData[workshop.workshopName] = {};

        for (const dept of workshop.departments) {
          imagesData[workshop.workshopName][dept.name_department] = {};
          let hasActivePhaseWithImages = false;

          for (const phase of reportData.phases) {
            const isDepartmentInactive =
              reportData.inactiveDepartments?.[phase.id_phase]?.[
                dept.id_department
              ];
            if (isDepartmentInactive) continue;

            try {
              const response = await axios.get(
                `${API_URL}/get-phase-details-images/${phase.id_phase}/${dept.id_department}`
              );

              if (Object.keys(response.data).length > 0) {
                imagesData[workshop.workshopName][dept.name_department][
                  phase.name_phase
                ] = response.data;
                hasActivePhaseWithImages = true;
              }
            } catch (error) {
              console.error("Error fetching images:", error);
            }
          }

          if (!hasActivePhaseWithImages) {
            delete imagesData[workshop.workshopName][dept.name_department];
          }
        }

        if (Object.keys(imagesData[workshop.workshopName]).length === 0) {
          delete imagesData[workshop.workshopName];
        }
      }

      setViolationImages(imagesData);
    };

    if (reportData?.workshops && reportData?.inactiveDepartments) {
      fetchViolationImages();
    }
  }, [reportData]);

  if (Object.keys(violationImages).length === 0) {
    return (
      <Box sx={{ width: "100%", mt: 4, mb: 4 }}>
        <Typography
          variant="h5"
          align="center"
          sx={{ fontWeight: "bold", mb: 2, mt: 4 }}
        >
          HÌNH ẢNH VI PHẠM TIÊU CHÍ
        </Typography>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="body1" align="center" color="text.secondary">
            Không có hình ảnh vi phạm nào
          </Typography>
        </Paper>
      </Box>
    );
  }

  const renderImages = (images, type) => {
    const urls = images ? convertToIframeSrc(images) : null;
    if (!urls) {
      return (
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                width: "300px",
                height: "300px",
                backgroundColor: "#f5f5f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px dashed #ccc",
                borderRadius: 1,
              }}
            >
              <Typography color="text.secondary" align="center">
                {type === "before"
                  ? "Không có ảnh vi phạm"
                  : "Không có ảnh khắc phục"}
              </Typography>
            </Box>
          </Box>
        </Grid>
      );
    }

    return urls.map((src, index) => (
      <Grid item xs={12} sm={6} md={3} key={index}>
        <Box sx={{ mb: 2 }}>
          <Suspense
            fallback={
              <Box
                sx={{
                  width: "300px",
                  height: "300px",
                  backgroundColor: "grey.100",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography>Đang tải...</Typography>
              </Box>
            }
          >
            <LazyIframe
              src={src}
              title={`${
                type === "before" ? "Ảnh vi phạm" : "Ảnh sau khắc phục"
              } ${index + 1}`}
            />
          </Suspense>
        </Box>
      </Grid>
    ));
  };

  return (
    <Box sx={{ width: "100%", mt: 4, mb: 4 }}>
      <Typography
        variant="h5"
        align="center"
        sx={{ fontWeight: "bold", mb: 2, mt: 4 }}
      >
        HÌNH ẢNH VI PHẠM TIÊU CHÍ
      </Typography>
      <Paper elevation={3} sx={{ p: 3 }}>
        {Object.entries(violationImages).map(
          ([workshopName, departments], workshopIndex) => (
            <Accordion
              key={workshopName}
              expanded={expandedWorkshop === workshopIndex}
              onChange={() =>
                setExpandedWorkshop(
                  expandedWorkshop === workshopIndex ? false : workshopIndex
                )
              }
              sx={{ mb: 2 }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: "primary.light",
                  "&:hover": {
                    backgroundColor: "primary.main",
                    color: "white",
                  },
                }}
              >
                <Typography sx={{ fontWeight: "bold" }}>
                  {workshopName}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {Object.entries(departments).map(
                  ([deptName, phases], deptIndex) => (
                    <Accordion
                      key={deptName}
                      expanded={
                        expandedDepartment === `${workshopIndex}-${deptIndex}`
                      }
                      onChange={() =>
                        setExpandedDepartment(
                          expandedDepartment === `${workshopIndex}-${deptIndex}`
                            ? false
                            : `${workshopIndex}-${deptIndex}`
                        )
                      }
                      sx={{ ml: 2, mb: 2 }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          backgroundColor: "secondary.light",
                          "&:hover": {
                            backgroundColor: "secondary.main",
                            color: "white",
                          },
                        }}
                      >
                        <Typography sx={{ fontWeight: "bold" }}>
                          {deptName}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {Object.entries(phases).map(
                          ([phaseName, criteriaImages], phaseIndex) => (
                            <Accordion
                              key={phaseName}
                              expanded={
                                expandedPhase ===
                                `${workshopIndex}-${deptIndex}-${phaseIndex}`
                              }
                              onChange={() =>
                                setExpandedPhase(
                                  expandedPhase ===
                                    `${workshopIndex}-${deptIndex}-${phaseIndex}`
                                    ? false
                                    : `${workshopIndex}-${deptIndex}-${phaseIndex}`
                                )
                              }
                              sx={{ ml: 2, mb: 2 }}
                            >
                              <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                sx={{ backgroundColor: "grey.100" }}
                              >
                                <Typography sx={{ fontWeight: "bold" }}>
                                  {phaseName}
                                </Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                {Object.entries(criteriaImages).map(
                                  ([criteriaId, images]) => (
                                    <Box key={criteriaId} sx={{ mb: 4 }}>
                                      <Typography
                                        sx={{
                                          backgroundColor: "grey.100",
                                          p: 2,
                                          borderRadius: 1,
                                          fontWeight: "bold",
                                          mb: 2,
                                        }}
                                      >
                                        {images.codename} -{" "}
                                        {images.criterionName}
                                      </Typography>

                                      <Box sx={{ mb: 3 }}>
                                        <Typography
                                          variant="subtitle2"
                                          sx={{
                                            fontWeight: "bold",
                                            color: "error.main",
                                            fontSize: 20,
                                            mb: 2,
                                          }}
                                        >
                                          Ảnh vi phạm:
                                        </Typography>
                                        <Grid container spacing={3}>
                                          {renderImages(
                                            images.before,
                                            "before"
                                          )}
                                        </Grid>
                                      </Box>

                                      <Box>
                                        <Typography
                                          variant="subtitle2"
                                          sx={{
                                            fontWeight: "bold",
                                            color: "success.main",
                                            fontSize: 20,
                                            mb: 2,
                                          }}
                                        >
                                          Ảnh sau khắc phục:
                                        </Typography>
                                        <Grid container spacing={3}>
                                          {renderImages(images.after, "after")}
                                        </Grid>
                                      </Box>
                                    </Box>
                                  )
                                )}
                              </AccordionDetails>
                            </Accordion>
                          )
                        )}
                      </AccordionDetails>
                    </Accordion>
                  )
                )}
              </AccordionDetails>
            </Accordion>
          )
        )}
      </Paper>
    </Box>
  );
};

export default ViolationImages;
