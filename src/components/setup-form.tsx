"use client";

import { ArrowRight, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { requestJson } from "@/lib/client-api";

function parseMemberNames(value: string) {
  return value
    .split(/\n|,/g)
    .map((name) => name.trim())
    .filter(Boolean);
}

export function SetupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [memberNames, setMemberNames] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setError("");
      await requestJson("/api/setup", {
        body: JSON.stringify({
          email,
          memberNames: parseMemberNames(memberNames),
          name,
          password,
          workspaceName,
        }),
        method: "POST",
      });

      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Не удалось завершить настройку.",
      );
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-copy">
        <p className="eyebrow">Регистрация</p>
        <h1>Создайте аккаунт и первое финансовое пространство</h1>
        <p className="muted-copy">
          У каждого пользователя может быть своё отдельное пространство или
          несколько общих по приглашению.
        </p>
      </div>

      <label className="field">
        <span>Ваше имя</span>
        <input
          className="input"
          onChange={(event) => setName(event.target.value)}
          placeholder="Дмитрий"
          type="text"
          value={name}
        />
      </label>

      <label className="field">
        <span>Электронная почта</span>
        <input
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
          className="input"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Не меньше 8 символов"
          type="password"
          value={password}
        />
      </label>

      <label className="field">
        <span>Название пространства</span>
        <input
          className="input"
          onChange={(event) => setWorkspaceName(event.target.value)}
          placeholder="Семейный бюджет"
          type="text"
          value={workspaceName}
        />
      </label>

      <label className="field">
        <span>Кого отслеживать</span>
        <textarea
          className="textarea"
          onChange={(event) => setMemberNames(event.target.value)}
          placeholder={"Вы\nПартнер\nСосед"}
          rows={4}
          value={memberNames}
        />
      </label>

      {error ? <p className="inline-error">{error}</p> : null}

      <button className="button button-primary button-with-icon" type="submit">
        <Wallet size={18} />
        {isPending ? "Создаем пространство..." : "Создать пространство"}
      </button>

      <div className="auth-hints">
        <span><Users size={14} /> Можно добавить до 8 участников учета</span>
        <span><ArrowRight size={14} /> Дефолтные категории и код приглашения создадутся автоматически</span>
        <span>
          Уже есть аккаунт?
          {" "}
          <Link className="inline-link" href="/login">
            Войти
          </Link>
        </span>
      </div>
    </form>
  );
}
