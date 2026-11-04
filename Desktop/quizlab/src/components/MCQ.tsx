// "use client";

// import { Game, Question } from "@prisma/client";
// import { differenceInSeconds } from "date-fns";
// import { BarChart, ChevronRight, Loader2, Timer } from "lucide-react";
// import React from "react";
// import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
// import { Button, buttonVariants } from "./ui/button";
// import MCQCounter from "./MCQCounter";
// import { useMutation } from "@tanstack/react-query";
// import axios from "axios";
// import { checkAnswerSchema, endGameSchema } from "@/schemas/forms/questions";
// import { z } from "zod";
// import { toast } from "sonner";
// import { cn, formatTimeDelta } from "@/lib/utils";

// type Props = {
//   game: Game & { questions: Pick<Question, "id" | "question" | "options">[] };
// };

// const MCQ = ({ game }: Props) => {
//   const [questionIndex, setQuestionIndex] = React.useState(0);
//   const [selectedChoice, setSelectedChoice] = React.useState<number | null>(null);
//   const [correct_Answers, setCorrectAnswer] = React.useState<number>(0);
//   const [wrongAnswer, setWrongAnswer] = React.useState<number>(0);
//   const [hasEnded, setHasEnded] = React.useState<boolean>(false);

//   // Store startTime as a Date object to avoid errors
//   const startTime = new Date(game.timeStarted);

//   const [now, setNow] = React.useState<Date>(new Date());

//   // LIVE TIMER
//   React.useEffect(() => {
//     const interval = setInterval(() => {
//       if (!hasEnded) {
//         setNow(new Date());
//       }
//     }, 1000);
//     return () => clearInterval(interval);
//   }, [hasEnded]);

//   const currentQuestion = React.useMemo(() => {
//     return game.questions[questionIndex];
//   }, [questionIndex, game.questions]);

//   const options = React.useMemo(() => {
//     if (!currentQuestion || !currentQuestion.options) return [];
//     return JSON.parse(currentQuestion.options as string) as string[];
//   }, [currentQuestion]);

//   // CHECK ANSWER
//   const { mutate: checkAnswer, isPending: isChecking } = useMutation({
//     mutationFn: async () => {
//       if (selectedChoice === null) throw new Error("No option selected");

//       const payload: z.infer<typeof checkAnswerSchema> = {
//         questionId: currentQuestion.id,
//         userInput: options[selectedChoice],
//       };

//       const response = await axios.post("/api/checkAnswer", payload);
//       return response.data as { isCorrect: boolean };
//     },
//   });

//   // SAVE END TIME
//   const saveEndTime = async () => {
//     try {
//       const payload: z.infer<typeof endGameSchema> = { gameId: game.id };
//       await axios.post("/api/endGame", payload);
//     } catch (err) {
//       console.error("Failed saving end time:", err);
//     }
//   };

//   const handleNext = React.useCallback(() => {
//     if (isChecking) return;

//     checkAnswer(undefined, {
//       onSuccess: async ({ isCorrect }) => {
//         if (isCorrect) {
//           toast.success("Correct!");
//           setCorrectAnswer((p) => p + 1);
//         } else {
//           toast.error("Wrong!");
//           setWrongAnswer((p) => p + 1);
//         }

//         // LAST QUESTION
//         if (questionIndex === game.questions.length - 1) {
//           await saveEndTime();
//           setHasEnded(true);
//           return;
//         }

//         setQuestionIndex((prev) => prev + 1);
//         setSelectedChoice(null);
//       },
//     });
//   }, [checkAnswer, isChecking, questionIndex, game.questions.length]);

//   // KEYBOARD SHORTCUTS
//   React.useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       if (e.key === "1") setSelectedChoice(0);
//       else if (e.key === "2") setSelectedChoice(1);
//       else if (e.key === "3") setSelectedChoice(2);
//       else if (e.key === "4") setSelectedChoice(3);
//       else if (e.key === "Enter") handleNext();
//     };

//     document.addEventListener("keydown", handleKeyDown);
//     return () => document.removeEventListener("keydown", handleKeyDown);
//   }, [handleNext]);

//   // END SCREEN
//   if (hasEnded) {
//     return (
//       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
//         <div className="px-4 mt-2 font-semibold text-white bg-green-500 rounded-md whitespace-nowrap">
//           You completed in{" "}
//           {formatTimeDelta(differenceInSeconds(now, startTime))}
//         </div>

