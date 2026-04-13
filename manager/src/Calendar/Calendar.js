import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Views, momentLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";
import { Helmet } from "react-helmet";
import { Button, Spinner } from "react-bootstrap";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./Calendar.css";

import HamburgerMenu from "../Components/HamburgerMenu";
import { useAuth } from "../AuthContext";
import CustomEvent from "./CustomEvent";
import DraggableEvent from "./DraggableEvent";

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

const CALENDAR_TABLE = "calendar";
const EMPTY_EVENT = {
  id: null,
  client_id: "",
  clientSearch: "",
  title: "",
  description: "",
  start: null,
  end: null,
  duration: 1,
  calendar: "unscheduledEvents",
  job_request_id: null,
};

function normalizeEvent(row) {
  const start = row.start ? new Date(row.start) : null;
  const end = row.end ? new Date(row.end) : null;
  const durationHours = start && end ? (end - start) / (60 * 60 * 1000) : 1;
  return {
    id: row.id,
    client_id: row.client_id ?? row.clientId ?? null,
    title: row.title ?? "",
    description: row.description ?? "",
    calendar: row.calendar,
    start,
    end,
    duration: Number.isFinite(durationHours) && durationHours > 0 ? durationHours : 1,
    job_request_id: row.jobRequestId ?? row.job_request_id ?? null,
  };
}

