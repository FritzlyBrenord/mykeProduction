"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  Lock,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Unlock,
  User,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatDate } from "@/lib/utils";

type VisitorPeriod = "day" | "week" | "month" | "year";

type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "client";
  is_active: boolean;
  two_fa_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
};

type AdminVisitor = {
  id: string;
  first_seen: string;
  last_seen: string;
  sources: Array<"article" | "video" | "cart" | "site">;
  user_agent: string | null;
  ip_hash: string | null;
  country_code?: string | null;
  events: number;
};

type DailyVisitorStat = {
  date: string;
  visitors: number;
};

type ApiPayload = {
  data: {
    users: AdminUser[];
    visitors: AdminVisitor[];
    visitor_daily: DailyVisitorStat[];
    stats: {
      users_total: number;
      admins_total: number;
      clients_total: number;
      active_total: number;
      inactive_total: number;
      registrations_today: number;
      visitors_today: number;
      visitors_week: number;
      visitors_month: number;
      visitors_year: number;
    };
    acting_admin?: {
      id: string;
      email: string | null;
      full_name: string | null;
    };
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    period: VisitorPeriod;
  };
};

type CreateUserFormState = {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "client";
};

type AdminAccountFormState = {
  email: string;
  password: string;
  confirmPassword: string;
};

const periodOptions: Array<{ value: VisitorPeriod; label: string }> = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "year", label: "Annee" },
];

