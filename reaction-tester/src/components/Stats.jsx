import { useMemo, useState } from "react";

const SESSION_LIMIT_OPTIONS = [
  { value: "all", label: "All sessions" },
  { value: "10", label: "Last 10" },
  { value: "20", label: "Last 20" },
  { value: "50", label: "Last 50" },
];

const TIME_OF_DAY_OPTIONS = [
  { value: "all", label: "Any time" },
  { value: "overnight", label: "Overnight (12am–6am)" },
  { value: "morning", label: "Morning (6am–12pm)" },
  { value: "afternoon", label: "Afternoon (12pm–6pm)" },
  { value: "evening", label: "Evening (6pm–12am)" },
];

function isWithinTimeOfDay(hour, filter) {
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

function getRecordedSessionHour(session) {
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

function isSessionWithinTimeOfDay(session, filter) {
  if (filter === "all") {
    return true;
  }

  const recordedHour = getRecordedSessionHour(session);
  if (recordedHour == null) {
    return false;
  }

  return isWithinTimeOfDay(recordedHour, filter);
}

export default function Stats({ stats }) {
  const [sessionLimit, setSessionLimit] = useState("all");
  const [weeksBack, setWeeksBack] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("all");
  const [referenceNow] = useState(() => Date.now());

  const sessions = useMemo(() => stats?.sessions ?? [], [stats]);

  const normalizedWeeksBack = Number.parseInt(weeksBack, 10);
  const hasWeekFilter =
    Number.isFinite(normalizedWeeksBack) && normalizedWeeksBack > 0;

  const filteredSessions = useMemo(() => {
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

    return limitedSessions.filter((session) => {
      const sessionDate = new Date(session.date);
      if (Number.isNaN(sessionDate.getTime())) {
        return false;
      }

      if (cutoff !== null && sessionDate.getTime() < cutoff) {
        return false;
      }

      return isSessionWithinTimeOfDay(session, timeOfDay);
    });
  }, [
    hasWeekFilter,
    normalizedWeeksBack,
    referenceNow,
    sessionLimit,
    sessions,
    timeOfDay,
  ]);

  const {
    allReactions,
    totalGreen,
    totalRed,
    totalFalsePositives,
    totalYellowFake,
    totalRounds,
  } = filteredSessions.reduce(
    (acc, session) => ({
      allReactions: acc.allReactions.concat(session.reactionTimes),
      totalGreen: acc.totalGreen + session.greenCount,
      totalRed: acc.totalRed + session.redCount,
      totalFalsePositives: acc.totalFalsePositives + session.falsePositives,
      totalYellowFake: acc.totalYellowFake + (session.yellowCount || 0),
      totalRounds: acc.totalRounds + session.rounds,
    }),
    {
      allReactions: [],
      totalGreen: 0,
      totalRed: 0,
      totalFalsePositives: 0,
      totalYellowFake: 0,
      totalRounds: 0,
    },
  );

  const avg =
    allReactions.length > 0
      ? Math.round(
          allReactions.reduce((a, b) => a + b, 0) / allReactions.length,
        )
      : 0;
  const best = allReactions.length > 0 ? Math.min(...allReactions) : 0;
  const worst = allReactions.length > 0 ? Math.max(...allReactions) : 0;
  const falsePositiveRate =
    totalRed > 0 ? Math.round((totalFalsePositives / totalRed) * 100) : 0;

  const filtersSummary = [
    sessionLimit === "all" ? "all sessions" : `last ${sessionLimit} sessions`,
    hasWeekFilter
      ? `last ${normalizedWeeksBack} week${normalizedWeeksBack === 1 ? "" : "s"}`
      : "all weeks",
    TIME_OF_DAY_OPTIONS.find((option) => option.value === timeOfDay)?.label ??
      "Any time",
  ].join(" • ");

  return (
    <div className="stats-panel">
      {sessions.length === 0 ? (
        <>
          <h2>Lifetime Stats</h2>
          <p className="no-stats">No data yet — play a round to get started!</p>
        </>
      ) : (
        <>
          <div className="stats-header">
            <div>
              <h2>Stats</h2>
              <p className="stats-summary">
                Showing {filteredSessions.length} of {sessions.length} sessions
                • {filtersSummary}
              </p>
            </div>
          </div>

          <div className="stats-filters" aria-label="Stats filters">
            <label className="filter-group">
              <span className="filter-label">Session range</span>
              <select
                className="filter-control"
                value={sessionLimit}
                onChange={(event) => setSessionLimit(event.target.value)}
              >
                {SESSION_LIMIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-group">
              <span className="filter-label">Last X weeks</span>
              <input
                className="filter-control"
                type="number"
                min="1"
                max="520"
                inputMode="numeric"
                placeholder="All"
                value={weeksBack}
                onChange={(event) => setWeeksBack(event.target.value)}
              />
            </label>

            <label className="filter-group">
              <span className="filter-label">Time of day</span>
              <select
                className="filter-control"
                value={timeOfDay}
                onChange={(event) => setTimeOfDay(event.target.value)}
              >
                {TIME_OF_DAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filteredSessions.length === 0 ? (
            <p className="no-stats">No sessions match the current filters.</p>
          ) : (
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{filteredSessions.length}</span>
                <span className="stat-label">Sessions</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{totalRounds}</span>
                <span className="stat-label">Total Rounds</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{totalGreen}</span>
                <span className="stat-label">
                  Green <span className="emoji">🟢</span>
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{totalRed}</span>
                <span className="stat-label">
                  Red <span className="emoji">🔴</span>
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{totalYellowFake}</span>
                <span className="stat-label">
                  Yellow Fakeouts <span className="emoji">🟡</span>
                </span>
              </div>
              <div className="stat-card warn">
                <span className="stat-value">{falsePositiveRate}%</span>
                <span className="stat-label">False Positive Rate</span>
              </div>
              <div className="stat-card accent">
                <span className="stat-value">{avg} ms</span>
                <span className="stat-label">Avg Reaction</span>
              </div>
              <div className="stat-card accent">
                <span className="stat-value">{best} ms</span>
                <span className="stat-label">Best</span>
              </div>
              <div className="stat-card accent">
                <span className="stat-value">{worst} ms</span>
                <span className="stat-label">Worst</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
