import React from "react";

interface RadioInputProps {
  id: string;
  name: string;
  value: string;
  title: string;
  description?: string;
  onChange: (value: string) => void;
}

const RadioInput: React.FC<RadioInputProps> = ({
  id,
  name,
  value,
  title,
  description = "",
  onChange,
}) => {
  return (
    <li>
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        className="hidden peer"
        onChange={() => onChange(value)}
      />
      <label
        htmlFor={id}
        className="inline-flex items-center justify-center w-full p-3 text-gray-500 bg-white border border-gray-200 rounded-lg cursor-pointer peer-checked:border-blue-600 peer-checked:text-blue-600"
      >
        <div className="block">
          <div className="w-full text-lg">{title}</div>
          <div className="w-full">{description}</div>
        </div>
      </label>
    </li>
  );
};

export default RadioInput;
