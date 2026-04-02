import { useState, useEffect } from "react";

export default function Countdown({ from = 3, onComplete }) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="countdown">
      <div className="countdown-number">{count}</div>
      <p>Get ready…</p>
    </div>
  );
}
