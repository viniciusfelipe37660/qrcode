import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

/** Dados públicos de um evento (usado na página de inscrição).
 *  Só expõe o que o convidado precisa ver. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, description: true, location: true, startsAt: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }
  return NextResponse.json(event);
}
