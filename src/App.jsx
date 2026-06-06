import React, { useState, useEffect } from 'react';
import { LayoutGrid, ClipboardCheck, Layers } from 'lucide-react';
import Dashboard from './screens/Dashboard';
import PushNotificationTest from './screens/PushNotificationTest';
import CameraQRTest from './screens/CameraQRTest';
import BackgroundSyncTest from './screens/BackgroundSyncTest';
import GPSTest from './screens/GPSTest';
import BiometricTest from './screens/BiometricTest';
import Scorecard from './screens/Scorecard';
import BadgeTest from './screens/BadgeTest';

export default function App() {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [scorecard, setScorecard] = useState({});
  const [isPwa, setIsPwa] = useState(false);

  // PWA Installability Diagnostics States
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [swActive, setSwActive] = useState(false);
  const [manifestValid, setManifestValid] = useState(false);
  const [beforeInstallFired, setBeforeInstallFired] = useState(false);

  // Load Scorecard from LocalStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem('pwa_ios_poc_scorecard');
    if (cached) {
      try {
        setScorecard(JSON.parse(cached));
      } catch (e) {
        console.error('Failed to parse cached scorecard:', e);
      }
    }

    // Check if running as installed standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsPwa(isStandalone);
  }, []);

  // Register main Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Main SW registered scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Main SW registration failed:', error);
        });
    }
  }, []);

  // Listen for Chrome PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setBeforeInstallFired(true);
      console.log('[PWA Diagnostic] beforeinstallprompt event caught!');
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Verify Service Worker and Manifest status dynamically
  useEffect(() => {
    const checkSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          const hasMainSw = regs.some(r => r.scope === window.location.origin + '/');
          setSwActive(hasMainSw);
        } catch (e) {
          setSwActive(false);
        }
      }
    };

    const checkManifest = async () => {
      try {
        const res = await fetch('/manifest.webmanifest');
        if (res.ok) {
          const json = await res.json();
          // Check for required installability properties
          const isValid = !!(
            json.name && 
            json.short_name && 
            json.start_url && 
            json.display === 'standalone' && 
            json.theme_color && 
            json.background_color &&
            json.icons &&
            json.icons.some(i => i.sizes === '192x192') &&
            json.icons.some(i => i.sizes === '512x512')
          );
          setManifestValid(isValid);
        } else {
          setManifestValid(false);
        }
      } catch (e) {
        setManifestValid(false);
      }
    };

    checkSW();
    checkManifest();
    const interval = setInterval(checkSW, 2500); // Poll SW state to catch active activations
    return () => clearInterval(interval);
  }, []);

  // Update specific scorecard feature
  const updateScorecard = (featureId, status, notes) => {
    const updated = {
      ...scorecard,
      [featureId]: { status, notes }
    };
    setScorecard(updated);
    localStorage.setItem('pwa_ios_poc_scorecard', JSON.stringify(updated));
  };

  // Reset scorecard state
  const resetScorecard = () => {
    if (window.confirm('Are you sure you want to clear all scorecard test results?')) {
      setScorecard({});
      localStorage.removeItem('pwa_ios_poc_scorecard');
    }
  };

  // State-based Routing Render
  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return (
          <Dashboard 
            scorecard={scorecard} 
            onNavigate={setActiveScreen} 
            swActive={swActive}
            manifestValid={manifestValid}
            deferredPrompt={deferredPrompt}
            beforeInstallFired={beforeInstallFired}
            clearDeferredPrompt={() => setDeferredPrompt(null)}
          />
        );
      case 'notification':
        return (
          <PushNotificationTest 
            scorecard={scorecard} 
            updateScorecard={updateScorecard} 
            onBack={() => setActiveScreen('dashboard')} 
          />
        );
      case 'camera':
        return (
          <CameraQRTest 
            scorecard={scorecard} 
            updateScorecard={updateScorecard} 
            onBack={() => setActiveScreen('dashboard')} 
          />
        );
      case 'sync':
        return (
          <BackgroundSyncTest 
            scorecard={scorecard} 
            updateScorecard={updateScorecard} 
            onBack={() => setActiveScreen('dashboard')} 
          />
        );
      case 'gps':
        return (
          <GPSTest 
            scorecard={scorecard} 
            updateScorecard={updateScorecard} 
            onBack={() => setActiveScreen('dashboard')} 
          />
        );
      case 'biometric':
        return (
          <BiometricTest 
            scorecard={scorecard} 
            updateScorecard={updateScorecard} 
            onBack={() => setActiveScreen('dashboard')} 
          />
        );
      case 'badge':
        return (
          <BadgeTest 
            scorecard={scorecard} 
            updateScorecard={updateScorecard} 
            onBack={() => setActiveScreen('dashboard')} 
          />
        );
      case 'scorecard':
        return (
          <Scorecard 
            scorecard={scorecard} 
            updateScorecard={updateScorecard} 
            resetScorecard={resetScorecard} 
          />
        );
      default:
        return <Dashboard scorecard={scorecard} onNavigate={setActiveScreen} />;
    }
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="header-brand">
          <svg className="logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="120" fill="url(#logoGrad)" />
            <path d="M 160 270 L 220 330 L 350 180" fill="none" stroke="#ffffff" strokeWidth="48" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <h1 style={{ fontSize: '1.15rem', lineHeight: '1.2' }}>iOS Capability</h1>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>PWA POC VALIDATOR</span>
          </div>
        </div>

        {/* PWA / Browser Badge */}
        <span className={`header-mode ${isPwa ? 'pwa' : 'browser'}`}>
          {isPwa ? 'PWA' : 'Tab'}
        </span>
      </header>

      {/* Main Content Area */}
      <main className="app-content">
        {renderScreen()}
      </main>

      {/* Bottom Sticky Tab Navigator */}
      <nav className="bottom-nav">
        <button 
          className={`nav-tab ${activeScreen !== 'scorecard' ? 'active' : ''}`}
          onClick={() => setActiveScreen('dashboard')}
        >
          <LayoutGrid size={20} />
          <span className="nav-tab-label">Dashboard</span>
        </button>
        
        <button 
          className={`nav-tab ${activeScreen === 'scorecard' ? 'active' : ''}`}
          onClick={() => setActiveScreen('scorecard')}
        >
          <ClipboardCheck size={20} />
          <span className="nav-tab-label">Scorecard</span>
        </button>
      </nav>
    </div>
  );
}
