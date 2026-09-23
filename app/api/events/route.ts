import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

/** Lista os eventos do organizador logado, com contagem de inscritos. */
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const events = await prisma.event.findMany({
    where: { organizerId: userId },
    orderBy: { startsAt: "asc" },
    include: {
      _count: { select: { registrations: true } },
    },
  });

  return NextResponse.json(events);
}

/** Cria um novo evento pertencente ao organizador logado. */
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { name, description, location, startsAt } = body ?? {};

  if (!name || !startsAt) {
    return NextResponse.json(
      { error: "Nome e data de início são obrigatórios" },
      { status: 400 }
    );
  }

  const startsAtDate = new Date(startsAt);
  if (Number.isNaN(startsAtDate.getTime())) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      name,
      description: description || null,
      location: location || null,
      startsAt: startsAtDate,
      organizerId: userId,
    },
  });

  return NextResponse.json(event, { status: 201 });
}