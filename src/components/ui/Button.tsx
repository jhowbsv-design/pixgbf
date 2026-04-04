// Botão reutilizável do sistema
import React from "react";

// Tipos de botão disponíveis
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

// Componente botão
export function Button({ variant = "primary", ...props }: Props) {
  const style =
    variant === "primary"
      ? "bg-blue-600 text-white"
      : "bg-gray-200 text-black";

  return (
    <button
      className={`px-4 py-2 rounded ${style}`}
      {...props}
    />
  );
}