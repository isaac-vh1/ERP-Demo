import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './Clients.css';

import HamburgerMenu from '../Components/HamburgerMenu';
import { useAuth } from '../AuthContext';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});
const CLIENTS_REQUEST_TIMEOUT_MS = 15000;

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

export default function Clients({ toggleSidebar, collapsed }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newClient, setNewClient] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: '',
    city: '',
    zipCode: '',
    dorLocationCode: '',
    picturePreference: false,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadClients() {
      setLoading(true);
      setError('');
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), CLIENTS_REQUEST_TIMEOUT_MS);
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/manager/clients-list', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load clients.');
        }
        const payload = await response.json();
        if (!cancelled) {
          setClients(Array.isArray(payload) ? payload : []);
          if (!Array.isArray(payload)) {
            setError('Client list returned an invalid response.');
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Client list failed:', err);
          setError(
            err.name === 'AbortError'
              ? 'Loading clients timed out. Check the server and try again.'
              : String(err.message || err)
          );
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadClients();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) =>
      [
        client.name,
        client.email,
        client.phoneNumber,
        client.address,
        client.city,
        client.zipCode,
      ].some((value) => String(value || '').toLowerCase().includes(term))
    );
  }, [clients, search]);

  const handleDelete = async (clientId) => {
    if (!user) return;
    if (!window.confirm('Delete this client record?')) {
      return;
    }
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/manager/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(['clients', clientId]),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete client.');
      }
      setClients((current) => current.filter((client) => client.id !== clientId));
    } catch (err) {
      console.error('Client delete failed:', err);
      setError(String(err.message || err));
    }
  };

  const handleNewClientChange = (event) => {
    const { name, value, type, checked } = event.target;
    setNewClient((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetCreateForm = () => {
    setNewClient({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      address: '',
      city: '',
      zipCode: '',
      dorLocationCode: '',
      picturePreference: false,
    });
  };

  const handleCreateClient = async (event) => {
    event.preventDefault();
    if (!user || creating) return;

    const firstName = newClient.firstName.trim();
    const lastName = newClient.lastName.trim();
    const address = newClient.address.trim();
    const city = newClient.city.trim();
    const zipCode = newClient.zipCode.trim();

    if (!firstName || !lastName) {
      setError('First and last name are required.');
      return;
    }

    if (!address || !city || !zipCode) {
      setError('Address, city, and ZIP code are required.');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/manager/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newClient,
          firstName,
          lastName,
          address,
          city,
          zipCode,
          email: newClient.email.trim(),
          phoneNumber: newClient.phoneNumber.trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create client.');
      }

      resetCreateForm();
      setIsCreating(false);
      navigate(`/clients/${payload.id}`);
    } catch (err) {
      console.error('Client create failed:', err);
      setError(String(err.message || err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="clients-page">
      <section className="clients-hero">
        <div>
          <div className="menu-toggle" onClick={toggleSidebar}><HamburgerMenu collapsed={collapsed} /></div>
          <span className="clients-kicker">Client Management</span>
          <h2>Clients Directory</h2>
          <p>Browse clients with balances, upcoming work, and direct actions without digging through raw tables.</p>
        </div>
        <div className="clients-hero-stat">
          <span>Total Clients</span>
          <strong>{clients.length}</strong>
        </div>
      </section>

      <section className="clients-toolbar">
        <input
          className="clients-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone, or address"
        />
        <button
          className="clients-primary-action"
          type="button"
          onClick={() => {
            setError('');
            setIsCreating((current) => !current);
          }}
        >
          {isCreating ? 'Close Form' : 'New Client'}
        </button>
      </section>

      {loading ? <div className="clients-state">Loading clients...</div> : null}
      {error ? <div className="clients-state clients-error">{error}</div> : null}

      {isCreating ? (
        <section className="clients-panel">
          <div className="clients-panel-header">
            <h3>Create Client</h3>
            <span>Add the contact and service address before scheduling work.</span>
          </div>
          <form className="clients-create-form" onSubmit={handleCreateClient}>
            <label>
              <span>First Name</span>
              <input name="firstName" value={newClient.firstName} onChange={handleNewClientChange} />
            </label>
            <label>
              <span>Last Name</span>
              <input name="lastName" value={newClient.lastName} onChange={handleNewClientChange} />
            </label>
            <label>
              <span>Email</span>
              <input name="email" value={newClient.email} onChange={handleNewClientChange} />
            </label>
            <label>
              <span>Phone Number</span>
              <input name="phoneNumber" value={newClient.phoneNumber} onChange={handleNewClientChange} />
            </label>
            <label className="clients-create-form-wide">
              <span>Address</span>
              <input name="address" value={newClient.address} onChange={handleNewClientChange} />
            </label>
            <label>
              <span>City</span>
              <input name="city" value={newClient.city} onChange={handleNewClientChange} />
            </label>
            <label>
              <span>ZIP Code</span>
              <input name="zipCode" value={newClient.zipCode} onChange={handleNewClientChange} />
            </label>
            <label>
              <span>DOR Location Code</span>
              <input
                name="dorLocationCode"
                value={newClient.dorLocationCode}
                onChange={handleNewClientChange}
                placeholder="Manual entry"
              />
            </label>
            <label className="clients-create-checkbox">
              <input
                type="checkbox"
                name="picturePreference"
                checked={newClient.picturePreference}
                onChange={handleNewClientChange}
              />
              <span>Client prefers picture updates</span>
            </label>
            <div className="clients-create-actions clients-create-form-wide">
              <button className="clients-primary-action" type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Client'}
              </button>
              <button
                className="clients-secondary-action"
                type="button"
                onClick={() => {
                  resetCreateForm();
                  setIsCreating(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {!loading && !error ? (
        <section className="clients-panel">
          <div className="clients-panel-header">
            <h3>Active Client Records</h3>
            <span>{filteredClients.length} result(s)</span>
          </div>

          {filteredClients.length ? (
            <div className="clients-table-wrap">
              <table className="clients-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Contact</th>
                    <th>Address</th>
                    <th>Open Balance</th>
                    <th>Jobs</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <strong>{client.name}</strong>
                        <span>{client.invoiceCount} invoice(s)</span>
                      </td>
                      <td>
                        <strong>{client.email || 'No email'}</strong>
                        <span>{client.phoneNumber || 'No phone'}</span>
                      </td>
                      <td>
                        <strong>{client.address || 'No address'}</strong>
                        <span>{[client.city, client.zipCode].filter(Boolean).join(', ')}</span>
                      </td>
                      <td>{formatCurrency(client.outstandingBalance)}</td>
                      <td>{client.upcomingJobs}</td>
                      <td>
                        <div className="clients-actions">
                          <button className="clients-action clients-view" onClick={() => navigate(`/clients/${client.id}`)}>
                            Open
                          </button>
                          <button className="clients-action clients-delete" onClick={() => handleDelete(client.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="clients-empty">No clients matched this search.</div>
          )}
        </section>
      ) : null}
    </div>
  );
}
