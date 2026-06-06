import React, { useState } from 'react';
import { Clipboard, RefreshCcw, Save, Trash2, ShieldAlert } from 'lucide-react';

export default function Scorecard({ scorecard, updateScorecard, resetScorecard }) {
  const [editingNotes, setEditingNotes] = useState({});

  // Auto-detect capabilities for "Supported?" column
  const detectSupport = (featureId) => {
    switch (featureId) {
      case 'notification':
        return 'Notification' in window ? 'Yes (requires install for iOS)' : 'No';
      case 'camera':
        return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices ? 'Yes' : 'No';
      case 'sync':
        return 'SyncManager' in window ? 'Yes' : 'No (Missing on iOS)';
      case 'gps':
        return 'geolocation' in navigator ? 'Yes (Foreground only)' : 'No';
      case 'biometric':
        return 'PublicKeyCredential' in window ? 'Yes' : 'No';
      case 'badge':
        return 'setAppBadge' in navigator ? 'Yes (requires standalone)' : 'No';
      case 'bluetooth':
        return 'bluetooth' in navigator ? 'Yes' : 'No';
      default:
        return 'Unknown';
    }
  };

  const features = [
    { 
      id: 'notification', 
      name: 'Push Notification', 
      risk: 'Medium',
      riskDesc: 'iOS Safari requires PWA added to Home Screen. Real FCM keys needed for production.' 
    },
    { 
      id: 'camera', 
      name: 'Camera / QR Scan', 
      risk: 'Low',
      riskDesc: 'Highly supported via HTML5 / WebRTC stream. File upload fallback provided.' 
    },
    { 
      id: 'sync', 
      name: 'Background Sync', 
      risk: 'High',
      riskDesc: 'Completely unsupported on iOS Safari (SyncManager is undefined). Critical limitation.' 
    },
    { 
      id: 'gps', 
      name: 'GPS Location', 
      risk: 'Medium',
      riskDesc: 'Foreground GPS works fine. Background tracking is suspended when browser is minimized.' 
    },
    { 
      id: 'biometric', 
      name: 'Biometric Login', 
      risk: 'Medium',
      riskDesc: 'WebAuthn/Passkeys require secure context (HTTPS) and are domain-bound.' 
    },
    {
      id: 'badge',
      name: 'App Badge API',
      risk: 'Medium',
      riskDesc: 'Requires installed PWA standalone mode. Supported on iOS standalone since iOS 16.4.'
    },
    {
      id: 'bluetooth',
      name: 'Web Bluetooth API',
      risk: 'High',
      riskDesc: 'Completely blocked on iOS WebKit engine; supported on Android Chrome.'
    }
  ];

  const handleStatusChange = (id, value) => {
    const currentNotes = scorecard[id]?.notes || '';
    updateScorecard(id, value, currentNotes);
  };

  const handleNotesChange = (id, value) => {
    setEditingNotes(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleNotesBlur = (id) => {
    const currentStatus = scorecard[id]?.status || '';
    const noteValue = editingNotes[id] !== undefined ? editingNotes[id] : (scorecard[id]?.notes || '');
    updateScorecard(id, currentStatus, noteValue);
  };

  const getRiskTagClass = (risk) => {
    switch (risk.toLowerCase()) {
      case 'high': return 'risk-tag high';
      case 'medium': return 'risk-tag medium';
      default: return 'risk-tag low';
    }
  };

  return (
    <div className="fade-in">
      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Clipboard size={22} style={{ color: 'var(--primary)' }} />
          PWA iOS Capability Scorecard
        </h2>
        <p style={{ fontSize: '0.82rem', marginBottom: '1.25rem' }}>
          This grid auto-detects browser-level support, lists feature risk levels, and allows manual Pass / Fail / Partial marks after device tests.
        </p>

        {/* Scrollable table container */}
        <div style={{ overflowX: 'auto', margin: '0 -0.5rem' }}>
          <table className="scorecard-table">
            <thead>
              <tr>
                <th style={{ minWidth: '110px' }}>Capability</th>
                <th>API Support</th>
                <th style={{ minWidth: '95px' }}>Test Result</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feat) => {
                const itemScore = scorecard[feat.id] || { status: '', notes: '' };
                const supportText = detectSupport(feat.id);
                const currentNoteVal = editingNotes[feat.id] !== undefined ? editingNotes[feat.id] : itemScore.notes;

                return (
                  <React.Fragment key={feat.id}>
                    {/* Row 1: Core Details */}
                    <tr>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>{feat.name}</td>
                      <td>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: supportText.includes('No') ? 'var(--color-danger)' : 'var(--color-success)',
                          fontWeight: 500
                        }}>
                          {supportText}
                        </span>
                      </td>
                      <td>
                        <select 
                          className="scorecard-select"
                          value={itemScore.status}
                          onChange={(e) => handleStatusChange(feat.id, e.target.value)}
                          style={{
                            color: itemScore.status === 'pass' ? '#10b981' : 
                                   itemScore.status === 'fail' ? '#ef4444' : 
                                   itemScore.status === 'partial' ? '#f59e0b' : '#94a3b8'
                          }}
                        >
                          <option value="" style={{ color: '#94a3b8' }}>Select</option>
                          <option value="pass" style={{ color: '#10b981' }}>PASS</option>
                          <option value="fail" style={{ color: '#ef4444' }}>FAIL</option>
                          <option value="partial" style={{ color: '#f59e0b' }}>PARTIAL</option>
                        </select>
                      </td>
                      <td>
                        <span className={getRiskTagClass(feat.risk)} title={feat.riskDesc}>
                          {feat.risk}
                        </span>
                      </td>
                    </tr>
                    
                    {/* Row 2: Editable Note */}
                    <tr>
                      <td colSpan="4" style={{ padding: '0.25rem 0.5rem 0.75rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Notes / Risk Context:</span>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder={`e.g. Risk: ${feat.riskDesc}`}
                            value={currentNoteVal}
                            onChange={(e) => handleNotesChange(feat.id, e.target.value)}
                            onBlur={() => handleNotesBlur(feat.id)}
                            style={{ 
                              padding: '0.4rem 0.6rem', 
                              fontSize: '0.78rem', 
                              background: 'rgba(15, 23, 42, 0.25)',
                              borderColor: 'rgba(255,255,255,0.03)'
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Action Controls */}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-outline" 
            onClick={resetScorecard} 
            style={{ flex: 1 }}
          >
            <Trash2 size={16} /> Reset Ratings
          </button>
        </div>
      </div>

      {/* iOS vs Native Summary Card */}
      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '1.1rem' }}>
          <ShieldAlert size={18} style={{ color: 'var(--color-danger)' }} />
          PWA iOS Evaluation Insights
        </h3>
        
        <p style={{ fontSize: '0.82rem', lineHeight: '1.5', color: '#94a3b8' }}>
          <strong>FCM & Background Sync:</strong> On Apple iOS, Background Sync is completely blocked. Background notifications fail unless the PWA is installed manually to the user's home screen.
        </p>
        
        <p style={{ fontSize: '0.82rem', lineHeight: '1.5', color: '#94a3b8', marginTop: '0.5rem' }}>
          <strong>Security:</strong> All Web APIs require a secure context (HTTPS/localhost). For iOS, if your domain doesn't serve HTTPS, camera/biometrics are immediately blocked, which native Flutter apps handle seamlessly.
        </p>
      </div>
    </div>
  );
}
