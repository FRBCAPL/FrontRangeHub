import React, { useEffect, useRef, useState } from 'react';
import './SubmitScorePanel.css';

const SubmitScorePanel = () => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setCameraError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setCameraError('Camera access denied or unavailable. Check tablet permissions.');
      console.error('Arcade camera error:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setCameraActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
    stopCamera();
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setCameraError('');
  };

  return (
    <div className="arcade-submit">
      <div className="arcade-submit-instructions">
        <h3>🏆 High Score Submission</h3>
        <ol>
          <li>Earn a score on the arcade machine</li>
          <li>Enter your initials on the game leaderboard</li>
          <li>Take a photo of the score screen</li>
          <li>Submit for the Legends leaderboard</li>
        </ol>
      </div>

      {!capturedImage && !cameraActive && (
        <button type="button" className="arcade-submit-camera-btn" onClick={startCamera}>
          Take Photo
        </button>
      )}

      {cameraError && <p className="arcade-submit-error">{cameraError}</p>}

      {cameraActive && (
        <div className="arcade-submit-camera-wrap">
          <div className="arcade-submit-overlay-guide">
            <span>Align high-score table here</span>
          </div>
          <video ref={videoRef} autoPlay playsInline muted className="arcade-submit-video" />
          <div className="arcade-submit-camera-actions">
            <button type="button" className="arcade-submit-capture-btn" onClick={capturePhoto}>
              Capture
            </button>
            <button type="button" className="arcade-submit-cancel-btn" onClick={stopCamera}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {capturedImage && (
        <div className="arcade-submit-preview">
          <img src={capturedImage} alt="Captured arcade score screen" />
          <p className="arcade-submit-coming-soon">
            Photo captured. OCR score reading comes in V3 — for now use Manual score entry on the Leaderboards tab.
          </p>
          <button type="button" className="arcade-submit-retake-btn" onClick={resetCapture}>
            Retake Photo
          </button>
        </div>
      )}
    </div>
  );
};

export default SubmitScorePanel;
