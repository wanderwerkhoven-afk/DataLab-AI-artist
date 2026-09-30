import React from "react";
import RadioInput from "./RadioInput";

interface Option {
  id: string;
  value: string;
  title: string;
}

interface PromptFormProps {
  title: string;
  options: Option[];
  selectedOption: string;
  setSelectedOption: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  onRetakePhoto: () => void;
}

const PromptForm: React.FC<PromptFormProps> = ({
  title,
  options,
  selectedOption,
  setSelectedOption,
  onNext,
  onBack,
  onRetakePhoto,
}) => {
  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="p-5 border rounded text-neutral-400"
        >
          <svg
            className="w-4 h-4 rotate-180"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 10"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M1 5h12m0 0L9 1m4 4L9 9"
            />
          </svg>
        </button>
        <button onClick={onRetakePhoto} className="p-5 border rounded">
          <img className="w-4 h-4" src="refresh.svg" alt="refresh" />
        </button>
      </div>

      <div>
        <h3 className="mb-2 font-medium">{title}</h3>
        <ul className="grid w-full gap-2 grid-cols-2">
          {options.map((option) => (
            <RadioInput
              key={option.id}
              id={option.id}
              name="environment"
              value={option.value}
              title={option.title}
              onChange={setSelectedOption}
            />
          ))}
        </ul>
      </div>

      <button
        onClick={onNext}
        className="relative flex items-center justify-center p-3 bg-blue-500 text-white rounded hover:bg-blue-600 mt-4"
        disabled={!selectedOption}
      >
        Next
        <svg
          className="absolute right-4 w-3 h-3 rtl:rotate-180"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 14 10"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M1 5h12m0 0L9 1m4 4L9 9"
          />
        </svg>
      </button>
    </div>
  );
};

export default PromptForm;
