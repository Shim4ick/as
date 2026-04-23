import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      type: "DM",
      AND: [
        { participants: { some: { userId: session.user.id } } },
        { participants: { some: { userId } } },
      ],
    },
  });

  if (existing) {
    return NextResponse.json({ conversationId: existing.id });
  }

  const conversation = await prisma.conversation.create({
    data: {
      type: "DM",
      participants: {
        create: [{ userId: session.user.id }, { userId }],
      },
    },
  });

  return NextResponse.json(
    { conversationId: conversation.id },
    { status: 201 },
  );
}
