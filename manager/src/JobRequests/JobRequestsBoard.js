import React, { useEffect, useMemo, useRef, useState } from 'react';

import './JobRequestsBoard.css';

import HamburgerMenu from '../Components/HamburgerMenu';
import { useAuth } from '../AuthContext';

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
];

function formatDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function JobRequestsBoard({ toggleSidebar, collapsed }) {
  const { user, loading: authLoading } = useAuth();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newRequest, setNewRequest] = useState({
    clientId: '',
    clientSearch: '',
    title: '',
    details: '',
    priority: 'normal',
    preferredWindow: '',
    serviceAddress: '',
  });

  // drag state
  const dragItem = useRef(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadBoard() {
      setLoading(true);
      setError('');
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/manager/job-requests', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const nextPayload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(nextPayload.error || 'Failed to load job board.');
        }
        if (!cancelled) {
          setPayload(nextPayload);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Job board failed:', err);
          setError(String(err.message || err));
          setPayload(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBoard();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const summary = payload?.summary || { total: 0, highPriority: 0, open: 0 };
  const clients = payload?.clients || [];
  const columns = payload?.columns || [];
  const selectedStatusLabel = useMemo(
    () => statusOptions.find((option) => option.value === selectedRequest?.status)?.label || selectedRequest?.status,
    [selectedRequest]
  );

  const rebuildBoardState = (current, requestRecord) => {
    const existingItems = current.columns.flatMap((column) => column.items).filter((item) => item.id !== requestRecord.id);
    const nextItems = [requestRecord, ...existingItems];
    return {
      ...current,
      columns: current.columns.map((column) => ({
        ...column,
        items: nextItems
          .filter((item) => item.status === column.key)
          .sort((left, right) => String(right.updatedAt || right.createdAt || '').localeCompare(String(left.updatedAt || left.createdAt || ''))),
      })),
      summary: {
        total: nextItems.length,
        highPriority: nextItems.filter((item) => item.priority === 'high').length,
        open: nextItems.filter((item) => item.status !== 'completed').length,
      },
    };
  };

  const removeFromBoardState = (current, id) => {
    const nextItems = current.columns.flatMap((column) => column.items).filter((item) => item.id !== id);
    return {
      ...current,
      columns: current.columns.map((column) => ({
        ...column,
        items: nextItems.filter((item) => item.status === column.key),
      })),
      summary: {
        total: nextItems.length,
        highPriority: nextItems.filter((item) => item.priority === 'high').length,
        open: nextItems.filter((item) => item.status !== 'completed').length,
      },
    };
  };

  const handleRequestChange = (event) => {
    const { name, value } = event.target;
    setSelectedRequest((current) => current ? ({ ...current, [name]: value }) : current);
  };
  const handleNewRequestChange = (event) => {
    const { name, value } = event.target;
    setNewRequest((current) => ({
      ...current,
      [name]: value,
    }));
  };
  const handleClientSelection = (inputValue) => {
    const matchedClient = clients.find((client) => client.name === inputValue);
    setNewRequest((current) => ({
      ...current,
      clientSearch: inputValue,
      clientId: matchedClient ? String(matchedClient.id) : '',
    }));
  };

  const handleSave = async () => {
    if (!user || !selectedRequest || saving) return;
    setSaving(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/manager/job-request/${selectedRequest.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(selectedRequest),
      });
      const updated = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(updated.error || 'Failed to save job request.');
      }
      setPayload((current) => current ? rebuildBoardState(current, updated) : current);
      setSelectedRequest(updated);
    } catch (err) {
      console.error('Job request save failed:', err);
      setError(String(err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !selectedRequest || deleting) return;
    setDeleting(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/manager/job-request/${selectedRequest.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete job request.');
      }
      setPayload((current) => current ? removeFromBoardState(current, selectedRequest.id) : current);
      setSelectedRequest(null);
      setConfirmDelete(false);
    } catch (err) {
      console.error('Job request delete failed:', err);
      setError(String(err.message || err));
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!user || creating) return;
    if (!newRequest.clientId) {
      setError('Select a client before creating a job.');
      return;
    }
    if (!newRequest.title.trim()) {
      setError('Job title is required.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/manager/job-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newRequest),
      });
      const created = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(created.error || 'Failed to create job request.');
      }
      setPayload((current) => current ? rebuildBoardState(current, created) : current);
      setNewRequest({
        clientId: '',
        clientSearch: '',
        title: '',
        details: '',
        priority: 'normal',
        preferredWindow: '',
        serviceAddress: '',
      });
      setCreatingNew(false);
      setSelectedRequest(created);
    } catch (err) {
      console.error('Job request create failed:', err);
      setError(String(err.message || err));
    } finally {
      setCreating(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (item) => {
    dragItem.current = item;
  };

  const handleDragOver = (event, columnKey) => {
    event.preventDefault();
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (event, targetColumnKey) => {
    event.preventDefault();
    setDragOverColumn(null);
    const item = dragItem.current;
    dragItem.current = null;
    if (!item || item.status === targetColumnKey || !user) return;

    const updatedItem = { ...item, status: targetColumnKey };
    // optimistic update
    setPayload((current) => current ? rebuildBoardState(current, updatedItem) : current);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/manager/job-request/${item.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedItem),
      });
      const saved = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(saved.error || 'Failed to move job request.');
      }
      setPayload((current) => current ? rebuildBoardState(current, saved) : current);
    } catch (err) {
      console.error('Job request move failed:', err);
      setError(String(err.message || err));
      // revert
      setPayload((current) => current ? rebuildBoardState(current, item) : current);
    }
  };

  return (
    <div className="job-board-page">
      <section className="job-board-hero">
        <div className="job-board-hero-info">
          <div>
            <div className="menu-toggle" onClick={toggleSidebar}><HamburgerMenu collapsed={collapsed} /></div>
            <span className="job-board-kicker">Project Intake</span>
            <h2>Client Request Board</h2>
            <p>Track new work separately from scheduled calendar events and move requests through review, scheduling, and delivery.</p>
          </div>
          <button className="job-board-primary job-board-create-btn" onClick={() => setCreatingNew(true)}>+ Create Job</button>
        </div>
        <div className="job-board-summary-grid">
          <article className="job-board-metric">
            <span>Total Requests</span>
            <strong>{summary.total}</strong>
          </article>
          <article className="job-board-metric">
            <span>Open Work</span>
            <strong>{summary.open}</strong>
          </article>
          <article className="job-board-metric">
            <span>High Priority</span>
            <strong>{summary.highPriority}</strong>
          </article>
        </div>
      </section>

      {loading ? <div className="job-board-state">Loading board...</div> : null}
      {error ? <div className="job-board-state job-board-error">{error}</div> : null}

      {!loading && !error ? (
        <section className="job-board-columns">
          {columns.map((column) => (
            <article
              className={`job-board-column${dragOverColumn === column.key ? ' job-board-column-drag-over' : ''}`}
              key={column.key}
              onDragOver={(e) => handleDragOver(e, column.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.key)}
            >
              <div className="job-board-column-header">
                <h3>{column.label}</h3>
                <span>{column.items.length}</span>
              </div>
              <div className="job-board-card-stack">
                {column.items.length ? (
                  column.items.map((item) => (
                    <div
                      className={`job-board-card priority-${item.priority}`}
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(item)}
                      onClick={() => setSelectedRequest(item)}
                    >
                      <div className="job-board-card-topline">
                        <strong>{item.title}</strong>
                        <span className={`job-board-card-priority priority-badge-${item.priority}`}>{item.priority}</span>
                      </div>
                      <p>{item.clientName}</p>
                      <small>{item.preferredWindow || 'No preferred timing provided'}</small>
                    </div>
                  ))
                ) : (
                  <div className="job-board-empty">No requests in this column.</div>
                )}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {creatingNew ? (
        <div className="job-board-modal-backdrop" onClick={() => setCreatingNew(false)}>
          <div className="job-board-modal" onClick={(event) => event.stopPropagation()}>
            <div className="job-board-modal-header">
              <div>
                <h3>Create Job</h3>
                <p>Add a manager-created work request to the board.</p>
              </div>
            </div>
            <form className="job-board-modal-grid" onSubmit={handleCreate}>
              <label>
                <span>Client</span>
                <input
                  type="text"
                  list="job-board-client-options"
                  value={newRequest.clientSearch}
                  onChange={(event) => handleClientSelection(event.target.value)}
                  placeholder="Type to search clients..."
                />
              </label>
              <datalist id="job-board-client-options">
                {clients.map((client) => (
                  <option key={client.id} value={client.name} />
                ))}
              </datalist>
              <label>
                <span>Priority</span>
                <select name="priority" value={newRequest.priority} onChange={handleNewRequestChange}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="job-board-modal-wide">
                <span>Job Title</span>
                <input name="title" value={newRequest.title} onChange={handleNewRequestChange} />
              </label>
              <label className="job-board-modal-wide">
                <span>Preferred Timing</span>
                <input name="preferredWindow" value={newRequest.preferredWindow} onChange={handleNewRequestChange} />
              </label>
              <label className="job-board-modal-wide">
                <span>Service Address</span>
                <input name="serviceAddress" value={newRequest.serviceAddress} onChange={handleNewRequestChange} />
              </label>
              <label className="job-board-modal-wide">
                <span>Client Notes</span>
                <textarea name="details" rows="4" value={newRequest.details} onChange={handleNewRequestChange} />
              </label>
              <div className="job-board-modal-actions job-board-modal-wide">
                <button type="button" className="job-board-secondary" onClick={() => setCreatingNew(false)}>Cancel</button>
                <button className="job-board-primary" type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedRequest ? (
        <div className="job-board-modal-backdrop" onClick={() => { setSelectedRequest(null); setConfirmDelete(false); }}>
          <div className="job-board-modal" onClick={(event) => event.stopPropagation()}>
            <div className="job-board-modal-header">
              <div>
                <h3>{selectedRequest.title}</h3>
                <p>{selectedRequest.clientName}</p>
              </div>
              <span className={`job-board-status status-${selectedRequest.status}`}>{selectedStatusLabel}</span>
            </div>

            <div className="job-board-modal-grid">
              <label>
                <span>Status</span>
                <select name="status" value={selectedRequest.status} onChange={handleRequestChange}>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Priority</span>
                <select name="priority" value={selectedRequest.priority} onChange={handleRequestChange}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="job-board-modal-wide">
                <span>Preferred Timing</span>
                <input name="preferredWindow" value={selectedRequest.preferredWindow || ''} onChange={handleRequestChange} />
              </label>
              <label className="job-board-modal-wide">
                <span>Service Address</span>
                <input name="serviceAddress" value={selectedRequest.serviceAddress || ''} onChange={handleRequestChange} />
              </label>
              <label className="job-board-modal-wide">
                <span>Client Notes</span>
                <textarea name="details" rows="5" value={selectedRequest.details || ''} onChange={handleRequestChange} />
              </label>
              <label className="job-board-modal-wide">
                <span>Manager Notes</span>
                <textarea name="managerNotes" rows="5" value={selectedRequest.managerNotes || ''} onChange={handleRequestChange} />
              </label>
            </div>

            <div className="job-board-modal-meta">
              <span>Created {formatDate(selectedRequest.createdAt)}</span>
              <span>Updated {formatDate(selectedRequest.updatedAt)}</span>
            </div>

            {confirmDelete ? (
              <div className="job-board-delete-confirm">
                <p>Permanently delete this job request? This cannot be undone.</p>
                <div className="job-board-modal-actions">
                  <button className="job-board-secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
                  <button className="job-board-danger" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="job-board-modal-actions">
                <button className="job-board-danger-outline" onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
                <div className="job-board-modal-actions-right">
                  <button className="job-board-secondary" onClick={() => setSelectedRequest(null)}>
                    Close
                  </button>
                  <button className="job-board-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
