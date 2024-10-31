// frontend/src/components/ViolationImages.js
import React, { useState, useEffect } from "react";
import { Paper, Typography, Box, Grid } from "@mui/material";
import axios from "axios";
import API_URL from "../data/api";

const ViolationImages = ({ reportData }) => {
  const [violationImages, setViolationImages] = useState({});

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

  const NoImagePlaceholder = ({ type }) => (
    <Box
      sx={{
        width: "400px",
        height: "400px",
        backgroundColor: "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px dashed #ccc",
        borderRadius: 1,
      }}
    >
      <Typography color="text.secondary" align="center">
        {type === "before" ? "Không có ảnh vi phạm" : "Không có ảnh khắc phục"}
      </Typography>
    </Box>
  );

  useEffect(() => {
    const fetchViolationImages = async () => {
      const imagesData = {};

      for (const workshop of reportData.workshops) {
        imagesData[workshop.workshopName] = {};

        for (const dept of workshop.departments) {
          imagesData[workshop.workshopName][dept.name_department] = {};

          for (const phase of reportData.phases) {
            try {
              const response = await axios.get(
                `${API_URL}/get-phase-details-images/${phase.id_phase}/${dept.id_department}`
              );

              if (Object.keys(response.data).length > 0) {
                imagesData[workshop.workshopName][dept.name_department][
                  phase.name_phase
                ] = response.data;
              }
            } catch (error) {
              console.error("Error fetching images:", error);
            }
          }

          // Nếu department không có ảnh nào, xóa department đó
          if (
            Object.keys(imagesData[workshop.workshopName][dept.name_department])
              .length === 0
          ) {
            delete imagesData[workshop.workshopName][dept.name_department];
          }
        }

        // Nếu workshop không có department nào có ảnh, xóa workshop đó
        if (Object.keys(imagesData[workshop.workshopName]).length === 0) {
          delete imagesData[workshop.workshopName];
        }
      }

      setViolationImages(imagesData);
    };

    if (reportData && reportData.workshops) {
      fetchViolationImages();
    }
  }, [reportData]);

  return (
    <Box sx={{ width: "100%", mt: 4, mb: 4 }}>
      <Typography
        variant="h5"
        align="center"
        sx={{ fontWeight: "bold", mb: 2, mt: 4 }}
      >
        ẢNH VI PHẠM TIÊU CHÍ
      </Typography>
      <Paper elevation={3} sx={{ p: 3 }}>
        {Object.entries(violationImages).map(([workshopName, departments]) => (
          <Box key={workshopName} sx={{ mb: 6 }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: "bold", mb: 4, color: "primary.main" }}
            >
              {workshopName}
            </Typography>

            {Object.entries(departments).map(([deptName, phases]) => (
              <Box key={deptName} sx={{ mb: 5, pl: 2 }}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: "bold", mb: 3, color: "secondary.main" }}
                >
                  {deptName}
                </Typography>

                {Object.entries(phases).map(([phaseName, criteriaImages]) => (
                  <Box key={phaseName} sx={{ mb: 4, pl: 2 }}>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: "bold", mb: 3, color: "text.primary" }}
                    >
                      {phaseName}
                    </Typography>

                    {Object.entries(criteriaImages).map(
                      ([criteriaId, images]) => (
                        <Box key={criteriaId} sx={{ mb: 5 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              backgroundColor: "#f5f5f5",
                              p: 2,
                              borderRadius: 1,
                              fontWeight: "bold",
                              mb: 2,
                            }}
                          >
                            {images.codename} - {images.criterionName}
                          </Typography>

                          <Grid container spacing={3}>
                            {/* Before Images */}
                            <Grid item xs={12} md={6}>
                              <Typography
                                variant="subtitle2"
                                fontWeight="bold"
                                color="error"
                                fontSize={20}
                              >
                                Ảnh vi phạm:
                              </Typography>
                              <Box sx={{ mt: 1 }}>
                                {images.before ? (
                                  convertToIframeSrc(images.before)?.map(
                                    (src, index) => (
                                      <Box key={index} sx={{ mb: 2 }}>
                                        <iframe
                                          src={src}
                                          width="400px"
                                          height="400px"
                                          allow="autoplay"
                                          style={{ border: "none" }}
                                          title={`Ảnh vi phạm ${index + 1} - ${
                                            images.criterionName
                                          } - ${deptName} - ${phaseName}`}
                                        />
                                      </Box>
                                    )
                                  )
                                ) : (
                                  <NoImagePlaceholder type="before" />
                                )}
                              </Box>
                            </Grid>

                            {/* After Images */}
                            <Grid item xs={12} md={6}>
                              <Typography
                                variant="subtitle2"
                                fontWeight="bold"
                                color="success.main"
                                fontSize={20}
                              >
                                Ảnh sau khắc phục:
                              </Typography>
                              <Box sx={{ mt: 1 }}>
                                {images.after ? (
                                  convertToIframeSrc(images.after)?.map(
                                    (src, index) => (
                                      <Box key={index} sx={{ mb: 2 }}>
                                        <iframe
                                          src={src}
                                          width="400px"
                                          height="400px"
                                          allow="autoplay"
                                          style={{ border: "none" }}
                                          title={`Ảnh sau khắc phục ${
                                            index + 1
                                          } - ${
                                            images.criterionName
                                          } - ${deptName} - ${phaseName}`}
                                        />
                                      </Box>
                                    )
                                  )
                                ) : (
                                  <NoImagePlaceholder type="after" />
                                )}
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      )
                    )}
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default ViolationImages;
