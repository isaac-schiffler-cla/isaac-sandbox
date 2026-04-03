import { useState, useRef, useCallback, useEffect } from "react";
import Countdown from "./Countdown";
import SessionResults from "./SessionResults";

const TOTAL_ROUNDS = 10;
const YELLOW_CHANCE = 0.25;
const YELLOW_DELAY_MIN = 250;
const YELLOW_DELAY_MAX = 750;
const GREEN_CHANCE = 0.5; // 50 % green, 50 % red among final colors
const MAX_REACTION_MS = 2000; // auto-advance after 2 s

/*
  Round lifecycle (phase):
    countdown → waiting → yellow? → color → result → (next round or session end)
*/

function getBoxClass(phase, color) {
  if (phase === "yellow") return "game-box box-yellow";
  if (phase === "color" && color === "green") return "game-box box-green";
  if (phase === "color" && color === "red") return "game-box box-red";
  return "game-box box-idle";
}

export default function Game({ onSessionComplete }) {
  const [round, setRound] = useState(0); // 0-indexed current round
  const [phase, setPhase] = useState("countdown"); // countdown | waiting | yellow | color | result
  const [color, setColor] = useState(null); // 'green' | 'red'
  const [resultText, setResultText] = useState("");
  const [results, setResults] = useState([]);
  const [sessionDone, setSessionDone] = useState(false);

  const startTimeRef = useRef(null);
  const timeoutRef = useRef(null);
  const hadYellowRef = useRef(false);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  /* ---------- helpers ---------- */

  const clearPending = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const recordResult = useCallback((entry) => {
    setResults((prev) => {
      const next = [...prev, entry];
      if (next.length === TOTAL_ROUNDS) {
        // session done — defer so state flushes
        setTimeout(() => setSessionDone(true), 0);
      }
      return next;
    });
  }, []);

  const advanceRound = useCallback(() => {
    clearPending();
    if (round + 1 >= TOTAL_ROUNDS) return; // results screen coming
    setRound((r) => r + 1);
    setPhase("countdown");
    setColor(null);
    hadYellowRef.current = false;
    setResultText("");
  }, [round]);

  function showFinalColor(yellowShown) {
    const c = Math.random() < GREEN_CHANCE ? "green" : "red";
    setColor(c);
    setPhase("color");
    startTimeRef.current = performance.now();

    // Auto-advance if user doesn't click within MAX_REACTION_MS
    timeoutRef.current = setTimeout(() => {
      const isGreen = c === "green";
      recordResult({
        type: c,
        reactionTime: null,
        falsePositive: false,
        hadYellow: yellowShown,
      });
      setResultText(
        isGreen ? "Too slow! (>2 s)" : "Nice — you resisted the red!",
      );
      setPhase("result");
      timeoutRef.current = setTimeout(advanceRound, 1500);
    }, MAX_REACTION_MS);
  }

  /* ---------- countdown finished → pick path ---------- */

  function onCountdownComplete() {
    const willYellow = Math.random() < YELLOW_CHANCE;
    if (willYellow) {
      hadYellowRef.current = true;
      setPhase("yellow");
      const delay =
        YELLOW_DELAY_MIN +
        Math.random() * (YELLOW_DELAY_MAX - YELLOW_DELAY_MIN);
      timeoutRef.current = setTimeout(() => {
        showFinalColor(true);
      }, delay);
    } else {
      hadYellowRef.current = false;
      showFinalColor(false);
    }
  }

  /* ---------- click on the color box ---------- */

  const handleBoxClick = () => {
    if (phase === "yellow") {
      // Clicked during yellow → false positive (yellow doesn't count as valid)
      clearPending();
      recordResult({
        type: "red",
        reactionTime: null,
        falsePositive: true,
        hadYellow: true,
      });
      setResultText("Too early! Yellow isn't green 🟡");
      setPhase("result");
      timeoutRef.current = setTimeout(advanceRound, 1500);
      return;
    }

    if (phase !== "color" || !color) return;
    clearPending();

    const elapsed = Math.round(performance.now() - startTimeRef.current);

    if (color === "green") {
      recordResult({
        type: "green",
        reactionTime: elapsed,
        falsePositive: false,
        hadYellow: hadYellowRef.current,
      });
      setResultText(`${elapsed} ms — nice!`);
    } else {
      recordResult({
        type: "red",
        reactionTime: null,
        falsePositive: true,
        hadYellow: hadYellowRef.current,
      });
      setResultText("False positive! That was red 🔴");
    }

    setPhase("result");
    timeoutRef.current = setTimeout(advanceRound, 1500);
  };

  /* ---------- session done ---------- */

  if (sessionDone) {
    return (
      <SessionResults
        results={results}
        onPlayAgain={() => {
          onSessionComplete(results);
        }}
      />
    );
  }

  /* ---------- render ---------- */

  const boxClass = getBoxClass(phase, color);

  return (
    <div className="game-container">
      <div className="round-indicator">
        Round {round + 1} / {TOTAL_ROUNDS}
      </div>

      {phase === "countdown" && (
        <Countdown from={3} onComplete={onCountdownComplete} />
      )}

      {(phase === "yellow" || phase === "color" || phase === "result") && (
        <div
          className={boxClass}
          onClick={phase !== "result" ? handleBoxClick : undefined}
          role="button"
          tabIndex={0}
        >
          {phase === "yellow" && <span className="box-label">Wait…</span>}
          {phase === "color" && color === "green" && (
            <span className="box-label">CLICK!</span>
          )}
          {phase === "color" && color === "red" && (
            <span className="box-label">DON'T CLICK!</span>
          )}
          {phase === "result" && (
            <span className="box-label result-label">{resultText}</span>
          )}
        </div>
      )}

      {phase === "countdown" && (
        <p className="hint">
          Click the box when it turns <strong>green</strong>. Resist if it's{" "}
          <strong>red</strong>!
        </p>
      )}
    </div>
  );
}
