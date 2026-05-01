import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TradeInsert, Trade } from "@/lib/types";
import { apiUrl } from "@/lib/api";

export function useTrades() {
  return useQuery({
    queryKey: ["trades"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/trades"));
      if (!response.ok) throw new Error("Failed to fetch trades");
      return response.json() as Promise<Trade[]>;
    },
  });
}

export function useCreateTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trade: TradeInsert) => {
      const response = await fetch(apiUrl("/trades"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trade),
      });
      if (!response.ok) throw new Error("Failed to create trade");
      return response.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trades"] }),
  });
}

export function useDeleteTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(apiUrl(`/trades/${id}`), {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete trade");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trades"] }),
  });
}

export function useUpdateTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TradeInsert>) => {
      const response = await fetch(apiUrl(`/trades/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update trade");
      return response.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trades"] }),
  });
}
