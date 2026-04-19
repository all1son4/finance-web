"use client";

import {
  Download,
  PencilLine,
  Plus,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { requestJson } from "@/lib/client-api";
import { CATEGORY_KIND_LABELS } from "@/lib/defaults";
import {
  CURRENCY_OPTIONS,
  LOCALE_OPTIONS,
  type AppSettingsRecord,
  type StarterCategoryRecord,
} from "@/lib/settings";

type SettingsClientProps = {
  settings: AppSettingsRecord;
  starterCategories: StarterCategoryRecord[];
};

function createStarterCategoryForm(category?: StarterCategoryRecord) {
  return {
    color: category?.color ?? "#4DB6AC",
    kind: category?.kind ?? "EXPENSE",
    name: category?.name ?? "",
    sortOrder: category?.sortOrder ?? 0,
  };
}

export function SettingsClient({
  settings,
  starterCategories,
}: SettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settingsError, setSettingsError] = useState("");
  const [starterError, setStarterError] = useState("");
  const [editingStarterId, setEditingStarterId] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState(() => ({
    appName: settings.appName,
    currency: settings.currency,
    locale: settings.locale,
  }));
  const [starterForm, setStarterForm] = useState(() => createStarterCategoryForm());

  function refreshPage() {
    startTransition(() => {
      router.refresh();
    });
  }

  function resetStarterForm() {
    setEditingStarterId(null);
    setStarterForm(createStarterCategoryForm());
  }

  async function handleSettingsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSettingsError("");
      await requestJson("/api/settings", {
        body: JSON.stringify(settingsForm),
        method: "PATCH",
      });
      refreshPage();
    } catch (caughtError) {
      setSettingsError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось сохранить настройки.",
      );
    }
  }

  async function handleStarterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setStarterError("");
      await requestJson(
        editingStarterId
          ? `/api/settings/starter-categories/${editingStarterId}`
          : "/api/settings/starter-categories",
        {
          body: JSON.stringify(starterForm),
          method: editingStarterId ? "PATCH" : "POST",
        },
      );

      resetStarterForm();
      refreshPage();
    } catch (caughtError) {
      setStarterError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось сохранить стартовую категорию.",
      );
    }
  }

  async function handleStarterDelete(id: string) {
    if (!window.confirm("Удалить эту стартовую категорию?")) {
      return;
    }

    try {
      setStarterError("");
      await requestJson(`/api/settings/starter-categories/${id}`, {
        method: "DELETE",
      });

      if (editingStarterId === id) {
        resetStarterForm();
      }

      refreshPage();
    } catch (caughtError) {
      setStarterError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось удалить стартовую категорию.",
      );
    }
  }

  async function handleSyncStarterCategories() {
    try {
      setStarterError("");
      await requestJson("/api/settings/sync-starter-categories", {
        method: "POST",
      });
      refreshPage();
    } catch (caughtError) {
      setStarterError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось добавить стартовые категории в рабочий список.",
      );
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Настройки</p>
          <h2>Рабочая область и стартовые категории</h2>
          <p className="muted-copy">
            Здесь задается название приложения, формат денег и базовый набор
            категорий для новых сценариев и синхронизации.
          </p>
        </div>
        <div className="hero-inline-metrics">
          <div>
            <span>Валюта</span>
            <strong>{settings.currency}</strong>
          </div>
          <div>
            <span>Стартовых категорий</span>
            <strong>{starterCategories.length}</strong>
          </div>
        </div>
      </section>

      <div className="split-layout">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Общие</p>
              <h3>Приложение и форматирование</h3>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleSettingsSubmit}>
            <label className="field field-span-full">
              <span>Название приложения</span>
              <input
                className="input"
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    appName: event.target.value,
                  }))
                }
                placeholder="Мои финансы"
                type="text"
                value={settingsForm.appName}
              />
            </label>

            <label className="field">
              <span>Локаль</span>
              <select
                className="input"
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    locale: event.target.value,
                  }))
                }
                value={settingsForm.locale}
              >
                {LOCALE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Валюта</span>
              <select
                className="input"
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    currency: event.target.value,
                  }))
                }
                value={settingsForm.currency}
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} • {option.value}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-actions">
              {settingsError ? <p className="inline-error">{settingsError}</p> : null}
              <button className="button button-primary button-with-icon" type="submit">
                <Settings2 size={18} />
                {isPending ? "Сохраняем..." : "Сохранить настройки"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{editingStarterId ? "Редактирование" : "Стартовые категории"}</p>
              <h3>{editingStarterId ? "Обновить шаблон категории" : "Новый шаблон категории"}</h3>
            </div>
            {editingStarterId ? (
              <button
                className="button button-ghost button-with-icon"
                onClick={resetStarterForm}
                type="button"
              >
                <X size={18} />
                Отменить
              </button>
            ) : null}
          </div>

          <form className="form-grid" onSubmit={handleStarterSubmit}>
            <label className="field">
              <span>Название</span>
              <input
                className="input"
                onChange={(event) =>
                  setStarterForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Коммуналка"
                type="text"
                value={starterForm.name}
              />
            </label>

            <label className="field">
              <span>Тип</span>
              <select
                className="input"
                onChange={(event) =>
                  setStarterForm((current) => ({
                    ...current,
                    kind: event.target.value as StarterCategoryRecord["kind"],
                  }))
                }
                value={starterForm.kind}
              >
                {Object.entries(CATEGORY_KIND_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Порядок</span>
              <input
                className="input"
                min={0}
                onChange={(event) =>
                  setStarterForm((current) => ({
                    ...current,
                    sortOrder: Number(event.target.value),
                  }))
                }
                type="number"
                value={starterForm.sortOrder}
              />
            </label>

            <label className="field">
              <span>Цвет</span>
              <input
                className="input color-input"
                onChange={(event) =>
                  setStarterForm((current) => ({
                    ...current,
                    color: event.target.value,
                  }))
                }
                type="color"
                value={starterForm.color}
              />
            </label>

            <div className="form-actions">
              {starterError ? <p className="inline-error">{starterError}</p> : null}
              <button className="button button-primary button-with-icon" type="submit">
                {editingStarterId ? <Save size={18} /> : <Plus size={18} />}
                {isPending
                  ? "Сохраняем..."
                  : editingStarterId
                    ? "Сохранить шаблон"
                    : "Добавить шаблон"}
              </button>
            </div>
          </form>

          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Синхронизация</p>
              <h3>Применить шаблоны к рабочим категориям</h3>
            </div>
            <button
              className="button button-ghost button-with-icon"
              onClick={handleSyncStarterCategories}
              type="button"
            >
              <Download size={18} />
              Добавить отсутствующие
            </button>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Шаблоны</p>
            <h3>Список стартовых категорий</h3>
          </div>
        </div>

        <div className="stack-list">
          {starterCategories.length ? (
            starterCategories
              .slice()
              .sort((left, right) => left.sortOrder - right.sortOrder)
              .map((category) => (
                <article className="category-card" key={category.id}>
                  <div className="category-card-main">
                    <span className="dot large-dot" style={{ background: category.color }} />
                    <div>
                      <h4>{category.name}</h4>
                      <p className="muted-copy">
                        {CATEGORY_KIND_LABELS[category.kind]} • порядок {category.sortOrder}
                      </p>
                    </div>
                  </div>
                  <div className="transaction-actions">
                    <button
                      className="button button-subtle button-with-icon"
                      onClick={() => {
                        setEditingStarterId(category.id);
                        setStarterError("");
                        setStarterForm(createStarterCategoryForm(category));
                      }}
                      type="button"
                    >
                      <PencilLine size={16} />
                      Изменить
                    </button>
                    <button
                      className="button button-subtle-danger button-with-icon"
                      onClick={() => handleStarterDelete(category.id)}
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
              <p className="empty-copy">Стартовых категорий пока нет.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
