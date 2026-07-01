"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface RefreshOptions {
  silent?: boolean;
}

export interface Lead {
  id: string;
  name: string;
  tradeName?: string | null;
  cnpj?: string | null;
  businessStatus?: string | null;
  address: string;
  zipCode?: string | null;
  phone: string;
  email?: string | null;
  website: string;
  instagramUrl?: string | null;
  rating: string;
  score: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  crmStatus:
    | "new"
    | "potential_customer"
    | "contacted"
    | "qualified"
    | "proposal"
    | "negotiation"
    | "won"
    | "not_interested"
    | "lost"
    | "archived";
  crmNotes?: string;
  hasWebsite: boolean;
  industry?: string;
  category?: string;
  campaignId?: string | null;
  campaign?: { id: string; name: string } | null;
  marketingContent?: {
    email?: { subject: string; body: string };
    whatsapp?: string;
    instagram?: string;
    linkedin?: { connectionNote: string };
    coldCall?: { opening: string };
  };
  aiAnalysis?: {
    factors?: string[];
    recommendation?: string;
    catalogOpportunity?: {
      level: "HIGH" | "MEDIUM" | "LOW";
      hasWebsite: boolean;
      reasons: string[];
      offerAngle: string;
    };
  };
  activities?: Array<{ id: string; type: string; note: string; createdAt: string }>;
  scrapedAt: string;
  createdAt: string;
}

export function useLeads(campaignId?: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options: RefreshOptions = {}) => {
    const showLoading = !options.silent;
    try {
      if (showLoading) setLoading(true);
      const path = `/leads${campaignId ? `?campaignId=${campaignId}` : ""}`;
      const data = await api.get<Lead[]>(path);
      setLeads(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { leads, loading, error, refresh };
}

export function useLead(id: string) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options: RefreshOptions = {}) => {
    const showLoading = !options.silent;
    try {
      if (showLoading) setLoading(true);
      const data = await api.get<Lead>(`/leads/${id}`);
      setLead(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);
  return { lead, loading, error, refresh };
}
