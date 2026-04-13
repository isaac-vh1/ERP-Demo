import React from 'react';
import { NavLink } from 'react-router-dom';

import { formatCurrency, formatDateTime, MetricCard, statusLabels } from '../clientDashboardShared';

export default function OverviewSection({ latestInvoices, navigate, summary, upcomingJobs }) {
  return (
    <>
      <section className="client-metrics-grid client-metrics-grid-compact">
        <MetricCard
          label="Open Balance"
          value={formatCurrency(summary.outstandingBalance)}
          detail={`${summary.pendingInvoiceCount} invoice(s) awaiting payment`}
          tone="warning"
        />
        <MetricCard
          label="Job Requests"
          value={summary.jobRequestCount}
          detail="Separate from your scheduled service events"
          tone="neutral"
        />
      </section>

      <section className="client-dashboard-grid client-dashboard-grid-overview">
        <article className="client-panel">
          <div className="client-panel-header">
            <div>
              <h2>Upcoming Schedule</h2>
              <p>Your next scheduled service dates at a glance.</p>
            </div>
            <NavLink className="client-inline-link" to="/client-schedule">Open schedule</NavLink>
          </div>
          {upcomingJobs.length ? (
            <div className="client-scheduled-list">
              {upcomingJobs.map((job) => (
                <article className="client-scheduled-card" key={job.id}>
                  <strong>{job.title}</strong>
                  <p>{job.description || 'No additional details provided.'}</p>
                  <div className="client-scheduled-meta">
                    <span>{formatDateTime(job.start)}</span>
                    {job.end ? <span>Ends {formatDateTime(job.end)}</span> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="client-empty-state">No scheduled jobs yet.</div>
          )}
        </article>

        <article className="client-panel">
          <div className="client-panel-header">
            <div>
              <h2>Recent Invoices</h2>
              <p>Latest balances and due dates.</p>
            </div>
            <NavLink className="client-inline-link" to="/client-invoices">View all invoices</NavLink>
          </div>
          {latestInvoices.length ? (
            <div className="client-invoice-highlights client-invoice-highlights-stack">
              {latestInvoices.slice(0, 3).map((invoice) => (
                <button
                  className="client-invoice-highlight"
                  key={invoice.id}
                  onClick={() => navigate(`/invoice#${invoice.id}`)}
                >
                  <span>{invoice.invoiceNumber || `#${invoice.id}`}</span>
                  <strong>{formatCurrency(invoice.balanceDue)}</strong>
                  <p>{statusLabels[invoice.status] || invoice.status}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="client-empty-state">No invoices are available yet.</div>
          )}
        </article>
      </section>
    </>
  );
}
