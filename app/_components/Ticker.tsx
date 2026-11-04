"use client";

import { useEffect, useState } from "react";

export default function Ticker({ initialItems }: { initialItems: string[] }) {
  const [items, setItems] = useState<string[]>(initialItems);

  useEffect(() => {
    if (initialItems.length === 0) {
      fetch("/api/public/ticker")
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.titles) setItems(d.titles);
        }).catch(() => { });
    }
  }, [initialItems]);

  if (items.length === 0) return null;

  return (
    <div className="ticker-wrap">
      <div className="ticker">
        {items.map((item, i) => (
          <div key={i} className="ticker-item">
            <span style={{ color: "rgba(0,0,0,0.5)", marginRight: 10, fontWeight: 800 }}>•</span> {item}
          </div>
        ))}
        {/* Duplicate for seamless loop */}
        {items.map((item, i) => (
          <div key={`dup-${i}`} className="ticker-item">
            <span style={{ color: "rgba(0,0,0,0.5)", marginRight: 10, fontWeight: 800 }}>•</span> {item}
          </div>
        ))}
      </div>
    </div>
  );
}
