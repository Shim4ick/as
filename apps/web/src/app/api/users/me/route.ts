import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { displayName } = await req.json();
  if (!displayName || displayName.length > 50) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { displayName },
  });

  return NextResponse.json({ ok: true });
}
