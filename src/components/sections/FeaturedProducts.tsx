"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Produit } from "@/lib/types";
import ProductCard from "@/components/cards/ProductCard";
import { Button } from "@/components/ui/button";

interface FeaturedProductsProps {
  produits: Produit[];
}

export default function FeaturedProducts({ produits }: FeaturedProductsProps) {
  return (
    <section className="py-24 lg:py-32 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-slate-50 to-transparent" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-slate-100/50 rounded-full blur-3xl -translate-y-1/2" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-16"
        >
          <div>
            <div className="flex items-center gap-2 text-amber-600 mb-4">
              <Sparkles className="h-5 w-5" />
              <span className="font-medium uppercase tracking-wider text-sm">
                Boutique
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-playfair)] text-4xl lg:text-5xl font-semibold text-slate-900 mb-4">
              Produits en vedette
            </h2>
            <p className="text-slate-500 text-lg max-w-xl leading-relaxed">
              Produits chimiques certifiés, documents techniques et équipements
              professionnels pour votre industrie.
            </p>
          </div>
          <Link href="/boutique">
            <Button
              variant="outline"
              className="group border-slate-300 hover:border-amber-400 hover:text-amber-600 px-6"
            >
              Voir tous les produits
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {produits.slice(0, 4).map((produit, index) => (
            <ProductCard key={produit.id} produit={produit} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
