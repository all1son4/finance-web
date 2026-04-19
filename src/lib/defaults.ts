export type CategoryKindValue = "EXPENSE" | "INCOME" | "SAVINGS";

const CATEGORY_NAME_TRANSLATIONS: Record<string, string> = {
  Entertainment: "Развлечения",
  Food: "Еда",
  Rent: "Аренда",
  Salary: "Зарплата",
  Savings: "Накопления",
  Transport: "Транспорт",
};

const MEMBER_NAME_TRANSLATIONS: Record<string, string> = {
  Partner: "Партнер",
  You: "Вы",
};

export const DEFAULT_CATEGORIES: Array<{
  color: string;
  kind: CategoryKindValue;
  name: string;
}> = [
  { name: "Еда", kind: "EXPENSE", color: "#FF8A65" },
  { name: "Аренда", kind: "EXPENSE", color: "#4DB6AC" },
  { name: "Транспорт", kind: "EXPENSE", color: "#64B5F6" },
  { name: "Зарплата", kind: "INCOME", color: "#81C784" },
  { name: "Развлечения", kind: "EXPENSE", color: "#BA68C8" },
  { name: "Накопления", kind: "SAVINGS", color: "#FFD54F" },
];

export const MEMBER_COLORS = [
  "#1A8F6D",
  "#F47A62",
  "#4A6CFF",
  "#C96BFF",
  "#F4B942",
  "#00A1AB",
  "#D64B78",
  "#67748E",
];

export const CATEGORY_KIND_LABELS: Record<CategoryKindValue, string> = {
  EXPENSE: "Трата",
  INCOME: "Доход",
  SAVINGS: "Накопления",
};

export function getMemberColor(index: number) {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

export function localizeCategoryName(name: string) {
  return CATEGORY_NAME_TRANSLATIONS[name] ?? name;
}

export function localizeMemberName(name: string) {
  return MEMBER_NAME_TRANSLATIONS[name] ?? name;
}
