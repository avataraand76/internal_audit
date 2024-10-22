// frontend/src/components/ImageHandler.js
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  ImageList,
  ImageListItem,
  Dialog,
  IconButton,
  Typography,
  styled,
  Alert,
} from "@mui/material";
import Camera from "react-html5-camera-photo";
import "react-html5-camera-photo/build/css/index.css";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";

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
  // Hiển thị nút chụp ảnh của camera
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

const ImageHandler = ({ onImagesChange, images: propImages }) => {
  const fileInputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState(null);
  const imageIdRef = useRef(Date.now());

  useEffect(() => {
    if (propImages && propImages.length > 0) {
      const imagesWithIds = propImages.map((img) => ({
        ...img,
        id: img.id || `existing-${imageIdRef.current++}`,
      }));
      setImages(imagesWithIds);
      console.log(
        "Existing images IDs:",
        imagesWithIds.map((img) => img.id)
      );
    } else {
      setImages([]);
    }
  }, [propImages]);

  const generateUniqueId = () => {
    return `new-${imageIdRef.current++}`;
  };

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
      // Generate a filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const newImage = {
        id: generateUniqueId(),
        url: dataUri,
        name: `camera-capture-${timestamp}.jpg`,
        type: "image/jpeg",
      };

      const updatedImages = [...images, newImage];
      setImages(updatedImages);
      if (onImagesChange) {
        onImagesChange(updatedImages);
      }

      setShowCamera(false);
      setError(null);
    } catch (err) {
      console.error("Error capturing photo:", err);
      setError("Không thể chụp ảnh. Vui lòng thử lại.");
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = [];
    let hasError = false;

    files.forEach((file) => {
      if (isValidFileType(file)) {
        if (file.size > 10 * 1024 * 1024) {
          // 10MB limit
          setError("File ảnh không được vượt quá 10MB");
          hasError = true;
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const newImage = {
            id: generateUniqueId(),
            url: event.target.result,
            name: file.name,
            file: file, // Store the original file for upload
            type: file.type,
          };
          newImages.push(newImage);

          if (newImages.length === files.length && !hasError) {
            const updatedImages = [...images, ...newImages];
            setImages(updatedImages);
            if (onImagesChange) {
              onImagesChange(updatedImages);
            }
          }
        };
        reader.readAsDataURL(file);
      } else {
        setError("Chỉ chấp nhận file ảnh có định dạng JPG/JPEG hoặc PNG");
        hasError = true;
      }
    });
    e.target.value = null; // Reset input
  };

  const handleDeleteImage = useCallback(
    (imageId) => {
      setImages((prevImages) => {
        const updatedImages = prevImages.filter((img) => img.id !== imageId);
        if (onImagesChange) {
          onImagesChange(updatedImages);
        }
        console.log("Deleted image ID:", imageId);
        // console.log(
        //   "All image IDs after deletion:",
        //   updatedImages.map((img) => img.id)
        // );
        return updatedImages;
      });

      if (selectedImage && selectedImage.id === imageId) {
        setSelectedImage(null);
      }
    },
    [onImagesChange, selectedImage]
  );

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
          onChange={handleFileUpload}
          style={{ display: "none" }}
          accept=".jpg,.jpeg,.png"
          multiple
        />
      </Box>

      {/* Camera Dialog */}
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

      {/* Image Grid */}
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
                    onClick={() => handleDeleteImage(image.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ImageContainer>
              </ImageListItem>
            ))}
          </ImageList>
        </Box>
      )}

      {/* Preview Dialog */}
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
};

export default ImageHandler;
