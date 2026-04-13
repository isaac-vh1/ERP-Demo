import React from 'react';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export const statusLabels = {
  draft: 'Draft invoice',
  pending: 'Awaiting payment',
  paid: 'Paid in full',
};

export const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const monthLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const navItems = [
  { key: 'overview', label: 'Overview', to: '/' },
  { key: 'requests', label: 'Service Request', to: '/client-requests' },
  { key: 'schedule', label: 'Schedule', to: '/client-schedule' },
  { key: 'invoices', label: 'Invoices', to: '/client-invoices' },
];

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function formatDateTime(value) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function dayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function MetricCard({ label, value, detail, tone = 'default' }) {
  return (
    <article className={`client-metric client-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}
