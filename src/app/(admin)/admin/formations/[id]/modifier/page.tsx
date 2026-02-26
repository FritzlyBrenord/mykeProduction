"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, BookOpen, Check, ChevronDown, ChevronRight,
  Edit, Eye, EyeOff, Layers, Loader2, Plus, Save, Settings,
  Trash2, Upload, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Countdown } from "@/components/Countdown";
import {
  convertLocalDateToUTC,
  convertUTCToLocalDateString,
  formatUTCDateInTimeZone,
} from "@/lib/timezone";

/* ─── Types ────────────────────────────────────────────────────────────── */
type VideoType = "upload" | "youtube" | "vimeo" | null;
type IntroType = "none" | "text" | "video";
type Tab = "params" | "content";

interface Lesson {
  id: string; module_id: string; title: string; content: string | null;
  video_url: string | null; video_type: VideoType; duration_min: number | null;
  is_preview: boolean; is_visible?: boolean;
}
interface ModuleItem {
  id: string; title: string; lecons: Lesson[];
  intro_type: "text" | "video" | null; intro_text: string | null;
  intro_video_url: string | null; intro_video_type: VideoType; is_visible?: boolean;
}
interface FormationDetail {
  id: string; title: string; slug: string; description: string | null;
  content: string | null; thumbnail_url: string | null; price: number;
  is_free: boolean; format: "video" | "text"; level: string; language: string;
  duration_hours: number; certificate: boolean;
  status: "draft" | "published" | "archived" | "scheduled";
  scheduled_publish_at: string | null; scheduled_timezone: string;
  published_at: string | null; category_id: string | null; author_id: string | null;
  modules: ModuleItem[];
}
interface IntroDraft {
  intro_type: IntroType; intro_text: string;
  intro_video_url: string; intro_video_type: Exclude<VideoType, null>;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const p = await res.json().catch(() => null);
    throw new Error(p?.error || "Request failed");
  }
  return res.json() as Promise<T>;
}
function yt(url: string) {
  return url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/)?.[1]
    ?? url.match(/[?&]v=([A-Za-z0-9_-]{6,})/)?.[1]
    ?? null;
}
function vm(url: string) { return url.match(/vimeo\.com\/(\d+)/)?.[1] ?? null; }
function isValidYt(url: string) { return url.trim().length > 0 && yt(url) !== null; }

function VideoPreview({ type, url }: { type: VideoType; url: string | null }) {
  if (!url) return null;
  if (type === "upload") return <video controls className="w-full rounded-xl border border-[var(--border)] bg-black" src={url} />;
  if (type === "youtube") {
    const id = yt(url);
    return id ? <iframe className="w-full aspect-video rounded-xl border border-[var(--border)]" src={`https://www.youtube.com/embed/${id}`} allowFullScreen /> : <p className="text-xs text-red-500">URL YouTube invalide</p>;
  }
  if (type === "vimeo") {
    const id = vm(url);
    return id ? <iframe className="w-full aspect-video rounded-xl border border-[var(--border)]" src={`https://player.vimeo.com/video/${id}`} allowFullScreen /> : <p className="text-xs text-red-500">URL Vimeo invalide</p>;
  }
  return null;
}

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)]";
const LABEL = "block text-sm font-medium mb-1.5 text-[var(--foreground)]";
const CARD = "bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)] space-y-4";

