import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Myke Industrie</h1>
      <p className="max-w-2xl text-slate-600 dark:text-slate-300">
        Phase 0 en place: infrastructure, routes de base, middleware, clients Supabase et services.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link className="rounded-md bg-blue-600 px-4 py-2 text-white" href="/formations">
          Formations
        </Link>
        <Link className="rounded-md border px-4 py-2" href="/admin/dashboard">
          Dashboard Admin
        </Link>
      </div>
    </main>
  );
}
