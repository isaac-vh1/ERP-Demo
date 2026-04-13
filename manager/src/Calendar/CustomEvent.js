// src/components/CustomEvent.js

import React from 'react';

const CustomEvent = ({ event, onDoubleClick }) => {
  const handleDoubleClick = (e) => {
    e.preventDefault();
    onDoubleClick(event);
  };

  return (
    <div onDoubleClick={handleDoubleClick} className="calendar-event-card">
      <strong>{event.title}</strong>
      {event.clientName ? <span>{event.clientName}</span> : null}
    </div>
  );
};

export default CustomEvent;
