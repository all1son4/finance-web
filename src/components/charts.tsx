import { PiggyBank, TrendingDown, TrendingUp } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import type { AppSettingsRecord } from "@/lib/settings";

type FlowItem = {
  expenses: number;
  income: number;
  label: string;
  savings: number;
};

type CategoryBarItem = {
  color: string;
  name: string;
  total: number;
};

export function FlowChart({
  data,
  settings,
}: {
  data: FlowItem[];
  settings: AppSettingsRecord;
}) {
  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => [item.income, item.expenses, item.savings]),
  );

  return (
    <div className="chart-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Движение денег</p>
          <h3>Последние 6 месяцев</h3>
        </div>
        <div className="legend">
          <span><TrendingUp className="legend-icon income" size={14} /> Доход</span>
          <span><TrendingDown className="legend-icon expense" size={14} /> Траты</span>
          <span><PiggyBank className="legend-icon savings" size={14} /> Накопления</span>
        </div>
      </div>
      <div className="flow-chart">
        {data.map((item) => (
          <div className="flow-group" key={item.label}>
            <div className="flow-columns">
              <div
                className="flow-bar income"
                style={{ height: `${(item.income / maxValue) * 100}%` }}
                title={`${item.label} доход ${formatCurrency(item.income, settings)}`}
              />
              <div
                className="flow-bar expense"
                style={{ height: `${(item.expenses / maxValue) * 100}%` }}
                title={`${item.label} траты ${formatCurrency(item.expenses, settings)}`}
              />
              <div
                className="flow-bar savings"
                style={{ height: `${(item.savings / maxValue) * 100}%` }}
                title={`${item.label} накопления ${formatCurrency(item.savings, settings)}`}
              />
            </div>
            <span className="flow-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategoryChart({
  data,
  settings,
}: {
  data: CategoryBarItem[];
  settings: AppSettingsRecord;
}) {
  const maxValue = Math.max(1, ...data.map((item) => item.total));

  return (
    <div className="chart-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Структура трат</p>
          <h3>Главные категории</h3>
        </div>
      </div>
      <div className="category-chart">
        {data.length ? (
          data.map((item) => (
            <div className="category-row" key={item.name}>
              <div className="category-row-copy">
                <span className="dot" style={{ background: item.color }} />
                <span>{item.name}</span>
                <strong>{formatCurrency(item.total, settings)}</strong>
              </div>
              <div className="category-row-track">
                <div
                  className="category-row-fill"
                  style={{
                    background: item.color,
                    width: `${(item.total / maxValue) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="empty-copy">Добавьте траты, чтобы увидеть распределение по категориям.</p>
        )}
      </div>
    </div>
  );
}
