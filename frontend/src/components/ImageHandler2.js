// frontend/src/components/ImageHandler2.js
import React, { useState, useRef } from "react";
import {
  Box,
  Button,
  ImageList,
  ImageListItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  styled,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Camera from "react-html5-camera-photo";
import "react-html5-camera-photo/build/css/index.css";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import API_URL from "../data/api";

// Styled components
const ImageContainer = styled(Box)({
  position: "relative",
  width: "100%",
  paddingTop: "100%",
  overflow: "hidden",
});

const PreviewImage = styled("img")({
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  cursor: "pointer",
  transition: "transform 0.2s ease-in-out",
  "&:hover": {
    transform: "scale(1.05)",
  },
});

const CameraContainer = styled(Box)({
  position: "relative",
  width: "100%",
  maxWidth: "600px",
  margin: "0 auto",
  "& > div": {
    borderRadius: "8px",
    overflow: "hidden",
  },
  "& .react-html5-camera-photo": {
    position: "relative",
    width: "100%",
  },
  "& .react-html5-camera-photo > video": {
    width: "100%",
    height: "auto",
  },
  "& .react-html5-camera-photo > img": {
    width: "100%",
    height: "auto",
  },
  "& .react-html5-camera-photo > .display-controls": {
    display: "block !important",
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 100,
  },
});

const PreviewDialog = styled(Dialog)({
  "& .MuiDialog-paper": {
    margin: 16,
    maxHeight: "calc(100% - 32px)",
    borderRadius: 12,
    overflow: "hidden",
  },
});

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ALLOWED_FILE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

// ImageHandler Component
const ImageHandler = React.forwardRef(
  ({ onImageCapture, onImageUpload }, ref) => {
    const fileInputRef = useRef(null);
    const [images, setImages] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const [error, setError] = useState(null);

    // Expose getImages method to parent through ref
    React.useImperativeHandle(ref, () => ({
      getImages: () => images.map((img) => img.url),
    }));

    const isValidFileType = (file) => {
      const extension = file.name
        .toLowerCase()
        .slice(((file.name.lastIndexOf(".") - 1) >>> 0) + 2);
      return (
        ALLOWED_FILE_TYPES.includes(file.type) &&
        ALLOWED_FILE_EXTENSIONS.includes(`.${extension}`)
      );
    };

    const handleTakePhoto = (dataUri) => {
      try {
        const newImage = {
          id: Date.now(),
          url: dataUri,
          name: `Captured_${new Date().toLocaleString()}.jpg`,
        };
        setImages((prev) => [...prev, newImage]);
        if (onImageCapture) onImageCapture(dataUri);
        setShowCamera(false);
        setError(null);
      } catch (err) {
        console.error("Lỗi khi chụp ảnh:", err);
        setError("Không thể chụp ảnh. Vui lòng thử lại.");
      }
    };

    const handleCameraError = (error) => {
      console.error("Lỗi camera:", error);
      let errorMessage = "Không thể truy cập camera. ";
      if (error.name === "NotAllowedError") {
        errorMessage +=
          "Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt.";
      } else if (error.name === "NotFoundError") {
        errorMessage += "Không tìm thấy thiết bị camera.";
      } else if (error.name === "NotReadableError") {
        errorMessage += "Camera đang được sử dụng bởi ứng dụng khác.";
      } else {
        errorMessage +=
          error.message || "Vui lòng kiểm tra lại thiết bị và thử lại.";
      }
      setError(errorMessage);
      setShowCamera(false);
    };

    return (
      <Box sx={{ width: "100%" }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, my: 2 }}>
          <Button
            variant="contained"
            startIcon={<CameraAltIcon />}
            onClick={() => setShowCamera(true)}
          >
            Chụp ảnh
          </Button>
          <Button
            variant="contained"
            startIcon={<FileUploadIcon />}
            onClick={() => fileInputRef.current.click()}
          >
            Tải ảnh lên
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const files = Array.from(e.target.files);
              files.forEach((file) => {
                if (isValidFileType(file)) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setImages((prev) => [
                      ...prev,
                      {
                        id: Date.now(),
                        url: event.target.result,
                        name: file.name,
                      },
                    ]);
                  };
                  reader.readAsDataURL(file);
                } else {
                  setError(
                    "Chỉ chấp nhận file ảnh có định dạng JPG/JPEG hoặc PNG"
                  );
                }
              });
              e.target.value = null;
            }}
            style={{ display: "none" }}
            accept=".jpg,.jpeg,.png"
            multiple
          />
        </Box>

        <Dialog
          open={showCamera}
          onClose={() => setShowCamera(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: "background.default",
              overflow: "hidden",
              borderRadius: 2,
              height: "auto",
            },
          }}
        >
          <CameraContainer>
            <Camera
              onTakePhoto={handleTakePhoto}
              onCameraError={handleCameraError}
              isImageMirror={false}
              idealFacingMode="environment"
              isFullscreen={false}
            />
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 2,
                p: 2,
                position: "flex",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                zIndex: 1000,
              }}
            >
              <Button
                variant="contained"
                color="error"
                onClick={() => setShowCamera(false)}
                sx={{ minWidth: 120 }}
              >
                Hủy
              </Button>
            </Box>
          </CameraContainer>
        </Dialog>

        {images.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Ảnh đã tải lên ({images.length})
            </Typography>
            <ImageList cols={3} gap={16} sx={{ overflow: "visible" }}>
              {images.map((image) => (
                <ImageListItem
                  key={image.id}
                  sx={{
                    overflow: "hidden",
                    borderRadius: 2,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <ImageContainer>
                    <PreviewImage
                      src={image.url}
                      alt={image.name}
                      loading="lazy"
                      onClick={() => setSelectedImage(image)}
                    />
                    <IconButton
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        bgcolor: "rgba(255,255,255,0.9)",
                        "&:hover": {
                          bgcolor: "rgba(255,255,255,1)",
                        },
                      }}
                      size="small"
                      onClick={() =>
                        setImages((prev) =>
                          prev.filter((img) => img.id !== image.id)
                        )
                      }
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ImageContainer>
                </ImageListItem>
              ))}
            </ImageList>
          </Box>
        )}

        <PreviewDialog
          open={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          maxWidth="lg"
          fullWidth
        >
          {selectedImage && (
            <Box sx={{ position: "relative", bgcolor: "black" }}>
              <IconButton
                sx={{
                  position: "absolute",
                  right: 16,
                  top: 16,
                  color: "white",
                  bgcolor: "rgba(0,0,0,0.5)",
                  "&:hover": {
                    bgcolor: "rgba(0,0,0,0.7)",
                  },
                  zIndex: 1,
                }}
                onClick={() => setSelectedImage(null)}
              >
                <CloseIcon />
              </IconButton>
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                style={{
                  width: "100%",
                  height: "90vh",
                  objectFit: "contain",
                  display: "block",
                  margin: "0 auto",
                }}
              />
            </Box>
          )}
        </PreviewDialog>
      </Box>
    );
  }
);

// CriterionDialog Component
const CriterionDialog = ({
  open,
  onClose,
  criterion,
  selectedDepartment,
  failedCriteria,
  phaseId,
  user,
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

      if (score === "không đạt") {
        const imageFiles = await imageHandlerRef.current.getImages();

        if (!imageFiles || imageFiles.length === 0) {
          alert(
            "Vui lòng chụp hoặc tải lên ít nhất một ảnh trước khi đánh giá không đạt"
          );
          setIsUploading(false);
          return;
        }

        const formData = new FormData();
        imageFiles.forEach((file) => {
          formData.append("photos", file);
        });
        formData.append("userId", user.id_user);

        try {
          const uploadResponse = await axios.post(
            `${API_URL}/upload-photos`,
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

      const scoreData = {
        id_department: selectedDepartment.id,
        id_criteria: criterion.id,
        id_phase: phaseId,
        id_user: user.id_user,
        is_fail: score === "không đạt" ? 1 : 0,
        date_updated: new Date().toISOString(),
      };

      await axios.post(`${API_URL}/phase-details`, scoreData);
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

export { CriterionDialog };
