# 📋 Migration Guide - Planification de Publication

## ❌ Erreur: "formations_status_check"

Si vous recevez cette erreur, la migration SQL n'a pas été appliquée à votre base de données Supabase.

## ✅ Solution: Appliquer la Migration SQL

### Étapes:

1. **Accédez à Supabase Dashboard**
   - Allez sur [supabase.com](https://supabase.com)
   - Connectez-vous à votre projet

2. **Ouvrez l'SQL Editor**
   - Cliquez sur "SQL Editor" dans le menu latéral gauche
   - Cliquez sur "New Query"

3. **Copiez et collez le SQL**

   ```sql
   -- Migration pour ajouter la planification de publication
   ALTER TABLE formations ADD COLUMN scheduled_publish_at TIMESTAMP WITH TIME ZONE;
   ALTER TABLE formations ADD COLUMN scheduled_timezone VARCHAR(255) DEFAULT 'UTC';
   ALTER TABLE formations ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;

   -- Modifier la contrainte du statut pour inclure 'scheduled'
   -- D'abord, supprimer l'ancienne contrainte
   ALTER TABLE formations DROP CONSTRAINT IF EXISTS formations_status_check;

   -- Ajouter la nouvelle contrainte avec le statut 'scheduled'
   ALTER TABLE formations
   ADD CONSTRAINT formations_status_check
   CHECK (status IN ('draft', 'published', 'archived', 'scheduled'));

   -- Index pour les requêtes de formations planifiées
   CREATE INDEX idx_formations_scheduled ON formations(scheduled_publish_at, status)
   WHERE scheduled_publish_at IS NOT NULL AND status = 'scheduled';
   ```

4. **Exécutez la requête**
   - Cliquez sur le bouton "Run" ou appuyez sur Ctrl+Enter

5. **Rafraîchissez votre application**
   - Fermez et réouvrez votre navigateur
   - La fonctionnalité de planification est maintenant disponible! ✨

## 🎯 Après la Migration

Vous pouvez maintenant:

- ✅ Créer des formations avec statut "Planifiée"
- ✅ Sélectionner une date/heure de publication
- ✅ Choisir un fuseau horaire (15+ pays supportés)
- ✅ La formation sera automatiquement publiée à l'heure prévue
- ✅ Voir la date de publication réelle dans les détails

## 📞 Questions?

Si vous avez d'autres erreurs, vérifiez que:

- [ ] Vous êtes connecté au bon projet Supabase
- [ ] Le nom de la table est bien "formations" (vérifiez la casse)
- [ ] Vous avez exécuté le SQL complet sans modification
