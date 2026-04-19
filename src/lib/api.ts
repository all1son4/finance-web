import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class AppError extends Error {
  details?: unknown;
  status: number;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AppError(400, "Некорректное тело запроса.");
  }
}

export function ok<T>(data: T, status = 200) {
  return Response.json(data, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      {
        details: error.details,
        message: error.message,
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        details: error.flatten(),
        message: "Проверьте заполненные поля.",
      },
      { status: 422 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return Response.json(
        {
          message: "Такая запись уже существует.",
        },
        { status: 409 },
      );
    }

    if (error.code === "P2025") {
      return Response.json(
        {
          message: "Запись не найдена.",
        },
        { status: 404 },
      );
    }
  }

  console.error(error);

  return Response.json(
    {
      message: "Что-то пошло не так.",
    },
    { status: 500 },
  );
}
