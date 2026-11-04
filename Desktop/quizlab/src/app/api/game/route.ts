import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { quizCreationSchema } from "@/schemas/forms/quiz";
import { NextResponse } from "next/server";
import { z } from "zod";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to create a game." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { topic, type, amount } = quizCreationSchema.parse(body);

    // CREATE GAME ENTRY
    const game = await prisma.game.create({
      data: {
        gameType: type,
        timeStarted: new Date(),
        userId: session.user.id,
        topic,
      },
    });

    // TOPIC COUNT
    await prisma.topic_count.upsert({
      where: { topic },
      update: { count: { increment: 1 } },
      create: { topic, count: 1 },
    });

    // CALL QUESTIONS API
    const { data } = await axios.post(
      `${process.env.API_URL}/api/questions`,
      { amount, topic, type }
    );

    const questions = data?.questions || [];

    if (!questions.length) {
      return NextResponse.json(
        { error: "AI did not generate any questions." },
        { status: 500 }
      );
    }

    // SAVE MCQ QUESTIONS
if (type === "mcq") {
  const manyData = questions
    .map((q: any) => {
      // ❌ Reject missing fields
      if (!q.question || !q.answer || !q.option1 || !q.option2 || !q.option3) {
        console.warn("Skipping invalid MCQ question:", q);
        return null;
      }

      const rawOptions = [q.option1, q.option2, q.option3, q.answer];

      // ❌ Reject duplicate options
      if (new Set(rawOptions).size !== rawOptions.length) {
        console.warn("Skipping MCQ with duplicate options:", rawOptions);
        return null;
      }

      // Shuffle AFTER validating uniqueness
      const options = rawOptions.sort(() => Math.random() - 0.5);

      return {
        question: q.question,
        answer: q.answer,
        options: JSON.stringify(options),
        gameId: game.id,
        questionType: "mcq",
      };
    })
    .filter(Boolean); // remove invalid ones

  if (!manyData.length) {
    return NextResponse.json(
      { error: "AI generated invalid MCQ options. Please try again." },
      { status: 500 }
    );
  }

  await prisma.question.createMany({ data: manyData as any[] });
}


    // SAVE OPEN-ENDED QUESTIONS
    if (type === "open_ended") {
      const manyData = questions.map((q: any) => ({
        question: q.question,
        answer: q.answer,
        gameId: game.id,
        questionType: "open_ended",
      }));

      await prisma.question.createMany({ data: manyData });
    }

    return NextResponse.json({ gameId: game.id }, { status: 200 });
  } catch (error) {
    console.error("QUIZ CREATE ERROR:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to fetch a game." },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const gameId = url.searchParams.get("gameId");

    if (!gameId) {
      return NextResponse.json(
        { error: "gameId missing in query." },
        { status: 400 }
      );
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { questions: true },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ game }, { status: 200 });
  } catch (error) {
    console.error("QUIZ GET ERROR:", error);

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
