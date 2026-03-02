"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/useAuth";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Mail,
  MapPin,
  Phone,
  Save,
  Trash2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface ProfileResponse {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  country: string | null;
  bio: string | null;
  createdAt: string | null;
}

const DELETE_CONFIRM_TEXT = "SUPPRIMER";

export default function ProfilePage() {
  const { user, refreshUser, signOut } = useAuth();
  const router = useRouter();
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    bio: "",
    avatarUrl: "" as string | null,
    createdAt: "" as string | null,
  });

  const isDeleteConfirmValid = deleteConfirm.trim() === DELETE_CONFIRM_TEXT;

  const memberSinceLabel = useMemo(() => {
    if (!formData.createdAt) return "";
    const date = new Date(formData.createdAt);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("fr-FR");
  }, [formData.createdAt]);

  useEffect(() => {
    if (!user) {
      setIsLoadingProfile(false);
      return;
    }

    const loadProfile = async () => {
      setIsLoadingProfile(true);

      try {
        const response = await fetch("/api/account/profile", { method: "GET" });
        if (!response.ok) {
          throw new Error("Impossible de charger le profil.");
        }

        const data = (await response.json()) as ProfileResponse;
        setFormData({
          fullName: data.fullName || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          country: data.country || "",
          bio: data.bio || "",
          avatarUrl: data.avatarUrl || user.avatar_url || null,
          createdAt: data.createdAt || user.created_at || null,
        });
      } catch (error) {
        console.error(error);
        setFormData({
          fullName: user.full_name || "",
          email: user.email || "",
          phone: user.phone || "",
          country: user.country || "",
          bio: user.bio || "",
          avatarUrl: user.avatar_url || null,
          createdAt: user.created_at || null,
        });
        toast.error("Profil partiellement charge. Reessayez plus tard.");
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = formData.fullName.trim();
    if (!trimmedName) {
      toast.error("Le nom complet est obligatoire.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
          phone: formData.phone,
          country: formData.country,
          bio: formData.bio,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        toast.error(body?.error || "Echec de mise a jour du profil.");
        return;
      }

      const data = body as ProfileResponse;
      setFormData((prev) => ({
        ...prev,
        fullName: data.fullName || "",
        email: data.email || prev.email,
        phone: data.phone || "",
        country: data.country || "",
        bio: data.bio || "",
        avatarUrl: data.avatarUrl || prev.avatarUrl,
        createdAt: data.createdAt || prev.createdAt,
      }));

      await refreshUser();
      toast.success("Profil mis a jour avec succes.");
    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue pendant la mise a jour.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!isDeleteConfirmValid || isDeleting) return;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirm.trim() }),
      });
      const body = await response.json();

      if (!response.ok) {
        toast.error(body?.error || "Impossible de supprimer le compte.");
        return;
      }

      toast.success("Compte supprime definitivement.");
      await signOut();
      router.replace("/auth/inscription");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue pendant la suppression du compte.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-8 text-center text-slate-600">
              Vous devez etre connecte pour acceder a votre profil.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Mon profil</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-white border border-slate-200 shadow-sm text-slate-900">
              <CardContent className="p-6 text-center">
                <div className="relative inline-block mb-4">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={formData.avatarUrl || undefined} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-4xl">
                      {formData.fullName?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <h2 className="font-semibold text-lg text-slate-900">
                  {formData.fullName || "Utilisateur"}
                </h2>
                <p className="text-slate-500 text-sm max-w-full break-all mt-1">
                  {formData.email}
                </p>
                {memberSinceLabel && (
                  <p className="text-sm text-slate-400 mt-2">
                    Membre depuis {memberSinceLabel}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2 bg-white border border-slate-200 shadow-sm text-slate-900">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-slate-900">
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingProfile ? (
                  <p className="text-sm text-slate-500">
                    Chargement du profil...
                  </p>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fullName" className="text-slate-700">
                          Nom complet
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="fullName"
                            value={formData.fullName}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                fullName: e.target.value,
                              }))
                            }
                            className="pl-10 bg-white text-slate-900 placeholder:text-slate-400 border-slate-300"
                            maxLength={120}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-slate-700">
                          Email
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            className="pl-10 bg-slate-100 text-slate-600 border-slate-300"
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone" className="text-slate-700">
                          Telephone
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                phone: e.target.value,
                              }))
                            }
                            className="pl-10 bg-white text-slate-900 placeholder:text-slate-400 border-slate-300"
                            placeholder="+509 00 00 00 00"
                            maxLength={30}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="country" className="text-slate-700">
                          Pays
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="country"
                            value={formData.country}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                country: e.target.value,
                              }))
                            }
                            className="pl-10 bg-white text-slate-900 placeholder:text-slate-400 border-slate-300"
                            placeholder="Haiti"
                            maxLength={80}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="bio" className="text-slate-700">
                        Bio
                      </Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            bio: e.target.value,
                          }))
                        }
                        placeholder="Parlez-nous de vous..."
                        rows={4}
                        maxLength={800}
                        className="bg-white text-slate-900 placeholder:text-slate-400 border-slate-300"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-950"
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving
                        ? "Enregistrement..."
                        : "Enregistrer les modifications"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-8 bg-white border border-red-200 shadow-sm text-slate-900">
            <CardHeader className="border-b border-red-100">
              <CardTitle className="text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Supprimer mon compte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-red-700">
                La suppression de compte est irreversible. Toutes vos donnees
                personnelles associees a ce compte seront supprimees.
              </p>
              <div className="space-y-2">
                <Label htmlFor="deleteConfirm" className="text-slate-700">
                  Tapez <strong>{DELETE_CONFIRM_TEXT}</strong> pour confirmer
                </Label>
                <Input
                  id="deleteConfirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={DELETE_CONFIRM_TEXT}
                  className="bg-white text-slate-900 placeholder:text-slate-400 border-red-200"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={!isDeleteConfirmValid || isDeleting}
                className="bg-black p-2"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Suppression..." : "Supprimer mon compte"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
