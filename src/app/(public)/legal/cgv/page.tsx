const sections = [
  {
    title: "1. Preambule",
    body:
      "Les presentes Conditions Generales de Vente (CGV) regissent les relations contractuelles entre Myke Industrie et toute personne souhaitant acheter un service ou un produit sur le site.",
  },
  {
    title: "2. Objet",
    body:
      "Les CGV definissent les droits et obligations des parties dans le cadre de la vente en ligne de formations, produits, documents et videos proposes par le vendeur.",
  },
  {
    title: "3. Prix",
    body:
      "Les prix sont affiches sur le site au moment de la commande. Le vendeur peut modifier ses prix a tout moment, mais la commande est facturee au tarif valide lors du paiement.",
  },
  {
    title: "4. Commande",
    body:
      "La commande est consideree comme validee apres confirmation du paiement. Le vendeur se reserve le droit de refuser une commande en cas de litige ou de suspicion de fraude.",
  },
  {
    title: "5. Paiement",
    body:
      "Le paiement est realise via les moyens proposes sur la plateforme. Les donnees de paiement sont traitees par des prestataires securises.",
  },
  {
    title: "6. Livraison des contenus numeriques",
    body:
      "Les formations, documents et videos numeriques sont disponibles dans l espace client apres validation du paiement, sauf indication contraire sur la fiche produit.",
  },
  {
    title: "7. Droit de retractation",
    body:
      "Conformement a la reglementation applicable aux contenus numeriques fournis immediatement, le droit de retractation peut etre exclu apres accord explicite de l acheteur.",
  },
  {
    title: "8. Responsabilite",
    body:
      "Le vendeur ne saurait etre tenu responsable des dommages indirects lies a l utilisation du site ou des contenus, dans les limites autorisees par la loi.",
  },
  {
    title: "9. Propriete intellectuelle",
    body:
      "Tous les contenus du site restent la propriete exclusive de Myke Industrie. Toute reproduction ou diffusion non autorisee est interdite.",
  },
  {
    title: "10. Droit applicable",
    body:
      "Les presentes CGV sont soumises au droit applicable du pays d exploitation. En cas de litige, une resolution amiable sera recherchee avant toute action judiciaire.",
  },
] as const;

export default function CGVPage() {
  const updatedAt = new Date().toLocaleDateString("fr-FR");

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <article className="rounded-lg border bg-white p-8 shadow-sm lg:p-12">
          <h1 className="mb-3 text-3xl font-bold text-slate-900">
            Conditions Generales de Vente
          </h1>
          <p className="mb-8 text-sm text-slate-500">
            Derniere mise a jour : {updatedAt}
          </p>

          <div className="prose max-w-none prose-headings:text-slate-900 prose-p:text-slate-600">
            {sections.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

