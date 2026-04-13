import React from 'react';

export default function RequestsSection({ handleFormChange, handleJobRequestSubmit, jobForm, submitting }) {
  return (
    <section className="client-dashboard-grid client-dashboard-grid-single">
      <article className="client-panel client-panel-form">
        <div className="client-panel-header">
          <div>
            <h2>Request New Work</h2>
            <p>Send the team a scoped request</p>
          </div>
        </div>
        <form className="client-job-form" onSubmit={handleJobRequestSubmit}>
          <label>
            <span>Request Title</span>
            <input
              name="title"
              value={jobForm.title}
              onChange={handleFormChange}
              placeholder="Spring cleanup, patio refresh, pruning..."
            />
          </label>
          <label>
            <span>Priority</span>
            <select name="priority" value={jobForm.priority} onChange={handleFormChange}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="client-job-form-wide">
            <span>Preferred Timing</span>
            <input
              name="preferredWindow"
              value={jobForm.preferredWindow}
              onChange={handleFormChange}
              placeholder="Next week, before April 15, weekday mornings..."
            />
          </label>
          <label className="client-job-form-wide">
            <span>Service Address</span>
            <input
              name="serviceAddress"
              value={jobForm.serviceAddress}
              onChange={handleFormChange}
            />
          </label>
          <label className="client-job-form-wide">
            <span>Project Notes</span>
            <textarea
              name="details"
              rows="5"
              value={jobForm.details}
              onChange={handleFormChange}
              placeholder="Describe the work, goals, materials, access notes, or photos you plan to send separately."
            />
          </label>
          <div className="client-job-actions client-job-form-wide">
            <button className="client-primary-button" type="submit" disabled={submitting}>
              {submitting ? 'Sending...' : 'Submit Job Request'}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}
