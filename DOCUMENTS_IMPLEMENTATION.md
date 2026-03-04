# 🎯 Implémentation de la gestion des documents électroniques

## Changements effectués

### 1. **Base de données** ✅

- ✅ La colonne `file_url` existe déjà dans la table `produits`
- ✅ Création d'une migration SQL pour le bucket Supabase: `007_documents_bucket.sql`
  - Créer le bucket "documents" via le dashboard Supabase
  - Configurer les politiques RLS pour l'accès aux documents

### 2. **Formulaire création de produits** (`nouveau/page.tsx`) ✅

- ✅ Ajout d'une sélection "Type de document" quand `type === 'document'`
  - Radio button: "Document physique" ou "Document électronique"
- ✅ Affichage conditionnel d'un champ d'upload si c'est électronique
- ✅ Validation: le fichier est obligatoire pour les documents électroniques
- ✅ Upload du fichier au dossier `/documents` dans Supabase Storage

### 3. **Formulaire modification de produits** (`modifier/page.tsx`) ✅

- ✅ Même logique que le formulaire de création
- ✅ Gestion des documents existants
- ✅ Possibilité de remplacer le document

### 4. **API d'upload** (`/api/admin/upload`)

- ✅ Déjà supporté pour les images et documents
- ✅ Utilise le dossier spécifié dans le body

## Points d'attention

### 📋 À faire manuellement dans Supabase Dashboard:

1. **Créer le bucket "documents"**
   - Storage > New Bucket
   - Name: `documents`
   - Public: True (ou Private si accès restreint)
   - Max file size: 100MB

2. **Ajouter les politiques RLS** (optionnel, les migrations SQL incluent des exemples)

## Structure des uploads

```
documents/
├── {product_id}/
│   └── {filename}
```

## Fichiers modifiés

- ✅ `src/app/(admin)/admin/produits/nouveau/page.tsx` - Création avec documents
- ✅ `src/app/(admin)/admin/produits/[id]/modifier/page.tsx` - Modification avec documents
- ✅ `sql/007_documents_bucket.sql` - Configuration Supabase

## Validation côté formulaire

Pour les documents électroniques:

- ✅ Nombre minimum de champs requis validé
- ✅ Le fichier doit être uploadé
- ✅ Le bouton est désactivé jusqu'à ce que tous les champs obligatoires soient remplis

## Types de fichiers acceptés

```
.pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .txt, .zip
```

(Modifiable dans le accept attribute de l'input file)

---

**Status**: ✅ Prêt à tester!
N'oubliez pas créer le bucket "documents" dans Supabase.
