export const ARTICLE_CATEGORIES = [
    { id: 'general', label: 'Général' },
    { id: 'tutoriels', label: 'Tutoriels & Guides' },
    { id: 'actualites', label: 'Actualités' },
    { id: 'produits', label: 'Produits & Innovations' },
    { id: 'chimie', label: 'Chimie & Sciences' },
    { id: 'securite', label: 'Sécurité & Normes' },
    { id: 'entreprise', label: 'Vie de l\'entreprise' },
];

export function getCategoryLabel(categoryId: string): string {
    const category = ARTICLE_CATEGORIES.find((c) => c.id === categoryId);
    return category ? category.label : categoryId;
}
