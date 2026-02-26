"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";

import { useCreateArticle } from "@/hooks/useAdmin";
import { ARTICLE_CATEGORIES } from "@/lib/constants/articles";
import { cn } from "@/lib/utils";
import RichTextEditor from "@/components/RichTextEditor";

// Schema
const articleSchema = z.object({
  title: z.string().min(3, "Le titre est requis (min. 3 caractères)"),
  slug: z.string().min(3, "Le slug est requis"),
  excerpt: z.string().optional(),
  content: z.string().min(10, "Le contenu doit faire au moins 10 caractères"),
  thumbnail_url: z.string().optional(),
  status: z.enum(["draft", "published", "scheduled", "archived"]),
  categories: z.array(z.string()).min(1, "Sélectionnez au moins une catégorie"),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  allow_comments: z.boolean(),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function NouvelArticlePage() {
  const router = useRouter();

  const createMutation = useCreateArticle();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isValid, isDirty },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    mode: "onChange",
    defaultValues: {
      status: "draft",
      allow_comments: true,
      content: "",
      categories: [],
    },
  });

  const title = watch("title");
  const slug = watch("slug");

  // Generate slug from title
  useEffect(() => {
    if (title && !slug) {
      const slug = title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setValue("slug", slug, { shouldValidate: true });
    }
  }, [title, slug, setValue]);

  const onSubmit = async (data: ArticleFormValues) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        router.push("/admin/articles");
      },
    });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-4 border-b border-[var(--border)] pb-6"
      >
        <Link href="/admin/articles">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-[var(--accent)]"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--muted)]" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Nouvel article
          </h1>
          <p className="text-[var(--muted)] mt-1">
            Créez un nouvel article pour votre blog
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.form
        variants={itemVariants}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Titre <span className="text-red-500">*</span>
              </label>
              <Input
                {...register("title")}
                placeholder="Ex: Les fondamentaux de la chimie"
                className={cn(errors.title && "border-red-500")}
              />
              {errors.title && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Résumé
              </label>
              <textarea
                {...register("excerpt")}
                placeholder="Un court résumé qui apparaîtra dans les listes..."
                className="w-full h-24 p-3 bg-transparent border border-[var(--border)] rounded-lg text-[var(--foreground)] resize-none focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Contenu <span className="text-red-500">*</span>
              </label>
              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <RichTextEditor
                    content={field.value}
                    onChange={field.onChange}
                    className={cn(errors.content && "border-red-500")}
                    placeholder="Commencez à rédiger votre article ici..."
                  />
                )}
              />
              {errors.content && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.content.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[var(--card)] p-5 rounded-xl border border-[var(--border)] space-y-5">
              <h3 className="font-semibold text-[var(--foreground)]">
                Paramètres
              </h3>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Statut
                </label>
                <select
                  {...register("status")}
                  className="w-full p-2 bg-transparent border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                  <option value="scheduled">Programmé</option>
                  <option value="archived">Archivé</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Lien (Slug) <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register("slug")}
                  placeholder="mon-super-article"
                  className={cn(errors.slug && "border-red-500")}
                />
                {errors.slug && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.slug.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Catégories <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border border-[var(--border)] rounded-md">
                  {ARTICLE_CATEGORIES.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`cat-${cat.id}`}
                        value={cat.id}
                        {...register("categories")}
                        className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      <label
                        htmlFor={`cat-${cat.id}`}
                        className="text-sm text-[var(--foreground)] cursor-pointer"
                      >
                        {cat.label}
                      </label>
                    </div>
                  ))}
                </div>
                {errors.categories && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />{" "}
                    {errors.categories.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  URL Miniature (Image)
                </label>
                <Input
                  {...register("thumbnail_url")}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="allow_comments"
                  {...register("allow_comments")}
                  className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <label
                  htmlFor="allow_comments"
                  className="text-sm text-[var(--foreground)] cursor-pointer"
                >
                  Activer les commentaires
                </label>
              </div>
            </div>

            <div className="bg-[var(--card)] p-5 rounded-xl border border-[var(--border)] space-y-5">
              <h3 className="font-semibold text-[var(--foreground)]">
                SEO (Optionnel)
              </h3>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Titre SEO
                </label>
                <Input
                  {...register("seo_title")}
                  placeholder="Titre pour Google"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Description SEO
                </label>
                <textarea
                  {...register("seo_description")}
                  placeholder="Méta description (max 160 caractères)"
                  className="w-full h-20 p-2 bg-transparent border border-[var(--border)] rounded-md text-[var(--foreground)] resize-none focus:outline-none focus:border-[var(--primary)] text-sm"
                  maxLength={160}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-[var(--border)]">
          <Link href="/admin/articles">
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={!isValid || createMutation.isPending}
            className="gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Sauvegarder l'article
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
}
