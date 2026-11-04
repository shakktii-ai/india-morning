import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hourglass } from "lucide-react";
import { differenceInSeconds } from "date-fns";
import { formatTimeDelta } from "@/lib/utils";

type Props = {
  timeStarted: Date;
  timeEnded: Date | null;
};

const TimeTakenCard = ({ timeEnded, timeStarted }: Props) => {
  let content = "In progress";

  if (timeEnded) {
    const seconds = differenceInSeconds(timeEnded, timeStarted);

    // safeguard: if somehow negative or zero, treat as in progress
    if (seconds > 0) {
      content = formatTimeDelta(seconds);
    }
  }

  return (
    <Card className="md:col-span-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-2xl font-bold">Time Taken</CardTitle>
        <Hourglass />
      </CardHeader>
      <CardContent>
        <div className="text-sm font-medium">{content}</div>
      </CardContent>
    </Card>
  );
};

export default TimeTakenCard;
