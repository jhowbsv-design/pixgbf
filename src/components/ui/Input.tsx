// Componente de input com label

// Renderiza um campo de entrada simples com label acima do input.
export function Input({ label, ...props }: any) {
  return (
    <div>
      <label>{label}</label>
      <input {...props} className="border p-2 w-full" />
    </div>
  );
}
