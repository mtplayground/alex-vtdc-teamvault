import { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button className={`button button--${variant} button--${size} ${className}`.trim()} type={type} {...props}>
      {children}
    </button>
  );
}
