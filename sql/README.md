# SQL

Les migrations doivent etre executees dans l'ordre numerique (`001` -> `016`).

- `001_myke_industrie_v3.sql`: schema de base (tables, trigger/function, contraintes).
- `002_rls_phase0.sql`: couverture RLS Phase 0 (activation RLS + policies sur tables core).
- `003_formations_module_intro.sql`: colonnes d'introduction optionnelle sur `formation_modules`.
- `009_checkout_orders_workflow.sql`: creation `commande_items` + policies RLS.
- `010_articles_cover_image_upload.sql`: stockage image de couverture des articles.
- `011_article_views_comment_likes.sql`: vues + likes commentaires/articles.
- `012_publish_existing_products.sql`: publication en masse produits existants.
- `013_orders_tracking_delivery.sql`: suivi logistique commande (date prevue + timeline).
- `014_order_items_split_workflow.sql`: workflow separe par item de commande (formation vs produit).
- `015_video_social_features.sql`: likes/commentaires/vues uniques pour les videos.
- `016_visitor_sessions.sql`: tracking global des visiteurs anonymes (admin analytics).
