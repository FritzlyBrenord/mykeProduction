"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Clock,
  Users,
  Star,
  PlayCircle,
  FileText,
  CheckCircle,
  BookOpen,
  Award,
  ArrowLeft,
  ShoppingCart,
  Lock,
  Unlock,
} from "lucide-react";
import { Formation } from "@/lib/types";
import { formatPrice } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";

// Données mockées
const mockFormation: Formation = {
  id: "1",
  title: "Introduction à la chimie industrielle",
  slug: "introduction-chimie-industrielle",
  description:
    "Cette formation complète vous permettra de maîtriser les bases de la chimie industrielle, des réactions chimiques fondamentales aux procédés de fabrication modernes. Vous apprendrez à comprendre et à appliquer les principes chimiques dans un contexte industriel.",
  content:
    "<h2>Contenu de la formation</h2><p>Dans cette formation, nous aborderons...</p>",
  thumbnail_url:
    "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800",
  price: 199,
  is_free: false,
  format: "video",
  status: "published",
  category_id: "1",
  duration_hours: 12,
  level: "debutant",
  language: "fr",
  certificate: true,
  enrolled_count: 245,
  rating_avg: 4.7,
  created_at: "2024-01-15",
  updated_at: "2024-01-15",
  category: { id: "1", name: "Chimie", slug: "chimie", type: "formation" },
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
  modules: [
    {
      id: "1",
      formation_id: "1",
      title: "Module 1 : Fondamentaux de la chimie",
      description: "Les bases indispensables",
      order_index: 0,
      lecons: [
        {
          id: "1",
          module_id: "1",
          title: "Structure de la matière",
          content: "",
          video_url: "",
          video_type: null,
          duration_min: 45,
          order_index: 0,
          is_preview: true,
        },
        {
          id: "2",
          module_id: "1",
          title: "Les liaisons chimiques",
          content: "",
          video_url: "",
          video_type: null,
          duration_min: 50,
          order_index: 1,
          is_preview: false,
        },
        {
          id: "3",
          module_id: "1",
          title: "Réactions chimiques de base",
          content: "",
          video_url: "",
          video_type: null,
          duration_min: 40,
          order_index: 2,
          is_preview: false,
        },
      ],
    },
    {
      id: "2",
      formation_id: "1",
      title: "Module 2 : Procédés industriels",
      description: "Applications industrielles",
      order_index: 1,
      lecons: [
        {
          id: "4",
          module_id: "2",
          title: "Synthèse industrielle",
          content: "",
          video_url: "",
          video_type: null,
          duration_min: 60,
          order_index: 0,
          is_preview: false,
        },
        {
          id: "5",
          module_id: "2",
          title: "Contrôle qualité",
          content: "",
          video_url: "",
          video_type: null,
          duration_min: 55,
          order_index: 1,
          is_preview: false,
        },
      ],
    },
    {
      id: "3",
      formation_id: "1",
      title: "Module 3 : Sécurité et environnement",
      description: "Bonnes pratiques",
      order_index: 2,
      lecons: [
        {
          id: "6",
          module_id: "3",
          title: "Gestion des risques chimiques",
          content: "",
          video_url: "",
          video_type: null,
          duration_min: 45,
          order_index: 0,
          is_preview: false,
        },
        {
          id: "7",
          module_id: "3",
          title: "Impact environnemental",
          content: "",
          video_url: "",
          video_type: null,
          duration_min: 50,
          order_index: 1,
          is_preview: false,
        },
      ],
    },
  ],
};

const relatedFormations: Formation[] = [
  {
    id: "5",
    title: "Hydrolyse acide : principes et applications",
    slug: "hydrolyse-acide",
    description:
      "Comprendre les mécanismes d'hydrolyse acide et leurs applications industrielles.",
    thumbnail_url:
      "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800",
    price: 149,
    is_free: false,
    format: "text",
    status: "published",
    category_id: "1",
    duration_hours: 6,
    level: "avance",
    language: "fr",
    certificate: false,
    enrolled_count: 89,
    rating_avg: 4.6,
    created_at: "2024-02-15",
    updated_at: "2024-02-15",
  },
  {
    id: "2",
    title: "Sécurité des procédés industriels",
    slug: "securite-procedes-industriels",
    description: "Maîtrisez les normes de sécurité et les bonnes pratiques.",
    thumbnail_url:
      "https://images.unsplash.com/photo-1581092921461-eab62e97a782?w=800",
    price: 0,
    is_free: true,
    format: "text",
    status: "published",
    category_id: "2",
    duration_hours: 8,
    level: "intermediaire",
    language: "fr",
    certificate: true,
    enrolled_count: 512,
    rating_avg: 4.5,
    created_at: "2024-02-01",
    updated_at: "2024-02-01",
  },
];

