import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import HamburgerMenu from '../Components/HamburgerMenu';
import './Settings.css';

export default function Settings({ toggleSidebar, collapsed }) {
  const { user } = useAuth();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('Dear {name},\n\n\n\nThank you,\nThe ABI Team');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSendEmails = async () => {
    if (!user) return;
    if (!subject.trim() || !body.trim()) {
      setResult({ error: 'Subject and body are required.' });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/manager/email-all-clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject, body }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails.');
      }
      setResult(data);
    } catch (err) {
      setResult({ error: String(err.message || err) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="settings-page">
      <section className="settings-hero">
        <div>
          <div className="menu-toggle" onClick={toggleSidebar}>
            <HamburgerMenu collapsed={collapsed} />
          </div>
          <span className="settings-kicker">Manager Portal</span>
          <h2>Settings</h2>
          <p>Manage notifications and portal-wide actions.</p>
        </div>
      </section>

      <div className="settings-grid">
        <article className="settings-panel">
          <div className="settings-panel-header">
            <h3>Email All Clients</h3>
            <p>Send a message to every non-business client with an email address on file. Business accounts are skipped automatically.</p>
          </div>

          <div className="settings-field">
            <label htmlFor="email-subject">Subject</label>
            <input
              id="email-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Spring service update"
            />
          </div>

          <div className="settings-field">
            <label htmlFor="email-body">Body</label>
            <textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="settings-hint">
              Use <code>{'{name}'}</code> anywhere in the body and it will be replaced with each client's first name.
            </p>
          </div>

          <button
            className="settings-btn settings-btn-primary"
            onClick={handleSendEmails}
            disabled={sending}
          >
            {sending ? 'Sending…' : 'Send to All Clients'}
          </button>

          {result && !result.error && (
            <div className="settings-result settings-result-success">
              Sent to {result.sent?.length ?? 0} client{result.sent?.length !== 1 ? 's' : ''}.
              {result.failed?.length > 0 && (
                <> Failed: {result.failed.length} ({result.failed.join(', ')})</>
              )}
            </div>
          )}
          {result?.error && (
            <div className="settings-result settings-result-error">{result.error}</div>
          )}
        </article>
      </div>
    </div>
  );
}
