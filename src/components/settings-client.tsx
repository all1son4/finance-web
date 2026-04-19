"use client";

import {
  ArrowRightLeft,
  Copy,
  Download,
  PencilLine,
  Plus,
  Save,
  Settings2,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { requestJson } from "@/lib/client-api";
import { CATEGORY_KIND_LABELS } from "@/lib/defaults";
import type { ActiveWorkspace, WorkspaceSummary } from "@/lib/auth";
import {
  CURRENCY_OPTIONS,
  LOCALE_OPTIONS,
  type AppSettingsRecord,
  type StarterCategoryRecord,
} from "@/lib/settings";

type SettingsClientProps = {
  activeWorkspace: ActiveWorkspace;
  settings: AppSettingsRecord;
  starterCategories: StarterCategoryRecord[];
  workspaces: WorkspaceSummary[];
};

function createStarterCategoryForm(category?: StarterCategoryRecord) {
  return {
    color: category?.color ?? "#4DB6AC",
    kind: category?.kind ?? "EXPENSE",
    name: category?.name ?? "",
    sortOrder: category?.sortOrder ?? 0,
  };
}

function parseMemberNames(value: string) {
  return value
    .split(/\n|,/g)
    .map((name) => name.trim())
    .filter(Boolean);
}

export function SettingsClient({
  activeWorkspace,
  settings,
  starterCategories,
  workspaces,
}: SettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settingsError, setSettingsError] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");
  const [starterError, setStarterError] = useState("");
  const [editingStarterId, setEditingStarterId] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState(() => ({
    appName: settings.appName,
    currency: settings.currency,
    locale: settings.locale,
  }));
  const [workspaceCreateForm, setWorkspaceCreateForm] = useState(() => ({
    memberNames: "",
    name: "",
  }));
  const [joinInviteCode, setJoinInviteCode] = useState("");
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

  async function handleWorkspaceCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setWorkspaceError("");
      await requestJson("/api/workspaces", {
        body: JSON.stringify({
          memberNames: parseMemberNames(workspaceCreateForm.memberNames),
          name: workspaceCreateForm.name,
        }),
        method: "POST",
      });

      setWorkspaceCreateForm({
        memberNames: "",
        name: "",
      });
      refreshPage();
    } catch (caughtError) {
      setWorkspaceError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось создать пространство.",
      );
    }
  }

  async function handleJoinWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setWorkspaceError("");
      await requestJson("/api/workspaces/join", {
        body: JSON.stringify({
          inviteCode: joinInviteCode,
        }),
        method: "POST",
      });
      setJoinInviteCode("");
      refreshPage();
    } catch (caughtError) {
      setWorkspaceError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось подключиться к пространству.",
      );
    }
  }

  async function handleSwitchWorkspace(workspaceId: string) {
    try {
      setWorkspaceError("");
      await requestJson("/api/workspaces/active", {
        body: JSON.stringify({
          workspaceId,
        }),
        method: "PATCH",
      });
      refreshPage();
    } catch (caughtError) {
      setWorkspaceError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось переключить пространство.",
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

  async function handleCopyInviteCode() {
    try {
      await navigator.clipboard.writeText(activeWorkspace.inviteCode);
    } catch {
      setWorkspaceError("Не удалось скопировать код приглашения.");
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Настройки</p>
          <h2>Управляйте пространствами и общими шаблонами</h2>
          <p className="muted-copy">
            У вас могут быть личные пространства и общие. Переключение, создание
            и вход по коду теперь находятся в одном месте.
          </p>
        </div>
        <div className="hero-inline-metrics">
          <div>
            <span>Активное пространство</span>
            <strong>{activeWorkspace.name}</strong>
          </div>
          <div>
            <span>Доступно пространств</span>
            <strong>{workspaces.length}</strong>
          </div>
        </div>
      </section>

      <div className="split-layout">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Текущее пространство</p>
              <h3>Название и форматирование</h3>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleSettingsSubmit}>
            <label className="field field-span-full">
              <span>Название пространства</span>
              <input
                className="input"
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    appName: event.target.value,
                  }))
                }
                placeholder="Семейный бюджет"
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
              <p className="eyebrow">Доступ и приглашения</p>
              <h3>Создать, подключить, поделиться</h3>
            </div>
          </div>

          <div className="workspace-card workspace-card-active">
            <div className="workspace-card-main">
              <div>
                <h4>{activeWorkspace.name}</h4>
                <p className="muted-copy">
                  Роль: {activeWorkspace.role} • участников: {activeWorkspace.members.length}
                </p>
              </div>
              <span className="tag">Активно</span>
            </div>
            <div className="workspace-code">
              <span>Код приглашения</span>
              <strong>{activeWorkspace.inviteCode}</strong>
            </div>
            <button
              className="button button-ghost button-with-icon"
              onClick={handleCopyInviteCode}
              type="button"
            >
              <Copy size={18} />
              Скопировать код
            </button>
          </div>

          <form className="workspace-form" onSubmit={handleJoinWorkspace}>
            <label className="field">
              <span>Войти в общее пространство по коду</span>
              <input
                className="input"
                onChange={(event) => setJoinInviteCode(event.target.value)}
                placeholder="Например A1B2C3D4"
                type="text"
                value={joinInviteCode}
              />
            </label>
            <button className="button button-primary button-with-icon" type="submit">
              <UserPlus size={18} />
              Подключиться
            </button>
          </form>

          <form className="workspace-form" onSubmit={handleWorkspaceCreate}>
            <label className="field">
              <span>Новое пространство</span>
              <input
                className="input"
                onChange={(event) =>
                  setWorkspaceCreateForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Личный бюджет, отпуск, ремонт..."
                type="text"
                value={workspaceCreateForm.name}
              />
            </label>

            <label className="field">
              <span>Участники учета</span>
              <textarea
                className="textarea"
                onChange={(event) =>
                  setWorkspaceCreateForm((current) => ({
                    ...current,
                    memberNames: event.target.value,
                  }))
                }
                placeholder={"Вы\nПартнер"}
                rows={3}
                value={workspaceCreateForm.memberNames}
              />
            </label>

            <div className="form-actions">
              {workspaceError ? <p className="inline-error">{workspaceError}</p> : null}
              <button className="button button-primary button-with-icon" type="submit">
                <Plus size={18} />
                Создать пространство
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Мои пространства</p>
            <h3>Переключение между личными и общими</h3>
          </div>
        </div>

        <div className="workspace-grid">
          {workspaces.map((workspace) => {
            const isActive = workspace.id === activeWorkspace.id;

            return (
              <article
                className={`workspace-card${isActive ? " workspace-card-active" : ""}`}
                key={workspace.id}
              >
                <div className="workspace-card-main">
                  <div>
                    <h4>{workspace.name}</h4>
                    <p className="muted-copy">
                      {workspace.memberCount} участника(ов) • роль {workspace.role}
                    </p>
                  </div>
                  <span className="tag">{workspace.inviteCode}</span>
                </div>
                <div className="workspace-actions">
                  <button
                    className="button button-ghost button-with-icon"
                    disabled={isActive}
                    onClick={() => handleSwitchWorkspace(workspace.id)}
                    type="button"
                  >
                    <ArrowRightLeft size={18} />
                    {isActive ? "Открыто сейчас" : "Сделать активным"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="split-layout">
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
    </div>
  );
}
