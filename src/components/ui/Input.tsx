import { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
}

export function Input({ label, hint, id, className = "", ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className={`input-field ${className}`.trim()} htmlFor={inputId}>
      <span>{label}</span>
      <input id={inputId} {...props} />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}
