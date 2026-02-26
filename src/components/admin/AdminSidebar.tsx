'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ShoppingCart,
  FlaskConical,
  Video,
  Users,
  CreditCard,
  Tag,
  Shield,
  Mail,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  { label: 'Tableau de bord', href: '/admin/dashboard', icon: LayoutDashboard },
  {
    label: 'Formations',
    href: '/admin/formations',
    icon: BookOpen,
    children: [
      { label: 'Toutes les formations', href: '/admin/formations' },
      { label: 'Créer une formation', href: '/admin/formations/nouvelle' },
    ],
  },
  {
    label: 'Articles',
    href: '/admin/articles',
    icon: FileText,
    children: [
      { label: 'Tous les articles', href: '/admin/articles' },
      { label: 'Créer un article', href: '/admin/articles/nouveau' },
      { label: 'Commentaires', href: '/admin/articles/commentaires' },
    ],
  },
  {
    label: 'Boutique',
    href: '/admin/produits',
    icon: ShoppingCart,
    children: [
      { label: 'Produits', href: '/admin/produits' },
      { label: 'Créer un produit', href: '/admin/produits/nouveau' },
      { label: 'Commandes', href: '/admin/produits/commandes' },
    ],
  },
  {
    label: 'Inventaire Chimique',
    href: '/admin/inventaire-chimique',
    icon: FlaskConical,
  },
  {
    label: 'Vidéos',
    href: '/admin/videos',
    icon: Video,
  },
  {
    label: 'Utilisateurs',
    href: '/admin/utilisateurs',
    icon: Users,
  },
  {
    label: 'Paiements',
    href: '/admin/paiements',
    icon: CreditCard,
  },
  {
    label: 'Coupons',
    href: '/admin/coupons',
    icon: Tag,
  },
  {
    label: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: Shield,
  },
  {
    label: 'Newsletter',
    href: '/admin/newsletter',
    icon: Mail,
  },
  {
    label: 'Paramètres',
    href: '/admin/parametres',
    icon: Settings,
  },
];

function NavItemComponent({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const hasChildren = item.children && item.children.length > 0;

  if (isCollapsed) {
    return (
      <div className="relative group">
        <Link
          href={item.href}
          className={cn(
            'flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200',
            isActive
              ? 'bg-[var(--primary)] text-white'
              : 'text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)]'
          )}
        >
          <item.icon className="w-5 h-5" />
        </Link>
        
        {/* Tooltip */}
        <div className="absolute left-full ml-2 px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--foreground)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
          {item.label}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {hasChildren ? (
        <>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-200',
              isActive
                ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                : 'text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)]'
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </div>
            <ChevronDown
              className={cn('w-4 h-4 transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </button>
          
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pl-12 pr-2 py-1 space-y-1">
                  {item.children?.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        'block px-4 py-2 rounded-lg text-sm transition-all duration-200',
                        pathname === child.href
                          ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium'
                          : 'text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)]'
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <Link
          href={item.href}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
            isActive
              ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
              : 'text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)]'
          )}
        >
          <item.icon className="w-5 h-5" />
          <span className="font-medium">{item.label}</span>
        </Link>
      )}
    </div>
  );
}

export default function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--card)] border-b border-[var(--border)] z-50 px-4 flex items-center justify-between">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <span className="font-bold text-xl text-[var(--foreground)]">Myke Admin</span>
        </Link>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg hover:bg-[var(--card)]"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className={cn(
          'fixed top-0 left-0 h-screen bg-[var(--card)] border-r border-[var(--border)] z-50 flex flex-col',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-20 flex items-center px-4 border-b border-[var(--border)]">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-bold text-xl text-[var(--foreground)] whitespace-nowrap"
              >
                Myke Admin
              </motion.span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavItemComponent key={item.href} item={item} isCollapsed={isCollapsed} />
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-[var(--border)] space-y-2">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)] w-full',
              isCollapsed && 'justify-center px-2'
            )}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {!isCollapsed && <span className="font-medium">{theme === 'dark' ? 'Clair' : 'Sombre'}</span>}
          </button>

          {/* Logout */}
          <button
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-red-500 hover:bg-red-500/10 w-full',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium">Déconnexion</span>}
          </button>

          {/* Collapse Toggle (Desktop only) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              'hidden lg:flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)] w-full',
              isCollapsed && 'justify-center px-2'
            )}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 rotate-90" />}
            {!isCollapsed && <span className="font-medium">Réduire</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
