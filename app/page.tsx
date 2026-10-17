"use client";

import { useEffect, useRef, useState } from "react";
import HomeContent from "@/components/home-content";

export default function Home() {
  const [greeting, setGreeting] = useState("");
  const [time, setTime] = useState("");
  const [holdProgress, setHoldProgress] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const hours = now.getHours();
      const label =
        hours < 12 ? "Good Morning" : hours < 18 ? "Good Afternoon" : "Good Evening";
      setGreeting(`${label} Sir`);
      setTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    }
    updateClock();
    const clockTimer = setInterval(updateClock, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = unlocked ? "auto" : "hidden";
  }, [unlocked]);

  function startHold() {
    if (unlocked) return;
    holdInterval.current = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          if (holdInterval.current) clearInterval(holdInterval.current);
          setUnlocked(true);
          return 100;
        }
        return prev + 100 / (1500 / 50);
      });
    }, 50);
  }

  function cancelHold() {
    if (holdInterval.current) clearInterval(holdInterval.current);
    if (!unlocked) setHoldProgress(0);
  }

  return (
    <main className="relative">
      {/* Revealed content: normal document flow, gives the page its real scrollable height */}
      <HomeContent />

      {/* Locked overlay: fixed to the viewport, covers the screen until unlocked */}
      <div className="fixed inset-0 z-10 overflow-hidden pointer-events-none">
        {/* The two sliding doors */}
        <div className="absolute inset-0 flex">
          <div
            className={`door-left relative w-1/2 h-full hud-panel ${
              unlocked ? "door-open pointer-events-none" : "pointer-events-auto"
            }`}
          >
            <span className="hud-corner hud-corner-tl" />
            <span className="hud-corner hud-corner-bl" />
          </div>
          <div
            className={`door-right relative w-1/2 h-full hud-panel ${
              unlocked ? "door-open pointer-events-none" : "pointer-events-auto"
            }`}
          >
            <span className="hud-corner hud-corner-tr" />
            <span className="hud-corner hud-corner-br" />
          </div>
        </div>

        {/* Center: greeting / ring / time */}
        <div
          className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 transition-opacity duration-200 ${
            unlocked ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
          }`}
        >
          <h2 className="jarvis-text text-3xl md:text-5xl tracking-widest absolute top-16 text-center w-full px-4">
            {greeting}
          </h2>

          <button
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            className="relative w-[210px] h-[210px]"
          >
            <div
              className="absolute inset-0 rounded-full jarvis-ring"
              style={{ "--progress": `${holdProgress}%` } as React.CSSProperties}
            />
            <div className="absolute inset-[18px] rounded-full jarvis-inner-circle flex items-center justify-center">
              <span className="jarvis-text text-xs md:text-sm tracking-wider text-center px-2">
                Hello
                <br />
                Jarvis
              </span>
            </div>
          </button>

          <p className="jarvis-text text-3xl md:text-5xl tracking-widest absolute bottom-16 text-center w-full px-4">
            {time}
          </p>
        </div>
      </div>
    </main>
  );
}