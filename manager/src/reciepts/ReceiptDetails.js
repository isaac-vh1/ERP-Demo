import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import './ReceiptDetails.css';

import HamburgerMenu from '../Components/HamburgerMenu';
import { useAuth } from '../AuthContext';

const categoryOptions = [
  'Fuel',
  'Meals',
  'Supplies',
  'Materials and Supplies',
  'Equipment and Tools',
  'Insurance',
  'Licenses',
  'Dump Waste',
  'Other',
];

function formatDate(value) {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

function normalizeReceiptForm(receipt) {
  return {
    expense_date: receipt?.expense_date || '',
    category: receipt?.category || '',
    amount: receipt?.amount === null || receipt?.amount === undefined ? '' : String(receipt.amount),
    description: receipt?.description || '',
    vendor_name: receipt?.vendor_name || '',
  };
}

export default function ReceiptDetails({ toggleSidebar, collapsed }) {
  const { receiptId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [receipt, setReceipt] = useState(null);
  const [form, setForm] = useState(() => normalizeReceiptForm(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadReceipt() {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/manager/receipt/${receiptId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load receipt.');
        }
        if (!cancelled) {
          setReceipt(payload);
          setForm(normalizeReceiptForm(payload));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Receipt load failed:', err);
          setError(String(err.message || err));
          setReceipt(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReceipt();

    return () => {
      cancelled = true;
    };
  }, [authLoading, receiptId, user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!user || saving) return;
    if (!form.expense_date || !form.category || !form.amount || !form.description.trim()) {
      setError('Expense date, category, amount, and description are required.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const token = await user.getIdToken();
      const selectedItem = {
        id: Number(receiptId),
        expense_date: form.expense_date,
        category: form.category,
        amount: String(form.amount),
        description: form.description.trim(),
        vendor_name: form.vendor_name.trim(),
      };

      const response = await fetch('/api/manager/update/receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ selectedItem }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save receipt.');
      }

      setReceipt((current) => current ? ({
        ...current,
        ...selectedItem,
      }) : current);
      setForm((current) => ({
        ...current,
        description: current.description.trim(),
        vendor_name: current.vendor_name.trim(),
      }));
      setSuccess('Receipt updated.');
    } catch (err) {
      console.error('Receipt save failed:', err);
      setError(String(err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(normalizeReceiptForm(receipt));
    setError('');
    setSuccess('');
  };

  const handleDelete = async () => {
    if (!user || deleting) return;
    if (!window.confirm('Delete this receipt record?')) {
      return;
    }

    try {
      setDeleting(true);
      setError('');
      const token = await user.getIdToken();
      const response = await fetch('/api/manager/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(['receipts', Number(receiptId)]),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete receipt.');
      }
      navigate('/receipts');
    } catch (err) {
      console.error('Receipt delete failed:', err);
      setError(String(err.message || err));
      setDeleting(false);
    }
  };

  return (
    <div className="receipt-details-page">
      <section className="receipt-details-hero">
        <div>
          <div className="menu-toggle" onClick={toggleSidebar}><HamburgerMenu collapsed={collapsed} /></div>
          <span className="receipt-details-kicker">Manager View</span>
          <h2>Receipt #{receiptId}</h2>
          <p>{receipt?.description || 'Review the stored receipt image and update the saved expense fields.'}</p>
        </div>
        <div className="receipt-details-hero-actions">
          <button className="receipt-details-delete" onClick={handleDelete} disabled={loading || deleting || saving}>
            {deleting ? 'Deleting…' : 'Delete Receipt'}
          </button>
          <button className="receipt-details-back" onClick={() => navigate('/receipts')} disabled={saving}>
            Back to Receipts
          </button>
        </div>
      </section>

      {loading ? <div className="receipt-details-state">Loading receipt...</div> : null}
      {error ? <div className="receipt-details-state receipt-details-error">{error}</div> : null}
      {success ? <div className="receipt-details-state receipt-details-success">{success}</div> : null}

      {!loading && !error && receipt ? (
        <section className="receipt-details-grid">
          <article className="receipt-details-panel">
            <div className="receipt-details-panel-header">
              <h3>Receipt Image</h3>
              <span>{receipt.image_name || receipt.image_mime_type || 'Stored image'}</span>
            </div>
            {receipt.image_src ? (
              <div className="receipt-details-image-frame">
                <img src={receipt.image_src} alt={`Receipt ${receipt.id}`} className="receipt-details-image" />
              </div>
            ) : (
              <div className="receipt-details-empty">No receipt image is stored for this record.</div>
            )}
            <div className="receipt-details-meta">
              <div>
                <span>Saved Date</span>
                <strong>{formatDate(receipt.expense_date)}</strong>
              </div>
              <div>
                <span>Receipt ID</span>
                <strong>{receipt.id}</strong>
              </div>
            </div>
          </article>

          <article className="receipt-details-panel">
            <div className="receipt-details-panel-header">
              <h3>Edit Expense Details</h3>
              <span>Changes save directly to the receipts table</span>
            </div>
            <form className="receipt-details-form" onSubmit={handleSave}>
              <label className="receipt-details-field">
                <span>Date</span>
                <input type="date" name="expense_date" value={form.expense_date} onChange={handleChange} required />
              </label>

              <label className="receipt-details-field">
                <span>Category</span>
                <select name="category" value={form.category} onChange={handleChange} required>
                  <option value="">Select category</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label className="receipt-details-field">
                <span>Amount</span>
                <input type="number" step="0.01" min="0" name="amount" value={form.amount} onChange={handleChange} required />
              </label>

              <label className="receipt-details-field">
                <span>Vendor</span>
                <input type="text" name="vendor_name" value={form.vendor_name} onChange={handleChange} placeholder="Vendor name" />
              </label>
              <label className="receipt-details-field receipt-details-field-wide">
                <span>Description</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Describe the expense"
                  required
                />
              </label>

              <div className="receipt-details-form-actions">
                <button type="submit" className="receipt-details-save" disabled={saving || deleting}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" className="receipt-details-reset" onClick={handleReset} disabled={saving}>
                  Reset
                </button>
              </div>
            </form>
          </article>
        </section>
      ) : null}
    </div>
  );
}