//         <a href={`/statistics/${game.id}`} className={cn(buttonVariants(), "mt-2")}>
//           View Statistics
//           <BarChart className="w-4 h-4 ml-2" />
//         </a>
//       </div>
//     );
//   }

//   // MAIN SCREEN
//   return (
//     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl">
//       {/* HEADER */}
//       <div className="flex flex-row justify-between items-center">
//         <p className="flex items-center gap-2">
//           <span className="text-slate-400">Topic:</span>
//           <span className="px-2 py-1 rounded-lg bg-slate-800 text-white">
//             {game.topic}
//           </span>
//         </p>

//         <div className="flex items-center text-slate-400">
//           <Timer className="mr-2" size={18} />
//           {formatTimeDelta(differenceInSeconds(now, startTime))}
//         </div>

//         <MCQCounter correct_answers={correct_Answers} wrong_answers={wrongAnswer} />
//       </div>

//       {/* QUESTION CARD */}
//       <Card className="w-full mt-4">
//         <CardHeader className="flex flex-row items-start gap-4">
//           <CardTitle className="mr-5 flex flex-col items-center">
//             <span className="font-semibold text-lg">{questionIndex + 1}</span>
//             <span className="text-sm text-slate-400">{game.questions.length}</span>
//           </CardTitle>

//           <CardDescription className="flex-grow text-lg">
//             {currentQuestion?.question}
//           </CardDescription>
//         </CardHeader>
//       </Card>

//       {/* OPTIONS */}
//       <div className="flex flex-col w-full mt-4 gap-3">
//         {options.map((option, index) => {
//           const isSelected = selectedChoice === index;

//           return (
//             <button
//               key={index}
//               onClick={() => setSelectedChoice(index)}
//               className={`
//                 w-full flex items-center gap-4 p-4 rounded-xl border
//                 transition-all duration-200 text-left
//                 ${
//                   isSelected
//                     ? "bg-slate-800 text-white border-slate-700"
//                     : "bg-slate-100 text-black border-slate-300"
//                 }
//               `}
//             >
//               <div
//                 className={`
//                   flex items-center justify-center w-6 h-6 rounded-full border text-sm
//                   ${
//                     isSelected
//                       ? "bg-white text-slate-900 border-white"
//                       : "bg-transparent text-slate-700 border-slate-500"
//                   }
//                 `}
//               >
//                 {index + 1}
//               </div>

//               <span className="text-base font-medium">{option}</span>
//             </button>
//           );
//         })}

//         {/* NEXT BUTTON */}
//         <div className="w-full flex justify-center mt-6">
//           <Button className="mt-2" disabled={isChecking} onClick={handleNext}>
//             {isChecking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
//             Next <ChevronRight className="w-4 h-4 ml-2" />
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MCQ;
// "use client";

// import { Game, Question } from "@prisma/client";
// import { differenceInSeconds } from "date-fns";
// import { BarChart, ChevronRight, Loader2, Timer } from "lucide-react";
// import React from "react";
// import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
// import { Button, buttonVariants } from "./ui/button";
// import MCQCounter from "./MCQCounter";
// import { useMutation } from "@tanstack/react-query";
// import axios from "axios";
// import { checkAnswerSchema, endGameSchema } from "@/schemas/forms/questions";
// import { z } from "zod";
// import { toast } from "sonner";
// import { cn, formatTimeDelta } from "@/lib/utils";

// type Props = {
//   game: Game & { questions: Pick<Question, "id" | "question" | "options">[] };
// };

// const MCQ = ({ game }: Props) => {
//   const [questionIndex, setQuestionIndex] = React.useState(0);
//   const [selectedChoice, setSelectedChoice] = React.useState<number | null>(null);
//   const [correct_Answers, setCorrectAnswer] = React.useState<number>(0);
//   const [wrongAnswer, setWrongAnswer] = React.useState<number>(0);
//   const [hasEnded, setHasEnded] = React.useState<boolean>(false);

//   // Store startTime as a Date object to avoid errors
//   const startTime = new Date(game.timeStarted);

//   const [now, setNow] = React.useState<Date>(new Date());

//   // LIVE TIMER
//   React.useEffect(() => {
//     const interval = setInterval(() => {
//       if (!hasEnded) {
//         setNow(new Date());
//       }
//     }, 1000);
//     return () => clearInterval(interval);
//   }, [hasEnded]);

//   const currentQuestion = React.useMemo(() => {
//     return game.questions[questionIndex];
//   }, [questionIndex, game.questions]);

