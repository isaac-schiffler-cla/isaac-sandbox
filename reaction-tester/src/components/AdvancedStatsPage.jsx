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

const TIME_SEGMENTS = [
  { key: "overnight", label: "Overnight", range: "12am–6am" },
  { key: "morning", label: "Morning", range: "6am–12pm" },
  { key: "afternoon", label: "Afternoon", range: "12pm–6pm" },
  { key: "evening", label: "Evening", range: "6pm–12am" },
];

const DISTRIBUTION_BUCKETS = [
  { key: "lt250", label: "<250 ms", min: 0, max: 249 },
  { key: "250s", label: "250–299", min: 250, max: 299 },
  { key: "300s", label: "300–349", min: 300, max: 349 },
  { key: "350s", label: "350–399", min: 350, max: 399 },
  { key: "400s", label: "400–499", min: 400, max: 499 },
  { key: "500p", label: "500+", min: 500, max: Infinity },
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

function sortNumbers(values) {
  return [...values].sort((a, b) => a - b);
}

function average(values) {
  if (values.length === 0) return null;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = sortNumbers(values);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function percentile(values, percentileValue) {
  if (values.length === 0) return null;
  const sorted = sortNumbers(values);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );
  return sorted[index];
}

function trimmedMean(values, trimFraction = 0.1) {
  if (values.length === 0) return null;
  const sorted = sortNumbers(values);
  const trimCount = Math.floor(sorted.length * trimFraction);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  const valuesToUse = trimmed.length > 0 ? trimmed : sorted;
  return average(valuesToUse);
}

function standardDeviation(values) {
  if (values.length <= 1) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.round(Math.sqrt(variance));
}

function getIqrSummary(values) {
  if (values.length < 4) {
    return {
      lowerBound: null,
      upperBound: null,
      outliers: [],
      filteredValues: values,
    };
  }

  const q1 = percentile(values, 25);
  const q3 = percentile(values, 75);
  const iqr = q3 - q1;
  const lowerBound = Math.round(q1 - 1.5 * iqr);
  const upperBound = Math.round(q3 + 1.5 * iqr);
  const outliers = values.filter(
    (value) => value < lowerBound || value > upperBound,
  );
  const filteredValues = values.filter(
    (value) => value >= lowerBound && value <= upperBound,
  );

  return {
    lowerBound,
    upperBound,
    outliers,
    filteredValues,
  };
}

function formatMs(value) {
  return value == null ? "—" : `${value} ms`;
}

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildTrendPolyline(points, accessor, width, height, padding) {
  const values = points.map(accessor).filter((value) => value != null);
  if (values.length === 0) return "";

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const xStep =
    points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const range = Math.max(1, maxValue - minValue);

  return points
    .map((point, index) => {
      const value = accessor(point);
      if (value == null) return null;
      const x = padding + index * xStep;
      const y =
        height -
        padding -
        ((value - minValue) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");
}

function getSessionMetrics(session) {
  const reactions = Array.isArray(session.reactionTimes)
    ? session.reactionTimes
    : [];
  const avgReaction = average(reactions);
  const medianReaction = median(reactions);
  const bestReaction = reactions.length > 0 ? Math.min(...reactions) : null;
  const worstReaction = reactions.length > 0 ? Math.max(...reactions) : null;
  const falsePositiveRate =
    session.redCount > 0
      ? (session.falsePositives / session.redCount) * 100
      : 0;

  return {
    session,
    reactions,
    avgReaction,
    medianReaction,
    bestReaction,
    worstReaction,
    p90Reaction: percentile(reactions, 90),
    stdDeviation: standardDeviation(reactions),
    falsePositiveRate,
  };
}

function TrendChart({ points }) {
  const width = 720;
  const height = 220;
  const padding = 24;
  const avgPolyline = buildTrendPolyline(
    points,
    (point) => point.avgReaction,
    width,
    height,
    padding,
  );
  const medianPolyline = buildTrendPolyline(
    points,
    (point) => point.medianReaction,
    width,
    height,
    padding,
  );

  if (points.length === 0) {
    return <p className="no-stats">Not enough data for a trend chart yet.</p>;
  }

  const values = points.flatMap((point) =>
    [point.avgReaction, point.medianReaction].filter((value) => value != null),
  );
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 0;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3>Reaction trend</h3>
          <p>Average vs median by session over time.</p>
        </div>
        <div className="chart-legend">
          <span>
            <i className="legend-swatch avg" />
            Average
          </span>
          <span>
            <i className="legend-swatch median" />
            Median
          </span>
        </div>
      </div>

      <svg
        className="trend-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Reaction trend chart"
      >
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          className="chart-axis"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          className="chart-axis"
        />
        {avgPolyline && (
          <polyline
            fill="none"
            points={avgPolyline}
            className="chart-line avg"
          />
        )}
        {medianPolyline && (
          <polyline
            fill="none"
            points={medianPolyline}
            className="chart-line median"
          />
        )}
      </svg>

      <div className="chart-footer">
        <span>{formatMs(minValue)}</span>
        <span>
          {points.length} session{points.length === 1 ? "" : "s"}
        </span>
        <span>{formatMs(maxValue)}</span>
      </div>
    </div>
  );
}

function DistributionChart({ buckets, total }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3>Reaction distribution</h3>
          <p>Where your reaction times cluster most often.</p>
        </div>
      </div>

      <div className="distribution-list">
        {buckets.map((bucket) => {
          const share = total > 0 ? (bucket.count / total) * 100 : 0;
          return (
            <div className="distribution-row" key={bucket.key}>
              <span className="distribution-label">{bucket.label}</span>
              <div className="distribution-bar-track">
                <div
                  className="distribution-bar-fill"
                  style={{ width: `${share}%` }}
                />
              </div>
              <span className="distribution-value">{bucket.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdvancedStatsPage({ stats, onBack }) {
  const [sessionLimit, setSessionLimit] = useState("all");
  const [weeksBack, setWeeksBack] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("all");
  const [referenceNow] = useState(() => Date.now());

  const sessions = useMemo(() => stats?.sessions ?? [], [stats]);
  const normalizedWeeksBack = Number.parseInt(weeksBack, 10);
  const hasWeekFilter =
    Number.isFinite(normalizedWeeksBack) && normalizedWeeksBack > 0;

  const { baseSessions, filteredSessions } = useMemo(() => {
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

    const rangeFiltered = limitedSessions.filter((session) => {
      const sessionDate = new Date(session.date);
      if (Number.isNaN(sessionDate.getTime())) {
        return false;
      }

      return cutoff === null || sessionDate.getTime() >= cutoff;
    });

    return {
      baseSessions: rangeFiltered,
      filteredSessions: rangeFiltered.filter((session) => {
        if (timeOfDay === "all") {
          return true;
        }

        const hour = getRecordedSessionHour(session);
        return hour != null && isWithinTimeOfDay(hour, timeOfDay);
      }),
    };
  }, [
    hasWeekFilter,
    normalizedWeeksBack,
    referenceNow,
    sessionLimit,
    sessions,
    timeOfDay,
  ]);

  const sessionMetrics = useMemo(
    () => filteredSessions.map((session) => getSessionMetrics(session)),
    [filteredSessions],
  );

  const allReactions = useMemo(
    () => sessionMetrics.flatMap((entry) => entry.reactions),
    [sessionMetrics],
  );

  const overall = useMemo(() => {
    const totalRounds = filteredSessions.reduce(
      (sum, session) => sum + (session.rounds || 0),
      0,
    );
    const totalGreen = filteredSessions.reduce(
      (sum, session) => sum + (session.greenCount || 0),
      0,
    );
    const totalRed = filteredSessions.reduce(
      (sum, session) => sum + (session.redCount || 0),
      0,
    );
    const totalYellow = filteredSessions.reduce(
      (sum, session) => sum + (session.yellowCount || 0),
      0,
    );
    const totalFalsePositives = filteredSessions.reduce(
      (sum, session) => sum + (session.falsePositives || 0),
      0,
    );

    const iqrSummary = getIqrSummary(allReactions);

    return {
      totalRounds,
      totalGreen,
      totalRed,
      totalYellow,
      totalFalsePositives,
      avgReaction: average(allReactions),
      medianReaction: median(allReactions),
      trimmedReaction: trimmedMean(allReactions, 0.1),
      bestReaction: allReactions.length > 0 ? Math.min(...allReactions) : null,
      worstReaction: allReactions.length > 0 ? Math.max(...allReactions) : null,
      p90Reaction: percentile(allReactions, 90),
      stdDeviation: standardDeviation(allReactions),
      falsePositiveRate:
        totalRed > 0 ? (totalFalsePositives / totalRed) * 100 : 0,
      avgWithoutOutliers: average(iqrSummary.filteredValues),
      outlierCount: iqrSummary.outliers.length,
      outlierBounds:
        iqrSummary.lowerBound != null && iqrSummary.upperBound != null
          ? `${iqrSummary.lowerBound}–${iqrSummary.upperBound} ms`
          : "Need 4+ reactions",
    };
  }, [allReactions, filteredSessions]);

  const trendPoints = useMemo(
    () => [...sessionMetrics].reverse(),
    [sessionMetrics],
  );

  const distributionBuckets = useMemo(
    () =>
      DISTRIBUTION_BUCKETS.map((bucket) => ({
        ...bucket,
        count: allReactions.filter(
          (reaction) => reaction >= bucket.min && reaction <= bucket.max,
        ).length,
      })),
    [allReactions],
  );

  const timeOfDayStats = useMemo(
    () =>
      TIME_SEGMENTS.map((segment) => {
        const sessionsInSegment = baseSessions.filter((session) => {
          const hour = getRecordedSessionHour(session);
          return hour != null && isWithinTimeOfDay(hour, segment.key);
        });
        const reactions = sessionsInSegment.flatMap(
          (session) => session.reactionTimes || [],
        );

        return {
          ...segment,
          sessionCount: sessionsInSegment.length,
          avgReaction: average(reactions),
          medianReaction: median(reactions),
        };
      }),
    [baseSessions],
  );

  const bestTimeSegment = timeOfDayStats
    .filter((segment) => segment.avgReaction != null)
    .sort((a, b) => a.avgReaction - b.avgReaction)[0];

  return (
    <div className="advanced-stats-page">
      <div className="page-toolbar">
        <button className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="advanced-page-header">
        <div>
          <p className="eyebrow">Detailed analysis</p>
          <h2>Advanced Stats</h2>
          <p className="stats-summary">
            Explore trends, outlier-resistant metrics, consistency, and
            per-session detail.
          </p>
        </div>
      </div>

      <div className="stats-panel advanced-filters-panel">
        <div className="stats-filters" aria-label="Advanced stats filters">
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
      </div>

      {filteredSessions.length === 0 ? (
        <div className="stats-panel">
          <p className="no-stats">No sessions match the current filters.</p>
        </div>
      ) : (
        <>
          <section className="advanced-overview-grid">
            <div className="stat-card accent wide-card">
              <span className="stat-value">
                {formatMs(overall.avgReaction)}
              </span>
              <span className="stat-label">Average Reaction</span>
            </div>
            <div className="stat-card accent">
              <span className="stat-value">
                {formatMs(overall.medianReaction)}
              </span>
              <span className="stat-label">Median Reaction</span>
            </div>
            <div className="stat-card accent">
              <span className="stat-value">
                {formatMs(overall.trimmedReaction)}
              </span>
              <span className="stat-label">Trimmed Mean</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {formatMs(overall.avgWithoutOutliers)}
              </span>
              <span className="stat-label">Avg w/o Outliers</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {formatMs(overall.p90Reaction)}
              </span>
              <span className="stat-label">90th Percentile</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {formatMs(overall.stdDeviation)}
              </span>
              <span className="stat-label">Std. Deviation</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {formatMs(overall.bestReaction)}
              </span>
              <span className="stat-label">Best</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {formatMs(overall.worstReaction)}
              </span>
              <span className="stat-label">Worst</span>
            </div>
            <div className="stat-card warn">
              <span className="stat-value">
                {formatPercent(overall.falsePositiveRate)}
              </span>
              <span className="stat-label">False Positive Rate</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{overall.outlierCount}</span>
              <span className="stat-label">Outlier Reactions</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{overall.totalRounds}</span>
              <span className="stat-label">Total Rounds</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{filteredSessions.length}</span>
              <span className="stat-label">Sessions</span>
            </div>
          </section>

          <section className="advanced-two-column">
            <TrendChart points={trendPoints} />
            <DistributionChart
              buckets={distributionBuckets}
              total={allReactions.length}
            />
          </section>

          <section className="advanced-insights-grid">
            <div className="stats-panel insight-card">
              <h3>Outlier handling</h3>
              <p>
                IQR bounds: <strong>{overall.outlierBounds}</strong>
              </p>
              <p>
                Median and trimmed mean help reduce the effect of unusually slow
                or fast clicks.
              </p>
            </div>
            <div className="stats-panel insight-card">
              <h3>Time-of-day insight</h3>
              <p>
                {bestTimeSegment ? (
                  <>
                    Fastest average window:{" "}
                    <strong>{bestTimeSegment.label}</strong> (
                    {formatMs(bestTimeSegment.avgReaction)})
                  </>
                ) : (
                  <>Not enough data to compare time windows yet.</>
                )}
              </p>
              <p>
                Use this to see whether you react better earlier or later in the
                day.
              </p>
            </div>
          </section>

          <section className="stats-panel">
            <div className="section-heading">
              <div>
                <h3>Time-of-day comparison</h3>
                <p className="stats-summary">
                  Based on the selected session range and week filter.
                </p>
              </div>
            </div>
            <div className="time-of-day-grid">
              {timeOfDayStats.map((segment) => (
                <div className="time-card" key={segment.key}>
                  <div className="time-card-header">
                    <h4>{segment.label}</h4>
                    <span>{segment.range}</span>
                  </div>
                  <div className="time-card-metric">
                    <span>Sessions</span>
                    <strong>{segment.sessionCount}</strong>
                  </div>
                  <div className="time-card-metric">
                    <span>Average</span>
                    <strong>{formatMs(segment.avgReaction)}</strong>
                  </div>
                  <div className="time-card-metric">
                    <span>Median</span>
                    <strong>{formatMs(segment.medianReaction)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="stats-panel table-panel">
            <div className="section-heading">
              <div>
                <h3>Session breakdown</h3>
                <p className="stats-summary">
                  Per-session details with consistency and false positive
                  behavior.
                </p>
              </div>
            </div>
            <div className="table-scroll">
              <table className="advanced-stats-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Greens</th>
                    <th>Reds</th>
                    <th>Yellow</th>
                    <th>Avg</th>
                    <th>Median</th>
                    <th>Best</th>
                    <th>Worst</th>
                    <th>P90</th>
                    <th>Std Dev</th>
                    <th>FP Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionMetrics.map((entry) => (
                    <tr key={entry.session.date}>
                      <td>{formatDate(entry.session.date)}</td>
                      <td>{entry.session.greenCount}</td>
                      <td>{entry.session.redCount}</td>
                      <td>{entry.session.yellowCount || 0}</td>
                      <td>{formatMs(entry.avgReaction)}</td>
                      <td>{formatMs(entry.medianReaction)}</td>
                      <td>{formatMs(entry.bestReaction)}</td>
                      <td>{formatMs(entry.worstReaction)}</td>
                      <td>{formatMs(entry.p90Reaction)}</td>
                      <td>{formatMs(entry.stdDeviation)}</td>
                      <td>{formatPercent(entry.falsePositiveRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
