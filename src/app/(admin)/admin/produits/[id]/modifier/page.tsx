"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Upload,
  FlaskConical,
  FileText,
  Box,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  useProduit,
  useUpdateProduit,
  useUpload,
  useCategories,
} from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { generateSlug, cn } from "@/lib/utils";
import {
  GHS_PICTOGRAMS,
  HAZARD_STATEMENTS,
  PRECAUTIONARY_STATEMENTS,
} from "@/lib/constants/produits";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function ModifierProduitPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const { data: product, isLoading: isLoadingProduct } = useProduit(id);
  const updateMutation = useUpdateProduit();
  const uploadMutation = useUpload();
  const { data: categories = [] } = useCategories();

  const [productType, setProductType] = useState<
    "chimique" | "document" | "autre"
  >("chimique");
  const [isElectronicDocument, setIsElectronicDocument] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    content: "",
    price: 0,
    stock: 0,
    unit: "unite",
    is_digital: false,
    category_id: "",
    status: "draft",
    featured: false,
    // Chemical specific
    cas_number: "",
    purity: "",
    min_order: 1,
    ghs_pictograms: [] as string[],
    hazard_statements: [] as string[],
    precautionary_statements: [] as string[],
    signal_word: "Aucun" as "Danger" | "Attention" | "Aucun",
    age_restricted: false,
    restricted_sale: false,
    adr_class: "",
  });

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [existingDocumentUrl, setExistingDocumentUrl] = useState<string>("");

  useEffect(() => {
    if (product) {
      setProductType(product.type);
      setFormData({
        name: product.name || "",
        slug: product.slug || "",
        description: product.description || "",
        content: product.content || "",
        price: product.price || 0,
        stock: product.stock || 0,
        unit: product.unit || "unite",
        is_digital: product.is_digital || false,
        category_id: product.category_id || "",
        status: product.status || "draft",
        featured: product.featured || false,
        cas_number: product.cas_number || "",
        purity: product.purity || "",
        min_order: product.min_order || 1,
        ghs_pictograms: product.ghs_pictograms || [],
        hazard_statements: product.hazard_statements || [],
        precautionary_statements: product.precautionary_statements || [],
        signal_word: product.signal_word || "Aucun",
        age_restricted: product.age_restricted || false,
        restricted_sale: product.restricted_sale || false,
        adr_class: product.adr_class || "",
      });
      setExistingImages(product.images || []);
      setIsElectronicDocument(product.is_digital || false);
      setExistingDocumentUrl(product.file_url || "");
    }
  }, [product]);

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeNewImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (url: string) => {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
    }
  };

  const removeExistingDocument = () => {
    setExistingDocumentUrl("");
  };

  const removeDocument = () => {
    setDocumentFile(null);
  };

  const isFormValid = () => {
    const baseValid =
      formData.name.trim() !== "" &&
      formData.slug.trim() !== "" &&
      formData.price > 0 &&
      (formData.is_digital || formData.stock > 0) &&
      formData.min_order > 0;

    // Vérification supplémentaire pour documents électroniques
    if (productType === "document" && isElectronicDocument) {
      return baseValid && (documentFile !== null || existingDocumentUrl !== "");
    }

    return baseValid;
  };
  const toggleGhsPictogram = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      ghs_pictograms: prev.ghs_pictograms.includes(code)
        ? prev.ghs_pictograms.filter((c) => c !== code)
        : [...prev.ghs_pictograms, code],
    }));
  };

  const toggleHazardStatement = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      hazard_statements: prev.hazard_statements.includes(code)
        ? prev.hazard_statements.filter((c) => c !== code)
        : [...prev.hazard_statements, code],
    }));
  };

  const togglePrecautionaryStatement = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      precautionary_statements: prev.precautionary_statements.includes(code)
        ? prev.precautionary_statements.filter((c) => c !== code)
        : [...prev.precautionary_statements, code],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du produit est requis.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.slug.trim()) {
      toast({
        title: "Erreur",
        description: "Le slug est requis.",
        variant: "destructive",
      });
      return;
    }

    if (formData.price <= 0) {
      toast({
        title: "Erreur",
        description: "Le prix doit être supérieur à 0.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.is_digital && formData.stock <= 0) {
      toast({
        title: "Erreur",
        description:
          "La quantité en stock est requise pour les produits physiques.",
        variant: "destructive",
      });
      return;
    }

    if (formData.min_order <= 0) {
      toast({
        title: "Erreur",
        description: "La quantité minimale doit être supérieure à 0.",
        variant: "destructive",
      });
      return;
    }

    // Validation pour documents électroniques
    if (
      productType === "document" &&
      isElectronicDocument &&
      !documentFile &&
      !existingDocumentUrl
    ) {
      toast({
        title: "Erreur",
        description: "Veuillez uploader le document électronique.",
        variant: "destructive",
      });
      return;
    }

    try {
      let finalImages = [...existingImages];
      let documentUrl = existingDocumentUrl;

      if (images.length > 0) {
        const uploadResult = await uploadMutation.mutateAsync({
          files: images,
          folder: "produits",
        });
        finalImages = [...finalImages, ...uploadResult.urls];
      }

      // Upload document électronique
      if (documentFile) {
        const formDataDoc = new FormData();
        formDataDoc.append("file", documentFile);
        formDataDoc.append("folder", "documents");

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formDataDoc,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`Document upload failed: ${errorData.error}`);
        }

        const data = await res.json();
        documentUrl = data.urls?.[0] || existingDocumentUrl;
        
        console.log("✅ Document uploadé (modification):", {
          fileName: documentFile.name,
          url: documentUrl,
          response: data
        });
      }

      const submissionData = {
        ...formData,
        id,
        type: productType,
        images: finalImages,
        file_url: documentUrl,
        is_digital:
          productType === "document" && isElectronicDocument
            ? true
            : formData.is_digital,
        stock:
          formData.is_digital ||
          (productType === "document" && isElectronicDocument)
            ? null
            : formData.stock,
      };

      console.log("📤 Données envoyées (modification):", {
        name: submissionData.name,
        type: submissionData.type,
        file_url: submissionData.file_url,
        is_digital: submissionData.is_digital
      });

      updateMutation.mutate(
        { id, data: submissionData },
        {
          onSuccess: () => {
            toast({
              title: "Succès",
              description: "Produit mis à jour avec succès.",
            });
            router.push("/admin/produits");
          },
        },
      );
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  };

  if (isLoadingProduct) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <div variants={itemVariants} className="flex items-center gap-4">
        <Link href="/admin/produits">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Modifier le produit
          </h1>
          <p className="text-[var(--muted)] mt-1">{formData.name}</p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={
            !isFormValid() ||
            updateMutation.isPending ||
            uploadMutation.isPending
          }
          className="gap-2"
        >
          {updateMutation.isPending || uploadMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Enregistrer les modifications
        </Button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Main Content */}
        <div variants={itemVariants} className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Informations de base
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Nom du produit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Description courte
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Description complète
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  rows={6}
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Images
            </h2>

            <div className="flex flex-wrap gap-4">
              {/* Existing Images */}
              {existingImages.map((url, index) => (
                <div key={`existing-${index}`} className="relative w-24 h-24">
                  <img
                    src={url}
                    alt="Product"
                    className="w-full h-full object-cover rounded-xl border border-[var(--border)]"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(url)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* New Previews */}
              {imagePreviews.map((preview, index) => (
                <div key={`new-${index}`} className="relative w-24 h-24">
                  <img
                    src={preview}
                    alt="New"
                    className="w-full h-full object-cover rounded-xl border border-[var(--primary)]/30"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-400 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}

              <label className="w-24 h-24 bg-[var(--background)] border-2 border-dashed border-[var(--border)] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[var(--primary)] transition-colors">
                <Upload className="w-6 h-6 text-[var(--muted)]" />
                <span className="text-xs text-[var(--muted)] mt-1">
                  Ajouter
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Document Type Selection */}
          {productType === "document" && (
            <div
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]"
            >
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                Type de document
              </h2>
              <div className="space-y-4">
                <label
                  className="flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all"
                  style={{
                    borderColor: !isElectronicDocument
                      ? "var(--primary)"
                      : "var(--border)",
                    backgroundColor: !isElectronicDocument
                      ? "var(--primary)/5"
                      : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    checked={!isElectronicDocument}
                    onChange={() => setIsElectronicDocument(false)}
                    className="w-5 h-5 accent-[var(--primary)]"
                  />
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    Document physique (PDF, Microsoft Office...)
                  </span>
                </label>
                <label
                  className="flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all"
                  style={{
                    borderColor: isElectronicDocument
                      ? "var(--primary)"
                      : "var(--border)",
                    backgroundColor: isElectronicDocument
                      ? "var(--primary)/5"
                      : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    checked={isElectronicDocument}
                    onChange={() => setIsElectronicDocument(true)}
                    className="w-5 h-5 accent-[var(--primary)]"
                  />
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    Document électronique (à télécharger)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Electronic Document Upload */}
          {productType === "document" && isElectronicDocument && (
            <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                Document à télécharger
              </h2>

              <div className="space-y-4">
                {existingDocumentUrl && !documentFile && (
                  <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500 rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          Document actuel
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {existingDocumentUrl.split("/").pop()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeExistingDocument}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                )}

                {documentFile ? (
                  <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500 rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {documentFile.name}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeDocument}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <label className="block p-8 bg-[var(--background)] border-2 border-dashed border-[var(--border)] rounded-xl text-center cursor-pointer hover:border-[var(--primary)] transition-colors">
                    <Upload className="w-8 h-8 text-[var(--muted)] mx-auto mb-2" />
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Cliquez pour uploader un nouveau document
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      PDF, Word, Excel, etc. (Max 100MB)
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                      onChange={handleDocumentChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Chemical Specific Fields */}
          {productType === "chimique" && (
            <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
              <div className="flex items-center gap-2 mb-6 text-red-500">
                <FlaskConical className="w-5 h-5" />
                <h2 className="text-lg font-semibold">
                  Spécifications chimiques
                </h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Numéro CAS
                    </label>
                    <input
                      type="text"
                      value={formData.cas_number}
                      onChange={(e) =>
                        setFormData({ ...formData, cas_number: e.target.value })
                      }
                      placeholder="Ex: 123-45-6"
                      className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Pureté
                    </label>
                    <input
                      type="text"
                      value={formData.purity}
                      onChange={(e) =>
                        setFormData({ ...formData, purity: e.target.value })
                      }
                      className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Mot signal
                  </label>
                  <select
                    value={formData.signal_word}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        signal_word: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl"
                  >
                    <option value="Aucun">Aucun</option>
                    <option value="Attention">Attention</option>
                    <option value="Danger">Danger</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-red-500/80">
                    Pictogrammes GHS
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                    {GHS_PICTOGRAMS.map(({ code, name, icon: Icon }) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleGhsPictogram(code)}
                        className={cn(
                          "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                          formData.ghs_pictograms.includes(code)
                            ? "border-red-500 bg-red-500/10"
                            : "border-[var(--border)] hover:border-red-500/40",
                        )}
                        title={name}
                      >
                        <Icon className="w-5 h-5 text-red-500" />
                        <span className="text-[10px] uppercase font-bold text-[var(--muted)]">
                          {code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Phrases de danger (H)
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                      {HAZARD_STATEMENTS.map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => toggleHazardStatement(code)}
                          className={cn(
                            "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all",
                            formData.hazard_statements.includes(code)
                              ? "bg-red-500 text-white shadow-lg"
                              : "bg-[var(--card)] text-[var(--muted)] hover:bg-red-500/10",
                          )}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Phrases de précaution (P)
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                      {PRECAUTIONARY_STATEMENTS.map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => togglePrecautionaryStatement(code)}
                          className={cn(
                            "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all",
                            formData.precautionary_statements.includes(code)
                              ? "bg-blue-500 text-white shadow-lg"
                              : "bg-[var(--card)] text-[var(--muted)] hover:bg-blue-500/10",
                          )}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-6 p-4 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                        formData.age_restricted
                          ? "bg-amber-500 border-amber-500"
                          : "border-[var(--border)] group-hover:border-amber-500/50",
                      )}
                    >
                      {formData.age_restricted && (
                        <div className="w-2 h-2 bg-white rounded-full transition-transform scale-100" />
                      )}
                      <input
                        type="checkbox"
                        checked={formData.age_restricted}
                        className="hidden"
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            age_restricted: e.target.checked,
                          })
                        }
                      />
                    </div>
                    <span className="text-sm font-medium">Restriction 18+</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                        formData.restricted_sale
                          ? "bg-amber-500 border-amber-500"
                          : "border-[var(--border)] group-hover:border-amber-500/50",
                      )}
                    >
                      {formData.restricted_sale && (
                        <div className="w-2 h-2 bg-white rounded-full transition-transform scale-100" />
                      )}
                      <input
                        type="checkbox"
                        checked={formData.restricted_sale}
                        className="hidden"
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            restricted_sale: e.target.checked,
                          })
                        }
                      />
                    </div>
                    <span className="text-sm font-medium">
                      Vente restreinte
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div variants={itemVariants} className="space-y-6">
          {/* Pricing & Digital */}
          <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold mb-4">Prix</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Prix (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl font-bold text-[var(--primary)]"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-[var(--background)] rounded-xl border border-[var(--border)] border-dashed">
                <input
                  type="checkbox"
                  checked={formData.is_digital}
                  onChange={(e) =>
                    setFormData({ ...formData, is_digital: e.target.checked })
                  }
                  className="w-5 h-5 accent-[var(--primary)]"
                />
                <span className="text-sm font-medium">Produit numérique</span>
              </label>
            </div>
          </div>

          {/* Stock */}
          {!formData.is_digital && (
            <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="text-lg font-semibold mb-4 text-amber-500">
                Stock & Logistique
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Quantité
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Unité
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="mg">mg</option>
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                    <option value="unite">Unité</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Publishing */}
          <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold mb-4">Publication</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Catégorie
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl"
                >
                  <option value="">Sans catégorie</option>
                  {categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as any })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl"
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                  <option value="archived">Archivé</option>
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) =>
                    setFormData({ ...formData, featured: e.target.checked })
                  }
                  className="w-5 h-5 accent-[var(--primary)]"
                />
                <span className="text-sm font-medium">Mis en vedette</span>
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
