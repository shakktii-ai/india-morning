import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { gameId, type, topic } = await req.json();

    if (!gameId || !type) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    // 50–50
    if (type === "fifty_fifty") {
      await prisma.game.update({
        where: { id: gameId },
        data: { usedFiftyFifty: true },
      });

      return NextResponse.json({ ok: true });
    }

    // FLIP
    if (type === "flip") {
      const newQuestion = await prisma.question.findFirst({
        where: {
          game: {
            topic: topic,
          },
        },
        select: {
          id: true,
          question: true,
          options: true,
          answer: true,
        },
        orderBy: { id: "desc" },
      });

      await prisma.game.update({
        where: { id: gameId },
        data: { usedFlip: true },
      });

      return NextResponse.json({ question: newQuestion });
    }

    return NextResponse.json(
      { error: "Invalid lifeline type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Lifeline error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
