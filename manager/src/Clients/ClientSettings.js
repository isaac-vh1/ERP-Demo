import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import './ClientSettings.css';

import HamburgerMenu from '../Components/HamburgerMenu';
import { useAuth } from '../AuthContext';

const CONTACT_TYPE_LABELS = { email: 'Email', sms: 'SMS / Text' };

export default function ClientSettings({ toggleSidebar, collapsed }) {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [clientName, setClientName] = useState('');
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: '', contactType: 'email', contactValue: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const token = await user.getIdToken();
        const [devRes, clientRes] = await Promise.all([
          fetch(`/api/manager/client/${clientId}/notification-devices`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/manager/client-overview/${clientId}?year=${new Date().getFullYear()}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!devRes.ok) {
          const body = await devRes.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load notification devices.');
        }
        const devPayload = await devRes.json();

        if (clientRes.ok) {
          const clientPayload = await clientRes.json();
          if (!cancelled) setClientName(clientPayload?.client?.name || `Client #${clientId}`);
        }

        if (!cancelled) setDevices(Array.isArray(devPayload) ? devPayload : []);
      } catch (err) {
        if (!cancelled) setError(String(err.message || err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [authLoading, clientId, user]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((cur) => ({ ...cur, [name]: value }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!user || adding) return;
    setFormError('');

    const label = form.label.trim();
    const contactValue = form.contactValue.trim();
    if (!label) { setFormError('Label is required.'); return; }
    if (!contactValue) { setFormError('Contact value is required.'); return; }

    setAdding(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/manager/client/${clientId}/notification-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label, contactType: form.contactType, contactValue }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Failed to add device.');

      const newDevice = {
        id: payload.id,
        label,
        contactType: form.contactType,
        contactValue,
        active: true,
        createdAt: new Date().toISOString(),
      };
      setDevices((cur) => [...cur, newDevice]);
      setForm({ label: '', contactType: 'email', contactValue: '' });
      setIsAdding(false);
    } catch (err) {
      setFormError(String(err.message || err));
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (device) => {
    if (!user) return;
    const nextActive = !device.active;
    setDevices((cur) => cur.map((d) => d.id === device.id ? { ...d, active: nextActive } : d));
    try {
      const token = await user.getIdToken();
      await fetch(`/api/manager/client/${clientId}/notification-device/${device.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: nextActive }),
      });
    } catch (err) {
      // Revert on failure
      setDevices((cur) => cur.map((d) => d.id === device.id ? { ...d, active: device.active } : d));
      setError(String(err.message || err));
    }
  };

  const handleDelete = async (device) => {
    if (!user) return;
    if (!window.confirm(`Remove "${device.label}"?`)) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/manager/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(['client_notification_devices', device.id]),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to remove device.');
      }
      setDevices((cur) => cur.filter((d) => d.id !== device.id));
    } catch (err) {
      setError(String(err.message || err));
    }
  };

  return (
    <div className="client-settings-page">
      <section className="client-settings-hero">
        <div>
          <div className="menu-toggle" onClick={toggleSidebar}><HamburgerMenu collapsed={collapsed} /></div>
          <span className="client-settings-kicker">Client Settings</span>
          <h2>{clientName || `Client #${clientId}`}</h2>
          <p>Manage notification devices and contact preferences for this client.</p>
        </div>
        <button className="client-settings-back" onClick={() => navigate(`/clients/${clientId}`)}>
          Back to Client
        </button>
      </section>

      {loading ? <div className="client-settings-state">Loading...</div> : null}
      {error ? <div className="client-settings-state client-settings-error">{error}</div> : null}

      {!loading ? (
        <section className="client-settings-panel">
          <div className="client-settings-panel-header">
            <div>
              <h3>Notification Devices</h3>
              <span>Additional email addresses or phone numbers to receive notifications for this client.</span>
            </div>
            <button
              className="client-settings-primary-button"
              type="button"
              onClick={() => { setFormError(''); setIsAdding((v) => !v); }}
            >
              {isAdding ? 'Cancel' : 'Add Device'}
            </button>
          </div>

          {isAdding ? (
            <form className="client-settings-add-form" onSubmit={handleAdd}>
              {formError ? <div className="client-settings-form-error">{formError}</div> : null}
              <label>
                <span>Label</span>
                <input
                  name="label"
                  value={form.label}
                  onChange={handleFormChange}
                  placeholder="e.g. Work Email, Dad's Phone"
                />
              </label>
              <label>
                <span>Type</span>
                <select name="contactType" value={form.contactType} onChange={handleFormChange}>
                  <option value="email">Email</option>
                  <option value="sms">SMS / Text</option>
                </select>
              </label>
              <label className="client-settings-add-form-wide">
                <span>{form.contactType === 'email' ? 'Email Address' : 'Phone Number'}</span>
                <input
                  name="contactValue"
                  value={form.contactValue}
                  onChange={handleFormChange}
                  placeholder={form.contactType === 'email' ? 'name@example.com' : '555-555-5555'}
                  type={form.contactType === 'email' ? 'email' : 'tel'}
                />
              </label>
              <div className="client-settings-add-form-wide client-settings-form-actions">
                <button className="client-settings-primary-button" type="submit" disabled={adding}>
                  {adding ? 'Adding...' : 'Add Device'}
                </button>
              </div>
            </form>
          ) : null}

          {devices.length === 0 && !isAdding ? (
            <div className="client-settings-empty">
              No additional notification devices configured. Use "Add Device" to add an email or phone number.
            </div>
          ) : null}

          {devices.length > 0 ? (
            <div className="client-settings-device-list">
              {devices.map((device) => (
                <div key={device.id} className={`client-settings-device-row${device.active ? '' : ' inactive'}`}>
                  <div className="client-settings-device-info">
                    <strong>{device.label}</strong>
                    <span className="client-settings-device-type">{CONTACT_TYPE_LABELS[device.contactType] || device.contactType}</span>
                    <span className="client-settings-device-value">{device.contactValue}</span>
                  </div>
                  <div className="client-settings-device-actions">
                    <button
                      className={`client-settings-toggle-button${device.active ? ' active' : ''}`}
                      type="button"
                      onClick={() => handleToggle(device)}
                      title={device.active ? 'Disable notifications' : 'Enable notifications'}
                    >
                      {device.active ? 'Active' : 'Disabled'}
                    </button>
                    <button
                      className="client-settings-remove-button"
                      type="button"
                      onClick={() => handleDelete(device)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