export default function FormationDetailPage() {
  const params = useParams();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const formation = mockFormation;

  const totalLessons =
    formation.modules?.reduce(
      (acc, module) => acc + (module.lecons?.length || 0),
      0,
    ) || 0;
  const totalDuration =
    formation.modules?.reduce(
      (acc, module) =>
        acc +
        (module.lecons?.reduce(
          (sum, lecon) => sum + (lecon.duration_min || 0),
          0,
        ) || 0),
      0,
    ) || 0;

  const handleEnroll = () => {
    toast.success(
      "Inscription réussie ! Vous pouvez maintenant accéder à la formation.",
    );
    setIsEnrolled(true);
  };

  const handleAddToCart = () => {
    toast.success("Formation ajoutée au panier");
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/formations"
            className="inline-flex items-center text-sm text-slate-500 hover:text-amber-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour aux formations
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left Content */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className="bg-amber-500 hover:bg-amber-600">
                    {formation.category?.name}
                  </Badge>
                  {formation.is_free ? (
                    <Badge className="bg-green-500">Gratuit</Badge>
                  ) : (
                    <Badge className="bg-amber-500">Payant</Badge>
                  )}
                  {formation.certificate && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Award className="h-3 w-3" />
                      Certificat
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                  {formation.title}
                </h1>

                <p className="text-lg text-slate-600 mb-6">
                  {formation.description}
                </p>

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 mb-6">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formation.duration_hours}h de contenu
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {totalLessons} leçons
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {formation.enrolled_count} inscrits
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    {formation.rating_avg} ({formation.enrolled_count} avis)
                  </span>
                  <span className="flex items-center gap-1">
                    <PlayCircle className="h-4 w-4" />
                    {formation.format === "video" ? "Vidéo" : "Texte"}
                  </span>
                </div>

                {/* Author */}
                {formation.author && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden">
                      {formation.author.avatar_url ? (
                        <img
                          src={formation.author.avatar_url}
                          alt={formation.author.full_name || ""}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-amber-100 text-amber-600 font-bold">
                          {formation.author.full_name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {formation.author.full_name}
                      </p>
                      <p className="text-sm text-slate-500">Formateur expert</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right Card */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="sticky top-24"
              >
                <Card className="shadow-xl border-0 overflow-hidden">
                  <div className="relative aspect-video">
                    <img
                      src={
                        formation.thumbnail_url ||
                        "/images/placeholder-formation.jpg"
                      }
                      alt={formation.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                        <PlayCircle className="h-8 w-8 text-amber-600 ml-1" />
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      {formation.is_free ? (
                        <p className="text-3xl font-bold text-green-600">
                          Gratuit
                        </p>
                      ) : (
                        <p className="text-3xl font-bold text-slate-900">
                          {formatPrice(formation.price)}
                        </p>
                      )}
                    </div>

                    {isEnrolled ? (
                      <Link href={`/formations/${formation.slug}/apprendre`}>
                        <Button className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg">
                          <PlayCircle className="mr-2 h-5 w-5" />
                          Continuer la formation
                        </Button>
                      </Link>
                    ) : (
                      <div className="space-y-3">
                        {formation.is_free ? (
                          <Button
                            className="w-full bg-slate-900 hover:bg-amber-500 hover:text-slate-950 h-12 text-lg"
                            onClick={handleEnroll}
                          >
                            <BookOpen className="mr-2 h-5 w-5" />
                            S'inscrire gratuitement
                          </Button>
                        ) : (
                          <>
                            <Button
                              className="w-full bg-slate-900 hover:bg-amber-500 hover:text-slate-950 h-12 text-lg"
                              onClick={handleAddToCart}
                            >
                              <ShoppingCart className="mr-2 h-5 w-5" />
                              Ajouter au panier
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full h-12"
                              onClick={handleEnroll}
                            >
                              Acheter maintenant
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    <div className="mt-6 space-y-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Accès illimité
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {totalLessons} leçons
                      </div>
                      {formation.certificate && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Certificat de fin
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Support inclus
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="program" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="program">Programme</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="reviews">Avis</TabsTrigger>
          </TabsList>

          <TabsContent value="program">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                Programme de la formation
              </h2>

              <Accordion type="single" collapsible className="w-full">
                {formation.modules?.map((module, moduleIndex) => (
                  <AccordionItem key={module.id} value={module.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-4 text-left">
                        <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold">
                          {moduleIndex + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {module.title}
                          </p>
                          <p className="text-sm text-slate-500">
                            {module.lecons?.length || 0} leçons
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-12 space-y-2">
                        {module.lecons?.map((lecon, leconIndex) => (
                          <div
                            key={lecon.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {lecon.is_preview ? (
                                <Unlock className="h-4 w-4 text-green-500" />
                              ) : (
                                <Lock className="h-4 w-4 text-slate-400" />
                              )}
                              <span className="text-sm text-slate-500">
                                {moduleIndex + 1}.{leconIndex + 1}
                              </span>
                              <span className="text-slate-700">
                                {lecon.title}
                              </span>
                              {lecon.is_preview && (
                                <Badge variant="secondary" className="text-xs">
                                  Aperçu
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-slate-500">
                              {lecon.duration_min} min
                            </span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </TabsContent>

          <TabsContent value="content">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Ce que vous allez apprendre
              </h2>
              <div className="prose max-w-none">
                <div
                  dangerouslySetInnerHTML={{ __html: formation.content || "" }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-slate-900">
                    {formation.rating_avg}
                  </p>
                  <div className="flex items-center justify-center gap-1 my-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < Math.floor(formation.rating_avg) ? "text-yellow-500 fill-yellow-500" : "text-slate-300"}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-slate-500">
                    {formation.enrolled_count} avis
                  </p>
                </div>
              </div>
              <p className="text-slate-500 text-center">
                Les avis seront bientôt disponibles...
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Formations */}
      <div className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Formations similaires
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedFormations.map((relatedFormation, index) => (
              <Card
                key={relatedFormation.id}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-video">
                  <img
                    src={
                      relatedFormation.thumbnail_url ||
                      "/images/placeholder-formation.jpg"
                    }
                    alt={relatedFormation.title}
                    className="w-full h-full object-cover"
                  />
                  {relatedFormation.is_free ? (
                    <Badge className="absolute top-3 left-3 bg-green-500">
                      Gratuit
                    </Badge>
                  ) : (
                    <Badge className="absolute top-3 left-3 bg-amber-500">
                      {formatPrice(relatedFormation.price)}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                    {relatedFormation.title}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                    {relatedFormation.description}
                  </p>
                  <Link href={`/formations/${relatedFormation.slug}`}>
                    <Button variant="outline" className="w-full">
                      Voir les détails
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
