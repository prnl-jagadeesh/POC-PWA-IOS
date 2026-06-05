import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Bell, Copy, Check, Info, ShieldAlert, Cpu, Terminal, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { getNotificationToken, isFirebaseConfigured } from '../utils/firebase';

export default function PushNotificationTest({ scorecard, updateScorecard, onBack }) {
  const [permission, setPermission] = useState('Notification' in window ? Notification.permission : 'unsupported');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [isMockToken, setIsMockToken] = useState(true);
  const [swScope, setSwScope] = useState('');
  const [logs, setLogs] = useState([]);
  
  // Environment Check states
  const [isSecure, setIsSecure] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [iosVersion, setIosVersion] = useState(null);
  const [isIosDevice, setIsIosDevice] = useState(false);

  // Scorecard state
  const testId = 'notification';
  const currentScore = scorecard[testId] || { status: '', notes: '' };
  const [testStatus, setTestStatus] = useState(currentScore.status);
  const [testNotes, setTestNotes] = useState(currentScore.notes);

  const consoleEndRef = useRef(null);

  const addLog = (message) => {
    setLogs(prev => [...prev, message]);
  };

  // Run environmental diagnostics on mount
  useEffect(() => {
    // 1. HTTPS Context check
    const secure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    setIsSecure(secure);

    // 2. Standalone Mode check
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(standalone);

    // 3. iOS detection and version parsing
    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    setIsIosDevice(isIos);

    if (isIos) {
      const match = ua.match(/OS (\d+)_(\d+)_?(\d+)?/);
      if (match) {
        setIosVersion({
          major: parseInt(match[1], 10),
          minor: parseInt(match[2], 10),
          string: `${match[1]}.${match[2]}`
        });
      }
    }

    // Initialize diagnostic messages
    const time = new Date().toLocaleTimeString();
    setLogs([
      `[${time}] Diagnostic console initialized.`,
      `[${time}] System Environment: OS=${isIos ? 'iOS' : 'Android/Desktop'}, HTTPS=${secure ? 'Yes' : 'No'}, PWA=${standalone ? 'Standalone' : 'Browser Tab'}`
    ]);

    // Check SW scope if registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        const fcmReg = regs.find(r => r.scope.includes('/firebase-cloud-messaging-push-scope'));
        if (fcmReg) {
          setSwScope(fcmReg.scope);
          addLog(`[Diagnostic] Found existing FCM service worker registered at scope: ${fcmReg.scope}`);
        } else {
          setSwScope('Not Registered');
        }
      });
    }
  }, []);

  // Scroll terminal logs automatically
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Sync scorecard local state
  useEffect(() => {
    setTestStatus(currentScore.status);
    setTestNotes(currentScore.notes);
  }, [scorecard]);

  const handleRequestPermission = async () => {
    setError('');
    addLog('Requesting notification permission...');
    if (!('Notification' in window)) {
      const err = 'Notifications are not supported by this browser engine.';
      setError(err);
      addLog(`[Error] ${err}`);
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      addLog(`Notification permission dialog complete. Status: ${perm.toUpperCase()}`);
      if (perm === 'denied') {
        const err = 'Permission denied. Reset browser site permissions to re-evaluate.';
        setError(err);
        addLog(`[Warning] ${err}`);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
      addLog(`[Error] Request failed: ${err.message}`);
    }
  };

  const handleGenerateToken = async () => {
    setError('');
    setLoading(true);
    setToken('');
    addLog('Initiating FCM token retrieval pipeline...');
    try {
      const result = await getNotificationToken(addLog);
      setToken(result.token);
      setIsMockToken(result.isMock);
      setSwScope(result.swScope);
      addLog('Retrieved token registration complete.');
    } catch (err) {
      setError(err.message);
      addLog(`[Fatal Error] Generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    addLog('FCM token copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveScorecard = () => {
    updateScorecard(testId, testStatus, testNotes);
    addLog(`Scorecard status updated to: ${testStatus.toUpperCase()}`);
  };

  // Determine iOS version verification
  const isIosVersionSupported = () => {
    if (!isIosDevice) return true;
    if (!iosVersion) return false;
    return iosVersion.major > 16 || (iosVersion.major === 16 && iosVersion.minor >= 4);
  };

  // Check if environment variables are populated
  const firebaseConfigured = isFirebaseConfigured();

  const getEnvVarStatus = () => {
    const keys = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID'
    ];
    
    return keys.map(k => {
      const val = import.meta.env[k];
      const isSet = val && val.trim() !== '' && val !== 'your_firebase_api_key_here' && val !== 'your_firebase_messaging_sender_id_here';
      return { key: k, isSet };
    });
  };

  const envVarDetails = getEnvVarStatus();

  return (
    <div className="fade-in">
      <button className="btn-back" onClick={onBack}>
        <ChevronLeft size={18} /> Back to Dashboard
      </button>

      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Bell size={24} style={{ color: 'var(--primary)' }} />
          Push Notification Test
        </h2>

        {/* Dynamic iOS Capability Diagnostics Check Panel (Task 9) */}
        <div className="card" style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.04)', margin: '0 0 1rem 0' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#f8fafc', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Cpu size={16} style={{ color: 'var(--secondary)' }} />
            iOS PWA Pre-requisites Validator
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {/* 1. Secure Context (HTTPS) */}
            <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#94a3b8' }}>Secure HTTPS context (or localhost):</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isSecure ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                {isSecure ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {isSecure ? 'SECURE' : 'INSECURE'}
              </span>
            </div>

            {/* 2. Standalone Mode */}
            <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#94a3b8' }}>Added to Home Screen (Standalone PWA):</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isStandalone ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 600 }}>
                {isStandalone ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {isStandalone ? 'STANDALONE' : 'BROWSER TAB'}
              </span>
            </div>

            {/* 3. iOS Version checks */}
            {isIosDevice && (
              <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#94a3b8' }}>iOS OS Version Compatibility (iOS 16.4+):</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isIosVersionSupported() ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                  {isIosVersionSupported() ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {iosVersion ? `iOS ${iosVersion.string}` : 'Unknown OS version'}
                </span>
              </div>
            )}

            {/* 4. Notification Permission */}
            <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#94a3b8' }}>Notification Permission granted:</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: permission === 'granted' ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 600 }}>
                {permission === 'granted' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {permission.toUpperCase()}
              </span>
            </div>
          </div>
          
          {isIosDevice && !isStandalone && (
            <div className="alert alert-warning" style={{ margin: '0.75rem 0 0 0', padding: '0.6rem 0.8rem', fontSize: '0.78rem' }}>
              ⚠️ iOS Safari blocks PWA notifications inside tabs. You <strong>MUST</strong> use Safari's "Add to Home Screen" to install and launch this app.
            </div>
          )}
        </div>

        {/* Environmental Configuration Status */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div className="info-row">
            <span className="info-label">Environment Settings Configuration</span>
            <span className={`badge ${firebaseConfigured ? 'supported' : 'partial'}`}>
              {firebaseConfigured ? 'Production Keys Active' : 'Simulator Mode'}
            </span>
          </div>
          
          {/* List of keys status */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '0.35rem', 
            fontSize: '0.72rem', 
            marginTop: '0.5rem',
            padding: '0.5rem',
            background: 'rgba(0,0,0,0.15)',
            borderRadius: '6px'
          }}>
            {envVarDetails.map(item => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>{item.key.replace('VITE_FIREBASE_', '')}:</span>
                <span style={{ fontWeight: 600, color: item.isSet ? 'var(--secondary)' : 'var(--color-danger)' }}>
                  {item.isSet ? 'LOADED' : 'MISSING'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Service Worker Diagnostics */}
        <div className="info-row" style={{ marginBottom: '1.25rem' }}>
          <span className="info-label">FCM Service Worker scope</span>
          <span className="info-value" style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>
            {swScope}
          </span>
        </div>

        {/* Control Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button 
            className="btn btn-outline" 
            onClick={handleRequestPermission}
            disabled={permission === 'unsupported'}
          >
            Request Notification Permission
          </button>

          <button 
            className="btn btn-primary" 
            onClick={handleGenerateToken}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Generate FCM Token'}
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
            {error}
          </div>
        )}

        {/* Token Area */}
        {token && (
          <div style={{ marginTop: '1.25rem' }}>
            <span className="form-label">
              FCM Registration Token {isMockToken && '(Simulated)'}
            </span>
            <div className="copy-wrapper">
              <div className="copy-text">{token}</div>
              <button className="btn btn-outline" onClick={handleCopyToken} style={{ width: 'auto', padding: '0.5rem' }}>
                {copied ? <Check size={16} style={{ color: 'var(--secondary)' }} /> : <Copy size={16} />}
              </button>
            </div>
            {isMockToken && (
              <p style={{ fontSize: '0.74rem', color: 'var(--color-warning)', marginTop: '0.4rem' }}>
                * Running mock token. To trigger actual FCM delivery, set Firebase credentials in your `.env` variables and rebuild.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Diagnostics Console (Task 7 & 8) */}
      <div className="card" style={{ padding: '0.75rem' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Terminal size={16} style={{ color: 'var(--primary)' }} />
          Diagnostics Console
        </h3>
        
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderRadius: '8px',
          padding: '0.6rem 0.8rem',
          height: '140px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.74rem',
          color: '#34d399',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          lineHeight: '1.4'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ wordBreak: 'break-all', marginBottom: '0.2rem' }}>{log}</div>
          ))}
          <div ref={consoleEndRef} />
        </div>
      </div>

      {/* Quick Scorecard Control */}
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
            placeholder="e.g. Requires standalone Home Screen launch for iOS Safari"
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
