"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Minus,
  PiggyBank,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AppModal } from "@/components/app-modal";
import { requestJson } from "@/lib/client-api";
import { CATEGORY_KIND_LABELS } from "@/lib/defaults";
import { formatCurrency } from "@/lib/format";
import { createTransactionDraft } from "@/lib/prefill";
import type { AppSettingsRecord } from "@/lib/settings";
import type {
  CategoryRecord,
  MemberRecord,
  SavingsGoalRecord,
  TransactionRecord,
} from "@/lib/serializers";

type QuickActionType = "expense" | "income" | "savings";
type SavingsMode = "decrease" | "increase";

type DashboardQuickActionsProps = {
  categories: CategoryRecord[];
  members: MemberRecord[];
  savingsGoals: SavingsGoalRecord[];
  settings: AppSettingsRecord;
  transactions: TransactionRecord[];
};

function createSavingsState(goals: SavingsGoalRecord[]) {
  return {
    amount: "",
    goalId: goals[0]?.id ?? "",
    mode: "increase" as SavingsMode,
  };
}

export function DashboardQuickActions({
  categories,
  members,
  savingsGoals,
  settings,
  transactions,
}: DashboardQuickActionsProps) {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<QuickActionType | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [transactionForm, setTransactionForm] = useState(() =>
    createTransactionDraft(categories, members, transactions, "EXPENSE"),
  );
  const [savingsForm, setSavingsForm] = useState(() =>
    createSavingsState(savingsGoals),
  );

  const transactionKind = activeModal === "income" ? "INCOME" : "EXPENSE";
  const availableTransactionCategories = categories.filter(
    (category) => category.kind === transactionKind,
  );
  const selectedGoal = savingsGoals.find((goal) => goal.id === savingsForm.goalId) ?? null;

  function closeModal() {
    setActiveModal(null);
    setError("");
  }

  function openTransactionModal(type: "income" | "expense") {
    setError("");
    setTransactionForm(
      createTransactionDraft(
        categories,
        members,
        transactions,
        type === "income" ? "INCOME" : "EXPENSE",
      ),
    );
    setActiveModal(type);
  }

  function openSavingsModal() {
    setError("");
    setSavingsForm(createSavingsState(savingsGoals));
    setActiveModal("savings");
  }

  async function handleTransactionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setError("");
      await requestJson("/api/transactions", {
        body: JSON.stringify({
          amount: Number(transactionForm.amount),
          categoryId: transactionForm.categoryId,
          description: transactionForm.description,
          memberId: transactionForm.memberId,
          notes: transactionForm.notes,
          transactionDate: transactionForm.transactionDate,
        }),
        method: "POST",
      });

      closeModal();
      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось сохранить операцию.",
      );
    }
  }

  async function handleSavingsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedGoal) {
      return;
    }

    try {
      setError("");

      const amount = Number(savingsForm.amount);
      const nextAmount =
        savingsForm.mode === "increase"
          ? selectedGoal.currentAmount + amount
          : Math.max(selectedGoal.currentAmount - amount, 0);

      await requestJson(`/api/savings-goals/${selectedGoal.id}`, {
        body: JSON.stringify({
          currentAmount: nextAmount,
        }),
        method: "PATCH",
      });

      closeModal();
      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось обновить накопления.",
      );
    }
  }

  return (
    <>
      <section className="action-hub">
        <div className="action-hub-copy">
          <p className="eyebrow">Главная</p>
          <h2>Что хотите сделать прямо сейчас?</h2>
          <p className="muted-copy">
            Самые частые действия вынесены наверх, чтобы с телефона все заносилось
            буквально за пару касаний.
          </p>
        </div>

        <div className="quick-actions-grid">
          <button
            className="quick-action quick-action-income"
            onClick={() => openTransactionModal("income")}
            type="button"
          >
            <span className="quick-action-orb">
              <ArrowDownLeft size={28} />
            </span>
            <strong>Доход</strong>
            <span>Добавить поступление</span>
          </button>

          <button
            className="quick-action quick-action-expense"
            onClick={() => openTransactionModal("expense")}
            type="button"
          >
            <span className="quick-action-orb">
              <ArrowUpRight size={28} />
            </span>
            <strong>Трата</strong>
            <span>Записать расход</span>
          </button>

          <button
            className="quick-action quick-action-savings"
            onClick={openSavingsModal}
            type="button"
          >
            <span className="quick-action-orb">
              <PiggyBank size={28} />
            </span>
            <strong>Копилка</strong>
            <span>Пополнить или снять</span>
          </button>
        </div>
      </section>

      <AppModal
        description={
          activeModal === "income"
            ? "Добавьте доход с минимальным количеством полей."
            : "Быстрая запись операции без перехода в отдельный раздел."
        }
        onClose={closeModal}
        open={activeModal === "income" || activeModal === "expense"}
        title={activeModal === "income" ? "Добавить доход" : "Добавить трату"}
      >
        <form className="form-grid form-grid-wide modal-form" onSubmit={handleTransactionSubmit}>
          <label className="field">
            <span>Сумма</span>
            <input
              className="input"
              inputMode="decimal"
              onChange={(event) =>
                setTransactionForm((current) => ({
                  ...current,
                  amount: event.target.value,
                }))
              }
              placeholder="0"
              required
              type="number"
              value={transactionForm.amount}
            />
          </label>

          <label className="field">
            <span>Категория</span>
            <select
              className="input"
              onChange={(event) =>
                setTransactionForm((current) => ({
                  ...current,
                  categoryId: event.target.value,
                }))
              }
              value={transactionForm.categoryId}
            >
              {availableTransactionCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} • {CATEGORY_KIND_LABELS[category.kind]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Кто</span>
            <select
              className="input"
              onChange={(event) =>
                setTransactionForm((current) => ({
                  ...current,
                  memberId: event.target.value,
                }))
              }
              value={transactionForm.memberId}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Дата</span>
            <input
              className="input"
              onChange={(event) =>
                setTransactionForm((current) => ({
                  ...current,
                  transactionDate: event.target.value,
                }))
              }
              required
              type="date"
              value={transactionForm.transactionDate}
            />
          </label>

          <label className="field">
            <span>Описание</span>
            <input
              className="input"
              onChange={(event) =>
                setTransactionForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder={activeModal === "income" ? "Зарплата, аванс..." : "Кофе, такси, аренда..."}
              type="text"
              value={transactionForm.description}
            />
          </label>

          <label className="field">
            <span>Заметка</span>
            <input
              className="input"
              onChange={(event) =>
                setTransactionForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Необязательно"
              type="text"
              value={transactionForm.notes}
            />
          </label>

          <div className="form-actions">
            {error ? <p className="inline-error">{error}</p> : null}
            <button className="button button-primary button-with-icon" type="submit">
              {activeModal === "income" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
              {isPending ? "Сохраняем..." : activeModal === "income" ? "Добавить доход" : "Добавить трату"}
            </button>
          </div>
        </form>
      </AppModal>

      <AppModal
        description="Быстро измените текущую сумму по накопительной цели."
        onClose={closeModal}
        open={activeModal === "savings"}
        title="Изменить накопления"
      >
        {savingsGoals.length ? (
          <form className="form-grid modal-form" onSubmit={handleSavingsSubmit}>
            <div className="mode-switch">
              <button
                className={`mode-pill${savingsForm.mode === "increase" ? " is-active" : ""}`}
                onClick={() =>
                  setSavingsForm((current) => ({ ...current, mode: "increase" }))
                }
                type="button"
              >
                <Plus size={16} />
                Пополнить
              </button>
              <button
                className={`mode-pill${savingsForm.mode === "decrease" ? " is-active" : ""}`}
                onClick={() =>
                  setSavingsForm((current) => ({ ...current, mode: "decrease" }))
                }
                type="button"
              >
                <Minus size={16} />
                Снять
              </button>
            </div>

            <label className="field">
              <span>Цель</span>
              <select
                className="input"
                onChange={(event) =>
                  setSavingsForm((current) => ({ ...current, goalId: event.target.value }))
                }
                value={savingsForm.goalId}
              >
                {savingsGoals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Сумма</span>
              <input
                className="input"
                inputMode="decimal"
                onChange={(event) =>
                  setSavingsForm((current) => ({ ...current, amount: event.target.value }))
                }
                placeholder="0"
                required
                type="number"
                value={savingsForm.amount}
              />
            </label>

            {selectedGoal ? (
              <div className="savings-preview">
                <span>Сейчас: {formatCurrency(selectedGoal.currentAmount, settings)}</span>
                <strong>
                  Будет:{" "}
                  {formatCurrency(
                    savingsForm.mode === "increase"
                      ? selectedGoal.currentAmount + Number(savingsForm.amount || 0)
                      : Math.max(selectedGoal.currentAmount - Number(savingsForm.amount || 0), 0),
                    settings,
                  )}
                </strong>
              </div>
            ) : null}

            <div className="form-actions">
              {error ? <p className="inline-error">{error}</p> : null}
              <button className="button button-primary button-with-icon" type="submit">
                {savingsForm.mode === "increase" ? <Plus size={18} /> : <Minus size={18} />}
                {isPending
                  ? "Сохраняем..."
                  : savingsForm.mode === "increase"
                    ? "Пополнить цель"
                    : "Списать из цели"}
              </button>
            </div>
          </form>
        ) : (
          <div className="empty-panel modal-empty">
            <p className="empty-copy">
              Сначала создайте хотя бы одну цель накоплений в разделе «Цели».
            </p>
            <button
              className="button button-primary"
              onClick={() => {
                closeModal();
                router.push("/savings-goals");
              }}
              type="button"
            >
              Перейти к целям
            </button>
          </div>
        )}
      </AppModal>
    </>
  );
}
