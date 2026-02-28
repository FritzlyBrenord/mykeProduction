"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play, Eye, Lock, Users, DollarSign } from "lucide-react";
import { Video } from "@/lib/types";
import { formatPrice } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface VideoCardProps {
  video: Video;
  index?: number;
}

export default function VideoCard({ video, index = 0 }: VideoCardProps) {
  const getAccessBadge = () => {
    switch (video.access_type) {
      case "public":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white">
            <Eye className="h-3 w-3 mr-1" />
            Gratuit
          </Badge>
        );
      case "members":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
            <Users className="h-3 w-3 mr-1" />
            Membres
          </Badge>
        );
      case "paid":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
            <DollarSign className="h-3 w-3 mr-1" />
            {video.price ? formatPrice(video.price) : "Payant"}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link href={`/videos/${video.slug}`}>
        <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-slate-200">
          {/* Thumbnail */}
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={video.thumbnail_url || "/images/placeholder-video.jpg"}
              alt={video.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />

            {/* Play Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play
                  className="h-7 w-7 text-amber-500 ml-1"
                  fill="currentColor"
                />
              </div>
            </div>

            {/* Access Badge */}
            <div className="absolute top-3 left-3">{getAccessBadge()}</div>

            {/* Lock Icon for Paid */}
            {video.access_type === "paid" && (
              <div className="absolute top-3 right-3">
                <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-white" />
                </div>
              </div>
            )}

            {/* View Count */}
            <div className="absolute bottom-3 right-3">
              <Badge
                variant="secondary"
                className="bg-black/60 text-white border-0"
              >
                <Eye className="h-3 w-3 mr-1" />
                {video.view_count?.toLocaleString() || "0"}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <CardContent className="p-5">
            <h3 className="font-[family-name:var(--font-playfair)] font-semibold text-lg text-slate-900 mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">
              {video.title}
            </h3>

            {video.description && (
              <p className="text-slate-600 text-sm line-clamp-2">
                {video.description}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
