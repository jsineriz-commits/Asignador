"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface FilterContextValue {
  selectedAC: string | null;
  setSelectedAC: (ac: string | null) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string | null;
  setSelectedMonth: (month: string | null) => void;
  selectedFuente: string | null;
  setSelectedFuente: (fuente: string | null) => void;
  clearFilters: () => void;
}

const FilterContext = createContext<FilterContextValue>({
  selectedAC: null,
  setSelectedAC: () => {},
  selectedYear: "2026",
  setSelectedYear: () => {},
  selectedMonth: null,
  setSelectedMonth: () => {},
  selectedFuente: null,
  setSelectedFuente: () => {},
  clearFilters: () => {},
});

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedAC, setSelectedACState] = useState<string | null>(null);
  const [selectedYear, setSelectedYearState] = useState<string>("2026");
  const [selectedMonth, setSelectedMonthState] = useState<string | null>(null);
  const [selectedFuente, setSelectedFuenteState] = useState<string | null>(null);

  const setSelectedAC = useCallback((ac: string | null) => {
    setSelectedACState(ac);
  }, []);

  const setSelectedYear = useCallback((year: string) => {
    setSelectedYearState(year);
  }, []);

  const setSelectedMonth = useCallback((month: string | null) => {
    setSelectedMonthState(month);
  }, []);

  const setSelectedFuente = useCallback((fuente: string | null) => {
    setSelectedFuenteState(fuente);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedACState(null);
    setSelectedYearState("2026");
    setSelectedMonthState(null);
    setSelectedFuenteState(null);
  }, []);

  return (
    <FilterContext.Provider value={{
      selectedAC, setSelectedAC,
      selectedYear, setSelectedYear,
      selectedMonth, setSelectedMonth,
      selectedFuente, setSelectedFuente,
      clearFilters 
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  return useContext(FilterContext);
}
