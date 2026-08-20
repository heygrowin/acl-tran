import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  Store,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Cloud,
  AlertCircle
} from 'lucide-react';

export const LandingScreen: React.FC = () => {
  const { config, counters, loginAsMember, isCloudConnected } = useApp();
  
  const [loginRole, setLoginRole] = useState<'admin' | 'counter'>('admin');
  const [selectedCounterId, setSelectedCounterId] = useState<string>(() => {
    return counters.length > 0 ? counters[0].id : '';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update selected counter if counters list changes
  useEffect(() => {
    if (counters.length > 0 && (!selectedCounterId || !counters.some(c => c.id === selectedCounterId))) {
      setSelectedCounterId(counters[0].id);
    }
  }, [counters, selectedCounterId]);

  // Focus password on role switch
  useEffect(() => {
    setPassword('');
    setError(false);
    setShowPassword(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [loginRole, selectedCounterId]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = loginAsMember('Admin / Owner', password);
    if (!ok) {
      setError(true);
    }
  };

  const handleCounterLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCounter = counters.find(c => c.id === selectedCounterId);
    if (!targetCounter) {
      setError(true);
      return;
    }
    const ok = loginAsMember(targetCounter.name, password);
    if (!ok) {
      setError(true);
    }
  };

  const currentCounter = counters.find(c => c.id === selectedCounterId) || counters[0];

  return (
    <div
      style={{
        minHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem auto',
              boxShadow: '0 8px 16px rgba(37, 99, 235, 0.25)',
            }}
          >
            <Store size={26} />
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            {config.businessName || 'ACL Counter Manage'}
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.6rem' }}>
            Daily Cash & Transaction Management System
          </p>

          {/* Cloud Status Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '20px',
              background: isCloudConnected ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${isCloudConnected ? '#bbf7d0' : '#fde68a'}`,
              fontSize: '0.675rem',
              fontWeight: 700,
              color: isCloudConnected ? '#166534' : '#b45309',
            }}
          >
            <Cloud size={12} />
            <span>{isCloudConnected ? '🟢 Firebase Cloud Sync Active (acl-tran)' : '🟡 Local Mode (Reconnecting)'}</span>
          </div>
        </div>

        {/* Login Card */}
        <div
          className="card animate-scale-in"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
            marginBottom: '1rem',
          }}
        >
          {/* Role Switcher Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '0.25rem',
            }}
          >
            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.65rem 0.75rem',
                border: 'none',
                borderRadius: '8px',
                background: loginRole === 'admin' ? '#ffffff' : 'transparent',
                color: loginRole === 'admin' ? '#1d4ed8' : '#64748b',
                fontWeight: loginRole === 'admin' ? 800 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: loginRole === 'admin' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
              onClick={() => setLoginRole('admin')}
            >
              <ShieldCheck size={16} />
              <span>Admin / Owner</span>
            </button>

            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.65rem 0.75rem',
                border: 'none',
                borderRadius: '8px',
                background: loginRole === 'counter' ? '#ffffff' : 'transparent',
                color: loginRole === 'counter' ? '#16a34a' : '#64748b',
                fontWeight: loginRole === 'counter' ? 800 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: loginRole === 'counter' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
              onClick={() => setLoginRole('counter')}
            >
              <User size={16} />
              <span>Counter Staff</span>
            </button>
          </div>

          <div style={{ padding: '1.5rem' }}>
            {/* 1. ADMIN LOGIN FORM */}
            {loginRole === 'admin' && (
              <form onSubmit={handleAdminLogin}>
                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.5rem auto',
                    }}
                  >
                    <ShieldCheck size={22} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.2rem' }}>
                    Admin / Owner Login
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Manage counters, transactions, day closing & store settings
                  </p>
                </div>

                <div className="form-group" style={{ position: 'relative', marginBottom: '0.85rem' }}>
                  <label className="form-label" style={{ fontSize: '0.775rem', fontWeight: 700 }}>
                    Admin Password:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      ref={inputRef}
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      style={{
                        paddingLeft: '2.4rem',
                        paddingRight: '2.5rem',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        border: error ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                      }}
                      placeholder="admin@123"
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        setError(false);
                      }}
                      required
                    />
                    <Lock
                      size={15}
                      style={{
                        position: 'absolute',
                        left: '0.85rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                      }}
                    />
                    <button
                      type="button"
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.5rem 0.75rem',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      color: '#dc2626',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      marginBottom: '0.85rem',
                    }}
                  >
                    <AlertCircle size={14} />
                    <span>Incorrect password. Default: <code>admin@123</code></span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-fast-income"
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    fontSize: '0.925rem',
                    background: '#2563eb',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <span>Login as Admin</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* 2. COUNTER STAFF LOGIN FORM */}
            {loginRole === 'counter' && (
              <div>
                {counters.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: '#fef3c7',
                        color: '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.5rem auto',
                      }}
                    >
                      <User size={22} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                      No Counters Created Yet
                    </h3>
                    <p style={{ fontSize: '0.775rem', color: '#64748b', marginBottom: '1.25rem' }}>
                      Please login as Admin to create and configure your store counters in Settings.
                    </p>
                    <button
                      type="button"
                      className="btn-fast-income"
                      style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', background: '#2563eb' }}
                      onClick={() => setLoginRole('admin')}
                    >
                      <span>Switch to Admin Login</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCounterLogin}>
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          background: currentCounter?.bg || '#eff6ff',
                          color: currentCounter?.color || '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 0.5rem auto',
                        }}
                      >
                        <User size={22} />
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.2rem' }}>
                        Counter Staff Login
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Select your counter & enter password to record transactions
                      </p>
                    </div>

                    {/* Counter Selection Dropdown */}
                    <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                      <label className="form-label" style={{ fontSize: '0.775rem', fontWeight: 700 }}>
                        Select Counter:
                      </label>
                      <select
                        className="form-input"
                        style={{ fontSize: '0.9rem', fontWeight: 700, padding: '0.55rem 0.75rem' }}
                        value={selectedCounterId}
                        onChange={e => setSelectedCounterId(e.target.value)}
                      >
                        {counters.map((c, idx) => (
                          <option key={c.id} value={c.id}>
                            👤 {c.name} (Counter #{idx + 1})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Counter Password */}
                    <div className="form-group" style={{ position: 'relative', marginBottom: '0.85rem' }}>
                      <label className="form-label" style={{ fontSize: '0.775rem', fontWeight: 700 }}>
                        Counter Password:
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          ref={inputRef}
                          type={showPassword ? 'text' : 'password'}
                          className="form-input"
                          style={{
                            paddingLeft: '2.4rem',
                            paddingRight: '2.5rem',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            border: error ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                          }}
                          placeholder={currentCounter?.password ? 'Enter password' : 'P@counter'}
                          value={password}
                          onChange={e => {
                            setPassword(e.target.value);
                            setError(false);
                          }}
                          required
                        />
                        <Lock
                          size={15}
                          style={{
                            position: 'absolute',
                            left: '0.85rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#94a3b8',
                          }}
                        />
                        <button
                          type="button"
                          style={{
                            position: 'absolute',
                            right: '0.75rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.5rem 0.75rem',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          color: '#dc2626',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          marginBottom: '0.85rem',
                        }}
                      >
                        <AlertCircle size={14} />
                        <span>Incorrect password. Default: <code>P@counter</code></span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn-fast-income"
                      style={{
                        width: '100%',
                        padding: '0.8rem',
                        fontSize: '0.925rem',
                        background: currentCounter?.color || '#16a34a',
                        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                      }}
                    >
                      <span>Enter {currentCounter?.name}</span>
                      <ArrowRight size={16} />
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Default Passwords Quick Card */}
        <div
          style={{
            textAlign: 'center',
            padding: '0.75rem 1rem',
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            fontSize: '0.75rem',
            color: '#64748b',
            display: 'flex',
            justifyContent: 'center',
            gap: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          <span>🛡️ Admin: <strong>admin@123</strong></span>
          <span>•</span>
          <span>👤 Counter: <strong>P@counter</strong></span>
        </div>
      </div>
    </div>
  );
};
