// src/pages/InvoicesPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Badge,
  Button,
  Form,
  InputGroup,
  Table,
  Spinner,
} from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './Invoices.css';
import { auth } from '../firebase';
import { Helmet } from 'react-helmet';
import HamburgerMenu from '../Components/HamburgerMenu';
import { DateTime } from 'luxon';
import { useNavigate } from 'react-router-dom';

const IDX = {
  INVOICE_ID: 0,
  CLIENT_ID: 1,
  INVOICE_NUM: 2,
  LOCATION_CODE: 3,
  ISSUE_DATE: 4,
  DUE_DATE: 5,
  PAYMENT_DATE: 6,
  SUBTOTAL: 7,
  SALESTAX: 8,
  BALANCE_DUE: 9,
  TIPS: 10,
  STATUS: 11,
  CREATED_AT: 12,
  UPDATED_AT: 13,
};

const page = 'invoice';

const dataHeader = [
  ['invoice_id', 'text'],
  ['client_id', 'text'],
  ['invoice_number', 'text'],
  ['location_code', 'text'],
  ['issue_date', 'date'],
  ['due_date', 'date'],
  ['payment_date', 'date'],
  ['subtotal', 'text'],
  ['salestax', 'text'],
  ['balance_due', 'text'],
  ['tips', 'text'],
  ['status', 'text'],
  ['created_at', 'date'],
  ['updated_at', 'date'],
];

const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');

