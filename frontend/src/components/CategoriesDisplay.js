// frontend/src/components/CategoriesDisplay.js
import React from "react";
import {
  Stack,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const CategoriesDisplay = ({
  categories,
  expandedCategories,
  onExpandCategory,
  failedCriteria,
  selectedDepartment,
  onCriterionClick,
  isMobile,
}) => {
  return (
    <Stack spacing={{ xs: 2, sm: 3, md: 4 }}>
      {/* Phần Hạng mục chấm điểm */}
      <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
        Hạng mục và tiêu chí chấm điểm
      </Typography>

      {/* Danh sách Accordion cho các hạng mục */}
      {categories.map((category) => (
        <Accordion
          key={category.id}
          sx={{ border: "1px solid black" }}
          expanded={expandedCategories.has(category.id)}
          onChange={() => onExpandCategory(category.id)}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`category-${category.id}-content`}
            id={`category-${category.id}-header`}
          >
            <Typography
              variant={isMobile ? "subtitle1" : "h6"}
              fontWeight="bold"
            >
              {category.name}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {category.criteria.map((criterion) => (
                <Grid item xs={12} sm={6} md={4} key={criterion.id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      cursor: "pointer",
                      "&:hover": { boxShadow: 6 },
                      border: failedCriteria[selectedDepartment?.id]?.has(
                        criterion.id
                      )
                        ? "2px solid #FF0000"
                        : "1px solid black",
                      backgroundColor: failedCriteria[
                        selectedDepartment?.id
                      ]?.has(criterion.id)
                        ? "#FFEBEE"
                        : "inherit",
                    }}
                    onClick={() => onCriterionClick(criterion)}
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
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: "block" }}
                      >
                        Mã: {criterion.codename}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
};

export default CategoriesDisplay;
