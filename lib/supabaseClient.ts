import { createClient, SupabaseClient } from "@supabase/supabase-js";

const ENV_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ENV_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function getStoredSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  let url = ENV_URL;
  let anonKey = ENV_KEY;

  if (typeof window !== "undefined") {
    if (!url || url.includes("placeholder")) {
      const savedUrl = localStorage.getItem("bovalvet_supabase_url");
      if (savedUrl) url = savedUrl.trim();
    }
    if (!anonKey || anonKey.includes("placeholder")) {
      const savedKey = localStorage.getItem("bovalvet_supabase_anon_key");
      if (savedKey) anonKey = savedKey.trim();
    }
  }

  const isConfigured = Boolean(
    url && 
    anonKey && 
    !url.includes("placeholder") && 
    !anonKey.includes("placeholder") &&
    url.startsWith("http")
  );

  return {
    url: isConfigured ? url : (url || "https://placeholder.supabase.co"),
    anonKey: isConfigured ? anonKey : (anonKey || "placeholder-anon-key"),
    isConfigured,
  };
}

let cachedClient: SupabaseClient | null = null;
let cachedKey = "";

export function getSupabase(): SupabaseClient {
  const cfg = getStoredSupabaseConfig();
  const currentKey = `${cfg.url}:${cfg.anonKey}`;
  if (!cachedClient || cachedKey !== currentKey) {
    cachedClient = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    cachedKey = currentKey;
  }
  return cachedClient;
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("bovalvet_supabase_url", url.trim());
    localStorage.setItem("bovalvet_supabase_anon_key", anonKey.trim());
    cachedClient = null;
    cachedKey = "";
  }
}

export function clearSupabaseConfig() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("bovalvet_supabase_url");
    localStorage.removeItem("bovalvet_supabase_anon_key");
    cachedClient = null;
    cachedKey = "";
  }
}

export const isSupabaseConfigured = () => getStoredSupabaseConfig().isConfigured;

// Proxy so existing imports `import { supabase } from "@/lib/supabaseClient"` continue to work seamlessly!
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});