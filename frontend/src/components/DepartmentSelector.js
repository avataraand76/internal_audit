// frontend/src/components/DepartmentSelector.js
import React, { useState } from "react";
import {
  Box,
  Button,
  Menu,
  List,
  ListItemButton,
  Collapse,
  SwipeableDrawer,
  Typography,
  useTheme,
  useMediaQuery,
  styled,
} from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

const WorkshopText = styled(Typography)(({ theme }) => ({
  fontWeight: "bold",
  fontSize: "1.2rem",
  color: theme.palette.primary.main,
  textTransform: "uppercase",
  borderRadius: "4px",
  padding: "2px",
  display: "inline-block",
  margin: "2px",
}));

const DepartmentText = styled(Typography)(({ theme }) => ({
  fontSize: "0.9rem",
  // fontStyle: "italic",
  // color: theme.palette.text.secondary,
  color: "#000000",
  borderRadius: "4px",
  padding: "2px",
  display: "inline-block",
  margin: "2px",
}));

const DepartmentSelector = ({
  workshops,
  selectedDepartment,
  onDepartmentSelect,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [anchorEl, setAnchorEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openWorkshops, setOpenWorkshops] = useState({});

  const handleDepartmentClick = (event) => {
    if (isMobile) {
      setDrawerOpen(true);
    } else {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleDepartmentClose = () => {
    if (isMobile) {
      setDrawerOpen(false);
    } else {
      setAnchorEl(null);
    }
  };

  const handleWorkshopClick = (workshopId) => {
    setOpenWorkshops((prev) => {
      const newOpenWorkshops = { ...prev };
      Object.keys(newOpenWorkshops).forEach((key) => {
        if (key !== workshopId.toString()) {
          newOpenWorkshops[key] = false;
        }
      });
      newOpenWorkshops[workshopId] = !prev[workshopId];
      return newOpenWorkshops;
    });
  };

  const handleDepartmentSelect = (dept) => {
    onDepartmentSelect(dept);
    handleDepartmentClose();
  };

  const renderDepartmentMenuContent = () => (
    <List component="nav" dense>
      {workshops.map((workshop) => (
        <React.Fragment key={workshop.id}>
          <ListItemButton onClick={() => handleWorkshopClick(workshop.id)}>
            <WorkshopText>{workshop.name}</WorkshopText>
            {openWorkshops[workshop.id] ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse
            in={openWorkshops[workshop.id]}
            timeout="auto"
            unmountOnExit
          >
            <List component="div" disablePadding>
              {workshop.departments.map((dept) => (
                <ListItemButton
                  key={dept.id}
                  sx={{
                    pl: 4,
                    backgroundColor:
                      selectedDepartment && selectedDepartment.id === dept.id
                        ? theme.palette.action.selected
                        : "inherit",
                  }}
                  onClick={() => handleDepartmentSelect(dept)}
                >
                  <DepartmentText
                    sx={{
                      fontWeight:
                        selectedDepartment && selectedDepartment.id === dept.id
                          ? "bold"
                          : "normal",
                      // textDecoration:
                      //   selectedDepartment && selectedDepartment.id === dept.id
                      //     ? "underline"
                      //     : "none",
                      // color:
                      //   selectedDepartment && selectedDepartment.id === dept.id
                      //     ? "#000000"
                      //     : "inherit",
                      // border:
                      //   selectedDepartment && selectedDepartment.id === dept.id
                      //     ? "2px solid #1976d2"
                      //     : "2px solid transparent",
                    }}
                  >
                    {dept.name}
                  </DepartmentText>
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        </React.Fragment>
      ))}
    </List>
  );

  return (
    <Box>
      <Button
        variant="outlined"
        onClick={handleDepartmentClick}
        endIcon={<ArrowDropDownIcon />}
        sx={{
          borderRadius: "20px",
          textTransform: "none",
          minWidth: 200,
          justifyContent: "space-between",
        }}
      >
        {selectedDepartment ? selectedDepartment.name : "Chọn bộ phận"}
      </Button>

      {isMobile ? (
        <SwipeableDrawer
          anchor="right"
          open={drawerOpen}
          onClose={handleDepartmentClose}
          onOpen={() => setDrawerOpen(true)}
          disableSwipeToOpen={false}
          ModalProps={{
            keepMounted: true,
          }}
          PaperProps={{
            sx: {
              width: "75%",
              maxWidth: 300,
              height: "100%",
              top: "0 !important",
              borderBottomLeftRadius: "30px",
              borderTopLeftRadius: "30px",
              boxShadow: 3,
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Chọn bộ phận
            </Typography>
            {renderDepartmentMenuContent()}
          </Box>
        </SwipeableDrawer>
      ) : (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleDepartmentClose}
        >
          {renderDepartmentMenuContent()}
        </Menu>
      )}
    </Box>
  );
};

export default DepartmentSelector;
