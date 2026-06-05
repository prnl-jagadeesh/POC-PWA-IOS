import React, { useState, useEffect } from 'react';
import { ChevronLeft, Fingerprint, AlertCircle, CheckCircle2, ShieldCheck, HelpCircle } from 'lucide-react';

export default function BiometricTest({ scorecard, updateScorecard, onBack }) {
  const [webAuthnSupported, setWebAuthnSupported] = useState('PublicKeyCredential' in window);
  const [platformAuthAvailable, setPlatformAuthAvailable] = useState('unchecked');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Scorecard setup
  const testId = 'biometric';
  const currentScore = scorecard[testId] || { status: '', notes: '' };
  const [testStatus, setTestStatus] = useState(currentScore.status);
  const [testNotes, setTestNotes] = useState(currentScore.notes);

  // Sync scorecard local state
  useEffect(() => {
    setTestStatus(currentScore.status);
    setTestNotes(currentScore.notes);
  }, [scorecard]);

  const checkPlatformAuthenticator = async () => {
    setError('');
    setLoading(true);
    setPlatformAuthAvailable('checking');

    if (!webAuthnSupported) {
      setError('WebAuthn API (PublicKeyCredential) is not supported in this browser.');
      setPlatformAuthAvailable('unsupported');
      setLoading(false);
      return;
    }

    try {
      // Check if biometrics or passcode (User Verifying Platform Authenticator) is available on this device
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      setPlatformAuthAvailable(available ? 'available' : 'unavailable');
    } catch (err) {
      console.error(err);
      setError(`Verification check error: ${err.message}`);
      setPlatformAuthAvailable('error');
    } finally {
      setLoading(false);
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
          <Fingerprint size={24} style={{ color: 'var(--color-info)' }} />
          Biometric Login Test (WebAuthn)
        </h2>

        {/* Comparison Details */}
        <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
          <ShieldCheck size={24} style={{ flexShrink: 0 }} />
          <div>
            <strong>WebAuthn vs Native Authentication:</strong>
            <p style={{ color: 'inherit', fontSize: '0.82rem', marginTop: '0.2rem' }}>
              PWAs can detect and prompt Face ID/Touch ID (via WebAuthn Passkeys), but credentials are bound strictly to your domain name and require HTTPS. Native Flutter apps can prompt local device Face ID/Fingerprint at any time (e.g. app lock screen) offline, without origin bounds, using plugins like `local_auth`.
            </p>
          </div>
        </div>

        {/* WebAuthn API Support */}
        <div className="info-row" style={{ marginBottom: '0.75rem' }}>
          <span className="info-label">PublicKeyCredential API Support</span>
          <span className={`badge ${webAuthnSupported ? 'supported' : 'unsupported'}`}>
            {webAuthnSupported ? 'Supported' : 'Unsupported'}
          </span>
        </div>

        {/* Platform Authenticator Support */}
        <div className="info-row" style={{ marginBottom: '1.25rem' }}>
          <span className="info-label">Platform Authenticator (FaceID/TouchID)</span>
          <span className={`badge ${
            platformAuthAvailable === 'available' ? 'supported' :
            platformAuthAvailable === 'unavailable' ? 'partial' :
            platformAuthAvailable === 'unsupported' || platformAuthAvailable === 'error' ? 'unsupported' : 'unsupported'
          }`} style={{ 
            backgroundColor: platformAuthAvailable === 'checking' ? 'rgba(255, 255, 255, 0.05)' : '',
            color: platformAuthAvailable === 'checking' ? '#64748b' : ''
          }}>
            {platformAuthAvailable.toUpperCase()}
          </span>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={checkPlatformAuthenticator}
          disabled={loading || !webAuthnSupported}
        >
          {loading ? <span className="spinner" /> : 'Check Biometric / Passkey Availability'}
        </button>

        {error && (
          <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {platformAuthAvailable === 'available' && (
          <div className="alert alert-info" style={{ marginTop: '1.25rem', background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#a7f3d0' }}>
            <span>✅</span>
            <div>
              <strong>Biometrics Available:</strong> Touch ID, Face ID, or Device Passcode are active and ready on this hardware profile. Passkey creation/sign-in flows can be executed.
            </div>
          </div>
        )}

        {platformAuthAvailable === 'unavailable' && (
          <div className="alert alert-warning" style={{ marginTop: '1.25rem' }}>
            <span>⚠️</span>
            <div>
              <strong>No Authenticator Registered:</strong> WebAuthn is supported by this browser, but no biometric profiles (Touch ID/Face ID) are registered on this device, or platform credentials are not enabled in settings.
            </div>
          </div>
        )}
      </div>

      {/* Quick Scorecard Control */}
      <div className="card" style={{ borderTop: '2px solid var(--color-info)' }}>
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
            placeholder="e.g. WebAuthn supported, but restricted by browser domain rules"
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
