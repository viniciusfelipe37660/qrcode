import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyQrToken } from "@/lib/qrToken";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { token } = body ?? {};
  if (!token) {
    return NextResponse.json({ error: "Token não informado" }, { status: 400 });
  }

  const result = verifyQrToken(token);
  if (!result.valid) {
    return NextResponse.json({ error: "QR code inválido" }, { status: 400 });
  }

  const registration = await prisma.registration.findUnique({
    where: { id: result.registrationId },
    include: { event: true, checkIn: true },
  });

  if (!registration) {
    return NextResponse.json(
      { error: "Inscrição não encontrada" },
      { status: 404 }
    );
  }

  if (registration.event.organizerId !== userId) {
    return NextResponse.json(
      { error: "Sem permissão para este evento" },
      { status: 403 }
    );
  }

  if (registration.checkIn) {
    return NextResponse.json(
      {
        error: "QR code já utilizado",
        name: registration.name,
        alreadyCheckedInAt: registration.checkIn.checkedAt,
      },
      { status: 409 }
    );
  }

  const checkIn = await prisma.checkIn.create({
    data: { registrationId: registration.id },
  });

  await prisma.registration.update({
    where: { id: registration.id },
    data: { status: "CHECKED_IN" },
  });

  return NextResponse.json({
    ok: true,
    name: registration.name,
    email: registration.email,
    eventName: registration.event.name,
    checkedAt: checkIn.checkedAt,
  });
}