"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { MotivoItem } from "@/lib/data-utils";
import MotivosDrawer from "./MotivosDrawer";

interface MotivosChartProps {
  data: MotivoItem[];
}

const CustomTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: { name: string; value: number; payload: MotivoItem }[];
}) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const total = item.payload as unknown as { total: number };
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-2xl text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ background: item.payload.color }}
        />
        <span className="font-semibold text-foreground">{item.name}</span>
      </div>
      <p className="text-muted-foreground">
        {item.value} <span className="text-foreground font-medium">sociedades</span>
      </p>
    </div>
  );
};

const CustomLegend = ({ data, onItemClick }: { data: MotivoItem[], onItemClick: (item: MotivoItem) => void }) => {
  const total = data.reduce((s, d) => s + d.cantidad, 0);
  return (
    <div className="flex flex-col gap-1 justify-start">
      {data.map((item) => (
        <div 
          key={item.motivo} 
          onClick={() => onItemClick(item)}
          className="flex items-center gap-2.5 min-w-0 p-1.5 -mx-1.5 rounded-md hover:bg-white/5 cursor-pointer transition-colors group"
        >
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-110 transition-transform"
            style={{ background: item.color }}
          />
          <span className="text-xs text-muted-foreground truncate flex-1">
            {item.motivo}
          </span>
          <span className="text-xs font-semibold text-foreground shrink-0">
            {Math.round((item.cantidad / total) * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
};

export default function MotivosChart({ data }: MotivosChartProps) {
  const [selectedMotivo, setSelectedMotivo] = useState<MotivoItem | null>(null);

  const handlePieClick = (data: any, index: number) => {
    if (data && data.payload) {
      setSelectedMotivo(data.payload as MotivoItem);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Motivos de Asignación
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Distribución por fuente de origen (Sheets)
        </p>
      </div>

      <div className="flex-1 flex items-center gap-4 min-h-0">
        <div className="flex-1 h-full min-h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                dataKey="cantidad"
                nameKey="motivo"
                paddingAngle={3}
                strokeWidth={0}
                onClick={handlePieClick}
                cursor="pointer"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="w-36 shrink-0 h-full overflow-y-auto pr-1 pb-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <CustomLegend data={data} onItemClick={setSelectedMotivo} />
        </div>
      </div>

      <MotivosDrawer 
        isOpen={!!selectedMotivo} 
        onClose={() => setSelectedMotivo(null)} 
        data={selectedMotivo} 
      />
    </div>
  );
}
