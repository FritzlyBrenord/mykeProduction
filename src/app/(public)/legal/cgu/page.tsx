export default function CGUPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border p-8 lg:p-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">
            Conditions Générales d'Utilisation
          </h1>
          
          <div className="prose max-w-none prose-headings:text-slate-900 prose-p:text-slate-600">
            <p className="text-sm text-slate-500 mb-8">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>

            <h2>1. Acceptation des conditions</h2>
            <p>
              En accédant et en utilisant le site web Myke Industrie (mykeindustrie.com), 
              vous acceptez sans réserve les présentes Conditions Générales d'Utilisation (CGU). 
              Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser ce site.
            </p>

            <h2>2. Description du service</h2>
            <p>
              Myke Industrie est une plateforme en ligne proposant des formations professionnelles, 
              des articles techniques, des produits chimiques certifiés et des vidéos éducatives 
              destinés aux professionnels de l'industrie.
            </p>

            <h2>3. Inscription et compte utilisateur</h2>
            <p>
              Pour accéder à certaines fonctionnalités du site, vous devez créer un compte. 
              Vous êtes responsable de la confidentialité de vos identifiants et de toutes 
              les activités effectuées sous votre compte. Vous vous engagez à fournir des 
              informations exactes et à les mettre à jour régulièrement.
            </p>

            <h2>4. Propriété intellectuelle</h2>
            <p>
              Tous les contenus présents sur le site (textes, images, vidéos, formations, 
              logos, marques) sont protégés par les lois sur la propriété intellectuelle. 
              Toute reproduction, représentation, modification ou adaptation sans autorisation 
              préalable est strictement interdite.
            </p>

            <h2>5. Utilisation des contenus</h2>
            <p>
              Les formations et vidéos achetées sont destinées à un usage personnel et 
              non commercial. Vous ne pouvez pas les revendre, les partager ou les diffuser 
              publiquement sans autorisation écrite de Myke Industrie.
            </p>

            <h2>6. Comportement de l'utilisateur</h2>
            <p>
              Vous vous engagez à utiliser le site de manière légale et respectueuse. 
              Il est interdit de : publier des contenus illégaux, diffamatoires ou offensants ; 
              tenter d'accéder aux systèmes sans autorisation ; perturber le fonctionnement du site.
            </p>

            <h2>7. Commentaires et contributions</h2>
            <p>
              Les commentaires et contributions publiés par les utilisateurs sont modérés. 
              Myke Industrie se réserve le droit de supprimer tout contenu inapproprié 
              sans préavis.
            </p>

            <h2>8. Limitation de responsabilité</h2>
            <p>
              Myke Industrie s'efforce d'assurer l'exactitude des informations publiées 
              mais ne peut garantir leur exhaustivité. L'utilisation des contenus se fait 
              sous la responsabilité de l'utilisateur.
            </p>

            <h2>9. Modifications</h2>
            <p>
              Myke Industrie se réserve le droit de modifier ces CGU à tout moment. 
              Les modifications prennent effet dès leur publication sur le site. 
              Il est conseillé de consulter régulièrement cette page.
            </p>

            <h2>10. Droit applicable</h2>
            <p>
              Les présentes CGU sont soumises au droit français. En cas de litige, 
              les tribunaux français seront compétents.
            </p>

            <h2>11. Contact</h2>
            <p>
              Pour toute question concernant ces CGU, vous pouvez nous contacter à 
              l'adresse suivante : contact@mykeindustrie.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
