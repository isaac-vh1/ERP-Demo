// src/components/DraggableEvent.js

import React, { useState } from 'react';
import './DraggableEvent.css'; // Import your CSS styles

const DraggableEvent = ({ event, onDragStart, onClick }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    setIsDragging(true);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(event.id));
    }
    onDragStart(event);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`draggable-event ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <strong>{event.title}</strong>
      {event.clientName ? <div>{event.clientName}</div> : null}
      <div>Duration: {event.duration} hr(s)</div>
    </div>
  );
};

export default DraggableEvent;