const InvoicesPage = ({ toggleSidebar, collapsed }) => {
  const [invoices, setInvoices] = useState([]);
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token) => {
      fetch('/api/manager/invoicesData', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then(([invoiceData, clientData, itemData]) => {
          setInvoices(invoiceData);
          setItems(itemData);
          setClients(clientData);
        })
        .catch((e) => {
          console.error(e);
          setError(true);
        })
        .finally(() => setLoading(false));
    });
  }, [user]);

  /* ─────── Derived helpers ─────── */
  const enriched = invoices.map((inv) => {
    const clientRow = clients.find(
      (c) => String(c[0]) === String(inv[IDX.CLIENT_ID])
    );
    const clientName = clientRow
      ? `${clientRow[1] || ''} ${clientRow[2] || ''}`.trim()
      : '(no match)';
    const invItems = items.filter((i) => i[1] === inv[IDX.INVOICE_ID]);
    const totalItem = invItems.reduce((s, i) => s + parseFloat(i[3]), 0);
    return { raw: inv, clientName: clientName, items: invItems, totalItem };
  });

  const term = searchTerm.trim().toLowerCase();
  const filtered = enriched.filter(({ raw, clientName }) => {
    const invoiceNum = String(raw[IDX.INVOICE_NUM] ?? '').toLowerCase();
    return invoiceNum.includes(term) || clientName.toLowerCase().includes(term);
  });

  const totalOutstanding = enriched.reduce((s, { raw }) => s + parseFloat(raw[IDX.BALANCE_DUE] || 0), 0);
  const isOverdue = (raw) => raw[IDX.STATUS] === 'pending' && new Date(raw[IDX.DUE_DATE]) < new Date();

  /* ─────── CRUD helpers ─────── */
  const handleExportCSV = () => {
    const header = ['Invoice #', 'Client', 'Issue', 'Due', 'Balance', 'Status'];
    const rows = enriched.map(({ raw, clientName }) => [
      raw[IDX.INVOICE_NUM],
      clientName,
      raw[IDX.ISSUE_DATE],
      raw[IDX.DUE_DATE],
      raw[IDX.BALANCE_DUE],
      raw[IDX.STATUS],
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'invoices.csv' }).click();
    URL.revokeObjectURL(url);
  };

  const handleView = (inv) => navigate(`/invoice#${inv[IDX.INVOICE_ID]}`);
  const handleRowClick = (inv) => setSelectedItem({...inv});

  const handlePaid = (inv) => {
    const today = DateTime.local();
    const updated = {
      ...inv,
      [IDX.STATUS]: 'paid',
      [IDX.BALANCE_DUE]: 0,
      [IDX.PAYMENT_DATE]: today.toUTC().toISO(),
    };
    if (!user) return;
    user.getIdToken().then(async (token) => {
      try {
        const res = await fetch(`/api/manager/invoice/${inv[IDX.INVOICE_ID]}/mark-paid`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ payment_date: updated[IDX.PAYMENT_DATE] }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Mark paid failed');
        }
        setInvoices((cur) => cur.map((row) => (row[IDX.INVOICE_ID] === inv[IDX.INVOICE_ID] ? updated : row)));
        if (selectedItem && selectedItem[IDX.INVOICE_ID] === inv[IDX.INVOICE_ID]) {
          closePopup();
        }
      } catch (e) {
        console.error(e);
        setError(true);
      }
    });
  };

  const handleDelete = (invoiceId) => {
    if (!user) return;
    user.getIdToken().then(async (token) => {
      try {
        const res = await fetch('/api/manager/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(['invoices', invoiceId]),
        });
        if (!res.ok) throw new Error('Delete failed');
        setInvoices((cur) => cur.filter((row) => row[IDX.INVOICE_ID] !== invoiceId));
        if (selectedItem && selectedItem[IDX.INVOICE_ID] === invoiceId) {
          closePopup();
        }
      } catch (e) {
        console.error(e);
        setError(true);
      }
    });
  };

  const saveChanges = (selectedItem) => {
    if (!user) return;
    user.getIdToken().then(async (token) => {
      try {
        const res = await fetch('/api/manager/update/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({selectedItem}),
        });
        if (!res.ok) throw new Error('Update failed');
        setInvoices((cur) => cur.map((row) => (row[IDX.INVOICE_ID] === selectedItem[IDX.INVOICE_ID] ? selectedItem : row)));
        closePopup();
      } catch (e) {
        console.error(e);
        setError(true);
      }
    });
  };

  const closePopup = () => setSelectedItem(null);

  const formatDate = (dateStr) => {
    const newDate = new Date(dateStr);
    return newDate.getMonth() + 1 + '/' + newDate.getDate() + '/' + newDate.getFullYear();
  };

  if (loading) return <Spinner className="m-5" />;

  return (
    <div className="container py-4">
      <Helmet>
        <title>{capitalize(page)}</title>
      </Helmet>
      <header className="d-flex justify-content-between align-items-center mb-3">
        <div className="menu-toggle" onClick={toggleSidebar}>
          <HamburgerMenu collapsed={collapsed} />
        </div>
        <h1>Invoice Manager</h1>
        <Button onClick={() => navigate('/new-invoice')}>New Invoice</Button>
      <Button size="sm" onClick={handleExportCSV} variant="outline-secondary">
        Export CSV
      </Button>
      <Button size="sm" className="ms-2" onClick={() => window.print()} variant="outline-secondary">
        Print
      </Button>
      </header>
      <div className="summary mb-2">
        <strong>Total Outstanding:</strong> ${totalOutstanding.toFixed(2)}
      </div>

      <InputGroup className="mb-3">
        <Form.Control
          placeholder="Search by invoice # or client"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </InputGroup>

      {error && <div className="alert alert-danger">Something went wrong.</div>}

      <Table striped hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Client</th>
            <th>Issue</th>
            <th>Due</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(({ raw, clientName }) => (
            <tr key={raw[IDX.INVOICE_ID]}>
              <td>{raw[IDX.INVOICE_NUM]}</td>
              <td>{clientName}</td>
              <td>{formatDate(raw[IDX.ISSUE_DATE])}</td>
              <td>{formatDate(raw[IDX.DUE_DATE])}</td>
              <td>${parseFloat(raw[IDX.BALANCE_DUE] || 0).toFixed(2)}</td>
              <td>
                <Badge bg={raw[IDX.STATUS] === 'paid' ? 'success' : isOverdue(raw) ? 'danger' : 'primary'}>
                  {isOverdue(raw) ? 'Overdue' : capitalize(raw[IDX.STATUS])}
                </Badge>
              </td>
              <td>
                {raw[IDX.STATUS] !== 'paid' && (
                  <Button size="sm" className="me-1" variant="outline-success" onClick={() => handlePaid(raw)}>
                    Paid
                  </Button>
                )}
                <Button size="sm" className="me-1" variant="outline-primary" onClick={() => handleView(raw)}>
                  View
                </Button>
                <Button size="sm" className="me-1" variant="outline-warning" onClick={() => handleRowClick(raw)}>
                  Edit
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => handleDelete(raw[IDX.INVOICE_ID])}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {selectedItem && (
        <div className="table-popup" onClick={closePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <h3>{capitalize(page)} Details</h3>
            {dataHeader.slice(1).map(([key, type], idx) => (
              <label key={idx} className="popup-field">
                {capitalize(key.replace('_', ' '))}:
                {type === 'date' ? (
                  <DatePicker
                    selected={
                      selectedItem[idx + 1] ? new Date(selectedItem[idx + 1]) : null
                    }
                    onChange={(date) =>
                      setSelectedItem((prev) => ({
                        ...prev,
                        [idx + 1]: date.toUTCString(),
                      }))
                    }
                    dateFormat="yyyy-MM-dd"
                  />
                ) : (
                  <input
                    type="text"
                    value={selectedItem[idx + 1]}
                    onChange={(e) =>
                      setSelectedItem((prev) => ({
                        ...prev,
                        [idx + 1]: e.target.value,
                      }))
                    }
                  />
                )}
              </label>
            ))}
            <div className="popup-buttons mt-3">
              <Button variant="secondary" className="me-2" onClick={closePopup}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => saveChanges(selectedItem)}>
                Save
              </Button>
              <Button variant="danger" className="ms-2" onClick={() => handleDelete(selectedItem[IDX.INVOICE_ID])}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
