import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, MapPin, AlertCircle, Play, Square, Navigation, CheckCircle2, Map, RefreshCw, Sliders, History, Sparkles } from 'lucide-react';

export default function GPSTest({ scorecard, updateScorecard, onBack }) {
  const [coords, setCoords] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState('');
  const [permissionState, setPermissionState] = useState('unknown');
  
  // Map zoom and simulation states
  const [zoom, setZoom] = useState(15);
  const [simulationMode, setSimulationMode] = useState(false);
  const [coordsHistory, setCoordsHistory] = useState([]);

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

  // Track coordinates history
  const addToHistory = (newCoords) => {
    setCoordsHistory(prev => {
      const exists = prev.some(c => c.latitude === newCoords.latitude && c.longitude === newCoords.longitude);
      if (exists) return prev;
      return [newCoords, ...prev].slice(0, 5);
    });
  };

  const handleGetCurrentLocation = () => {
    setError('');
    
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser/OS context. Verify you are using HTTPS.');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const runSuccess = (position) => {
      let lat = position.coords.latitude;
      let lng = position.coords.longitude;
      
      // Inject offset if simulation mode is active on initial load
      if (simulationMode) {
        lat += (Math.random() - 0.5) * 0.001;
        lng += (Math.random() - 0.5) * 0.001;
      }

      const newCoords = {
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        accuracy: position.coords.accuracy.toFixed(1),
        timestamp: new Date(position.timestamp).toLocaleTimeString()
      };

      setCoords(newCoords);
      addToHistory(newCoords);
      setPermissionState('granted');
    };

    navigator.geolocation.getCurrentPosition(
      runSuccess,
      (err) => {
        console.warn('High accuracy GPS fetch failed. Code:', err.code, 'Attempting low accuracy WiFi/Cellular fallback...');
        
        if (err.code === 1) {
          setError(`Location Permission Denied. Please reset browser location access settings or check iOS Settings -> Privacy & Security -> Location Services.`);
          setPermissionState('denied');
          return;
        }

        // Attempt fallback with coarse coordinates
        navigator.geolocation.getCurrentPosition(
          runSuccess,
          (fallbackErr) => {
            console.error('Coarse fallback Geolocation failed:', fallbackErr);
            setError(`GPS query failed: ${fallbackErr.message} (Code: ${fallbackErr.code}). Please verify device Location Services are enabled.`);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
        );
      },
      options
    );
  };

  const startTracking = () => {
    setError('');
    setTracking(true);

    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser.');
      setTracking(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    };

    const runSuccess = (position) => {
      let lat = position.coords.latitude;
      let lng = position.coords.longitude;
      
      if (simulationMode) {
        lat += (Math.random() - 0.5) * 0.0006;
        lng += (Math.random() - 0.5) * 0.0006;
      }

      const newCoords = {
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        accuracy: position.coords.accuracy.toFixed(1),
        timestamp: new Date(position.timestamp).toLocaleTimeString()
      };

      setCoords(newCoords);
      addToHistory(newCoords);
      setPermissionState('granted');
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      runSuccess,
      (err) => {
        console.warn('Watch location high accuracy failed. Code:', err.code, 'Attempting low accuracy watch fallback...');
        if (err.code === 1) {
          setError(`Location watch Permission Denied.`);
          stopTracking();
          return;
        }

        // Clear existing high-accuracy watch
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }

        // Start coarse-accuracy tracking
        watchIdRef.current = navigator.geolocation.watchPosition(
          runSuccess,
          (fallbackErr) => {
            console.error('Location stream completely failed:', fallbackErr);
            setError(`Tracking stream error: ${fallbackErr.message} (Code: ${fallbackErr.code})`);
            stopTracking();
          },
          { enableHighAccuracy: false, timeout: 18000, maximumAge: 30000 }
        );
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

  // Simulate a manual shift update (refresh) to verify pinpoint changes dynamically
  const handleSimulateShift = () => {
    if (!coords) {
      setError('Please obtain a baseline location first before generating shifts.');
      return;
    }

    const latOffset = (Math.random() - 0.5) * 0.0015;
    const lngOffset = (Math.random() - 0.5) * 0.0015;

    const nextLat = (parseFloat(coords.latitude) + latOffset).toFixed(6);
    const nextLng = (parseFloat(coords.longitude) + lngOffset).toFixed(6);

    const newCoords = {
      latitude: nextLat,
      longitude: nextLng,
      accuracy: coords.accuracy,
      timestamp: new Date().toLocaleTimeString()
    };

    setCoords(newCoords);
    addToHistory(newCoords);
  };

  const handleSaveScorecard = () => {
    updateScorecard(testId, testStatus, testNotes);
  };

  const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  return (
    <div className="fade-in">
      <button className="btn-back" onClick={onBack}>
        <ChevronLeft size={18} /> Back to Dashboard
      </button>

      {!isSecure && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Insecure Connection (HTTP):</strong>
            <p style={{ color: 'inherit', fontSize: '0.82rem', marginTop: '0.2rem' }}>
              iOS Safari blocks the Geolocation API completely on insecure connections. If you are testing this on your physical iPhone using a local network IP (like <code>http://192.168.x.x:5175</code>), GPS coordinates will fail. You must access the PWA over HTTPS (e.g. Vercel, ngrok, or local SSL certificates) for location services to work.
            </p>
          </div>
        </div>
      )}

      {/* Geolocation Card */}
      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <MapPin size={24} style={{ color: 'var(--accent-blue)' }} />
          GPS Geolocation Test
        </h2>

        <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
          <span>💡</span>
          <div>
            <strong>Background Limit Note:</strong>
            <p style={{ color: 'inherit', fontSize: '0.82rem', marginTop: '0.2rem' }}>
              While foreground GPS is highly supported, background tracking in mobile browsers/PWAs is extremely limited on both iOS and Android. Once the screen locks or the browser is minimized, coordinates stream stops. Native Flutter apps can bypass this limitation using device background threads.
            </p>
          </div>
        </div>

        <div className="info-row" style={{ marginBottom: '1.25rem' }}>
          <span className="info-label">Browser Geolocation Permission</span>
          <span className={`badge ${
            permissionState === 'granted' ? 'supported' : 
            permissionState === 'denied' ? 'unsupported' : 'partial'
          }`}>
            {permissionState}
          </span>
        </div>

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

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

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

      {/* Dynamic Google Maps View */}
      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Map size={20} style={{ color: 'var(--secondary)' }} />
          Google Map View
        </h3>

        {/* Map Rendering Panel */}
        <div className="map-frame-container">
          {coords ? (
            <iframe
              className="map-iframe"
              title="Google Map Geolocation"
              src={`https://maps.google.com/maps?q=${coords.latitude},${coords.longitude}&z=${zoom}&output=embed`}
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div className="map-placeholder">
              <MapPin className="map-placeholder-icon" size={48} />
              <p style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>Map Awaiting Location</p>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>
                Fetch current coordinates above to center the pinpoint.
              </p>
            </div>
          )}
        </div>

        {/* Interactive Controls */}
        {coords && (
          <>
            <div className="zoom-control">
              <div className="zoom-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Sliders size={14} /> Zoom Level
                </span>
                <span style={{ fontWeight: 600 }}>{zoom}x</span>
              </div>
              <input
                type="range"
                min="10"
                max="20"
                value={zoom}
                onChange={(e) => setZoom(parseInt(e.target.value))}
                className="zoom-slider"
              />
            </div>

            {/* Simulation Controls */}
            <div className="simulation-box">
              <div className="simulation-header">
                <span className="simulation-title">
                  <Sparkles size={16} style={{ color: 'var(--accent-purple)' }} />
                  GPS Shift Simulation
                </span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={simulationMode}
                    onChange={(e) => setSimulationMode(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>
                Simulate location movement. Enabling this applies a tiny random coordinate offset on each refresh to shift the map pin.
              </p>
              <button className="btn btn-outline" onClick={handleSimulateShift} style={{ padding: '0.5rem', fontSize: '0.8rem' }}>
                <RefreshCw size={14} /> Simulate Random Move
              </button>
            </div>

            {/* Location History list */}
            {coordsHistory.length > 0 && (
              <div className="history-container">
                <span className="history-title" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <History size={12} /> Recent Map Pins
                </span>
                <div className="history-chips">
                  {coordsHistory.map((item, idx) => {
                    const isActive = coords.latitude === item.latitude && coords.longitude === item.longitude;
                    return (
                      <div
                        key={idx}
                        className={`history-chip ${isActive ? 'active' : ''}`}
                        onClick={() => setCoords(item)}
                      >
                        <span>Lat: {item.latitude}, Lng: {item.longitude}</span>
                        <span className="history-chip-time">{item.timestamp}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Capability Evaluation */}
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
