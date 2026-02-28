'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Facebook, Twitter, Linkedin, Youtube, Instagram,
  Mail, Phone, MapPin, CreditCard, Shield, Cookie,
  Sparkles, ArrowUpRight, ChevronRight
} from 'lucide-react';

const footerLinks = {
  navigation: [
    { label: 'Formations', href: '/formations' },
    { label: 'Articles', href: '/articles' },
    { label: 'Boutique', href: '/boutique' },
    { label: 'Vidéos', href: '/videos' },
  ],
  legal: [
    { label: 'CGV', href: '/legal/cgv' },
    { label: 'CGU', href: '/legal/cgu' },
    { label: 'Confidentialité', href: '/legal/confidentialite' },
    { label: 'Mentions légales', href: '/legal/mentions-legales' },
  ],
  support: [
    { label: 'Centre d\'aide', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'FAQ', href: '#' },
  ],
};

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Youtube, href: '#', label: 'YouTube' },
  { icon: Instagram, href: '#', label: 'Instagram' },
];

export default function Footer() {
  return (
    <footer className="bg-slate-950 relative overflow-hidden">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
      
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(251, 191, 36, 0.3) 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
          
          {/* Brand Column */}
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-slate-950" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-r border-b border-amber-400/60" />
              </div>
              <div className="flex flex-col">
                <span className="font-[family-name:var(--font-playfair)] font-semibold text-lg text-white">
                  Myke Industrie
                </span>
                <span className="text-[9px] uppercase tracking-[0.15em] text-amber-400/80">
                  Excellence Industrielle
                </span>
              </div>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-sm">
              Plateforme de formations, articles, produits chimiques et vidéos 
              pour professionnels de l&apos;industrie. Excellence et expertise depuis 2014.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-sm bg-slate-900 border border-slate-800 flex items-center justify-center hover:border-amber-400/50 hover:bg-amber-400/5 transition-all group"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="lg:col-span-2 lg:col-start-6">
            <h3 className="text-white font-medium text-sm uppercase tracking-wider mb-6">
              Navigation
            </h3>
            <ul className="space-y-3">
              {footerLinks.navigation.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-slate-400 hover:text-amber-400 transition-colors text-sm flex items-center gap-2 group"
                  >
                    <ChevronRight className="h-3 w-3 text-slate-600 group-hover:text-amber-400 transition-colors" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="lg:col-span-2">
            <h3 className="text-white font-medium text-sm uppercase tracking-wider mb-6">
              Légal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-slate-400 hover:text-amber-400 transition-colors text-sm flex items-center gap-2 group"
                  >
                    <ChevronRight className="h-3 w-3 text-slate-600 group-hover:text-amber-400 transition-colors" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-4">
            <h3 className="text-white font-medium text-sm uppercase tracking-wider mb-6">
              Contact
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-sm bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-slate-300 text-sm">Email</p>
                  <a href="mailto:contact@mykeindustrie.com" className="text-amber-400 hover:text-amber-300 transition-colors text-sm">
                    contact@mykeindustrie.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-sm bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-slate-300 text-sm">Téléphone</p>
                  <a href="tel:+33123456789" className="text-amber-400 hover:text-amber-300 transition-colors text-sm">
                    +33 1 23 45 67 89
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-sm bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-slate-300 text-sm">Adresse</p>
                  <p className="text-slate-400 text-sm">
                    Paris, France
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} Myke Industrie. Tous droits réservés.
            </p>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Shield className="h-4 w-4 text-amber-400/70" />
                <span>RGPD</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Cookie className="h-4 w-4 text-amber-400/70" />
                <span>Cookies</span>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <CreditCard className="h-4 w-4" />
                <span>Visa</span>
                <span>Mastercard</span>
                <span>PayPal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
