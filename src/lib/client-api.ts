export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & { message?: string }) : null;

  if (!response.ok) {
    throw new Error(
      typeof data === "object" && data && "message" in data
        ? (data.message ?? "Не удалось выполнить запрос.")
        : "Не удалось выполнить запрос.",
    );
  }

  return data as T;
}
