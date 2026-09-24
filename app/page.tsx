"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { field, primary, formatDate } from "./ui";

type User = { id: string; name: string; email: string };
type EventItem = {
  id: string;
  name: string;
  location: string | null;
  startsAt: string;
  _count: { registrations: number };
};

export default function Home() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return <main className="p-8 text-slate-500">Carregando…</main>;
  }
  return user ? (
    <Dashboard user={user} onLogout={() => setUser(null)} />
  ) : (
    <Landing onAuth={setUser} />
  );
}

function Landing({ onAuth }: { onAuth: (u: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res || !res.ok) return setError(data?.error ?? "Falha de conexão com o servidor");
    onAuth(data);
  }

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-12 px-6 py-16 md:grid-cols-[1.2fr_1fr] md:items-center">
      <section>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          Check-in de eventos com QR code que não dá para forjar.
        </h1>
        <p className="mt-5 max-w-prose text-lg text-slate-600">
          Crie um evento, envie o link de inscrição e valide a entrada pela câmera do
          celular. Cada QR code é assinado no servidor e só vale uma vez.
        </p>
        <ol className="mt-8 list-decimal space-y-2 pl-5 text-slate-700">
          <li>O organizador cria o evento e compartilha o link de inscrição.</li>
          <li>O convidado se inscreve e recebe o QR code na hora.</li>
          <li>Na porta, o organizador escaneia o QR e confirma a entrada.</li>
        </ol>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(""); }}
              className={`rounded-md py-2 ${mode === m ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              {m === "login" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "register" && (
            <input name="name" required placeholder="Nome" autoComplete="name" className={field} />
          )}
          <input name="email" type="email" required placeholder="Email" autoComplete="email" className={field} />
          <input
            name="password"
            type="password"
            required
            minLength={mode === "register" ? 8 : undefined}
            placeholder={mode === "register" ? "Senha (mínimo 8 caracteres)" : "Senha"}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            className={field}
          />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button disabled={busy} className={`${primary} w-full`}>
            {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/events");
    if (res.status === 401) return onLogout();
    setEvents(await res.json());
  }, [onLogout]);

  useEffect(() => {
    load().catch(() => setError("Não foi possível carregar os eventos"));
  }, [load]);

  async function createEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // datetime-local vem sem fuso; converter garante o horário certo no servidor
      body: JSON.stringify({ ...data, startsAt: new Date(data.startsAt).toISOString() }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const body = await res?.json().catch(() => ({}));
      return setError(body?.error ?? "Não foi possível criar o evento");
    }
    form.reset();
    load();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Seus eventos</h1>
          <p className="text-sm text-slate-500">Logado como {user.name}</p>
        </div>
        <button onClick={logout} className="text-sm font-medium text-slate-600 underline underline-offset-4">
          Sair
        </button>
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
        <form onSubmit={createEvent} className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Novo evento</h2>
          <input name="name" required placeholder="Nome do evento" className={field} />
          <input name="startsAt" type="datetime-local" required className={field} />
          <input name="location" placeholder="Local (opcional)" className={field} />
          <textarea name="description" rows={3} placeholder="Descrição (opcional)" className={field} />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button disabled={busy} className={`${primary} w-full`}>
            {busy ? "Criando…" : "Criar evento"}
          </button>
        </form>

        <section>
          {events === null ? (
            <p className="text-slate-500">Carregando…</p>
          ) : events.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Você ainda não tem eventos. Crie o primeiro no formulário ao lado.
            </p>
          ) : (
            <ul className="space-y-3">
              {events.map((ev) => (
                <li key={ev.id}>
                  <Link
                    href={`/eventos/${ev.id}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-5 hover:border-indigo-600"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-semibold">{ev.name}</h3>
                      <span className="shrink-0 text-sm text-slate-500">
                        {ev._count.registrations} inscritos
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDate(ev.startsAt)}
                      {ev.location ? `, ${ev.location}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
