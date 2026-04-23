"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Search } from "lucide-react";
import type { MotivoItem } from "@/lib/data-utils";

interface MotivosDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: MotivoItem | null;
}

export default function MotivosDrawer({ isOpen, onClose, data }: MotivosDrawerProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setSearchTerm("");
  }, [data, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!data) return null;

  const { motivo, cantidad, color, detalles } = data;

  const columns = [
    { 
      key: "razon_social", 
      label: "Sociedad", 
      render: (v: string, i: any) => (
        <div className="font-medium truncate max-w-[200px]" title={v}>
          {v}
          <div className="text-xs text-gray-500">{i.cuit}</div>
        </div>
      ) 
    },
    { key: "fecha_asignacion", label: "Fecha Asignación", render: (v: string) => new Date(v).toLocaleDateString("es-AR") },
    { key: "motivo", label: "Motivo" },
    { key: "asignado_por", label: "Asignado por" },
  ];

  const filteredItems = detalles.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.razon_social.toLowerCase().includes(q) ||
      (item.cuit && item.cuit.includes(q)) ||
      (item.asignado_por && item.asignado_por.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <div 
        className={`fixed top-0 right-0 h-full max-w-[95vw] w-[800px] xl:w-[900px] bg-[#1a1f2e] border-l border-white/10 z-[101] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold font-semibold" style={{ color }}>{motivo}</h2>
            <p className="text-sm text-gray-400 mt-1">{cantidad} sociedades asignadas por este motivo</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between bg-black/20">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text"
              placeholder="Buscar por sociedad o responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <div className="text-xs text-gray-400 whitespace-nowrap">
            Mostrando {filteredItems.length} registros
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/40 sticky top-0 backdrop-blur-md z-10">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 font-medium text-gray-400 border-b border-white/10">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, idx) => (
                  <tr 
                    key={`${item.id_sociedad}-${idx}`} 
                    onClick={() => router.push(`/asignaciones/cliente/${item.cuit || item.id_sociedad}`)}
                    className="hover:bg-white/5 even:bg-white/[0.01] transition-colors group cursor-pointer"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-gray-300">
                        {col.render ? col.render((item as any)[col.key], item) : (item as any)[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                    No se encontraron resultados para la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
