export default function SessionResults({ results, onPlayAgain }) {
  const greens = results.filter((r) => r.type === "green");
  const falsePositives = results.filter((r) => r.falsePositive);
  const reactionTimes = greens
    .filter((r) => r.reactionTime != null)
    .map((r) => r.reactionTime);
  const avg =
    reactionTimes.length > 0
      ? Math.round(
          reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length,
        )
      : null;

  return (
    <div className="session-results">
      <h2>Session Complete!</h2>

      <div className="results-summary">
        {avg != null && (
          <div className="big-stat">
            <span className="big-number">{avg}</span>
            <span className="big-label">ms avg reaction</span>
          </div>
        )}
      </div>

      <table className="results-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Color</th>
            <th>Yellow?</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr
              key={i}
              className={
                r.falsePositive
                  ? "row-bad"
                  : r.type === "green"
                    ? "row-good"
                    : "row-neutral"
              }
            >
              <td>{i + 1}</td>
              <td>
                <span className={`dot dot-${r.type}`} />
                {r.type}
              </td>
              <td>{r.hadYellow ? "🟡 Yes" : "—"}</td>
              <td>
                {r.falsePositive
                  ? "❌ False positive"
                  : r.type === "green" && r.reactionTime != null
                    ? `${r.reactionTime} ms`
                    : r.type === "red"
                      ? "✓ Avoided"
                      : "Too slow (>2s)"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="fp-summary">
        False positives: <strong>{falsePositives.length}</strong> /{" "}
        {results.filter((r) => r.type === "red").length} red rounds
      </p>

      <button className="btn-primary" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  );
}
