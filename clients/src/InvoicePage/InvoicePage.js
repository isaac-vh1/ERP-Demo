import React, { useState, useEffect, useRef } from 'react';
import './InvoicePage.css';
import { useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

const InvoicePage = () => {
  const [invoiceData, setInvoiceData] = useState(null);
  const location = useLocation();
  const invoiceNum = location.hash.slice(1);
  const user = auth.currentUser;
  const invoiceRef = useRef(null);

  useEffect(() => {
    setInvoiceData(null);
    if (!user) return;
    user.getIdToken().then(token => {
      fetch('/api/invoice/' + invoiceNum, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            console.error('Error response:', err);
            throw new Error(err.error);
          });
        }
        return response.json();
      })
      .then(dataAPI => {
        setInvoiceData(dataAPI);
      })
      .catch(error => console.error('Error fetching Data:', error));
    });
  }, [invoiceNum, user]);

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        windowWidth: 1280,
        onclone: (documentClone) => {
          const clonedInvoice = documentClone.querySelector('.invoice-card');
          if (clonedInvoice) {
            clonedInvoice.classList.add('invoice-pdf-mode');
          }
        },
      });
      const imageData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imageData);
      const originalWidth = imgProps.width;
      const originalHeight = imgProps.height;
      const margin = 10;
      const usableWidth = pdfWidth - margin * 2;
      const usableHeight = pdfHeight - margin * 2;
      let renderedWidth = usableWidth;
      let renderedHeight = (originalHeight * usableWidth) / originalWidth;

      if (renderedHeight > usableHeight) {
        renderedHeight = usableHeight;
        renderedWidth = (originalWidth * usableHeight) / originalHeight;
      }

      const x = (pdfWidth - renderedWidth) / 2;
      const y = margin;
      pdf.addImage(imageData, 'PNG', x, y, renderedWidth, renderedHeight);
      pdf.save(`invoice-${invoiceNum}.pdf`);
    } catch (err) {
      console.error('Failed to download PDF', err);
    }
  };
  function formatToMMDDYYYY(dateString) {
    const dateTemp = new Date(dateString);
    const dateObj = adjustForTimezone(dateTemp);
    if (isNaN(dateObj)) return dateString;
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();
    return `${month}/${day}/${year}`;
  }
  const adjustForTimezone = (date) => {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() + offset * 60000);
  };
  const subtotal = Number(invoiceData?.[3] || 0);
  const salesTax = Number(invoiceData?.[4] || 0);
  const totalDue = subtotal + salesTax;
  const tips = Number(invoiceData?.[6] || 0);
  const taxRate = subtotal > 0 ? (salesTax / subtotal) * 100 : 0;
  const items = invoiceData ? invoiceData.slice(15) : [];
  const invoiceStatus = String(invoiceData?.[7] || 'pending').toLowerCase();
  const invoiceStatusLabel = invoiceStatus === 'paid' ? 'Paid' : invoiceStatus.charAt(0).toUpperCase() + invoiceStatus.slice(1);

  if (
    !invoiceData ||
    invoiceData === 'Invoice not found' ||
    invoiceData === 'All Data not found'
  ) {
    return <div className="invoice-error">Error retrieving invoice. Please try again.</div>;
  }

  return (
    <div className="invoice-shell">
      <div className="invoice-toolbar">
        <button className="invoice-download-button" onClick={handleDownloadPdf}>
          Download PDF
        </button>
      </div>

      <div className="invoice-card" ref={invoiceRef}>
        <section className="invoice-header">
          <div className="invoice-brand">
            <div className="invoice-logo-wrap">
              <img src="/Demo_logo.png" className="invoice-logo" alt="Acres by Isaac logo" />
            </div>
            <div className="invoice-company">
              <h2>Acres By Isaac</h2>
              <p>156 NE 193rd St.</p>
              <p>Shoreline, WA 98155</p>
              <p>(206) 595-5831</p>
            </div>
          </div>

          <div className="invoice-meta">
            <article className="invoice-meta-card">
              <span>Invoice Number</span>
              <strong>#{invoiceData[0]}</strong>
              <div className={`invoice-status-pill invoice-status-${invoiceStatus}`}>{invoiceStatusLabel}</div>
            </article>
            <article className="invoice-meta-card">
              <span>Date of Completion</span>
              <strong>{formatToMMDDYYYY(invoiceData[1])}</strong>
              <p>Due {formatToMMDDYYYY(invoiceData[2])}</p>
            </article>
          </div>
        </section>

        <section className="invoice-highlights">
          <article className="invoice-highlight">
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </article>
          <article className="invoice-highlight">
            <span>Sales Tax</span>
            <strong>{formatCurrency(salesTax)}</strong>
          </article>
          <article className="invoice-highlight">
            <span>Tax Rate</span>
            <strong>{taxRate.toFixed(2)}%</strong>
          </article>
          <article className="invoice-highlight">
            <span>Status</span>
            <strong className={`invoice-highlight-status invoice-status-${invoiceStatus}`}>{invoiceStatusLabel}</strong>
          </article>
          <article className="invoice-highlight">
            <span>Total Due</span>
            <strong>{formatCurrency(totalDue)}</strong>
          </article>
        </section>

        <section className="invoice-grid">
          <div className="invoice-section invoice-section-compact">
            <h3>Bill To</h3>
            <div className="invoice-billto">
              <p>{invoiceData[10]} {invoiceData[11]}</p>
              <p>{invoiceData[12]}</p>
              <p>{invoiceData[13]}, WA {invoiceData[14]}</p>
            </div>
          </div>

          <div className="invoice-side-stack">
            <div className="invoice-section">
              <h3>Totals</h3>
              <div className="invoice-totals">
                <div className="invoice-total-row">
                  <span>Subtotal</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>
                <div className="invoice-total-row">
                  <span>Sales Tax</span>
                  <strong>{formatCurrency(salesTax)}</strong>
                </div>
                {tips > 0 ? (
                  <div className="invoice-total-row">
                    <span>Tips</span>
                    <strong>{formatCurrency(tips)}</strong>
                  </div>
                ) : null}
                <div className="invoice-total-row invoice-total-final">
                  <span>Total Due</span>
                  <strong className="invoice-total-due">{formatCurrency(totalDue)}</strong>
                </div>
              </div>
            </div>

            <div className="invoice-section">
              <h3>Payment Methods</h3>
              <ul className="invoice-payment-list">
                <li>Zelle: acres.by.isaac@gmail.com (Neat Nature LLC)</li>
                <li>Debit or credit card available by text at (206) 595-5831. ( 3% surcharge applies )</li>
                <li>Cash or check accepted.</li>
              </ul>
            </div>
          </div>

          <div className="invoice-section">
            <h3>Line Items</h3>
            <table className="invoice-items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index, slicedArray) => {
                  if (index % 2 !== 0) return null;
                  const description = slicedArray[index];
                  const price = slicedArray[index + 1];
                  return (
                    <tr key={index}>
                      <td>{description}</td>
                      <td className="invoice-items-price">{formatCurrency(price)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="invoice-side-stack">
            <div className="invoice-section">
              <h3>Invoice Notes</h3>
              <p className="invoice-note">
                A late fee of 20% of the subtotal may apply if payment is not received by the due date.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default InvoicePage;
