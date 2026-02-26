"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatUTCDateInTimeZone } from "@/lib/timezone";

export interface ScheduledPublication {
  scheduledAt: string;
  timezone: string;
}

export interface TimeLeft {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface UseScheduledPublicationOptions {
  publication: ScheduledPublication | null;
  autoTrigger?: boolean;
  onReady?: () => void | Promise<void>;
}

interface UseScheduledPublicationResult {
  timeLeft: TimeLeft;
  isReady: boolean;
  formattedCountdown: string;
  scheduledInTargetTimezone: string | null;
  scheduledInUTC: string | null;
}

const ZERO_TIME_LEFT: TimeLeft = {
  totalMs: 0,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

function toTimeLeft(diffMs: number): TimeLeft {
  const safeDiff = Math.max(0, diffMs);
  return {
    totalMs: safeDiff,
    days: Math.floor(safeDiff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((safeDiff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((safeDiff / (1000 * 60)) % 60),
    seconds: Math.floor((safeDiff / 1000) % 60),
  };
}

function getTargetMs(scheduledAt?: string): number | null {
  if (!scheduledAt) return null;
  const ms = Date.parse(scheduledAt);
  return Number.isNaN(ms) ? null : ms;
}

export function useScheduledPublication(
  options: UseScheduledPublicationOptions,
): UseScheduledPublicationResult {
  const { publication, autoTrigger = true, onReady } = options;
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const readyTriggeredForRef = useRef<string | null>(null);

  const targetMs = useMemo(
    () => getTargetMs(publication?.scheduledAt),
    [publication?.scheduledAt],
  );

  const timeLeft = useMemo<TimeLeft>(() => {
    if (targetMs === null) return ZERO_TIME_LEFT;
    return toTimeLeft(targetMs - nowMs);
  }, [targetMs, nowMs]);

  const isReady = targetMs !== null ? nowMs >= targetMs : false;

  const formattedCountdown = useMemo(
    () =>
      `Publication dans ${timeLeft.days}j ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`,
    [timeLeft.days, timeLeft.hours, timeLeft.minutes, timeLeft.seconds],
  );

  useEffect(() => {
    if (!publication?.scheduledAt) {
      setNowMs(Date.now());
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tick = () => setNowMs(Date.now());
    tick();

    const delayToNextSecond = 1000 - (Date.now() % 1000);
    timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 1000);
    }, delayToNextSecond);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [publication?.scheduledAt]);

  useEffect(() => {
    if (!publication?.scheduledAt || !autoTrigger || !isReady || !onReady) return;
    if (readyTriggeredForRef.current === publication.scheduledAt) return;

    readyTriggeredForRef.current = publication.scheduledAt;
    void Promise.resolve(onReady()).catch((error) => {
      console.error("Auto publication trigger failed:", error);
    });
  }, [autoTrigger, isReady, onReady, publication?.scheduledAt]);

  useEffect(() => {
    if (!publication?.scheduledAt) {
      readyTriggeredForRef.current = null;
      return;
    }

    if (readyTriggeredForRef.current !== publication.scheduledAt) {
      readyTriggeredForRef.current = null;
    }
  }, [publication?.scheduledAt]);

  const scheduledInTargetTimezone =
    publication?.scheduledAt && publication?.timezone
      ? formatUTCDateInTimeZone(publication.scheduledAt, publication.timezone, true)
      : null;

  const scheduledInUTC = publication?.scheduledAt
    ? formatUTCDateInTimeZone(publication.scheduledAt, "UTC", true)
    : null;

  return {
    timeLeft,
    isReady,
    formattedCountdown,
    scheduledInTargetTimezone,
    scheduledInUTC,
  };
}
