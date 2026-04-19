"use client";

import { PencilLine, Plus, Save, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { calculateSavingsProgress } from "@/lib/calculations";
import { requestJson } from "@/lib/client-api";
import { formatCurrency } from "@/lib/format";
import type { AppSettingsRecord } from "@/lib/settings";
import type { SavingsGoalRecord } from "@/lib/serializers";
import { ProgressBar } from "@/components/progress-bar";

type SavingsGoalsClientProps = {
  savingsGoals: SavingsGoalRecord[];
  settings: AppSettingsRecord;
};

function createGoalForm(goal?: SavingsGoalRecord) {
  return {
    currentAmount: goal ? String(goal.currentAmount) : "0",
    name: goal?.name ?? "",
    notes: goal?.notes ?? "",
    targetAmount: goal ? String(goal.targetAmount) : "",
    targetDate: goal?.targetDate ?? "",
  };
}

export function SavingsGoalsClient({
  savingsGoals,
  settings,
}: SavingsGoalsClientProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => createGoalForm());
  const [isPending, startTransition] = useTransition();

  const goalProgress = savingsGoals
    .map((goal) => calculateSavingsProgress(goal))
    .sort((left, right) => right.progress - left.progress);

  function resetForm() {
    setEditingId(null);
    setForm(createGoalForm());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setError("");
      await requestJson(
        editingId ? `/api/savings-goals/${editingId}` : "/api/savings-goals",
        {
          body: JSON.stringify({
            currentAmount: Number(form.currentAmount),
            name: form.name,
            notes: form.notes,
            targetAmount: Number(form.targetAmount),
            targetDate: form.targetDate || undefined,
          }),
          method: editingId ? "PATCH" : "POST",
        },
      );

      resetForm();
      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось сохранить цель.",
      );
    }
  }

  async function handleDelete(goalId: string) {
    if (!window.confirm("Удалить эту цель?")) {
      return;
    }

    try {
      setError("");
      await requestJson(`/api/savings-goals/${goalId}`, {
        method: "DELETE",
      });

      if (editingId === goalId) {
        resetForm();
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось удалить цель.",
      );
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Цели накоплений</p>
          <h2>Следите за прогрессом и остатком до цели</h2>
          <p className="muted-copy">
            По каждой цели сразу видно текущую сумму, остаток до результата и, при
            желании, конечный срок.
          </p>
        </div>
        <div className="hero-inline-metrics">
          <div>
            <span>Целей</span>
            <strong>{savingsGoals.length}</strong>
          </div>
          <div>
            <span>Общая цель</span>
            <strong>
              {formatCurrency(
                savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0),
                settings,
              )}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{editingId ? "Редактирование" : "Создание"}</p>
            <h3>{editingId ? "Обновить цель" : "Новая цель накоплений"}</h3>
          </div>
          {editingId ? (
            <button
              className="button button-ghost button-with-icon"
              onClick={resetForm}
              type="button"
            >
              <X size={18} />
              Отменить
            </button>
          ) : null}
        </div>

        <form className="form-grid form-grid-wide" onSubmit={handleSubmit}>
          <label className="field">
            <span>Название</span>
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Финансовая подушка"
              required
              type="text"
              value={form.name}
            />
          </label>

          <label className="field">
            <span>Целевая сумма</span>
            <input
              className="input"
              inputMode="decimal"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  targetAmount: event.target.value,
                }))
              }
              placeholder="0.00"
              required
              type="number"
              value={form.targetAmount}
            />
          </label>

          <label className="field">
            <span>Текущая сумма</span>
            <input
              className="input"
              inputMode="decimal"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  currentAmount: event.target.value,
                }))
              }
              placeholder="0.00"
              required
              type="number"
              value={form.currentAmount}
            />
          </label>

          <label className="field">
            <span>Срок</span>
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  targetDate: event.target.value,
                }))
              }
              type="date"
              value={form.targetDate}
            />
          </label>

          <label className="field field-span-full">
            <span>Заметки</span>
            <textarea
              className="textarea"
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="На что эта цель"
              rows={3}
              value={form.notes}
            />
          </label>

          <div className="form-actions">
            {error ? <p className="inline-error">{error}</p> : null}
            <button className="button button-primary button-with-icon" type="submit">
              {editingId ? <Save size={18} /> : <Plus size={18} />}
              {isPending ? "Сохраняем..." : editingId ? "Сохранить цель" : "Добавить цель"}
            </button>
          </div>
        </form>
      </section>

      <section className="list-grid">
        {goalProgress.length ? (
          goalProgress.map((goal) => (
            <article className="panel goal-card" key={goal.id}>
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">Цель</p>
                  <h3>{goal.name}</h3>
                </div>
                <strong>{formatCurrency(goal.targetAmount, settings)}</strong>
              </div>

              <ProgressBar color="var(--warning)" value={goal.progress} />

              <div className="goal-meta">
                <span>Накоплено {formatCurrency(goal.currentAmount, settings)}</span>
                <span>Осталось {formatCurrency(goal.remaining, settings)}</span>
                <span>{goal.targetDate ? `Срок: ${goal.targetDate}` : "Без срока"}</span>
              </div>

              {goal.notes ? <p className="muted-copy">{goal.notes}</p> : null}

              <div className="transaction-actions">
                <button
                  className="button button-subtle button-with-icon"
                  onClick={() => {
                    setEditingId(goal.id);
                    setError("");
                    setForm(createGoalForm(goal));
                  }}
                  type="button"
                >
                  <PencilLine size={16} />
                  Изменить
                </button>
                <button
                  className="button button-subtle-danger button-with-icon"
                  onClick={() => handleDelete(goal.id)}
                  type="button"
                >
                  <Trash2 size={16} />
                  Удалить
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="panel empty-panel">
            <p className="empty-copy">
              Создайте цель накоплений, чтобы отслеживать прогресс и остаток.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
