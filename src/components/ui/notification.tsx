"use client";

import { useEffect, useState } from "react";
import { X, Check, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type NotificationType = "success" | "error" | "info" | "warning";

interface ToastConfig {
  id: string;
  title: string;
  description?: string;
  type: NotificationType;
  duration?: number;
}

export function useNotification() {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  const notify = (config: Omit<ToastConfig, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const duration = config.duration ?? 4000;

    setToasts((prev) => [...prev, { ...config, id }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (title: string, description?: string) =>
    notify({ title, description, type: "success" });
  const error = (title: string, description?: string) =>
    notify({ title, description, type: "error" });
  const info = (title: string, description?: string) =>
    notify({ title, description, type: "info" });
  const warning = (title: string, description?: string) =>
    notify({ title, description, type: "warning" });

  return {
    toasts,
    notify,
    dismiss,
    success,
    error,
    info,
    warning,
  };
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastConfig;
  onDismiss: () => void;
}) {
  const [isLeaving, setIsLeaving] = useState(false);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onDismiss, 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <Check className="w-5 h-5" />;
      case "error":
        return <AlertCircle className="w-5 h-5" />;
      case "warning":
        return <AlertCircle className="w-5 h-5" />;
      case "info":
        return <Info className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    const isDark = document.documentElement.classList.contains("dark");
    switch (toast.type) {
      case "success":
        return {
          bg: isDark ? "bg-green-950" : "bg-green-50",
          border: isDark ? "border-green-800" : "border-green-200",
          icon: isDark ? "text-green-400" : "text-green-600",
          title: isDark ? "text-green-100" : "text-green-900",
          desc: isDark ? "text-green-200" : "text-green-700",
        };
      case "error":
        return {
          bg: isDark ? "bg-red-950" : "bg-red-50",
          border: isDark ? "border-red-800" : "border-red-200",
          icon: isDark ? "text-red-400" : "text-red-600",
          title: isDark ? "text-red-100" : "text-red-900",
          desc: isDark ? "text-red-200" : "text-red-700",
        };
      case "warning":
        return {
          bg: isDark ? "bg-yellow-950" : "bg-yellow-50",
          border: isDark ? "border-yellow-800" : "border-yellow-200",
          icon: isDark ? "text-yellow-400" : "text-yellow-600",
          title: isDark ? "text-yellow-100" : "text-yellow-900",
          desc: isDark ? "text-yellow-200" : "text-yellow-700",
        };
      case "info":
        return {
          bg: isDark ? "bg-blue-950" : "bg-blue-50",
          border: isDark ? "border-blue-800" : "border-blue-200",
          icon: isDark ? "text-blue-400" : "text-blue-600",
          title: isDark ? "text-blue-100" : "text-blue-900",
          desc: isDark ? "text-blue-200" : "text-blue-700",
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm transition-all duration-300",
        colors.bg,
        colors.border,
        isLeaving && "opacity-0 translate-x-full",
      )}
    >
      <div className={cn("flex-shrink-0 mt-0.5", colors.icon)}>{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium text-sm", colors.title)}>{toast.title}</p>
        {toast.description && (
          <p className={cn("text-xs mt-1", colors.desc)}>{toast.description}</p>
        )}
      </div>
      <button
        onClick={handleClose}
        className={cn(
          "flex-shrink-0 mt-0.5 hover:opacity-70 transition-opacity",
          colors.icon,
        )}
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function NotificationContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastConfig[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={() => onDismiss(toast.id)} />
        </div>
      ))}
    </div>
  );
}
