"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  isLoading?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  isLoading = false,
}: DeleteConfirmModalProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-xl max-w-md w-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <h2 className="text-xl font-bold text-[var(--foreground)]">
                    Confirmer la suppression
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[var(--input)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-[var(--foreground)] mb-2">
                  Êtes-vous sûr de vouloir supprimer cette vidéo ?
                </p>
                <p className="text-sm text-[var(--muted)] font-medium">
                  "{title}"
                </p>
                <p className="text-sm text-[var(--muted)] mt-4">
                  Cette action est irréversible. La vidéo sera supprimée de
                  votre vidéothèque.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-6 border-t border-[var(--border)]">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Suppression..." : "Supprimer"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
