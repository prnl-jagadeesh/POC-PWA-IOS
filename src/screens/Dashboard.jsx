import React from 'react';
import { 
  Bell, 
  Camera, 
  RefreshCw, 
  MapPin, 
  Fingerprint, 
  Smartphone,
  Layers,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Award,
  Radio,
  Upload
} from 'lucide-react';

export default function Dashboard({ 
  scorecard, 
  onNavigate,
  swActive,
  manifestValid,
  deferredPrompt,
  beforeInstallFired,
  clearDeferredPrompt
}) {
  // Client capability and environment checking
  const getOS = () => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
    if (/android/i.test(ua)) return 'Android';
    return 'Desktop / Other';
  };

  const getBrowser = () => {
    const ua = navigator.userAgent;
    if (/chrome|crios/i.test(ua) && !/edge/i.test(ua)) return 'Google Chrome';
    if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return 'Apple Safari';
    if (/firefox|fxios/i.test(ua)) return 'Mozilla Firefox';
    if (/edge/i.test(ua)) return 'Microsoft Edge';
    return 'Other Browser';
  };

  const getPwaMode = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    return isStandalone ? 'Standalone installed PWA' : 'Running as Standard Browser Tab';
  };

  const getEngine = () => {
    const ua = navigator.userAgent;
    if (/applewebkit/i.test(ua) && !/chrome|crios/i.test(ua)) return 'WebKit (iOS Native)';
    if (/applewebkit/i.test(ua)) return 'Blink / WebKit';
    if (/gecko/i.test(ua)) return 'Gecko';
    return 'Unknown Engine';
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA Diagnostic] Install prompt outcome: ${outcome}`);
    clearDeferredPrompt();
  };

  const currentOS = getOS();
  const currentBrowser = getBrowser();
  const engine = getEngine();
  const pwaMode = getPwaMode();
  const isInstalled = pwaMode.includes('Standalone');

  const modules = [
    {
      id: 'notification',
      title: 'Push Notifications',
      desc: 'Test Firebase Cloud Messaging & subscription APIs',
      icon: Bell,
      color: 'rgba(99, 102, 241, 0.15)',
      iconColor: '#6366f1'
    },
    {
      id: 'camera',
      title: 'Camera & QR Scanner',
      desc: 'Verify WebRTC camera capture and QR reading capabilities',
      icon: Camera,
      color: 'rgba(20, 184, 166, 0.15)',
      iconColor: '#14b8a6'
    },
    {
      id: 'sync',
      title: 'Background Sync API',
      desc: 'Validate deferred offline syncing and service worker tasks',
      icon: RefreshCw,
      color: 'rgba(168, 85, 247, 0.15)',
      iconColor: '#a855f7'
    },
    {
      id: 'gps',
      title: 'GPS Geolocation',
      desc: 'Request live hardware coordinates and watch positions',
      icon: MapPin,
      color: 'rgba(59, 130, 246, 0.15)',
      iconColor: '#3b82f6'
    },
    {
      id: 'biometric',
      title: 'Biometrics & WebAuthn',
      desc: 'Check Passkeys and platform fingerprint/face authenticators',
      icon: Fingerprint,
      color: 'rgba(6, 182, 212, 0.15)',
      iconColor: '#06b6d4'
    },
    {
      id: 'badge',
      title: 'App Badge API',
      desc: 'Set and clear device app icon badge counts',
      icon: Award,
      color: 'rgba(244, 63, 94, 0.15)',
      iconColor: '#f43f5e'
    },
    {
      id: 'bluetooth',
      title: 'Web Bluetooth API',
      desc: 'Scan and connect to local BLE hardware peripherals',
      icon: Radio,
      color: 'rgba(6, 182, 212, 0.15)',
      iconColor: '#06b6d4'
    },
    {
      id: 'file',
      title: 'File Upload & Storage',
      desc: 'Inspect metadata, previews, and save attachments offline',
      icon: Upload,
      color: 'rgba(99, 102, 241, 0.15)',
      iconColor: '#6366f1'
    }
  ];

  // Return status badge class and label
  const getStatusBadge = (testId) => {
    const score = scorecard[testId];
    if (!score) return <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#64748b' }}>Untested</span>;
    
    switch (score.status) {
      case 'pass':
        return <span className="badge supported">Pass</span>;
      case 'fail':
        return <span className="badge unsupported">Fail</span>;
      case 'partial':
        return <span className="badge partial">Partial</span>;
      default:
        return <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#64748b' }}>Untested</span>;
    }
  };

  return (
    <div className="fade-in">
      {/* PWA Installability Diagnostics Card */}
      <div className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={20} style={{ color: 'var(--secondary)' }} />
          PWA Installability Diagnostics
        </h2>
        
        <div className="info-row">
          <span className="info-label">Service Worker Registered</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: swActive ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
            {swActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {swActive ? 'YES' : 'NO'}
          </span>
        </div>

        <div className="info-row">
          <span className="info-label">Manifest Loaded & Valid</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: manifestValid ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
            {manifestValid ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {manifestValid ? 'YES (manifest.webmanifest)' : 'NO'}
          </span>
        </div>

        <div className="info-row">
          <span className="info-label">beforeinstallprompt fired</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: beforeInstallFired ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 600 }}>
            {beforeInstallFired ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {beforeInstallFired ? 'YES' : 'NO'}
          </span>
        </div>

        <div className="info-row">
          <span className="info-label">Installable (Chrome/Android)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: deferredPrompt ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 600 }}>
            {deferredPrompt ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {deferredPrompt ? 'YES' : 'NO (or installed / iOS)'}
          </span>
        </div>

        <div className="info-row" style={{ marginBottom: '1rem' }}>
          <span className="info-label">Running as installed PWA</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isInstalled ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 600 }}>
            {isInstalled ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {isInstalled ? 'YES' : 'NO (Browser Tab)'}
          </span>
        </div>

        {deferredPrompt ? (
          <button 
            className="btn btn-secondary" 
            onClick={handleInstallClick}
            style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
          >
            <Download size={18} />
            Install PWA
          </button>
        ) : (
          <p style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', marginTop: '0.25rem' }}>
            * Note: iOS Safari does not support programmatic web install prompt. iPhone users must tap Safari's share action &gt; "Add to Home Screen".
          </p>
        )}
      </div>

      {/* Device Info Panel */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Smartphone size={20} className="text-primary" style={{ color: 'var(--primary)' }} />
          Device Environment
        </h2>
        
        <div className="info-row">
          <span className="info-label">Operating System</span>
          <span className="info-value bold" style={{ color: currentOS === 'iOS' ? '#f47171' : '#10b981' }}>{currentOS}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Browser Engine</span>
          <span className="info-value">{engine}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Client Browser</span>
          <span className="info-value">{currentBrowser}</span>
        </div>
        <div className="info-row">
          <span className="info-label">PWA Mode</span>
          <span className={`info-value bold ${isInstalled ? 'text-secondary' : 'text-warning'}`} style={{ color: isInstalled ? 'var(--secondary)' : 'var(--color-warning)' }}>
            {isInstalled ? 'Installed (Standalone)' : 'Browser Tab'}
          </span>
        </div>
      </div>

      {isInstalled ? null : (
        <div className="alert alert-warning">
          <span>⚠️</span>
          <div>
            <strong>Installation recommended:</strong> iOS features like background Push Notifications will only function when this PWA is added to your Home Screen.
          </div>
        </div>
      )}

      {/* Modules List */}
      <h2 style={{ fontSize: '1.1rem', margin: '1.5rem 0 0.75rem 0', color: '#f1f5f9' }}>Capabilities Test Modules</h2>
      <div className="dashboard-grid">
        {modules.map((mod) => {
          const IconComponent = mod.icon;
          return (
            <div 
              key={mod.id} 
              className="nav-card"
              onClick={() => onNavigate(mod.id)}
            >
              <div className="nav-card-info">
                <div 
                  className="nav-icon-container" 
                  style={{ backgroundColor: mod.color }}
                >
                  <IconComponent size={22} style={{ color: mod.iconColor }} />
                </div>
                <div>
                  <div className="nav-title">{mod.title}</div>
                  <div className="nav-desc">{mod.desc}</div>
                </div>
              </div>
              <div>
                {getStatusBadge(mod.id)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
