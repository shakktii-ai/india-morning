import React from "react";
type Props = {
  answerWithBlanks: string;
};

const blank = "_____";

const BlankAnswerInput = ({ answerWithBlanks }: Props) => {
  return (
    <div className="flex justify-start w-full mt-4">
      <h1 className="text-xl font-semibold">
        {answerWithBlanks.split(blank).map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index < answerWithBlanks.split(blank).length - 1 && (
              <input
                data-blank-input
                className="text-center border-b-2 border-black dark:border-white w-28 focus:border-2 focus:border-b-4 focus:outline-none"
                type="text"
              />
            )}
          </React.Fragment>
        ))}
      </h1>
    </div>
  );
};

export default BlankAnswerInput;
