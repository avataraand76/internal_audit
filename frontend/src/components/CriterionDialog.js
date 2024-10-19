// frontend/src/components/CriterionDialog.js
import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ImageHandler from "./ImageHandler";
import axios from "axios";
import API_URL from "../data/api";

const CriterionDialog = ({
  open,
  onClose,
  criterion,
  selectedDepartment,
  failedCriteria,
  phaseId,
  user, // Thêm user prop
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const imageHandlerRef = useRef();
  const [isUploading, setIsUploading] = useState(false);

  const handleScoreClick = async (score) => {
    if (!criterion || !selectedDepartment || !user) {
      console.error("Missing required data:", {
        criterion,
        selectedDepartment,
        user,
      });
      return;
    }

    try {
      setIsUploading(true);

      // Nếu đánh giá "không đạt", yêu cầu upload ảnh
      if (score === "không đạt") {
        const imageFiles = await imageHandlerRef.current.getImages();

        if (!imageFiles || imageFiles.length === 0) {
          alert(
            "Vui lòng chụp hoặc tải lên ít nhất một ảnh trước khi đánh giá không đạt"
          );
          setIsUploading(false);
          return;
        }

        // Upload ảnh
        const formData = new FormData();
        imageFiles.forEach((file) => {
          formData.append("photos", file);
        });
        formData.append("userId", user.id_user);

        try {
          // Gọi API upload ảnh
          const uploadResponse = await axios.post(
            `${API_URL}/upload-before-photos/${selectedDepartment.id}/${criterion.id}/${phaseId}`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );

          if (uploadResponse.status !== 200) {
            throw new Error(
              `Upload failed with status: ${uploadResponse.status}`
            );
          }
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          alert("Có lỗi khi tải ảnh lên. Vui lòng thử lại.");
          setIsUploading(false);
          return;
        }
      }

      // Lưu kết quả đánh giá
      const scoreData = {
        id_department: selectedDepartment.id,
        id_criteria: criterion.id,
        id_phase: phaseId,
        id_user: user.id_user,
        is_fail: score === "không đạt" ? 1 : 0,
        date_updated: new Date().toISOString(),
      };

      await axios.post(`${API_URL}/phase-details`, scoreData);

      // Cập nhật UI và đóng dialog
      onClose(score);
    } catch (error) {
      console.error("Error processing score:", error);
      alert("Có lỗi xảy ra khi xử lý. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!criterion) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="caption" color="text.secondary" gutterBottom>
          Mã: {criterion.codename}
        </Typography>
        <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
          {criterion.name}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant={isMobile ? "body2" : "body1"} paragraph>
          {criterion.description}
        </Typography>
        <ImageHandler
          ref={imageHandlerRef}
          onImageCapture={() => {}}
          onImageUpload={() => {}}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={isUploading}>
          Hủy
        </Button>
        {failedCriteria[selectedDepartment?.id]?.has(criterion.id) ? (
          <Button
            onClick={() => handleScoreClick("đạt")}
            variant="contained"
            color="success"
            disabled={isUploading}
          >
            Đạt
          </Button>
        ) : (
          <Button
            onClick={() => handleScoreClick("không đạt")}
            variant="contained"
            color="error"
            disabled={isUploading}
          >
            {isUploading ? "Đang tải lên..." : "Không đạt"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CriterionDialog;
