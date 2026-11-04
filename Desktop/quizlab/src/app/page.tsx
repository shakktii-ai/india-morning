import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import SignInButton from "@/components/ui/signinButton";
import { getAuthSession } from "@/lib/nextauth";
import {redirect} from 'next/navigation'

export default async function Home() {
  const session =await getAuthSession();
  if(session?.user)
  {
    //That means the user is logged in 
   return redirect ("/dashboard");
  }
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <Card className="w-[380px] shadow-lg rounded-2xl border border-gray-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold text-gray-800">
            Welcome to Quizlab
          </CardTitle>
        </CardHeader>

        <CardDescription className="text-center text-gray-600 text-base leading-relaxed px-6">
          Quizlab is a quiz app that allows you to create and share quizzes with your friends.
        </CardDescription>

        <CardContent>
          <div className="flex justify-center mt-4">
            <SignInButton text="Sign In with Google" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
