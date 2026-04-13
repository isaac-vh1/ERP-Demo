import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './ClientDashboard.css';

import { useAuth } from '../AuthContext';
import InvoicesSection from './components/InvoicesSection';
import OverviewSection from './components/OverviewSection';
import RequestsSection from './components/RequestsSection';
import ScheduleSection from './components/ScheduleSection';
import { dayKey, formatCurrency } from './clientDashboardShared';

export default function ClientDashboard({ section = 'overview' }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedInvoiceYear, setSelectedInvoiceYear] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const [jobForm, setJobForm] = useState({
    title: '',
    details: '',
    priority: 'normal',
    preferredWindow: '',
    serviceAddress: '',
  });

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
        const response = await fetch('/api/client/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load dashboard.');
        }
        if (!cancelled) {
          setDashboard(payload);
          const availableYears = (payload.invoices || [])
            .map((invoice) => {
              const date = new Date(invoice.issueDate || invoice.dueDate || invoice.paymentDate || '');
              return Number.isNaN(date.getTime()) ? null : String(date.getFullYear());
            })
            .filter(Boolean)
            .sort((a, b) => Number(b) - Number(a));
          setSelectedInvoiceYear((current) => current || availableYears[0] || '');
          setJobForm((current) => ({
            ...current,
            serviceAddress:
              current.serviceAddress ||
              [payload.client?.address, payload.client?.city, payload.client?.zipCode]
                .filter(Boolean)
                .join(', '),
          }));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Client dashboard failed:', err);
          setError(String(err.message || err));
          setDashboard(null);
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

  const summary = dashboard?.summary || {
    outstandingBalance: 0,
    pendingInvoiceCount: 0,
    jobRequestCount: 0,
  };
  const invoices = useMemo(() => dashboard?.invoices || [], [dashboard?.invoices]);
  const scheduledJobs = useMemo(() => dashboard?.scheduledJobs || [], [dashboard?.scheduledJobs]);
  const scheduledJobsByDay = useMemo(
    () =>
      scheduledJobs.reduce((acc, job) => {
        const key = dayKey(job.start);
        if (!key) return acc;
        acc[key] = [...(acc[key] || []), job];
        return acc;
      }, {}),
    [scheduledJobs]
  );
  const selectedDayJobs = selectedCalendarDate ? (scheduledJobsByDay[selectedCalendarDate] || []) : [];
  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const totalDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    const cells = Array.from({ length: startOfMonth.getDay() }, () => null);
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
    }
    return cells;
  }, [calendarMonth]);
  const invoiceYears = useMemo(
    () =>
      Array.from(
        new Set(
          invoices
            .map((invoice) => {
              const date = new Date(invoice.issueDate || invoice.dueDate || invoice.paymentDate || '');
              return Number.isNaN(date.getTime()) ? null : String(date.getFullYear());
            })
            .filter(Boolean)
        )
      ).sort((a, b) => Number(b) - Number(a)),
    [invoices]
  );
  const filteredInvoices = useMemo(() => {
    const filtered = selectedInvoiceYear
      ? invoices.filter((invoice) => {
          const date = new Date(invoice.issueDate || invoice.dueDate || invoice.paymentDate || '');
          return !Number.isNaN(date.getTime()) && String(date.getFullYear()) === selectedInvoiceYear;
        })
      : invoices;
    return [...filtered].sort((a, b) => {
      const left = new Date(a.issueDate || a.dueDate || a.paymentDate || 0).getTime();
      const right = new Date(b.issueDate || b.dueDate || b.paymentDate || 0).getTime();
      return right - left;
    });
  }, [invoices, selectedInvoiceYear]);
  const latestInvoices = useMemo(() => filteredInvoices.slice(0, 5), [filteredInvoices]);
  const upcomingJobs = useMemo(
    () =>
      [...scheduledJobs]
        .sort((a, b) => new Date(a.start || 0).getTime() - new Date(b.start || 0).getTime())
        .slice(0, 3),
    [scheduledJobs]
  );

  useEffect(() => {
    const firstScheduledDay = Object.keys(scheduledJobsByDay).sort()[0] || '';
    if (!selectedCalendarDate && firstScheduledDay) {
      setSelectedCalendarDate(firstScheduledDay);
      const firstDate = new Date(firstScheduledDay);
      setCalendarMonth(new Date(firstDate.getFullYear(), firstDate.getMonth(), 1));
    }
  }, [scheduledJobsByDay, selectedCalendarDate]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setJobForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleJobRequestSubmit = async (event) => {
    event.preventDefault();
    if (!user || submitting) return;
    if (!jobForm.title.trim()) {
      setError('Job request title is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/client/job-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(jobForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send job request.');
      }
      setDashboard((current) => current ? ({
        ...current,
        summary: {
          ...current.summary,
          jobRequestCount: (current.summary?.jobRequestCount || 0) + 1,
        },
        jobRequests: [payload, ...(current.jobRequests || [])],
      }) : current);
      setJobForm({
        title: '',
        details: '',
        priority: 'normal',
        preferredWindow: '',
        serviceAddress:
          [dashboard?.client?.address, dashboard?.client?.city, dashboard?.client?.zipCode]
            .filter(Boolean)
            .join(', '),
      });
    } catch (err) {
      console.error('Job request submit failed:', err);
      setError(String(err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="client-dashboard-spinner-wrap">
        <div className="client-dashboard-spinner" />
      </div>
    );
  }

  return (
    <div className={`client-portal client-portal-${section}`}>
      {error ? <div className="client-dashboard-state client-dashboard-error">{error}</div> : null}
      {section === 'requests' ? (
        <RequestsSection
          handleFormChange={handleFormChange}
          handleJobRequestSubmit={handleJobRequestSubmit}
          jobForm={jobForm}
          submitting={submitting}
        />
      ) : null}
      {section === 'schedule' ? (
        <ScheduleSection
          calendarDays={calendarDays}
          calendarMonth={calendarMonth}
          scheduledJobsByDay={scheduledJobsByDay}
          selectedCalendarDate={selectedCalendarDate}
          selectedDayJobs={selectedDayJobs}
          setCalendarMonth={setCalendarMonth}
          setSelectedCalendarDate={setSelectedCalendarDate}
        />
      ) : null}
      {section === 'invoices' ? (
        <InvoicesSection
          filteredInvoices={filteredInvoices}
          invoiceYears={invoiceYears}
          latestInvoices={latestInvoices}
          navigate={navigate}
          selectedInvoiceYear={selectedInvoiceYear}
          setSelectedInvoiceYear={setSelectedInvoiceYear}
        />
      ) : null}
      {section === 'overview' ? (
        <OverviewSection
          latestInvoices={latestInvoices}
          navigate={navigate}
          summary={summary}
          upcomingJobs={upcomingJobs}
        />
      ) : null}
    </div>
  );
}
