import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Camera, Upload, CheckCircle, AlertCircle, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import jsQR from 'jsqr';

export default function CameraQRTest({ scorecard, updateScorecard, onBack }) {
  const [cameraPermission, setCameraPermission] = useState('unknown');
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const streamRef = useRef(null);

  // Scorecard rating setup
  const testId = 'camera';
  const currentScore = scorecard[testId] || { status: '', notes: '' };
  const [testStatus, setTestStatus] = useState(currentScore.status);
  const [testNotes, setTestNotes] = useState(currentScore.notes);

  // Detect camera permission on mount (using experimental query where supported)
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'camera' })
        .then((result) => {
          setCameraPermission(result.state);
          result.onchange = () => {
            setCameraPermission(result.state);
          };
        })
        .catch(() => {
          setCameraPermission('prompt');
        });
    } else {
      setCameraPermission('prompt'); // Fallback for browsers that don't support camera query
    }
  }, []);

  // Sync scorecard local state
  useEffect(() => {
    setTestStatus(currentScore.status);
    setTestNotes(currentScore.notes);
  }, [scorecard]);

  // Clean up scanner and camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setError('');
    setScannedResult('');
    setScanning(true);
    
    try {
      const constraints = {
        video: { facingMode: 'environment' } // Prefer rear camera on mobile
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        videoRef.current.play();
        requestRef.current = requestAnimationFrame(tick);
        setCameraPermission('granted');
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError(`Camera error: ${err.message}. Please check browser permissions.`);
      setScanning(false);
      setCameraPermission('denied');
    }
  };

  const stopCamera = () => {
    setScanning(false);
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // QR Scanning loop
  const tick = () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.paused) {
      requestRef.current = requestAnimationFrame(tick);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame onto the hidden canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Attempt decoding
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      
      if (code) {
        // QR found! Trigger haptic feedback and stop
        if ('vibrate' in navigator) {
          navigator.vibrate(100);
        }
        setScannedResult(code.data);
        stopCamera();
        return;
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  // Fallback image uploading decoder
  const handleFileUpload = (event) => {
    setError('');
    setScannedResult('');
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          setScannedResult(code.data);
        } else {
          setError('Could not detect any QR code in the uploaded image.');
        }
      };
      img.onerror = () => {
        setError('Failed to parse the uploaded image.');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const copyResult = () => {
    if (!scannedResult) return;
    navigator.clipboard.writeText(scannedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUrl = (str) => {
    try {
      new URL(str);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSaveScorecard = () => {
    updateScorecard(testId, testStatus, testNotes);
  };

  return (
    <div className="fade-in">
      <button className="btn-back" onClick={onBack}>
        <ChevronLeft size={18} /> Back to Dashboard
      </button>

      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Camera size={24} style={{ color: 'var(--secondary)' }} />
          Camera & QR Scanner
        </h2>

        {/* Permission Info */}
        <div className="info-row" style={{ marginBottom: '1.25rem' }}>
          <span className="info-label">Camera Permission</span>
          <span className={`badge ${
            cameraPermission === 'granted' ? 'supported' : 
            cameraPermission === 'denied' ? 'unsupported' : 'partial'
          }`}>
            {cameraPermission}
          </span>
        </div>

        {/* Live scanner frame */}
        {scanning ? (
          <div style={{ marginBottom: '1.25rem' }}>
            <div className="scanner-viewport">
              <video ref={videoRef} className="scanner-video" />
              <div className="scanner-overlay">
                <div className="scanner-target">
                  <div className="scanner-laser" />
                </div>
              </div>
            </div>
            <button className="btn btn-danger" onClick={stopCamera} style={{ marginTop: '0.75rem' }}>
              Cancel Scanning
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: '1.25rem' }}>
            <button className="btn btn-primary" onClick={startCamera}>
              <Camera size={18} /> Open Camera Scanner
            </button>
          </div>
        )}

        {/* Fallback File Uploader */}
        <div style={{ 
          borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
          paddingTop: '1.25rem',
          marginBottom: '1rem'
        }}>
          <span className="form-label">Fallback Offline Image Upload</span>
          <label className="btn btn-outline" style={{ display: 'flex', cursor: 'pointer' }}>
            <Upload size={18} /> Upload QR Image File
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />
          </label>
        </div>

        {/* Hidden Canvas used for processing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {error && (
          <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Decoded Output */}
        {scannedResult && (
          <div className="alert alert-info" style={{ marginTop: '1.25rem', flexDirection: 'column', gap: '0.5rem', background: 'rgba(20, 184, 166, 0.08)', borderColor: 'rgba(20, 184, 166, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)', fontWeight: 600 }}>
              <CheckCircle size={18} />
              <span>Successfully Decoded:</span>
            </div>
            
            <div className="copy-wrapper" style={{ width: '100%', marginTop: '0.25rem', background: 'rgba(15, 23, 42, 0.4)' }}>
              <div className="copy-text" style={{ fontSize: '0.85rem' }}>{scannedResult}</div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button className="btn btn-outline" onClick={copyResult} style={{ width: 'auto', padding: '0.4rem' }}>
                  {copied ? <CheckCircle size={14} style={{ color: 'var(--secondary)' }} /> : <Copy size={14} />}
                </button>
                {isUrl(scannedResult) && (
                  <a href={scannedResult} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ width: 'auto', padding: '0.4rem', display: 'flex', alignItems: 'center' }}>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Evaluation Scorecard */}
      <div className="card" style={{ borderTop: '2px solid var(--secondary)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Capability Evaluation</h3>
        
        <div className="form-group">
          <label className="form-label">Test Result</label>
          <select 
            className="scorecard-select" 
            value={testStatus} 
            onChange={(e) => setTestStatus(e.target.value)}
            style={{ padding: '0.6rem', fontSize: '0.9rem' }}
          >
            <option value="">-- Mark Result --</option>
            <option value="pass">PASS (Fully Supported)</option>
            <option value="fail">FAIL (Unsupported)</option>
            <option value="partial">PARTIAL (Supported with conditions)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Evaluation Notes</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. WebRTC camera feed fully supported on mobile Safari"
            value={testNotes}
            onChange={(e) => setTestNotes(e.target.value)}
          />
        </div>

        <button className="btn btn-secondary" onClick={handleSaveScorecard}>
          Update Scorecard Status
        </button>
      </div>
    </div>
  );
}
