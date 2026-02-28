"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Clock,
  Users,
  Star,
  PlayCircle,
  FileText,
  ArrowRight,
} from "lucide-react";
import { Formation } from "@/lib/types";
import { formatPrice } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FormationCardProps {
  formation: Formation;
  index?: number;
}

export default function FormationCard({
  formation,
  index = 0,
}: FormationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-500 border-slate-200/60 bg-white">
        {/* Image */}
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={formation.thumbnail_url || "/images/placeholder-formation.jpg"}
            alt={formation.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {formation.is_free ? (
              <Badge className="bg-emerald-500/90 hover:bg-emerald-500 text-white font-medium px-3 py-1">
                Gratuit
              </Badge>
            ) : (
              <Badge className="bg-amber-500/90 hover:bg-amber-500 text-slate-950 font-semibold px-3 py-1">
                {formatPrice(formation.price)}
              </Badge>
            )}
          </div>

          {/* Format Badge */}
          <div className="absolute top-4 right-4">
            <Badge
              variant="secondary"
              className="bg-white/95 backdrop-blur-sm text-slate-700 font-medium"
            >
              {formation.format === "video" ? (
                <span className="flex items-center gap-1.5">
                  <PlayCircle className="h-3.5 w-3.5 text-amber-500" /> Vidéo
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-500" /> Texte
                </span>
              )}
            </Badge>
          </div>

          {/* Level Badge - Bottom */}
          {formation.level && (
            <div className="absolute bottom-4 left-4">
              <Badge
                variant="outline"
                className="bg-white/95 backdrop-blur-sm border-slate-200 text-slate-700 font-medium"
              >
                {formation.level === "debutant" && "Débutant"}
                {formation.level === "intermediaire" && "Intermédiaire"}
                {formation.level === "avance" && "Avancé"}
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-6">
          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
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
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                {formation.rating_avg.toFixed(1)}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-[family-name:var(--font-playfair)] font-semibold text-xl text-slate-900 mb-3 line-clamp-2 group-hover:text-amber-600 transition-colors">
            {formation.title}
          </h3>

          {/* Description */}
          <p className="text-slate-500 text-sm line-clamp-2 mb-5 leading-relaxed">
            {formation.description}
          </p>

          {/* Button */}
          <Link href={`/formations/${formation.slug}`}>
            <Button className="w-full bg-slate-900 hover:bg-amber-500 hover:text-slate-950 transition-all duration-300 group/btn">
              {formation.is_free
                ? "Commencer gratuitement"
                : "Voir les détails"}
              <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
