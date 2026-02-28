"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoUpload } from "@/components/admin/VideoUpload";
import { Video } from "@/types";

interface VideoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (video: Partial<Video>) => Promise<void>;
  video?: Video;
  isLoading?: boolean;
}

export function VideoFormModal({
  isOpen,
  onClose,
  onSubmit,
  video,
  isLoading = false,
}: VideoFormModalProps) {
  const [formData, setFormData] = useState<Partial<Video>>({
    title: "",
    slug: "",
    video_url: "",
    video_type: "upload",
    thumbnail_url: null,
    access_type: "public",
    price: 0,
    status: "draft",
    category_id: null,
    playlist_id: null,
  });

  useEffect(() => {
    if (video) {
      setFormData(video);
    } else {
      setFormData({
        title: "",
        slug: "",
        video_url: "",
        video_type: "upload",
        thumbnail_url: null,
        access_type: "public",
        price: 0,
        status: "draft",
        category_id: null,
        playlist_id: null,
      });
    }
  }, [video, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === "number" ? parseFloat(value) || 0 : value;

    let updatedData = {
      ...formData,
      [name]: newValue,
    };

    // Auto-generate slug from title
    if (name === "title") {
      const slug = value
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      updatedData.slug = slug;
    }

    setFormData(updatedData);
  };

  const handleSlugGeneration = () => {
    if (formData.title) {
      const slug = formData.title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      setFormData({ ...formData, slug });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title?.trim()) {
      alert("Le titre est obligatoire");
      return;
    }
    if (!formData.slug?.trim()) {
      alert("Le slug est obligatoire");
      return;
    }
    if (!formData.video_url?.trim()) {
      alert("Veuillez ajouter une vidéo");
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const isEditMode = !!video;
  const modalTitle = isEditMode ? "Modifier la vidéo" : "Ajouter une vidéo";

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
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                <h2 className="text-2xl font-bold text-[var(--foreground)]">
                  {modalTitle}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[var(--input)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Section 1: Titre */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-[var(--foreground)] text-sm">
                    Informations générales
                  </h3>

                  {/* Titre */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Titre *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title || ""}
                      onChange={handleChange}
                      placeholder="Ex: Introduction à la chimie organique"
                      className="w-full px-4 py-2 bg-[var(--input)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      required
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Slug
                      <span className="text-xs text-[var(--muted)] font-normal ml-1">
                        (Auto-généré)
                      </span>
                    </label>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug || ""}
                      onChange={handleChange}
                      placeholder="auto-genere-depuis-titre"
                      className="w-full px-4 py-2 bg-[var(--input)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      required
                    />
                    <p className="text-xs text-[var(--muted)] mt-1">
                      Généré automatiquement depuis le titre. Modifiable si
                      nécessaire.
                    </p>
                  </div>
                </div>

                {/* Section 2: Vidéo */}
                <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                  <h3 className="font-semibold text-[var(--foreground)] text-sm">
                    Contenu vidéo
                  </h3>

                  {/* Type vidéo */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Type vidéo *
                    </label>
                    <select
                      name="video_type"
                      value={formData.video_type || "upload"}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-[var(--input)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                      <option value="upload">Upload fichier</option>
                      <option value="youtube">YouTube</option>
                      <option value="vimeo">Vimeo</option>
                    </select>
                  </div>

                  {/* Vidéo */}
                  <VideoUpload
                    videoType={
                      formData.video_type as "upload" | "youtube" | "vimeo"
                    }
                    onVideoUrlChange={(url) =>
                      setFormData({ ...formData, video_url: url })
                    }
                    onThumbnailChange={(thumbnailUrl) =>
                      setFormData({ ...formData, thumbnail_url: thumbnailUrl })
                    }
                    currentUrl={formData.video_url}
                    currentThumbnail={formData.thumbnail_url}
                  />
                </div>

                {/* Section 3: Accès et Prix */}
                <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                  <h3 className="font-semibold text-[var(--foreground)] text-sm">
                    Accès et tarification
                  </h3>

                  {/* Type d'accès */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Type d'accès
                    </label>
                    <select
                      name="access_type"
                      value={formData.access_type || "public"}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-[var(--input)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                      <option value="public">Public (gratuit)</option>
                      <option value="members">Membres uniquement</option>
                      <option value="paid">Payant</option>
                    </select>
                  </div>

                  {/* Prix */}
                  {formData.access_type === "paid" && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        Prix (EUR)
                      </label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price || 0}
                        onChange={handleChange}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-2 bg-[var(--input)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>
                  )}
                </div>

                {/* Section 4: Statut */}
                <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                  <h3 className="font-semibold text-[var(--foreground)] text-sm">
                    Publication
                  </h3>

                  {/* Statut */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Statut
                    </label>
                    <select
                      name="status"
                      value={formData.status || "draft"}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-[var(--input)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                      <option value="draft">Brouillon</option>
                      <option value="published">Publié</option>
                      <option value="archived">Archivé</option>
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading
                      ? "En cours..."
                      : isEditMode
                        ? "Mettre à jour"
                        : "Créer"}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
