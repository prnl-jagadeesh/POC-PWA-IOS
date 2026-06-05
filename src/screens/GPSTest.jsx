import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, MapPin, AlertCircle, Play, Square, Navigation, CheckCircle2 } from 'lucide-react';

export default function GPSTest({ scorecard, updateScorecard, onBack }) {
  const [coords, setCoords] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState('');
  const [permissionState, setPermissionState] = useState('unknown');

  const watchIdRef = useRef(null);

  // Scorecard setup
  const testId = 'gps';
  const currentScore = scorecard[testId] || { status: '', notes: '' };
  const [testStatus, setTestStatus] = useState(currentScore.status);
  const [testNotes, setTestNotes] = useState(currentScore.notes);

  // Detect Geolocation permission state where supported
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((result) => {
          setPermissionState(result.state);
          result.onchange = () => {
            setPermissionState(result.state);
          };
        })
        .catch(() => {
          setPermissionState('prompt');
        });
    } else {
      setPermissionState('prompt');
    }
  }, []);

  // Sync scorecard local state
  useEffect(() => {
    setTestStatus(currentScore.status);
    setTestNotes(currentScore.notes);
  }, [scorecard]);

  // Clean up location tracker on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  const handleGetCurrentLocation = () => {
    setError('');
    setCoords(null);
    
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          accuracy: position.coords.accuracy.toFixed(1),
          timestamp: new Date(position.timestamp).toLocaleTimeString()
        });
        setPermissionState('granted');
      },
      (err) => {
        console.error('Location grab failed:', err);
        setError(`Location error: ${err.message}. Please verify GPS toggle is enabled.`);
      },
      options
    );
  };

  const startTracking = () => {
    setError('');
    setCoords(null);
    setTracking(true);

    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser.');
      setTracking(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          accuracy: position.coords.accuracy.toFixed(1),
          timestamp: new Date(position.timestamp).toLocaleTimeString()
        });
        setPermissionState('granted');
      },
      (err) => {
        console.error('Location stream failed:', err);
        setError(`Location tracking error: ${err.message}`);
        stopTracking();
      },
      options
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
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
          <MapPin size={24} style={{ color: 'var(--accent-blue)' }} />
          GPS Geolocation Test
        </h2>

        {/* Info Box detailing iOS background limits */}
        <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
          <span>💡</span>
          <div>
            <strong>Background Limit Note:</strong>
            <p style={{ color: 'inherit', fontSize: '0.82rem', marginTop: '0.2rem' }}>
              While foreground GPS is highly supported, background tracking in mobile browsers/PWAs is extremely limited on both iOS and Android. Once the screen locks or the browser is minimized, coordinates stream stops. Native Flutter apps can bypass this limitation using device background threads.
            </p>
          </div>
        </div>

        {/* Geolocation Permissions state */}
        <div className="info-row" style={{ marginBottom: '1.25rem' }}>
          <span className="info-label">Browser Geolocation Permission</span>
          <span className={`badge ${
            permissionState === 'granted' ? 'supported' : 
            permissionState === 'denied' ? 'unsupported' : 'partial'
          }`}>
            {permissionState}
          </span>
        </div>

        {/* Control Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <button className="btn btn-primary" onClick={handleGetCurrentLocation} disabled={tracking}>
            <Navigation size={18} /> Get Current Location
          </button>

          {tracking ? (
            <button className="btn btn-danger" onClick={stopTracking}>
              <Square size={16} /> Stop Streaming Coordinates
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={startTracking}>
              <Play size={16} /> Stream Location Updates
            </button>
          )}
        </div>

        {/* Error Messaging */}
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Display Output Coordinates */}
        {coords && (
          <div className="card" style={{ background: 'rgba(15, 23, 42, 0.45)', margin: 0, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Hardware Coordinates
              </h4>
              {tracking && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--secondary)', display: 'inline-block', animation: 'spin 1.5s infinite linear' }} />
                  Tracking Live
                </span>
              )}
            </div>

            <div className="info-row">
              <span className="info-label">Latitude</span>
              <span className="info-value" style={{ fontFamily: 'monospace', fontSize: '1.05rem', color: '#ffffff' }}>
                {coords.latitude}
              </span>
            </div>
            
            <div className="info-row">
              <span className="info-label">Longitude</span>
              <span className="info-value" style={{ fontFamily: 'monospace', fontSize: '1.05rem', color: '#ffffff' }}>
                {coords.longitude}
              </span>
            </div>
            
            <div className="info-row">
              <span className="info-label">Accuracy Radius</span>
              <span className="info-value">
                ± {coords.accuracy} meters
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">Acquired At</span>
              <span className="info-value">
                {coords.timestamp}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Scorecard Control */}
      <div className="card" style={{ borderTop: '2px solid var(--accent-blue)' }}>
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
            placeholder="e.g. Foreground GPS tracks fine; Background tracking fails on exit"
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
