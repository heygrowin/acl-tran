import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  User,
  ShieldCheck,
  X,
  Store,
  Lock,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import type { CounterProfile } from '../types';

export const LandingScreen: React.FC = () => {
  const { config, counters, loginAsMember } = useApp();
  const [selectedProfile, setSelectedProfile] = useState<{ id: string; name: string; role: 'employee' | 'admin'; color: string; bg: string; border: string } | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedProfile) {
      setPassword('');
      setError(false);
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [selectedProfile]);

  const handleSelectCounter = (c: CounterProfile) => {
    setSelectedProfile({
      id: c.id,
      name: c.name,
      role: 'employee',
      color: c.color || '#2563eb',
      bg: c.bg || '#eff6ff',
      border: c.border || '#bfdbfe',
    });
  };

  const handleSelectAdmin = () => {
    setSelectedProfile({
      id: 'admin',
      name: 'Admin / Owner',
      role: 'admin',
      color: '#1e40af',
      bg: '#eff6ff',
      border: '#93c5fd',
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;

    const ok = loginAsMember(selectedProfile.name, password);
    if (!ok) {
      setError(true);
    } else {
      setSelectedProfile(null);
    }
  };

  return (
    <div
      style={{
        minHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '640px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#2563eb',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.6rem auto',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
            }}
          >
            <Store size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            {config.businessName || 'ACL Counter Manage'}
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
            Select your counter profile to login
          </p>
        </div>

        {/* Dynamic Member Profile Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '0.65rem',
            marginBottom: '1rem',
          }}
        >
          {counters.map((c, idx) => {
            const color = c.color || '#2563eb';
            const bg = c.bg || '#eff6ff';
            const border = c.border || '#bfdbfe';

            return (
              <button
                key={c.id}
                type="button"
                className="card"
                style={{
                  background: '#ffffff',
                  border: `1.5px solid ${border}`,
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
                onClick={() => handleSelectCounter(c)}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.borderColor = color;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.borderColor = border;
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: bg,
                      color: color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <User size={20} />
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Counter #{idx + 1}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: bg,
                    color: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowRight size={13} />
                </div>
              </button>
            );
          })}

          {/* Admin / Owner Profile Card */}
          <button
            type="button"
            className="card"
            style={{
              background: '#ffffff',
              border: '1.5px solid #93c5fd',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              gridColumn: '1 / -1',
            }}
            onClick={handleSelectAdmin}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.borderColor = '#2563eb';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.borderColor = '#93c5fd';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  color: '#1e40af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={20} />
              </div>

              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                  Admin / Owner
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  Manage Counters, Full Reports & Settings
                </div>
              </div>
            </div>

            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: '#eff6ff',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowRight size={13} />
            </div>
          </button>
        </div>

        {/* Password Hints Footer */}
        <div
          style={{
            textAlign: 'center',
            padding: '0.65rem 0.85rem',
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '0.725rem',
            color: '#64748b',
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <span>👤 Counter Password: <strong>P@counter</strong></span>
          <span>•</span>
          <span>🛡️ Admin Password: <strong>admin@123</strong></span>
        </div>
      </div>

      {/* Password Modal */}
      {selectedProfile && (
        <div className="modal-overlay" onClick={() => setSelectedProfile(null)}>
          <div
            className="modal-content animate-scale-in"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '360px', padding: '1.35rem', textAlign: 'center' }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-0.5rem -0.25rem 0.25rem 0' }}>
              <button className="icon-btn" onClick={() => setSelectedProfile(null)}>
                <X size={15} />
              </button>
            </div>

            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: selectedProfile.bg,
                color: selectedProfile.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.65rem auto',
              }}
            >
              <Lock size={22} />
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Login: {selectedProfile.name}
            </h3>
            <p style={{ fontSize: '0.775rem', color: '#64748b', marginBottom: '1rem', marginTop: '0.15rem' }}>
              Enter password for {selectedProfile.name}
            </p>

            <form onSubmit={handleLoginSubmit}>
              <div className="form-group" style={{ position: 'relative', marginBottom: '0.65rem' }}>
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{
                    textAlign: 'center',
                    fontSize: '1rem',
                    fontWeight: 600,
                    paddingRight: '2.5rem',
                    border: error ? '1.5px solid #dc2626' : '1.5px solid #cbd5e1',
                  }}
                  placeholder={selectedProfile.role === 'admin' ? 'admin@123' : 'P@counter'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  required
                />
                <button
                  type="button"
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {error && (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, marginBottom: '0.65rem' }}>
                  Incorrect Password! Default: <code>{selectedProfile.role === 'admin' ? 'admin@123' : 'P@counter'}</code>
                </div>
              )}

              <button
                type="submit"
                className="btn-fast-income"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  background: selectedProfile.color,
                  boxShadow: 'none',
                }}
              >
                <span>Enter Counter</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
