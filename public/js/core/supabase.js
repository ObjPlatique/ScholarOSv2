// This project ships native browser ES modules without a bundler.
// Browsers cannot resolve a bare npm specifier such as "@supabase/supabase-js",
// so load the ESM build from a browser-compatible CDN.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

let clientPromise;
const DRIVE_BUCKET = 'scholar-drive';
const CONFIG_TIMEOUT_MS = 8000;

async function loadConfig() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS);
  try {
    const response = await fetch('/api/supabase-config', { cache: 'no-store', signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.configured) {
      throw new Error(data.message || 'Không thể tải cấu hình Supabase.');
    }
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Kết nối Supabase quá lâu. Vui lòng thử lại.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function getSupabase() {
  if (!clientPromise) {
    clientPromise = loadConfig().then(({ url, anonKey }) => createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }));
  }
  try {
    return await clientPromise;
  } catch (error) {
    clientPromise = undefined;
    throw error;
  }
}

export function resetSupabaseClient() {
  clientPromise = undefined;
}

export const DRIVE_STORAGE_BUCKET = DRIVE_BUCKET;
