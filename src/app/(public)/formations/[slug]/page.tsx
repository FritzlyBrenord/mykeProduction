"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ShareButton from "@/components/share/ShareButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCart } from "@/lib/hooks/useCart";
import { Formation } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils/format";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  PlayCircle,
  ShoppingCart,
  Star,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

function levelLabel(level: Formation["level"]) {
  if (level === "debutant") return "Debutant";
  if (level === "intermediaire") return "Intermediaire";
  if (level === "avance") return "Avance";
  return "Tous niveaux";
}

function resolvePublicationDate(formation: Formation) {
  const maybePublishedAt = (
    formation as Formation & { published_at?: string | null }
  ).published_at;
  return maybePublishedAt || formation.created_at;
}

export default function FormationDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { addItem } = useCart();

  const [formation, setFormation] = useState<Formation | null>(null);
  const [relatedFormations, setRelatedFormations] = useState<Formation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  const slug = useMemo(() => {
    if (!params?.slug) return "";
    return Array.isArray(params.slug) ? params.slug[0] : params.slug;
  }, [params]);

  useEffect(() => {
    let active = true;

    const fetchFormation = async () => {
      if (!slug) return;

      try {
        setIsLoading(true);
        setErrorMessage(null);

        const detailResponse = await fetch(
          `/api/formations/${encodeURIComponent(slug)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (!detailResponse.ok) {
          if (detailResponse.status === 404) {
            throw new Error("Formation introuvable.");
          }
          throw new Error("Impossible de charger la formation.");
        }

        const detailData = (await detailResponse.json()) as Formation;
        if (!active) return;
        setFormation(detailData);

        const relatedParams = new URLSearchParams({
          limit: "3",
          exclude: slug,
        });

        if (detailData.category_id) {
          relatedParams.set("categoryId", detailData.category_id);
        }

        const relatedResponse = await fetch(
          `/api/formations?${relatedParams.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (!relatedResponse.ok) {
          if (active) setRelatedFormations([]);
          return;
        }

        const relatedData = (await relatedResponse.json()) as Formation[];
        if (!active) return;
        setRelatedFormations(
          Array.isArray(relatedData) ? relatedData.slice(0, 3) : [],
        );
      } catch (error) {
        if (!active) return;
        setFormation(null);
        setRelatedFormations([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Erreur de chargement.",
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchFormation();

    return () => {
      active = false;
    };
  }, [slug]);

  const handleAddToCart = async () => {
    if (!formation || formation.is_free) return;

    setIsAddingToCart(true);
    try {
      const thumbnailSrc =
        formation.thumbnail_url || "/images/placeholder-formation.svg";
      await addItem({
        item_type: "formation",
        item_id: formation.id,
        unit_price: Number(formation.price) || 0,
        quantity: 1,
        item_name: formation.title,
        item_image: thumbnailSrc,
      });
      toast.success("Formation ajoutee au panier.");
      router.push("/boutique/panier");
    } catch {
      toast.error("Impossible d'ajouter la formation au panier.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleFreeAccess = () => {
    if (!formation?.slug) return;
    router.push(`/formations/${formation.slug}/apprendre`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500">
          Chargement de la formation...
        </div>
      </div>
    );
  }

  if (!formation || errorMessage) {
    return (
      <div className="min-h-screen bg-slate-50 pt-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Formation indisponible
          </h1>
          <p className="text-slate-500 mb-6">
            {errorMessage ||
              "Cette formation n'est pas accessible pour le moment."}
          </p>
          <Link href="/formations">
            <Button variant="outline">Retour aux formations</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24">
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

      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex flex-wrap gap-2 mb-4">
                  {formation.category?.name && (
                    <Badge className="bg-amber-500 hover:bg-amber-600">
                      {formation.category.name}
                    </Badge>
                  )}
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

                <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 mb-6">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formation.duration_hours ?? 0}h de contenu
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {formation.enrolled_count ?? 0} inscrits
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    {Number(formation.rating_avg ?? 0).toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <PlayCircle className="h-4 w-4" />
                    {formation.format === "video" ? "Video" : "Texte"}
                  </span>
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="sticky top-24"
              >
                <Card className="shadow-xl border-0 overflow-hidden">
                  <div className="relative aspect-video">
                    <Image
                      src={
                        formation.thumbnail_url ||
                        "/images/placeholder-formation.svg"
                      }
                      alt={formation.title}
                      fill
                      className="object-cover"
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
                          {formatPrice(Number(formation.price) || 0, "USD")}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      {formation.is_free ? (
                        <Button
                          className="w-full bg-slate-900 hover:bg-amber-500 hover:text-slate-950 h-12 text-lg"
                          onClick={handleFreeAccess}
                        >
                          <BookOpen className="mr-2 h-5 w-5" />
                          Acceder gratuitement
                        </Button>
                      ) : (
                        <Button
                          className="w-full bg-slate-900 hover:bg-amber-500 hover:text-slate-950 h-12 text-lg"
                          onClick={handleAddToCart}
                          disabled={isAddingToCart}
                        >
                          <ShoppingCart className="mr-2 h-5 w-5" />
                          {isAddingToCart
                            ? "Ajout en cours..."
                            : "Ajouter au panier"}
                        </Button>
                      )}

                      <ShareButton
                        title={formation.title}
                        text={
                          formation.description || "Decouvrez cette formation"
                        }
                        path={`/formations/${formation.slug}`}
                        variant="outline"
                        size="lg"
                        buttonClassName="w-full h-11"
                        className="text-black"
                      />
                    </div>

                    <div className="mt-6 space-y-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Formation publiee et disponible
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Niveau: {levelLabel(formation.level)}
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Langue: {formation.language || "fr"}
                      </div>
                      {formation.certificate && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Certificat de fin
                        </div>
                      )}
                      {!formation.is_free && (
                        <div className="flex items-center gap-2 text-amber-700">
                          <CheckCircle className="h-4 w-4 text-amber-600" />
                          Formation payante: achat via panier requis
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={contentRef}
        className="max-w-7xl text-black mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Apercu</TabsTrigger>
            <TabsTrigger value="content">Detail texte</TabsTrigger>
            <TabsTrigger value="reviews">Avis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
              <h2 className="text-xl font-bold text-slate-900">
                Informations de la formation
              </h2>
              <p className="text-slate-600">
                Cette page publique montre les details de la formation. Les
                modules et les lecons ne sont pas affiches ici.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
                <p>
                  <strong>Format:</strong>{" "}
                  {formation.format === "video" ? "Video" : "Texte"}
                </p>
                <p>
                  <strong>Niveau:</strong> {levelLabel(formation.level)}
                </p>
                <p>
                  <strong>Duree:</strong> {formation.duration_hours ?? 0}h
                </p>
                <p>
                  <strong>Langue:</strong> {formation.language || "fr"}
                </p>
                <p>
                  <strong>Date de publication:</strong>{" "}
                  {formatDate(resolvePublicationDate(formation))}
                </p>
                <p>
                  <strong>Derniere mise a jour:</strong>{" "}
                  {formatDate(formation.updated_at)}
                </p>
                <p>
                  <strong>Categorie:</strong>{" "}
                  {formation.category?.name || "Non definie"}
                </p>
                <p>
                  <strong>Prix:</strong>{" "}
                  {formation.is_free
                    ? "Gratuit"
                    : formatPrice(Number(formation.price) || 0, "USD")}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="content">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Detail texte
              </h2>
              {formation.content ? (
                <div
                  className="prose prose-slate max-w-none text-slate-800 [&_*]:!text-slate-800 [&_h1]:!text-slate-900 [&_h2]:!text-slate-900 [&_h3]:!text-slate-900 [&_h4]:!text-slate-900 [&_a]:!text-amber-700 [&_a]:underline [&_strong]:!text-slate-900"
                  dangerouslySetInnerHTML={{ __html: formation.content }}
                />
              ) : (
                <p className="text-slate-600 whitespace-pre-line">
                  {formation.description}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-slate-900">
                    {Number(formation.rating_avg ?? 0).toFixed(1)}
                  </p>
                  <div className="flex items-center justify-center gap-1 my-1">
                    {[...Array(5)].map((_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${
                          index < Math.floor(Number(formation.rating_avg ?? 0))
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-slate-500">
                    {formation.enrolled_count ?? 0} avis
                  </p>
                </div>
              </div>
              <p className="text-slate-500 text-center">
                Les avis detailles seront disponibles bientot.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Formations similaires
          </h2>

          {relatedFormations.length === 0 ? (
            <p className="text-slate-500">
              Aucune formation similaire disponible.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedFormations.map((relatedFormation) => (
                <Card
                  key={relatedFormation.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="relative aspect-video">
                    <Image
                      src={
                        relatedFormation.thumbnail_url ||
                        "/images/placeholder-formation.svg"
                      }
                      alt={relatedFormation.title}
                      fill
                      className="object-cover"
                    />
                    {relatedFormation.is_free ? (
                      <Badge className="absolute top-3 left-3 bg-green-500">
                        Gratuit
                      </Badge>
                    ) : (
                      <Badge className="absolute top-3 left-3 bg-amber-500">
                        {formatPrice(
                          Number(relatedFormation.price) || 0,
                          "USD",
                        )}
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
                        Voir les details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