const TIMEZONES = [
  ["UTC","UTC (GMT+0)"],["America/Port-au-Prince","Haïti (GMT-5/-4) ⭐"],
  ["America/New_York","New York (EST/EDT)"],["America/Chicago","Chicago (CST/CDT)"],
  ["America/Los_Angeles","Los Angeles (PST/PDT)"],["Europe/Paris","Paris (GMT+1/+2)"],
  ["Europe/London","London (GMT+0/+1)"],["Europe/Berlin","Berlin (GMT+1/+2)"],
  ["Asia/Tokyo","Tokyo (JST)"],["Asia/Shanghai","Shanghai (CST)"],
  ["Australia/Sydney","Sydney (AEDT/AEST)"],
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
═══════════════════════════════════════════════════════════════════════════ */
export default function ModifierFormationPage() {
  const params = useParams();
  const id = String(params.id || "");
  const { toast } = useToast();

  /* State */
  const [formation, setFormation] = useState<FormationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("params");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonDraft, setLessonDraft] = useState<Lesson | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newLessonByModule, setNewLessonByModule] = useState<Record<string, string>>({});
  const [introDrafts, setIntroDrafts] = useState<Record<string, IntroDraft>>({});
  const [savingLesson, setSavingLesson] = useState(false);
  const [savingFormation, setSavingFormation] = useState(false);
  const [uploadingLesson, setUploadingLesson] = useState(false);
  const [uploadingLessonProgress, setUploadingLessonProgress] = useState(0);
  const [uploadingModuleIntro, setUploadingModuleIntro] = useState<string | null>(null);
  const [uploadingModuleIntroProgress, setUploadingModuleIntroProgress] = useState(0);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingThumbnailProgress, setUploadingThumbnailProgress] = useState(0);
  const publishingNowRef = useRef(false);

  const selectedLesson = useMemo(() => {
    if (!formation || !selectedLessonId) return null;
    return formation.modules.flatMap((m) => m.lecons).find((l) => l.id === selectedLessonId) || null;
  }, [formation, selectedLessonId]);

  useEffect(() => { setLessonDraft(selectedLesson ? { ...selectedLesson } : null); }, [selectedLesson]);

  /* Load */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<FormationDetail>(`/api/admin/formations/${id}`);
      setFormation(data);
      setEditingLessonId(null);
      setSelectedLessonId(null);
      setThumbnailFile(null);
      setThumbnailPreview("");
      setExpanded(data.modules.map((m) => m.id));
      const map: Record<string, IntroDraft> = {};
      data.modules.forEach((m) => {
        map[m.id] = {
          intro_type: m.intro_type || "none",
          intro_text: m.intro_text || "",
          intro_video_url: m.intro_video_url || "",
          intro_video_type: (m.intro_video_type || "youtube") as Exclude<VideoType, null>,
        };
      });
      setIntroDrafts(map);
    } catch (e: any) {
      toast({ title: "Erreur de chargement", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { if (id) load(); }, [id, load]);

  /* Upload file helper */
  const uploadFile = (file: File, endpoint: string, onProgress?: (pct: number) => void) =>
    new Promise<{ url: string }>((resolve, reject) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("formationId", id);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint);
      if (onProgress) xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        try {
          const p = JSON.parse(xhr.responseText || "{}");
          xhr.status >= 200 && xhr.status < 300 ? resolve(p) : reject(new Error(p?.error || "Upload échoué"));
        } catch { reject(new Error("Upload échoué")); }
      };
      xhr.onerror = () => reject(new Error("Upload échoué"));
      xhr.send(fd);
    });

  /* Save formation */
  const handleSaveFormation = async () => {
    if (!formation) return;
    if (!formation.title?.trim()) { toast({ title: "Erreur", description: "Le titre est obligatoire.", variant: "destructive" }); return; }
    if (!formation.slug?.trim()) { toast({ title: "Erreur", description: "Le slug est obligatoire.", variant: "destructive" }); return; }
    if (formation.status === "scheduled" && !formation.scheduled_publish_at) {
      toast({ title: "Erreur", description: "Sélectionnez une date de publication.", variant: "destructive" }); return;
    }
    try {
      setSavingFormation(true);
      let thumbnailUrl = formation.thumbnail_url;
      if (thumbnailFile) {
        setUploadingThumbnail(true);
        const { url } = await uploadFile(thumbnailFile, "/api/admin/formations/upload-image", setUploadingThumbnailProgress);
        thumbnailUrl = url;
        setThumbnailFile(null); setThumbnailPreview("");
        setUploadingThumbnail(false); setUploadingThumbnailProgress(0);
      }
      await api(`/api/admin/formations/${formation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formation.title.trim(), slug: formation.slug.trim(),
          description: formation.description || null, content: formation.content || null,
          thumbnail_url: thumbnailUrl || null, price: Number(formation.price) || 0,
          is_free: Boolean(formation.is_free), format: formation.format || "video",
          level: formation.level || "debutant", language: formation.language || "fr",
          duration_hours: Number(formation.duration_hours) || 0,
          certificate: Boolean(formation.certificate), status: formation.status || "draft",
          ...(formation.status === "scheduled" && {
            scheduled_publish_at: formation.scheduled_publish_at,
            scheduled_timezone: formation.scheduled_timezone || "UTC",
          }),
        }),
      });
      await load();
      toast({ title: "✅ Enregistré", description: "Formation mise à jour avec succès." });
    } catch (err: any) {
      toast({ title: "Erreur ❌", description: err?.message || "Erreur lors de la sauvegarde.", variant: "destructive" });
    } finally {
      setSavingFormation(false); setUploadingThumbnail(false);
    }
  };

  /* Publish now */
  const publishNow = useCallback(async (source: "manual" | "auto" = "manual") => {
    if (publishingNowRef.current) return;
    publishingNowRef.current = true;
    try {
      const res = await fetch("/api/admin/formations/publish-now", { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error((await res.json()).error || "Erreur");
      const data = await res.json() as { count?: number; published?: Array<{ id: string }> };
      await load();
      if (source === "manual") {
        toast({ title: "✅ Publication", description: data.count && data.count > 0 ? "Formation publiée." : "Date non encore atteinte." });
      } else if ((data.published || []).some((p) => p.id === id)) {
        toast({ title: "✅ Publication automatique", description: "La formation est maintenant publiée." });
      }
    } catch (e: any) {
      if (source === "manual") toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    } finally { publishingNowRef.current = false; }
  }, [id, load, toast]);

  /* Validate lesson */
  const validateLesson = (): string | null => {
    if (!lessonDraft) return "Aucune leçon sélectionnée";
    if (!lessonDraft.title.trim()) return "Le titre est obligatoire";
    if (lessonDraft.video_type === "youtube") {
      if (!lessonDraft.video_url?.trim()) return "L'URL YouTube est obligatoire";
      if (!isValidYt(lessonDraft.video_url)) return "URL YouTube invalide";
    }
    if (lessonDraft.video_type === "vimeo") {
      if (!lessonDraft.video_url?.trim()) return "L'URL Vimeo est obligatoire";
      if (!vm(lessonDraft.video_url)) return "URL Vimeo invalide";
    }
    if (lessonDraft.video_type === "upload" && !lessonDraft.video_url?.trim()) return "Veuillez uploader une vidéo";
    return null;
  };

  /* ── Loading / Not found ─────────────────────────────────────────────── */
  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--muted)]" /></div>;
  if (!formation) return <div className="text-sm text-[var(--muted)]">Formation introuvable.</div>;

  const statusLabel: Record<string, string> = { draft: "Brouillon", published: "Publié", scheduled: "Planifiée", archived: "Archivé" };
  const statusColor: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    published: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  /* ══════════════════════════════════════════════════════════════════════
     JSX
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-0">
      {/* ── Sticky Header ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[var(--background)] border-b border-[var(--border)] px-0 pb-0">
        <div className="flex items-center gap-3 px-1 pt-2 pb-3">
          <Link href="/admin/formations">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{formation.title}</h1>
              <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0", statusColor[formation.status])}>
                {statusLabel[formation.status]}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">/admin/formations/{id}/modifier</p>
          </div>
          {activeTab === "params" && (
            <Button onClick={handleSaveFormation} disabled={savingFormation || uploadingThumbnail} className="gap-2 shrink-0">
              {savingFormation || uploadingThumbnail
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
                : <><Save className="w-4 h-4" /> Enregistrer</>}
            </Button>
          )}
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 px-1">
          {([
            { key: "params" as Tab, label: "Paramètres", icon: Settings },
            { key: "content" as Tab, label: "Contenu", icon: Layers,
              badge: formation.modules.reduce((n, m) => n + m.lecons.length, 0) + formation.modules.length },
          ] as const).map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === key
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {"badge" in { badge } && typeof badge === "number" && badge > 0 && (
                <span className="bg-[var(--primary)] text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ONGLET PARAMÈTRES
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "params" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
          {/* Col principale */}
          <div className="lg:col-span-2 space-y-6">

            {/* Informations de base */}
            <div className={CARD}>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--primary)]" /> Informations de base
              </h2>
              <div>
                <label className={LABEL}>Titre <span className="text-red-500">*</span></label>
                <input type="text" className={INPUT} value={formation.title}
                  onChange={(e) => setFormation((p) => p ? { ...p, title: e.target.value } : p)} />
              </div>
              <div>
                <label className={LABEL}>Slug</label>
                <input type="text" className={INPUT} value={formation.slug}
                  onChange={(e) => setFormation((p) => p ? { ...p, slug: e.target.value } : p)} />
              </div>
              <div>
                <label className={LABEL}>Description courte</label>
                <textarea rows={3} maxLength={500} className={cn(INPUT, "resize-none")}
                  value={formation.description || ""}
                  onChange={(e) => setFormation((p) => p ? { ...p, description: e.target.value } : p)} />
                <p className="text-xs text-[var(--muted)] mt-1">{(formation.description || "").length}/500</p>
              </div>
              {formation.format === "text" && (
                <div>
                  <label className={LABEL}>Contenu (formations texte)</label>
                  <textarea rows={8} className={cn(INPUT, "resize-none")}
                    value={formation.content || ""}
                    onChange={(e) => setFormation((p) => p ? { ...p, content: e.target.value } : p)} />
                </div>
              )}
            </div>

            {/* Image de couverture */}
            <div className={CARD}>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Upload className="w-4 h-4 text-[var(--primary)]" /> Image de couverture
              </h2>
              <div className="flex items-start gap-6">
                <div className="w-40 h-28 bg-[var(--background)] border-2 border-dashed border-[var(--border)] rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : formation.thumbnail_url ? (
                    <img src={formation.thumbnail_url} alt="Current" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-8 h-8 text-[var(--muted)]" />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl cursor-pointer hover:bg-[var(--card)] transition-colors text-sm">
                    <Upload className="w-4 h-4" /> Choisir une image
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingThumbnail}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) { setThumbnailFile(f); setThumbnailPreview(URL.createObjectURL(f)); } }} />
                  </label>
                  <p className="text-xs text-[var(--muted)]">JPG, PNG ou WebP · Max 10 MB</p>
                  {thumbnailFile && !uploadingThumbnail && (
                    <p className="text-xs text-[var(--primary)] font-medium">⚠ Image non encore enregistrée — cliquez sur "Enregistrer"</p>
                  )}
                  {uploadingThumbnail && (
                    <div className="w-40">
                      <div className="h-1.5 bg-[var(--background)] rounded-full overflow-hidden border border-[var(--border)]">
                        <div className="h-full bg-[var(--primary)] transition-all" style={{ width: `${uploadingThumbnailProgress}%` }} />
                      </div>
                      <p className="text-xs text-[var(--muted)] mt-1">{uploadingThumbnailProgress}%</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tarification */}
            <div className={CARD}>
              <h2 className="text-base font-semibold">Tarification</h2>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formation.is_free}
                  onChange={(e) => setFormation((p) => p ? { ...p, is_free: e.target.checked } : p)}
                  className="w-5 h-5 rounded accent-[var(--primary)]" />
                <span className="text-sm">Formation gratuite</span>
              </label>
              {!formation.is_free && (
                <div>
                  <label className={LABEL}>Prix (USD)</label>
                  <input type="number" min="0" step="0.01" className={INPUT} value={formation.price}
                    onChange={(e) => setFormation((p) => p ? { ...p, price: parseFloat(e.target.value) } : p)} />
                </div>
              )}
            </div>

            {/* Paramètres */}
            <div className={CARD}>
              <h2 className="text-base font-semibold">Paramètres</h2>
              <div>
                <label className={LABEL}>Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {([["video","Vidéo",Video],["text","Texte",BookOpen]] as const).map(([val, label, Icon]) => (
                    <button key={val} type="button"
                      onClick={() => setFormation((p) => p ? { ...p, format: val } : p)}
                      className={cn("flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                        formation.format === val
                          ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                          : "bg-[var(--background)] border-[var(--border)] hover:bg-[var(--card)]")}>
                      <Icon className="w-4 h-4" />{label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={LABEL}>Niveau</label>
                <select className={INPUT} value={formation.level}
                  onChange={(e) => setFormation((p) => p ? { ...p, level: e.target.value } : p)}>
                  <option value="debutant">Débutant</option>
                  <option value="intermediaire">Intermédiaire</option>
                  <option value="avance">Avancé</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Langue</label>
                <select className={INPUT} value={formation.language}
                  onChange={(e) => setFormation((p) => p ? { ...p, language: e.target.value } : p)}>
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                  <option value="es">Espagnol</option>
                  <option value="de">Allemand</option>
                  <option value="ht">Créole haïtien</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Durée estimée (heures)</label>
                <input type="number" min="0" step="0.5" className={INPUT} value={formation.duration_hours}
                  onChange={(e) => setFormation((p) => p ? { ...p, duration_hours: parseFloat(e.target.value) } : p)} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formation.certificate}
                  onChange={(e) => setFormation((p) => p ? { ...p, certificate: e.target.checked } : p)}
                  className="w-5 h-5 rounded accent-[var(--primary)]" />
                <span className="text-sm">Attribuer un certificat</span>
              </label>
            </div>

            {/* Statut & Planification */}
            <div className={CARD}>
              <h2 className="text-base font-semibold">Statut</h2>
              <select className={INPUT} value={formation.status}
                onChange={(e) => {
                  const s = e.target.value as FormationDetail["status"];
                  setFormation((p) => p ? {
                    ...p, status: s,
                    scheduled_publish_at: null,
                    scheduled_timezone: s === "scheduled" ? (p.scheduled_timezone || "UTC") : "UTC",
                  } : p);
                }}>
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="scheduled">Planifiée</option>
                <option value="archived">Archivé</option>
              </select>

              {formation.status === "scheduled" && (
                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 space-y-3">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 text-sm">📅 Planifier la publication</h3>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-blue-800 dark:text-blue-300">1. Fuseau horaire</label>
                    <select className={cn(INPUT, "text-sm")} value={formation.scheduled_timezone}
                      onChange={(e) => setFormation((p) => p ? { ...p, scheduled_timezone: e.target.value } : p)}>
                      {TIMEZONES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-blue-800 dark:text-blue-300">2. Date et heure</label>
                    <input type="datetime-local" className={cn(INPUT, "text-sm")}
                      value={formation.scheduled_publish_at && formation.scheduled_timezone
                        ? convertUTCToLocalDateString(formation.scheduled_publish_at, formation.scheduled_timezone) : ""}
                      onChange={(e) => {
                        const iso = e.target.value ? convertLocalDateToUTC(e.target.value, formation.scheduled_timezone) : null;
                        setFormation((p) => p ? { ...p, scheduled_publish_at: iso } : p);
                      }} />
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">Heure dans le fuseau : <strong>{formation.scheduled_timezone}</strong></p>
                  </div>
                  {formation.scheduled_publish_at && (
                    <div className="space-y-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                      <div className="bg-white dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700 text-xs space-y-1">
                        <p className="font-semibold text-blue-900 dark:text-blue-200">Publication prévue :</p>
                        <p className="text-blue-800 dark:text-blue-300">🌍 <strong>{formation.scheduled_timezone}</strong> : {formatUTCDateInTimeZone(formation.scheduled_publish_at, formation.scheduled_timezone, true)}</p>
                        <p className="text-blue-600 dark:text-blue-400">🌐 UTC : {formatUTCDateInTimeZone(formation.scheduled_publish_at, "UTC", true)}</p>
                      </div>
                      <Countdown targetDate={formation.scheduled_publish_at} timezone={formation.scheduled_timezone} autoTrigger={false} />
                      <button type="button" onClick={() => publishNow("manual")}
                        className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
                        🚀 Publier maintenant
                      </button>
                    </div>
                  )}
                </div>
              )}

              {formation.published_at && formation.status === "published" && (
                <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-xl border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200">
                  ✅ Publié le {new Date(formation.published_at).toLocaleString("fr-FR")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ONGLET CONTENU — modules + leçons
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "content" && (
        <div className="flex gap-0 h-[calc(100vh-130px)] pt-4">
          {/* ── Sidebar modules ──────────────────────────────────────── */}
          <div className="w-72 shrink-0 flex flex-col gap-3 pr-4 overflow-y-auto">
            {/* Ajouter module */}
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 space-y-2">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Nouveau module</p>
              <input className={cn(INPUT, "text-sm")} placeholder="Titre du module"
                value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key !== "Enter" || !newModuleTitle.trim()) return;
                  try {
                    await api(`/api/admin/formations/${formation.id}/modules`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ title: newModuleTitle.trim() }),
                    });
                    setNewModuleTitle(""); await load();
                  } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
                }} />
              <Button size="sm" className="w-full gap-2" onClick={async () => {
                if (!newModuleTitle.trim()) return;
                try {
                  await api(`/api/admin/formations/${formation.id}/modules`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: newModuleTitle.trim() }),
                  });
                  setNewModuleTitle(""); await load();
                } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
              }}>
                <Plus className="w-4 h-4" /> Ajouter le module
              </Button>
            </div>

            {/* Liste modules */}
            {formation.modules.length === 0 ? (
              <div className="bg-[var(--card)] rounded-2xl border-2 border-dashed border-[var(--border)] p-8 text-center">
                <Layers className="w-8 h-8 text-[var(--muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--muted)]">Aucun module</p>
                <p className="text-xs text-[var(--muted)] mt-1">Créez votre premier module ci-dessus</p>
              </div>
            ) : (
              <div className="space-y-2">
                {formation.modules.map((m, mi) => {
                  const d = introDrafts[m.id];
                  const isOpen = expanded.includes(m.id);
                  return (
                    <div key={m.id} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
                      {/* Module header */}
                      <div className="flex items-center gap-2 px-3 py-3">
                        <button onClick={() => setExpanded((p) => isOpen ? p.filter((x) => x !== m.id) : [...p, m.id])}
                          className="text-[var(--muted)] hover:text-[var(--foreground)] shrink-0">
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <span className="text-xs text-[var(--muted)] shrink-0 w-5 text-center">{mi + 1}</span>
                        <input defaultValue={m.title}
                          onBlur={async (e) => {
                            const title = e.target.value.trim();
                            if (!title || title === m.title) return;
                            try {
                              await api(`/api/admin/formations/modules/${m.id}`, {
                                method: "PUT", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ title }),
                              });
                              await load();
                            } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
                          }}
                          className="flex-1 min-w-0 bg-transparent text-sm font-semibold focus:outline-none focus:bg-[var(--background)] focus:px-2 focus:rounded-lg transition-all" />
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={async () => {
                            try {
                              await api(`/api/admin/formations/modules/${m.id}`, {
                                method: "PUT", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ is_visible: !(m.is_visible ?? true) }),
                              });
                              await load();
                            } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
                          }} className="p-1 text-[var(--muted)] hover:text-[var(--primary)] rounded" title={m.is_visible !== false ? "Masquer" : "Afficher"}>
                            {m.is_visible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={async () => {
                            if (!confirm("Supprimer ce module et toutes ses leçons ?")) return;
                            try {
                              await api(`/api/admin/formations/modules/${m.id}`, { method: "DELETE" });
                              await load();
                            } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
                          }} className="p-1 text-red-400 hover:text-red-600 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Module expanded */}
                      {isOpen && (
                        <div className="border-t border-[var(--border)] px-3 pb-3 pt-2 space-y-3">
                          {/* Intro du module */}
                          <div className="bg-[var(--background)]/50 rounded-xl border border-[var(--border)] p-2.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-[var(--muted)] uppercase">Intro Module</span>
                              <div className="flex gap-1">
                                {(["none", "text", "video"] as const).map((t) => (
                                  <button key={t} onClick={() => setIntroDrafts((p) => ({ ...p, [m.id]: { ...d, intro_type: t } }))}
                                    className={cn("px-1.5 py-0.5 rounded text-[10px] border capitalize transition",
                                      d.intro_type === t ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--background)]")}>
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {d.intro_type === "text" && (
                              <textarea className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs resize-none"
                                rows={2} value={d.intro_text} placeholder="Texte d'introduction..."
                                onChange={(e) => setIntroDrafts((p) => ({ ...p, [m.id]: { ...d, intro_text: e.target.value } }))} />
                            )}

                            {d.intro_type === "video" && (
                              <div className="space-y-1.5">
                                <div className="grid grid-cols-2 gap-1">
                                  {(["upload", "youtube"] as const).map((t) => (
                                    <button key={t} onClick={() => setIntroDrafts((p) => ({ ...p, [m.id]: { ...d, intro_video_type: t as any } }))}
                                      className={cn("px-1.5 py-0.5 rounded text-[10px] border capitalize",
                                        d.intro_video_type === t ? "bg-[var(--primary)] text-white" : "border-[var(--border)]")}>
                                      {t === "upload" ? "⬆ Vidéo" : "▶ YouTube"}
                                    </button>
                                  ))}
                                </div>
                                {d.intro_video_type === "upload" ? (
                                  <label className="flex items-center gap-1.5 px-2 py-1 bg-[var(--background)] border border-[var(--border)] rounded-lg cursor-pointer text-[10px]">
                                    <Upload className="w-3 h-3" />
                                    {uploadingModuleIntro === m.id ? `Upload ${uploadingModuleIntroProgress}%` : d.intro_video_url ? "✅ Uploadée" : "Choisir vidéo"}
                                    <input type="file" className="hidden" accept="video/*" disabled={uploadingModuleIntro === m.id}
                                      onChange={async (e) => {
                                        const f = e.target.files?.[0]; if (!f) return;
                                        try {
                                          setUploadingModuleIntro(m.id); setUploadingModuleIntroProgress(0);
                                          const { url } = await uploadFile(f, "/api/admin/formations/upload-video", setUploadingModuleIntroProgress);
                                          setIntroDrafts((p) => ({ ...p, [m.id]: { ...d, intro_video_url: url } }));
                                        } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
                                        finally { setUploadingModuleIntro(null); }
                                      }} />
                                  </label>
                                ) : (
                                  <input className="w-full px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[10px]"
                                    value={d.intro_video_url} placeholder="URL YouTube"
                                    onChange={(e) => setIntroDrafts((p) => ({ ...p, [m.id]: { ...d, intro_video_url: e.target.value } }))} />
                                )}
                              </div>
                            )}

                            {d.intro_type !== "none" && (
                              <Button size="sm" variant="ghost" className="w-full h-7 text-[10px] font-bold py-0" onClick={async () => {
                                try {
                                  await api(`/api/admin/formations/modules/${m.id}`, {
                                    method: "PUT", headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      intro_type: d.intro_type,
                                      intro_text: d.intro_type === "text" ? d.intro_text : null,
                                      intro_video_url: d.intro_type === "video" ? d.intro_video_url : null,
                                      intro_video_type: d.intro_type === "video" ? d.intro_video_type : null,
                                    }),
                                  });
                                  toast({ title: "✅ Intro enregistrée" }); await load();
                                } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
                              }}>Save Intro</Button>
                            )}
                          </div>

                          <div className="h-px bg-[var(--border)] mx-1" />

                          {/* Leçons */}
                          {m.lecons.map((l, li) => (
                            <button key={l.id} onClick={() => setSelectedLessonId(l.id)}
                              className={cn("w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors",
                                selectedLessonId === l.id
                                  ? "bg-[var(--primary)] text-white"
                                  : "hover:bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)]")}>
                              <Video className="w-3 h-3 shrink-0" />
                              <span className="flex-1 truncate">{li + 1}. {l.title}</span>
                              {l.is_preview && <Eye className="w-3 h-3 shrink-0 opacity-70" />}
                              {l.is_visible === false && <EyeOff className="w-3 h-3 shrink-0 opacity-50" />}
                            </button>
                          ))}
                          {/* Ajouter leçon */}
                          <div className="flex gap-1.5 pt-1">
                            <input className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs"
                              value={newLessonByModule[m.id] || ""} placeholder="Titre de la leçon"
                              onChange={(e) => setNewLessonByModule((p) => ({ ...p, [m.id]: e.target.value }))}
                              onKeyDown={async (e) => {
                                if (e.key !== "Enter") return;
                                const title = (newLessonByModule[m.id] || "").trim() || "Nouvelle leçon";
                                try {
                                  const lesson = await api<Lesson>(`/api/admin/formations/modules/${m.id}/lessons`, {
                                    method: "POST", headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ title, video_type: "upload", is_preview: false }),
                                  });
                                  setSelectedLessonId(lesson.id);
                                  setNewLessonByModule((p) => ({ ...p, [m.id]: "" }));
                                  await load();
                                } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
                              }} />
                            <button onClick={async () => {
                              const title = (newLessonByModule[m.id] || "").trim() || "Nouvelle leçon";
                              try {
                                const lesson = await api<Lesson>(`/api/admin/formations/modules/${m.id}/lessons`, {
                                  method: "POST", headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ title, video_type: "upload", is_preview: false }),
                                });
                                setSelectedLessonId(lesson.id);
                                setNewLessonByModule((p) => ({ ...p, [m.id]: "" }));
                                await load();
                              } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
                            }} className="px-2.5 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:opacity-90 transition shrink-0">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Panneau leçon ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 overflow-y-auto pl-4 border-l border-[var(--border)]">
            {!selectedLessonId ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12">
                <Video className="w-16 h-16 text-[var(--muted)]/40 mb-4" />
                <p className="text-lg font-semibold text-[var(--muted)]">Sélectionnez une leçon</p>
                <p className="text-sm text-[var(--muted)] mt-2">Choisissez une leçon dans la liste de gauche pour l'éditer</p>
              </div>
            ) : editingLessonId === selectedLessonId ? (
              /* ── MODE ÉDITION ─────────────────────────────────────── */
              <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold">Éditer la leçon</h2>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={async () => {
                      const err = validateLesson();
                      if (err) { toast({ title: "Validation", description: err, variant: "destructive" }); return; }
                      setSavingLesson(true);
                      try {
                        await api(`/api/admin/formations/lessons/${lessonDraft!.id}`, {
                          method: "PUT", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            title: lessonDraft!.title, content: lessonDraft!.content,
                            video_url: lessonDraft!.video_url, video_type: lessonDraft!.video_type,
                            duration_min: lessonDraft!.duration_min, is_preview: lessonDraft!.is_preview,
                          }),
                        });
                        await load(); setEditingLessonId(null);
                        toast({ title: "✅ Leçon enregistrée" });
                      } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
                      finally { setSavingLesson(false); }
                    }} disabled={savingLesson}>
                      {savingLesson ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                      {savingLesson ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingLessonId(null); setLessonDraft(selectedLesson ? { ...selectedLesson } : null); }}>Annuler</Button>
                    <Button size="sm" variant="destructive" onClick={async () => {
                      if (!confirm("Supprimer cette leçon ?")) return;
                      try {
                        await api(`/api/admin/formations/lessons/${lessonDraft?.id}`, { method: "DELETE" });
                        setSelectedLessonId(null); setEditingLessonId(null); await load();
                        toast({ title: "✅ Leçon supprimée" });
                      } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
                    }}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>

                <div>
                  <label className={LABEL}>Titre de la leçon</label>
                  <input className={INPUT} value={lessonDraft?.title || ""} placeholder="Titre"
                    onChange={(e) => setLessonDraft((p) => p ? { ...p, title: e.target.value } : p)} />
                </div>

                <div>
                  <label className={LABEL}>Type de vidéo</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["upload","youtube","vimeo"] as const).map((t) => (
                      <button key={t} type="button"
                        onClick={() => setLessonDraft((p) => p ? { ...p, video_type: t, video_url: null } : p)}
                        className={cn("px-4 py-2.5 rounded-xl border capitalize text-sm font-medium transition-colors",
                          lessonDraft?.video_type === t
                            ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                            : "border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--background)]")}>
                        {t === "upload" ? "⬆ Upload" : t === "youtube" ? "▶ YouTube" : "🎬 Vimeo"}
                      </button>
                    ))}
                  </div>
                </div>

                {lessonDraft?.video_type === "upload" && (
                  <div className="space-y-2">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] cursor-pointer hover:bg-[var(--background)] transition text-sm">
                      <Upload className="w-4 h-4" />
                      {uploadingLesson ? `Upload ${uploadingLessonProgress}%...` : lessonDraft.video_url ? "✅ Vidéo uploadée — Changer" : "Uploader une vidéo"}
                      <input type="file" className="hidden" accept="video/*" disabled={uploadingLesson}
                        onChange={async (e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          try {
                            setUploadingLesson(true); setUploadingLessonProgress(0);
                            const { url } = await uploadFile(f, "/api/admin/formations/upload-video", setUploadingLessonProgress);
                            setLessonDraft((p) => p ? { ...p, video_type: "upload", video_url: url } : p);
                            toast({ title: "✅ Vidéo uploadée" });
                          } catch (e: any) { toast({ title: "Erreur upload", description: e.message, variant: "destructive" }); }
                          finally { setUploadingLesson(false); setUploadingLessonProgress(0); }
                        }} />
                    </label>
                    {uploadingLesson && (
                      <div className="h-1.5 bg-[var(--background)] rounded-full overflow-hidden border border-[var(--border)]">
                        <div className="h-full bg-[var(--primary)] transition-all" style={{ width: `${uploadingLessonProgress}%` }} />
                      </div>
                    )}
                  </div>
                )}

                {(lessonDraft?.video_type === "youtube" || lessonDraft?.video_type === "vimeo") && (
                  <div>
                    <label className={LABEL}>{lessonDraft.video_type === "youtube" ? "URL YouTube" : "URL Vimeo"}</label>
                    <input className={cn(INPUT,
                      lessonDraft.video_url && lessonDraft.video_type === "youtube" && !isValidYt(lessonDraft.video_url) ? "border-red-500" : "",
                      lessonDraft.video_url && lessonDraft.video_type === "vimeo" && !vm(lessonDraft.video_url) ? "border-red-500" : "")}
                      value={lessonDraft.video_url || ""}
                      placeholder={lessonDraft.video_type === "youtube" ? "https://youtu.be/..." : "https://vimeo.com/..."}
                      onChange={(e) => setLessonDraft((p) => p ? { ...p, video_url: e.target.value } : p)} />
                    {lessonDraft.video_url && lessonDraft.video_type === "youtube" && (
                      <p className={cn("text-xs mt-1", isValidYt(lessonDraft.video_url) ? "text-green-600 dark:text-green-400" : "text-red-500")}>
                        {isValidYt(lessonDraft.video_url) ? "✅ URL valide" : "❌ URL YouTube invalide"}
                      </p>
                    )}
                  </div>
                )}

                <VideoPreview type={lessonDraft?.video_type || null} url={lessonDraft?.video_url || null} />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Durée (minutes)</label>
                    <input type="number" min="0" className={INPUT} value={lessonDraft?.duration_min ?? 0}
                      onChange={(e) => setLessonDraft((p) => p ? { ...p, duration_min: Number(e.target.value) } : p)} />
                  </div>
                  <div>
                    <label className={LABEL}>Visibilité</label>
                    <label className={cn(INPUT, "flex items-center gap-3 cursor-pointer")}>
                      <input type="checkbox" checked={lessonDraft?.is_preview || false}
                        onChange={(e) => setLessonDraft((p) => p ? { ...p, is_preview: e.target.checked } : p)}
                        className="w-4 h-4 accent-[var(--primary)]" />
                      <span className="text-sm">Aperçu gratuit</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className={LABEL}>Contenu texte (optionnel)</label>
                  <textarea rows={5} className={cn(INPUT, "resize-none")} value={lessonDraft?.content || ""}
                    placeholder="Description ou transcript..."
                    onChange={(e) => setLessonDraft((p) => p ? { ...p, content: e.target.value } : p)} />
                </div>
              </div>
            ) : (
              /* ── MODE LECTURE ─────────────────────────────────────── */
              <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{selectedLesson?.title}</h2>
                    <div className="flex items-center gap-3 mt-2 text-sm text-[var(--muted)] flex-wrap">
                      <span className="capitalize bg-[var(--background)] px-2.5 py-0.5 rounded-full border border-[var(--border)]">
                        {selectedLesson?.video_type || "—"}
                      </span>
                      {selectedLesson?.duration_min && (
                        <span>{selectedLesson.duration_min} min</span>
                      )}
                      {selectedLesson?.is_preview && (
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Aperçu gratuit</span>
                      )}
                      {selectedLesson?.is_visible === false && (
                        <span className="text-gray-400 flex items-center gap-1"><EyeOff className="w-3.5 h-3.5" /> Masquée</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => setEditingLessonId(selectedLessonId)}>
                      <Edit className="w-4 h-4 mr-2" /> Éditer
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={async () => {
                        try {
                          await api(`/api/admin/formations/lessons/${selectedLesson?.id}`, {
                            method: "PUT", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ is_visible: !(selectedLesson?.is_visible ?? true) }),
                          });
                          await load();
                        } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
                      }}
                      title={selectedLesson?.is_visible !== false ? "Masquer" : "Afficher"}>
                      {selectedLesson?.is_visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="destructive"
                      onClick={async () => {
                        if (!confirm("Supprimer cette leçon ?")) return;
                        try {
                          await api(`/api/admin/formations/lessons/${selectedLesson?.id}`, { method: "DELETE" });
                          setSelectedLessonId(null); await load();
                          toast({ title: "✅ Leçon supprimée" });
                        } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
                      }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {selectedLesson?.video_url && <VideoPreview type={selectedLesson.video_type} url={selectedLesson.video_url} />}

                {!selectedLesson?.video_url && !selectedLesson?.content && (
                  <div className="bg-[var(--background)] border-2 border-dashed border-[var(--border)] rounded-xl p-10 text-center">
                    <Video className="w-10 h-10 text-[var(--muted)]/40 mx-auto mb-2" />
                    <p className="text-sm text-[var(--muted)]">Aucun contenu · Cliquez sur "Éditer" pour commencer</p>
                  </div>
                )}

                {selectedLesson?.content && (
                  <div className="bg-[var(--background)] rounded-xl p-4 border border-[var(--border)]">
                    <p className="text-sm whitespace-pre-wrap">{selectedLesson.content}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
