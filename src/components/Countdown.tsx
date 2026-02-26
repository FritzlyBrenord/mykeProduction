"use client";

import { useScheduledPublication } from "@/hooks/useScheduledPublication";

interface CountdownProps {
  targetDate: string | null;
  timezone: string;
  autoTrigger?: boolean;
  onReady?: () => void | Promise<void>;
}

export function Countdown({
  targetDate,
  timezone,
  autoTrigger = true,
  onReady,
}: CountdownProps) {
  const { isReady, timeLeft } = useScheduledPublication({
    publication: targetDate ? { scheduledAt: targetDate, timezone } : null,
    autoTrigger,
    onReady,
  });

  if (!targetDate) return null;

  if (isReady) {
    return (
      <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-green-50 border border-green-300 text-green-800 animate-pulse">
        <span className="text-lg">🚀</span>
        <span className="text-sm font-semibold">
          Publication automatique en cours…
        </span>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  const blocks = [
    { label: "Jours",    value: timeLeft.days },
    { label: "Heures",   value: timeLeft.hours },
    { label: "Minutes",  value: timeLeft.minutes },
    { label: "Secondes", value: timeLeft.seconds },
  ];

  return (
    <div className="mt-2">
      <p className="text-xs text-blue-600 font-medium mb-1.5">⏱ Temps restant avant publication :</p>
      <div className="flex items-center gap-1.5">
        {blocks.map((b, i) => (
          <div key={b.label} className="flex items-center gap-1.5">
            <div className="flex flex-col items-center bg-blue-700 text-white rounded-lg px-2.5 py-1.5 min-w-[44px]">
              <span className="text-lg font-bold leading-none tabular-nums">
                {pad(b.value)}
              </span>
              <span className="text-[10px] opacity-80 mt-0.5">{b.label}</span>
            </div>
            {i < blocks.length - 1 && (
              <span className="text-blue-700 font-bold text-lg">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
