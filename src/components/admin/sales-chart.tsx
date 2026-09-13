"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/format";

interface Point {
  day: string;
  net_sales: number;
  sale_count: number;
}

const shortDay = (iso: string) => {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(d);
};

const compact = (n: number) =>
  new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(n);

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-steel-200 bg-white px-3 py-2 shadow-card">
      <p className="text-xs font-semibold text-steel-500">
        {new Date(label).toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })}
      </p>
      <p className="mt-0.5 text-sm font-bold text-steel-900">
        {formatMoney(payload[0].value)}
      </p>
      <p className="text-xs text-steel-500">
        {payload[0].payload.sale_count} vente
        {payload[0].payload.sale_count > 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function SalesChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e08511" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#e08511" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e3ecf6"
          />
          <XAxis
            dataKey="day"
            tickFormatter={shortDay}
            tick={{ fontSize: 11, fill: "#8fb3d5" }}
            axisLine={false}
            tickLine={false}
            minTickGap={16}
          />
          <YAxis
            tickFormatter={compact}
            tick={{ fontSize: 11, fill: "#8fb3d5" }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#c1d5e9" }} />
          <Area
            type="monotone"
            dataKey="net_sales"
            stroke="#e08511"
            strokeWidth={2}
            fill="url(#salesFill)"
            dot={false}
            activeDot={{ r: 4, fill: "#e08511" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
