"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MessageCircle,
  Share2,
  Twitter,
  Facebook,
  Linkedin,
  Send,
  ThumbsUp,
} from "lucide-react";
import { Article, Commentaire } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

const mockArticle: Article = {
  id: "1",
  title: "Les nouvelles réglementations REACH 2024 : ce qui change",
  slug: "nouvelles-reglementations-reach-2024",
  excerpt:
    "Analyse des dernières modifications du règlement REACH et leur impact sur les industries chimiques européennes.",
  content: `
    <p>Le règlement REACH (Enregistrement, Évaluation et Autorisation des Produits Chimiques) constitue le cadre réglementaire principal de l'Union Européenne pour garantir la sécurité des produits chimiques. En 2024, plusieurs modifications importantes ont été apportées pour renforcer la protection de la santé humaine et de l'environnement.</p>
    
    <h2>Les principales modifications</h2>
    
    <p>Les nouvelles dispositions du REACH 2024 introduisent plusieurs changements significatifs :</p>
    
    <ul>
      <li><strong>Restriction des substances dangereuses</strong> : Extension de la liste des substances soumises à autorisation</li>
      <li><strong>Obligations de déclaration renforcées</strong> : Nouvelles exigences pour la traçabilité des produits chimiques</li>
      <li><strong>Évaluation des alternatives</strong> : Processus plus strict pour l'évaluation des substances de substitution</li>
      <li><strong>Protection des données</strong> : Renforcement de la confidentialité des données d'études</li>
    </ul>
    
    <h2>Impact sur les industries</h2>
    
    <p>Ces modifications auront un impact significatif sur les entreprises du secteur chimique :</p>
    
    <p>Les coûts de conformité devraient augmenter, particulièrement pour les PME qui devront investir dans de nouveaux systèmes de gestion et de traçabilité. Cependant, ces changements devraient également favoriser l'innovation vers des alternatives plus sûres et plus durables.</p>
    
    <h2>Calendrier de mise en œuvre</h2>
    
    <p>Les nouvelles dispositions seront progressivement applicables :</p>
    
    <ul>
      <li>1er juillet 2024 : Entrée en vigueur des nouvelles restrictions</li>
      <li>1er janvier 2025 : Obligation de déclaration renforcée</li>
      <li>1er juin 2025 : Nouveau processus d'évaluation des alternatives</li>
    </ul>
    
    <h2>Conclusion</h2>
    
    <p>Les entreprises doivent se préparer dès maintenant à ces changements en auditant leurs processus actuels et en identifiant les substances concernées par les nouvelles restrictions. Une anticipation appropriée permettra de minimiser les disruptions et de maintenir la compétitivité sur le marché européen.</p>
  `,
  thumbnail_url:
    "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800",
  status: "published",
  category_id: "1",
  author_id: "1",
  published_at: "2024-02-20",
  view_count: 1250,
  reading_time: 8,
  allow_comments: true,
  created_at: "2024-02-20",
  updated_at: "2024-02-20",
  category: {
    id: "1",
    name: "Réglementation",
    slug: "reglementation",
    type: "article",
  },
  author: {
    id: "1",
    email: "expert@mykeindustrie.com",
    full_name: "Dr. Marie Laurent",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
    role: "admin",
    is_active: true,
    two_fa_enabled: false,
    created_at: "2024-01-01",
  },
};

const mockComments: Commentaire[] = [
  {
    id: "1",
    user_id: "2",
    article_id: "1",
    content:
      "Excellent article ! Ces changements vont vraiment impacter notre façon de travailler.",
    status: "approved",
    parent_id: null,
    likes: 12,
    created_at: "2024-02-21T10:30:00Z",
    updated_at: "2024-02-21T10:30:00Z",
    user: {
      id: "2",
      email: "user@example.com",
      full_name: "Jean Dupont",
      avatar_url:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
      role: "client",
      is_active: true,
      two_fa_enabled: false,
      created_at: "2024-01-15",
    },
  },
  {
    id: "2",
    user_id: "3",
    article_id: "1",
    content:
      "Merci pour cette analyse détaillée. Est-ce que vous avez des recommandations pour les PME ?",
    status: "approved",
    parent_id: null,
    likes: 8,
    created_at: "2024-02-21T14:20:00Z",
    updated_at: "2024-02-21T14:20:00Z",
    user: {
      id: "3",
      email: "user2@example.com",
      full_name: "Sophie Martin",
      avatar_url: null,
      role: "client",
      is_active: true,
      two_fa_enabled: false,
      created_at: "2024-01-20",
    },
  },
];

export default function ArticleDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const article = mockArticle;

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vous devez être connecté pour commenter");
      return;
    }
    if (!comment.trim()) return;

    setIsSubmitting(true);
    // Simulation d'envoi
    setTimeout(() => {
      toast.success("Commentaire ajouté avec succès");
      setComment("");
      setIsSubmitting(false);
    }, 1000);
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = article.title;

    let shareUrl = "";
    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/articles"
            className="inline-flex items-center text-sm text-slate-500 hover:text-amber-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour aux articles
          </Link>
        </div>
      </div>

      {/* Article Header */}
      <div className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Category */}
            <Badge className="mb-4 bg-amber-500 hover:bg-amber-600">
              {article.category?.name}
            </Badge>

            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-6">
              {article.author && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={article.author.avatar_url || undefined} />
                    <AvatarFallback className="bg-amber-100 text-amber-600 text-xs">
                      {article.author.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-slate-900">
                    {article.author.full_name}
                  </span>
                </div>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(article.published_at || article.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {article.reading_time} min de lecture
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                {mockComments.length} commentaires
              </span>
            </div>

            {/* Share Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Partager :</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleShare("twitter")}
              >
                <Twitter className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleShare("facebook")}
              >
                <Facebook className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleShare("linkedin")}
              >
                <Linkedin className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Featured Image */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative aspect-video rounded-xl overflow-hidden shadow-xl"
        >
          <img
            src={article.thumbnail_url || "/images/placeholder-article.jpg"}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </motion.div>
      </div>

      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-4
                     [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h3]:mt-6 [&_h3]:mb-3
                     [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:mb-4
                     [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-2
                     [&_li]:text-slate-600 [&_li]:marker:text-slate-400
                     [&_strong]:font-semibold [&_strong]:text-slate-900"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </div>

      {/* Comments Section */}
      {article.allow_comments && (
        <div className="bg-white border-t">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">
              Commentaires ({mockComments.length})
            </h2>

            {/* Comment Form */}
            <form onSubmit={handleSubmitComment} className="mb-8">
              <div className="flex gap-4">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback className="bg-amber-100 text-amber-600">
                    {user?.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder={
                      user
                        ? "Ajouter un commentaire..."
                        : "Connectez-vous pour commenter..."
                    }
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="mb-2"
                    disabled={!user}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={!user || !comment.trim() || isSubmitting}
                      className="bg-slate-900 hover:bg-amber-500 hover:text-slate-950"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isSubmitting ? "Envoi..." : "Publier"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-6">
              {mockComments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4"
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={comment.user?.avatar_url || undefined} />
                    <AvatarFallback className="bg-slate-100 text-slate-600">
                      {comment.user?.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">
                        {comment.user?.full_name}
                      </span>
                      <span className="text-sm text-slate-500">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-700 mb-2">{comment.content}</p>
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1 text-sm text-slate-500 hover:text-amber-600">
                        <ThumbsUp className="h-4 w-4" />
                        {comment.likes}
                      </button>
                      <button className="text-sm text-slate-500 hover:text-amber-600">
                        Répondre
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
