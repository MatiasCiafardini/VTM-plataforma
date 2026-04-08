'use client';

import { useMemo, useState } from 'react';

type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  externalSource?: string | null;
};

const hourSlots = Array.from({ length: 12 }, (_, index) => index + 9);

function getWeekStart(baseDate: Date) {
  const date = new Date(baseDate);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
  }).format(date);
}

function formatTimeLabel(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function getEventLayout(event: CalendarEvent, weekDays: Date[]) {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 60 * 60 * 1000);
  const dayIndex = weekDays.findIndex(
    (day) =>
      day.getFullYear() === start.getFullYear() &&
      day.getMonth() === start.getMonth() &&
      day.getDate() === start.getDate(),
  );

  if (dayIndex === -1) {
    return null;
  }

  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const calendarStartMinutes = hourSlots[0] * 60;
  const calendarEndMinutes = (hourSlots[hourSlots.length - 1] + 1) * 60;

  const top = ((startMinutes - calendarStartMinutes) / 60) * 34;
  const height = (Math.max(endMinutes, startMinutes + 30) - startMinutes) / 60 * 34;

  if (endMinutes < calendarStartMinutes || startMinutes > calendarEndMinutes) {
    return null;
  }

  return {
    dayIndex,
    top: Math.max(0, top),
    height: Math.max(44, height),
    startLabel: new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(start),
    endLabel: new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(end),
  };
}

export function StudentWeekCalendar({
  events,
}: {
  events: CalendarEvent[];
}) {
  const baseDate = useMemo(
    () => (events.length > 0 ? new Date(events[0].startsAt) : new Date()),
    [events],
  );
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => {
    const start = getWeekStart(baseDate);
    start.setDate(start.getDate() + weekOffset * 7);
    return start;
  }, [baseDate, weekOffset]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        return date;
      }),
    [weekStart],
  );
  const visibleEvents = useMemo(
    () =>
      events.filter((event) =>
        weekDays.some((day) => {
          const start = new Date(event.startsAt);
          return (
            day.getFullYear() === start.getFullYear() &&
            day.getMonth() === start.getMonth() &&
            day.getDate() === start.getDate()
          );
        }),
      ),
    [events, weekDays],
  );
  const weekRangeLabel = `${new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
  }).format(weekDays[0])} - ${new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
  }).format(weekDays[6])}`;

  return (
    <section className="student-calendar-shell">
      <article className="student-week-calendar">
        <div className="student-week-calendar-toolbar">
          <button type="button" onClick={() => setWeekOffset((current) => current - 1)}>
            ←
          </button>
          <strong>{weekRangeLabel}</strong>
          <button type="button" onClick={() => setWeekOffset((current) => current + 1)}>
            →
          </button>
        </div>

        <div className="student-week-calendar-header">
          <div className="student-week-calendar-corner" />
          {weekDays.map((day) => (
            <div className="student-week-calendar-day" key={day.toISOString()}>
              {formatDayLabel(day)}
            </div>
          ))}
        </div>

        <div className="student-week-calendar-body">
          <div className="student-week-calendar-hours">
            {hourSlots.map((hour) => (
              <div className="student-week-calendar-hour" key={hour}>
                {formatTimeLabel(hour)}
              </div>
            ))}
          </div>

          <div className="student-week-calendar-grid">
            {weekDays.map((day) => (
              <div className="student-week-calendar-column" key={day.toISOString()}>
                {hourSlots.map((hour) => (
                  <div className="student-week-calendar-cell" key={`${day.toISOString()}-${hour}`} />
                ))}
              </div>
            ))}

            {visibleEvents.map((event) => {
              const layout = getEventLayout(event, weekDays);
              if (!layout) {
                return null;
              }

              return (
                <div
                  className="student-week-calendar-event"
                  key={event.id}
                  style={{
                    left: `calc(${layout.dayIndex} * (100% / 7) + 8px)`,
                    top: `${layout.top + 8}px`,
                    width: 'calc((100% / 7) - 16px)',
                    height: `${layout.height}px`,
                  }}
                >
                  <strong>{event.title}</strong>
                  <span>
                    {layout.startLabel} - {layout.endLabel}
                  </span>
                  {event.externalSource ? <small>{event.externalSource}</small> : null}
                </div>
              );
            })}
          </div>
        </div>
      </article>
    </section>
  );
}