//   const options = React.useMemo(() => {
//     if (!currentQuestion || !currentQuestion.options) return [];
//     return JSON.parse(currentQuestion.options as string) as string[];
//   }, [currentQuestion]);

//   // CHECK ANSWER
//   const { mutate: checkAnswer, isPending: isChecking } = useMutation({
//     mutationFn: async () => {
//       if (selectedChoice === null) throw new Error("No option selected");

//       const payload: z.infer<typeof checkAnswerSchema> = {
//         questionId: currentQuestion.id,
//         userInput: options[selectedChoice],
//       };

//       const response = await axios.post("/api/checkAnswer", payload);
//       return response.data as { isCorrect: boolean };
//     },
//   });

//   // SAVE END TIME
//   const saveEndTime = async () => {
//     try {
//       const payload: z.infer<typeof endGameSchema> = { gameId: game.id };
//       await axios.post("/api/endGame", payload);
//     } catch (err) {
//       console.error("Failed saving end time:", err);
//     }
//   };

//   const handleNext = React.useCallback(() => {
//     if (isChecking) return;

//     checkAnswer(undefined, {
//       onSuccess: async ({ isCorrect }) => {
//         if (isCorrect) {
//           toast.success("Correct!");
//           setCorrectAnswer((p) => p + 1);
//         } else {
//           toast.error("Wrong!");
//           setWrongAnswer((p) => p + 1);
//         }

//         // LAST QUESTION
//         if (questionIndex === game.questions.length - 1) {
//           await saveEndTime();
//           setHasEnded(true);
//           return;
//         }

//         setQuestionIndex((prev) => prev + 1);
//         setSelectedChoice(null);
//       },
//     });
//   }, [checkAnswer, isChecking, questionIndex, game.questions.length]);

//   // KEYBOARD SHORTCUTS
//   React.useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       if (e.key === "1") setSelectedChoice(0);
//       else if (e.key === "2") setSelectedChoice(1);
//       else if (e.key === "3") setSelectedChoice(2);
//       else if (e.key === "4") setSelectedChoice(3);
//       else if (e.key === "Enter") handleNext();
//     };

//     document.addEventListener("keydown", handleKeyDown);
//     return () => document.removeEventListener("keydown", handleKeyDown);
//   }, [handleNext]);

//   // END SCREEN
//   if (hasEnded) {
//     return (
//       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
//         <div className="px-4 mt-2 font-semibold text-white bg-green-500 rounded-md whitespace-nowrap">
//           You completed in{" "}
//           {formatTimeDelta(differenceInSeconds(now, startTime))}
//         </div>

//         <a href={`/statistics/${game.id}`} className={cn(buttonVariants(), "mt-2")}>
//           View Statistics
//           <BarChart className="w-4 h-4 ml-2" />
//         </a>
//       </div>
//     );
//   }

//   // MAIN SCREEN
//   return (
//     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl">
//       {/* HEADER */}
//       <div className="flex flex-row justify-between items-center">
//         <p className="flex items-center gap-2">
//           <span className="text-slate-400">Topic:</span>
//           <span className="px-2 py-1 rounded-lg bg-slate-800 text-white">
//             {game.topic}
//           </span>
//         </p>

//         <div className="flex items-center text-slate-400">
//           <Timer className="mr-2" size={18} />
//           {formatTimeDelta(differenceInSeconds(now, startTime))}
//         </div>

//         <MCQCounter correct_answers={correct_Answers} wrong_answers={wrongAnswer} />
//       </div>

//       {/* QUESTION CARD */}
//       <Card className="w-full mt-4">
//         <CardHeader className="flex flex-row items-start gap-4">
//           <CardTitle className="mr-5 flex flex-col items-center">
//             <span className="font-semibold text-lg">{questionIndex + 1}</span>
//             <span className="text-sm text-slate-400">{game.questions.length}</span>
//           </CardTitle>

//           <CardDescription className="flex-grow text-lg">
//             {currentQuestion?.question}
//           </CardDescription>
//         </CardHeader>
//       </Card>

//       {/* OPTIONS */}
//       <div className="flex flex-col w-full mt-4 gap-3">
//         {options.map((option, index) => {
//           const isSelected = selectedChoice === index;

