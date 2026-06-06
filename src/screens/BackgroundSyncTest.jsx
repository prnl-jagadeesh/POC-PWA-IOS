import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, RefreshCw, AlertTriangle, AlertCircle, Play, CheckCircle2, User, Terminal, Wifi, WifiOff } from 'lucide-react';
import { addActivity, getActivities, clearActivities, updateActivityStatus } from '../utils/db';

export default function BackgroundSyncTest({ scorecard, updateScorecard, onBack }) {
  const [swSupported, setSwSupported] = useState('serviceWorker' in navigator);
  const [syncSupported, setSyncSupported] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Form States
  const [employeeId, setEmployeeId] = useState('');
  const [activityText, setActivityText] = useState('');
  
  // Logs and feedback
  const [logs, setLogs] = useState([]);
  const [diagLogs, setDiagLogs] = useState([]);
  const [infoMsg, setInfoMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Scorecard setup
  const testId = 'sync';
  const currentScore = scorecard[testId] || { status: '', notes: '' };
  const [testStatus, setTestStatus] = useState(currentScore.status);
  const [testNotes, setTestNotes] = useState(currentScore.notes);

  const consoleEndRef = useRef(null);

  const addDiagLog = (message) => {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] ${message}`;
    setDiagLogs(prev => [...prev, formatted]);
  };

  const loadLogs = async () => {
    try {
      const records = await getActivities();
      setLogs(records.reverse());
    } catch (err) {
      console.error('Failed to load database logs:', err);
    }
  };

  useEffect(() => {
    loadLogs();

    // 1. Log Initial capability statuses
    addDiagLog(`Diagnostic console booted up.`);
    addDiagLog(`Connection Status: Device is currently ${isOnline ? 'ONLINE' : 'OFFLINE'}.`);
    addDiagLog(`Service Worker API Support: ${swSupported ? 'Supported' : 'Not Supported'}`);
    
    // 2. Check for registration.sync capability
    if (swSupported) {
      navigator.serviceWorker.ready.then((reg) => {
        const hasSync = 'sync' in reg;
        setSyncSupported(hasSync);
        addDiagLog(`Background Sync (registration.sync) Support: ${hasSync ? 'Supported' : 'Not Supported'}`);
        if (!hasSync) {
          addDiagLog('Sync unsupported: registration.sync is missing. Browser does not allow deferred background execution.');
        }
      }).catch(err => {
        addDiagLog(`SW Error: Failed to query registration: ${err.message}`);
      });
    } else {
      addDiagLog('Sync unsupported: Service Workers are missing in this browser scope.');
    }

    // 3. Listen to Online/Offline Connection Events
    const handleOnline = () => {
      setIsOnline(true);
      addDiagLog('Online/offline status: Connection restored. Device is ONLINE.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addDiagLog('Online/offline status: Connection lost. Device is OFFLINE.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 4. Listen for Service Worker completed background sync events
    const handleSyncCompleteMessage = (event) => {
      if (event.data && event.data.type === 'SYNC_COMPLETE') {
        loadLogs();
        addDiagLog('Sync completed: Service Worker processed offline activities and updated status.');
        setInfoMsg('Automatic background sync complete! Records status updated.');
      }
    };
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSyncCompleteMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSyncCompleteMessage);
      }
    };
  }, []);

  // Scroll terminal logs automatically
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [diagLogs]);

  // Sync scorecard status
  useEffect(() => {
    setTestStatus(currentScore.status);
    setTestNotes(currentScore.notes);
  }, [scorecard]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!employeeId || !activityText) {
      setErrorMsg('Please fill in both Employee ID and Activity description.');
      return;
    }

    const payload = {
      employeeId,
      activity: activityText,
      timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString()
    };

    try {
      // Store record in IndexedDB
      await addActivity(payload);
      addDiagLog(`Record queued: ID=${payload.employeeId}, Activity="${payload.activity}" stored locally inside IndexedDB.`);
      setActivityText('');
      await loadLogs();

      // Trigger automatic background sync registration if active
      if (syncSupported && swSupported) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-activities');
        addDiagLog('Sync registered: Registered sync tag "sync-activities" with Service Worker.');
        setInfoMsg('Activity saved! Registered background sync tag. Turn off Airplane Mode to trigger sync.');
      } else {
        addDiagLog('Sync unsupported: registration.sync is missing. Auto-sync will not trigger.');
        setErrorMsg('Saved to IndexedDB. Background Sync is Not Supported. Manual sync required.');
      }
    } catch (err) {
      addDiagLog(`Error: Saving queue failed: ${err.message}`);
      setErrorMsg(`Storage failed: ${err.message}`);
    }
  };

  // Triggers manual sync loop
  const handleManualSync = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setSyncing(true);
    addDiagLog('Manual Sync: Triggering manual queue synchronization...');

    try {
      const records = await getActivities();
      const pending = records.filter(r => r.status === 'pending');

      if (pending.length === 0) {
        addDiagLog('Manual Sync: No pending logs found to synchronize.');
        setInfoMsg('No pending offline logs found.');
        setSyncing(false);
        return;
      }

      // Simulate a network upload delay (1.2 seconds)
      setTimeout(async () => {
        for (const record of pending) {
          await updateActivityStatus(record.id, 'synced');
        }
        await loadLogs();
        addDiagLog(`Sync completed: Synchronized ${pending.length} pending records manually.`);
        setInfoMsg(`Manually synchronized ${pending.length} logs successfully!`);
        setSyncing(false);
      }, 1200);
    } catch (err) {
      addDiagLog(`Manual Sync Error: ${err.message}`);
      setErrorMsg(`Manual sync error: ${err.message}`);
      setSyncing(false);
    }
  };

  const handleClearLogs = async () => {
    if (window.confirm('Clear all logs?')) {
      await clearActivities();
      addDiagLog('IndexedDB logs cleared.');
      loadLogs();
    }
  };

  const handleSaveScorecard = () => {
    updateScorecard(testId, testStatus, testNotes);
    addDiagLog(`Scorecard rating updated to: ${testStatus.toUpperCase()}`);
  };

  return (
    <div className="fade-in">
      <button className="btn-back" onClick={onBack}>
        <ChevronLeft size={18} /> Back to Dashboard
      </button>

      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <RefreshCw size={24} style={{ color: 'var(--accent-purple)' }} />
          Background Sync Test
        </h2>

        {/* Feature Capability Display (Task 3) */}
        <div style={{ marginBottom: '1rem' }}>
          <div className="info-row">
            <span className="info-label">Service Worker Status</span>
            <span className={`badge ${swSupported ? 'supported' : 'unsupported'}`}>
              {swSupported ? 'Supported' : 'Not Supported'}
            </span>
          </div>
          
          <div className="info-row">
            <span className="info-label">Background Sync (`registration.sync`)</span>
            <span className={`badge ${syncSupported ? 'supported' : 'unsupported'}`}>
              {syncSupported ? 'Supported' : 'Not Supported'}
            </span>
          </div>

          <div className="info-row">
            <span className="info-label">Network Connection Status</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: isOnline ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 600, fontSize: '0.85rem' }}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Sync API warning regarding Apple/iOS */}
        {!syncSupported && (
          <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
            <div>
              <strong>iOS PWA Limitation Alert:</strong>
              <p style={{ color: 'inherit', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                Apple Safari (iOS/iPadOS) does <strong>NOT</strong> support the Background Sync API (SyncManager). Off-page/background syncing will fail on iPhones. Manual synchronization triggers or on-focus queues must be implemented in userland.
              </p>
            </div>
          </div>
        )}

        {/* Submission Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Employee ID</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. EMP-903" 
              value={employeeId} 
              onChange={(e) => setEmployeeId(e.target.value)} 
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Activity Description</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Scanned pallet inventory" 
              value={activityText} 
              onChange={(e) => setActivityText(e.target.value)} 
              required
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Submit while Offline (Save Log)
          </button>
        </form>

        {infoMsg && <div className="alert alert-info">{infoMsg}</div>}
        {errorMsg && <div className="alert alert-warning">{errorMsg}</div>}

        {/* Sync Controls */}
        <div className="flex-row">
          <button className="btn btn-secondary" onClick={handleManualSync} disabled={syncing}>
            {syncing ? <span className="spinner" /> : <Play size={16} />}
            Try Manual Sync
          </button>
          
          <button className="btn btn-outline" onClick={handleClearLogs} style={{ width: '35%' }}>
            Clear Logs
          </button>
        </div>

        {/* Offline Logs Database List */}
        <h3 style={{ fontSize: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: '#f1f5f9' }}>
          IndexedDB Sync Queue Logs
        </h3>
        
        {logs.length === 0 ? (
          <p style={{ fontSize: '0.82rem', fontStyle: 'italic', textAlign: 'center', margin: '1rem 0' }}>
            No activity logs in IndexedDB queue.
          </p>
        ) : (
          <div className="activity-list">
            {logs.map((item) => (
              <div key={item.id} className={`activity-item ${item.status === 'synced' ? 'synced' : ''}`}>
                <div className="activity-item-info">
                  <span style={{ fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <User size={12} style={{ color: 'var(--primary)' }} />
                    {item.employeeId} - {item.activity}
                  </span>
                  <span className="activity-item-meta">{item.timestamp}</span>
                </div>
                <div>
                  <span className={`badge ${item.status === 'synced' ? 'supported' : 'partial'}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diagnostics Console Panel */}
      <div className="card" style={{ padding: '0.75rem' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Terminal size={16} style={{ color: 'var(--accent-purple)' }} />
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
          color: '#c084fc',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          lineHeight: '1.4'
        }}>
          {diagLogs.map((log, index) => (
            <div key={index} style={{ wordBreak: 'break-all', marginBottom: '0.2rem' }}>{log}</div>
          ))}
          <div ref={consoleEndRef} />
        </div>
      </div>

      {/* Quick Scorecard Control */}
      <div className="card" style={{ borderTop: '2px solid var(--accent-purple)' }}>
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
            placeholder="e.g. registration.sync is missing on iOS Safari, required manual fallback"
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
