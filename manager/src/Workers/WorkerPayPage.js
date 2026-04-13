import React, { useEffect, useMemo, useState } from 'react';

import './WorkerPayPage.css';

import HamburgerMenu from '../Components/HamburgerMenu';
import { useAuth } from '../AuthContext';

function findColumn(columns, candidates) {
  return candidates.find((candidate) => columns.includes(candidate)) || '';
}

function normalizeTable(payload) {
  const rows = Array.isArray(payload) ? payload : [];
  const [header = [], ...dataRows] = rows;
  const columns = header.map((entry) => entry[0]);
  const columnTypes = Object.fromEntries(header);
  const objects = dataRows.map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, row[index]]))
  );
  return { columns, columnTypes, rows: objects };
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatHours(value) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildWorkerLabel(worker, mapping) {
  if (!worker) return 'Unknown worker';
  const singleName = worker[mapping.nameColumn];
  if (singleName) return String(singleName);
  const first = worker[mapping.firstNameColumn];
  const last = worker[mapping.lastNameColumn];
  const combined = [first, last].filter(Boolean).join(' ').trim();
  return combined || `Worker #${worker[mapping.idColumn]}`;
}

function WorkerPayPage({ toggleSidebar, collapsed }) {
  const { user, loading: authLoading } = useAuth();
  const [contractorsTable, setContractorsTable] = useState({ columns: [], columnTypes: {}, rows: [] });
  const [paymentsTable, setPaymentsTable] = useState({ columns: [], columnTypes: {}, rows: [] });
  const [loading, setLoading] = useState(true);
  const [savingWorker, setSavingWorker] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [workerForm, setWorkerForm] = useState({
    name: '',
    first_name: '',
    last_name: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    contractor_id: '',
    job_name: '',
    work_date: '',
    hours: '',
    amount_paid: '',
    notes: '',
  });

  const contractorMapping = useMemo(() => {
    const columns = contractorsTable.columns;
    return {
      idColumn: findColumn(columns, ['id', 'contractor_id']),
      nameColumn: findColumn(columns, ['name', 'contractor_name']),
      firstNameColumn: findColumn(columns, ['first_name', 'firstname']),
      lastNameColumn: findColumn(columns, ['last_name', 'lastname']),
    };
  }, [contractorsTable.columns]);

  const paymentMapping = useMemo(() => {
    const columns = paymentsTable.columns;
    return {
      idColumn: findColumn(columns, ['id']),
      contractorIdColumn: findColumn(columns, ['contractor_id', 'worker_id']),
      jobColumn: findColumn(columns, ['job_name', 'job', 'title', 'description']),
      hoursColumn: findColumn(columns, ['hours', 'hours_worked']),
      paidColumn: findColumn(columns, ['amount_paid', 'paid_amount', 'total_paid', 'amount', 'pay']),
      dateColumn: findColumn(columns, ['work_date', 'payment_date', 'paid_date', 'date']),
      notesColumn: findColumn(columns, ['notes', 'note']),
    };
  }, [paymentsTable.columns]);

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;

    async function loadAll() {
      try {
        setLoading(true);
        setError('');
        const token = await user.getIdToken();
        const [contractorsResponse, paymentsResponse] = await Promise.all([
          fetch('/api/manager/contractors', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/manager/contractor_payments', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const [contractorsPayload, paymentsPayload] = await Promise.all([
          contractorsResponse.json().catch(() => []),
          paymentsResponse.json().catch(() => []),
        ]);

        if (!contractorsResponse.ok) {
          throw new Error(contractorsPayload.error || 'Failed to load workers.');
        }
        if (!paymentsResponse.ok) {
          throw new Error(paymentsPayload.error || 'Failed to load worker payments.');
        }
        if (cancelled) return;

        setContractorsTable(normalizeTable(contractorsPayload));
        setPaymentsTable(normalizeTable(paymentsPayload));
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load worker pay page:', err);
          setError(String(err.message || err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const workers = useMemo(() => {
    const idColumn = contractorMapping.idColumn;
    return contractorsTable.rows.map((worker) => ({
      id: idColumn ? worker[idColumn] : '',
      label: buildWorkerLabel(worker, contractorMapping),
      raw: worker,
    }));
  }, [contractorMapping, contractorsTable.rows]);

  const payments = useMemo(() => {
    return paymentsTable.rows
      .map((payment) => ({
        id: paymentMapping.idColumn ? payment[paymentMapping.idColumn] : JSON.stringify(payment),
        contractorId: paymentMapping.contractorIdColumn ? payment[paymentMapping.contractorIdColumn] : '',
        jobName: paymentMapping.jobColumn ? payment[paymentMapping.jobColumn] : '',
        hours: paymentMapping.hoursColumn ? payment[paymentMapping.hoursColumn] : '',
        amountPaid: paymentMapping.paidColumn ? payment[paymentMapping.paidColumn] : '',
        workDate: paymentMapping.dateColumn ? payment[paymentMapping.dateColumn] : '',
        notes: paymentMapping.notesColumn ? payment[paymentMapping.notesColumn] : '',
        raw: payment,
      }))
      .sort((a, b) => String(b.workDate || '').localeCompare(String(a.workDate || '')));
  }, [paymentMapping, paymentsTable.rows]);

  const workerStats = useMemo(() => {
    const totalsByWorker = new Map();
    payments.forEach((payment) => {
      const key = String(payment.contractorId || '');
      const current = totalsByWorker.get(key) || { hours: 0, amountPaid: 0, jobs: 0 };
      current.hours += toNumber(payment.hours);
      current.amountPaid += toNumber(payment.amountPaid);
      current.jobs += 1;
      totalsByWorker.set(key, current);
    });

    return workers.map((worker) => ({
      ...worker,
      stats: totalsByWorker.get(String(worker.id || '')) || { hours: 0, amountPaid: 0, jobs: 0 },
    }));
  }, [payments, workers]);

  const rosterSupportsCreate = useMemo(
    () => Boolean(contractorMapping.nameColumn || (contractorMapping.firstNameColumn && contractorMapping.lastNameColumn)),
    [contractorMapping]
  );

  const paymentsSupportCreate = useMemo(
    () => Boolean(
      paymentMapping.contractorIdColumn &&
      paymentMapping.jobColumn &&
      paymentMapping.hoursColumn &&
      paymentMapping.paidColumn
    ),
    [paymentMapping]
  );

  const handleWorkerFormChange = (event) => {
    const { name, value } = event.target;
    setWorkerForm((current) => ({ ...current, [name]: value }));
  };

  const handlePaymentFormChange = (event) => {
    const { name, value } = event.target;
    setPaymentForm((current) => ({ ...current, [name]: value }));
  };

  const refreshTables = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const [contractorsResponse, paymentsResponse] = await Promise.all([
      fetch('/api/manager/contractors', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/manager/contractor_payments', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const [contractorsPayload, paymentsPayload] = await Promise.all([
      contractorsResponse.json().catch(() => []),
      paymentsResponse.json().catch(() => []),
    ]);
    if (!contractorsResponse.ok) {
      throw new Error(contractorsPayload.error || 'Failed to reload workers.');
    }
    if (!paymentsResponse.ok) {
      throw new Error(paymentsPayload.error || 'Failed to reload worker payments.');
    }
    setContractorsTable(normalizeTable(contractorsPayload));
    setPaymentsTable(normalizeTable(paymentsPayload));
  };

  const handleCreateWorker = async (event) => {
    event.preventDefault();
    if (!user || savingWorker || !rosterSupportsCreate) return;

    const selectedItem = {};
    if (contractorMapping.nameColumn) {
      if (!workerForm.name.trim()) {
        setError('Worker name is required.');
        return;
      }
      selectedItem[contractorMapping.nameColumn] = workerForm.name.trim();
    } else {
      if (!workerForm.first_name.trim() || !workerForm.last_name.trim()) {
        setError('First and last name are required.');
        return;
      }
      selectedItem[contractorMapping.firstNameColumn] = workerForm.first_name.trim();
      selectedItem[contractorMapping.lastNameColumn] = workerForm.last_name.trim();
    }

    try {
      setSavingWorker(true);
      setError('');
      setSuccess('');
      const token = await user.getIdToken();
      const response = await fetch('/api/manager/update/contractors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ selectedItem }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save worker.');
      }
      await refreshTables();
      setWorkerForm({ name: '', first_name: '', last_name: '' });
      setSuccess('Worker saved.');
    } catch (err) {
      console.error('Failed to save worker:', err);
      setError(String(err.message || err));
    } finally {
      setSavingWorker(false);
    }
  };

  const handleCreatePayment = async (event) => {
    event.preventDefault();
    if (!user || savingPayment || !paymentsSupportCreate) return;
    if (!paymentForm.contractor_id || !paymentForm.job_name.trim() || !paymentForm.hours || !paymentForm.amount_paid) {
      setError('Worker, job, hours, and amount paid are required.');
      return;
    }

    const selectedItem = {
      [paymentMapping.contractorIdColumn]: paymentForm.contractor_id,
      [paymentMapping.jobColumn]: paymentForm.job_name.trim(),
      [paymentMapping.hoursColumn]: paymentForm.hours,
      [paymentMapping.paidColumn]: paymentForm.amount_paid,
    };
    if (paymentMapping.dateColumn && paymentForm.work_date) {
      selectedItem[paymentMapping.dateColumn] = paymentForm.work_date;
    }
    if (paymentMapping.notesColumn && paymentForm.notes.trim()) {
      selectedItem[paymentMapping.notesColumn] = paymentForm.notes.trim();
    }

    try {
      setSavingPayment(true);
      setError('');
      setSuccess('');
      const token = await user.getIdToken();
      const response = await fetch('/api/manager/update/contractor_payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ selectedItem }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save work log.');
      }
      await refreshTables();
      setPaymentForm({
        contractor_id: '',
        job_name: '',
        work_date: '',
        hours: '',
        amount_paid: '',
        notes: '',
      });
      setSuccess('Work log saved.');
    } catch (err) {
      console.error('Failed to save work log:', err);
      setError(String(err.message || err));
    } finally {
      setSavingPayment(false);
    }
  };

  const paymentRows = useMemo(() => {
    const labelById = new Map(workerStats.map((worker) => [String(worker.id || ''), worker.label]));
    return payments.map((payment) => ({
      ...payment,
      workerLabel: labelById.get(String(payment.contractorId || '')) || 'Unknown worker',
    }));
  }, [payments, workerStats]);

  return (
    <div className="worker-pay-page">
      <section className="worker-pay-hero">
        <div>
          <div className="menu-toggle" onClick={toggleSidebar}><HamburgerMenu collapsed={collapsed} /></div>
          <span className="worker-pay-kicker">Crew Tracking</span>
          <h2>Worker Hours and Pay</h2>
          <p>Track who worked each job, how many hours they logged, and what they were paid.</p>
        </div>
      </section>

      {error ? <div className="worker-pay-state worker-pay-error">{error}</div> : null}
      {success ? <div className="worker-pay-state worker-pay-success">{success}</div> : null}
      {loading ? <div className="worker-pay-state">Loading worker ledger...</div> : null}

      {!loading ? (
        <>
          <section className="worker-pay-grid">
            <article className="worker-pay-panel">
              <div className="worker-pay-panel-header">
                <h3>Workers</h3>
                <span>{workerStats.length} on roster</span>
              </div>
              {rosterSupportsCreate ? (
                <form className="worker-pay-form" onSubmit={handleCreateWorker}>
                  {contractorMapping.nameColumn ? (
                    <label className="worker-pay-field worker-pay-field-wide">
                      <span>Worker Name</span>
                      <input name="name" value={workerForm.name} onChange={handleWorkerFormChange} placeholder="Add worker name" />
                    </label>
                  ) : (
                    <>
                      <label className="worker-pay-field">
                        <span>First Name</span>
                        <input name="first_name" value={workerForm.first_name} onChange={handleWorkerFormChange} placeholder="First name" />
                      </label>
                      <label className="worker-pay-field">
                        <span>Last Name</span>
                        <input name="last_name" value={workerForm.last_name} onChange={handleWorkerFormChange} placeholder="Last name" />
                      </label>
                    </>
                  )}
                  <div className="worker-pay-actions worker-pay-field-wide">
                    <button className="worker-pay-primary" type="submit" disabled={savingWorker}>
                      {savingWorker ? 'Saving…' : 'Add Worker'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="worker-pay-note">The `contractors` table does not expose recognizable name columns yet.</div>
              )}

              <div className="worker-pay-roster">
                {workerStats.length ? (
                  workerStats.map((worker) => (
                    <div className="worker-pay-roster-row" key={worker.id || worker.label}>
                      <div>
                        <strong>{worker.label}</strong>
                        <span>{worker.stats.jobs} job entry{worker.stats.jobs === 1 ? '' : 'ies'}</span>
                      </div>
                      <div className="worker-pay-roster-metrics">
                        <span>{formatHours(worker.stats.hours)} hrs</span>
                        <strong>{formatCurrency(worker.stats.amountPaid)}</strong>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="worker-pay-note">No workers found yet.</div>
                )}
              </div>
            </article>

            <article className="worker-pay-panel">
              <div className="worker-pay-panel-header">
                <h3>Log Work</h3>
                <span>Save a job, hours, and pay entry</span>
              </div>
              {paymentsSupportCreate ? (
                <form className="worker-pay-form" onSubmit={handleCreatePayment}>
                  <label className="worker-pay-field">
                    <span>Worker</span>
                    <select name="contractor_id" value={paymentForm.contractor_id} onChange={handlePaymentFormChange}>
                      <option value="">Select worker</option>
                      {workers.map((worker) => (
                        <option key={worker.id || worker.label} value={worker.id}>{worker.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="worker-pay-field">
                    <span>Date</span>
                    <input type="date" name="work_date" value={paymentForm.work_date} onChange={handlePaymentFormChange} />
                  </label>
                  <label className="worker-pay-field worker-pay-field-wide">
                    <span>Job</span>
                    <input name="job_name" value={paymentForm.job_name} onChange={handlePaymentFormChange} placeholder="What job did they work on?" />
                  </label>
                  <label className="worker-pay-field">
                    <span>Hours</span>
                    <input type="number" step="0.25" min="0" name="hours" value={paymentForm.hours} onChange={handlePaymentFormChange} placeholder="0.00" />
                  </label>
                  <label className="worker-pay-field">
                    <span>Amount Paid</span>
                    <input type="number" step="0.01" min="0" name="amount_paid" value={paymentForm.amount_paid} onChange={handlePaymentFormChange} placeholder="0.00" />
                  </label>
                  <label className="worker-pay-field worker-pay-field-wide">
                    <span>Notes</span>
                    <textarea name="notes" value={paymentForm.notes} onChange={handlePaymentFormChange} rows={4} placeholder="Optional notes" />
                  </label>
                  <div className="worker-pay-actions worker-pay-field-wide">
                    <button className="worker-pay-primary" type="submit" disabled={savingPayment}>
                      {savingPayment ? 'Saving…' : 'Save Work Log'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="worker-pay-note">
                  The `contractor_payments` table is missing one or more expected columns for worker, job, hours, or amount paid.
                </div>
              )}
            </article>
          </section>

          <section className="worker-pay-panel">
            <div className="worker-pay-panel-header">
              <h3>Payment History</h3>
              <span>{paymentRows.length} saved entries</span>
            </div>
            {paymentRows.length ? (
              <div className="worker-pay-table-wrap">
                <table className="worker-pay-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Worker</th>
                      <th>Job</th>
                      <th>Hours</th>
                      <th>Paid</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentRows.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.workDate)}</td>
                        <td>{payment.workerLabel}</td>
                        <td>{payment.jobName || 'No job name'}</td>
                        <td>{formatHours(payment.hours)}</td>
                        <td>{formatCurrency(payment.amountPaid)}</td>
                        <td>{payment.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="worker-pay-note">No worker payment entries saved yet.</div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

export default WorkerPayPage;
