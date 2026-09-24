"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { field, primary, formatDate } from "../../ui";

type PublicEvent = {
  name: string;
  description: string | null;
  location: string | null;
  startsAt: string;
};
type Ticket = { name: string; eventName: string; qrCodeDataUrl: string };

export default function RegistrationPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${eventId}`)
      .then(async (r) => (r.ok ? setEvent(await r.json()) : setNotFound(true)))
      .catch(() => setNotFound(true));
  }, [eventId]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch(`/api/events/${eventId}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res || !res.ok) return setError(data?.error ?? "Falha de conexão com o servidor");
    setTicket(data);
  }

  if (notFound) return <main className="p-8">Evento não encontrado. Confira o link recebido.</main>;
  if (!event) return <main className="p-8 text-slate-500">Carregando…</main>;

  return (
    <main className="mx-auto w-full max-w-md px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{event.name}</h1>
      <p className="mt-1 text-slate-600">
        {formatDate(event.startsAt)}
        {event.location ? `, ${event.location}` : ""}
      </p>
      {event.description && <p className="mt-3 text-slate-700">{event.description}</p>}

      {ticket ? (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <h2 className="text-lg font-semibold">Inscrição confirmada, {ticket.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Mostre este QR code na entrada. Ele só funciona uma vez.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ticket.qrCodeDataUrl} alt="QR code de entrada" className="mx-auto my-4 h-64 w-64" />
          <a
            href={ticket.qrCodeDataUrl}
            download="qrcode-ingresso.png"
            className={`${primary} inline-block`}
          >
            Baixar QR code
          </a>
          <p className="mt-3 text-xs text-slate-500">
            Salve a imagem agora: ela não fica disponível depois de fechar esta página.
          </p>
        </section>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold">Garanta sua vaga</h2>
          <input name="name" required placeholder="Nome completo" autoComplete="name" className={field} />
          <input name="email" type="email" required placeholder="Email" autoComplete="email" className={field} />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button disabled={busy} className={`${primary} w-full`}>
            {busy ? "Enviando…" : "Receber meu QR code"}
          </button>
        </form>
      )}
    </main>
  );
}
