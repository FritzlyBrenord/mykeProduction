import { Metadata } from "next";
import AdminLayoutClient from "./AdminLayoutClient";
import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/auth/admin-access";

export const metadata: Metadata = {
  title: "Admin - Myke Industrie",
  description: "Tableau de bord administrateur Myke Industrie",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await checkAdminAccess();

  if (!access.ok) {
    if (access.code === "UNAUTHENTICATED") {
      redirect("/auth/connexion?next=/admin/dashboard");
    }

    if (access.code === "BLOCKED") {
      redirect("/auth/connexion?blocked=1");
    }

    redirect("/");
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
