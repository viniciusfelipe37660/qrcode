import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { generateQrToken } from "@/lib/qrToken";
import { getCurrentUserId } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

/**
 * Inscrição pública em um evento (não exige login — é quem vai participar
 * do evento, não o organizador). Gera um token assinado e o QR code
 * correspondente, devolvidos na hora pro convidado guardar/imprimir.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;

  const body = await request.json().catch(() => null);
  const { name, email } = body ?? {};

  if (!name || !email) {
    return NextResponse.json(
      { error: "Nome e email são obrigatórios" },
      { status: 400 }
    );
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }

  // O token final depende do id da inscrição, então criamos primeiro com um
  // valor temporário (só pra satisfazer a coluna única) e atualizamos em seguida.
  const registration = await prisma.registration.create({
    data: {
      name,
      email,
      eventId,
      token: randomUUID(), // placeholder temporário, substituído abaixo
    },
  });

  const qrToken = generateQrToken(registration.id);

  const updated = await prisma.registration.update({
    where: { id: registration.id },
    data: { token: qrToken },
  });

  // Gera o QR code como imagem PNG codificada em base64 (data URL),
  // pronta pra exibir direto num <img> no frontend, sem precisar de outro arquivo.
  const qrCodeDataUrl = await QRCode.toDataURL(qrToken, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });

  return NextResponse.json(
    {
      registrationId: updated.id,
      name: updated.name,
      email: updated.email,
      eventId: updated.eventId,
      eventName: event.name,
      qrCodeDataUrl,
    },
    { status: 201 }
  );
}

/** Lista os inscritos de um evento — só o organizador dono do evento pode ver. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }
  if (event.organizerId !== userId) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const registrations = await prisma.registration.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    include: { checkIn: true },
  });

  return NextResponse.json(registrations);
}