"use client";

import { PencilLine, Plus, Save, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { calculateBudgetProgress } from "@/lib/calculations";
import { requestJson } from "@/lib/client-api";
import { CATEGORY_KIND_LABELS } from "@/lib/defaults";
import { formatCurrency, toDateInputValue } from "@/lib/format";
import { pickPreferredCategory } from "@/lib/prefill";
import type { AppSettingsRecord } from "@/lib/settings";
import type {
  BudgetRecord,
  CategoryRecord,
  TransactionRecord,
} from "@/lib/serializers";
import { ProgressBar } from "@/components/progress-bar";

type BudgetClientProps = {
  budgets: BudgetRecord[];
  categories: CategoryRecord[];
  settings: AppSettingsRecord;
  transactions: TransactionRecord[];
};

function currentMonthDates() {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  end.setUTCHours(23, 59, 59, 999);

  return {
    endDate: toDateInputValue(end),
    startDate: toDateInputValue(start),
  };
}

function createBudgetForm(
  categories: CategoryRecord[],
  transactions: TransactionRecord[],
  budget?: BudgetRecord,
) {
  const expenseCategory =
    pickPreferredCategory(categories, transactions, "EXPENSE") ?? categories[0];
  const monthDefaults = currentMonthDates();

  return {
    amount: budget ? String(budget.amount) : "",
    categoryId: budget?.categoryId ?? expenseCategory?.id ?? "",
    endDate: budget?.endDate ?? monthDefaults.endDate,
    name: budget?.name ?? "",
    startDate: budget?.startDate ?? monthDefaults.startDate,
  };
}

function createCategoryForm(category?: CategoryRecord) {
  return {
    color: category?.color ?? "#4DB6AC",
    kind: category?.kind ?? "EXPENSE",
    name: category?.name ?? "",
  };
}

export function BudgetClient({
  budgets,
  categories,
  settings,
  transactions,
}: BudgetClientProps) {
  const router = useRouter();
  const [budgetError, setBudgetError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [budgetForm, setBudgetForm] = useState(() =>
    createBudgetForm(categories, transactions),
  );
  const [categoryForm, setCategoryForm] = useState(() => createCategoryForm());
  const [isPending, startTransition] = useTransition();

  const expenseCategories = categories.filter((category) => category.kind === "EXPENSE");
  const budgetProgress = budgets
    .map((budget) => calculateBudgetProgress(budget, transactions))
    .sort((left, right) => right.progress - left.progress);

  function refreshPage() {
    startTransition(() => {
      router.refresh();
    });
  }

  function resetBudgetForm() {
    setEditingBudgetId(null);
    setBudgetForm(createBudgetForm(categories, transactions));
  }

  function resetCategoryForm() {
    setEditingCategoryId(null);
    setCategoryForm(createCategoryForm());
  }

  async function handleBudgetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setBudgetError("");
      await requestJson(
        editingBudgetId ? `/api/budgets/${editingBudgetId}` : "/api/budgets",
        {
          body: JSON.stringify({
            amount: Number(budgetForm.amount),
            categoryId: budgetForm.categoryId,
            endDate: budgetForm.endDate,
            name: budgetForm.name,
            startDate: budgetForm.startDate,
          }),
          method: editingBudgetId ? "PATCH" : "POST",
        },
      );

      resetBudgetForm();
      refreshPage();
    } catch (caughtError) {
      setBudgetError(
        caughtError instanceof Error ? caughtError.message : "Не удалось сохранить бюджет.",
      );
    }
  }

  async function handleCategorySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setCategoryError("");
      await requestJson(
        editingCategoryId
          ? `/api/categories/${editingCategoryId}`
          : "/api/categories",
        {
          body: JSON.stringify(categoryForm),
          method: editingCategoryId ? "PATCH" : "POST",
        },
      );

      resetCategoryForm();
      refreshPage();
    } catch (caughtError) {
      setCategoryError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось сохранить категорию.",
      );
    }
  }

  async function handleDeleteBudget(id: string) {
    if (!window.confirm("Удалить этот бюджет?")) {
      return;
    }

    try {
      setBudgetError("");
      await requestJson(`/api/budgets/${id}`, { method: "DELETE" });
      if (editingBudgetId === id) {
        resetBudgetForm();
      }
      refreshPage();
    } catch (caughtError) {
      setBudgetError(
        caughtError instanceof Error ? caughtError.message : "Не удалось удалить бюджет.",
      );
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!window.confirm("Удалить эту категорию?")) {
      return;
    }

    try {
      setCategoryError("");
      await requestJson(`/api/categories/${id}`, { method: "DELETE" });
      if (editingCategoryId === id) {
        resetCategoryForm();
      }
      refreshPage();
    } catch (caughtError) {
      setCategoryError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось удалить категорию.",
      );
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Бюджет</p>
          <h2>Контролируйте траты по категориям до того, как они разрастутся</h2>
          <p className="muted-copy">
            Бюджеты считаются только по категориям трат, поэтому прогресс остается
            честным и понятным.
          </p>
        </div>
        <div className="hero-inline-metrics">
          <div>
            <span>Активных бюджетов</span>
            <strong>{budgets.length}</strong>
          </div>
          <div>
            <span>Категорий</span>
            <strong>{categories.length}</strong>
          </div>
        </div>
      </section>

      <div className="split-layout">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{editingBudgetId ? "Редактирование" : "Создание"}</p>
              <h3>{editingBudgetId ? "Обновить бюджет" : "Новый бюджет"}</h3>
            </div>
            {editingBudgetId ? (
              <button
                className="button button-ghost button-with-icon"
                onClick={resetBudgetForm}
                type="button"
              >
                <X size={18} />
                Отменить
              </button>
            ) : null}
          </div>

          <form className="form-grid" onSubmit={handleBudgetSubmit}>
            <label className="field">
              <span>Название</span>
              <input
                className="input"
                onChange={(event) =>
                  setBudgetForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Лимит на продукты"
                type="text"
                value={budgetForm.name}
              />
            </label>

            <label className="field">
              <span>Категория</span>
              <select
                className="input"
                onChange={(event) =>
                  setBudgetForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
                value={budgetForm.categoryId}
              >
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
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
                  setBudgetForm((current) => ({ ...current, amount: event.target.value }))
                }
                placeholder="0.00"
                required
                type="number"
                value={budgetForm.amount}
              />
            </label>

            <label className="field">
              <span>Начало</span>
              <input
                className="input"
                onChange={(event) =>
                  setBudgetForm((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
                required
                type="date"
                value={budgetForm.startDate}
              />
            </label>

            <label className="field">
              <span>Конец</span>
              <input
                className="input"
                onChange={(event) =>
                  setBudgetForm((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
                required
                type="date"
                value={budgetForm.endDate}
              />
            </label>

            <div className="form-actions">
              {budgetError ? <p className="inline-error">{budgetError}</p> : null}
              <button className="button button-primary button-with-icon" type="submit">
                {editingBudgetId ? <Save size={18} /> : <Plus size={18} />}
                {isPending
                  ? "Сохраняем..."
                  : editingBudgetId
                    ? "Сохранить бюджет"
                    : "Добавить бюджет"}
              </button>
            </div>
          </form>

          <div className="stack-list">
            {budgetProgress.length ? (
              budgetProgress.map((budget) => (
                <article className="budget-card" key={budget.id}>
                  <div className="section-heading compact">
                    <div>
                      <h4>{budget.name}</h4>
                      <p className="muted-copy">
                        {budget.categoryName} • {budget.startDate} - {budget.endDate}
                      </p>
                    </div>
                    <strong>{formatCurrency(budget.amount, settings)}</strong>
                  </div>

                  <ProgressBar color={budget.categoryColor} value={budget.progress} />

                  <div className="budget-meta">
                    <span>Потрачено {formatCurrency(budget.spent, settings)}</span>
                    <span>
                      {budget.remaining >= 0
                        ? `Осталось ${formatCurrency(budget.remaining, settings)}`
                        : `Перерасход ${formatCurrency(Math.abs(budget.remaining), settings)}`}
                    </span>
                  </div>

                  <div className="transaction-actions">
                    <button
                      className="button button-subtle button-with-icon"
                      onClick={() => {
                        setEditingBudgetId(budget.id);
                        setBudgetError("");
                        setBudgetForm(createBudgetForm(categories, transactions, budget));
                      }}
                      type="button"
                    >
                      <PencilLine size={16} />
                      Изменить
                    </button>
                    <button
                      className="button button-subtle-danger button-with-icon"
                      onClick={() => handleDeleteBudget(budget.id)}
                      type="button"
                    >
                      <Trash2 size={16} />
                      Удалить
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-panel">
                <p className="empty-copy">
                  Создайте первый бюджет, чтобы видеть прогресс по тратам.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{editingCategoryId ? "Редактирование" : "Управление"}</p>
              <h3>Категории</h3>
            </div>
            {editingCategoryId ? (
              <button
                className="button button-ghost button-with-icon"
                onClick={resetCategoryForm}
                type="button"
              >
                <X size={18} />
                Отменить
              </button>
            ) : null}
          </div>

          <form className="form-grid" onSubmit={handleCategorySubmit}>
            <label className="field">
              <span>Название</span>
              <input
                className="input"
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Коммуналка"
                type="text"
                value={categoryForm.name}
              />
            </label>

            <label className="field">
              <span>Тип</span>
              <select
                className="input"
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    kind: event.target.value as CategoryRecord["kind"],
                  }))
                }
                value={categoryForm.kind}
              >
                {Object.entries(CATEGORY_KIND_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Цвет</span>
              <input
                className="input color-input"
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, color: event.target.value }))
                }
                type="color"
                value={categoryForm.color}
              />
            </label>

            <div className="form-actions">
              {categoryError ? <p className="inline-error">{categoryError}</p> : null}
              <button className="button button-primary button-with-icon" type="submit">
                {editingCategoryId ? <Save size={18} /> : <Plus size={18} />}
                {isPending
                  ? "Сохраняем..."
                  : editingCategoryId
                    ? "Сохранить категорию"
                    : "Добавить категорию"}
              </button>
            </div>
          </form>

          <div className="stack-list">
            {categories.map((category) => (
              <article className="category-card" key={category.id}>
                <div className="category-card-main">
                  <span className="dot large-dot" style={{ background: category.color }} />
                  <div>
                    <h4>{category.name}</h4>
                    <p className="muted-copy">{CATEGORY_KIND_LABELS[category.kind]}</p>
                  </div>
                </div>
                <div className="transaction-actions">
                  <button
                    className="button button-subtle button-with-icon"
                    onClick={() => {
                      setEditingCategoryId(category.id);
                      setCategoryError("");
                      setCategoryForm(createCategoryForm(category));
                    }}
                    type="button"
                  >
                    <PencilLine size={16} />
                    Изменить
                  </button>
                  <button
                    className="button button-subtle-danger button-with-icon"
                    onClick={() => handleDeleteCategory(category.id)}
                    type="button"
                  >
                    <Trash2 size={16} />
                    Удалить
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
