import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  User,
  Plus,
  Edit2,
  Trash2,
  Check,
  X
} from 'lucide-react';
import type { CounterProfile } from '../types';

const COLOR_PRESETS = [
  { name: 'Blue', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { name: 'Green', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  { name: 'Amber', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { name: 'Purple', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { name: 'Pink', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' },
  { name: 'Teal', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
];

export const CounterManager: React.FC = () => {
  const { counters, addCounter, updateCounter, deleteCounter, config } = useApp();

  // Create Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCounterName, setNewCounterName] = useState('');
  const [newCounterPass, setNewCounterPass] = useState('');
  const [newCounterColor, setNewCounterColor] = useState(COLOR_PRESETS[0].color);

  // Edit Modal State
  const [editingCounter, setEditingCounter] = useState<CounterProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editPass, setEditPass] = useState('');
  const [editColor, setEditColor] = useState(COLOR_PRESETS[0].color);

  const handleOpenAdd = () => {
    setNewCounterName(`Counter Member ${counters.length + 1}`);
    setNewCounterPass('');
    setNewCounterColor(COLOR_PRESETS[counters.length % COLOR_PRESETS.length].color);
    setIsAddModalOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCounterName.trim()) return;
    addCounter(newCounterName.trim(), newCounterPass.trim() || undefined, newCounterColor);
    setIsAddModalOpen(false);
  };

  const handleOpenEdit = (c: CounterProfile) => {
    setEditingCounter(c);
    setEditName(c.name);
    setEditPass(c.password || '');
    setEditColor(c.color || COLOR_PRESETS[0].color);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCounter || !editName.trim()) return;
    updateCounter(editingCounter.id, editName.trim(), editPass.trim() || undefined, editColor);
    setEditingCounter(null);
  };

  const handleDelete = (c: CounterProfile) => {
    if (counters.length <= 1) {
      alert('You must have at least 1 counter in the system.');
      return;
    }
    if (confirm(`Are you sure you want to delete "${c.name}"?`)) {
      deleteCounter(c.id);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header & Add Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.65rem',
          flexWrap: 'wrap',
          gap: '0.35rem',
        }}
      >
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
            Manage Counters ({counters.length})
          </h3>
          <p style={{ fontSize: '0.7rem', color: '#64748b' }}>
            Add, rename, or remove counters on the login screen.
          </p>
        </div>

        <button
          type="button"
          className="btn-fast-income"
          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', background: '#2563eb', boxShadow: 'none' }}
          onClick={handleOpenAdd}
        >
          <Plus size={13} />
          <span>Add Counter</span>
        </button>
      </div>

      {/* Counters Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '0.45rem',
          marginBottom: '0.75rem',
        }}
      >
        {counters.map((c, idx) => {
          const color = c.color || '#2563eb';
          const bg = c.bg || '#eff6ff';

          return (
            <div
              key={c.id}
              className="card"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '0.55rem 0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '6px',
                    background: bg,
                    color: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <User size={15} />
                </div>

                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: '0.625rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>#{idx + 1}</span>
                    <span>•</span>
                    <span>{c.password ? 'Custom Pass' : 'Default Pass'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: '22px', height: '22px' }}
                  onClick={() => handleOpenEdit(c)}
                  title="Rename / Edit Counter"
                >
                  <Edit2 size={11} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: '22px', height: '22px', color: '#dc2626' }}
                  onClick={() => handleDelete(c)}
                  disabled={counters.length <= 1}
                  title={counters.length <= 1 ? 'Cannot delete last counter' : 'Delete Counter'}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Counter Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="modal-content animate-scale-in"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '380px', padding: '0.85rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.45rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>+ Add New Counter</h3>
              <button className="icon-btn" onClick={() => setIsAddModalOpen(false)}>
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveNew}>
              <div className="form-group" style={{ marginBottom: '0.55rem' }}>
                <label className="form-label" style={{ fontSize: '0.725rem' }}>Counter Name / Label:</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.55rem' }}
                  placeholder="e.g. Counter Member 5"
                  value={newCounterName}
                  onChange={e => setNewCounterName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.55rem' }}>
                <label className="form-label" style={{ fontSize: '0.725rem' }}>Color Theme:</label>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {COLOR_PRESETS.map(p => (
                    <button
                      key={p.color}
                      type="button"
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '5px',
                        background: p.color,
                        border: newCounterColor === p.color ? '2px solid #0f172a' : '1px solid transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => setNewCounterColor(p.color)}
                      title={p.name}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.55rem' }}>
                <label className="form-label" style={{ fontSize: '0.725rem' }}>Custom Password (Optional):</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.55rem' }}
                  placeholder={`Default (${config.employeePassword})`}
                  value={newCounterPass}
                  onChange={e => setNewCounterPass(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-fast-income"
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.35rem', background: '#2563eb', boxShadow: 'none', fontSize: '0.775rem' }}
              >
                <Check size={14} />
                <span>Create Counter</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Counter Modal */}
      {editingCounter && (
        <div className="modal-overlay" onClick={() => setEditingCounter(null)}>
          <div
            className="modal-content animate-scale-in"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '380px', padding: '0.85rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.45rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Edit Counter</h3>
              <button className="icon-btn" onClick={() => setEditingCounter(null)}>
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group" style={{ marginBottom: '0.55rem' }}>
                <label className="form-label" style={{ fontSize: '0.725rem' }}>Counter Name:</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.55rem' }}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.55rem' }}>
                <label className="form-label" style={{ fontSize: '0.725rem' }}>Color Theme:</label>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {COLOR_PRESETS.map(p => (
                    <button
                      key={p.color}
                      type="button"
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '5px',
                        background: p.color,
                        border: editColor === p.color ? '2px solid #0f172a' : '1px solid transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => setEditColor(p.color)}
                      title={p.name}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.55rem' }}>
                <label className="form-label" style={{ fontSize: '0.725rem' }}>Counter Password:</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.55rem' }}
                  placeholder={`Default (${config.employeePassword})`}
                  value={editPass}
                  onChange={e => setEditPass(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-fast-income"
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.35rem', background: '#2563eb', boxShadow: 'none', fontSize: '0.775rem' }}
              >
                <Check size={14} />
                <span>Save Changes</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
