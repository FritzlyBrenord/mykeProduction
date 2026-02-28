'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Newspaper } from 'lucide-react';
import { Article } from '@/lib/types';
import ArticleCard from '@/components/cards/ArticleCard';
import { Button } from '@/components/ui/button';

interface LatestArticlesProps {
  articles: Article[];
}

export default function LatestArticles({ articles }: LatestArticlesProps) {
  const featuredArticle = articles[0];
  const otherArticles = articles.slice(1, 4);

  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12"
        >
          <div>
            <div className="flex items-center gap-2 text-blue-600 mb-3">
              <Newspaper className="h-5 w-5" />
              <span className="font-medium">Articles</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">
              Derniers articles
            </h2>
            <p className="text-slate-600 mt-2 max-w-xl">
              Actualités, analyses et conseils d'experts sur l'industrie.
            </p>
          </div>
          <Link href="/articles">
            <Button variant="outline" className="group">
              Voir tous les articles
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Featured Article */}
          {featuredArticle && (
            <div className="lg:row-span-2">
              <ArticleCard article={featuredArticle} variant="featured" />
            </div>
          )}

          {/* Other Articles */}
          <div className="space-y-6">
            {otherArticles.map((article, index) => (
              <ArticleCard 
                key={article.id} 
                article={article} 
                variant="horizontal" 
                index={index}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
