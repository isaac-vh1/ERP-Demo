import React from 'react';

import { formatCurrency, formatDate } from '../clientDashboardShared';

export default function InvoicesSection({
  filteredInvoices,
  invoiceYears,
  navigate,
  selectedInvoiceYear,
  setSelectedInvoiceYear,
}) {
  return (
    <section className="client-dashboard-grid client-dashboard-grid-single">
      <article className="client-panel client-panel-wide">
        <div className="client-panel-header">
          <div>
            <h2>Invoices</h2>
          </div>
          {invoiceYears.length ? (
            <label className="client-invoice-year-filter">
              <span>Year</span>
              <select value={selectedInvoiceYear} onChange={(event) => setSelectedInvoiceYear(event.target.value)}>
                {invoiceYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {filteredInvoices.length ? (
          <div className="client-invoice-table-wrap">
            <table className="client-invoice-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Balance</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} onClick={() => navigate(`/invoice#${invoice.id}`)}>
                    <td>
                      <strong>{invoice.invoiceNumber || `#${invoice.id}`}</strong>
                    </td>
                    <td>{formatDate(invoice.issueDate)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td>
                      <span className={`client-status-pill client-status-${invoice.status}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>{formatCurrency(invoice.subtotal + invoice.salesTax + invoice.tips)}</td>
                    <td>{formatCurrency(invoice.balanceDue)}</td>
                    <td>
                      <button
                        type="button"
                        className="client-open-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/invoice#${invoice.id}`);
                        }}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="client-empty-state">
            No invoices are available for {selectedInvoiceYear || 'the selected year'}.
          </div>
        )}
      </article>
    </section>
  );
}
