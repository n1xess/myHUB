import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TradeCircle, TradeCircleInsert, TradeCircleUpdate } from "@/lib/types";
import { apiUrl } from "@/lib/api";

export function useCircles() {
  return useQuery({
    queryKey: ["circles"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/circles"));
      if (!response.ok) throw new Error("Failed to fetch circles");
      return response.json() as Promise<TradeCircle[]>;
    },
  });
}

export function useCreateCircle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (circle: TradeCircleInsert) => {
      const response = await fetch(apiUrl("/circles"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(circle),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to create circle");
      }
      return response.json() as Promise<TradeCircle>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["circles"] }),
  });
}

export function useUpdateCircle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TradeCircleUpdate) => {
      const response = await fetch(apiUrl(`/circles/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to update circle");
      }
      return response.json() as Promise<TradeCircle>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["circles"] }),
  });
}

export function useDeleteCircle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(apiUrl(`/circles/${id}`), {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to delete circle");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["circles"] }),
  });
}
