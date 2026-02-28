'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { Video } from '@/lib/types';
import VideoCard from '@/components/cards/VideoCard';
import { Button } from '@/components/ui/button';

interface LatestVideosProps {
  videos: Video[];
}

export default function LatestVideos({ videos }: LatestVideosProps) {
  return (
    <section className="py-20 lg:py-28 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12"
        >
          <div>
            <div className="flex items-center gap-2 text-blue-400 mb-3">
              <PlayCircle className="h-5 w-5" />
              <span className="font-medium">Vidéothèque</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              Dernières vidéos
            </h2>
            <p className="text-slate-400 mt-2 max-w-xl">
              Tutoriels, documentaires et contenus exclusifs en vidéo.
            </p>
          </div>
          <Link href="/videos">
            <Button variant="outline" className="group border-slate-600 text-white hover:bg-slate-800">
              Voir toutes les vidéos
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {videos.slice(0, 3).map((video, index) => (
            <VideoCard key={video.id} video={video} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
