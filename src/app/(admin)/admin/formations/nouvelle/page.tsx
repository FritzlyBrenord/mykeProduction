"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Upload, BookOpen, Video } from "lucide-react";
import { useCreateFormation } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { generateSlug } from "@/lib/utils";
import {
  convertLocalDateToUTC,
  convertUTCToLocalDateString,
} from "@/lib/timezone";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function NouvelleFormationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createMutation = useCreateFormation();

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    content: "",
    price: 0,
    is_free: false,
    format: "video",
    level: "debutant",
    language: "fr",
    duration_hours: 0,
    certificate: false,
    category_id: "",
    status: "draft",
    scheduled_publish_at: null as string | null,
    scheduled_timezone: "Europe/Paris",
  });

  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0);

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: generateSlug(title),
    }));
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnail(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const uploadImageWithProgress = (file: File) =>
    new Promise<{ url: string }>((resolve, reject) => {
      const fd = new FormData();
      fd.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/admin/formations/upload-image");

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const pct = Math.round((event.loaded / event.total) * 100);
        setThumbnailUploadProgress(pct);
      };

      xhr.onload = () => {
        try {
          const payload = JSON.parse(xhr.responseText || "{}");
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(payload);
            return;
          }
          reject(new Error(payload?.error || "Image upload failed"));
        } catch {
          reject(new Error("Image upload failed"));
        }
      };

      xhr.onerror = () => reject(new Error("Image upload failed"));
      xhr.send(fd);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let thumbnailUrl: string | null = null;
    if (thumbnail) {
      try {
        setIsUploadingThumbnail(true);
        setThumbnailUploadProgress(0);
        const payload = await uploadImageWithProgress(thumbnail);
        thumbnailUrl = payload.url || null;
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error?.message || "Echec de l'upload de l'image.",
          variant: "destructive",
        });
        return;
      } finally {
        setIsUploadingThumbnail(false);
        setThumbnailUploadProgress(0);
      }
    }

    createMutation.mutate(
      {
        ...formData,
        category_id: formData.category_id || null,
        thumbnail_url: thumbnailUrl,
      },
      {
        onSuccess: (result) => {
          router.push(`/admin/formations/${result.id}/modifier`);
        },
      },
    );
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Link href="/admin/formations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Nouvelle formation
          </h1>
          <p className="text-[var(--muted)] mt-1">
            Créez une nouvelle formation
          </p>
        </div>
        <Button
          type="submit"
          form="formation-create-form"
          disabled={createMutation.isPending || isUploadingThumbnail}
          className="gap-2"
        >
          {createMutation.isPending || isUploadingThumbnail ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isUploadingThumbnail
            ? `Upload image ${thumbnailUploadProgress}%...`
            : "Creer la formation"}
        </Button>
      </motion.div>

      <form
        id="formation-create-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Main Content */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Informations de base
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Titre de la formation"
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="slug-de-la-formation"
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Description courte
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Description courte de la formation (max 500 caractères)"
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Contenu (pour formations texte)
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Contenu de la formation..."
                  rows={10}
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Thumbnail */}
          <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Image de couverture
            </h2>

            <div className="flex items-center gap-6">
              <div className="w-40 h-24 bg-[var(--background)] border-2 border-dashed border-[var(--border)] rounded-xl flex items-center justify-center overflow-hidden">
                {thumbnailPreview ? (
                  <img
                    src={thumbnailPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="w-8 h-8 text-[var(--muted)]" />
                )}
              </div>
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl cursor-pointer hover:bg-[var(--card)] transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Choisir une image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-[var(--muted)] mt-2">
                  JPG, PNG ou WebP. Max 10MB.
                </p>
                {isUploadingThumbnail ? (
                  <div className="mt-3 w-full max-w-xs">
                    <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden border border-[var(--border)]">
                      <div
                        className="h-full bg-[var(--primary)] transition-all"
                        style={{ width: `${thumbnailUploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      {thumbnailUploadProgress}%
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sidebar */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Pricing */}
          <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Tarification
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_free"
                  checked={formData.is_free}
                  onChange={(e) =>
                    setFormData({ ...formData, is_free: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <label
                  htmlFor="is_free"
                  className="text-sm text-[var(--foreground)]"
                >
                  Formation gratuite
                </label>
              </div>

              {!formData.is_free && (
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Prix (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Settings */}
          <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Paramètres
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, format: "video" })
                    }
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
                      formData.format === "video"
                        ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                        : "bg-[var(--background)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--card)]"
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    Vidéo
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, format: "text" })}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
                      formData.format === "text"
                        ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                        : "bg-[var(--background)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--card)]"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Texte
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Niveau
                </label>
                <select
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({ ...formData, level: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="debutant">Débutant</option>
                  <option value="intermediaire">Intermédiaire</option>
                  <option value="avance">Avancé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Langue
                </label>
                <select
                  value={formData.language}
                  onChange={(e) =>
                    setFormData({ ...formData, language: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                  <option value="es">Espagnol</option>
                  <option value="de">Allemand</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Durée estimée (heures)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.duration_hours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration_hours: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="certificate"
                  checked={formData.certificate}
                  onChange={(e) =>
                    setFormData({ ...formData, certificate: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <label
                  htmlFor="certificate"
                  className="text-sm text-[var(--foreground)]"
                >
                  Attribuer un certificat
                </label>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)] space-y-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Statut
            </h2>

            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
              <option value="scheduled">Planifiée</option>
              <option value="archived">Archivé</option>
            </select>

            {/* Scheduling Section */}
            {formData.status === "scheduled" && (
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 space-y-4">
                <h3 className="font-semibold text-blue-900">
                  📅 Planifier la publication
                </h3>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Date et heure (heure locale de ton timezone)
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    value={
                      formData.scheduled_publish_at
                        ? formData.scheduled_publish_at.slice(0, 16)
                        : ""
                    }
                    onChange={(e) => {
                      const dateStr = e.target.value;
                      const isoDate = dateStr
                        ? convertLocalDateToUTC(
                            dateStr,
                            formData.scheduled_timezone,
                          )
                        : null;
                      setFormData({
                        ...formData,
                        scheduled_publish_at: isoDate,
                      });
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tu saisis: heure locale ({formData.scheduled_timezone})
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fuseau horaire
                  </label>
                  <select
                    value={formData.scheduled_timezone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scheduled_timezone: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="UTC">UTC (GMT)</option>
                    <option value="America/Port-au-Prince">
                      Haiti (GMT-5/-4) ⭐
                    </option>
                    <option value="Europe/Paris">
                      Europe/Paris (GMT+1/+2)
                    </option>
                    <option value="Europe/London">
                      Europe/London (GMT+0/+1)
                    </option>
                    <option value="Europe/Berlin">
                      Europe/Berlin (GMT+1/+2)
                    </option>
                    <option value="Europe/Madrid">
                      Europe/Madrid (GMT+1/+2)
                    </option>
                    <option value="America/New_York">
                      America/New_York (EST/EDT)
                    </option>
                    <option value="America/Chicago">
                      America/Chicago (CST/CDT)
                    </option>
                    <option value="America/Los_Angeles">
                      America/Los_Angeles (PST/PDT)
                    </option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
                    <option value="Asia/Bangkok">Asia/Bangkok (ICT)</option>
                    <option value="Australia/Sydney">
                      Australia/Sydney (AEDT/AEST)
                    </option>
                  </select>
                </div>

                {formData.scheduled_publish_at && (
                  <div className="bg-blue-100 p-2 rounded text-sm text-blue-900">
                    ⏰ Publication prévue le{" "}
                    {new Date(formData.scheduled_publish_at).toLocaleString(
                      "fr-FR",
                    )}{" "}
                    ({formData.scheduled_timezone})
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </form>
    </motion.div>
  );
}
