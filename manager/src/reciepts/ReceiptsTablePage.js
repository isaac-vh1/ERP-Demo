import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Spinner, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

import HamburgerMenu from '../Components/HamburgerMenu';
import { useAuth } from '../AuthContext';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function ReceiptsTablePage({ toggleSidebar, collapsed }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [deletingReceiptId, setDeletingReceiptId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;

    async function loadReceipts() {
      try {
        setLoadingReceipts(true);
        setError('');
        const token = await user.getIdToken();
        const response = await fetch('/api/manager/receipts', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load receipts.');
        }
        if (cancelled) return;
        const rows = Array.isArray(payload) ? payload : [];
        const [, ...dataRows] = rows;
        setReceipts(
          dataRows
            .map((row) => ({
              id: row[0],
              expense_date: row[1],
              category: row[2],
              amount: row[3],
              description: row[4],
              vendor_name: row[5],
            }))
            .sort((a, b) => String(b.expense_date || '').localeCompare(String(a.expense_date || '')))
        );
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load receipts:', err);
          setError(String(err.message || err));
        }
      } finally {
        if (!cancelled) {
          setLoadingReceipts(false);
        }
      }
    }

    loadReceipts();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const filteredReceipts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return receipts;
    }

    return receipts.filter((receipt) => {
      const fields = [
        receipt.expense_date,
        receipt.category,
        receipt.vendor_name,
        receipt.description,
        String(receipt.amount ?? ''),
      ];
      return fields.some((field) => String(field || '').toLowerCase().includes(normalizedSearch));
    });
  }, [receipts, searchTerm]);

  const receiptCountLabel = useMemo(() => {
    if (!searchTerm.trim()) {
      return `${receipts.length} receipt${receipts.length === 1 ? '' : 's'}`;
    }
    return `${filteredReceipts.length} of ${receipts.length} receipt${receipts.length === 1 ? '' : 's'}`;
  }, [filteredReceipts.length, receipts.length, searchTerm]);

  const handleDeleteReceipt = async (receiptId) => {
    if (!user || deletingReceiptId === receiptId) return;
    if (!window.confirm('Delete this receipt record?')) {
      return;
    }

    try {
      setDeletingReceiptId(receiptId);
      setError('');
      setSuccess('');
      const token = await user.getIdToken();
      const response = await fetch('/api/manager/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(['receipts', receiptId]),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete receipt.');
      }
      setReceipts((current) => current.filter((receipt) => receipt.id !== receiptId));
      setSuccess('Receipt deleted.');
    } catch (err) {
      console.error('Receipt delete failed:', err);
      setError(String(err.message || err));
    } finally {
      setDeletingReceiptId(null);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-center p-4">
        <div className="w-100" style={{ maxWidth: 1180 }}>
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
            <div className="menu-toggle" onClick={toggleSidebar}><HamburgerMenu collapsed={collapsed} /></div>
            <div>
              <h2 className="mb-1">Receipts Table</h2>
              <div className="text-muted">{loadingReceipts ? 'Loading receipts...' : receiptCountLabel}</div>
            </div>
            <Button onClick={() => navigate('/receipts/new')}>New Receipt</Button>
          </div>

          <Form.Control
            className="mb-3"
            placeholder="Search by date, category, vendor, description, or amount"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          {error ? <Alert variant="warning">{error}</Alert> : null}
          {success ? <Alert variant="success">{success}</Alert> : null}

          <div className="bg-white rounded shadow-sm p-3">
            {loadingReceipts ? (
              <div className="d-flex align-items-center gap-2 text-muted">
                <Spinner animation="border" size="sm" />
                <span>Loading receipt records...</span>
              </div>
            ) : filteredReceipts.length ? (
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Vendor</th>
                      <th>Description</th>
                      <th className="text-end">Total</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceipts.map((receipt) => (
                      <tr
                        key={receipt.id}
                        role="button"
                        tabIndex={0}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/receipts/${receipt.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/receipts/${receipt.id}`);
                          }
                        }}
                      >
                        <td>{receipt.expense_date || 'N/A'}</td>
                        <td>{receipt.category || 'Uncategorized'}</td>
                        <td>{receipt.vendor_name || 'Not provided'}</td>
                        <td>{receipt.description || 'No description'}</td>
                        <td className="text-end">{formatCurrency(receipt.amount)}</td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            variant="outline-danger"
                            disabled={deletingReceiptId === receipt.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteReceipt(receipt.id);
                            }}
                          >
                            {deletingReceiptId === receipt.id ? 'Deleting…' : 'Delete'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <div className="text-muted">
                {receipts.length ? 'No receipts matched this search.' : 'No receipts saved yet.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceiptsTablePage;
