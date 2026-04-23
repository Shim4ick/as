import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@as/shared";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const { email, username, displayName, password } = parsed.data;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      const field = existingUser.email === email ? "Email" : "Username";
      return NextResponse.json(
        { error: `${field} уже занят` },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, username, displayName, passwordHash },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, username: user.username },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 },
    );
  }
}
