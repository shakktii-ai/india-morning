"use client";

import { cn, formatTimeDelta } from "@/lib/utils";
import { Game, Question } from "@prisma/client";
import { differenceInSeconds } from "date-fns";
import { BarChart, ChevronRight, Loader2, Timer } from "lucide-react";
import React from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button, buttonVariants } from "@/components/ui/button";
import OpenEndedPercentage from "@/components/OpenEndedPercentage";
import BlankAnswerInput from "@/components/BlankAnswerInput";
import axios from "axios";
import Link from "next/link";
import { toast } from "sonner";
import keyword_extractor from "keyword-extractor";
import { z } from "zod";
import { checkAnswerSchema, endGameSchema } from "@/schemas/forms/questions";
import { useMutation } from "@tanstack/react-query";

type Props = {
  game: Game & { questions: Pick<Question, "id" | "question" | "answer">[] };
};

const OpenEnded = ({ game }: Props) => {
  const [hasEnded, setHasEnded] = React.useState(false);
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [averagePercentage, setAveragePercentage] = React.useState(0);
  const [now, setNow] = React.useState(new Date());

  const currentQuestion = game.questions[questionIndex];

  // ---------- PICK RANDOM KEYWORDS ----------
  const keywords = React.useMemo(() => {
    const words = keyword_extractor.extract(currentQuestion.answer, {
      language: "english",
      remove_digits: true,
      return_changed_case: false,
      remove_duplicates: false,
    });

    return words.sort(() => 0.5 - Math.random()).slice(0, 2);
  }, [currentQuestion.answer]);

  // ---------- COMPUTE BLANKS ----------
  const answerWithBlanks = React.useMemo(() => {
    return keywords.reduce(
      (acc, curr) => acc.replaceAll(curr, "_____"),
      currentQuestion.answer
    );
  }, [keywords, currentQuestion.answer]);

  // CLEAR INPUTS WHEN QUESTION CHANGES
  React.useEffect(() => {
    const inputs = document.querySelectorAll("[data-blank-input]");
    inputs.forEach((input) => {
      (input as HTMLInputElement).value = "";
    });
  }, [questionIndex]);

  // ---------- END GAME (FIXED VERSION) ----------
  const endGame = async () => {
    try {
      const payload: z.infer<typeof endGameSchema> = { gameId: game.id };
      await axios.post(`/api/endGame`, payload);
    } catch (error) {
      console.error("Failed to end game:", error);
    }
  };

  // ---------- CHECK ANSWER ----------
  const { mutate: checkAnswer, isPending: isChecking } = useMutation({
    mutationFn: async () => {
      let finalAnswer = answerWithBlanks;
      const inputs = document.querySelectorAll("[data-blank-input]");

      inputs.forEach((input) => {
        const value = (input as HTMLInputElement).value;
        finalAnswer = finalAnswer.replace("_____", value);
      });

      const payload: z.infer<typeof checkAnswerSchema> = {
        questionId: currentQuestion.id,
        userInput: finalAnswer,
      };

      const response = await axios.post(`/api/checkAnswer`, payload);
      return response.data;
    },
  });

  // ---------- TIMER ----------
  React.useEffect(() => {
    if (hasEnded) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [hasEnded]);

  // ---------- NEXT BUTTON ----------
  const handleNext = React.useCallback(() => {
    checkAnswer(undefined, {
      onSuccess: async ({ percentageSimilar }) => {
        toast.success(`Similarity: ${percentageSimilar}%`);

        setAveragePercentage((prev) => {
          return (prev + percentageSimilar) / (questionIndex + 1);
        });

        // LAST QUESTION — END GAME
        if (questionIndex === game.questions.length - 1) {
          await endGame(); // 🔥 FIX: WAIT FOR API
          setHasEnded(true);
          return;
        }

        setQuestionIndex((prev) => prev + 1);
      },
      onError: () => toast.error("Something went wrong!"),
    });
  }, [checkAnswer, questionIndex, game.questions.length]);

  // ENTER KEY SUPPORT
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") handleNext();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleNext]);

  // ---------- FINISHED GAME UI ----------
  if (hasEnded) {
    return (
      <div className="absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 flex flex-col items-center">
        <div className="px-4 py-2 mt-2 font-semibold text-white bg-green-500 rounded-md">
          You completed in{" "}
          {formatTimeDelta(differenceInSeconds(now, game.timeStarted))}
        </div>

        <Link
          href={`/statistics/${game.id}`}
          className={cn(buttonVariants({ size: "lg" }), "mt-2")}
        >
          View Statistics
          <BarChart className="w-4 h-4 ml-2" />
        </Link>
      </div>
    );
  }

  // ---------- MAIN UI ----------
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 md:w-[80vw] max-w-4xl w-[90vw] top-1/2 left-1/2">
      <div className="flex flex-row justify-between">
        <div className="flex flex-col">
          <p>
            <span className="text-slate-400">Topic</span> &nbsp;
            <span className="px-2 py-1 text-white rounded-lg bg-[#0F1F3D]">
              {game.topic}
            </span>
          </p>

          <div className="flex self-start mt-3 text-slate-400">
            <Timer className="mr-2" />
            {formatTimeDelta(differenceInSeconds(now, game.timeStarted))}
          </div>
        </div>

        <OpenEndedPercentage percentage={averagePercentage} />
      </div>

      <Card className="w-full mt-4">
        <CardHeader className="flex flex-row items-center">
          <CardTitle className="mr-5 text-center divide-y divide-zinc-600/50">
            <div>{questionIndex + 1}</div>
            <div className="text-base text-slate-400">
              {game.questions.length}
            </div>
          </CardTitle>

          <CardDescription className="flex-grow text-lg">
            {currentQuestion.question}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-col items-center justify-center w-full mt-10">
        <BlankAnswerInput answerWithBlanks={answerWithBlanks} />

        <div className="mt-8 flex justify-center">
          <Button
            className="bg-[#0F1F3D] hover:bg-[#16284F] text-white px-6 py-2 rounded-lg"
            disabled={isChecking}
            onClick={handleNext}
          >
            {isChecking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Next <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OpenEnded;
