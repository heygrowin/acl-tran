import React, { useState, useEffect } from 'react';
import { Smartphone, X, Share2, PlusSquare } from 'lucide-react';

export const PWAInstallButton: React.FC<{ style?: React.CSSProperties; compact?: boolean }> = ({
  style,
  compact = true,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if running as installed standalone app
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // If iOS Safari or standalone prompt not available, show guide
      const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isIos) {
        setShowIosGuide(true);
      } else {
        alert('To install ACL Counter Web App: Click your browser menu (⋮ or ...) and select "Install App" or "Add to Home Screen".');
      }
    }
  };

  if (isStandalone) {
    return null; // Already running in installed web app mode
  }

  return (
    <>
      <button
        type="button"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          padding: compact ? '0.22rem 0.5rem' : '0.45rem 0.85rem',
          borderRadius: '6px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1d4ed8',
          fontSize: compact ? '0.7rem' : '0.8rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          ...style,
        }}
        onClick={handleInstallClick}
        title="Install ACL Counter as a Mobile App on your device"
      >
        <Smartphone size={compact ? 12 : 14} style={{ color: '#2563eb' }} />
        <span>Install App</span>
      </button>

      {/* iOS Installation Guide Modal */}
      {showIosGuide && (
        <div className="modal-overlay" onClick={() => setShowIosGuide(false)}>
          <div
            className="modal-content animate-scale-in"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '360px', padding: '1rem', background: '#ffffff', borderRadius: '12px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                <Smartphone size={16} style={{ color: '#2563eb' }} />
                <span>Install on iPhone / iPad</span>
              </div>
              <button className="icon-btn" onClick={() => setShowIosGuide(false)}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.775rem', color: '#334155' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                  1
                </div>
                <div>
                  Tap the <strong>Share</strong> icon <Share2 size={13} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} /> in Safari's bottom toolbar.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                  2
                </div>
                <div>
                  Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare size={13} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} />.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                  3
                </div>
                <div>
                  Tap <strong>Add</strong> at the top right. ACL Counter will appear as an app on your home screen!
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-fast-income"
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.85rem', background: '#2563eb', boxShadow: 'none', fontSize: '0.775rem' }}
              onClick={() => setShowIosGuide(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
