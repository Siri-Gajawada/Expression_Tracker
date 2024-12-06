import React, { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { uploadImages } from '../services/api.js'; // Assuming your API utility

const ImageCapture = ({ sessionId, isActive }) => {
  const [screenshot, setScreenshot] = useState(null);
  const [webcamImage, setWebcamImage] = useState(null);
  const videoRef = useRef(null);
  const capturingRef = useRef(false);
  const streamRef = useRef(null);

  // Function to capture a screenshot
  const captureScreenshot = async () => {
    try {
      const canvas = await html2canvas(document.body); // Capture the current view
      canvas.toBlob((blob) => {
        const file = new File([blob], 'screenshot.png', { type: 'image/png' });
        setScreenshot(file);
      }, 'image/png');
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    }
  };

  // Function to capture webcam image
  const captureWebcamImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        const file = new File([blob], 'webcam.png', { type: 'image/png' });
        setWebcamImage(file);
      }, 'image/png');
    }
  };

  // Single capture handler to avoid multiple triggers
  const captureImages = () => {
    if (!capturingRef.current && isActive) {
      capturingRef.current = true;
      captureScreenshot();
      captureWebcamImage();
      setTimeout(() => {
        capturingRef.current = false;
      }, 1000);
    }
  };

  // Upload images when both are ready
  useEffect(() => {
    const upload = async () => {
      if (screenshot && webcamImage && sessionId) {
        try {
          await uploadImages(screenshot, webcamImage, sessionId);
          console.log('Images uploaded successfully');
          setScreenshot(null);
          setWebcamImage(null);
        } catch (error) {
          console.error('Error uploading images:', error);
        }
      }
    };
    upload();
  }, [screenshot, webcamImage, sessionId]);

  // Start/stop webcam based on isActive prop
  useEffect(() => {
    const startWebcam = async () => {
      if (isActive) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing webcam:', error);
        }
      }
    };

    const stopWebcam = () => {
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };

    if (isActive) {
      startWebcam();
    } else {
      stopWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [isActive]);

  // Periodically capture images
  useEffect(() => {
    let intervalId;

    if (isActive) {
      intervalId = setInterval(() => {
        captureImages();
      }, 5000); // Adjust interval as needed
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isActive]);

  return(
    <div>
      <video ref={videoRef} autoPlay style={{ display: 'none' }} crossOrigin="anonymous" />
    </div>
  );
};

export default ImageCapture;