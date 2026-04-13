import React from 'react';

import { dayKey, formatDateTime, monthLabels, weekdayLabels } from '../clientDashboardShared';

export default function ScheduleSection({
  calendarDays,
  calendarMonth,
  scheduledJobsByDay,
  selectedCalendarDate,
  selectedDayJobs,
  setCalendarMonth,
  setSelectedCalendarDate,
}) {
  return (
    <section className="client-dashboard-grid client-dashboard-grid-single">
      <article className="client-panel client-panel-schedule">
        <div className="client-panel-header">
          <div>
            <h2>Scheduled Calendar</h2>
            <p>Click a highlighted day to view the jobs already booked for that date.</p>
          </div>
        </div>
        <div className="client-calendar-shell">
          <div className="client-calendar-header">
            <button
              type="button"
              className="client-calendar-nav"
              onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            >
              Prev
            </button>
            <strong>{monthLabels[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</strong>
            <button
              type="button"
              className="client-calendar-nav"
              onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            >
              Next
            </button>
          </div>
          <div className="client-calendar-grid">
            {weekdayLabels.map((label) => (
              <div key={label} className="client-calendar-weekday">{label}</div>
            ))}
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="client-calendar-cell client-calendar-empty" />;
              }
              const key = dayKey(date);
              const jobs = scheduledJobsByDay[key] || [];
              const isSelected = key === selectedCalendarDate;
              return (
                <button
                  type="button"
                  key={key}
                  className={`client-calendar-cell ${jobs.length ? 'has-jobs' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedCalendarDate(key)}
                >
                  <span>{date.getDate()}</span>
                  {jobs.length ? <strong>{jobs.length} job{jobs.length > 1 ? 's' : ''}</strong> : null}
                </button>
              );
            })}
          </div>
        </div>
        {selectedDayJobs.length ? (
          <div className="client-scheduled-list">
            {selectedDayJobs.map((job) => (
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
          <div className="client-empty-state">
            {selectedCalendarDate ? 'No jobs are scheduled on that day.' : 'No scheduled jobs yet.'}
          </div>
        )}
      </article>
    </section>
  );
}
