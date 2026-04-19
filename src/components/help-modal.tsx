"use client";

import {
  BookOpenText,
  CircleHelp,
  PiggyBank,
  ReceiptText,
  Target,
  WalletCards,
} from "lucide-react";
import { useState } from "react";

import { AppModal } from "@/components/app-modal";

const sections = [
  {
    icon: WalletCards,
    items: [
      "На главной есть 3 быстрые кнопки: доход, трата и накопления.",
      "Доход и трата сразу создают запись в операциях без лишних переходов.",
      "Накопления позволяют быстро пополнить или уменьшить сумму по цели.",
    ],
    title: "Быстрый старт",
  },
  {
    icon: ReceiptText,
    items: [
      "В разделе «Операции» можно быстро вносить записи, редактировать их и фильтровать.",
      "Каждая операция помечается пользователем и категорией.",
      "Цвет пользователя помогает сразу видеть, кто именно потратил деньги.",
    ],
    title: "Операции",
  },
  {
    icon: PiggyBank,
    items: [
      "В «Бюджете» можно создавать лимиты по категориям трат.",
      "Там же доступны категории: создание, редактирование и удаление.",
      "Прогресс-бар показывает, сколько уже потрачено и сколько осталось.",
    ],
    title: "Бюджеты",
  },
  {
    icon: Target,
    items: [
      "В «Целях» хранятся накопительные цели с целевой суммой и текущим прогрессом.",
      "Можно увидеть, сколько уже собрано и сколько еще осталось до цели.",
      "Для мобильного сценария удобно менять сумму через быстрый доступ с главной.",
    ],
    title: "Накопления",
  },
];

export function HelpModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="button button-ghost button-with-icon help-button"
        onClick={() => setOpen(true)}
        type="button"
      >
        <CircleHelp size={18} />
        <span>Как пользоваться</span>
      </button>

      <AppModal
        description="Основные возможности приложения и короткие сценарии использования."
        eyebrow="Справка"
        onClose={() => setOpen(false)}
        open={open}
        title="Инструкция по приложению"
      >
        <div className="help-intro">
          <BookOpenText size={18} />
          <p className="muted-copy">
            Приложение построено вокруг быстрого мобильного ввода, а аналитика уже
            идет следом как удобный обзор.
          </p>
        </div>

        <div className="help-grid">
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <article className="help-card" key={section.title}>
                <div className="help-card-header">
                  <span className="help-card-icon">
                    <Icon size={18} />
                  </span>
                  <h4>{section.title}</h4>
                </div>
                <div className="help-list">
                  {section.items.map((item) => (
                    <p className="muted-copy" key={item}>
                      {item}
                    </p>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </AppModal>
    </>
  );
}
