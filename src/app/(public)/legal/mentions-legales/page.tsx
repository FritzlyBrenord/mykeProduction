export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border p-8 lg:p-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">
            Mentions Légales
          </h1>
          
          <div className="prose max-w-none prose-headings:text-slate-900 prose-p:text-slate-600">
            <p className="text-sm text-slate-500 mb-8">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>

            <h2>1. Éditeur du site</h2>
            <p>
              <strong>Myke Industrie</strong><br />
              Société par actions simplifiée (SAS)<br />
              Capital social : 100 000 €<br />
              RCS Paris : 123 456 789<br />
              N° TVA intracommunautaire : FR 12 345 678 901
            </p>
            <p>
              <strong>Siège social :</strong><br />
              123 Avenue des Champs-Élysées<br />
              75008 Paris, France
            </p>
            <p>
              <strong>Contact :</strong><br />
              Email : contact@mykeindustrie.com<br />
              Téléphone : +33 1 23 45 67 89
            </p>

            <h2>2. Directeur de la publication</h2>
            <p>
              Le directeur de la publication est Monsieur Jean Dupont, 
              en qualité de Président de Myke Industrie.
            </p>

            <h2>3. Hébergement</h2>
            <p>
              Le site mykeindustrie.com est hébergé par :<br />
              <strong>Vercel Inc.</strong><br />
              340 S Lemon Ave #4133<br />
              Walnut, CA 91789<br />
              États-Unis
            </p>

            <h2>4. Propriété intellectuelle</h2>
            <p>
              L'ensemble du contenu du site (textes, images, vidéos, logos, marques, etc.) 
              est la propriété exclusive de Myke Industrie ou de ses partenaires. 
              Toute reproduction, représentation ou utilisation sans autorisation préalable 
              est interdite et constitue une contrefaçon sanctionnée par les articles 
              L.335-2 et suivants du Code de la propriété intellectuelle.
            </p>

            <h2>5. Activité réglementée</h2>
            <p>
              Myke Industrie est soumise à la réglementation relative à la vente de 
              produits chimiques. L'entreprise détient les autorisations nécessaires 
              pour la distribution de substances et mélanges conformément au règlement 
              REACH et à la réglementation CLP.
            </p>

            <h2>6. Médiation de la consommation</h2>
            <p>
              Conformément aux articles L.611-1 et suivants du Code de la consommation, 
              le consommateur peut recourir gratuitement à un médiateur de la consommation 
              en cas de litige avec Myke Industrie.
            </p>
            <p>
              Médiateur : Centre de Médiation et d'Arbitrage de Paris (CMAP)<br />
              Site web : www.cmap.fr<br />
              Adresse : 39 avenue Franklin D. Roosevelt, 75008 Paris
            </p>

            <h2>7. Données personnelles</h2>
            <p>
              Pour plus d'informations sur la collecte et le traitement de vos données 
              personnelles, veuillez consulter notre 
              <a href="/legal/confidentialite" className="text-blue-600 hover:underline"> Politique de Confidentialité</a>.
            </p>

            <h2>8. Cookies</h2>
            <p>
              Le site utilise des cookies pour améliorer l'expérience utilisateur. 
              Pour en savoir plus sur l'utilisation des cookies, veuillez consulter 
              notre Politique de Confidentialité.
            </p>

            <h2>9. Liens hypertextes</h2>
            <p>
              Le site peut contenir des liens vers d'autres sites. Myke Industrie 
              décline toute responsabilité quant au contenu de ces sites externes.
            </p>

            <h2>10. Droit applicable</h2>
            <p>
              Les présentes mentions légales sont soumises au droit français. 
              En cas de litige, les tribunaux français seront compétents.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
