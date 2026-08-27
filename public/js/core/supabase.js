let clientPromise;

async function loadConfig() {
  const response = await fetch('/api/supabase-config', { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.configured) {
    throw new Error(data.message || 'Không thể tải cấu hình Supabase.');
  }
  return data;
}

export async function getSupabase() {
  if (!clientPromise) {
    clientPromise = loadConfig().then(async ({ url, anonKey }) => {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      return createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    });
  }
  return clientPromise;
}

export function resetSupabaseClient() {
  clientPromise = undefined;
}
