import React from "react";
import { getAuthSession } from "@/lib/nextauth";
import { redirect } from "next/navigation";
import { QuizCreation } from "@/components/QuizCreation";

export const metadata = {
  title: "Quiz | Quizzzy",
  description: "Quiz yourself on anything!",
};

interface Props {
  searchParams: Promise<{
    topic?: string;
  }>;
}

const Quiz = async ({ searchParams }: Props) => {
  const session = await getAuthSession();
  if (!session?.user) redirect("/");

  // ⬅️ FIX: searchParams is a Promise now
  const params = await searchParams;

  return <QuizCreation topicParam={params.topic ?? ""} />;
};

export default Quiz;
