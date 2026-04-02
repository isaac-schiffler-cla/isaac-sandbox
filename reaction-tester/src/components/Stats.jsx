export default function Stats({ stats }) {
  if (!stats || stats.sessions.length === 0) {
    return (
      <div className="stats-panel">
        <h2>Lifetime Stats</h2>
        <p className="no-stats">No data yet — play a round to get started!</p>
      </div>
    );
  }

  const { allReactions, totalGreen, totalRed, totalFalsePositives, totalYellowFake, totalRounds } =
    stats.sessions.reduce(
      (acc, s) => ({
        allReactions: acc.allReactions.concat(s.reactionTimes),
        totalGreen: acc.totalGreen + s.greenCount,
        totalRed: acc.totalRed + s.redCount,
        totalFalsePositives: acc.totalFalsePositives + s.falsePositives,
        totalYellowFake: acc.totalYellowFake + (s.yellowCount || 0),
        totalRounds: acc.totalRounds + s.rounds,
      }),
      { allReactions: [], totalGreen: 0, totalRed: 0, totalFalsePositives: 0, totalYellowFake: 0, totalRounds: 0 },
    );

  const avg =
    allReactions.length > 0
      ? Math.round(
          allReactions.reduce((a, b) => a + b, 0) / allReactions.length,
        )
      : 0;
  const best = allReactions.length > 0 ? Math.min(...allReactions) : 0;
  const worst = allReactions.length > 0 ? Math.max(...allReactions) : 0;

  return (
    <div className="stats-panel">
      <h2>Lifetime Stats</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.sessions.length}</span>
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
          <span className="stat-value">{totalFalsePositives}</span>
          <span className="stat-label">False Positives</span>
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
    </div>
  );
}
