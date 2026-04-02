import { useState, useCallback } from "react";
import Game from "./components/Game";
import Stats from "./components/Stats";
import { useLocalStorage } from "./hooks/useLocalStorage";
import "./App.css";

const EMPTY_STATS = { sessions: [] };

export default function App() {
  const [stats, setStats] = useLocalStorage(
    "reaction-tester-stats",
    EMPTY_STATS,
  );
  const [playing, setPlaying] = useState(false);

  const handleSessionComplete = useCallback(
    (results) => {
      const reactionTimes = results
        .filter((r) => r.type === "green" && r.reactionTime != null)
        .map((r) => r.reactionTime);

      const session = {
        date: new Date().toISOString(),
        rounds: results.length,
        greenCount: results.filter((r) => r.type === "green").length,
        redCount: results.filter((r) => r.type === "red").length,
        yellowCount: results.filter((r) => r.hadYellow).length,
        falsePositives: results.filter((r) => r.falsePositive).length,
        reactionTimes,
        avgReaction:
          reactionTimes.length > 0
            ? Math.round(
                reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length,
              )
            : null,
      };

      setStats((prev) => ({
        ...prev,
        sessions: [...prev.sessions, session],
      }));

      setPlaying(false);
    },
    [setStats],
  );

  const clearStats = () => {
    if (window.confirm("Clear all saved stats? This cannot be undone.")) {
      setStats(EMPTY_STATS);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>⚡ Reaction Tester</h1>
        <p className="tagline">How fast are your reflexes?</p>
      </header>

      {!playing ? (
        <div className="home-screen">
          <div className="rules">
            <h3>How it works</h3>
            <ul>
              <li>
                You get <strong>10 rounds</strong> per session.
              </li>
              <li>After a countdown the box changes color.</li>
              <li>
                <span className="dot dot-green" /> <strong>Green</strong> →
                click as fast as you can!
              </li>
              <li>
                <span className="dot dot-red" /> <strong>Red</strong> → do NOT
                click (false positive).
              </li>
              <li>
                <span className="dot dot-yellow" /> Sometimes a{" "}
                <strong>yellow</strong> fakeout appears first — wait for the
                final color.
              </li>
            </ul>
          </div>

          <button
            className="btn-primary btn-start"
            onClick={() => setPlaying(true)}
          >
            Start Game
          </button>

          <Stats stats={stats} />

          {stats.sessions.length > 0 && (
            <button className="btn-danger" onClick={clearStats}>
              Clear Stats
            </button>
          )}
        </div>
      ) : (
        <Game onSessionComplete={handleSessionComplete} />
      )}
    </div>
  );
}
