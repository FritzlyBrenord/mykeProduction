'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function CTASection() {
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Inscription réussie ! Vous recevrez nos prochaines newsletters.');
  };

  return (
    <section className="py-20 lg:py-28 bg-gradient-to-br from-blue-600 to-indigo-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 text-blue-200 mb-4">
              <Sparkles className="h-5 w-5" />
              <span className="font-medium">Rejoignez-nous</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
              Prêt à booster votre carrière industrielle ?
            </h2>
            <p className="text-blue-100 text-lg mb-8">
              Inscrivez-vous gratuitement et accédez à des centaines de ressources 
              exclusives : formations, articles, vidéos et bien plus.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth/inscription">
                <Button 
                  size="lg" 
                  className="bg-white text-blue-600 hover:bg-blue-50 px-8"
                >
                  Créer un compte gratuit
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link href="/formations">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/10 px-8"
                >
                  Explorer les formations
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Right Content - Newsletter */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Newsletter</h3>
                <p className="text-blue-200">Restez informé des dernières actualités</p>
              </div>
            </div>
            <form onSubmit={handleSubscribe} className="space-y-4">
              <Input
                type="email"
                placeholder="Votre adresse email"
                className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 h-12"
                required
              />
              <Button 
                type="submit" 
                className="w-full bg-white text-blue-600 hover:bg-blue-50 h-12"
              >
                S'inscrire à la newsletter
              </Button>
            </form>
            <p className="text-blue-200 text-sm mt-4 text-center">
              En vous inscrivant, vous acceptez notre politique de confidentialité.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
