// frontend/src/components/ViolationImages.js
import React, { useState, useEffect, useRef } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Grid,
  Paper,
  Button,
  ButtonGroup,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CollectionsIcon from "@mui/icons-material/Collections";
import axios from "axios";
import API_URL from "../data/api";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";

// Component ImageFrame cho việc hiển thị ảnh
const ImageFrame = ({ src, title, type }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Thêm hàm chuyển đổi URL cho nút phóng to
  const convertToGoogleDriveViewUrl = (url) => {
    if (!url) return null;
    if (url.includes("drive.google.com/file/d/")) {
      const fileId = url.match(/\/d\/(.*?)\/|\/d\/(.*?)$/);
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId[1] || fileId[2]}/view`;
      }
    }
    return url;
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
      }
    );

    const element = document.getElementById(`frame-${src}`);
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [src]);

  if (!src) {
    return (
      <Box
        sx={{
          width: "300px",
          height: "300px",
          backgroundColor: "grey.100",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 1,
          border: "1px dashed rgba(0, 0, 0, 0.2)",
        }}
      >
        <Typography color="text.secondary">
          {type === "before"
            ? "Không có hình ảnh vi phạm"
            : "Không có hình ảnh khắc phục"}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      id={`frame-${src}`}
      sx={{
        width: "300px",
        height: "300px",
        backgroundColor: "grey.100",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      {!isVisible ? (
        <Typography>Đang tải...</Typography>
      ) : (
        <>
          <img
            src={src}
            alt={title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: "rgba(0, 0, 0, 0.6)",
              color: "white",
              p: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", gap: 1 }}>
              <IconButton
                size="small"
                sx={{ color: "white" }}
                onClick={() => {
                  const originalUrl = src
                    .replace("thumbnail?id=", "file/d/")
                    .replace("&sz=w2000", "/view");
                  window.open(
                    convertToGoogleDriveViewUrl(originalUrl),
                    "_blank"
                  );
                }}
              >
                <ZoomOutMapIcon />
              </IconButton>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

const ViolationImages = ({
  reportData,
  month,
  year,
  selectedPhaseOption,
  onPhaseChange,
}) => {
  const imagesRef = useRef(null);
  const [violationImages, setViolationImages] = useState({});
  const [expandedWorkshop, setExpandedWorkshop] = useState(false);
  const [expandedDepartment, setExpandedDepartment] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingWorkshop, setLoadingWorkshop] = useState("");

  // Thêm kiểm tra chế độ SIGP
  const isSIGPOnly = reportData.workshops.every(
    (w) => w.workshopName === "SIGP"
  );

  // Hàm chuyển đổi URL cho iframe
  const convertToIframeSrc = (url) => {
    if (!url) return null;
    const urls = url.split(";").map((u) => u.trim());
    return urls
      .map((url) => {
        if (url.includes("drive.google.com/file/d/")) {
          const fileId = url.match(/\/d\/(.*?)\/|\/d\/(.*?)$/);
          if (fileId) {
            return `https://drive.google.com/thumbnail?id=${
              fileId[1] || fileId[2]
            }&sz=w2000`;
          }
        }
        return url;
      })
      .filter(Boolean);
  };

  // Hàm chuyển đổi URL cho ảnh trong PDF
  const convertToGdriveImageUrl = (url) => {
    if (!url) return null;
    const urls = url.split(";").map((u) => u.trim());
    return urls
      .map((url) => {
        if (url.includes("drive.google.com/file/d/")) {
          const fileId = url.match(/\/d\/(.*?)\/|\/d\/(.*?)$/);
          if (fileId) {
            // Sử dụng URL thumbnail với kích thước lớn
            return `https://drive.google.com/thumbnail?id=${
              fileId[1] || fileId[2]
            }&sz=w2000`;
          }
        }
        return url;
      })
      .filter(Boolean);
  };

  // Hàm xuất PDF
  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      // Create container for print content
      const printContainer = document.createElement("div");
      printContainer.id = "print-container-phase-images";
      document.body.appendChild(printContainer);

      const pdfTitle = isSIGPOnly
        ? `BÁO CÁO HÌNH ẢNH VI PHẠM SIGP<br/>${month}/${year}<br/>${selectedPhase}`
        : `BÁO CÁO HÌNH ẢNH VI PHẠM<br/>${month}/${year}<br/>${selectedPhase}`;

      // Add header
      const header = document.createElement("div");
      header.className = "pdf-header";
      header.innerHTML = `<h1>${pdfTitle}</h1>`;
      printContainer.appendChild(header);

      // Add content
      const content = document.createElement("div");
      content.className = "print-content";

      // Đợi tất cả ảnh được tải xong
      const loadImagePromises = [];

      Object.entries(filteredWorkshops).forEach(
        ([workshopName, departments]) => {
          // Create workshop section
          const workshopSection = document.createElement("div");
          workshopSection.className = "workshop-section";
          workshopSection.innerHTML = `<div class="workshop-title">${workshopName}</div>`;

          Object.entries(departments).forEach(([deptName, phases]) => {
            if (phases[selectedPhase]) {
              const deptSection = document.createElement("div");
              deptSection.className = "department-section";
              deptSection.innerHTML = `<div class="department-title">${deptName}</div>`;

              Object.entries(phases[selectedPhase]).forEach(
                ([criteriaId, images]) => {
                  const criteriaSection = document.createElement("div");
                  criteriaSection.className = "criteria-section";
                  const beforeUrls = images.before
                    ? convertToGdriveImageUrl(images.before)
                    : [];
                  const afterUrls = images.after
                    ? convertToGdriveImageUrl(images.after)
                    : [];

                  // Preload images
                  [...beforeUrls, ...afterUrls].forEach((url) => {
                    const img = new Image();
                    loadImagePromises.push(
                      new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve;
                        img.src = url;
                      })
                    );
                  });

                  criteriaSection.innerHTML = `
                    <div class="criteria-title">${images.codename} - ${
                    images.criterionName
                  }</div>
                    <div class="images-content">
                      <div class="image-group">
                        <div class="image-header violation-label">Ảnh vi phạm:</div>
                        <div class="images-grid">
                          ${
                            beforeUrls.length > 0
                              ? beforeUrls
                                  .map(
                                    (url) => `
                              <div class="image-wrapper">
                                <img src="${url}" alt="Ảnh vi phạm"/>
                              </div>`
                                  )
                                  .join("")
                              : '<div class="no-image">Không có ảnh vi phạm</div>'
                          }
                        </div>
                      </div>
                      
                      <div class="image-group">
                        <div class="image-header fix-label">Ảnh sau khắc phục:</div>
                        <div class="images-grid">
                          ${
                            afterUrls.length > 0
                              ? afterUrls
                                  .map(
                                    (url) => `
                              <div class="image-wrapper">
                                <img src="${url}" alt="Ảnh khắc phục"/>
                              </div>`
                                  )
                                  .join("")
                              : '<div class="no-image">Không có ảnh khắc phục</div>'
                          }
                        </div>
                      </div>
                    </div>
                  `;
                  deptSection.appendChild(criteriaSection);
                }
              );
              workshopSection.appendChild(deptSection);
            }
          });
          content.appendChild(workshopSection);
        }
      );

      printContainer.appendChild(content);

      // Wait for all images to load
      await Promise.all(loadImagePromises);

      // Add print styles
      const style = document.createElement("style");
      style.id = "print-styles-phase-images";
      style.textContent = `
        @media print {
          @page {
            size: portrait;
            margin: 15mm;
          }

          /* Reset styles */
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          /* Hide everything except print container */
          body * {
            visibility: hidden;
          }

          body > *:not(#print-container-phase-images) {
            display: none !important;
          }

          #print-container-phase-images, 
          #print-container-phase-images * {
            visibility: visible;
          }

          #print-container-phase-images {
            display: block !important;
            width: 100% !important;
            position: absolute;
            left: 0;
            top: 0;
            background: white !important;
          }

          /* Headers */
          .pdf-header {
            position: relative;
            top: 50mm;
            width: 100%;
            text-align: center;
            page-break-after: always;
            background-color: white;
            padding: 20mm 0;
          }

          .pdf-header h1 {
            font-size: 24pt !important;
            font-weight: bold !important;
            line-height: 2 !important;
            margin: 0 auto !important;
            max-width: 80% !important;
          }

          /* Ensure content starts on a new page */
          .print-content {
            page-break-before: always;
          }

          /* Workshop section */
          .workshop-section {
            page-break-before: always;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .workshop-title {
            background-color: #1976d2 !important;
            color: white !important;
            padding: 3mm !important;
            margin: 0 0 4mm 0 !important;
            border-radius: 2mm !important;
            font-size: 16pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: avoid;
          }

          /* Department section */
          .department-section {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 6mm !important;
          }

          .department-title {
            background-color: #9c27b0 !important;
            color: white !important;
            padding: 2mm !important;
            margin: 0 0 3mm 0 !important;
            border-radius: 2mm !important;
            font-size: 14pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: avoid;
          }

          /* Phase section */
          .phase-title {
            background-color: #4caf50 !important;
            color: white !important;
            padding: 2mm !important;
            margin: 0 0 3mm 0 !important;
            border-radius: 2mm !important;
            font-size: 13pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: avoid;
          }

          /* Criteria section */
          .criteria-section {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 8mm !important;
          }

          .criteria-title {
            background-color: #f5f5f5 !important;
            padding: 2mm !important;
            margin: 0 0 2mm 0 !important;
            border-radius: 2mm !important;
            font-size: 12pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: avoid;
          }

          /* Images grid */
          .images-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 3mm !important;
            margin: 3mm 0 6mm 0 !important;
            justify-items: center !important;
          }

          .image-wrapper {
            width: 45mm !important;
            height: 45mm !important;
          }

          .image-wrapper img {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
            border: 1px solid #ddd !important;
            background-color: white !important;
          }

          /* Labels */
          .violation-label {
            color: #d32f2f !important;
            font-size: 12pt !important;
            font-weight: bold !important;
            margin: 3mm 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .fix-label {
            color: #2e7d32 !important;
            font-size: 12pt !important;
            font-weight: bold !important;
            margin: 3mm 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-image {
            width: 45mm !important;
            height: 45mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background-color: #f5f5f5 !important;
            border: 1px dashed #ccc !important;
            border-radius: 2mm !important;
            color: #666 !important;
            font-style: italic !important;
            text-align: center !important;
            padding: 2mm !important;
          }

          /* Images content layout */
          .images-content {
            margin-top: 4mm !important;
          }

          .images-section {
            margin-bottom: 8mm !important;
          }

          /* Labels */
          .violation-label,
          .fix-label {
            background-color: #f5f5f5 !important;
            padding: 2mm 4mm !important;
            margin: 0 0 2mm 0 !important;
            border-radius: 2mm !important;
            font-weight: bold !important;
            display: inline-block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .violation-label {
            color: #d32f2f !important;
            border: 4px solid #d32f2f !important;
          }

          .fix-label {
            color: #2e7d32 !important;
            border: 4px solid #2e7d32 !important;
          }

          /* Images grid */
          .images-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 3mm !important;
            margin: 3mm 0 !important;
            justify-items: center !important;
            background-color: #ffffff !important;
            padding: 2mm !important;
            border-radius: 2mm !important;
          }

          .image-wrapper {
            width: 45mm !important;
            height: 45mm !important;
            background-color: white !important;
            border: 1px solid #e0e0e0 !important;
            border-radius: 1mm !important;
            overflow: hidden !important;
          }

          .image-wrapper img {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
          }

          .no-image {
            width: 45mm !important;
            height: 45mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background-color: #f5f5f5 !important;
            border: 1px dashed #ccc !important;
            border-radius: 2mm !important;
            color: #666 !important;
            font-style: italic !important;
            text-align: center !important;
            padding: 2mm !important;
          }

          /* Criteria section */
          .criteria-section {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 10mm !important;
            background-color: #ffffff !important;
            border-radius: 3mm !important;
            padding: 3mm !important;
          }

          .criteria-title {
            background-color: #f5f5f5 !important;
            padding: 2mm !important;
            margin: 0 !important;
            border-radius: 2mm !important;
            font-size: 12pt !important;
            font-weight: bold !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: avoid;
          }

          /* Images content layout */
          .images-content {
            margin-top: 4mm !important;
          }

          /* Image group - giữ label và grid ảnh đi cùng nhau */
          .image-group {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 8mm !important;
          }

          /* Image header (labels) */
          .image-header {
            background-color: #f5f5f5 !important;
            padding: 2mm 4mm !important;
            margin: 0 0 2mm 0 !important;
            border-radius: 2mm !important;
            font-weight: bold !important;
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .violation-label {
            color: #d32f2f !important;
            border: 4px solid #d32f2f !important;
          }

          .fix-label {
            color: #2e7d32 !important;
            border: 4px solid #2e7d32 !important;
          }

          /* Images grid */
          .images-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 3mm !important;
            margin: 0 !important; /* Giảm margin để gắn chặt với label */
            padding: 2mm !important;
            background-color: #ffffff !important;
            border-radius: 2mm !important;
          }

          /* Criteria section */
          .criteria-section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 10mm !important;
            background-color: #ffffff !important;
            border-radius: 3mm !important;
            padding: 3mm !important;
          }

          /* Đảm bảo không có page break giữa title và content */
          .criteria-title {
            background-color: #f5f5f5 !important;
            padding: 2mm !important;
            margin: 0 0 4mm 0 !important;
            border-radius: 2mm !important;
            font-size: 12pt !important;
            font-weight: bold !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: avoid !important;
          }

          /* Image wrapper styles */
          .image-wrapper {
            width: 45mm !important;
            height: 45mm !important;
            background-color: white !important;
            border: 1px solid #e0e0e0 !important;
            border-radius: 1mm !important;
            overflow: hidden !important;
          }

          .image-wrapper img {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
          }

          .no-image {
            width: 45mm !important;
            height: 45mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background-color: #f5f5f5 !important;
            border: 1px dashed #ccc !important;
            border-radius: 2mm !important;
            color: #666 !important;
            font-style: italic !important;
            text-align: center !important;
            padding: 2mm !important;
          }

          /* Header styles */
          .pdf-header {
            position: relative;
            top: 50mm;
            width: 100%;
            text-align: center;
            page-break-after: always;
            background-color: white;
            padding: 20mm 0;
          }

          .pdf-header h1 {
            font-size: 24pt !important;
            font-weight: bold !important;
            line-height: 2 !important;
            margin: 0 auto !important;
            max-width: 80% !important;
          }

          /* Ensure content starts on a new page */
          .print-content {
            page-break-before: always;
          }
        }
      `;
      document.head.appendChild(style);

      // Set filename
      const filePrefix = isSIGPOnly
        ? "Bao_cao_hinh_anh_vi_pham_SIGP"
        : "Bao_cao_hinh_anh_vi_pham_VLH";
      document.title = `${filePrefix}_Thang_${month}_${year}_Dot_${selectedPhase.replace(
        /\s+/g,
        "_"
      )}`;

      // Print
      window.print();

      // Cleanup
      document.head.removeChild(style);
      document.body.removeChild(printContainer);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
      }, 1000);
    }
  };

  // Cập nhật useEffect cho việc thay đổi phase
  useEffect(() => {
    if (selectedPhaseOption && selectedPhaseOption.startsWith("phase-")) {
      const phaseName = reportData.phases.find(
        (phase) => `phase-${phase.id_phase}` === selectedPhaseOption
      )?.name_phase;

      if (phaseName) {
        setSelectedPhase(phaseName);
        setExpandedWorkshop(false);
        setExpandedDepartment(false);
      }
    }
  }, [selectedPhaseOption, reportData.phases]);

  // Thêm useEffect mới để xử lý khi reportData thay đổi
  useEffect(() => {
    if (reportData?.phases && reportData.phases.length > 0) {
      // Nếu đã có selectedPhase, giữ nguyên giá trị đó
      if (!selectedPhase) {
        setSelectedPhase(reportData.phases[0].name_phase);
      }
    }
  }, [reportData, selectedPhase]);

  // Tối ưu hàm fetchViolationImages bằng cách thêm debounce
  useEffect(() => {
    const fetchViolationImages = async () => {
      const imagesData = {};

      try {
        // Lọc chỉ các workshop cần hiển thị
        const workshopsToProcess = reportData.workshops.filter((workshop) => {
          return isSIGPOnly
            ? workshop.workshopName === "SIGP"
            : workshop.workshopName !== "SIGP";
        });

        // Tạo mảng promises cho tất cả các requests
        const promises = [];
        for (const workshop of workshopsToProcess) {
          imagesData[workshop.workshopName] = {};

          for (const dept of workshop.departments) {
            imagesData[workshop.workshopName][dept.name_department] = {};

            for (const phase of reportData.phases) {
              const isDepartmentInactive =
                reportData.inactiveDepartments?.[phase.id_phase]?.[
                  dept.id_department
                ];
              if (isDepartmentInactive) continue;

              promises.push(
                axios
                  .get(
                    `${API_URL}/get-phase-details-images/${phase.id_phase}/${dept.id_department}`
                  )
                  .then((response) => ({
                    workshop: workshop.workshopName,
                    dept: dept.name_department,
                    phase: phase.name_phase,
                    data: response.data,
                  }))
                  .catch((error) => {
                    console.error("Error fetching images:", error);
                    return null;
                  })
              );
            }
          }
        }

        // Đợi tất cả requests hoàn thành
        const results = await Promise.all(promises);

        // Xử lý kết quả
        results.forEach((result) => {
          if (result && Object.keys(result.data).length > 0) {
            if (!imagesData[result.workshop]) {
              imagesData[result.workshop] = {};
            }
            if (!imagesData[result.workshop][result.dept]) {
              imagesData[result.workshop][result.dept] = {};
            }
            imagesData[result.workshop][result.dept][result.phase] =
              result.data;
          }
        });

        // Lọc bỏ các workshop và department không có ảnh
        Object.keys(imagesData).forEach((workshop) => {
          Object.keys(imagesData[workshop]).forEach((dept) => {
            if (Object.keys(imagesData[workshop][dept]).length === 0) {
              delete imagesData[workshop][dept];
            }
          });
          if (Object.keys(imagesData[workshop]).length === 0) {
            delete imagesData[workshop];
          }
        });

        setViolationImages(imagesData);
      } catch (error) {
        console.error("Error in fetchViolationImages:", error);
      }
    };

    if (reportData.workshops?.length > 0 && reportData.phases?.length > 0) {
      fetchViolationImages();
    }
  }, [reportData, isSIGPOnly]);

  // Lọc workshops theo phase đã chọn
  const getFilteredWorkshops = () => {
    const filtered = {};

    Object.entries(violationImages).forEach(([workshopName, departments]) => {
      const filteredDepartments = {};

      Object.entries(departments).forEach(([deptName, phases]) => {
        if (phases[selectedPhase]) {
          filteredDepartments[deptName] = phases;
        }
      });

      if (Object.keys(filteredDepartments).length > 0) {
        filtered[workshopName] = filteredDepartments;
      }
    });

    return filtered;
  };

  // Render images cho từng section
  const renderImages = (images, type) => {
    const urls = images ? convertToIframeSrc(images) : null;
    if (!urls) {
      return (
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ mb: 2 }}>
            <ImageFrame type={type} />
          </Box>
        </Grid>
      );
    }

    return urls.map((src, index) => (
      <Grid item xs={12} sm={6} md={3} key={index}>
        <Box sx={{ mb: 2 }}>
          <ImageFrame
            src={src}
            title={`${
              type === "before" ? "Ảnh vi phạm" : "Ảnh sau khắc phục"
            } ${index + 1}`}
            type={type}
          />
        </Box>
      </Grid>
    ));
  };

  const filteredWorkshops = getFilteredWorkshops();

  // Handlers cho menu
  const handleExportClick = () => {
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  // Thêm hàm xuất PDF cho workshop
  const handleExportWorkshopPDF = async (workshopName) => {
    if (loadingWorkshop) return;
    setLoadingWorkshop(workshopName);

    try {
      // Create container for print content
      const printContainer = document.createElement("div");
      printContainer.id = "print-container-workshop-images";
      document.body.appendChild(printContainer);

      const pdfTitle = `BÁO CÁO HÌNH ẢNH VI PHẠM<br/>${workshopName}<br/>${month}/${year}`;

      // Add header
      const header = document.createElement("div");
      header.className = "pdf-header";
      header.innerHTML = `<h1>${pdfTitle}</h1>`;
      printContainer.appendChild(header);

      // Add content
      const content = document.createElement("div");
      content.className = "print-content";

      // Đợi tất cả ảnh được tải xong
      const loadImagePromises = [];

      // Lấy dữ liệu của workshop được chọn
      const workshopData = filteredWorkshops[workshopName];

      Object.entries(workshopData).forEach(([deptName, phases]) => {
        const deptSection = document.createElement("div");
        deptSection.className = "department-section";
        deptSection.innerHTML = `<div class="department-title">${deptName}</div>`;

        // Lặp qua tất cả các phases của department
        Object.entries(phases).forEach(([phaseName, criteria]) => {
          const phaseSection = document.createElement("div");
          phaseSection.className = "phase-section";
          phaseSection.innerHTML = `<div class="phase-title">${phaseName}</div>`;

          Object.entries(criteria).forEach(([criteriaId, images]) => {
            const criteriaSection = document.createElement("div");
            criteriaSection.className = "criteria-section";
            const beforeUrls = images.before
              ? convertToGdriveImageUrl(images.before)
              : [];
            const afterUrls = images.after
              ? convertToGdriveImageUrl(images.after)
              : [];

            // Preload images
            [...beforeUrls, ...afterUrls].forEach((url) => {
              const img = new Image();
              loadImagePromises.push(
                new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
                  img.src = url;
                })
              );
            });

            criteriaSection.innerHTML = `
              <div class="criteria-title">${images.codename} - ${
              images.criterionName
            }</div>
              <div class="images-content">
                <div class="image-group">
                  <div class="image-header violation-label">Ảnh vi phạm:</div>
                  <div class="images-grid">
                    ${
                      beforeUrls.length > 0
                        ? beforeUrls
                            .map(
                              (url) => `
                        <div class="image-wrapper">
                          <img src="${url}" alt="Ảnh vi phạm"/>
                        </div>`
                            )
                            .join("")
                        : '<div class="no-image">Không có ảnh vi phạm</div>'
                    }
                  </div>
                </div>
                
                <div class="image-group">
                  <div class="image-header fix-label">Ảnh sau khắc phục:</div>
                  <div class="images-grid">
                    ${
                      afterUrls.length > 0
                        ? afterUrls
                            .map(
                              (url) => `
                        <div class="image-wrapper">
                          <img src="${url}" alt="Ảnh khắc phục"/>
                        </div>`
                            )
                            .join("")
                        : '<div class="no-image">Không có ảnh khắc phục</div>'
                    }
                  </div>
                </div>
              </div>
            `;
            phaseSection.appendChild(criteriaSection);
          });
          deptSection.appendChild(phaseSection);
        });
        content.appendChild(deptSection);
      });

      printContainer.appendChild(content);

      // Wait for all images to load
      await Promise.all(loadImagePromises);

      // Add print styles
      const style = document.createElement("style");
      style.id = "print-styles-workshop-images";
      style.textContent = `
        @media print {
          @page {
            size: portrait;
            margin: 15mm;
          }

          /* Reset styles */
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          /* Hide everything except print container */
          body * {
            visibility: hidden;
          }

          body > *:not(#print-container-workshop-images) {
            display: none !important;
          }

          #print-container-workshop-images, 
          #print-container-workshop-images * {
            visibility: visible;
          }

          #print-container-workshop-images {
            display: block !important;
            width: 100% !important;
            position: absolute;
            left: 0;
            top: 0;
            background: white !important;
          }

          /* Headers */
          h1 {
            text-align: center;
            font-size: 24pt;
            margin-bottom: 15mm;
            color: black;
            page-break-after: avoid;
          }

          /* Department section */
          .department-section {
            page-break-before: always;
          }

          .department-title {
            background-color: #9c27b0 !important;
            color: white !important;
            padding: 2mm !important;
            margin: 0 0 3mm 0 !important;
            border-radius: 2mm !important;
            font-size: 14pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: avoid;
          }

          /* Phase section */
          .phase-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .phase-title {
            background-color: #4caf50 !important;
            color: white !important;
            padding: 2mm !important;
            margin: 4mm 0 3mm 0 !important;
            border-radius: 2mm !important;
            font-size: 13pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: avoid;
          }

          /* Criteria section */
          .criteria-section {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 8mm !important;
          }

          .criteria-title {
            background-color: #f5f5f5 !important;
            padding: 2mm !important;
            margin: 0 0 2mm 0 !important;
            border-radius: 2mm !important;
            font-size: 12pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: avoid;
          }

          /* Images grid */
          .images-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 3mm !important;
            margin: 3mm 0 6mm 0 !important;
            justify-items: center !important;
          }

          .image-wrapper {
            width: 45mm !important;
            height: 45mm !important;
          }

          .image-wrapper img {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
            border: 1px solid #ddd !important;
            background-color: white !important;
          }

          /* Labels */
          .violation-label {
            color: #d32f2f !important;
            font-size: 12pt !important;
            font-weight: bold !important;
            margin: 3mm 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .fix-label {
            color: #2e7d32 !important;
            font-size: 12pt !important;
            font-weight: bold !important;
            margin: 3mm 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-image {
            width: 45mm !important;
            height: 45mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background-color: #f5f5f5 !important;
            border: 1px dashed #ccc !important;
            border-radius: 2mm !important;
            color: #666 !important;
            font-style: italic !important;
            text-align: center !important;
            padding: 2mm !important;
          }

          /* Images content layout */
          .images-content {
            margin-top: 4mm !important;
          }

          .images-section {
            margin-bottom: 8mm !important;
          }

          /* Labels */
          .violation-label,
          .fix-label {
            background-color: #f5f5f5 !important;
            padding: 2mm 4mm !important;
            margin: 0 0 2mm 0 !important;
            border-radius: 2mm !important;
            font-weight: bold !important;
            display: inline-block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .violation-label {
            color: #d32f2f !important;
            border: 4px solid #d32f2f !important;
          }

          .fix-label {
            color: #2e7d32 !important;
            border: 4px solid #2e7d32 !important;
          }

          /* Images grid */
          .images-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 3mm !important;
            margin: 3mm 0 !important;
            justify-items: center !important;
            background-color: #ffffff !important;
            padding: 2mm !important;
            border-radius: 2mm !important;
          }

          .image-wrapper {
            width: 45mm !important;
            height: 45mm !important;
            background-color: white !important;
            border: 1px solid #e0e0e0 !important;
            border-radius: 1mm !important;
            overflow: hidden !important;
          }

          .image-wrapper img {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
          }

          .no-image {
            width: 45mm !important;
            height: 45mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background-color: #f5f5f5 !important;
            border: 1px dashed #ccc !important;
            border-radius: 2mm !important;
            color: #666 !important;
            font-style: italic !important;
            text-align: center !important;
            padding: 2mm !important;
          }

          /* Criteria section */
          .criteria-section {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 10mm !important;
            background-color: #ffffff !important;
            border-radius: 3mm !important;
            padding: 3mm !important;
          }

          .criteria-title {
            background-color: #f5f5f5 !important;
            padding: 2mm !important;
            margin: 0 !important;
            border-radius: 2mm !important;
            font-size: 12pt !important;
            font-weight: bold !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: avoid;
          }

          /* Images content layout */
          .images-content {
            margin-top: 4mm !important;
          }

          /* Image group - giữ label và grid ảnh đi cùng nhau */
          .image-group {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 8mm !important;
          }

          /* Image header (labels) */
          .image-header {
            background-color: #f5f5f5 !important;
            padding: 2mm 4mm !important;
            margin: 0 0 2mm 0 !important;
            border-radius: 2mm !important;
            font-weight: bold !important;
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .violation-label {
            color: #d32f2f !important;
            border: 4px solid #d32f2f !important;
          }

          .fix-label {
            color: #2e7d32 !important;
            border: 4px solid #2e7d32 !important;
          }

          /* Images grid */
          .images-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 3mm !important;
            margin: 0 !important;
            padding: 2mm !important;
            background-color: #ffffff !important;
            border-radius: 2mm !important;
          }

          /* Criteria section */
          .criteria-section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 10mm !important;
            background-color: #ffffff !important;
            border-radius: 3mm !important;
            padding: 3mm !important;
          }

          /* Đảm bảo không có page break giữa title và content */
          .criteria-title {
            background-color: #f5f5f5 !important;
            padding: 2mm !important;
            margin: 0 0 4mm 0 !important;
            border-radius: 2mm !important;
            font-size: 12pt !important;
            font-weight: bold !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: avoid !important;
          }

          /* Image wrapper styles */
          .image-wrapper {
            width: 45mm !important;
            height: 45mm !important;
            background-color: white !important;
            border: 1px solid #e0e0e0 !important;
            border-radius: 1mm !important;
            overflow: hidden !important;
          }

          .image-wrapper img {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
          }

          .no-image {
            width: 45mm !important;
            height: 45mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background-color: #f5f5f5 !important;
            border: 1px dashed #ccc !important;
            border-radius: 2mm !important;
            color: #666 !important;
            font-style: italic !important;
            text-align: center !important;
            padding: 2mm !important;
          }

          /* Header styles */
          .pdf-header {
            position: relative;
            top: 50mm;
            width: 100%;
            text-align: center;
            page-break-after: always;
            background-color: white;
            padding: 20mm 0;
          }

          .pdf-header h1 {
            font-size: 24pt !important;
            font-weight: bold !important;
            line-height: 2 !important;
            margin: 0 auto !important;
            max-width: 80% !important;
          }

          /* Ensure content starts on a new page */
          .print-content {
            page-break-before: always;
          }
        }
      `;
      document.head.appendChild(style);

      // Set filename
      document.title = `Bao_cao_hinh_anh_vi_pham_${workshopName}_Thang_${month}_${year}`;

      // Print
      window.print();

      // Cleanup
      document.head.removeChild(style);
      document.body.removeChild(printContainer);
    } catch (error) {
      console.error("Error exporting workshop PDF:", error);
    } finally {
      setTimeout(() => {
        setLoadingWorkshop("");
      }, 1000);
    }
  };

  // Thêm handler cho việc thay đổi phase trong ViolationImages
  const handlePhaseChange = (newPhase) => {
    setSelectedPhase(newPhase);
    // Tìm phase ID tương ứng và cập nhật selectedPhaseOption
    const phase = reportData.phases.find((p) => p.name_phase === newPhase);
    if (phase) {
      onPhaseChange(`phase-${phase.id_phase}`);
    }
  };

  // Thêm biến để kiểm tra trạng thái xuất PDF
  const isAnyExporting = isExporting || loadingWorkshop !== "";

  // Add scroll function with dynamic delay
  const scrollToElement = (id) => {
    const element = document.getElementById(id);
    if (element) {
      // Get the content element (AccordionDetails)
      const contentElement = element.querySelector(".MuiAccordionDetails-root");
      if (!contentElement) return;

      // Calculate delay based on content height
      // Use a base delay of 200ms plus additional time based on content height
      // Assuming roughly 100px can be animated in 100ms
      const contentHeight = contentElement.scrollHeight;
      const baseDelay = 300;
      const heightBasedDelay = Math.min(
        Math.floor(contentHeight / 100) * 100,
        1200
      );
      const totalDelay = baseDelay + heightBasedDelay;

      setTimeout(() => {
        const yOffset = -20;
        const y =
          element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({
          top: y,
          behavior: "smooth",
        });
      }, totalDelay);
    }
  };

  // Return main component UI
  return (
    <Box ref={imagesRef} sx={{ width: "100%", mt: 4, mb: 4 }}>
      <Typography
        variant="h5"
        align="center"
        sx={{ fontWeight: "bold", mb: 2, mt: 4 }}
      >
        HÌNH ẢNH VI PHẠM TIÊU CHÍ
      </Typography>

      {Object.keys(violationImages).length === 0 ? (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="body1" align="center" color="text.secondary">
            {isSIGPOnly
              ? "Không có hình ảnh vi phạm nào của SIGP"
              : "Không có hình ảnh vi phạm nào của VLH"}
          </Typography>
        </Paper>
      ) : (
        <Paper elevation={3} sx={{ p: 3 }}>
          {/* Phase Selection Buttons */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <ButtonGroup variant="contained" color="primary">
              {reportData.phases.map((phase) => (
                <Button
                  key={phase.id_phase}
                  onClick={() => handlePhaseChange(phase.name_phase)}
                  variant={
                    selectedPhase === phase.name_phase
                      ? "contained"
                      : "outlined"
                  }
                  sx={{
                    backgroundColor:
                      selectedPhase === phase.name_phase
                        ? "primary.main"
                        : "transparent",
                    "&:hover": {
                      backgroundColor:
                        selectedPhase === phase.name_phase
                          ? "primary.dark"
                          : "primary.light",
                    },
                  }}
                >
                  {phase.name_phase}
                </Button>
              ))}
            </ButtonGroup>

            <Button
              variant="contained"
              color="secondary"
              onClick={handleExportClick}
              disabled={isAnyExporting}
              startIcon={<CollectionsIcon />}
              sx={{
                backgroundColor: "#1E90FF",
                "&:hover": {
                  backgroundColor: "#1A78D6",
                },
                "&.Mui-disabled": {
                  backgroundColor: "#1E90FF",
                  opacity: 0.7,
                },
              }}
            >
              {isExporting ? "Đang xuất PDF..." : "Xuất PDF"}
            </Button>
          </Box>

          {/* Render Workshops */}
          {Object.entries(filteredWorkshops).map(
            ([workshopName, departments], workshopIndex) => (
              <Accordion
                key={workshopName}
                id={`workshop-${workshopIndex}`}
                expanded={expandedWorkshop === workshopIndex}
                onChange={() => {
                  setExpandedWorkshop(
                    expandedWorkshop === workshopIndex ? false : workshopIndex
                  );
                  if (expandedWorkshop !== workshopIndex) {
                    scrollToElement(`workshop-${workshopIndex}`);
                  }
                }}
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
                        id={`dept-${workshopIndex}-${deptIndex}`}
                        expanded={
                          expandedDepartment === `${workshopIndex}-${deptIndex}`
                        }
                        onChange={() => {
                          setExpandedDepartment(
                            expandedDepartment ===
                              `${workshopIndex}-${deptIndex}`
                              ? false
                              : `${workshopIndex}-${deptIndex}`
                          );
                          if (
                            expandedDepartment !==
                            `${workshopIndex}-${deptIndex}`
                          ) {
                            scrollToElement(
                              `dept-${workshopIndex}-${deptIndex}`
                            );
                          }
                        }}
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
                          {phases[selectedPhase] && (
                            <Box sx={{ ml: 2 }}>
                              {Object.entries(phases[selectedPhase]).map(
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
                                      {images.codename} - {images.criterionName}
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
                                      <Box
                                        sx={{
                                          display: "grid",
                                          gridTemplateColumns:
                                            "repeat(auto-fill, minmax(300px, 1fr))",
                                          gap: 2,
                                          mt: 1,
                                        }}
                                      >
                                        {renderImages(images.before, "before")}
                                      </Box>
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
                                      <Box
                                        sx={{
                                          display: "grid",
                                          gridTemplateColumns:
                                            "repeat(auto-fill, minmax(300px, 1fr))",
                                          gap: 2,
                                          mt: 1,
                                        }}
                                      >
                                        {renderImages(images.after, "after")}
                                      </Box>
                                    </Box>
                                  </Box>
                                )
                              )}
                            </Box>
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
      )}

      <Dialog open={isDialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Chọn tùy chọn xuất PDF hình ảnh vi phạm</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleExportPDF}
                disabled={isAnyExporting}
                sx={{
                  textTransform: "none",
                  fontWeight: "bold",
                  position: "relative",
                  "& .MuiCircularProgress-root": {
                    position: "absolute",
                    right: 10,
                  },
                }}
              >
                {isExporting ? (
                  <>
                    <span style={{ marginRight: "24px" }}>
                      Đang xuất PDF...
                    </span>
                    <CircularProgress size={20} />
                  </>
                ) : (
                  `Xuất PDF hình ảnh vi phạm ${selectedPhase}`
                )}
              </Button>
            </Grid>
            {Object.keys(filteredWorkshops).map((workshopName) => (
              <Grid item xs={12} key={workshopName}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => handleExportWorkshopPDF(workshopName)}
                  disabled={isAnyExporting}
                  sx={{
                    textTransform: "none",
                    fontWeight: "bold",
                    position: "relative",
                    "& .MuiCircularProgress-root": {
                      position: "absolute",
                      right: 10,
                    },
                  }}
                >
                  {loadingWorkshop === workshopName ? (
                    <>
                      <span style={{ marginRight: "24px" }}>
                        Đang xuất PDF...
                      </span>
                      <CircularProgress size={20} />
                    </>
                  ) : (
                    `Xuất PDF hình ảnh vi phạm ${workshopName} trong tất cả các đợt`
                  )}
                </Button>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ViolationImages;
