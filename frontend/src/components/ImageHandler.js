// frontend/src/components/ImageHandler.js
import React, { useRef, useState } from "react";
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
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";

const PreviewImage = styled("img")({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  cursor: "pointer",
});

const CameraContainer = styled(Box)({
  position: "relative",
  width: "100%",
  maxWidth: "600px",
  margin: "0 auto",
});

const VideoPreview = styled("video")({
  width: "100%",
  height: "auto",
});

// Định nghĩa các định dạng file được phép
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ALLOWED_FILE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

const ImageHandler = ({ onImageCapture, onImageUpload }) => {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState(null);

  // Kiểm tra định dạng file
  const isValidFileType = (file) => {
    const extension = file.name
      .toLowerCase()
      .slice(((file.name.lastIndexOf(".") - 1) >>> 0) + 2);
    return (
      ALLOWED_FILE_TYPES.includes(file.type) &&
      ALLOWED_FILE_EXTENSIONS.includes(`.${extension}`)
    );
  };

  const startCamera = async () => {
    try {
      // Kiểm tra xem trình duyệt có hỗ trợ getUserMedia không
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Trình duyệt của bạn không hỗ trợ truy cập camera");
      }

      // Kiểm tra xem đang sử dụng HTTPS hay không
      if (
        window.location.protocol !== "https:" &&
        window.location.hostname !== "localhost"
      ) {
        throw new Error("Camera chỉ hoạt động trên HTTPS hoặc localhost");
      }

      // Thử truy cập camera với các tùy chọn khác nhau
      let stream;
      try {
        // Thử sử dụng camera sau trước
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch (err) {
        // Nếu không có camera sau, thử camera trước
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (!stream) {
        throw new Error("Không thể kết nối với camera");
      }

      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setShowCamera(true);
      setError(null);
    } catch (err) {
      console.error("Lỗi camera:", err);
      let errorMessage = "Không thể truy cập camera. ";

      if (err.name === "NotAllowedError") {
        errorMessage +=
          "Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt.";
      } else if (err.name === "NotFoundError") {
        errorMessage += "Không tìm thấy thiết bị camera.";
      } else if (err.name === "NotReadableError") {
        errorMessage += "Camera đang được sử dụng bởi ứng dụng khác.";
      } else {
        errorMessage +=
          err.message || "Vui lòng kiểm tra lại thiết bị và thử lại.";
      }

      setError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setError(null);
  };

  const captureImage = () => {
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Chỉ định rõ định dạng JPEG cho ảnh chụp
      const imageUrl = canvas.toDataURL("image/jpeg", 0.8);
      const newImage = {
        id: Date.now(),
        url: imageUrl,
        name: `Captured_${new Date().toLocaleString()}.jpg`,
      };

      setImages((prev) => [...prev, newImage]);
      if (onImageCapture) {
        onImageCapture(imageUrl);
      }

      stopCamera();
      setError(null);
    } catch (err) {
      console.error("Lỗi khi chụp ảnh:", err);
      setError("Không thể chụp ảnh. Vui lòng thử lại.");
    }
  };

  const handleCaptureImage = () => {
    startCamera();
  };

  const handleUploadImage = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    let hasInvalidFile = false;

    files.forEach((file) => {
      if (!isValidFileType(file)) {
        hasInvalidFile = true;
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage = {
          id: Date.now(),
          url: e.target.result,
          name: file.name,
        };
        setImages((prev) => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });

    if (hasInvalidFile) {
      setError("Chỉ chấp nhận file ảnh có định dạng JPG/JPEG hoặc PNG");
    } else {
      setError(null);
      if (onImageUpload && files.length > 0) {
        onImageUpload(files[0]);
      }
    }

    event.target.value = null;
  };

  const handleDeleteImage = (imageId) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handlePreviewClick = (image) => {
    setSelectedImage(image);
  };

  const handleClosePreview = () => {
    setSelectedImage(null);
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
          onClick={handleCaptureImage}
        >
          Chụp ảnh
        </Button>
        <Button
          variant="contained"
          startIcon={<FileUploadIcon />}
          onClick={handleUploadImage}
        >
          Tải ảnh lên
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
          accept=".jpg,.jpeg,.png"
          multiple
        />
      </Box>

      {showCamera && (
        <Dialog
          open={showCamera}
          onClose={stopCamera}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { bgcolor: "background.default" },
          }}
        >
          <CameraContainer>
            <VideoPreview
              ref={videoRef}
              autoPlay
              playsInline
              onError={(e) => {
                console.error("Video error:", e);
                setError("Lỗi khi hiển thị video từ camera");
              }}
            />
            <Box
              sx={{ display: "flex", justifyContent: "center", gap: 2, p: 2 }}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={captureImage}
              >
                Chụp
              </Button>
              <Button variant="outlined" color="error" onClick={stopCamera}>
                Hủy
              </Button>
            </Box>
          </CameraContainer>
        </Dialog>
      )}

      {images.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Ảnh đã tải lên ({images.length})
          </Typography>
          <ImageList cols={3} gap={8}>
            {images.map((image) => (
              <ImageListItem
                key={image.id}
                sx={{
                  border: "1px solid #ddd",
                  borderRadius: 1,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <PreviewImage
                  src={image.url}
                  alt={image.name}
                  loading="lazy"
                  onClick={() => handlePreviewClick(image)}
                />
                <IconButton
                  sx={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    bgcolor: "rgba(255, 255, 255, 0.8)",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.9)",
                    },
                  }}
                  size="small"
                  onClick={() => handleDeleteImage(image.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </ImageListItem>
            ))}
          </ImageList>
        </Box>
      )}

      <Dialog
        open={!!selectedImage}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
      >
        {selectedImage && (
          <Box sx={{ position: "relative" }}>
            <IconButton
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
                color: "white",
                bgcolor: "rgba(0, 0, 0, 0.5)",
                "&:hover": {
                  bgcolor: "rgba(0, 0, 0, 0.7)",
                },
              }}
              onClick={handleClosePreview}
            >
              <CloseIcon />
            </IconButton>
            <img
              src={selectedImage.url}
              alt={selectedImage.name}
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "80vh",
                objectFit: "contain",
              }}
            />
          </Box>
        )}
      </Dialog>
    </Box>
  );
};

export default ImageHandler;
