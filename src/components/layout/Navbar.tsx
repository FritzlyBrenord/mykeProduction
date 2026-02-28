"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ShoppingCart,
  User,
  BookOpen,
  Newspaper,
  ShoppingBag,
  PlayCircle,
  LogOut,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useCart } from "@/lib/hooks/useCart";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const navLinks = [
  { href: "/formations", label: "Formations", icon: BookOpen },
  { href: "/articles", label: "Articles", icon: Newspaper },
  { href: "/boutique", label: "Boutique", icon: ShoppingBag },
  { href: "/videos", label: "Vidéos", icon: PlayCircle },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPastHero, setIsPastHero] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { itemCount } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 50);
      // Détecte quand on a dépassé le hero section (~100vh)
      setIsPastHero(scrollY > 700);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) => pathname.startsWith(href);
  const isHomePage = pathname === "/";

  // Sur la page d'accueil: mode dynamique selon scroll
  // Sur les autres pages: toujours mode light (fond blanc/texte sombre)
  const isLightMode = !isHomePage || isPastHero;

  // Classes conditionnelles basées sur la position
  const navClasses = isLightMode
    ? "bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-lg"
    : isScrolled
      ? "bg-slate-950/90 backdrop-blur-xl border-b border-amber-400/10 shadow-2xl shadow-black/20"
      : "bg-transparent";

  const textColorClass = isLightMode ? "text-slate-900" : "text-white";
  const textMutedClass = isLightMode ? "text-slate-600" : "text-slate-300";
  const textMutedHoverClass = isLightMode
    ? "hover:text-amber-600"
    : "hover:text-white";
  const logoSubtitleClass = isLightMode
    ? "text-amber-600"
    : "text-amber-400/80";
  const borderColorClass = isLightMode
    ? "border-slate-200"
    : "border-amber-400/10";

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${navClasses}`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
        <div className="flex items-center justify-between h-20 lg:h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-12 h-12 rounded-sm bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all">
                <Sparkles className="h-6 w-6 text-slate-950" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r-2 border-b-2 border-amber-400/60" />
            </div>
            <div className="flex flex-col">
              <span
                className={`font-[family-name:var(--font-playfair)] font-semibold text-xl tracking-tight transition-colors ${textColorClass}`}
              >
                Myke Industrie
              </span>
              <span
                className={`text-[10px] uppercase tracking-[0.2em] -mt-0.5 transition-colors ${logoSubtitleClass}`}
              >
                Excellence Industrielle
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-5 py-2.5 rounded-sm text-sm font-medium transition-all duration-300 group ${
                    active
                      ? isLightMode
                        ? "text-amber-600"
                        : "text-amber-400"
                      : `${textMutedClass} ${textMutedHoverClass}`
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon
                      className={`h-4 w-4 transition-colors ${
                        active
                          ? isLightMode
                            ? "text-amber-600"
                            : "text-amber-400"
                          : isLightMode
                            ? "text-slate-500 group-hover:text-amber-600"
                            : "text-slate-400 group-hover:text-amber-400"
                      }`}
                    />
                    {link.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute bottom-0 left-5 right-5 h-0.5 bg-amber-400"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  <div
                    className={`absolute bottom-0 left-5 right-5 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left ${isLightMode ? "bg-amber-600/50" : "bg-amber-400/50"}`}
                  />
                </Link>
              );
            })}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            <Link href="/boutique/panier">
              <Button
                variant="ghost"
                size="icon"
                className={`relative hover:bg-black/5 ${isLightMode ? "text-slate-600 hover:text-slate-900" : "text-slate-300 hover:text-white hover:bg-white/5"}`}
              >
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge
                    variant="default"
                    className={`absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-amber-500 font-semibold ${isLightMode ? "border-2 border-white text-slate-950" : "border-2 border-slate-950 text-slate-950"}`}
                  >
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </Link>

            <div
              className={`h-6 w-px mx-1 hidden sm:block ${isLightMode ? "bg-slate-200" : "bg-slate-700/50"}`}
            />

            {/* Auth */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full p-0 hover:bg-white/5"
                  >
                    <Avatar className="h-10 w-10 border-2 border-amber-400/30">
                      <AvatarImage
                        src={user.avatar_url || undefined}
                        alt={user.full_name || ""}
                      />
                      <AvatarFallback className="bg-slate-800 text-amber-400 font-medium">
                        {user.full_name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-64 bg-slate-900 border-slate-700/50"
                  align="end"
                  forceMount
                >
                  <div className="flex items-center gap-3 p-3 border-b border-slate-700/50">
                    <Avatar className="h-10 w-10 border-2 border-amber-400/30">
                      <AvatarImage
                        src={user.avatar_url || undefined}
                        alt={user.full_name || ""}
                      />
                      <AvatarFallback className="bg-slate-800 text-amber-400 text-sm font-medium">
                        {user.full_name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {user.full_name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuItem
                    asChild
                    className="text-slate-300 focus:text-white focus:bg-white/5 cursor-pointer"
                  >
                    <Link
                      href="/compte/profil"
                      className="flex items-center gap-2 py-2.5"
                    >
                      <User className="h-4 w-4 text-amber-400/70" />
                      Mon Profil
                      <ChevronRight className="h-4 w-4 ml-auto text-slate-500" />
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="text-slate-300 focus:text-white focus:bg-white/5 cursor-pointer"
                  >
                    <Link
                      href="/compte/formations"
                      className="flex items-center gap-2 py-2.5"
                    >
                      <BookOpen className="h-4 w-4 text-amber-400/70" />
                      Mes Formations
                      <ChevronRight className="h-4 w-4 ml-auto text-slate-500" />
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="text-slate-300 focus:text-white focus:bg-white/5 cursor-pointer"
                  >
                    <Link
                      href="/compte/commandes"
                      className="flex items-center gap-2 py-2.5"
                    >
                      <ShoppingBag className="h-4 w-4 text-amber-400/70" />
                      Mes Commandes
                      <ChevronRight className="h-4 w-4 ml-auto text-slate-500" />
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-700/50" />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer py-2.5"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <Link href="/auth/connexion">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={
                      isLightMode
                        ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }
                  >
                    Connexion
                  </Button>
                </Link>
                <Link href="/auth/inscription">
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-5"
                  >
                    S&apos;inscrire
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className={`lg:hidden ${isLightMode ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-slate-300 hover:text-white hover:bg-white/5"}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className={`lg:hidden backdrop-blur-xl border-t ${isLightMode ? "bg-white/95 border-slate-200" : "bg-slate-900/95 border-amber-400/10"}`}
          >
            <div className="px-4 py-6 space-y-1">
              {navLinks.map((link, index) => {
                const Icon = link.icon;
                const active = isActive(link.href);
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-sm transition-colors ${
                        active
                          ? isLightMode
                            ? "bg-amber-500/10 text-amber-600 border-l-2 border-amber-500"
                            : "bg-amber-500/10 text-amber-400 border-l-2 border-amber-400"
                          : isLightMode
                            ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          active
                            ? isLightMode
                              ? "text-amber-600"
                              : "text-amber-400"
                            : isLightMode
                              ? "text-slate-400"
                              : "text-slate-400"
                        }`}
                      />
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  </motion.div>
                );
              })}

              {!user && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`pt-4 mt-4 space-y-3 ${isLightMode ? "border-t border-slate-200" : "border-t border-slate-700/50"}`}
                >
                  <Link
                    href="/auth/connexion"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button
                      variant="outline"
                      className={`w-full ${isLightMode ? "border-slate-300 text-slate-700 hover:bg-slate-100" : "border-slate-600 text-slate-300 hover:bg-white/5"}`}
                    >
                      Connexion
                    </Button>
                  </Link>
                  <Link
                    href="/auth/inscription"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                      S&apos;inscrire
                    </Button>
                  </Link>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
