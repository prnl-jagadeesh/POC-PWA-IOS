import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Radio, Terminal, Copy, Check, Info, ShieldAlert, Cpu } from 'lucide-react';

export default function BluetoothTest({ scorecard, updateScorecard, onBack }) {
  const bluetoothSupported = 'bluetooth' in navigator;
  
  // States
  const [deviceName, setDeviceName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [scanStatus, setScanStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState([]);
  
  // Diagnostic parameters
  const [browserInfo, setBrowserInfo] = useState('');
  const [osInfo, setOsInfo] = useState('');
  const [pwaMode, setPwaMode] = useState('');
  
  // Results Checklist states
  const [apiAvailable, setApiAvailable] = useState(bluetoothSupported ? 'Pass' : 'Fail');
  const [pickerOpened, setPickerOpened] = useState('Not Tested');
  const [deviceSelected, setDeviceSelected] = useState('Not Tested');

  // Scorecard setup
  const testId = 'bluetooth';
  const currentScore = scorecard[testId] || { status: '', notes: '' };
  const [overallStatus, setOverallStatus] = useState(currentScore.status || '');
  const [customNotes, setCustomNotes] = useState(currentScore.notes || '');

  const consoleEndRef = useRef(null);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] ${msg}`;
    setLogs(prev => [...prev, formatted]);
  };

  // Run initial environment and support check on mount
  useEffect(() => {
    // 1. Detect OS
    const ua = navigator.userAgent;
    let os = 'Desktop / Other';
    if (/iPad|iPhone|iPod/.test(ua)) os = 'iOS';
    else if (/android/i.test(ua)) os = 'Android';
    setOsInfo(os);

    // 2. Detect Browser
    let browser = 'Other Browser';
    if (/chrome|crios/i.test(ua) && !/edge/i.test(ua)) browser = 'Google Chrome';
    else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Apple Safari';
    else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
    else if (/edge/i.test(ua)) browser = 'Microsoft Edge';
    setBrowserInfo(browser);

    // 3. Detect PWA Mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setPwaMode(isStandalone ? 'Installed PWA (Standalone)' : 'Standard Browser Tab');

    // Logs initial states
    setLogs([
      `[${new Date().toLocaleTimeString()}] Bluetooth diagnostics console active.`,
      `[${new Date().toLocaleTimeString()}] Support Check: navigator.bluetooth is ${bluetoothSupported ? 'AVAILABLE' : 'UNDEFINED'}.`
    ]);

    if (!isSecureContext && window.location.hostname !== 'localhost') {
      addLog('Warning: Web Bluetooth requires a secure HTTPS context. Scanning will be blocked on HTTP connections.');
    }
  }, []);

  // Sync scorecard local state
  useEffect(() => {
    setOverallStatus(currentScore.status || '');
    setCustomNotes(currentScore.notes || '');
  }, [scorecard]);

  // Scroll logs container to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleTestBluetooth = async () => {
    setError('');
    setDeviceName('');
    setDeviceId('');
    setScanStatus('Scanning');
    addLog('Requesting BLE devices using acceptsAllDevices: true option...');

    if (!bluetoothSupported) {
      setScanStatus('Failed');
      setPickerOpened('Fail');
      setDeviceSelected('Fail');
      const msg = 'Web Bluetooth API is not supported on this browser/device engine.';
      setError(msg);
      addLog(`[Error] ${msg}`);
      return;
    }

    try {
      // Trigger native browser device chooser
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true
      });
      
      // Success! Picker opened and user selected a device
      setPickerOpened('Pass');
      setDeviceSelected('Pass');
      setDeviceName(device.name || 'Unnamed BLE Device');
      setDeviceId(device.id || 'N/A');
      setScanStatus('Success');
      addLog(`Connected: Device Name="${device.name || 'Unnamed'}", Device ID="${device.id}"`);
    } catch (err) {
      setScanStatus('Failed');
      addLog(`[Error] Scanner output: ${err.name} - ${err.message}`);
      
      // Analyze rejection type to check if picker actually opened
      if (err.name === 'NotFoundError' && err.message.toLowerCase().includes('cancel')) {
        // Rejection is cancel: implies picker DID open, but user cancelled choice
        setPickerOpened('Pass');
        setDeviceSelected('Fail (Cancelled)');
        addLog('Device picker was successfully opened, but user cancelled selection.');
      } else {
        // General scan failure: picker blocked or rejected
        setPickerOpened('Fail');
        setDeviceSelected('Fail');
        setError(err.message);
      }
    }
  };

  const handleCopyResults = () => {
    const textResult = 
`### Web Bluetooth Audit Results
- **OS**: ${osInfo}
- **Browser**: ${browserInfo}
- **PWA Mode**: ${pwaMode}
- **API Availability**: ${bluetoothSupported ? 'Supported ✅' : 'Unsupported ❌'}

| Test | Result |
| :--- | :--- |
| Bluetooth API Available | ${apiAvailable} |
| Device Picker Opened | ${pickerOpened} |
| Device Selected | ${deviceSelected} |

*Scan Status*: ${scanStatus}
*Device Name*: ${deviceName || 'N/A'}
*Device ID*: ${deviceId || 'N/A'}
*Errors*: ${error || 'None'}`;

    navigator.clipboard.writeText(textResult);
    setCopied(true);
    addLog('Audit logs copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveScorecard = () => {
    updateScorecard(testId, overallStatus, customNotes);
    addLog(`Scorecard updated for Web Bluetooth API to: ${overallStatus.toUpperCase()}`);
  };

  return (
    <div className="fade-in">
      <button className="btn-back" onClick={onBack}>
        <ChevronLeft size={18} /> Back to Dashboard
      </button>

      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Radio size={24} style={{ color: 'var(--color-info)' }} />
          Web Bluetooth Test
        </h2>
        
        <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
          Compare BLE connectivity capabilities between iOS Safari and Android Chrome PWAs using native Bluetooth chooser interfaces.
        </p>

        {/* Feature Capability Status Badge */}
        <div className="info-row" style={{ marginBottom: '1.25rem' }}>
          <span className="info-label">Web Bluetooth API Status</span>
          <span className={`badge ${bluetoothSupported ? 'supported' : 'unsupported'}`}>
            {bluetoothSupported ? 'Supported ✅' : 'Not Supported ❌'}
          </span>
        </div>

        {/* Business use cases note (Requirement 9) */}
        <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
          <span>💡</span>
          <div>
            <strong>PWA BLE Business Use Cases:</strong>
            <p style={{ color: 'inherit', fontSize: '0.78rem', marginTop: '0.2rem', lineHeight: '1.4' }}>
              Future use cases such as attendance devices, BLE beacons, smart wearables, card readers, and hardware integrations may require Bluetooth support.
            </p>
          </div>
        </div>

        {/* Diagnostic Metadata Panel (Requirement 6) */}
        <div className="card" style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid rgba(255,255,255,0.04)', margin: '0 0 1.25rem 0', padding: '0.85rem' }}>
          <h4 style={{ fontSize: '0.85rem', color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Cpu size={14} style={{ color: 'var(--color-info)' }} />
            Diagnostic Metadata
          </h4>
          <div className="info-row">
            <span className="info-label">Operating System</span>
            <span className="info-value bold">{osInfo}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Browser Client</span>
            <span className="info-value">{browserInfo}</span>
          </div>
          <div className="info-row">
            <span className="info-label">PWA Mode</span>
            <span className="info-value">{pwaMode}</span>
          </div>
          <div className="info-row">
            <span className="info-label">navigator.bluetooth Available</span>
            <span className="info-value bold" style={{ color: bluetoothSupported ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {bluetoothSupported ? 'Yes' : 'No'}
            </span>
          </div>
        </div>

        {/* Scanner Trigger button */}
        <button 
          className="btn btn-primary" 
          onClick={handleTestBluetooth}
          style={{ marginBottom: '1.25rem' }}
        >
          <Radio size={16} /> Test Bluetooth Connection
        </button>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Scan Status & Selected BLE Device info (Requirement 5) */}
        {scanStatus !== 'Idle' && (
          <div className="card" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.03)', margin: '0 0 1.25rem 0', padding: '0.85rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>Connection Session</h4>
            <div className="info-row">
              <span className="info-label">Scan Status</span>
              <span className="info-value bold" style={{ 
                color: scanStatus === 'Success' ? 'var(--color-success)' : 
                       scanStatus === 'Failed' ? 'var(--color-danger)' : 'var(--color-warning)'
              }}>{scanStatus.toUpperCase()}</span>
            </div>
            {deviceName && (
              <div className="info-row">
                <span className="info-label">Device Name</span>
                <span className="info-value bold" style={{ color: '#ffffff' }}>{deviceName}</span>
              </div>
            )}
            {deviceId && (
              <div className="info-row">
                <span className="info-label">Device ID</span>
                <span className="info-value" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{deviceId}</span>
              </div>
            )}
          </div>
        )}

        {/* Results Matrix Table (Requirement 7) */}
        <h3 style={{ fontSize: '0.95rem', color: '#f8fafc', marginBottom: '0.5rem' }}>Evaluation Outcomes Matrix</h3>
        <table className="scorecard-table" style={{ marginBottom: '1rem' }}>
          <thead>
            <tr>
              <th>Test Criteria</th>
              <th style={{ textAlign: 'right' }}>Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Bluetooth API Available</td>
              <td style={{ textAlign: 'right', fontWeight: 600, color: apiAvailable === 'Pass' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {apiAvailable}
              </td>
            </tr>
            <tr>
              <td>Device Picker Opened</td>
              <td style={{ textAlign: 'right', fontWeight: 600, color: pickerOpened === 'Pass' ? 'var(--color-success)' : pickerOpened.startsWith('Fail') ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                {pickerOpened}
              </td>
            </tr>
            <tr>
              <td>Device Selected</td>
              <td style={{ textAlign: 'right', fontWeight: 600, color: deviceSelected === 'Pass' ? 'var(--color-success)' : deviceSelected.startsWith('Fail') ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                {deviceSelected}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Copy Results button (Requirement 8) */}
        <button className="btn btn-outline" onClick={handleCopyResults}>
          {copied ? <Check size={16} style={{ color: 'var(--secondary)' }} /> : <Copy size={16} />}
          Copy Results to Clipboard
        </button>
      </div>

      {/* Terminal log console */}
      <div className="card" style={{ padding: '0.75rem' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Terminal size={16} style={{ color: 'var(--color-info)' }} />
          Diagnostics Console
        </h3>
        
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderRadius: '8px',
          padding: '0.6rem 0.8rem',
          height: '130px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.74rem',
          color: '#22d3ee',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          lineHeight: '1.4'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ wordBreak: 'break-all', marginBottom: '0.2rem' }}>{log}</div>
          ))}
          <div ref={consoleEndRef} />
        </div>
      </div>

      {/* Scorecard quick rating */}
      <div className="card" style={{ borderTop: '2px solid var(--color-info)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Capability Evaluation</h3>
        
        <div className="form-group">
          <label className="form-label">Test Result</label>
          <select 
            className="scorecard-select" 
            value={overallStatus} 
            onChange={(e) => setOverallStatus(e.target.value)}
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
            placeholder="e.g. Fails on iOS Safari due to Apple engine blocks; Picker opens on Android"
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
          />
        </div>

        <button className="btn btn-secondary" onClick={handleSaveScorecard}>
          Update Scorecard Status
        </button>
      </div>
    </div>
  );
}
