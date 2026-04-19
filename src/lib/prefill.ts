import type { CategoryKindValue } from "@/lib/defaults";
import { toDateInputValue } from "@/lib/format";
import type {
  CategoryRecord,
  MemberRecord,
  TransactionRecord,
} from "@/lib/serializers";

function matchesKind(
  transaction: TransactionRecord,
  preferredKind?: CategoryKindValue,
) {
  return !preferredKind || transaction.categoryKind === preferredKind;
}

export function pickPreferredCategory(
  categories: CategoryRecord[],
  transactions: TransactionRecord[],
  preferredKind?: CategoryKindValue,
) {
  const allowedCategories = preferredKind
    ? categories.filter((category) => category.kind === preferredKind)
    : categories;

  for (const transaction of transactions) {
    if (!matchesKind(transaction, preferredKind)) {
      continue;
    }

    const category = allowedCategories.find(
      (currentCategory) => currentCategory.id === transaction.categoryId,
    );

    if (category) {
      return category;
    }
  }

  return allowedCategories[0] ?? categories[0] ?? null;
}

export function pickPreferredMember(
  members: MemberRecord[],
  transactions: TransactionRecord[],
  preferredKind?: CategoryKindValue,
) {
  for (const transaction of transactions) {
    if (!matchesKind(transaction, preferredKind)) {
      continue;
    }

    const member = members.find(
      (currentMember) => currentMember.id === transaction.memberId,
    );

    if (member) {
      return member;
    }
  }

  return members[0] ?? null;
}

export function createTransactionDraft(
  categories: CategoryRecord[],
  members: MemberRecord[],
  transactions: TransactionRecord[],
  preferredKind: CategoryKindValue,
  transaction?: TransactionRecord,
) {
  const defaultCategory = transaction
    ? categories.find((category) => category.id === transaction.categoryId) ?? null
    : pickPreferredCategory(categories, transactions, preferredKind);
  const defaultMember = transaction
    ? members.find((member) => member.id === transaction.memberId) ?? null
    : pickPreferredMember(members, transactions, preferredKind);

  return {
    amount: transaction ? String(transaction.amount) : "",
    categoryId: transaction?.categoryId ?? defaultCategory?.id ?? "",
    description: transaction?.description ?? "",
    memberId: transaction?.memberId ?? defaultMember?.id ?? "",
    notes: transaction?.notes ?? "",
    transactionDate: transaction?.transactionDate ?? toDateInputValue(new Date()),
  };
}