function shortVisitorId(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function UtilisateursPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "client">(
    "all",
  );
  const [periodFilter, setPeriodFilter] = useState<VisitorPeriod>("day");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [visitors, setVisitors] = useState<AdminVisitor[]>([]);
  const [visitorDaily, setVisitorDaily] = useState<DailyVisitorStat[]>([]);
  const [actingAdmin, setActingAdmin] = useState<{
    id: string;
    email: string | null;
    full_name: string | null;
  } | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedVisitorIds, setSelectedVisitorIds] = useState<string[]>([]);
  const [visitorPage, setVisitorPage] = useState(1);
  const [visitorPageSize] = useState(10);
  const [visitorSubmitting, setVisitorSubmitting] = useState(false);
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const [mutationUserId, setMutationUserId] = useState<string | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState<CreateUserFormState>({
    email: "",
    password: "",
    full_name: "",
    role: "client",
  });
  const [adminAccountForm, setAdminAccountForm] =
    useState<AdminAccountFormState>({
      email: "",
      password: "",
      confirmPassword: "",
    });
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    period: "day" as VisitorPeriod,
  });
  const [stats, setStats] = useState({
    users_total: 0,
    admins_total: 0,
    clients_total: 0,
    active_total: 0,
    inactive_total: 0,
    registrations_today: 0,
    visitors_today: 0,
    visitors_week: 0,
    visitors_month: 0,
    visitors_year: 0,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchData = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
          role: roleFilter,
          period: periodFilter,
        });

        if (search) {
          params.set("search", search);
        }

        const response = await fetch(
          `/api/admin/utilisateurs?${params.toString()}`,
          {
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as
          | ApiPayload
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            payload && "error" in payload
              ? payload.error
              : "Erreur de chargement",
          );
        }

        const data = (payload as ApiPayload).data;
        const nextMeta = (payload as ApiPayload).meta;
        setUsers(data.users || []);
        setVisitors(data.visitors || []);
        setVisitorDaily(data.visitor_daily || []);
        setStats(data.stats);
        setActingAdmin(data.acting_admin ?? null);
        setMeta(nextMeta);
        setSelectedUserIds((current) =>
          current.filter((id) =>
            (data.users || []).some((user) => user.id === id),
          ),
        );
        setSelectedVisitorIds((current) =>
          current.filter((id) =>
            (data.visitors || []).some((visitor) => visitor.id === id),
          ),
        );
      } catch (fetchError) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Impossible de charger les utilisateurs.";
        setError(message);
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [page, periodFilter, roleFilter, search],
  );

  useEffect(() => {
    void fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    setAdminAccountForm((current) => ({
      ...current,
      email: actingAdmin?.email || "",
    }));
  }, [actingAdmin?.email]);

  const deletableUserIds = useMemo(
    () =>
      users
        .filter((user) => user.role !== "admin" && user.id !== actingAdmin?.id)
        .map((user) => user.id),
    [users, actingAdmin?.id],
  );

  const isAllCurrentUsersSelected =
    deletableUserIds.length > 0 &&
    deletableUserIds.every((id) => selectedUserIds.includes(id));

  const selectedUsersCount = selectedUserIds.length;

  const visitorsPeriodLabel = useMemo(
    () =>
      periodOptions.find((option) => option.value === meta.period)?.label ||
      "Jour",
    [meta.period],
  );
  const visitorTotalPages = Math.max(
    1,
    Math.ceil(visitors.length / visitorPageSize),
  );
  const currentVisitorPage = Math.min(visitorPage, visitorTotalPages);
  const paginatedVisitors = useMemo(() => {
    const from = (currentVisitorPage - 1) * visitorPageSize;
    const to = from + visitorPageSize;
    return visitors.slice(from, to);
  }, [currentVisitorPage, visitorPageSize, visitors]);
  const selectedVisitorsCount = selectedVisitorIds.length;
  const visitorIdsOnCurrentPage = useMemo(
    () => paginatedVisitors.map((visitor) => visitor.id),
    [paginatedVisitors],
  );
  const isAllCurrentVisitorsSelected =
    visitorIdsOnCurrentPage.length > 0 &&
    visitorIdsOnCurrentPage.every((id) => selectedVisitorIds.includes(id));

  useEffect(() => {
    if (visitorPage > visitorTotalPages) {
      setVisitorPage(visitorTotalPages);
    }
  }, [visitorPage, visitorTotalPages]);

  const toggleUser = (id: string) => {
    setSelectedUserIds((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(deletableUserIds);
    } else {
      setSelectedUserIds([]);
    }
  };

  const toggleVisitor = (id: string) => {
    setSelectedVisitorIds((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  };

  const toggleSelectAllVisitors = (checked: boolean) => {
    if (checked) {
      setSelectedVisitorIds((current) =>
        Array.from(new Set([...current, ...visitorIdsOnCurrentPage])),
      );
    } else {
      setSelectedVisitorIds((current) =>
        current.filter((id) => !visitorIdsOnCurrentPage.includes(id)),
      );
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    const label = user.full_name || shortVisitorId(user.id);
    const confirmed = window.confirm(`Supprimer le compte "${label}" ?`);
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const response = await fetch(
        `/api/admin/utilisateurs/${encodeURIComponent(user.id)}`,
        {
          method: "DELETE",
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Suppression impossible.");
      }

      await fetchData(true);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Erreur pendant la suppression.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedUserIds.length === 0) return;
    const confirmed = window.confirm(
      `Supprimer ${selectedUserIds.length} utilisateur(s) selectionne(s) ?`,
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const response = await fetch("/api/admin/utilisateurs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedUserIds }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Suppression multiple impossible.");
      }

      setSelectedUserIds([]);
      await fetchData(true);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Erreur pendant la suppression multiple.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSelectedVisitors = async () => {
    if (selectedVisitorIds.length === 0) return;
    const confirmed = window.confirm(
      `Supprimer ${selectedVisitorIds.length} visiteur(s) selectionne(s) ?`,
    );
    if (!confirmed) return;

    try {
      setVisitorSubmitting(true);
      setError(null);
      const response = await fetch("/api/admin/utilisateurs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "visitors", ids: selectedVisitorIds }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          payload.error || "Suppression des visiteurs impossible.",
        );
      }
      setSelectedVisitorIds([]);
      await fetchData(true);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Erreur pendant la suppression des visiteurs.";
      setError(message);
    } finally {
      setVisitorSubmitting(false);
    }
  };

  const updateUser = async (
    userId: string,
    payload: Partial<{
      role: "admin" | "client";
      is_active: boolean;
      full_name: string | null;
    }>,
  ) => {
    setMutationUserId(userId);
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/utilisateurs/${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Mise a jour impossible.");
      }
      await fetchData(true);
    } finally {
      setMutationUserId(null);
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (
    user: AdminUser,
    role: "admin" | "client",
  ) => {
    if (role === user.role) return;
    try {
      await updateUser(user.id, { role });
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : "Erreur lors du changement de role.";
      setError(message);
    }
  };

  const handleToggleUserActive = async (user: AdminUser) => {
    const nextActive = !user.is_active;
    const confirmed = window.confirm(
      nextActive
        ? `Debloquer le compte "${user.full_name || user.id}" ?`
        : `Bloquer le compte "${user.full_name || user.id}" ?`,
    );
    if (!confirmed) return;

    try {
      await updateUser(user.id, { is_active: nextActive });
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : "Erreur lors du blocage/deblocage.";
      setError(message);
    }
  };

  const handleCreateUser = async () => {
    if (!createUserForm.email.trim() || !createUserForm.password.trim()) {
      setError("Email et mot de passe obligatoires.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const response = await fetch("/api/admin/utilisateurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createUserForm.email.trim().toLowerCase(),
          password: createUserForm.password,
          full_name: createUserForm.full_name.trim(),
          role: createUserForm.role,
          is_active: true,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Creation impossible.");
      }

      setCreateUserForm({
        email: "",
        password: "",
        full_name: "",
        role: "client",
      });
      setCreateUserOpen(false);
      await fetchData(true);
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Erreur lors de la creation du compte.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAdminAccount = async () => {
    if (!actingAdmin) return;
    const normalizedEmail = adminAccountForm.email.trim().toLowerCase();
    const currentEmail = (actingAdmin.email || "").trim().toLowerCase();
    const hasPassword = adminAccountForm.password.length > 0;

    if (!normalizedEmail) {
      setError("Email admin obligatoire.");
      return;
    }

    if (hasPassword && adminAccountForm.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    if (
      hasPassword &&
      adminAccountForm.password !== adminAccountForm.confirmPassword
    ) {
      setError("La confirmation du mot de passe ne correspond pas.");
      return;
    }

    const emailChanged = normalizedEmail !== currentEmail;
    if (!emailChanged && !hasPassword) {
      setError("Aucune modification detectee pour le compte admin.");
      return;
    }

    try {
      setAccountSubmitting(true);
      setError(null);
      setAccountSuccess(null);
      const response = await fetch("/api/admin/utilisateurs/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password: hasPassword ? adminAccountForm.password : undefined,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        admin?: { email: string | null };
        email_changed?: boolean;
        password_changed?: boolean;
      };
      if (!response.ok) {
        throw new Error(
          payload.error || "Mise a jour du compte admin impossible.",
        );
      }

      setAdminAccountForm((current) => ({
        ...current,
        email: payload.admin?.email || normalizedEmail,
        password: "",
        confirmPassword: "",
      }));
      setActingAdmin((current) =>
        current
          ? {
              ...current,
              email: payload.admin?.email || normalizedEmail,
            }
          : current,
      );
      setAccountSuccess(
        payload.email_changed || payload.password_changed
          ? "Compte admin mis a jour. Reconnectez-vous pour securiser la session."
          : "Compte admin mis a jour.",
      );
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : "Erreur pendant la mise a jour du compte admin.";
      setError(message);
    } finally {
      setAccountSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Utilisateurs et visiteurs
          </h1>
          <p className="text-[var(--muted)] mt-1">
            Suivi complet des comptes et des visiteurs non connectes.
          </p>
          {actingAdmin && (
            <p className="text-xs text-[var(--muted)] mt-2">
              Connecte en tant que admin:{" "}
              {actingAdmin.full_name || actingAdmin.email || actingAdmin.id}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="gap-2"
            onClick={() => setCreateUserOpen((current) => !current)}
            disabled={submitting}
          >
            <UserPlus className="h-4 w-4" />
            Creer utilisateur
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => void fetchData(true)}
            disabled={loading || refreshing || submitting}
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
            />
            Actualiser
          </Button>
        </div>
      </div>

      {createUserOpen && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserCog className="w-4 h-4 text-[var(--primary)]" />
            <h2 className="font-semibold text-[var(--foreground)]">
              Nouveau compte utilisateur
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <input
              type="email"
              value={createUserForm.email}
              onChange={(event) =>
                setCreateUserForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder="email@entreprise.com"
              className="px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <input
              type="password"
              value={createUserForm.password}
              onChange={(event) =>
                setCreateUserForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="Mot de passe (min 8)"
              className="px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <input
              type="text"
              value={createUserForm.full_name}
              onChange={(event) =>
                setCreateUserForm((current) => ({
                  ...current,
                  full_name: event.target.value,
                }))
              }
              placeholder="Nom complet"
              className="px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <select
              value={createUserForm.role}
              onChange={(event) =>
                setCreateUserForm((current) => ({
                  ...current,
                  role: event.target.value as "admin" | "client",
                }))
              }
              className="px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="client">Client</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateUserOpen(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreateUser()}
              disabled={submitting}
            >
              Creer le compte
            </Button>
          </div>
        </div>
      )}

      {actingAdmin && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserCog className="w-4 h-4 text-[var(--primary)]" />
            <h2 className="font-semibold text-[var(--foreground)]">
              Mon compte admin
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="email"
              value={adminAccountForm.email}
              onChange={(event) =>
                setAdminAccountForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder="Email admin"
              className="px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <input
              type="password"
              value={adminAccountForm.password}
              onChange={(event) =>
                setAdminAccountForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="Nouveau mot de passe (optionnel)"
              className="px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <input
              type="password"
              value={adminAccountForm.confirmPassword}
              onChange={(event) =>
                setAdminAccountForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              placeholder="Confirmer le mot de passe"
              className="px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--muted)]">
              Compte actuel:{" "}
              {actingAdmin.full_name || actingAdmin.email || actingAdmin.id}
            </p>
            <Button
              type="button"
              onClick={() => void handleUpdateAdminAccount()}
              disabled={accountSubmitting}
            >
              Mettre a jour mes acces
            </Button>
          </div>
          {accountSuccess && (
            <p className="mt-3 text-sm text-emerald-500">{accountSuccess}</p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-500 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-xs text-[var(--muted)]">Total users</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {stats.users_total}
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-xs text-[var(--muted)]">Admins</p>
          <p className="text-2xl font-bold text-purple-500">
            {stats.admins_total}
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-xs text-[var(--muted)]">Clients</p>
          <p className="text-2xl font-bold text-blue-500">
            {stats.clients_total}
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-xs text-[var(--muted)]">
            Inscriptions aujourd hui
          </p>
          <p className="text-2xl font-bold text-emerald-500">
            {stats.registrations_today}
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-xs text-[var(--muted)]">Visiteurs jour</p>
          <p className="text-2xl font-bold text-amber-500">
            {stats.visitors_today}
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-xs text-[var(--muted)]">Visiteurs semaine</p>
          <p className="text-2xl font-bold text-amber-500">
            {stats.visitors_week}
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-xs text-[var(--muted)]">Visiteurs mois</p>
          <p className="text-2xl font-bold text-amber-500">
            {stats.visitors_month}
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-xs text-[var(--muted)]">Visiteurs annee</p>
          <p className="text-2xl font-bold text-amber-500">
            {stats.visitors_year}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Rechercher par nom..."
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(event) => {
            setRoleFilter(event.target.value as "all" | "admin" | "client");
            setPage(1);
          }}
          className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="all">Tous les roles</option>
          <option value="admin">Administrateur</option>
          <option value="client">Client</option>
        </select>
        <select
          value={periodFilter}
          onChange={(event) => {
            setPeriodFilter(event.target.value as VisitorPeriod);
            setVisitorPage(1);
            setSelectedVisitorIds([]);
          }}
          className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              Visiteurs {option.label.toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--primary)]" />
            <p className="font-semibold text-[var(--foreground)]">
              Liste utilisateurs
            </p>
          </div>
          {selectedUsersCount > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => void handleDeleteSelected()}
              disabled={submitting}
            >
              <Trash2 className="w-4 h-4" />
              Supprimer selection ({selectedUsersCount})
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="text-left py-3 px-4">
                  <Checkbox
                    checked={isAllCurrentUsersSelected}
                    onCheckedChange={(checked) =>
                      toggleSelectAll(Boolean(checked))
                    }
                    aria-label="Selectionner tous les utilisateurs"
                  />
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                  Utilisateur
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                  Role
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                  Statut
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                  2FA
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                  Derniere connexion
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                  Inscription
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/40 transition-colors"
                >
                  {(() => {
                    const isCurrentAdmin = actingAdmin?.id === user.id;
                    const rowLoading = mutationUserId === user.id && submitting;
                    const canDelete = !isCurrentAdmin && user.role !== "admin";
                    const canToggleActive = !isCurrentAdmin;
                    const canChangeRole = !isCurrentAdmin;

                    return (
                      <>
                        <td className="py-3 px-4">
                          <Checkbox
                            checked={selectedUserIds.includes(user.id)}
                            onCheckedChange={() => toggleUser(user.id)}
                            aria-label={`Selectionner ${user.full_name || user.id}`}
                            disabled={user.role === "admin" || isCurrentAdmin}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-full flex items-center justify-center overflow-hidden">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.full_name || "Utilisateur"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-5 h-5 text-[var(--primary)]" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--foreground)]">
                                {user.full_name || "Sans nom"}
                              </p>
                              <p className="text-xs text-[var(--muted)]">
                                {user.email || "Email non disponible"}
                              </p>
                              <p className="text-xs text-[var(--muted)] font-mono">
                                {user.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={user.role}
                            onChange={(event) =>
                              void handleRoleChange(
                                user,
                                event.target.value as "admin" | "client",
                              )
                            }
                            disabled={
                              submitting || rowLoading || !canChangeRole
                            }
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium border bg-transparent",
                              user.role === "admin"
                                ? "text-purple-500 border-purple-500/20"
                                : "text-blue-500 border-blue-500/20",
                            )}
                          >
                            <option value="client">Client</option>
                            <option value="admin">Administrateur</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-sm",
                              user.is_active
                                ? "text-green-500"
                                : "text-red-500",
                            )}
                          >
                            {user.is_active ? (
                              <UserCheck className="w-4 h-4" />
                            ) : (
                              <UserX className="w-4 h-4" />
                            )}
                            {user.is_active ? "Actif" : "Inactif"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-sm",
                              user.two_fa_enabled
                                ? "text-emerald-500"
                                : "text-[var(--muted)]",
                            )}
                          >
                            <Shield className="w-4 h-4" />
                            {user.two_fa_enabled ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--muted)]">
                          {user.last_login_at
                            ? formatDate(user.last_login_at)
                            : "Jamais"}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--muted)]">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(
                                "border-[var(--border)]",
                                user.is_active
                                  ? "text-amber-500 hover:bg-amber-500/10"
                                  : "text-emerald-500 hover:bg-emerald-500/10",
                              )}
                              onClick={() => void handleToggleUserActive(user)}
                              disabled={
                                submitting || rowLoading || !canToggleActive
                              }
                            >
                              {user.is_active ? (
                                <>
                                  <Lock className="w-4 h-4 mr-1" />
                                  Bloquer
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-4 h-4 mr-1" />
                                  Debloquer
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                              onClick={() => void handleDeleteUser(user)}
                              disabled={submitting || rowLoading || !canDelete}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Supprimer
                            </Button>
                          </div>
                        </td>
                      </>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && !loading && (
          <div className="p-8 text-center text-[var(--muted)]">
            Aucun utilisateur trouve.
          </div>
        )}

        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            {meta.total} utilisateur{meta.total > 1 ? "s" : ""} au total
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Precedent
            </Button>
            <span className="text-sm text-[var(--muted)]">
              Page {meta.page} / {meta.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages || loading}
              onClick={() =>
                setPage((current) => Math.min(meta.totalPages, current + 1))
              }
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-amber-500" />
            <p className="font-semibold text-[var(--foreground)]">
              Liste visiteurs non connectes ({visitorsPeriodLabel})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-[var(--muted)]">
              {paginatedVisitors.length} / {visitors.length} visiteurs affiches
            </p>
            {selectedVisitorsCount > 0 && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => void handleDeleteSelectedVisitors()}
                disabled={visitorSubmitting}
              >
                <Trash2 className="w-4 h-4" />
                Supprimer selection ({selectedVisitorsCount})
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="text-left py-3 px-4">
                  <Checkbox
                    checked={isAllCurrentVisitorsSelected}
                    onCheckedChange={(checked) =>
                      toggleSelectAllVisitors(Boolean(checked))
                    }
                    aria-label="Selectionner tous les visiteurs de la page"
                  />
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                  Visiteur
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                  Sources
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                  Pays
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                  Evenements
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                  Premiere activite
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                  Derniere activite
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                  User agent
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedVisitors.map((visitor) => (
                <tr
                  key={visitor.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/40 transition-colors"
                >
                  <td className="py-3 px-4">
                    <Checkbox
                      checked={selectedVisitorIds.includes(visitor.id)}
                      onCheckedChange={() => toggleVisitor(visitor.id)}
                      aria-label={`Selectionner le visiteur ${shortVisitorId(visitor.id)}`}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-mono text-sm text-[var(--foreground)]">
                      {shortVisitorId(visitor.id)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {visitor.sources.map((source) => (
                        <span
                          key={`${visitor.id}-${source}`}
                          className="px-2 py-0.5 rounded-full text-xs border border-[var(--border)] bg-[var(--background)] text-[var(--muted)]"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--foreground)]">
                    {visitor.country_code || "--"}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--foreground)]">
                    {visitor.events}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--muted)]">
                    {formatDate(visitor.first_seen)}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--muted)]">
                    {formatDate(visitor.last_seen)}
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--muted)] max-w-[340px] truncate">
                    {visitor.user_agent || "Non disponible"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visitors.length === 0 && !loading && (
          <div className="p-8 text-center text-[var(--muted)]">
            Aucun visiteur trouve pour cette periode.
          </div>
        )}

        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            {visitors.length} visiteur{visitors.length > 1 ? "s" : ""} au total
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentVisitorPage <= 1 || loading}
              onClick={() =>
                setVisitorPage((current) => Math.max(1, current - 1))
              }
            >
              Precedent
            </Button>
            <span className="text-sm text-[var(--muted)]">
              Page {currentVisitorPage} / {visitorTotalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentVisitorPage >= visitorTotalPages || loading}
              onClick={() =>
                setVisitorPage((current) =>
                  Math.min(visitorTotalPages, current + 1),
                )
              }
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-4 h-4 text-[var(--primary)]" />
          <h2 className="font-semibold text-[var(--foreground)]">
            Visiteurs par jour (14 derniers jours)
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {visitorDaily.map((entry) => (
            <div
              key={entry.date}
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
            >
              <p className="text-xs text-[var(--muted)]">{entry.date}</p>
              <p className="text-xl font-bold text-[var(--foreground)] mt-2">
                {entry.visitors}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1 flex items-center gap-1">
                <Clock3 className="w-3 h-3" />
                visiteurs
              </p>
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
          <p className="text-[var(--muted)]">Chargement des donnees...</p>
        </div>
      )}
    </div>
  );
}
