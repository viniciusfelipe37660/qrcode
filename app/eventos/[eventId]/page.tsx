"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDate } from "../../ui";

type EventItem = {
  id: string;
  name: string;
  location: string | null;
  startsAt: string;
};
type Registration = {
  id: string;
  name: string;
  email: string;
  status: "PENDING" | "CHECKED_IN";
  checkIn: { checkedAt: string } | null;
};

export default function EventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "missing">("loading");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const [evRes, regRes] = await Promise.all([
      fetch("/api/events"),
      fetch(`/api/events/${eventId}/registrations`),
    ]);
    if (evRes.status === 401 || regRes.status === 401 || regRes.status === 403) {
      return setState("denied");
    }
    const events: EventItem[] = await evRes.json();
    const found = events.find((e) => e.id === eventId);
    if (!found) return setState("missing");
    setEvent(found);
    setRegs(await regRes.json());
    setState("ready");
  }, [eventId]);

  useEffect(() => {
    load().catch(() => setState("missing"));
  }, [load]);

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/inscricao/${eventId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (state === "loading") return <main className="p-8 text-slate-500">Carregando…</main>;
  if (state !== "ready" || !event) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <p className="mb-4">
          {state === "denied"
            ? "Entre na sua conta para ver este evento."
            : "Evento não encontrado."}
        </p>
        <Link href="/" className="font-medium text-indigo-600 underline underline-offset-4">
          Ir para o início
        </Link>
      </main>
    );
  }

  const present = regs.filter((r) => r.status === "CHECKED_IN").length;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm text-slate-500 underline underline-offset-4">
        Voltar aos eventos
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{event.name}</h1>
      <p className="mt-1 text-slate-600">
        {formatDate(event.startsAt)}
        {event.location ? `, ${event.location}` : ""}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/checkin/${eventId}`}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
        >
          Abrir scanner de check-in
        </Link>
        <button
          onClick={copyLink}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium hover:border-indigo-600"
        >
          {copied ? "Link copiado" : "Copiar link de inscrição"}
        </button>
        <button onClick={() => load()} className="px-2 py-2 text-sm text-slate-600 underline underline-offset-4">
          Atualizar lista
        </button>
      </div>

      <p className="mt-8 text-lg">
        <strong>{present}</strong> de <strong>{regs.length}</strong> inscritos já entraram.
      </p>

      {regs.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Ninguém se inscreveu ainda. Copie o link de inscrição e envie aos convidados.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Entrada</th>
              </tr>
            </thead>
            <tbody>
              {regs.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.email}</td>
                  <td className="px-4 py-3">
                    {r.checkIn ? (
                      <span className="text-green-700">
                        Confirmada às {new Date(r.checkIn.checkedAt).toLocaleTimeString("pt-BR")}
                      </span>
                    ) : (
                      <span className="text-slate-500">Pendente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
