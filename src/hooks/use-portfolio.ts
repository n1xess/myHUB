import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PortfolioInsert, PortfolioItem } from "@/lib/types";
import { apiUrl } from "@/lib/api";

export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/portfolio"));
      if (!response.ok) throw new Error("Failed to fetch portfolio");
      return response.json() as Promise<PortfolioItem[]>;
    },
  });
}

export function useCreatePortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: PortfolioInsert) => {
      const response = await fetch(apiUrl("/portfolio"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!response.ok) throw new Error("Failed to create portfolio item");
      return response.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }),
  });
}

export function useUpdatePortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<PortfolioInsert>) => {
      const response = await fetch(apiUrl(`/portfolio/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update portfolio item");
      return response.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }),
  });
}

export function useDeletePortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(apiUrl(`/portfolio/${id}`), {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete portfolio item");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }),
  });
}
