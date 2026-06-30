"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface RefreshOptions {
  silent?: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  industry: string;
  location: string;
  searchQuery?: string;
  searchQueries?: string[];
  yourService: string;
  contentStyle: string;
  language: string;
  status: "draft" | "running" | "completed" | "failed" | "paused";
  progress: number;
  error?: string;
  totalLeads: number;
  priorityLeads: number;
  highQualityLeads: number;
  averageScore: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options: RefreshOptions = {}) => {
    const showLoading = !options.silent;
    try {
      if (showLoading) setLoading(true);
      const data = await api.get<Campaign[]>("/campaigns");
      setCampaigns(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const deleteCampaign = useCallback(async (id: string) => {
    await api.delete<void>(`/campaigns/${id}`);
    setCampaigns((current) => current.filter((campaign) => campaign.id !== id));
  }, []);

  const retryCampaign = useCallback(async (id: string) => {
    await api.post(`/scraper/campaigns/${id}/retry`, {});
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === id
          ? { ...campaign, status: "running", progress: 0, error: undefined }
          : campaign,
      ),
    );
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { campaigns, loading, error, refresh, deleteCampaign, retryCampaign };
}

export function useCampaign(id: string) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options: RefreshOptions = {}) => {
    const showLoading = !options.silent;
    try {
      if (showLoading) setLoading(true);
      const data = await api.get<Campaign>(`/campaigns/${id}`);
      setCampaign(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [id]);

  const retryCampaign = useCallback(async () => {
    await api.post(`/scraper/campaigns/${id}/retry`, {});
    setCampaign((current) =>
      current ? { ...current, status: "running", progress: 0, error: undefined } : current,
    );
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);
  return { campaign, loading, error, refresh, retryCampaign };
}
