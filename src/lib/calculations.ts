import type {
  BudgetRecord,
  MemberRecord,
  SavingsGoalRecord,
  TransactionRecord,
} from "@/lib/serializers";
import { APP_LOCALE } from "@/lib/format";

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function monthKeyFromParts(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function humanMonthLabel(key: string, locale = APP_LOCALE) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: "short",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function summarizeTransactions(transactions: TransactionRecord[]) {
  let expenses = 0;
  let income = 0;
  let saved = 0;

  for (const transaction of transactions) {
    if (transaction.categoryKind === "INCOME") {
      income += transaction.amount;
      continue;
    }

    if (transaction.categoryKind === "SAVINGS") {
      saved += transaction.amount;
      continue;
    }

    expenses += transaction.amount;
  }

  return {
    expenses,
    income,
    net: income - expenses - saved,
    saved,
  };
}

export function buildMemberSpendBreakdown(
  transactions: TransactionRecord[],
  members: MemberRecord[],
) {
  const totals = new Map(
    members.map((member) => [
      member.id,
      {
        ...member,
        share: 0,
        spent: 0,
        transactionCount: 0,
      },
    ]),
  );

  for (const transaction of transactions) {
    if (transaction.categoryKind !== "EXPENSE") {
      continue;
    }

    const member = totals.get(transaction.memberId);
    if (!member) {
      continue;
    }

    member.spent += transaction.amount;
    member.transactionCount += 1;
  }

  const totalSpent = Array.from(totals.values()).reduce(
    (sum, member) => sum + member.spent,
    0,
  );

  return Array.from(totals.values())
    .map((member) => ({
      ...member,
      share: totalSpent ? member.spent / totalSpent : 0,
    }))
    .sort((left, right) => right.spent - left.spent);
}

export function buildCategoryBreakdown(transactions: TransactionRecord[]) {
  const totals = new Map<
    string,
    {
      color: string;
      name: string;
      total: number;
    }
  >();

  for (const transaction of transactions) {
    if (transaction.categoryKind !== "EXPENSE") {
      continue;
    }

    const current = totals.get(transaction.categoryId);

    if (current) {
      current.total += transaction.amount;
      continue;
    }

    totals.set(transaction.categoryId, {
      color: transaction.categoryColor,
      name: transaction.categoryName,
      total: transaction.amount,
    });
  }

  return Array.from(totals.values()).sort((left, right) => right.total - left.total);
}

export function buildMonthlyFlow(
  transactions: TransactionRecord[],
  monthCount = 6,
  locale = APP_LOCALE,
) {
  const now = new Date();
  const months = new Map<
    string,
    {
      expenses: number;
      income: number;
      label: string;
      savings: number;
    }
  >();

  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const key = monthKeyFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1);
    months.set(key, {
      expenses: 0,
      income: 0,
      label: humanMonthLabel(key, locale),
      savings: 0,
    });
  }

  for (const transaction of transactions) {
    const [year, month] = transaction.transactionDate.split("-").map(Number);
    const key = monthKeyFromParts(year, month);
    const bucket = months.get(key);

    if (!bucket) {
      continue;
    }

    if (transaction.categoryKind === "INCOME") {
      bucket.income += transaction.amount;
    } else if (transaction.categoryKind === "SAVINGS") {
      bucket.savings += transaction.amount;
    } else {
      bucket.expenses += transaction.amount;
    }
  }

  return Array.from(months.values());
}

export function calculateBudgetProgress(
  budget: BudgetRecord,
  transactions: TransactionRecord[],
) {
  const spent = transactions
    .filter(
      (transaction) =>
        transaction.categoryKind === "EXPENSE" &&
        transaction.categoryId === budget.categoryId &&
        transaction.transactionDate >= budget.startDate &&
        transaction.transactionDate <= budget.endDate,
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const remaining = budget.amount - spent;
  const progress = budget.amount ? clamp((spent / budget.amount) * 100) : 0;

  return {
    ...budget,
    progress,
    remaining,
    spent,
  };
}

export function calculateSavingsProgress(goal: SavingsGoalRecord) {
  const progress = goal.targetAmount
    ? clamp((goal.currentAmount / goal.targetAmount) * 100)
    : 0;

  return {
    ...goal,
    progress,
    remaining: Math.max(goal.targetAmount - goal.currentAmount, 0),
  };
}
