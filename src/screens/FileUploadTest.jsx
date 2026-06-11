import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Upload, File, FileText, Image, HardDrive, Download, Trash2, CheckCircle2, AlertCircle, Camera } from 'lucide-react';

export default function FileUploadTest({ scorecard, updateScorecard, onBack }) {
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [fileType, setFileType] = useState('other'); // 'image', 'text', 'other'
  const [offlineFiles, setOfflineFiles] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Camera WebRTC states
  const [isCameraActive, setIsCameraActive] = useState(false);

  // API support state
  const fileReaderSupported = typeof FileReader !== 'undefined';
  const indexedDbSupported = typeof indexedDB !== 'undefined';

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Scorecard rating setup
  const testId = 'file';
  const currentScore = scorecard[testId] || { status: '', notes: '' };
  const [testStatus, setTestStatus] = useState(currentScore.status);
  const [testNotes, setTestNotes] = useState(currentScore.notes);

  // Load offline files from IndexedDB on mount
  useEffect(() => {
    loadOfflineFiles();
  }, []);

  // Sync scorecard local state
  useEffect(() => {
    setTestStatus(currentScore.status);
    setTestNotes(currentScore.notes);
  }, [scorecard]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // IndexedDB - open and retrieve offline stored files
  const loadOfflineFiles = () => {
    if (!indexedDbSupported) return;
    
    const request = indexedDB.open('pwa-files-db', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      try {
        const transaction = db.transaction('files', 'readonly');
        const store = transaction.objectStore('files');
        const getRequest = store.getAll();
        
        getRequest.onsuccess = () => {
          setOfflineFiles(getRequest.result || []);
        };
      } catch (err) {
        console.error('Failed to read files from IndexedDB:', err);
      }
    };
  };

  // WebRTC Live Camera Controls
  const startCamera = async () => {
    setError('');
    setSuccess('');
    setFile(null);
    setFileContent('');
    setIsCameraActive(true);
    
    try {
      const constraints = {
        video: { facingMode: 'environment' } // Prefer rear camera on mobile
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Delay slightly to allow element to render and mount ref
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(err => {
            console.error('Video play error:', err);
          });
        }
      }, 100);
    } catch (err) {
      console.error('Camera access error:', err);
      setError(`Camera access failed: ${err.message}. Note: Camera requires HTTPS context on mobile.`);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    setIsCameraActive(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Capture frame from video stream and convert to virtual file
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera components not ready.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Match aspect ratio
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      // Calculate file size from base64 characters length
      const sizeInBytes = Math.round((dataUrl.length * 3) / 4);

      const timestamp = new Date().toLocaleTimeString().replace(/:/g, '-');
      const filename = `camera_snap_${timestamp}.jpg`;

      setFile({
        name: filename,
        size: (sizeInBytes / 1024).toFixed(1) + ' KB',
        type: 'image/jpeg',
        lastModified: new Date().toLocaleDateString()
      });
      setFileType('image');
      setFileContent(dataUrl);
      setSuccess(`Photo captured successfully! Ready to save offline.`);
      stopCamera();
    } catch (err) {
      console.error('Draw frame error:', err);
      setError(`Capture failed: ${err.message}`);
      stopCamera();
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    setError('');
    setSuccess('');
    setFileContent('');
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      setFile(null);
      return;
    }

    setFile({
      name: selectedFile.name,
      size: (selectedFile.size / 1024).toFixed(1) + ' KB',
      type: selectedFile.type || 'unknown',
      lastModified: new Date(selectedFile.lastModified).toLocaleDateString(),
      raw: selectedFile
    });

    // Detect type and load preview
    if (selectedFile.type.startsWith('image/')) {
      setFileType('image');
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContent(event.target.result);
      };
      reader.onerror = () => setError('Failed to read image preview.');
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type.startsWith('text/') || 
               selectedFile.name.endsWith('.json') || 
               selectedFile.name.endsWith('.csv')) {
      setFileType('text');
      const reader = new FileReader();
      reader.onload = (event) => {
        // Show first 1000 characters
        setFileContent(event.target.result.slice(0, 1000));
      };
      reader.onerror = () => setError('Failed to read text file content.');
      reader.readAsText(selectedFile);
    } else {
      setFileType('other');
      // Load as data URL in case they want to cache it anyway
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContent(event.target.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // Save selected file locally to IndexedDB
  const handleSaveOffline = () => {
    if (!file || !fileContent) {
      setError('Please select or capture a file first.');
      return;
    }

    if (!indexedDbSupported) {
      setError('IndexedDB is not supported. Cannot save offline.');
      return;
    }

    const request = indexedDB.open('pwa-files-db', 1);
    request.onsuccess = (e) => {
      const db = e.target.result;
      try {
        const transaction = db.transaction('files', 'readwrite');
        const store = transaction.objectStore('files');
        
        const fileRecord = {
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: fileContent,
          timestamp: new Date().toLocaleTimeString()
        };

        const addRequest = store.add(fileRecord);
        
        transaction.oncomplete = () => {
          setSuccess(`"${file.name}" cached locally in offline queue.`);
          loadOfflineFiles();
          setFile(null);
          setFileContent('');
        };
        
        addRequest.onerror = () => {
          setError('Failed to store file in IndexedDB.');
        };
      } catch (err) {
        setError(`DB Error: ${err.message}`);
      }
    };
  };

  // Delete file from IndexedDB
  const handleDeleteFile = (id, name) => {
    if (!indexedDbSupported) return;

    const request = indexedDB.open('pwa-files-db', 1);
    request.onsuccess = (e) => {
      const db = e.target.result;
      try {
        const transaction = db.transaction('files', 'readwrite');
        const store = transaction.objectStore('files');
        store.delete(id);
        
        transaction.oncomplete = () => {
          setSuccess(`"${name}" deleted from offline queue.`);
          loadOfflineFiles();
        };
      } catch (err) {
        console.error('Delete error:', err);
      }
    };
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
          <Upload size={24} style={{ color: 'var(--primary)' }} />
          File Upload & Storage
        </h2>

        {/* API Diagnostics */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <span className={`badge ${fileReaderSupported ? 'supported' : 'unsupported'}`}>
            FileReader: {fileReaderSupported ? 'API Ok' : 'Unsupported'}
          </span>
          <span className={`badge ${indexedDbSupported ? 'supported' : 'unsupported'}`}>
            IndexedDB: {indexedDbSupported ? 'Storage Ok' : 'Unsupported'}
          </span>
        </div>

        {/* Upload Viewport Switch */}
        {isCameraActive ? (
          <div style={{ marginBottom: '1.25rem' }}>
            <div className="scanner-viewport" style={{ aspectRatio: '4 / 3', height: '250px' }}>
              <video ref={videoRef} className="scanner-video" />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={capturePhoto}>
                <Camera size={16} /> Snap Picture
              </button>
              <button className="btn btn-outline" onClick={stopCamera}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--glass-border)',
              borderRadius: '12px',
              padding: '2rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: 'rgba(15, 23, 42, 0.25)',
              transition: 'var(--transition-smooth)',
              marginBottom: '1.25rem'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
          >
            <Upload size={38} style={{ color: 'var(--primary)', marginBottom: '0.75rem', opacity: 0.8 }} />
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9' }}>Click to Choose File</p>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>
              Or use Camera button below to snap live photos
            </p>
          </div>
        )}

        {/* Input trigger buttons */}
        {!isCameraActive && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} /> Select File
            </button>
            
            <button className="btn btn-primary" onClick={startCamera}>
              <Camera size={16} /> Snap Photo
            </button>

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-info" style={{ marginBottom: '1rem', background: 'rgba(20, 184, 166, 0.08)', borderColor: 'rgba(20, 184, 166, 0.2)', color: 'var(--secondary)' }}>
            <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Selected File Details */}
        {file && (
          <div className="card" style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid rgba(255,255,255,0.05)', margin: '0 0 1.25rem 0' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Attachment Details
            </h4>

            <div className="info-row">
              <span className="info-label">File Name</span>
              <span className="info-value bold">{file.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Size</span>
              <span className="info-value">{file.size}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Mime Type</span>
              <span className="info-value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{file.type}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Last Modified</span>
              <span className="info-value">{file.lastModified}</span>
            </div>

            {/* Preview Section */}
            <div style={{ marginTop: '1rem' }}>
              <span className="form-label">Client Preview</span>
              
              {fileType === 'image' && fileContent && (
                <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', marginTop: '0.4rem', maxHeight: '200px', display: 'flex', justifyContent: 'center' }}>
                  <img src={fileContent} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} />
                </div>
              )}

              {fileType === 'text' && fileContent && (
                <pre style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  color: '#34d399',
                  overflowX: 'auto',
                  maxHeight: '150px',
                  border: '1px solid var(--glass-border)',
                  marginTop: '0.4rem',
                  whiteSpace: 'pre-wrap'
                }}>
                  {fileContent}
                </pre>
              )}

              {fileType === 'other' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginTop: '0.4rem', border: '1px solid var(--glass-border)' }}>
                  <File size={28} style={{ color: '#94a3b8' }} />
                  <div>
                    <p style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 500 }}>Preview unavailable</p>
                    <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Attachment can be stored locally</p>
                  </div>
                </div>
              )}
            </div>

            <button className="btn btn-secondary" onClick={handleSaveOffline} style={{ marginTop: '1.25rem' }}>
              <HardDrive size={18} /> Save Attachment Offline
            </button>
          </div>
        )}
      </div>

      {/* Hidden Canvas used for processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Offline Storage Queue Card */}
      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <HardDrive size={20} style={{ color: 'var(--secondary)' }} />
          Stored Offline Attachments ({offlineFiles.length})
        </h3>

        {offlineFiles.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: '#64748b', textAlign: 'center', padding: '1.5rem 0' }}>
            No files currently cached. Select a file above and save offline.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {offlineFiles.map((item) => (
              <div 
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(15, 23, 42, 0.35)',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--glass-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: '70%' }}>
                  {item.type.startsWith('image/') ? (
                    <Image size={24} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                  ) : item.type.startsWith('text/') ? (
                    <FileText size={24} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  ) : (
                    <File size={24} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  )}
                  <div style={{ overflow: 'hidden' }}>
                    <p style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.1rem' }}>
                      Size: {item.size} | Cached: {item.timestamp}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {/* Download Attachment offline */}
                  <a 
                    href={item.dataUrl} 
                    download={item.name}
                    className="btn btn-outline" 
                    style={{ width: 'auto', padding: '0.5rem' }}
                    title="Download Attachment"
                  >
                    <Download size={14} />
                  </a>
                  
                  {/* Delete Attachment */}
                  <button 
                    onClick={() => handleDeleteFile(item.id, item.name)}
                    className="btn btn-outline" 
                    style={{ width: 'auto', padding: '0.5rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)' }}
                    title="Delete Cache"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evaluation Scorecard */}
      <div className="card" style={{ borderTop: '2px solid var(--primary)' }}>
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
            placeholder="e.g. FileReader and local IndexedDB file caching fully supported on iOS Safari PWA"
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
