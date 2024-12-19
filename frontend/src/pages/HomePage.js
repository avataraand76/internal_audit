// frontend/src/pages/HomePage.js
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Box,
  Stack,
  Typography,
  useTheme,
  useMediaQuery,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Header from "../components/Header";
import axios from "axios";
import API_URL from "../data/api";
import moment from "moment";
import FilterAltIcon from "@mui/icons-material/FilterAlt";

function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [displayName, setDisplayName] = useState("");
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [departmentsWithoutRemediation, setDepartmentsWithoutRemediation] =
    useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(moment().format("M"));
  const [selectedYear, setSelectedYear] = useState(moment().format("YYYY"));
  const [filteredData, setFilteredData] = useState({});
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [availablePhases, setAvailablePhases] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [expandedPhases, setExpandedPhases] = useState(new Set());
  const [expandedWorkshops, setExpandedWorkshops] = useState({});

  useEffect(() => {
    const checkUserRole = async (userId) => {
      try {
        const supervisorResponse = await axios.get(
          `${API_URL}/check-supervisor/${userId}`
        );
        setIsSupervisor(supervisorResponse.data.isSupervisor);
      } catch (error) {
        console.error("Error checking user roles:", error);
      }
    };

    const fetchLatestPhaseData = async () => {
      try {
        // Fetch available dates first
        const datesResponse = await axios.get(`${API_URL}/available-dates`);
        const dates = datesResponse.data;

        // Extract unique years and months
        const years = [...new Set(dates.map((d) => d.year))];
        setAvailableYears(years);

        // Get all months for initial load
        const months = [...new Set(dates.map((d) => d.month.toString()))].sort(
          (a, b) => a - b
        );
        setAvailableMonths(months);

        // Fetch remediation data - thêm userId vào query params
        const storedUser = JSON.parse(localStorage.getItem("user"));
        const remediationResponse = await axios.get(
          `${API_URL}/departments-without-remediation/0?userId=${storedUser.id_user}`
        );
        setDepartmentsWithoutRemediation(remediationResponse.data);

        // Group data
        const grouped = remediationResponse.data.reduce((acc, item) => {
          if (!acc[item.name_phase]) {
            acc[item.name_phase] = {};
          }
          if (!acc[item.name_phase][item.name_workshop]) {
            acc[item.name_phase][item.name_workshop] = [];
          }
          acc[item.name_phase][item.name_workshop].push(item);
          return acc;
        }, {});
        setGroupedData(grouped);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      // Use ten_nv if available, otherwise fall back to name_user
      setDisplayName(storedUser.ten_nv || storedUser.name_user);
      checkUserRole(storedUser.id_user);
      fetchLatestPhaseData();
    } else {
      // Redirect to login if no user data is present
      navigate("/login");
    }
  }, [navigate]);

  // Update months when year changes
  useEffect(() => {
    if (selectedYear !== "all") {
      axios
        .get(`${API_URL}/available-dates`)
        .then((response) => {
          const dates = response.data;
          // Lọc tháng theo năm đã chọn
          const monthsForYear = dates
            .filter((d) => d.year.toString() === selectedYear)
            .map((d) => d.month.toString())
            .sort((a, b) => a - b);
          setAvailableMonths(monthsForYear);
        })
        .catch((error) => {
          console.error("Error fetching dates:", error);
        });
    } else {
      // Nếu chọn "Tất cả" năm, hiển thị tất cả các tháng
      axios
        .get(`${API_URL}/available-dates`)
        .then((response) => {
          const dates = response.data;
          const allMonths = [
            ...new Set(dates.map((d) => d.month.toString())),
          ].sort((a, b) => a - b);
          setAvailableMonths(allMonths);
        })
        .catch((error) => {
          console.error("Error fetching dates:", error);
        });
    }
  }, [selectedYear]);

  // Filter data when month, year or search term changes
  useEffect(() => {
    let filtered = { ...groupedData };

    // Filter by year and month
    if (selectedYear !== "all" || selectedMonth !== "all") {
      filtered = Object.entries(filtered).reduce(
        (acc, [phaseName, workshops]) => {
          const monthMatch = phaseName.match(/THÁNG (\d+)/i);
          const phaseMonth = monthMatch ? monthMatch[1] : null;
          const firstWorkshop = Object.values(workshops)[0];
          const firstItem = firstWorkshop[0];
          const phaseYear = firstItem?.date_recorded
            ? new Date(firstItem.date_recorded).getFullYear().toString()
            : null;

          const matchYear =
            selectedYear === "all" || phaseYear === selectedYear;
          const matchMonth =
            selectedMonth === "all" || phaseMonth === selectedMonth;

          if (matchYear && matchMonth) {
            acc[phaseName] = workshops;
          }
          return acc;
        },
        {}
      );
    }

    // Filter by specific phase
    if (selectedPhase !== "all") {
      filtered = Object.entries(filtered).reduce(
        (acc, [phaseName, workshops]) => {
          if (phaseName === selectedPhase) {
            acc[phaseName] = workshops;
          }
          return acc;
        },
        {}
      );
    }

    // Filter by department
    if (selectedDepartment !== "all") {
      filtered = Object.entries(filtered).reduce(
        (acc, [phaseName, workshops]) => {
          const filteredWorkshops = Object.entries(workshops).reduce(
            (wacc, [workshopName, departments]) => {
              const filteredDepts = departments.filter(
                (dept) => dept.name_department === selectedDepartment
              );
              if (filteredDepts.length > 0) {
                wacc[workshopName] = filteredDepts;
              }
              return wacc;
            },
            {}
          );

          if (Object.keys(filteredWorkshops).length > 0) {
            acc[phaseName] = filteredWorkshops;
          }
          return acc;
        },
        {}
      );
    }

    setFilteredData(filtered);
  }, [
    groupedData,
    selectedMonth,
    selectedYear,
    selectedPhase,
    selectedDepartment,
  ]);

  // Thêm hàm sortDepartments (copy từ ReportPage)
  const sortDepartments = useCallback((departments) => {
    return [...departments].sort((a, b) => {
      // Helper function to extract number from CHUYỀN
      const getChuyenInfo = (name) => {
        const match = name?.match(/CHUYỀN\s+(.+)/i);
        if (!match) return null;

        // Kiểm tra xem phần sau CHUYỀN có phải là số không
        const value = match[1];
        const numericValue = parseInt(value);
        return {
          isNumeric: !isNaN(numericValue),
          value: isNaN(numericValue) ? value : numericValue,
        };
      };

      const aInfo = getChuyenInfo(a);
      const bInfo = getChuyenInfo(b);

      // Nếu cả hai đều là CHUYỀN
      if (aInfo && bInfo) {
        // Nếu một cái là số và cái kia là chữ
        if (aInfo.isNumeric !== bInfo.isNumeric) {
          return aInfo.isNumeric ? -1 : 1; // Số đứng trước chữ
        }

        // Nếu cả hai đều là số hoặc cả hai đều là chữ
        if (aInfo.isNumeric) {
          return aInfo.value - bInfo.value; // So sánh số
        } else {
          return aInfo.value.localeCompare(bInfo.value); // So sánh chữ
        }
      }

      // Nếu chỉ một trong hai là CHUYỀN
      if (aInfo) return -1;
      if (bInfo) return 1;

      // Nếu không phải CHUYỀN thì sắp xếp theo alphabet
      return a.localeCompare(b);
    });
  }, []);

  // Sửa phần useEffect để sắp xếp departments theo workshop và theo thứ tự
  useEffect(() => {
    if (departmentsWithoutRemediation.length > 0) {
      let filteredItems = [...departmentsWithoutRemediation];

      // Lọc theo năm và tháng trước
      if (selectedYear !== "all") {
        filteredItems = filteredItems.filter(
          (item) => moment(item.date_recorded).format("YYYY") === selectedYear
        );
      }
      if (selectedMonth !== "all") {
        filteredItems = filteredItems.filter(
          (item) => moment(item.date_recorded).format("M") === selectedMonth
        );
      }

      // Lấy danh sách đợt từ dữ liệu đã lọc
      const phases = [...new Set(filteredItems.map((item) => item.name_phase))];
      setAvailablePhases(phases);

      // Lọc tiếp theo đợt nếu có
      if (selectedPhase !== "all") {
        filteredItems = filteredItems.filter(
          (item) => item.name_phase === selectedPhase
        );
      }

      // Nhóm departments theo workshop
      const departmentsByWorkshop = filteredItems.reduce((acc, item) => {
        if (!acc[item.id_workshop]) {
          acc[item.id_workshop] = new Set();
        }
        acc[item.id_workshop].add(item.name_department);
        return acc;
      }, {});

      // Sắp xếp departments trong từng workshop và gộp lại
      const sortedDepartments = Object.entries(departmentsByWorkshop)
        .sort(([idA], [idB]) => parseInt(idA) - parseInt(idB)) // Sort theo id_workshop
        .flatMap(([, departments]) => sortDepartments([...departments])); // Sort departments trong mỗi workshop

      setAvailableDepartments(sortedDepartments);
    }
  }, [
    departmentsWithoutRemediation,
    selectedYear,
    selectedMonth,
    selectedPhase,
    sortDepartments,
  ]);

  const handleDepartmentExpand = useCallback(
    (selectedDept, filteredDataInput) => {
      // Nếu chọn "Tất cả", mở tất cả các accordion
      if (selectedDept === "all") {
        const newExpandedPhases = new Set(Object.keys(filteredDataInput));
        const newExpandedWorkshops = {};

        Object.entries(filteredDataInput).forEach(([phaseName, workshops]) => {
          Object.keys(workshops).forEach((workshopName) => {
            newExpandedWorkshops[`${phaseName}-${workshopName}`] = true;
          });
        });

        return { phases: newExpandedPhases, workshops: newExpandedWorkshops };
      }

      // Logic cũ cho trường hợp chọn bộ phận cụ thể
      const newExpandedPhases = new Set();
      const newExpandedWorkshops = {};

      Object.entries(filteredDataInput).forEach(([phaseName, workshops]) => {
        Object.entries(workshops).forEach(([workshopName, departments]) => {
          const hasDepartment = departments.some(
            (dept) => dept.name_department === selectedDept
          );
          if (hasDepartment) {
            newExpandedPhases.add(phaseName);
            newExpandedWorkshops[`${phaseName}-${workshopName}`] = true;
          }
        });
      });

      return { phases: newExpandedPhases, workshops: newExpandedWorkshops };
    },
    []
  );

  useEffect(() => {
    const { phases, workshops } = handleDepartmentExpand(
      selectedDepartment,
      filteredData
    );
    setExpandedPhases(phases);
    setExpandedWorkshops(workshops);
  }, [selectedDepartment, filteredData, handleDepartmentExpand]);

  const handleClearFilters = () => {
    setSelectedMonth(moment().format("M"));
    setSelectedYear(moment().format("YYYY"));
    setSelectedPhase("all");
    setSelectedDepartment("all");
    setExpandedPhases(new Set());
    setExpandedWorkshops({});
  };

  // Reset selectedPhase và selectedDepartment khi thay đổi năm hoặc tháng
  useEffect(() => {
    setSelectedPhase("all");
    setSelectedDepartment("all");
  }, [selectedYear, selectedMonth]);

  const handlePhaseToggle = (phaseName) => {
    setExpandedPhases((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(phaseName)) {
        newExpanded.delete(phaseName);
      } else {
        newExpanded.add(phaseName);
      }
      return newExpanded;
    });
  };

  const handleWorkshopToggle = (workshopKey) => {
    setExpandedWorkshops((prev) => ({
      ...prev,
      [workshopKey]: !prev[workshopKey],
    }));
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Header />
      <Box
        sx={{
          p: { xs: 2, sm: 4 },
          maxWidth: "lg",
          mx: "auto",
        }}
      >
        <Stack
          spacing={{ xs: 2, sm: 3 }}
          alignItems="center"
          sx={{ mt: { xs: 2, sm: 4 } }}
        >
          <Typography
            variant={isMobile ? "h5" : "h4"}
            component="h1"
            textAlign="center"
          >
            Bạn đã đăng nhập thành công.
          </Typography>
          <Typography
            variant={isMobile ? "h5" : "h4"}
            component="h1"
            textAlign="center"
          >
            Xin chào {displayName}
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            width="100%"
            justifyContent="center"
          >
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate("/create-phase")}
              fullWidth={isMobile}
              sx={{
                minWidth: { xs: "100%", sm: "200px" },
                py: { xs: 1.5, sm: 2 },
              }}
            >
              {isSupervisor ? "Quản lý đợt chấm điểm" : "Xem đợt chấm điểm"}
            </Button>

            <Button
              variant="contained"
              color="success"
              onClick={() => navigate("/report")}
              fullWidth={isMobile}
              sx={{
                minWidth: { xs: "100%", sm: "200px" },
                py: { xs: 1.5, sm: 2 },
              }}
            >
              Báo cáo tổng hợp
            </Button>
          </Stack>

          {Object.keys(groupedData).length > 0 && (
            <Box sx={{ width: "100%", mt: 4 }}>
              <Typography
                variant="h6"
                component="h2"
                sx={{
                  mb: 2,
                  color: theme.palette.error.main,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <ErrorOutlineIcon />
                Danh sách bộ phận chưa tải ảnh khắc phục
              </Typography>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ mb: 3 }}
                alignItems={{ xs: "stretch", sm: "center" }}
                width="100%"
              >
                <Stack
                  direction={{ xs: "row", sm: "row" }}
                  spacing={2}
                  alignItems="center"
                  sx={{ width: "100%" }}
                >
                  <FormControl
                    sx={{
                      flex: 1,
                      minWidth: { xs: 0, sm: 120 },
                    }}
                  >
                    <InputLabel>Năm</InputLabel>
                    <Select
                      value={selectedYear}
                      label="Năm"
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      <MenuItem value="all">Tất cả</MenuItem>
                      {availableYears.map((year) => (
                        <MenuItem
                          key={year}
                          value={year.toString()}
                          sx={
                            year.toString() === moment().format("YYYY")
                              ? {
                                  fontWeight: "bold",
                                  backgroundColor: "action.hover",
                                }
                              : {}
                          }
                        >
                          {year}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl
                    sx={{
                      flex: 1,
                      minWidth: { xs: 0, sm: 120 },
                    }}
                  >
                    <InputLabel>Tháng</InputLabel>
                    <Select
                      value={selectedMonth}
                      label="Tháng"
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                      <MenuItem value="all">Tất cả</MenuItem>
                      {availableMonths.map((month) => (
                        <MenuItem
                          key={month}
                          value={month}
                          sx={
                            month === moment().format("M") &&
                            selectedYear === moment().format("YYYY")
                              ? {
                                  fontWeight: "bold",
                                  backgroundColor: "action.hover",
                                }
                              : {}
                          }
                        >
                          Tháng {month}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>

                <Stack
                  direction={{ xs: "row", sm: "row" }}
                  spacing={2}
                  alignItems="center"
                  sx={{ width: "100%" }}
                >
                  <FormControl
                    sx={{
                      flex: 1,
                      minWidth: { xs: 0, sm: 200 },
                    }}
                  >
                    <InputLabel>Đợt chấm điểm</InputLabel>
                    <Select
                      value={selectedPhase}
                      label="Đợt chấm điểm"
                      onChange={(e) => setSelectedPhase(e.target.value)}
                    >
                      <MenuItem value="all">Tất cả</MenuItem>
                      {availablePhases.map((phase) => (
                        <MenuItem key={phase} value={phase}>
                          {phase}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl
                    sx={{
                      flex: 1,
                      minWidth: { xs: 0, sm: 200 },
                    }}
                  >
                    <InputLabel>Bộ phận</InputLabel>
                    <Select
                      value={selectedDepartment}
                      label="Bộ phận"
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                    >
                      <MenuItem value="all">Tất cả</MenuItem>
                      {availableDepartments.map((dept) => (
                        <MenuItem key={dept} value={dept}>
                          {dept}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>

                <Button
                  startIcon={<FilterAltIcon />}
                  onClick={handleClearFilters}
                  variant="outlined"
                  fullWidth
                  sx={{
                    minWidth: 0,
                    width: "100%",
                  }}
                >
                  Xóa bộ lọc
                </Button>
              </Stack>

              {Object.entries(filteredData)
                .sort(([phaseNameA, workshopsA], [phaseNameB, workshopsB]) => {
                  // Lấy date_recorded của một item bất kỳ trong mỗi phase
                  const dateA =
                    workshopsA[Object.keys(workshopsA)[0]][0].date_recorded;
                  const dateB =
                    workshopsB[Object.keys(workshopsB)[0]][0].date_recorded;
                  // So sánh ngày tháng để sắp xếp (mới nhất lên đầu)
                  return new Date(dateB) - new Date(dateA);
                })
                .map(([phaseName, workshops]) => {
                  // Tính tổng số bộ phận và tiêu chí cho mỗi đợt
                  const phaseStats = Object.values(workshops).reduce(
                    (acc, departments) => {
                      const uniqueDepts = new Set(
                        departments.map((d) => d.name_department)
                      );
                      acc.totalDepartments += uniqueDepts.size;
                      acc.totalCriteria += departments.length;
                      return acc;
                    },
                    { totalDepartments: 0, totalCriteria: 0 }
                  );

                  return (
                    <Accordion
                      key={phaseName}
                      expanded={expandedPhases.has(phaseName)}
                      onChange={() => handlePhaseToggle(phaseName)}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          backgroundColor: theme.palette.primary.main,
                          color: "white",
                          "&:hover": {
                            backgroundColor: theme.palette.primary.dark,
                          },
                        }}
                      >
                        <Typography sx={{ fontWeight: "bold" }}>
                          {phaseName} ({phaseStats.totalCriteria} tiêu chí chưa
                          tải ảnh khắc phục)
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0 }}>
                        {Object.entries(workshops)
                          .sort(([, departmentsA], [, departmentsB]) => {
                            // Sort theo id_workshop
                            return (
                              departmentsA[0].id_workshop -
                              departmentsB[0].id_workshop
                            );
                          })
                          .map(([workshop, departments]) => {
                            const workshopKey = `${phaseName}-${workshop}`;
                            return (
                              <Accordion
                                key={workshopKey}
                                expanded={!!expandedWorkshops[workshopKey]}
                                onChange={() =>
                                  handleWorkshopToggle(workshopKey)
                                }
                              >
                                <AccordionSummary
                                  expandIcon={<ExpandMoreIcon />}
                                  sx={{
                                    backgroundColor: theme.palette.grey[100],
                                    "&:hover": {
                                      backgroundColor: theme.palette.grey[200],
                                    },
                                  }}
                                >
                                  <Typography sx={{ fontWeight: "bold" }}>
                                    {workshop} ({departments.length} tiêu chí
                                    chưa tải ảnh khắc phục)
                                  </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                  <List disablePadding>
                                    {/* Nhóm các tiêu chí theo bộ phận */}
                                    {Array.from(
                                      new Set(
                                        departments.map(
                                          (d) => d.name_department
                                        )
                                      )
                                    )
                                      .sort((a, b) => {
                                        // Sort theo thứ tự đã được sắp xếp trong availableDepartments
                                        return (
                                          availableDepartments.indexOf(a) -
                                          availableDepartments.indexOf(b)
                                        );
                                      })
                                      .map((deptName) => {
                                        const deptCriteria = departments.filter(
                                          (d) => d.name_department === deptName
                                        );

                                        return (
                                          <ListItem
                                            key={deptName}
                                            sx={{
                                              borderBottom: "1px solid",
                                              borderColor: "divider",
                                              flexDirection: "column",
                                              alignItems: "flex-start",
                                              py: 1,
                                            }}
                                          >
                                            <Typography
                                              variant="subtitle1"
                                              sx={{ fontWeight: "bold" }}
                                            >
                                              {deptName} ({deptCriteria.length}{" "}
                                              tiêu chí chưa tải ảnh khắc phục)
                                            </Typography>
                                            {deptCriteria.map(
                                              (criteria, idx) => (
                                                <ListItemText
                                                  key={idx}
                                                  secondary={
                                                    <React.Fragment>
                                                      <Typography
                                                        component="span"
                                                        variant="body2"
                                                        color="error"
                                                      >
                                                        {criteria.codename} -{" "}
                                                        {criteria.name_criteria}
                                                      </Typography>
                                                      <br />
                                                      <Typography
                                                        component="span"
                                                        variant="body2"
                                                        color="text.secondary"
                                                      >
                                                        Cập nhật:{" "}
                                                        {moment(
                                                          criteria.date_updated
                                                        ).format(
                                                          "DD/MM/YYYY HH:mm"
                                                        )}
                                                      </Typography>
                                                    </React.Fragment>
                                                  }
                                                />
                                              )
                                            )}
                                          </ListItem>
                                        );
                                      })}
                                  </List>
                                </AccordionDetails>
                              </Accordion>
                            );
                          })}
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

export default HomePage;