//           return (
//             <button
//               key={index}
//               onClick={() => setSelectedChoice(index)}
//               className={`
//                 w-full flex items-center gap-4 p-4 rounded-xl border
//                 transition-all duration-200 text-left
//                 ${
//                   isSelected
//                     ? "bg-slate-800 text-white border-slate-700"
//                     : "bg-slate-100 text-black border-slate-300"
//                 }
//               `}
//             >
//               <div
//                 className={`
//                   flex items-center justify-center w-6 h-6 rounded-full border text-sm
//                   ${
//                     isSelected
//                       ? "bg-white text-slate-900 border-white"
//                       : "bg-transparent text-slate-700 border-slate-500"
//                   }
//                 `}
//               >
//                 {index + 1}
//               </div>

//               <span className="text-base font-medium">{option}</span>
//             </button>
//           );
//         })}

//         {/* NEXT BUTTON */}
//         <div className="w-full flex justify-center mt-6">
//           <Button className="mt-2" disabled={isChecking} onClick={handleNext}>
//             {isChecking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
//             Next <ChevronRight className="w-4 h-4 ml-2" />
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MCQ;
"use client";

import { Game, Question } from "@prisma/client";
import { differenceInSeconds } from "date-fns";
import { ChevronRight, Loader2, Timer } from "lucide-react";
import React, { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button, buttonVariants } from "./ui/button";
import MCQCounter from "./MCQCounter";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { checkAnswerSchema, endGameSchema } from "@/schemas/forms/questions";
import { z } from "zod";
import { toast } from "sonner";
import { cn, formatTimeDelta } from "@/lib/utils";

type Props = {
  game: Game & {
    questions: Pick<Question, "id" | "question" | "options" | "answer">[];
  };
};