function formatDateTimeLocal(date) {
  if (!date) return "";
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function CalendarContainer({ toggleSidebar, collapsed }) {
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const [unscheduledEvents, setUnscheduledEvents] = useState([]);
  const [workerSchedule, setWorkerSchedule] = useState([]);
  const [clients, setClients] = useState([]);
  const [jobRequests, setJobRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(Views.MONTH);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [jobSearch, setJobSearch] = useState("");
  const eventIdRef = useRef(1000);

  const { user, loading: authLoading } = useAuth();

  const getToken = useCallback(async () => {
    if (!user) {
      throw new Error("No authenticated user found.");
    }
    return user.getIdToken();
  }, [user]);

  const authorizedFetch = useCallback(
    async (url, options = {}) => {
      const token = await getToken();
      const merged = {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      };
      return fetch(url, merged);
    },
    [getToken]
  );

  const loadCalendarData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await authorizedFetch("/api/manager/events");
      if (!response.ok) {
        throw new Error("Failed to load calendar events.");
      }
      const data = await response.json();
      setScheduledEvents((data[0] || []).map(normalizeEvent));
      setUnscheduledEvents((data[1] || []).map(normalizeEvent));
      setWorkerSchedule((data[2] || []).map(normalizeEvent));
      setClients(data[3] || []);
      eventIdRef.current = data[4] || 1000;
      setJobRequests(data[5] || []);
    } catch (e) {
      console.error(e);
      setError("Failed to load calendar data.");
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch, user]);

  useEffect(() => {
    if (authLoading) return;
    loadCalendarData();
  }, [authLoading, loadCalendarData]);

  const allScheduledLikeEvents = useMemo(
    () => [...scheduledEvents, ...workerSchedule],
    [scheduledEvents, workerSchedule]
  );
  const clientOptions = useMemo(
    () =>
      (clients || []).map((client) => ({
        id: String(client[0]),
        name: `${client[1] || ""} ${client[2] || ""}`.trim() || `Client #${client[0]}`,
      })),
    [clients]
  );
  const clientNameById = useMemo(
    () =>
      clientOptions.reduce((acc, client) => {
        acc[client.id] = client.name;
        return acc;
      }, {}),
    [clientOptions]
  );
  const unscheduledMatches = jobSearch.trim().toLowerCase();
  const filteredUnscheduledEvents = useMemo(() => {
    if (!unscheduledMatches) return unscheduledEvents;
    return unscheduledEvents.filter((event) => {
      const clientName = clientNameById[String(event.client_id ?? "")] || "";
      return [event.title, clientName, event.description]
        .some((value) => String(value || "").toLowerCase().includes(unscheduledMatches));
    });
  }, [clientNameById, jobSearch, unscheduledEvents]);

  const getClientName = useCallback(
    (clientId) => clientNameById[String(clientId ?? "")] || "",
    [clientNameById]
  );
  const decorateEvent = useCallback(
    (event) => ({
      ...event,
      clientName: getClientName(event.client_id),
      clientSearch: getClientName(event.client_id),
    }),
    [getClientName]
  );
  const allScheduledLikeEventsWithClients = useMemo(
    () => allScheduledLikeEvents.map(decorateEvent),
    [allScheduledLikeEvents, decorateEvent]
  );
  const filteredUnscheduledWithClients = useMemo(
    () => filteredUnscheduledEvents.map(decorateEvent),
    [decorateEvent, filteredUnscheduledEvents]
  );

  const getCalendarSetter = (calendarName) => {
    if (calendarName === "scheduledEvents") return setScheduledEvents;
    if (calendarName === "unscheduledEvents") return setUnscheduledEvents;
    return setWorkerSchedule;
  };
  const buildEventDraft = useCallback(
    (overrides = {}) => ({
      ...EMPTY_EVENT,
      id: eventIdRef.current++,
      ...overrides,
    }),
    []
  );
  const persistEvent = useCallback(
    async (eventToSave) => {
      const payload = {
        id: eventToSave.id,
        calendar: eventToSave.calendar,
        title: eventToSave.title,
        description: eventToSave.description ?? "",
        client_id: eventToSave.client_id ?? null,
        start: eventToSave.start ? new Date(eventToSave.start).toISOString() : null,
        end: eventToSave.end ? new Date(eventToSave.end).toISOString() : null,
        job_request_id: eventToSave.job_request_id ?? null,
      };

      const response = await authorizedFetch("/api/manager/calendar/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to save event.");
      }
      const value = await response.json();
      if (value !== "true") {
        throw new Error("Backend rejected event save.");
      }
    },
    [authorizedFetch]
  );

  const removeEvent = async (eventToDelete) => {
    setError("");
    try {
      const response = await authorizedFetch("/api/manager/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([CALENDAR_TABLE, eventToDelete.id]),
      });
      if (!response.ok) {
        throw new Error("Failed to delete event.");
      }
      const setter = getCalendarSetter(eventToDelete.calendar);
      setter((prev) => prev.filter((e) => e.id !== eventToDelete.id));
      setSelectedEvent(null);
    } catch (e) {
      console.error(e);
      setError("Failed to delete event.");
    }
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = "#6c757d";
    if (event.calendar === "unscheduledEvents") backgroundColor = "#ffffff";
    if (event.calendar === "scheduledEvents") backgroundColor = "#28a745";
    if (event.calendar === "workerSchedule") backgroundColor = "#2f4fdb";
    return {
      style: {
        backgroundColor,
        color: event.calendar === "unscheduledEvents" ? "#000" : "#fff",
      },
    };
  };

  const onEventChange = async ({ event, start, end }) => {
    const updated = { ...event, start: new Date(start), end: new Date(end) };
    const setter = getCalendarSetter(event.calendar);
    setter((prev) => prev.map((evt) => (evt.id === event.id ? updated : evt)));
    try {
      await persistEvent(updated);
    } catch (e) {
      console.error(e);
      setError("Failed to update event.");
      loadCalendarData();
    }
  };

  const handleDropFromOutside = useCallback(
    async ({ start }) => {
      if (!draggedEvent) return;

      const startDate = new Date(start);
      const duration = draggedEvent.duration ?? 1;
      const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
      const moved = {
        ...draggedEvent,
        calendar: "scheduledEvents",
        start: startDate,
        end: endDate,
      };

      setUnscheduledEvents((prev) => prev.filter((evt) => evt.id !== draggedEvent.id));
      setScheduledEvents((prev) => [...prev.filter((evt) => evt.id !== moved.id), moved]);
      setDraggedEvent(null);

      try {
        await persistEvent(moved);
      } catch (e) {
        console.error(e);
        setError("Failed to move event.");
        loadCalendarData();
      }
    },
    [draggedEvent, loadCalendarData, persistEvent]
  );

  const handleNewUnscheduledEvent = () => {
    setSelectedEvent(buildEventDraft());
  };

  const handleSaveChanges = async () => {
    if (!selectedEvent) return;
    if (!selectedEvent.title.trim()) {
      setError("Event title is required.");
      return;
    }
    const setter = getCalendarSetter(selectedEvent.calendar);
    const nextEvent = {
      ...selectedEvent,
      client_id: selectedEvent.client_id || null,
      title: selectedEvent.title.trim(),
      description: selectedEvent.description?.trim() || "",
    };
    if (nextEvent.calendar === "unscheduledEvents") {
      nextEvent.start = null;
      nextEvent.end = null;
    }
    if (nextEvent.start && !nextEvent.end) {
      nextEvent.end = new Date(nextEvent.start.getTime() + (nextEvent.duration || 1) * 60 * 60 * 1000);
    }

    setter((prev) => {
      const exists = prev.some((evt) => evt.id === nextEvent.id);
      if (exists) {
        return prev.map((evt) => (evt.id === nextEvent.id ? nextEvent : evt));
      }
      return [...prev, nextEvent];
    });

    try {
      await persistEvent(nextEvent);
      setSelectedEvent(null);
    } catch (e) {
      console.error(e);
      setError("Failed to save event.");
      loadCalendarData();
    }
  };
  const handleEventCalendarChange = (calendarName) => {
    setSelectedEvent((prev) => {
      if (!prev) return prev;
      if (calendarName === "unscheduledEvents") {
        return { ...prev, calendar: calendarName, start: null, end: null };
      }
      const start = prev.start || new Date(currentDate);
      const duration = prev.duration || 1;
      return {
        ...prev,
        calendar: calendarName,
        start,
        end: prev.end || new Date(start.getTime() + duration * 60 * 60 * 1000),
      };
    });
  };
  const handleClientSelection = (inputValue) => {
    setSelectedEvent((prev) => {
      if (!prev) return prev;
      const foundClient = clientOptions.find((client) => client.name === inputValue);
      return {
        ...prev,
        clientSearch: inputValue,
        client_id: foundClient ? foundClient.id : "",
      };
    });
  };
  const handleDuplicateSelectedEvent = () => {
    if (!selectedEvent) return;
    const duplicate = buildEventDraft({
      clientSearch: getClientName(selectedEvent.client_id),
      title: selectedEvent.title,
      description: selectedEvent.description,
      client_id: selectedEvent.client_id,
      duration: selectedEvent.duration || 1,
      calendar: "unscheduledEvents",
      start: null,
      end: null,
      job_request_id: selectedEvent.job_request_id ?? null,
    });
    setUnscheduledEvents((prev) => [duplicate, ...prev]);
    setSelectedEvent(duplicate);
  };

  if (loading) return <Spinner className="m-5" />;

  return (
    <div className="calendar-page">
      <Helmet>
        <title>Calendar</title>
      </Helmet>
      <div className="calendar-layout">
        <aside className="calendar-drop-bar">
          <h2>
            Unscheduled <Button onClick={handleNewUnscheduledEvent}>+</Button>
          </h2>
          <input
            className="calendar-sidebar-search"
            type="text"
            value={jobSearch}
            onChange={(e) => setJobSearch(e.target.value)}
            placeholder="Search jobs or clients"
          />
          <div className="calendar-sidebar-actions">
            <Button className="calendar-button" onClick={handleNewUnscheduledEvent}>
              New Job
            </Button>
          </div>
          {!filteredUnscheduledWithClients.length ? (
            <p className="noJob">No Jobs to Schedule</p>
          ) : (
            filteredUnscheduledWithClients.map((item) => (
              <DraggableEvent
                key={item.id}
                event={item}
                onDragStart={(event) => setDraggedEvent(event)}
                onClick={() => setSelectedEvent(item)}
              />
            ))
          )}
          {error ? <p className="noJob">{error}</p> : null}
        </aside>

        <section className="calendar-main-panel">
          <div className="top-bar">
            <div className={`top-bar-button ${collapsed ? "collapsed" : ""}`} onClick={toggleSidebar}>
              <HamburgerMenu collapsed={collapsed} />
            </div>
            <Button className="calendar-button" onClick={handleNewUnscheduledEvent}>
              New Job
            </Button>
          </div>

          <DnDCalendar
            className="my-custom-calendar"
            localizer={localizer}
            events={allScheduledLikeEventsWithClients}
            eventPropGetter={eventStyleGetter}
            date={currentDate}
            view={currentView}
            onNavigate={setCurrentDate}
            onView={setCurrentView}
            defaultView={Views.MONTH}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            step={15}
            timeslots={4}
            selectable
            resizable
            dragFromOutsideItem={() => draggedEvent}
            onDragOver={(dragEvent) => dragEvent.preventDefault()}
            onDropFromOutside={handleDropFromOutside}
            onSelectSlot={({ start, end }) => {
              const slotStart = new Date(start);
              const slotEnd = end ? new Date(end) : new Date(slotStart.getTime() + 60 * 60 * 1000);
              const duration = Math.max(0.25, (slotEnd - slotStart) / (60 * 60 * 1000));
              setCurrentDate(slotStart);
              setSelectedEvent(
                buildEventDraft({
                  calendar: "scheduledEvents",
                  start: slotStart,
                  end: slotEnd,
                  duration,
                })
              );
            }}
            onEventDrop={onEventChange}
            onEventResize={onEventChange}
            onSelectEvent={(event) => setSelectedEvent({ ...event })}
            startAccessor="start"
            endAccessor="end"
            components={{
              event: (props) => <CustomEvent {...props} onDoubleClick={setSelectedEvent} />,
            }}
          />
        </section>
      </div>

      {selectedEvent && (
        <div className="calendar-modal-backdrop" onClick={() => setSelectedEvent(null)}>
          <div className="calendar-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Event</h2>
            <label>
              Title:
              <input
                type="text"
                value={selectedEvent.title}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}
              />
            </label>
            <label>
              Client:
              <input
                type="text"
                list="calendar-client-options"
                value={selectedEvent.clientSearch ?? getClientName(selectedEvent.client_id)}
                onChange={(e) => handleClientSelection(e.target.value)}
                placeholder="Type to search clients..."
              />
            </label>
            <datalist id="calendar-client-options">
              {clientOptions.map((client) => (
                <option key={client.id} value={client.name} />
              ))}
            </datalist>
            <label>
              Linked Job Request:
              <select
                value={selectedEvent.job_request_id ?? ""}
                onChange={(e) =>
                  setSelectedEvent({ ...selectedEvent, job_request_id: e.target.value || null })
                }
              >
                <option value="">— None —</option>
                {jobRequests
                  .filter((jr) => !selectedEvent.client_id || String(jr.clientId) === String(selectedEvent.client_id))
                  .map((jr) => (
                    <option key={jr.id} value={jr.id}>
                      #{jr.id} — {jr.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Calendar:
              <select
                value={selectedEvent.calendar}
                onChange={(e) => handleEventCalendarChange(e.target.value)}
              >
                <option value="unscheduledEvents">Unscheduled</option>
                <option value="scheduledEvents">Scheduled</option>
                <option value="workerSchedule">Worker Schedule</option>
              </select>
            </label>
            <label>
              Description:
              <textarea
                rows="3"
                value={selectedEvent.description}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, description: e.target.value })}
              />
            </label>
            {selectedEvent.calendar !== "unscheduledEvents" ? (
              <label>
                Start:
                <input
                  type="datetime-local"
                  value={selectedEvent.start ? formatDateTimeLocal(selectedEvent.start) : ""}
                  onChange={(e) =>
                    setSelectedEvent({
                      ...selectedEvent,
                      start: e.target.value ? new Date(e.target.value) : null,
                    })
                  }
                />
              </label>
            ) : null}
            <label>
              Duration (hours):
              <input
                type="number"
                min="0.25"
                step="0.25"
                value={selectedEvent.duration || 1}
                onChange={(e) => {
                  const duration = Number(e.target.value) || 1;
                  setSelectedEvent((prev) => ({
                    ...prev,
                    duration,
                    end: prev.start ? new Date(prev.start.getTime() + duration * 60 * 60 * 1000) : prev.end,
                  }));
                }}
              />
            </label>
            {selectedEvent.calendar !== "unscheduledEvents" ? (
              <label>
                End:
                <input
                  type="datetime-local"
                  value={selectedEvent.end ? formatDateTimeLocal(selectedEvent.end) : ""}
                  onChange={(e) => {
                    const end = e.target.value ? new Date(e.target.value) : null;
                    setSelectedEvent((prev) => ({
                      ...prev,
                      end,
                      duration: prev.start && end ? (end - prev.start) / (60 * 60 * 1000) : prev.duration,
                    }));
                  }}
                />
              </label>
            ) : null}
            {selectedEvent.client_id ? (
              <div className="calendar-modal-hint">
                Linked client: {getClientName(selectedEvent.client_id)}
              </div>
            ) : null}
            <div className="calendar-modal-buttons">
              <Button className="delete-button" onClick={() => removeEvent(selectedEvent)}>
                Delete
              </Button>
              <Button className="calendar-button" onClick={handleDuplicateSelectedEvent}>
                Duplicate
              </Button>
              <Button className="cancel-button" onClick={() => setSelectedEvent(null)}>
                Cancel
              </Button>
              <Button className="calendar-button" onClick={handleSaveChanges}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
