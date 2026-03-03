"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Formation } from "@/lib/types";
import { formatPrice } from "@/lib/utils/format";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  FileText,
  Lock,
  PlayCircle,
  Star,
  Unlock,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface FormationCardProps {
  formation: Formation;
  index?: number;
  isPurchased?: boolean;
}

export default function FormationCard({
  formation,
  index = 0,
  isPurchased = false,
}: FormationCardProps) {
  const destinationHref = isPurchased
    ? `/formations/${formation.slug}/apprendre`
    : `/formations/${formation.slug}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className="group overflow-hidden border-slate-200/60 bg-white transition-all duration-500 hover:shadow-2xl">
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={formation.thumbnail_url || "/images/placeholder-formation.svg"}
            alt={formation.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {formation.is_free ? (
              <Badge className="bg-emerald-500/90 px-3 py-1 font-medium text-white hover:bg-emerald-500">
                Gratuit
              </Badge>
            ) : (
              <Badge className="bg-amber-500/90 px-3 py-1 font-semibold text-slate-950 hover:bg-amber-500">
                {formatPrice(Number(formation.price) || 0, "USD")}
              </Badge>
            )}
          </div>

          <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
            <Badge
              variant="secondary"
              className={`font-medium text-white backdrop-blur-sm ${
                isPurchased ? "bg-emerald-500/90" : "bg-slate-900/80"
              }`}
            >
              {isPurchased ? (
                <span className="flex items-center gap-1.5">
                  <Unlock className="h-3.5 w-3.5" /> Deverrouillee
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Verrouillee
                </span>
              )}
            </Badge>

            <Badge
              variant="secondary"
              className="bg-white/95 font-medium text-slate-700 backdrop-blur-sm"
            >
              {formation.format === "video" ? (
                <span className="flex items-center gap-1.5">
                  <PlayCircle className="h-3.5 w-3.5 text-amber-500" /> Video
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-500" /> Texte
                </span>
              )}
            </Badge>
          </div>

          {formation.level && (
            <div className="absolute bottom-4 left-4">
              <Badge
                variant="outline"
                className="border-slate-200 bg-white/95 font-medium text-slate-700 backdrop-blur-sm"
              >
                {formation.level === "debutant" && "Debutant"}
                {formation.level === "intermediaire" && "Intermediaire"}
                {formation.level === "avance" && "Avance"}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-4 text-sm text-slate-500">
            {formation.duration_hours && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-500" />
                {formation.duration_hours}h
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-amber-500" />
              {formation.enrolled_count} inscrits
            </span>
            {formation.rating_avg > 0 && (
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {formation.rating_avg.toFixed(1)}
              </span>
            )}
          </div>

          <h3 className="mb-3 line-clamp-2 text-xl font-semibold text-slate-900 transition-colors group-hover:text-amber-600 font-[family-name:var(--font-playfair)]">
            {formation.title}
          </h3>

          <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-slate-500">
            {formation.description}
          </p>

          <Link href={destinationHref}>
            <Button className="w-full bg-slate-900 transition-all duration-300 group/btn hover:bg-amber-500 hover:text-slate-950">
              {isPurchased
                ? "Acceder a la formation"
                : formation.is_free
                  ? "Commencer gratuitement"
                  : "Voir les details"}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