const MCQ = ({ game }: Props) => {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [correct_Answers, setCorrectAnswer] = useState<number>(0);
  const [wrongAnswer, setWrongAnswer] = useState<number>(0);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hasEnded, setHasEnded] = useState(false);

  const [displayedOptions, setDisplayedOptions] = useState<string[]>([]);

  const startTime = new Date(game.timeStarted);
  const [now, setNow] = useState<Date>(new Date());

  // TIMER
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (!hasEnded) setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [hasEnded]);

  const currentQuestion = game.questions[questionIndex];
  const options = JSON.parse(currentQuestion.options as string) as string[];

  // Load fresh options for each question
  React.useEffect(() => {
    setDisplayedOptions(options);
  }, [currentQuestion]);

  // CHECK ANSWER API
  const { mutate: checkAnswer, isPending: isChecking } = useMutation({
    mutationFn: async () => {
      if (selectedChoice === null) throw new Error("No option selected");

      const payload: z.infer<typeof checkAnswerSchema> = {
        questionId: currentQuestion.id,
        userInput: displayedOptions[selectedChoice],
      };

      const res = await axios.post("/api/checkAnswer", payload);
      return res.data as { isCorrect: boolean };
    },
  });

  // END GAME API
  const saveEndTime = async () => {
    try {
      const payload: z.infer<typeof endGameSchema> = { gameId: game.id };
      await axios.post("/api/endGame", payload);
    } catch (err) {
      console.error("error saving end time", err);
    }
  };

  // SUBMIT
  const handleSubmit = () => {
    if (selectedChoice === null) return;

    checkAnswer(undefined, {
      onSuccess: ({ isCorrect }) => {
        setSubmitted(true);
        setIsCorrect(isCorrect);

        if (isCorrect) {
          setCorrectAnswer((p) => p + 1);
          toast.success("Correct!");
        } else {
          setWrongAnswer((p) => p + 1);
          toast.error("Wrong!");
        }
      },
    });
  };

  // NEXT
  const handleNext = async () => {
    if (!submitted) return;

    if (questionIndex === game.questions.length - 1) {
      await saveEndTime();
      setHasEnded(true);
      return;
    }

    setQuestionIndex((p) => p + 1);
    setSelectedChoice(null);
    setSubmitted(false);
    setIsCorrect(null);
  };

  // 50–50 LIFELINE
  const useFiftyFifty = async () => {
    if (game.usedFiftyFifty || submitted) return;

    const correct = currentQuestion.answer;
    const incorrect = displayedOptions.filter((o) => o !== correct);
    const oneIncorrect =
      incorrect[Math.floor(Math.random() * incorrect.length)];

    const newOptions = [correct, oneIncorrect].sort(
      () => Math.random() - 0.5
    );

    setDisplayedOptions(newOptions);

    await fetch("/api/lifeline", {
      method: "POST",
      body: JSON.stringify({
        type: "fifty_fifty",
        gameId: game.id,
      }),
    });

    game.usedFiftyFifty = true;
  };

  // FLIP QUESTION
  const useFlip = async () => {
    if (game.usedFlip || submitted) return;

    const res = await fetch("/api/lifeline", {
      method: "POST",
      body: JSON.stringify({
        type: "flip",
        gameId: game.id,
        topic: game.topic,
      }),
    });

    const data = await res.json();

    if (!data.question) {
      toast.error("No more questions available!");
      return;
    }

    game.questions[questionIndex] = data.question;

    const opts = JSON.parse(data.question.options);
    setDisplayedOptions(opts);

    setSelectedChoice(null);
    setSubmitted(false);
    setIsCorrect(null);

    game.usedFlip = true;
  };

  // END SCREEN
  if (hasEnded) {
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <div className="px-4 mt-2 font-semibold text-white bg-green-500 rounded-md whitespace-nowrap">
          You completed in {formatTimeDelta(differenceInSeconds(now, startTime))}
        </div>

        <a
          href={`/statistics/${game.id}`}
          className={cn(buttonVariants(), "mt-4 flex items-center gap-2")}
        >
          View Statistics
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl">
      {/* HEADER */}
      <div className="flex flex-row justify-between items-center">
        <p className="flex items-center gap-2">
          <span className="text-slate-400">Topic:</span>
          <span className="px-2 py-1 rounded-lg bg-slate-800 text-white">
            {game.topic}
          </span>
        </p>

        <div className="flex items-center text-slate-400">
          <Timer className="mr-2" size={18} />
          {formatTimeDelta(differenceInSeconds(now, startTime))}
        </div>

        <MCQCounter
          correct_answers={correct_Answers}
          wrong_answers={wrongAnswer}
        />
      </div>

      {/* LIFELINES – KBC STYLE */}
      <div className="flex justify-center gap-4 mt-4">
        <Button
          disabled={game.usedFiftyFifty || submitted}
          onClick={useFiftyFifty}
          className={cn(
            "px-6 rounded-full font-semibold",
            game.usedFiftyFifty || submitted
              ? "bg-[#1e1f6e]/50 text-slate-300 cursor-not-allowed"
              : "bg-[#1e1f6e] hover:bg-[#25279b] text-white"
          )}
        >
          50–50
        </Button>

        <Button
          disabled={game.usedFlip || submitted}
          onClick={useFlip}
          className={cn(
            "px-6 rounded-full font-semibold",
            game.usedFlip || submitted
              ? "bg-[#d6b100]/50 text-slate-500 cursor-not-allowed"
              : "bg-[#d6b100] hover:bg-[#e6c200] text-slate-900"
          )}
        >
          Flip
        </Button>
      </div>

      {/* QUESTION */}
      <Card className="w-full mt-4">
        <CardHeader className="flex flex-row items-start gap-4">
          <CardTitle className="mr-5 flex flex-col items-center">
            <span className="font-semibold text-lg">{questionIndex + 1}</span>
            <span className="text-sm text-slate-400">
              {game.questions.length}
            </span>
          </CardTitle>

          <CardDescription className="flex-grow text-lg">
            {currentQuestion.question}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* OPTIONS */}
      <div className="flex flex-col w-full mt-4 gap-3">
        {displayedOptions.map((option, index) => {
          const isSelected = selectedChoice === index;
          const isCorrectOption =
            submitted && isCorrect && selectedChoice === index;
          const isWrongSelected =
            submitted && !isCorrect && selectedChoice === index;

          return (
            <button
              key={index}
              disabled={submitted}
              onClick={() => !submitted && setSelectedChoice(index)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left",
                isCorrectOption
                  ? "bg-green-500 text-white border-green-500"
                  : isWrongSelected
                  ? "bg-red-500 text-white border-red-500"
                  : isSelected
                  ? "bg-slate-800 text-white border-slate-700"
                  : "bg-slate-100 text-black border-slate-300"
              )}
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full border text-sm bg-white text-black">
                {index + 1}
              </div>

              <span className="text-base font-medium">{option}</span>
            </button>
          );
        })}

        {/* SUBMIT BUTTON */}
        {!submitted && (
          <div className="w-full flex justify-center mt-6">
            <Button
              disabled={selectedChoice === null || isChecking}
              onClick={handleSubmit}
              className="w-40"
            >
              {isChecking && (
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
              )}
              Submit
            </Button>
          </div>
        )}

        {/* NEXT BUTTON */}
        {submitted && (
          <div className="w-full flex justify-center mt-6">
            <Button onClick={handleNext} className="w-40">
              Next <ChevronRight className="ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MCQ;
