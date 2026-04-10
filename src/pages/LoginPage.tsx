// Tela de login do sistema
import { useState } from "react";
import { Button } from "../components/ui/Button";

// Página de login
// Renderiza a pagina de login simplificada usada para autenticar o usuario.
export function LoginPage() {
  const [loading, setLoading] = useState(false);

  // Função de login
  // Envia usuario e senha para a API e controla o estado de carregamento do formulario.
  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);

    const username = formData.get("username");
    const password = formData.get("password");

    if (!username || !password) {
      alert("Usuário e senha são obrigatórios");
      setLoading(false);
      return;
    }

    try {
      // Chamada para API
      const res = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      alert("Login OK");
    } catch (err: any) {
      alert(err.message);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin}>
      <input name="username" placeholder="Usuário" />
      <input name="password" type="password" placeholder="Senha" />

      <Button type="submit">
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
