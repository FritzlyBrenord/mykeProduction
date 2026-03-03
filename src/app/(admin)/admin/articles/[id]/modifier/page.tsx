'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { use, type ChangeEvent } from 'react';
import * as z from 'zod';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Loader2, Save, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/components/RichTextEditor';
import { useToast } from '@/components/ui/use-toast';
import { useArticle, useUpdateArticle, useUpload } from '@/hooks/useAdmin';
import { ARTICLE_CATEGORIES } from '@/lib/constants/articles';
import { cn } from '@/lib/utils';

const articleSchema = z.object({
  title: z.string().min(3, 'Le titre est requis (min. 3 caracteres)'),
  slug: z.string().min(3, 'Le slug est requis'),
  excerpt: z.string().optional(),
  content: z.string().min(10, 'Le contenu doit faire au moins 10 caracteres'),
  thumbnail_url: z.string().optional(),
  thumbnail_storage_path: z.string().optional(),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']),
  categories: z.array(z.string()).min(1, 'Selectionnez au moins une categorie'),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  allow_comments: z.boolean(),
});

type ArticleFormValues = z.infer<typeof articleSchema>;
type UploadResult = { urls?: string[]; files?: Array<{ path?: string }> };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function ModifierArticlePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const params = use(paramsPromise);
  const id = params.id;

  const { data: article, isLoading: isArticleLoading } = useArticle(id);
  const updateMutation = useUpdateArticle();
  const uploadMutation = useUpload();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      status: 'draft',
      allow_comments: true,
      content: '',
      categories: [],
      thumbnail_storage_path: '',
    },
  });

  const title = watch('title');
  const slug = watch('slug');
  const thumbnailUrl = watch('thumbnail_url');

  React.useEffect(() => {
    if (title && !isDirty) {
      const generatedSlug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      if (generatedSlug !== slug && generatedSlug !== article?.slug) {
        setValue('slug', generatedSlug, { shouldValidate: true });
      }
    }
  }, [title, isDirty, slug, article, setValue]);

  React.useEffect(() => {
    if (article) {
      reset({
        title: article.title || '',
        slug: article.slug || '',
        excerpt: article.excerpt || '',
        content: article.content || '',
        thumbnail_url: article.thumbnail_url || '',
        thumbnail_storage_path: (article as any).thumbnail_storage_path || '',
        status: article.status || 'draft',
        categories: article.categories || [],
        seo_title: article.seo_title || '',
        seo_description: article.seo_description || '',
        allow_comments: article.allow_comments ?? true,
      });
    }
  }, [article, reset]);

  const handleCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = (await uploadMutation.mutateAsync({
        files: [file],
        folder: 'articles/covers',
      })) as UploadResult;

      const uploadedUrl = result?.urls?.[0];
      if (!uploadedUrl) {
        throw new Error("URL image manquante dans la reponse d'upload");
      }

      setValue('thumbnail_url', uploadedUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue('thumbnail_storage_path', result?.files?.[0]?.path || '', {
        shouldDirty: true,
      });

      toast({ title: 'Image de couverture uploadee' });
    } catch (error: any) {
      toast({
        title: 'Erreur upload',
        description: error?.message || "Impossible d'uploader l'image",
        variant: 'destructive',
      });
    } finally {
      event.target.value = '';
    }
  };

  const clearCoverImage = () => {
    setValue('thumbnail_url', '', { shouldDirty: true, shouldValidate: true });
    setValue('thumbnail_storage_path', '', { shouldDirty: true });
  };

  const onSubmit = (data: ArticleFormValues) => {
    updateMutation.mutate(
      {
        id,
        data: {
          ...data,
          thumbnail_url: data.thumbnail_url?.trim() || null,
          thumbnail_storage_path: data.thumbnail_storage_path?.trim() || null,
        },
      },
      {
        onSuccess: () => {
          router.push('/admin/articles');
        },
      }
    );
  };

  if (isArticleLoading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader2 className='w-8 h-8 animate-spin text-[var(--primary)]' />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial='hidden'
      animate='visible'
      className='max-w-4xl mx-auto space-y-6'
    >
      <motion.div variants={itemVariants} className='flex items-center gap-4 border-b border-[var(--border)] pb-6'>
        <Link href='/admin/articles'>
          <Button variant='ghost' size='icon' className='hover:bg-[var(--accent)]'>
            <ArrowLeft className='w-5 h-5 text-[var(--muted)]' />
          </Button>
        </Link>
        <div>
          <h1 className='text-3xl font-bold text-[var(--foreground)]'>Modifier l'article</h1>
          <p className='text-[var(--muted)] mt-1'>Editez les informations de cet article</p>
        </div>
      </motion.div>

      <motion.form variants={itemVariants} onSubmit={handleSubmit(onSubmit)} className='space-y-8'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          <div className='md:col-span-2 space-y-6'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-[var(--foreground)]'>
                Titre <span className='text-red-500'>*</span>
              </label>
              <Input
                {...register('title')}
                placeholder='Ex: Les fondamentaux de la chimie'
                className={cn(errors.title && 'border-red-500')}
              />
              {errors.title && (
                <p className='text-sm text-red-500 flex items-center gap-1'>
                  <AlertCircle className='w-3 h-3' /> {errors.title.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium text-[var(--foreground)]'>Resume</label>
              <textarea
                {...register('excerpt')}
                placeholder='Un court resume qui apparaitra dans les listes...'
                className='w-full h-24 p-3 bg-transparent border border-[var(--border)] rounded-lg text-[var(--foreground)] resize-none focus:outline-none focus:border-[var(--primary)]'
              />
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium text-[var(--foreground)]'>
                Contenu <span className='text-red-500'>*</span>
              </label>
              <Controller
                name='content'
                control={control}
                render={({ field }) => (
                  <RichTextEditor
                    content={field.value}
                    onChange={field.onChange}
                    className={cn(errors.content && 'border-red-500')}
                    placeholder='Commencez a rediger votre article ici...'
                  />
                )}
              />
              {errors.content && (
                <p className='text-sm text-red-500 flex items-center gap-1'>
                  <AlertCircle className='w-3 h-3' /> {errors.content.message}
                </p>
              )}
            </div>
          </div>

          <div className='space-y-6'>
            <div className='bg-[var(--card)] p-5 rounded-xl border border-[var(--border)] space-y-5'>
              <h3 className='font-semibold text-[var(--foreground)]'>Parametres</h3>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-[var(--foreground)]'>Statut</label>
                <select
                  {...register('status')}
                  className='w-full p-2 bg-transparent border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]'
                >
                  <option value='draft'>Brouillon</option>
                  <option value='published'>Publie</option>
                  <option value='scheduled'>Programme</option>
                  <option value='archived'>Archive</option>
                </select>
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-[var(--foreground)]'>
                  Lien (Slug) <span className='text-red-500'>*</span>
                </label>
                <Input
                  {...register('slug')}
                  placeholder='mon-super-article'
                  className={cn(errors.slug && 'border-red-500')}
                />
                {errors.slug && (
                  <p className='text-sm text-red-500 flex items-center gap-1'>
                    <AlertCircle className='w-3 h-3' /> {errors.slug.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-[var(--foreground)]'>
                  Categories <span className='text-red-500'>*</span>
                </label>
                <div className='space-y-2 max-h-48 overflow-y-auto p-2 border border-[var(--border)] rounded-md'>
                  {ARTICLE_CATEGORIES.map((cat) => (
                    <div key={cat.id} className='flex items-center gap-2'>
                      <input
                        type='checkbox'
                        id={`cat-${cat.id}`}
                        value={cat.id}
                        {...register('categories')}
                        className='rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]'
                      />
                      <label htmlFor={`cat-${cat.id}`} className='text-sm text-[var(--foreground)] cursor-pointer'>
                        {cat.label}
                      </label>
                    </div>
                  ))}
                </div>
                {errors.categories && (
                  <p className='text-sm text-red-500 flex items-center gap-1 mt-1'>
                    <AlertCircle className='w-3 h-3' /> {errors.categories.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-[var(--foreground)]'>Image de couverture</label>
                <input type='hidden' {...register('thumbnail_url')} />
                <input type='hidden' {...register('thumbnail_storage_path')} />

                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt='Couverture article'
                    className='w-full h-32 rounded-lg border border-[var(--border)] object-cover'
                  />
                ) : (
                  <div className='w-full h-32 rounded-lg border border-dashed border-[var(--border)] flex items-center justify-center text-sm text-[var(--muted)]'>
                    Aucune image de couverture
                  </div>
                )}

                <div className='flex gap-2'>
                  <label className='inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border)] text-sm cursor-pointer hover:bg-[var(--accent)]'>
                    <Upload className='w-4 h-4' />
                    Uploader
                    <input
                      type='file'
                      accept='image/*'
                      className='hidden'
                      onChange={handleCoverUpload}
                      disabled={uploadMutation.isPending}
                    />
                  </label>

                  {thumbnailUrl && (
                    <Button type='button' variant='outline' size='sm' onClick={clearCoverImage}>
                      <X className='w-4 h-4 mr-1' />
                      Retirer
                    </Button>
                  )}
                </div>

                {uploadMutation.isPending && <p className='text-xs text-[var(--muted)]'>Upload en cours...</p>}
                {thumbnailUrl && !uploadMutation.isPending && (
                  <p className='text-xs text-[var(--muted)]'>
                    Image chargee. Cliquez sur "Mettre a jour l'article" pour enregistrer.
                  </p>
                )}
              </div>

              <div className='flex items-center gap-2 pt-2'>
                <input
                  type='checkbox'
                  id='allow_comments'
                  {...register('allow_comments')}
                  className='rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]'
                />
                <label htmlFor='allow_comments' className='text-sm text-[var(--foreground)] cursor-pointer'>
                  Activer les commentaires
                </label>
              </div>
            </div>

            <div className='bg-[var(--card)] p-5 rounded-xl border border-[var(--border)] space-y-5'>
              <h3 className='font-semibold text-[var(--foreground)]'>SEO (Optionnel)</h3>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-[var(--foreground)]'>Titre SEO</label>
                <Input {...register('seo_title')} placeholder='Titre pour Google' />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-[var(--foreground)]'>Description SEO</label>
                <textarea
                  {...register('seo_description')}
                  placeholder='Meta description (max 160 caracteres)'
                  className='w-full h-20 p-2 bg-transparent border border-[var(--border)] rounded-md text-[var(--foreground)] resize-none focus:outline-none focus:border-[var(--primary)] text-sm'
                  maxLength={160}
                />
              </div>
            </div>
          </div>
        </div>

        <div className='flex justify-end gap-4 pt-4 border-t border-[var(--border)]'>
          <Link href='/admin/articles'>
            <Button type='button' variant='outline'>Annuler</Button>
          </Link>
          <Button type='submit' disabled={updateMutation.isPending || uploadMutation.isPending} className='gap-2'>
            {updateMutation.isPending || uploadMutation.isPending ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Save className='w-4 h-4' />
            )}
            Mettre a jour l'article
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
}
