"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatPrice } from "@/lib/utils/format";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface EnrollmentItem {
  id: string;
  formation_id: string;
  enrolled_at: string;
  completed_at: string | null;
  progress: number | null;
  formation: {
    id: string;
    title: string;
    slug: string;
    thumbnail_url: string | null;
    duration_hours: number | null;
    language: string | null;
    level: string | null;
    is_free: boolean;
    price: number;
    created_at: string;
  } | null;
}

interface PendingFormationItem {
  order_id: string;
  order_status: string;
  ordered_at: string;
  item_total_price: number;
  formation: {
    id: string;
    title: string;
    slug: string;
    thumbnail_url: string | null;
    duration_hours: number | null;
    language: string | null;
    level: string | null;
    is_free: boolean;
    price: number;
    created_at: string;
  };
}

function statusLabel(status: string) {
  switch (status) {
    case "paid":
      return "Payee";
    case "processing":
      return "En traitement";
    case "shipped":
      return "En verification";
    case "delivered":
      return "Pret pour activation";
    default:
      return "En attente";
  }
}

function pendingActivationMessage(status: string) {
  if (status === "delivered") {
    return "Paiement confirme. Activation admin en cours.";
  }
  if (status === "paid" || status === "processing" || status === "shipped") {
    return "Commande validee. Activation admin en attente.";
  }
  return "Commande en attente de validation.";
}

function shortOrderId(orderId: string) {
  return `#${orderId.slice(0, 8)}`;
}

export default function MyFormationsPage() {
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [pendingFormations, setPendingFormations] = useState<
    PendingFormationItem[]
  >([]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        console.log("Compte Formations - Début chargement");
        setLoading(true);
        const response = await fetch("/api/compte/formations", {
          credentials: "include",
        });

        console.log("Compte Formations - Response status:", response.status);
        const data = await response.json();
        console.log("Compte Formations - Données reçues:", data);

        if (!response.ok) {
          throw new Error(data?.error || "Erreur chargement formations compte");
        }

        if (!active) return;
        setEnrollments(
          Array.isArray(data?.enrollments)
            ? (data.enrollments as EnrollmentItem[])
            : [],
        );
        setPendingFormations(
          Array.isArray(data?.pending_formations)
            ? (data.pending_formations as PendingFormationItem[])
            : [],
        );
      } catch (error) {
        console.error("Account formations load error:", error);
        toast.error("Impossible de charger vos formations.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const inProgress = useMemo(
    () => enrollments.filter((entry) => Number(entry.progress ?? 0) < 100),
    [enrollments],
  );
  const completed = useMemo(
    () => enrollments.filter((entry) => Number(entry.progress ?? 0) >= 100),
    [enrollments],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-amber-200 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-800 p-6 md:p-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Mes formations
          </h1>
          <p className="text-slate-200 mt-2 max-w-3xl">
            Retrouvez toutes vos commandes de formations, suivez les activations
            en attente et continuez les cours autorises.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Formations actives</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {enrollments.length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">
                En attente d&apos;autorisation
              </p>
              <p className="text-3xl font-bold text-amber-700 mt-1">
                {pendingFormations.length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Formations terminees</p>
              <p className="text-3xl font-bold text-emerald-700 mt-1">
                {completed.length}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {loading ? (
          <Card className="border-slate-200">
            <CardContent className="p-10 text-center text-slate-600">
              Chargement de vos formations...
            </CardContent>
          </Card>
        ) : (
          <>
            {pendingFormations.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-700" />
                  <h2 className="text-xl font-semibold text-slate-900">
                    Formations en attente d&apos;autorisation
                  </h2>
                </div>
                <div className="space-y-3">
                  {pendingFormations.map((item) => (
                    <Card
                      key={`${item.order_id}:${item.formation.id}`}
                      className="border-amber-200 bg-amber-50/50"
                    >
                      <CardContent className="p-5">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge className="bg-amber-600 text-white border-amber-600">
                                En attente
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-amber-700 border-amber-300"
                              >
                                {statusLabel(item.order_status)}
                              </Badge>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {item.formation.title}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                              Commande {shortOrderId(item.order_id)} | Date:{" "}
                              {formatDate(item.ordered_at)} | Prix:{" "}
                              {formatPrice(
                                item.item_total_price || item.formation.price,
                                "USD",
                              )}
                            </p>
                            <p className="text-sm text-slate-600">
                              Acces:{" "}
                              {pendingActivationMessage(item.order_status)}
                            </p>
                          </div>
                          <Link href="/compte/commandes">
                            <Button
                              variant="outline"
                              className="border-amber-300 text-amber-800 hover:bg-amber-100"
                            >
                              Suivre la commande
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.section>
            )}

            {inProgress.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-blue-700" />
                  <h2 className="text-xl font-semibold text-slate-900">
                    Formations en cours
                  </h2>
                </div>

                <div className="space-y-3">
                  {inProgress.map((entry) => (
                    <Card key={entry.id} className="border-slate-200">
                      <CardContent className="p-5">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold text-slate-900 truncate">
                              {entry.formation?.title || "Formation"}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                              Debut: {formatDate(entry.enrolled_at)} | Duree:{" "}
                              {entry.formation?.duration_hours ?? 0}h
                            </p>
                            <div className="mt-3 max-w-xl">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-slate-500">
                                  Progression
                                </span>
                                <span className="text-xs font-medium text-slate-700">
                                  {Number(entry.progress ?? 0)}%
                                </span>
                              </div>
                              <Progress
                                value={Number(entry.progress ?? 0)}
                                className="h-2 bg-slate-200"
                              />
                            </div>
                          </div>
                          <Link
                            href={`/formations/${entry.formation?.slug || ""}/apprendre`}
                          >
                            <Button className="bg-blue-700 hover:bg-blue-800 text-white">
                              Continuer
                              <PlayCircle className="h-4 w-4 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.section>
            )}

            {completed.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-700" />
                  <h2 className="text-xl font-semibold text-slate-900">
                    Formations terminees
                  </h2>
                </div>
                <div className="space-y-3">
                  {completed.map((entry) => (
                    <Card
                      key={entry.id}
                      className="border-emerald-200 bg-emerald-50/40"
                    >
                      <CardContent className="p-5">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-emerald-600 text-white border-emerald-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completee
                              </Badge>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {entry.formation?.title || "Formation"}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                              Terminee le{" "}
                              {formatDate(
                                entry.completed_at || entry.enrolled_at,
                              )}
                            </p>
                          </div>
                          <Link
                            href={`/formations/${entry.formation?.slug || ""}/apprendre`}
                          >
                            <Button
                              variant="outline"
                              className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                            >
                              Revoir
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.section>
            )}

            {enrollments.length === 0 && pendingFormations.length === 0 && (
              <Card className="border-slate-200">
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-14 w-14 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Aucune formation pour le moment
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Commandez une formation depuis le catalogue pour commencer
                    votre apprentissage.
                  </p>
                  <Link href="/formations">
                    <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                      Voir les formations
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {pendingFormations.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Vos formations commandees apparaissent ici en attente
                  jusqu&apos;a autorisation de l&apos;administrateur. Delai
                  moyen maximum: 24h.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
