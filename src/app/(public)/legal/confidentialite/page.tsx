export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border p-8 lg:p-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">
            Politique de Confidentialité
          </h1>
          
          <div className="prose max-w-none prose-headings:text-slate-900 prose-p:text-slate-600">
            <p className="text-sm text-slate-500 mb-8">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>

            <h2>1. Introduction</h2>
            <p>
              Myke Industrie s'engage à protéger la vie privée de ses utilisateurs. 
              Cette politique de confidentialité explique comment nous collectons, utilisons 
              et protégeons vos données personnelles conformément au Règlement Général 
              sur la Protection des Données (RGPD).
            </p>

            <h2>2. Responsable du traitement</h2>
            <p>
              Le responsable du traitement des données est :<br />
              Myke Industrie<br />
              Email : contact@mykeindustrie.com
            </p>

            <h2>3. Données collectées</h2>
            <p>
              Nous collectons les données suivantes :
            </p>
            <ul>
              <li><strong>Données d'inscription</strong> : nom, prénom, email, mot de passe</li>
              <li><strong>Données de profil</strong> : photo, biographie, pays, téléphone</li>
              <li><strong>Données de navigation</strong> : adresse IP, cookies, historique</li>
              <li><strong>Données de transaction</strong> : historique d'achats, paiements</li>
            </ul>

            <h2>4. Finalités du traitement</h2>
            <p>
              Vos données sont utilisées pour :
            </p>
            <ul>
              <li>Gérer votre compte et votre accès aux services</li>
              <li>Traiter vos commandes et paiements</li>
              <li>Vous envoyer des informations sur nos services</li>
              <li>Améliorer nos services et votre expérience utilisateur</li>
              <li>Respecter nos obligations légales</li>
            </ul>

            <h2>5. Base légale du traitement</h2>
            <p>
              Le traitement de vos données repose sur :
            </p>
            <ul>
              <li>L'exécution du contrat (article 6.1.b du RGPD)</li>
              <li>Votre consentement (article 6.1.a du RGPD)</li>
              <li>L'intérêt légitime de l'entreprise (article 6.1.f du RGPD)</li>
              <li>Les obligations légales (article 6.1.c du RGPD)</li>
            </ul>

            <h2>6. Durée de conservation</h2>
            <p>
              Vos données sont conservées pendant :
            </p>
            <ul>
              <li>Données de compte : durée de l'inscription + 3 ans</li>
              <li>Données de transaction : 10 ans (obligation légale)</li>
              <li>Cookies : 13 mois maximum</li>
            </ul>

            <h2>7. Vos droits</h2>
            <p>
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul>
              <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
              <li><strong>Droit de rectification</strong> : corriger vos données</li>
              <li><strong>Droit à l'effacement</strong> : demander la suppression</li>
              <li><strong>Droit à la portabilité</strong> : récupérer vos données</li>
              <li><strong>Droit d'opposition</strong> : refuser certains traitements</li>
              <li><strong>Droit de limitation</strong> : restreindre le traitement</li>
            </ul>
            <p>
              Pour exercer ces droits, contactez-nous à : contact@mykeindustrie.com
            </p>

            <h2>8. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles pour 
              protéger vos données : chiffrement, accès restreints, sauvegardes régulières.
            </p>

            <h2>9. Cookies</h2>
            <p>
              Notre site utilise des cookies pour améliorer votre expérience. 
              Vous pouvez gérer vos préférences dans les paramètres de votre navigateur.
            </p>

            <h2>10. Modifications</h2>
            <p>
              Cette politique peut être modifiée. Les changements seront publiés sur cette page 
              avec la date de mise à jour.
            </p>

            <h2>11. Contact</h2>
            <p>
              Pour toute question concernant cette politique : contact@mykeindustrie.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
