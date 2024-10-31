// frontend/src/components/ExportPDFButtons.js
import React from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Box, Button } from "@mui/material";
import { Download } from "lucide-react";

const ExportPDFButtons = () => {
  const exportToPDF = async () => {
    // Lấy toàn bộ nội dung container
    const container = document.querySelector(".MuiContainer-root");
    if (!container) return;

    try {
      // Tạo PDF ở định dạng A4
      const pdf = new jsPDF("p", "mm", "a4");
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Chụp toàn bộ container
      const canvas = await html2canvas(container, {
        scale: 2, // Tăng độ phân giải
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1920, // Giả lập độ rộng màn hình lớn để tránh responsive issues
        windowHeight: container.scrollHeight,
        onclone: (document) => {
          // Ẩn các phần tử không cần thiết trong bản PDF
          const clonedContainer = document.querySelector(".MuiContainer-root");
          if (clonedContainer) {
            const navigationBubble =
              clonedContainer.querySelector(".navigation-bubble");
            if (navigationBubble) {
              navigationBubble.style.display = "none";
            }

            // Ẩn nút export PDF trong bản thân nó
            const exportButton =
              clonedContainer.querySelector(".export-pdf-button");
            if (exportButton) {
              exportButton.style.display = "none";
            }
          }
        },
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Thêm trang đầu tiên
      pdf.addImage(canvas, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Thêm các trang tiếp theo nếu cần
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Lưu file PDF
      const month =
        document.querySelector(".MuiSelect-select")?.textContent || "";
      const year = new Date().getFullYear();
      pdf.save(`bao-cao-kiem-soat-noi-bo-${month.toLowerCase()}-${year}.pdf`);
    } catch (error) {
      console.error("Lỗi khi xuất PDF:", error);
    }
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
      <Button
        className="export-pdf-button"
        variant="contained"
        color="primary"
        onClick={exportToPDF}
        startIcon={<Download size={20} />}
        sx={{
          fontSize: "1rem",
          py: 1,
          px: 3,
          backgroundColor: "#1976d2",
          "&:hover": {
            backgroundColor: "#1565c0",
          },
        }}
      >
        Xuất báo cáo PDF
      </Button>
    </Box>
  );
};

export default ExportPDFButtons;
