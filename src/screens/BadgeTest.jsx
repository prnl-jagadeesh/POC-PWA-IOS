import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Award, Terminal, CheckCircle2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

export default function BadgeTest({ scorecard, updateScorecard, onBack }) {
  const badgeSupported = 'setAppBadge' in navigator && 'clearAppBadge' in navigator;
  
  const [currentCount, setCurrentCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const consoleEndRef = useRef(null);

  // Scorecard state management
  const testId = 'badge';
  const currentScore = scorecard[testId] || { status: '', notes: '' };
  
  // Helper to parse Android/iOS results out of combined notes string
  const parseCombinedNote = (noteStr) => {
    const defaults = { android: '', ios: '', custom: '' };
    if (!noteStr) return defaults;

    const parts = noteStr.split(' | ');
    let android = '';
    let ios = '';
    let custom = '';

    parts.forEach(part => {
      if (part.startsWith('Android: ')) {
        android = part.replace('Android: ', '').trim();
      } else if (part.startsWith('iOS: ')) {
        ios = part.replace('iOS: ', '').trim();
      } else {
        custom = part.trim();
      }
    });

    return { android, ios, custom };
  };

  const initialNotes = parseCombinedNote(currentScore.notes);
  
  const [overallStatus, setOverallStatus] = useState(currentScore.status || '');
  const [androidStatus, setAndroidStatus] = useState(initialNotes.android);
  const [iosStatus, setIosStatus] = useState(initialNotes.ios);
  const [customNotes, setCustomNotes] = useState(initialNotes.custom);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] ${msg}`;
    setLogs(prev => [...prev, formatted]);
  };

  // Sync component states if scorecard props change
  useEffect(() => {
    const syncNotes = parseCombinedNote(currentScore.notes);
    setOverallStatus(currentScore.status || '');
    setAndroidStatus(syncNotes.android);
    setIosStatus(syncNotes.ios);
    setCustomNotes(syncNotes.custom);
  }, [scorecard]);

  // Boot diagnostics logs
  useEffect(() => {
    addLog('App Badge Count API Support check initialized.');
    addLog(`navigator.setAppBadge: ${'setAppBadge' in navigator ? 'SUPPORTED' : 'UNSUPPORTED'}`);
    addLog(`navigator.clearAppBadge: ${'clearAppBadge' in navigator ? 'SUPPORTED' : 'UNSUPPORTED'}`);
    
    if (badgeSupported) {
      addLog('Badge API is supported in this browser context.');
    } else {
      addLog('Badge API is not supported. All actions will run in Simulator Mode.');
    }
  }, []);

  // Scroll terminal logs automatically
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleSetBadge = async (count) => {
    try {
      if (badgeSupported) {
        await navigator.setAppBadge(count);
        addLog(`Badge set success: Badge count updated to ${count}.`);
      } else {
        addLog(`[Simulator] Mock Badge set: Badge count updated to ${count}.`);
      }
      setCurrentCount(count);
    } catch (err) {
      addLog(`Error: setAppBadge failed: ${err.message}`);
    }
  };

  const handleIncrement = async () => {
    const nextCount = currentCount + 1;
    try {
      if (badgeSupported) {
        await navigator.setAppBadge(nextCount);
        addLog(`Badge increment success: Badge count updated to ${nextCount}.`);
      } else {
        addLog(`[Simulator] Mock Badge increment: Badge count updated to ${nextCount}.`);
      }
      setCurrentCount(nextCount);
    } catch (err) {
      addLog(`Error: Increment failed: ${err.message}`);
    }
  };

  const handleClear = async () => {
    try {
      if (badgeSupported) {
        await navigator.clearAppBadge();
        addLog('Badge clear success: Badge count cleared.');
      } else {
        addLog('[Simulator] Mock Badge clear: Badge count cleared.');
      }
      setCurrentCount(0);
    } catch (err) {
      addLog(`Error: clearAppBadge failed: ${err.message}`);
    }
  };

  const handleSaveScorecard = () => {
    // Package platform specific values into combined notes string
    const combinedNotes = `Android: ${androidStatus || 'Not Rated'} | iOS: ${iosStatus || 'Not Rated'} | ${customNotes}`;
    updateScorecard(testId, overallStatus, combinedNotes);
    addLog(`Scorecard saved successfully.`);
  };

  return (
    <div className="fade-in">
      <button className="btn-back" onClick={onBack}>
        <ChevronLeft size={18} /> Back to Dashboard
      </button>

      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Award size={24} style={{ color: '#f43f5e' }} />
          App Badge Count Test
        </h2>

        {/* Info Box explaining support */}
        <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
          <span>💡</span>
          <div>
            <strong>PWA Badge Criteria:</strong>
            <p style={{ color: 'inherit', fontSize: '0.82rem', marginTop: '0.2rem' }}>
              Badge count support depends on browser, OS version, and installed PWA mode. Programs cannot update standard browser tab icons; badges only display when the PWA is installed on the home screen (iOS Standalone supports this since version 16.4).
            </p>
          </div>
        </div>

        {/* Badge API Support Status */}
        <div className="info-row" style={{ marginBottom: '1.25rem' }}>
          <span className="info-label">App Badge API Support</span>
          <span className={`badge ${badgeSupported ? 'supported' : 'unsupported'}`}>
            {badgeSupported ? 'Supported' : 'Not Supported'}
          </span>
        </div>

        {/* Badge Display Counter */}
        <div style={{
          textAlign: 'center',
          padding: '1.25rem',
          background: 'rgba(0,0,0,0.25)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.03)',
          marginBottom: '1.25rem'
        }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current Badge Value
          </span>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: '#f43f5e', margin: '0.25rem 0' }}>
            {currentCount}
          </div>
        </div>

        {/* Badge Trigger Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <button className="btn btn-primary" onClick={() => handleSetBadge(1)}>
            Set Badge 1
          </button>
          
          <button className="btn btn-primary" onClick={() => handleSetBadge(5)}>
            Set Badge 5
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={handleIncrement}>
            Increment Badge
          </button>
          
          <button className="btn btn-outline" onClick={handleClear} style={{ display: 'flex', gap: '0.4rem' }}>
            <Trash2 size={16} />
            Clear Badge
          </button>
        </div>
      </div>

      {/* Diagnostics Console Card */}
      <div className="card" style={{ padding: '0.75rem' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Terminal size={16} style={{ color: '#f43f5e' }} />
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
          color: '#fda4af',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          lineHeight: '1.4'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ wordBreak: 'break-all', marginBottom: '0.2rem' }}>{log}</div>
          ))}
          <div ref={consoleEndRef} />
        </div>
      </div>

      {/* Scorecard Quick Rater Card */}
      <div className="card" style={{ borderTop: '2px solid #f43f5e' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Capability Evaluation</h3>
        
        {/* Android PWA Badge Rating */}
        <div className="form-group">
          <label className="form-label">Android Installed PWA Support</label>
          <select 
            className="scorecard-select" 
            value={androidStatus} 
            onChange={(e) => setAndroidStatus(e.target.value)}
            style={{ padding: '0.6rem', fontSize: '0.9rem' }}
          >
            <option value="">-- Rate Android PWA --</option>
            <option value="Pass">Pass (Supported)</option>
            <option value="Fail">Fail (Unsupported)</option>
            <option value="Not Supported">Not Supported (Engine Restriction)</option>
          </select>
        </div>

        {/* iOS PWA Badge Rating */}
        <div className="form-group">
          <label className="form-label">iOS Installed PWA Support (since iOS 16.4)</label>
          <select 
            className="scorecard-select" 
            value={iosStatus} 
            onChange={(e) => setIosStatus(e.target.value)}
            style={{ padding: '0.6rem', fontSize: '0.9rem' }}
          >
            <option value="">-- Rate iOS PWA --</option>
            <option value="Pass">Pass (Supported)</option>
            <option value="Fail">Fail (Unsupported)</option>
            <option value="Not Supported">Not Supported (Engine Restriction)</option>
          </select>
        </div>

        {/* Overall Status */}
        <div className="form-group">
          <label className="form-label">Overall Module Result</label>
          <select 
            className="scorecard-select" 
            value={overallStatus} 
            onChange={(e) => setOverallStatus(e.target.value)}
            style={{ padding: '0.6rem', fontSize: '0.9rem' }}
          >
            <option value="">-- Mark Overall Status --</option>
            <option value="pass">PASS (Fully Supported)</option>
            <option value="fail">FAIL (Unsupported)</option>
            <option value="partial">PARTIAL (Supported with conditions)</option>
          </select>
        </div>

        {/* Comments */}
        <div className="form-group">
          <label className="form-label">Evaluation Notes</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. Only displays when installed, supported on iOS standalone 16.4+"
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
