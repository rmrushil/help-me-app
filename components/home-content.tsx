"use client";

import { useEffect, useRef, useState } from "react";

const sections = [
  {
    key: "welcome",
    title: "Help ME",
    subtitle: "Here to be of service to you and yours",
    bg: null,
  },
  { key: "family", title: "Family", bg: "/images/family.jpg" },
  { key: "friends", title: "Friends", bg: "/images/friends.jpg" },
  { key: "community", title: "Community", bg: "/images/community.jpg" },
];

export default function HomeContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const totalScrollable = el.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), totalScrollable);
      setProgress((scrolled / totalScrollable) * (sections.length-1));
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={containerRef} style={{ height: `${sections.length * 100}vh` }} className="relative">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        {sections.map((section, i) => {
          const local = progress - i;
          let scale = 1;
          let opacity = 0;

          if (local >= -1 && local <= 1) {
            if (local <= 0) {
              const t = 1 + local;
              scale = 0.3 + t * 0.7;
              opacity = t;
            } else {
              const t = local;
              scale = 1 + t * 1.8;
              opacity = 1 - t;
            }
          }

          return (
            <div
              key={section.key}
              className="absolute inset-0"
              style={{
                opacity,
                transform: `scale(${scale})`,
                zIndex: opacity > 0.02 ? sections.length - i + 10 : 0,
                backgroundImage: section.bg ? `url(${section.bg})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-black/55" />

              {section.key === "welcome" && (
                <div className="absolute top-6 right-6 z-20 flex gap-3">
                  <a
                    href="/auth/login"
                    className="jarvis-text text-sm border border-current rounded-full px-5 py-2 hover:bg-white/10 transition-colors"
                  >
                    Log In
                  </a>
                  <a
                    href="/auth/sign-up"
                    className="jarvis-text text-sm border border-current rounded-full px-5 py-2 hover:bg-white/10 transition-colors"
                  >
                    Sign Up
                  </a>
                </div>
              )}

              <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
                <h2 className="jarvis-text text-5xl md:text-8xl font-bold tracking-widest">
                  {section.title}
                </h2>
                {section.subtitle && (
                  <p className="jarvis-text text-lg md:text-2xl mt-4 tracking-wide">
                    {section.subtitle}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}