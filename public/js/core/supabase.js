let clientPromise;

const DRIVE_BUCKET = 'scholar-drive';

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
      const client = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      const storageFrom = client.storage.from.bind(client.storage);
      client.storage.from = (bucket) => storageFrom(bucket === 'resources' ? DRIVE_BUCKET : bucket);
      return client;
    });
  }
  return clientPromise;
}

export function resetSupabaseClient() {
  clientPromise = undefined;
}
