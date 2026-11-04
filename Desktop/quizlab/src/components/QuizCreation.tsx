"use client"
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { quizCreationSchema } from '@/schemas/forms/quiz'
import z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from './ui/button'
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from './ui/form'
import { Form } from "@/components/ui/form";
import { useForm } from 'react-hook-form'
import { Input } from './ui/input'
import { BookOpen, CopyCheck } from 'lucide-react'
import { Separator } from '@radix-ui/react-separator'
import { useMutation} from '@tanstack/react-query'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import LoadingQuestions from './LoadingQuestions'

interface Props {
  topicParam:string
};

type Input = z.infer<typeof quizCreationSchema>

export const QuizCreation = ({topicParam}: Props) => {
  const router = useRouter();
  const [showLoader, setShowLoader] = React.useState(false);
  const[finished,setFinished] = React.useState(false);
  const { mutate: getQuestions, isPending} = useMutation({
    mutationFn: async ({ amount, topic, type }: Input) => {
      const response = await axios.post('/api/game', {
        amount,
        topic,
        type,
      });
      return response.data; // <— data returned properly
    },
  });

  const form = useForm<Input>({
    resolver: zodResolver(quizCreationSchema),
    defaultValues: {
      amount: 3,
      topic: topicParam,
      type: "open_ended",
    },
  });

  function onSubmit(input: Input) {
    setShowLoader(true)
    getQuestions(
      {
        amount: input.amount,
        topic: input.topic,
        type: input.type,
      },
      {
        onSuccess: (data) => {
          setFinished(true);
          setTimeout(()=>{
          if (form.getValues("type")=="open_ended"){
          router.push(`/play/open-ended/${data.gameId}`);
          }else{
            router.push(`/play/mcq/${data.gameId}`);
          }
          },1000);
        },
        onError:()=>{
          setShowLoader(false)
        }
      }
    );
  }

  const watchAll = form.watch();
if (showLoader){
  return<LoadingQuestions finished={finished}/>
}
  return (
    <div className='absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 w-11/12 md:w-3/4 lg:w-1/2'>
      <Card>
        <CardHeader>
          <CardTitle className="text 2x font-bold">
            Quiz creation
          </CardTitle>
          <CardDescription>
            Create your custom quiz by selecting topics, difficulty levels, and question types.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

              {/* TOPIC FIELD */}
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                      <Input
                        className="w-full rounded border border-slate-200 px-3 py-2"
                        placeholder="Enter a topic..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Please provide the topic</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* AMOUNT + TYPE + SUBMIT */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <>
                    <FormItem>
                      <FormLabel>Number of Questions</FormLabel>
                      <FormControl>
                      <Input
                        placeholder="How many questions?"
                        type="number"
                        {...field}
                        onChange={(e) => {
                          form.setValue("amount", parseInt(e.target.value));
                        }}
                        min={1}
                        max={10}
                      />
                      </FormControl>
                      <FormMessage />

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <Button
                          type="button"
                          onClick={() => form.setValue("type", "mcq")}
                          className="w-full flex items-center gap-2"
                          variant={form.getValues("type") === "mcq" ? "default" : "secondary"}
                        >
                          <CopyCheck className="h-4 w-4" />
                          Multiple Choice
                        </Button>

                        <Button
                          type="button"
                          onClick={() => form.setValue("type", "open_ended")}
                          className="w-full flex items-center gap-2"
                          variant={form.getValues("type") === "open_ended" ? "default" : "secondary"}
                        >
                          <BookOpen className="h-4 w-4" />
                          Open Ended
                        </Button>
                      </div>
                    </FormItem>

                    <div className="flex justify-center mt-4">
                      <Button disabled={isPending} type="submit">Submit</Button>
                    </div>
                  </>
                )}
              />

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
