"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  Power,
  Save,
  Shield,
  Tag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getShippingCountryLabel,
  ShippingRule,
  SHIPPING_COUNTRY_OPTIONS,
  SHIPPING_DEFAULT_COUNTRY_CODE,
} from "@/lib/shipping";
import { cn, formatPrice } from "@/lib/utils";

type ShippingFormState = {
  country_code: string;
  base_fee: number;
  free_threshold: number;
  is_active: boolean;
};

const DEFAULT_FORM: ShippingFormState = {
  country_code: "",
  base_fee: 10,
  free_threshold: 100,
  is_active: true,
};

function buildInitialForm(nextCountryCode: string): ShippingFormState {
  return {
    ...DEFAULT_FORM,
    country_code: nextCountryCode,
  };
}

export default function ShippingSettingsPage() {
  const [settings, setSettings] = useState<ShippingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ShippingFormState>(DEFAULT_FORM);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/shipping", {
        cache: "no-store",
      });
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(data?.error || "Impossible de charger les regles.");
      }

      setSettings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Shipping settings fetch error:", error);
      toast.error("Impossible de charger les regles de livraison.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  const existingCountryCodes = useMemo(
    () => new Set(settings.map((rule) => rule.country_code)),
    [settings],
  );

  const availableCountryOptions = useMemo(() => {
    return SHIPPING_COUNTRY_OPTIONS.filter((option) => {
      if (editingId) {
        const currentRule = settings.find((rule) => rule.id === editingId);
        if (currentRule?.country_code === option.code) return true;
      }

      return !existingCountryCodes.has(option.code);
    });
  }, [editingId, existingCountryCodes, settings]);

  const nextAvailableCountry = useMemo(() => {
    return availableCountryOptions[0]?.code ?? SHIPPING_DEFAULT_COUNTRY_CODE;
  }, [availableCountryOptions]);

  const startCreate = () => {
    setEditingId(null);
    setFormData(buildInitialForm(nextAvailableCountry));
  };

  const startEdit = (rule: ShippingRule) => {
    setEditingId(rule.id ?? null);
    setFormData({
      country_code: rule.country_code,
      base_fee: rule.base_fee,
      free_threshold: rule.free_threshold,
      is_active: rule.is_active,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(buildInitialForm(nextAvailableCountry));
  };

  useEffect(() => {
    if (!formData.country_code && nextAvailableCountry) {
      setFormData((current) => ({
        ...current,
        country_code: nextAvailableCountry,
      }));
    }
  }, [formData.country_code, nextAvailableCountry]);

  const saveRule = async () => {
    if (!formData.country_code) {
      toast.error("Choisissez un pays avant d'enregistrer la regle.");
      return;
    }

    setSaving(true);
    try {
      const isEditing = Boolean(editingId);
      const response = await fetch(
        isEditing ? `/api/admin/shipping/${editingId}` : "/api/admin/shipping",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Erreur lors de l'enregistrement.");
      }

      toast.success(isEditing ? "Regle mise a jour." : "Regle creee.");
      resetForm();
      await fetchSettings();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur lors de l'enregistrement.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const patchRule = async (id: string, payload: Partial<ShippingRule>) => {
    const response = await fetch(`/api/admin/shipping/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || "Impossible de mettre a jour la regle.");
    }
  };

  const toggleRule = async (rule: ShippingRule) => {
    setSaving(true);
    try {
      await patchRule(rule.id as string, { is_active: !rule.is_active });
      toast.success(rule.is_active ? "Regle desactivee." : "Regle activee.");
      await fetchSettings();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de modifier l'etat.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const moveRule = async (rule: ShippingRule, direction: -1 | 1) => {
    const currentIndex = settings.findIndex((entry) => entry.id === rule.id);
    const targetIndex = currentIndex + direction;
    const targetRule = settings[targetIndex];

    if (currentIndex === -1 || !targetRule) return;
    if (rule.country_code === SHIPPING_DEFAULT_COUNTRY_CODE) return;
    if (targetRule.country_code === SHIPPING_DEFAULT_COUNTRY_CODE) return;

    setSaving(true);
    try {
      await patchRule(rule.id as string, { priority: targetRule.priority });
      await patchRule(targetRule.id as string, { priority: rule.priority });
      await fetchSettings();
      toast.success("Priorite mise a jour.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de changer la priorite.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (rule: ShippingRule) => {
    if (rule.country_code === SHIPPING_DEFAULT_COUNTRY_CODE) {
      toast.error("La regle globale ne peut pas etre supprimee.");
      return;
    }

    if (!window.confirm(`Supprimer la regle ${rule.country_name} ?`)) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/shipping/${rule.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Impossible de supprimer la regle.");
      }

      toast.success("Regle supprimee.");
      if (editingId === rule.id) {
        resetForm();
      }
      await fetchSettings();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de supprimer la regle.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const isCreating = !editingId;
  const currentRule = settings.find((rule) => rule.id === editingId) ?? null;
  const canCreate = availableCountryOptions.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl animate-fade-in flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <h1 className="gradient-text text-4xl font-extrabold tracking-tight">
            Règles de livraison
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Gérez les tarifs d&apos;expédition de vos produits physiques avec
            précision. Les formations et vidéos numériques sont automatiquement
            exemptées de frais.
          </p>
        </div>
        <Button
          onClick={startCreate}
          disabled={saving || !canCreate}
          className="btn-shine bg-primary text-primary-foreground shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] gap-2 h-11 px-6 rounded-xl"
        >
          <Plus className="h-5 w-5" />
          Nouvelle règle
        </Button>
      </div>

      {/* Overview/Logic Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-primary/10 bg-gradient-to-br from-card to-muted/30 shadow-sm card-hover relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Truck className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Shield className="h-4 w-4" />
              </div>
              Logique de priorité
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            Les règles sont évaluées par priorité croissante. La règle globale (
            <span className="font-semibold text-foreground">Base</span>) sert de
            repli si aucune règle spécifique n&apos;est trouvée.
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-gradient-to-br from-card to-muted/30 shadow-sm card-hover relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <CreditCard className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Tag className="h-4 w-4" />
              </div>
              Seuils de livraison
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            Le panier applique automatiquement la livraison gratuite dès que le
            total atteint le seuil défini pour le pays de l&apos;utilisateur.
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1 border-primary/15 bg-primary/5 shadow-inner">
          <CardContent className="flex h-full flex-col justify-center gap-2 p-5 text-sm text-primary/80 italic">
            <div className="flex items-center gap-2 font-semibold not-italic text-primary mb-1">
              <Loader2 className="h-4 w-4 animate-spin-slow opacity-50" />
              Recalcul intelligent
            </div>
            L&apos;IP du visiteur détecte le pays par défaut, mais le choix
            final lors du checkout prime pour garantir l&apos;exactitude des
            frais.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* Configuration Form Card (Corrected) */}
        <Card className="h-fit border-primary/10 shadow-xl bg-card/50 backdrop-blur-sm sticky top-8">
          <CardHeader className="border-b border-border/50 pb-6">
            <CardTitle className="text-xl font-bold">
              {isCreating ? "Nouvelle règle" : "Modifier la règle"}
            </CardTitle>
            <CardDescription className="text-sm">
              {isCreating
                ? "Configurez les frais pour un nouveau pays ou une zone géographique."
                : `Édition de : ${currentRule?.country_name ?? "la règle sélectionnée"}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2.5">
              <Label
                htmlFor="country_code"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80"
              >
                Pays ou zone
              </Label>
              <Select
                value={formData.country_code}
                onValueChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    country_code: value,
                  }))
                }
                disabled={saving || (!editingId && !canCreate)}
              >
                <SelectTrigger
                  id="country_code"
                  className="h-11 bg-gray-500 border-border/60 focus:ring-primary/20 rounded-xl"
                >
                  <SelectValue placeholder="Choisir un pays" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-gray-600 border-border/60 shadow-2xl">
                  {availableCountryOptions.map((option) => (
                    <SelectItem
                      key={option.code}
                      value={option.code}
                      className="rounded-lg m-1"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
              <div className="space-y-2.5">
                <Label
                  htmlFor="base_fee"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80"
                >
                  Frais de livraison
                </Label>
                <div className="relative">
                  <Input
                    id="base_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-11 bg-background border-border/60 pl-9 focus:ring-primary/20 rounded-xl"
                    value={formData.base_fee}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        base_fee: Number(event.target.value || 0),
                      }))
                    }
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <Label
                  htmlFor="free_threshold"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80"
                >
                  Seuil de gratuité
                </Label>
                <div className="relative">
                  <Input
                    id="free_threshold"
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-11 bg-background border-border/60 pl-9 focus:ring-primary/20 rounded-xl"
                    value={formData.free_threshold}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        free_threshold: Number(event.target.value || 0),
                      }))
                    }
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Preview Box */}
            <div className="glass rounded-2xl border border-primary/20 p-4 transition-all animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <p className="font-bold text-foreground text-sm uppercase tracking-tight">
                  Aperçu du tarif
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-primary">
                  {getShippingCountryLabel(
                    formData.country_code || nextAvailableCountry,
                  )}
                </p>
                <p className="text-sm text-muted-foreground leading-snug">
                  Expédition standard à{" "}
                  <span className="font-bold text-foreground">
                    {formatPrice(formData.base_fee)}
                  </span>
                  . Offerte dès{" "}
                  <span className="font-bold text-foreground">
                    {formatPrice(formData.free_threshold)}
                  </span>{" "}
                  d&apos;achat.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={saveRule}
                disabled={saving || !formData.country_code}
                className="h-11 rounded-xl btn-shine gap-2 shadow-md"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {editingId
                  ? "Enregistrer les modifications"
                  : "Créer la règle d'expédition"}
              </Button>
              <Button
                variant="ghost"
                onClick={resetForm}
                disabled={saving}
                className="h-11 rounded-xl gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rules List Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Règles actives
              </h2>
              <p className="text-sm text-muted-foreground">
                Priorité faible = évaluation avant les autres.
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium text-primary">
              <Loader2 className="h-3 w-3 animate-spin-slow" />
              {settings.length} règle{settings.length > 1 ? "s" : ""} configurée
              {settings.length > 1 ? "s" : ""}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-3xl border border-dashed border-primary/20">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <p className="text-lg font-medium">Chargement des tarifs...</p>
              <p className="text-sm text-muted-foreground">
                Nous récupérons vos configurations de livraison.
              </p>
            </div>
          ) : settings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-3xl border border-dashed border-primary/20">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Truck className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">Aucune règle définie</p>
              <p className="text-sm text-muted-foreground">
                Commencez par créer une règle pour un pays spécifique.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {settings.map((rule, index) => {
                const isDefaultRule =
                  rule.country_code === SHIPPING_DEFAULT_COUNTRY_CODE;
                const canMoveUp =
                  index > 0 &&
                  !isDefaultRule &&
                  settings[index - 1]?.country_code !==
                    SHIPPING_DEFAULT_COUNTRY_CODE;
                const canMoveDown =
                  index < settings.length - 1 &&
                  !isDefaultRule &&
                  settings[index + 1]?.country_code !==
                    SHIPPING_DEFAULT_COUNTRY_CODE;

                return (
                  <div
                    key={rule.id}
                    className={cn(
                      "group relative rounded-[2rem] border p-1 transition-all duration-300",
                      rule.is_active
                        ? "border-border/50 bg-card/40 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5"
                        : "border-border/40 bg-muted/10 opacity-70 grayscale-[0.5]",
                      editingId === rule.id &&
                        "ring-2 ring-primary border-transparent bg-primary/5 shadow-2xl",
                    )}
                  >
                    <div className="flex flex-col gap-6 p-5 lg:flex-row lg:items-center">
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={cn(
                              "inline-flex h-9 min-w-9 items-center justify-center rounded-2xl text-[10px] font-bold tracking-tighter shadow-sm",
                              isDefaultRule
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent/10 text-accent border border-accent/20",
                            )}
                          >
                            {isDefaultRule ? "BASE" : `P${rule.priority}`}
                          </span>

                          <div className="flex flex-col">
                            <h3 className="text-xl font-bold text-foreground">
                              {rule.country_name}
                            </h3>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                              Code : {rule.country_code}
                            </p>
                          </div>

                          <span
                            className={cn(
                              "ml-auto rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest lg:ml-0",
                              rule.is_active
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : "bg-slate-500/10 text-slate-500 border border-slate-500/20",
                            )}
                          >
                            {rule.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-8">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Frais de base
                            </p>
                            <p className="text-lg font-bold text-primary">
                              {formatPrice(rule.base_fee)}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Livr. Gratuite dès
                            </p>
                            <p className="text-lg font-bold text-primary">
                              {formatPrice(rule.free_threshold)}
                            </p>
                          </div>
                          <div className="hidden lg:block h-10 w-px bg-border/40 self-end" />
                          <div className="space-y-0.5 self-end">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Application
                            </p>
                            <p className="text-sm font-medium italic">
                              {isDefaultRule
                                ? "Toute zone non définie"
                                : "Zone spécifique"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                        <div className="flex gap-1 bg-muted/30 p-1 rounded-xl border border-border/50">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-lg hover:bg-background shadow-xs hover:shadow-md transition-all"
                            onClick={() => moveRule(rule, -1)}
                            disabled={saving || !canMoveUp}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-lg hover:bg-background shadow-xs hover:shadow-md transition-all"
                            onClick={() => moveRule(rule, 1)}
                            disabled={saving || !canMoveDown}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          variant={rule.is_active ? "outline" : "secondary"}
                          size="sm"
                          onClick={() => toggleRule(rule)}
                          disabled={saving}
                          className="h-11 rounded-xl px-4 gap-2 font-semibold transition-all hover:scale-102"
                        >
                          <Power className="h-4 w-4" />
                          {rule.is_active ? "Désactiver" : "Activer"}
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all"
                          onClick={() => startEdit(rule)}
                          disabled={saving}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-11 w-11 rounded-xl disabled:opacity-30"
                          onClick={() => deleteRule(rule)}
                          disabled={saving || isDefaultRule}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="glass mt-4 flex flex-col gap-4 p-6 rounded-[2.5rem] border border-primary/10 sm:flex-row sm:items-center sm:justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-foreground">Vérification temps réel</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Le système recalcule dynamiquement les frais selon l&apos;adresse
              de livraison finale.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)]">
          Système Actif
        </div>
      </div>
    </div>
  );
}
