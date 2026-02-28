"use client";

import { motion } from "framer-motion";
import HeroSection from "@/components/sections/HeroSection";
import FeaturedFormations from "@/components/sections/FeaturedFormations";
import FeaturedProducts from "@/components/sections/FeaturedProducts";
import LatestArticles from "@/components/sections/LatestArticles";
import LatestVideos from "@/components/sections/LatestVideos";

// Données mockées
const mockFormations = [
  {
    id: "1",
    title: "Introduction à la chimie industrielle",
    description: "Formation complète sur les bases de la chimie industrielle",
    price: 299,
    image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800",
    duration: "8 heures",
    level: "Débutant",
    category: "Chimie",
  },
  {
    id: "2",
    title: "Sécurité industrielle avancée",
    description: "Protocoles de sécurité pour les environnements industriels",
    price: 499,
    image: "https://images.unsplash.com/photo-1559028012-c7547e934d0e?w=800",
    duration: "12 heures",
    level: "Avancé",
    category: "Sécurité",
  },
];

const mockProduits = [
  {
    id: "1",
    name: "Acide Sulfurique Concentré",
    description:
      "Acide sulfurique de haute pureté pour applications industrielles",
    price: 89.99,
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800",
    category: "Acides",
    stock: 50,
  },
  {
    id: "2",
    name: "Hydroxyde de Sodium",
    description:
      "Soude caustique pour traitement des eaux et applications industrielles",
    price: 45.99,
    image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800",
    category: "Bases",
    stock: 100,
  },
];

const mockArticles = [
  {
    id: "1",
    title: "Les dernières innovations en chimie verte",
    excerpt:
      "Découvrez les nouvelles tendances et technologies qui transforment l'industrie chimique...",
    image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800",
    published_at: "2024-02-15",
    created_at: "2024-02-15",
    readTime: "5 min",
    category: "Innovation",
  },
  {
    id: "2",
    title: "Optimisation des processus industriels",
    excerpt:
      "Comment améliorer l'efficacité de vos processus de production tout en réduisant les coûts...",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
    published_at: "2024-02-10",
    created_at: "2024-02-10",
    readTime: "8 min",
    category: "Processus",
  },
];

const mockVideos = [
  {
    id: "1",
    title: "Démonstration: Réaction chimique contrôlée",
    thumbnail:
      "https://images.unsplash.com/photo-1596495878696-a6ffa7ba0ec1?w=800",
    duration: "12:45",
    view_count: 15420,
    access_type: "public",
    category: "Démonstration",
  },
  {
    id: "2",
    title: "Tutorial: Maintenance des équipements",
    thumbnail:
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
    duration: "18:30",
    view_count: 8932,
    access_type: "public",
    category: "Maintenance",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <FeaturedFormations formations={mockFormations} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <FeaturedProducts produits={mockProduits} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <LatestArticles articles={mockArticles} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <LatestVideos videos={mockVideos} />
      </motion.div>
    </div>
  );
}
