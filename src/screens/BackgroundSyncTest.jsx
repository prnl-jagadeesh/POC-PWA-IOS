import React, { useState, useEffect } from 'react';
import { ChevronLeft, RefreshCw, AlertTriangle, AlertCircle, Play, CheckCircle2, User } from 'lucide-react';
import { addActivity, getActivities, clearActivities, updateActivityStatus } from '../utils/db';

export default function BackgroundSyncTest({ scorecard, updateScorecard, onBack }) {
  const [swSupported, setSwSupported] = useState('serviceWorker' in navigator);
  const [syncSupported, setSyncSupported] = useState('SyncManager' in window);
  
  // Form States
  const [employeeId, setEmployeeId] = useState('');
  const [activityText, setActivityText] = useState('');
  
  // Logs and feedback
  const [logs, setLogs] = useState([]);
  const [infoMsg, setInfoMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Scorecard setup
  const testId = 'sync';
  const currentScore = scorecard[testId] || { status: '', notes: '' };
  const [testStatus, setTestStatus] = useState(currentScore.status);
  const [testNotes, setTestNotes] = useState(currentScore.notes);

  const loadLogs = async () => {
    try {
      const records = await getActivities();
      // Sort records (newest first)
      setLogs(records.reverse());
    } catch (err) {
      console.error('Failed to load database logs:', err);
    }
  };

  useEffect(() => {
    loadLogs();
    
    // Listen for Service Worker completion events to refresh UI automatically
    const handleSyncComplete = (event) => {
      if (event.data && event.data.type === 'SYNC_COMPLETE') {
        loadLogs();
        setInfoMsg('Background Sync completed! IndexedDB logs refreshed.');
      }
    };
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSyncComplete);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSyncComplete);
      }
    };
  }, []);

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
      // 1. Store locally in IndexedDB
      await addActivity(payload);
      setActivityText('');
      await loadLogs();

      // 2. Register for background sync (where supported)
      if (syncSupported && swSupported) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-activities');
        setInfoMsg('Activity recorded! PWA registered background sync tag ("sync-activities"). If offline, browser will sync when connection returns.');
      } else {
        // Fallback for unsupported devices
        setErrorMsg('Saved to IndexedDB, but Background Sync API is not supported. Use "Try Manual Sync" below.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(`Storage failed: ${err.message}`);
    }
  };

  // Triggers synchronization manually
  const handleManualSync = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setSyncing(true);

    try {
      const records = await getActivities();
      const pending = records.filter(r => r.status === 'pending');

      if (pending.length === 0) {
        setInfoMsg('No pending offline logs found.');
        setSyncing(false);
        return;
      }

      // Simulate network syncing
      setTimeout(async () => {
        for (const record of pending) {
          await updateActivityStatus(record.id, 'synced');
        }
        await loadLogs();
        setInfoMsg(`Manually synchronized ${pending.length} logs successfully!`);
        setSyncing(false);
      }, 1200);
    } catch (err) {
      setErrorMsg(`Manual sync error: ${err.message}`);
      setSyncing(false);
    }
  };

  const handleClearLogs = async () => {
    if (window.confirm('Clear all logs?')) {
      await clearActivities();
      loadLogs();
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
          <RefreshCw size={24} style={{ color: 'var(--accent-purple)' }} />
          Background Sync Test
        </h2>

        {/* Feature Capability Display */}
        <div style={{ marginBottom: '1rem' }}>
          <div className="info-row">
            <span className="info-label">Service Worker Registration</span>
            <span className={`badge ${swSupported ? 'supported' : 'unsupported'}`}>
              {swSupported ? 'Active' : 'Missing'}
            </span>
          </div>
          
          <div className="info-row">
            <span className="info-label">SyncManager (Background Sync)</span>
            <span className={`badge ${syncSupported ? 'supported' : 'unsupported'}`}>
              {syncSupported ? 'Supported' : 'Unsupported'}
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
            placeholder="e.g. SyncManager is missing on iOS Safari, required manual fallback"
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
