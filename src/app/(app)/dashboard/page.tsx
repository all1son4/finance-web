import { CategoryChart, FlowChart } from "@/components/charts";
import { DashboardQuickActions } from "@/components/dashboard-quick-actions";
import { ProgressBar } from "@/components/progress-bar";
import Link from "next/link";
import {
  buildCategoryBreakdown,
  buildMemberSpendBreakdown,
  buildMonthlyFlow,
  calculateBudgetProgress,
  calculateSavingsProgress,
  summarizeTransactions,
} from "@/lib/calculations";
import { requireUserPage } from "@/lib/auth";
import { formatCurrency, formatShortDate } from "@/lib/format";
import {
  serializeBudget,
  serializeCategory,
  serializeSavingsGoal,
  serializeTransaction,
} from "@/lib/serializers";
import prisma from "@/prisma";

export default async function DashboardPage() {
  const user = await requireUserPage();
  const [transactionsRaw, budgetsRaw, goalsRaw, categoriesRaw] = await Promise.all([
    prisma.transaction.findMany({
      include: {
        category: true,
        member: true,
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      where: {
        userId: user.id,
      },
    }),
    prisma.budget.findMany({
      include: {
        category: true,
      },
      orderBy: [{ endDate: "asc" }, { name: "asc" }],
      where: {
        userId: user.id,
      },
    }),
    prisma.savingsGoal.findMany({
      orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }],
      where: {
        userId: user.id,
      },
    }),
    prisma.category.findMany({
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      where: {
        userId: user.id,
      },
    }),
  ]);

  const transactions = transactionsRaw.map(serializeTransaction);
  const budgets = budgetsRaw.map(serializeBudget);
  const savingsGoals = goalsRaw.map(serializeSavingsGoal);
  const categories = categoriesRaw.map(serializeCategory);
  const summary = summarizeTransactions(transactions);
  const memberBreakdown = buildMemberSpendBreakdown(transactions, user.members);
  const monthlyFlow = buildMonthlyFlow(transactions, 6, user.settings.locale);
  const categoryBreakdown = buildCategoryBreakdown(transactions).slice(0, 6);
  const budgetProgress = budgets
    .map((budget) => calculateBudgetProgress(budget, transactions))
    .slice(0, 4);
  const goalProgress = savingsGoals
    .map((goal) => calculateSavingsProgress(goal))
    .slice(0, 4);
  const recentTransactions = transactions.slice(0, 8);

  return (
    <div className="page-stack">
      <DashboardQuickActions
        categories={categories}
        members={user.members}
        savingsGoals={savingsGoals}
        settings={user.settings}
        transactions={transactions}
      />

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Обзор</p>
          <h2>Понятная картина по тратам, накоплениям и участникам</h2>
          <p className="muted-copy">
            Операции подсвечены цветом пользователя, поэтому сразу видно, кто и на
            что тратил деньги.
          </p>
        </div>
        <div className="hero-inline-metrics">
          <div>
            <span>Участников учета</span>
            <strong>{user.members.length}</strong>
          </div>
          <div>
            <span>Всего операций</span>
            <strong>{transactions.length}</strong>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Доходы</span>
          <strong>{formatCurrency(summary.income, user.settings)}</strong>
        </article>
        <article className="metric-card">
          <span>Потрачено</span>
          <strong>{formatCurrency(summary.expenses, user.settings)}</strong>
        </article>
        <article className="metric-card">
          <span>Отложено</span>
          <strong>{formatCurrency(summary.saved, user.settings)}</strong>
        </article>
        <article className="metric-card">
          <span>Остаток</span>
          <strong>{formatCurrency(summary.net, user.settings)}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">По пользователям</p>
            <h3>Кто сколько потратил</h3>
          </div>
        </div>

        <div className="member-grid">
          {memberBreakdown.map((member) => (
            <article className="member-card" key={member.id}>
              <div className="member-card-top">
                <span
                  className="tag tag-user"
                  style={{ background: `${member.color}20`, color: member.color }}
                >
                      {member.name}
                    </span>
                <span>{member.transactionCount} трат</span>
              </div>
              <strong>{formatCurrency(member.spent, user.settings)}</strong>
              <ProgressBar color={member.color} value={member.share * 100} />
            </article>
          ))}
        </div>
      </section>

      <div className="chart-grid">
        <FlowChart data={monthlyFlow} settings={user.settings} />
        <CategoryChart data={categoryBreakdown} settings={user.settings} />
      </div>

      <div className="split-layout">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Бюджеты</p>
              <h3>Прогресс в текущем периоде</h3>
            </div>
          </div>

          <div className="stack-list">
            {budgetProgress.length ? (
              budgetProgress.map((budget) => (
                <article className="budget-card" key={budget.id}>
                  <div className="section-heading compact">
                    <div>
                      <h4>{budget.name}</h4>
                      <p className="muted-copy">{budget.categoryName}</p>
                    </div>
                    <strong>{formatCurrency(budget.amount, user.settings)}</strong>
                  </div>
                  <ProgressBar color={budget.categoryColor} value={budget.progress} />
                  <div className="budget-meta">
                    <span>Потрачено {formatCurrency(budget.spent, user.settings)}</span>
                    <span>
                      {budget.remaining >= 0
                        ? `Осталось ${formatCurrency(budget.remaining, user.settings)}`
                        : `Перерасход ${formatCurrency(Math.abs(budget.remaining), user.settings)}`}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-action">
                <p className="empty-copy">Бюджетов пока нет. Создайте первый лимит под реальные траты.</p>
                <Link className="button button-primary" href="/budget">
                  Открыть бюджет
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Цели накоплений</p>
              <h3>Прогресс до цели</h3>
            </div>
          </div>

          <div className="stack-list">
            {goalProgress.length ? (
              goalProgress.map((goal) => (
                <article className="goal-card" key={goal.id}>
                  <div className="section-heading compact">
                    <div>
                      <h4>{goal.name}</h4>
                      <p className="muted-copy">
                        {goal.targetDate ? `Срок: ${goal.targetDate}` : "Без срока"}
                      </p>
                    </div>
                    <strong>{formatCurrency(goal.targetAmount, user.settings)}</strong>
                  </div>
                  <ProgressBar color="var(--warning)" value={goal.progress} />
                  <div className="goal-meta">
                    <span>Накоплено {formatCurrency(goal.currentAmount, user.settings)}</span>
                    <span>Осталось {formatCurrency(goal.remaining, user.settings)}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-action">
                <p className="empty-copy">
                  Целей накоплений пока нет. Добавьте первую цель и ведите ее с главной.
                </p>
                <Link className="button button-primary" href="/savings-goals">
                  Открыть цели
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Последние действия</p>
            <h3>Операции с подсветкой по пользователю</h3>
          </div>
        </div>

        <div className="list-grid">
          {recentTransactions.length ? (
            recentTransactions.map((transaction) => (
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
                      <span className="tag">{transaction.categoryName}</span>
                    </div>
                    <h4>{transaction.description || transaction.categoryName}</h4>
                    <p className="muted-copy">
                      {formatShortDate(transaction.transactionDate, user.settings)}
                    </p>
                  </div>
                  <strong>{formatCurrency(transaction.amount, user.settings)}</strong>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-action">
              <p className="empty-copy">Операций пока нет. Начните с быстрого добавления дохода или траты.</p>
              <Link className="button button-primary" href="/transactions">
                Открыть операции
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
