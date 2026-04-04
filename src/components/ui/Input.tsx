// Componente de input com label
import React from "react";

export function Input({ label, ...props }: any) {
  return (
    <div>
      <label>{label}</label>
      <input {...props} className="border p-2 w-full" />
    </div>
  );
}