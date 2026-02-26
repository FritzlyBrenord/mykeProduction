export * from "./database.types";
// Types globaux pour Myke Industrie Admin

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'client' | 'admin';
  phone_encrypted: string | null;
  country: string | null;
  bio: string | null;
  is_active: boolean;
  two_fa_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: 'formation' | 'article' | 'produit' | 'video' | 'global';
  icon: string | null;
  color: string | null;
  created_at: string;
}

export interface Formation {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  thumbnail_url: string | null;
  price: number;
  is_free: boolean;
  format: 'video' | 'text';
  status: 'draft' | 'published' | 'archived';
  category_id: string | null;
  author_id: string | null;
  duration_hours: number | null;
  level: 'debutant' | 'intermediaire' | 'avance' | null;
  language: string;
  certificate: boolean;
  enrolled_count: number;
  rating_avg: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  author?: Profile;
}

export interface FormationModule {
  id: string;
  formation_id: string;
  title: string;
  description: string | null;
  intro_type: 'text' | 'video' | null;
  intro_text: string | null;
  intro_video_url: string | null;
  intro_video_type: 'upload' | 'youtube' | 'vimeo' | null;
  order_index: number;
  created_at: string;
  lecons?: FormationLecon[];
}

export interface FormationLecon {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  video_type: 'upload' | 'youtube' | 'vimeo' | null;
  duration_min: number | null;
  order_index: number;
  is_preview: boolean;
  created_at: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  thumbnail_url: string | null;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  category_id: string | null;
  author_id: string | null;
  published_at: string | null;
  scheduled_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  view_count: number;
  reading_time: number | null;
  allow_comments: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  author?: Profile;
}

export interface Commentaire {
  id: string;
  user_id: string;
  article_id: string | null;
  formation_id: string | null;
  content: string;
  status: 'approved' | 'pending' | 'rejected';
  parent_id: string | null;
  likes: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  user?: Profile;
  article?: Article;
  formation?: Formation;
}

export interface Produit {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  content: string | null;
  price: number;
  images: string[];
  type: 'chimique' | 'document' | 'autre';
  stock: number | null;
  is_digital: boolean;
  file_url: string | null;
  cas_number: string | null;
  msds_url: string | null;
  purity: string | null;
  unit: 'kg' | 'g' | 'mg' | 'L' | 'mL' | 'unite' | 'autre' | null;
  min_order: number;
  ghs_pictograms: string[];
  hazard_statements: string[];
  precautionary_statements: string[];
  signal_word: 'Danger' | 'Attention' | 'Aucun' | null;
  age_restricted: boolean;
  restricted_sale: boolean;
  adr_class: string | null;
  status: 'published' | 'draft' | 'archived';
  category_id: string | null;
  featured: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface ChemicalInventory {
  id: string;
  produit_id: string;
  batch_number: string;
  quantity_in: number | null;
  quantity_out: number | null;
  quantity_current: number | null;
  purity_percent: number | null;
  manufacturing_date: string | null;
  expiry_date: string | null;
  storage_location: string | null;
  safety_class: string | null;
  restricted: boolean;
  movement_type: 'entree' | 'vente' | 'perte' | 'retour' | 'peremption';
  order_id: string | null;
  user_id: string | null;
  notes: string | null;
  created_at: string;
  produit?: Produit;
}

export interface Commande {
  id: string;
  user_id: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  coupon_id: string | null;
  shipping_address: any;
  payment_method: 'stripe' | 'paypal' | null;
  payment_id: string | null;
  invoice_url: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  user?: Profile;
  items?: CommandeItem[];
}

export interface CommandeItem {
  id: string;
  commande_id: string;
  produit_id: string | null;
  formation_id: string | null;
  video_id: string | null;
  item_type: 'produit' | 'formation' | 'video';
  quantity: number;
  unit_price: number;
  created_at: string;
  produit?: Produit;
  formation?: Formation;
}

export interface Video {
  id: string;
  title: string;
  slug: string;
  video_url: string | null;
  video_type: 'upload' | 'youtube' | 'vimeo';
  access_type: 'public' | 'members' | 'paid';
  price: number;
  status: 'published' | 'draft' | 'archived';
  category_id: string | null;
  playlist_id: string | null;
  view_count: number;
  deleted_at: string | null;
  created_at: string;
  category?: Category;
  playlist?: VideoPlaylist;
}

export interface VideoPlaylist {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  usage_count: number;
  min_order_amount: number;
  is_active: boolean;
  created_at: string;
}

export interface Paiement {
  id: string;
  user_id: string | null;
  commande_id: string | null;
  amount: number;
  provider: 'stripe' | 'paypal';
  status: 'pending' | 'success' | 'failed' | 'refunded';
  metadata: any;
  created_at: string;
  user?: Profile;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'payment' | 'export' | '2fa_enable' | '2fa_disable' | 'session_revoke';
  table_name: string | null;
  record_id: string | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: Profile;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  device_name: string | null;
  is_active: boolean;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalEnrollments: number;
  totalUsers: number;
  revenueByMonth: { month: string; revenue: number }[];
  revenueByType: { type: string; value: number }[];
  recentOrders: Commande[];
  recentEnrollments: any[];
  topFormations: Formation[];
  topProducts: Produit[];
}

export interface TaxRate {
  id: string;
  country_code: string;
  country_name: string;
  rate_percent: number;
  is_active: boolean;
  created_at: string;
}
