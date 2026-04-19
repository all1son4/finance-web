"use client";

import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { requestJson } from "@/lib/client-api";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setError("");
      await requestJson("/api/login", {
        body: JSON.stringify({ email, password }),
        method: "POST",
      });

      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Не удалось войти.",
      );
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-copy">
        <p className="eyebrow">С возвращением</p>
        <h1>Войдите в свой финансовый кабинет</h1>
        <p className="muted-copy">
          Один аккаунт может иметь несколько пространств: личные и общие.
        </p>
      </div>

      <label className="field">
        <span>Электронная почта</span>
        <input
          autoComplete="email"
          className="input"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
      </label>

      <label className="field">
        <span>Пароль</span>
        <input
          autoComplete="current-password"
          className="input"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Не меньше 8 символов"
          type="password"
          value={password}
        />
      </label>

      {error ? <p className="inline-error">{error}</p> : null}

      <button className="button button-primary button-with-icon" type="submit">
        <Mail size={18} />
        {isPending ? "Входим..." : "Войти"}
      </button>

      <div className="auth-hints">
        <span><LockKeyhole size={14} /> Пароль никогда не уходит на клиент в открытом виде</span>
        <span><ArrowRight size={14} /> После входа вы сразу попадете на главную</span>
        <span>
          Нет аккаунта?
          {" "}
          <Link className="inline-link" href="/setup">
            Зарегистрироваться
          </Link>
        </span>
      </div>
    </form>
  );
}
