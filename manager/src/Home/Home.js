import React, { useEffect, useMemo, useState } from 'react';

import './Home.css';

import HamburgerMenu from '../Components/HamburgerMenu';
import { useAuth } from '../AuthContext';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('en-US');

const emptyDashboard = {
  summary: {
    yearIncome: 0,
    yearSalesTax: 0,
    yearExpenses: 0,
    yearTips: 0,
    netIncome: 0,
    paidInvoiceValue: 0,
    outstandingBalance: 0,
    overdueInvoices: 0,
    activeClients: 0,
    scheduledEvents: 0,
  },
  invoiceStatus: {
    paid: 0,
    pending: 0,
    draft: 0,
  },
  recentInvoices: [],
  upcomingEvents: [],
};

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatCount(value) {
  return numberFormatter.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString();
}

function MetricCard({ label, value, tone = 'default', detail }) {
  return (
    <article className={`metric-card metric-card-${tone}`}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      {detail ? <span className="metric-detail">{detail}</span> : null}
    </article>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="dashboard-empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function Home({ toggleSidebar, collapsed }) {
  const { user, loading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/manager/home', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load dashboard.');
        }

        const payload = await response.json();
        if (!cancelled) {
          setDashboard({
            ...emptyDashboard,
            ...payload,
            summary: {
              ...emptyDashboard.summary,
              ...(payload.summary || {}),
            },
            invoiceStatus: {
              ...emptyDashboard.invoiceStatus,
              ...(payload.invoiceStatus || {}),
            },
            recentInvoices: payload.recentInvoices || [],
            upcomingEvents: payload.upcomingEvents || [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Dashboard load failed:', err);
          setError(String(err.message || err));
          setDashboard(emptyDashboard);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const primaryMetrics = useMemo(
    () => [
      {
        label: 'Net Income',
        value: formatCurrency(dashboard.summary.netIncome),
        tone: 'success',
        detail: `Revenue ${formatCurrency(dashboard.summary.yearIncome)} vs expenses ${formatCurrency(dashboard.summary.yearExpenses)}`,
      },
      {
        label: 'Outstanding Balance',
        value: formatCurrency(dashboard.summary.outstandingBalance),
        tone: 'warning',
        detail: `${formatCount(dashboard.summary.overdueInvoices)} overdue invoice(s)`,
      },
      {
        label: 'Paid Invoice Value',
        value: formatCurrency(dashboard.summary.paidInvoiceValue),
        tone: 'calm',
        detail: `${formatCount(dashboard.invoiceStatus.paid)} paid invoice(s)`,
      },
      {
        label: 'Active Clients',
        value: formatCount(dashboard.summary.activeClients),
        tone: 'neutral',
        detail: `${formatCount(dashboard.summary.scheduledEvents)} scheduled event(s) ahead`,
      },
    ],
    [dashboard]
  );

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="menu-toggle" onClick={toggleSidebar}><HamburgerMenu collapsed={collapsed} /></div>
        <div className="dashboard-loading">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <div className="menu-toggle" onClick={toggleSidebar}><HamburgerMenu collapsed={collapsed} /></div>
          <span className="dashboard-kicker">Operations Snapshot</span>
          <h2>Manager Dashboard</h2>
          <p>
            {new Date().getFullYear()} revenue, invoices, and upcoming work — all from one place.
          </p>
        </div>
        <div className="dashboard-hero-panels">
          <div className="hero-stat">
            <span>Sales Tax Collected ({new Date().getFullYear()})</span>
            <strong>{formatCurrency(dashboard.summary.yearSalesTax)}</strong>
          </div>
          <div className="hero-stat">
            <span>Tips Collected ({new Date().getFullYear()})</span>
            <strong>{formatCurrency(dashboard.summary.yearTips)}</strong>
          </div>
        </div>
      </section>

      {error ? <div className="dashboard-error">{error}</div> : null}

      <section className="metrics-grid">
        {primaryMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="dashboard-panels">
        <article className="dashboard-panel">
          <div className="panel-header">
            <h3>Invoice Status</h3>
            <span>{new Date().getFullYear()} distribution</span>
          </div>
          <div className="status-grid">
            <div className="status-chip status-chip-paid">
              <span>Paid</span>
              <strong>{formatCount(dashboard.invoiceStatus.paid)}</strong>
            </div>
            <div className="status-chip status-chip-pending">
              <span>Pending</span>
              <strong>{formatCount(dashboard.invoiceStatus.pending)}</strong>
            </div>
            <div className="status-chip status-chip-draft">
              <span>Draft</span>
              <strong>{formatCount(dashboard.invoiceStatus.draft)}</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="panel-header">
            <h3>Upcoming Events</h3>
            <span>Next five scheduled jobs</span>
          </div>
          {dashboard.upcomingEvents.length ? (
            <div className="dashboard-list">
              {dashboard.upcomingEvents.map((event) => (
                <div className="list-row" key={event.id}>
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.clientName}</p>
                  </div>
                  <span>{formatDate(event.start)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No upcoming scheduled events"
              body="Drag jobs into the calendar to start building the schedule."
            />
          )}
        </article>

        <article className="dashboard-panel dashboard-panel-wide">
          <div className="panel-header">
            <h3>Recent Invoices</h3>
            <span>Latest invoice activity</span>
          </div>
          {dashboard.recentInvoices.length ? (
            <div className="dashboard-table">
              <div className="table-head">
                <span>Invoice</span>
                <span>Client</span>
                <span>Status</span>
                <span>Balance</span>
                <span>Due</span>
              </div>
              {dashboard.recentInvoices.map((invoice) => (
                <div className="table-row" key={invoice.id}>
                  <span>{invoice.invoiceNumber || `#${invoice.id}`}</span>
                  <span>{invoice.clientName}</span>
                  <span className={`status-pill status-${String(invoice.status).toLowerCase()}`}>
                    {invoice.status}
                  </span>
                  <span>{formatCurrency(invoice.balanceDue)}</span>
                  <span>{formatDate(invoice.dueDate)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No invoices yet"
              body="Create invoices to populate revenue, balance, and activity widgets."
            />
          )}
        </article>
      </section>
    </div>
  );
}

export default Home;
