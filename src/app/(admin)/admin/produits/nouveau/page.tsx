"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import {
  GHS_PICTOGRAMS,
  HAZARD_STATEMENTS,
  PRECAUTIONARY_STATEMENTS,
} from "@/lib/constants/produits";
import { useCreateProduit, useUpload, useCategories } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { generateSlug } from "@/lib/utils";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function NouveauProduitPage() {
  const router = useRouter();
  const { toast } = useToast();
  const uploadMutation = useUpload();
  const createMutation = useCreateProduit();
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();

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
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length <= 5) {
      setImages((prev) => [...prev, ...files]);
      setImagePreviews((prev) => [
        ...prev,
        ...files.map((f) => URL.createObjectURL(f)),
      ]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
    }
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
      return baseValid && documentFile !== null;
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
    if (productType === "document" && isElectronicDocument && !documentFile) {
      toast({
        title: "Erreur",
        description: "Veuillez uploader le document électronique.",
        variant: "destructive",
      });
      return;
    }

    try {
      let uploadedUrls: string[] = [];
      let documentUrl = "";

      // Upload images
      if (images.length > 0) {
        const result = await uploadMutation.mutateAsync({
          files: images,
          folder: "produits",
        });
        uploadedUrls = result.urls;
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
          throw new Error("Erreur lors de l'upload du document");
        }

        const data = await res.json();
        documentUrl = data.urls?.[0] || "";
        
        console.log("✅ Document uploadé:", {
          fileName: documentFile.name,
          url: documentUrl,
          response: data
        });
      }

      const submissionData = {
        ...formData,
        type: productType,
        images: uploadedUrls,
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

      console.log("📤 Données envoyées au serveur:", {
        name: submissionData.name,
        type: submissionData.type,
        file_url: submissionData.file_url,
        is_digital: submissionData.is_digital
      });

      createMutation.mutate(submissionData, {
        onSuccess: () => {
          toast({ title: "Succès", description: "Produit créé avec succès." });
          router.push("/admin/produits");
        },
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  };

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
            Nouveau produit
          </h1>
          <p className="text-[var(--muted)] mt-1">Créez un nouveau produit</p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={
            !isFormValid() ||
            createMutation.isPending ||
            uploadMutation.isPending
          }
          className="gap-2"
        >
          {createMutation.isPending || uploadMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Créer le produit
        </Button>
      </div>

      {/* Product Type Selection */}
      <div
        variants={itemVariants}
        className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]"
      >
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
          Type de produit
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              type: "chimique",
              label: "Chimique",
              icon: FlaskConical,
              color: "text-red-500",
            },
            {
              type: "document",
              label: "Document",
              icon: FileText,
              color: "text-blue-500",
            },
            {
              type: "autre",
              label: "Autre",
              icon: Box,
              color: "text-gray-500",
            },
          ].map(({ type, label, icon: Icon, color }) => (
            <button
              key={type}
              type="button"
              onClick={() => setProductType(type as any)}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all",
                productType === type
                  ? "border-[var(--primary)] bg-[var(--primary)]/5"
                  : "border-[var(--border)] hover:border-[var(--primary)]/50",
              )}
            >
              <Icon className={cn("w-8 h-8", color)} />
              <span className="font-medium text-[var(--foreground)]">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Type Selection - MOVED INSIDE FORM */}
          {productType === "document" && (
            <div
              variants={itemVariants}
              className="bg-blue-500/10 border border-blue-500 rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                📄 Type de document
              </h2>
              <div className="space-y-3">
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
                    Document physique{" "}
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
                    Document électronique{" "}
                    <span className="text-[var(--muted)] text-xs">
                      (à télécharger)
                    </span>
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Electronic Document Upload - IMMEDIATELY VISIBLE */}
          {productType === "document" && isElectronicDocument && (
            <div
              variants={itemVariants}
              className="bg-green-500/10 border border-green-500 rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold text-green-600 mb-4">
                ⬇️ Télécharger le document
              </h2>

              <div className="space-y-4">
                {documentFile ? (
                  <div className="flex items-center justify-between p-4 bg-green-500/20 border border-green-500 rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="text-sm font-bold text-[var(--foreground)]">
                          ✓ {documentFile.name}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeDocument}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <label className="block p-6 bg-[var(--background)] border-2 border-dashed border-green-500 rounded-xl text-center cursor-pointer hover:border-green-600 hover:bg-green-500/5 transition-all">
                    <Upload className="w-8 h-8 text-green-600 mx-auto mb-3" />
                    <p className="text-base font-bold text-[var(--foreground)]">
                      Cliquez pour uploader le document
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-2">
                      PDF, Word, Excel, PowerPoint, etc. (Max 100MB)
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
                  placeholder="Nom du produit"
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
                  placeholder="slug-du-produit"
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
                  placeholder="Description courte du produit"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
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
                  placeholder="Description détaillée du produit..."
                  rows={6}
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
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
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative w-24 h-24">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
              {images.length < 5 && (
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
              )}
            </div>
            <p className="text-xs text-[var(--muted)] mt-2">
              Maximum 5 images. JPG, PNG ou WebP.
            </p>
          </div>
          {/* Chemical Specific Fields */}
          {productType === "chimique" && (
            <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  Informations chimiques
                </h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Numéro CAS
                    </label>
                    <input
                      type="text"
                      value={formData.cas_number}
                      onChange={(e) =>
                        setFormData({ ...formData, cas_number: e.target.value })
                      }
                      placeholder="123-45-6"
                      className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Pureté (%)
                    </label>
                    <input
                      type="text"
                      value={formData.purity}
                      onChange={(e) =>
                        setFormData({ ...formData, purity: e.target.value })
                      }
                      placeholder="99.9%"
                      className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
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
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="Aucun">Aucun</option>
                    <option value="Attention">Attention</option>
                    <option value="Danger">Danger</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Pictogrammes GHS
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {GHS_PICTOGRAMS.map(({ code, name, icon: Icon }) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleGhsPictogram(code)}
                        className={cn(
                          "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                          formData.ghs_pictograms.includes(code)
                            ? "border-red-500 bg-red-500/10"
                            : "border-[var(--border)] hover:border-red-500/50",
                        )}
                        title={name}
                      >
                        <Icon className="w-6 h-6 text-red-500" />
                        <span className="text-xs text-[var(--muted)]">
                          {code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Phrases de danger (H)
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-[var(--background)] rounded-xl">
                    {HAZARD_STATEMENTS.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleHazardStatement(code)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-xs font-medium transition-colors",
                          formData.hazard_statements.includes(code)
                            ? "bg-red-500 text-white"
                            : "bg-[var(--card)] text-[var(--muted)] hover:bg-red-500/20",
                        )}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Phrases de précaution (P)
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-[var(--background)] rounded-xl">
                    {PRECAUTIONARY_STATEMENTS.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => togglePrecautionaryStatement(code)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-xs font-medium transition-colors",
                          formData.precautionary_statements.includes(code)
                            ? "bg-blue-500 text-white"
                            : "bg-[var(--card)] text-[var(--muted)] hover:bg-blue-500/20",
                        )}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Classe ADR
                    </label>
                    <input
                      type="text"
                      value={formData.adr_class}
                      onChange={(e) =>
                        setFormData({ ...formData, adr_class: e.target.value })
                      }
                      placeholder="Ex: 3"
                      className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.age_restricted}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          age_restricted: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">
                      Restriction 18+
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.restricted_sale}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          restricted_sale: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">
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
          {/* Pricing */}
          <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Tarification
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Prix (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_digital}
                  onChange={(e) =>
                    setFormData({ ...formData, is_digital: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm text-[var(--foreground)]">
                  Produit numérique
                </span>
              </label>
            </div>
          </div>

          {/* Stock */}
          {!formData.is_digital && (
            <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                Stock
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Quantité en stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Unité
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="kg">Kilogramme (kg)</option>
                    <option value="g">Gramme (g)</option>
                    <option value="mg">Milligramme (mg)</option>
                    <option value="L">Litre (L)</option>
                    <option value="mL">Millilitre (mL)</option>
                    <option value="unite">Unité</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Quantité minimale de commande
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.min_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_order: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Paramètres
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Catégorie
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value })
                  }
                  disabled={categoriesLoading}
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
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
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Statut
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
                  className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm text-[var(--foreground)]">
                  Mettre en vedette
                </span>
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
