"use client";

import { PencilLine, Plus, Save, Trash2, X } from "lucide-react";
import { useDeferredValue, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { requestJson } from "@/lib/client-api";
import { CATEGORY_KIND_LABELS } from "@/lib/defaults";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { createTransactionDraft } from "@/lib/prefill";
import type { AppSettingsRecord } from "@/lib/settings";
import type {
  CategoryRecord,
  MemberRecord,
  TransactionRecord,
} from "@/lib/serializers";

type TransactionsClientProps = {
  categories: CategoryRecord[];
  members: MemberRecord[];
  settings: AppSettingsRecord;
  transactions: TransactionRecord[];
};

function createDefaultForm(
  categories: CategoryRecord[],
  members: MemberRecord[],
  transactions: TransactionRecord[],
  transaction?: TransactionRecord,
) {
  return createTransactionDraft(
    categories,
    members,
    transactions,
    "EXPENSE",
    transaction,
  );
}

export function TransactionsClient({
  categories,
  members,
  settings,
  transactions,
}: TransactionsClientProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [form, setForm] = useState(() =>
    createDefaultForm(categories, members, transactions),
  );
  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(search);

  const visibleTransactions = transactions.filter((transaction) => {
    const matchesMember =
      memberFilter === "all" || transaction.memberId === memberFilter;
    const matchesKind =
      kindFilter === "all" || transaction.categoryKind === kindFilter;
    const haystack = [
      transaction.description,
      transaction.categoryName,
      transaction.memberName,
      transaction.transactionDate,
      transaction.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = haystack.includes(deferredSearch.trim().toLowerCase());

    return matchesMember && matchesKind && matchesSearch;
  });

  function resetForm() {
    setEditingId(null);
    setForm(createDefaultForm(categories, members, transactions));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setError("");
      const endpoint = editingId ? `/api/transactions/${editingId}` : "/api/transactions";
      const method = editingId ? "PATCH" : "POST";

      await requestJson(endpoint, {
        body: JSON.stringify({
          amount: Number(form.amount),
          categoryId: form.categoryId,
          description: form.description,
          memberId: form.memberId,
          notes: form.notes,
          transactionDate: form.transactionDate,
        }),
        method,
      });

      resetForm();
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

  async function handleDelete(transactionId: string) {
    if (!window.confirm("Удалить эту операцию?")) {
      return;
    }

    try {
      setError("");
      await requestJson(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });

      if (editingId === transactionId) {
        resetForm();
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось удалить операцию.",
      );
    }
  }

  function handleEdit(transaction: TransactionRecord) {
    setEditingId(transaction.id);
    setError("");
    setForm(createDefaultForm(categories, members, transactions, transaction));
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Операции</p>
          <h2>Быстрый ввод ежедневных движений денег</h2>
          <p className="muted-copy">
            Часть полей подставляется по умолчанию, чтобы новую запись можно было
            занести за пару касаний.
          </p>
        </div>
        <div className="hero-inline-metrics">
          <div>
            <span>Всего записей</span>
            <strong>{transactions.length}</strong>
          </div>
          <div>
            <span>Участников</span>
            <strong>{members.length}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{editingId ? "Редактирование" : "Быстрое добавление"}</p>
            <h3>{editingId ? "Обновить операцию" : "Новая операция"}</h3>
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
            <span>Сумма</span>
            <input
              className="input"
              inputMode="decimal"
              onChange={(event) =>
                setForm((current) => ({ ...current, amount: event.target.value }))
              }
              placeholder="0.00"
              required
              type="number"
              value={form.amount}
            />
          </label>

          <label className="field">
            <span>Категория</span>
            <select
              className="input"
              onChange={(event) =>
                setForm((current) => ({ ...current, categoryId: event.target.value }))
              }
              value={form.categoryId}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} • {CATEGORY_KIND_LABELS[category.kind]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Пользователь</span>
            <select
              className="input"
              onChange={(event) =>
                setForm((current) => ({ ...current, memberId: event.target.value }))
              }
              value={form.memberId}
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
                setForm((current) => ({
                  ...current,
                  transactionDate: event.target.value,
                }))
              }
              required
              type="date"
              value={form.transactionDate}
            />
          </label>

          <label className="field">
            <span>Описание</span>
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Обед, аренда, подработка..."
              type="text"
              value={form.description}
            />
          </label>

          <label className="field">
            <span>Заметки</span>
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Необязательный комментарий"
              type="text"
              value={form.notes}
            />
          </label>

          <div className="form-actions">
            {error ? <p className="inline-error">{error}</p> : null}
            <button className="button button-primary button-with-icon" type="submit">
              {editingId ? <Save size={18} /> : <Plus size={18} />}
              {isPending
                ? "Сохраняем..."
                : editingId
                  ? "Сохранить изменения"
                  : "Добавить операцию"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Фильтры</p>
            <h3>Найти операцию за секунды</h3>
          </div>
        </div>

        <div className="filter-row">
          <input
            className="input"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по описанию, категории или пользователю"
            type="search"
            value={search}
          />
          <select
            className="input"
            onChange={(event) => setMemberFilter(event.target.value)}
            value={memberFilter}
          >
            <option value="all">Все участники</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            onChange={(event) => setKindFilter(event.target.value)}
            value={kindFilter}
          >
            <option value="all">Все типы</option>
            {Object.entries(CATEGORY_KIND_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="list-grid">
        {visibleTransactions.length ? (
          visibleTransactions.map((transaction) => (
            <article
              className="transaction-card"
              key={transaction.id}
              style={{ borderColor: transaction.memberColor }}
            >
              <div className="transaction-main">
                <div className="transaction-copy">
                  <div className="transaction-topline">
                    <span
                      className="tag tag-user"
                      style={{
                        background: `${transaction.memberColor}20`,
                        color: transaction.memberColor,
                      }}
                    >
                      {transaction.memberName}
                    </span>
                    <span className="tag">
                      {CATEGORY_KIND_LABELS[transaction.categoryKind]}
                    </span>
                    <span className="tag">{transaction.categoryName}</span>
                  </div>
                  <h4>{transaction.description || transaction.categoryName}</h4>
                  <p className="muted-copy">
                    {formatShortDate(transaction.transactionDate, settings)}
                    {transaction.notes ? ` • ${transaction.notes}` : ""}
                  </p>
                </div>
                <div className="transaction-amount">
                  <strong>{formatCurrency(transaction.amount, settings)}</strong>
                </div>
              </div>
              <div className="transaction-actions">
                <button
                  className="button button-subtle button-with-icon"
                  onClick={() => handleEdit(transaction)}
                  type="button"
                >
                  <PencilLine size={16} />
                  Изменить
                </button>
                <button
                  className="button button-subtle-danger button-with-icon"
                  onClick={() => handleDelete(transaction.id)}
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
            <p className="empty-copy">По этим фильтрам пока ничего не найдено.</p>
          </div>
        )}
      </section>
    </div>
  );
}
