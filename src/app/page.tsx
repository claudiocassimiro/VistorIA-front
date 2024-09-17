"use client";

import { useState } from "react"; // Importando useState
import { AppPage } from "@/src/components/app-page";

export default function Page() {
  const [password, setPassword] = useState(""); // Estado para a senha
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Estado de autenticação

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === process.env.NEXT_PUBLIC_APP_PASSWORD) {
      // Verificando a senha
      setIsAuthenticated(true);
    } else {
      alert("Senha incorreta!"); // Mensagem de erro
    }
  };

  return (
    <section className="flex justify-center items-center">
      {/* Centralizando com Tailwind */}
      {!isAuthenticated ? ( // Condicional para mostrar o formulário ou o AppPage
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          {" "}
          {/* Flex coluna com espaçamento */}
          <h1 className="text-2xl font-bold text-center">
            Para utilizar o aplicativo é preciso autenticar
          </h1>
          {/* Estilizando o título */}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite a senha"
            className="p-2 border border-gray-300 rounded" // Estilizando o input
          />
          <button
            type="submit"
            className="p-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Acessar
          </button>
          {/* Estilizando o botão com fundo preto e hover */}
        </form>
      ) : (
        <AppPage />
      )}
    </section>
  );
}
