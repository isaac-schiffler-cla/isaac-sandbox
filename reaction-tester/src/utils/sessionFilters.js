export const SESSION_LIMIT_OPTIONS = [
  { value: "all", label: "All sessions" },
  { value: "10", label: "Last 10" },
  { value: "20", label: "Last 20" },
  { value: "50", label: "Last 50" },
];

export const TIME_OF_DAY_OPTIONS = [
  { value: "all", label: "Any time" },
  { value: "overnight", label: "Overnight (12am–6am)" },
  { value: "morning", label: "Morning (6am–12pm)" },
  { value: "afternoon", label: "Afternoon (12pm–6pm)" },
  { value: "evening", label: "Evening (6pm–12am)" },
];

export function isWithinTimeOfDay(hour, filter) {
  switch (filter) {
    case "overnight":
      return hour >= 0 && hour < 6;
    case "morning":
      return hour >= 6 && hour < 12;
    case "afternoon":
      return hour >= 12 && hour < 18;
    case "evening":
      return hour >= 18 && hour < 24;
    default:
      return true;
  }
}

export function getRecordedSessionHour(session) {
  if (
    typeof session?.localTime?.hour === "number" &&
    session.localTime.hour >= 0 &&
    session.localTime.hour < 24
  ) {
    return session.localTime.hour;
  }

  const fallbackDate = new Date(session.date);
  if (Number.isNaN(fallbackDate.getTime())) {
    return null;
  }

  return fallbackDate.getHours();
}

export function isSessionWithinTimeOfDay(session, filter) {
  if (filter === "all") return true;
  const hour = getRecordedSessionHour(session);
  return hour != null && isWithinTimeOfDay(hour, filter);
}

/**
 * Sorts, limits, and filters sessions by date range and time-of-day.
 * Returns { baseSessions, filteredSessions } where baseSessions are
 * range-filtered only (no time-of-day), and filteredSessions apply all filters.
 */
export function filterSessions(sessions, { sessionLimit, normalizedWeeksBack, hasWeekFilter, referenceNow, timeOfDay }) {
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const limitedSessions =
    sessionLimit === "all"
      ? sortedSessions
      : sortedSessions.slice(0, Number.parseInt(sessionLimit, 10));

  const cutoff = hasWeekFilter
    ? referenceNow - normalizedWeeksBack * 7 * 24 * 60 * 60 * 1000
    : null;

  const baseSessions = limitedSessions.filter((session) => {
    const sessionDate = new Date(session.date);
    if (Number.isNaN(sessionDate.getTime())) return false;
    return cutoff === null || sessionDate.getTime() >= cutoff;
  });

  const filteredSessions =
    timeOfDay === "all"
      ? baseSessions
      : baseSessions.filter((session) => isSessionWithinTimeOfDay(session, timeOfDay));

  return { baseSessions, filteredSessions };
}
