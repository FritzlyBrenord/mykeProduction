"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ShoppingBag,
  PlayCircle,
  Award,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const stats = [
  { value: "50+", label: "Formations", suffix: "" },
  { value: "200+", label: "Articles", suffix: "" },
  { value: "1000+", label: "Produits", suffix: "" },
  { value: "10", label: "Années", suffix: "+" },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1920&q=80"
          alt="Industrie moderne"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
        {/* Gold accent lines */}
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          className="absolute top-1/4 left-0 w-32 h-[1px] bg-gradient-to-r from-amber-400/60 to-transparent"
        />
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.7 }}
          className="absolute top-0 left-1/4 w-[1px] h-32 bg-gradient-to-b from-amber-400/60 to-transparent"
        />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(251, 191, 36, 0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(251, 191, 36, 0.3) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column - Text */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-left"
          >
            {/* Premium Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-amber-400/30 bg-amber-400/5 backdrop-blur-sm mb-8"
            >
              <Award className="h-4 w-4 text-amber-400" />
              <span className="text-amber-200 text-sm font-medium tracking-wide uppercase">
                Excellence Industrielle
              </span>
            </motion.div>

            {/* Main Title */}
            <h1 className="font-[family-name:var(--font-playfair)] text-5xl sm:text-6xl lg:text-7xl font-semibold text-white mb-6 leading-[1.1] tracking-tight">
              Maîtrisez
              <br />
              <span className="text-amber-400">l&apos;Industrie</span>
              <br />
              de Demain
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-slate-300 max-w-xl mb-10 leading-relaxed font-light">
              Formations professionnelles certifiées, ressources techniques
              exclusives et produits industriels d&apos;excellence pour les
              leaders de l&apos;industrie moderne.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
              <Link href="/formations">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 py-6 text-base font-semibold rounded-sm transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 group"
                  >
                    <BookOpen className="h-5 w-5 mr-2" />
                    Explorer les formations
                    <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              </Link>
              <Link href="/boutique">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-8 py-6 text-base font-medium rounded-sm border-slate-400/30 text-white hover:bg-white/5 hover:border-slate-300/50 backdrop-blur-sm transition-all"
                  >
                    <ShoppingBag className="h-5 w-5 mr-2" />
                    Boutique professionnelle
                  </Button>
                </motion.div>
              </Link>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-wrap gap-8 lg:gap-12"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                  className="text-left"
                >
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl font-semibold text-amber-400">
                      {stat.value}
                    </span>
                    {stat.suffix && (
                      <span className="font-[family-name:var(--font-playfair)] text-2xl text-amber-400/70">
                        {stat.suffix}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-400 uppercase tracking-wider mt-1">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Column - Feature Card */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.4,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Decorative frame */}
              <div className="absolute -inset-4 border border-amber-400/20 rounded-lg" />
              <div className="absolute -inset-8 border border-amber-400/10 rounded-lg" />

              {/* Main card */}
              <div className="relative bg-slate-900/80 backdrop-blur-md rounded-lg border border-slate-700/50 p-8 shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <PlayCircle className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-[family-name:var(--font-playfair)] text-xl text-white font-medium">
                      Découvrez en vidéo
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Notre plateforme d&apos;excellence
                    </p>
                  </div>
                </div>

                {/* Video thumbnail placeholder */}
                <div className="relative aspect-video rounded-md overflow-hidden bg-slate-800 group cursor-pointer">
                  <Image
                    src="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80"
                    alt="Vidéo de présentation"
                    fill
                    className="object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-amber-500/90 flex items-center justify-center group-hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/30">
                      <PlayCircle className="h-8 w-8 text-slate-950 ml-1" />
                    </div>
                  </div>
                </div>

                {/* Feature list */}
                <div className="mt-6 space-y-3">
                  {[
                    "Formations certifiées par des experts",
                    "Produits chimiques de haute pureté",
                    "Support technique personnalisé",
                  ].map((item, i) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
                      className="flex items-center gap-3 text-slate-300 text-sm"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {item}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <span className="text-xs uppercase tracking-widest">Découvrir</span>
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </motion.div>
    </section>
  );
}
