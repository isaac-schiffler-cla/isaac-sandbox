import { useState, useCallback } from "react";
import Game from "./components/Game";
import AdvancedStatsPage from "./components/AdvancedStatsPage";
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
  const [view, setView] = useState("home");

  const handleSessionComplete = useCallback(
    (results) => {
      const recordedAt = new Date();

      // Single pass over results to collect all per-session stats
      let greenCount = 0,
        redCount = 0,
        yellowCount = 0,
        falsePositives = 0;
      const reactionTimes = [];
      for (const r of results) {
        if (r.type === "green") {
          greenCount++;
          if (r.reactionTime != null) reactionTimes.push(r.reactionTime);
        } else {
          redCount++;
        }
        if (r.hadYellow) yellowCount++;
        if (r.falsePositive) falsePositives++;
      }

      const session = {
        date: recordedAt.toISOString(),
        localTime: {
          hour: recordedAt.getHours(),
          day: recordedAt.getDay(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timezoneOffsetMinutes: recordedAt.getTimezoneOffset(),
        },
        rounds: results.length,
        greenCount,
        redCount,
        yellowCount,
        falsePositives,
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
    <div className={`app ${view === "advanced" ? "app-wide" : ""}`.trim()}>
      <header className="app-header">
        <h1>⚡ Reaction Tester</h1>
        <p className="tagline">How fast are your reflexes?</p>
      </header>

      {playing ? (
        <Game onSessionComplete={handleSessionComplete} />
      ) : view === "advanced" ? (
        <AdvancedStatsPage stats={stats} onBack={() => setView("home")} />
      ) : (
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
            <button
              className="btn-secondary"
              onClick={() => setView("advanced")}
            >
              Open Detailed Stats
            </button>
          )}

          {stats.sessions.length > 0 && (
            <button className="btn-danger" onClick={clearStats}>
              Clear Stats
            </button>
          )}
        </div>
      )}
    </div>
  );
}
