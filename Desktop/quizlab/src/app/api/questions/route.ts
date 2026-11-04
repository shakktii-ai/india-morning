import { strict_output } from "@/lib/gpt";
import { getQuestionsSchema } from "@/schemas/forms/questions";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export const runtime = "nodejs";
export const maxDuration = 500;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, topic, type } = getQuestionsSchema.parse(body);

    console.log("📩 Generating questions:", { amount, topic, type });

    let questions: any[] = [];

    const promptArr = new Array(amount).fill(
      type === "mcq"
    ? `Provide ONE hard MCQ question about ${topic}.
       You MUST return ONLY JSON with the fields:
       question, answer, option1, option2, option3.

       STRICT RULES (very important):
       - ALL options MUST be unique.
       - option1, option2, option3 MUST NOT be the same as each other.
       - answer MUST NOT match option1, option2, or option3.
       - NO duplicate options.
       - NO repeated values.
       - NO empty or placeholder options.`
    : `Provide ONE hard open-ended question about ${topic}. 
       You MUST return ONLY JSON with fields: question, answer.`
);

    questions = await strict_output(
      "YOU MUST RETURN ONLY VALID JSON. NO EXPLANATION. NO MARKDOWN. NO EXTRA TEXT.",
      promptArr,
      type === "mcq"
        ? {
            question: "question",
            answer: "answer",
            option1: "option1",
            option2: "option2",
            option3: "option3",
          }
        : {
            question: "question",
            answer: "answer",
          }
    );

    console.log("✅ AI returned:", questions);

    if (!Array.isArray(questions) || questions.length === 0) {
      console.log("❌ AI returned no questions");
      return NextResponse.json(
        { error: "AI failed to generate questions." },
        { status: 500 }
      );
    }

    return NextResponse.json({ questions }, { status: 200 });
  } catch (error) {
    console.error("❌ /api/questions ERROR:", error);

    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Server crashed generating questions" },
      { status: 500 }
    );
  }
}
