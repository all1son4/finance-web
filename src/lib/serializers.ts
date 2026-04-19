import type {
  Budget,
  Category,
  Member,
  SavingsGoal,
  Transaction,
} from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";

import {
  localizeCategoryName,
  localizeMemberName,
  type CategoryKindValue,
} from "@/lib/defaults";
import { toDateInputValue } from "@/lib/format";

type DecimalLike = Decimal | number | string;

export type MemberRecord = {
  color: string;
  id: string;
  name: string;
};

export type CategoryRecord = {
  color: string;
  id: string;
  kind: CategoryKindValue;
  name: string;
};

export type TransactionRecord = {
  amount: number;
  categoryColor: string;
  categoryId: string;
  categoryKind: CategoryKindValue;
  categoryName: string;
  createdAt: string;
  description?: string;
  id: string;
  memberColor: string;
  memberId: string;
  memberName: string;
  notes?: string;
  transactionDate: string;
  updatedAt: string;
};

export type BudgetRecord = {
  amount: number;
  categoryColor: string;
  categoryId: string;
  categoryKind: CategoryKindValue;
  categoryName: string;
  endDate: string;
  id: string;
  name: string;
  startDate: string;
};

export type SavingsGoalRecord = {
  currentAmount: number;
  id: string;
  name: string;
  notes?: string;
  targetAmount: number;
  targetDate?: string;
};

export function toNumber(value: DecimalLike) {
  return Number(value);
}

export function serializeMember(member: Member): MemberRecord {
  return {
    color: member.color,
    id: member.id,
    name: localizeMemberName(member.name),
  };
}

export function serializeCategory(category: Category): CategoryRecord {
  return {
    color: category.color,
    id: category.id,
    kind: category.kind as CategoryKindValue,
    name: localizeCategoryName(category.name),
  };
}

export function serializeTransaction(
  transaction: Transaction & {
    category: Category;
    member: Member;
  },
): TransactionRecord {
  return {
    amount: toNumber(transaction.amount),
    categoryColor: transaction.category.color,
    categoryId: transaction.categoryId,
    categoryKind: transaction.category.kind as CategoryKindValue,
    categoryName: localizeCategoryName(transaction.category.name),
    createdAt: transaction.createdAt.toISOString(),
    description: transaction.description ?? undefined,
    id: transaction.id,
    memberColor: transaction.member.color,
    memberId: transaction.memberId,
    memberName: localizeMemberName(transaction.member.name),
    notes: transaction.notes ?? undefined,
    transactionDate: toDateInputValue(transaction.transactionDate),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

export function serializeBudget(
  budget: Budget & {
    category: Category;
  },
): BudgetRecord {
  return {
    amount: toNumber(budget.amount),
    categoryColor: budget.category.color,
    categoryId: budget.categoryId,
    categoryKind: budget.category.kind as CategoryKindValue,
    categoryName: localizeCategoryName(budget.category.name),
    endDate: toDateInputValue(budget.endDate),
    id: budget.id,
    name: budget.name,
    startDate: toDateInputValue(budget.startDate),
  };
}

export function serializeSavingsGoal(goal: SavingsGoal): SavingsGoalRecord {
  return {
    currentAmount: toNumber(goal.currentAmount),
    id: goal.id,
    name: goal.name,
    notes: goal.notes ?? undefined,
    targetAmount: toNumber(goal.targetAmount),
    targetDate: goal.targetDate ? toDateInputValue(goal.targetDate) : undefined,
  };
}
