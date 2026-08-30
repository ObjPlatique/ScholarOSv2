import { createClient } from '@supabase/supabase-js';

const RESET_MARKER = '__SCHOLAROS_RESET__';

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const token = getBearerToken(req);
  const url = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  if (!url || !serviceKey) return res.status(503).json({ error: 'Chức năng xóa dữ liệu chưa được cấu hình trên máy chủ.' });
  if (!token) return res.status(401).json({ error: 'Thiếu phiên đăng nhập.' });

  try {
    const userClient = createClient(url, anonKey || serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
    if (!user.email_confirmed_at) return res.status(403).json({ error: 'Email của tài khoản chưa được xác minh.' });

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: files, error: filesError } = await admin.from('drive_files').select('storage_path,storage_bucket').eq('user_id', user.id);
    if (filesError) throw filesError;

    const byBucket = new Map();
    for (const row of files || []) {
      const bucket = row.storage_bucket || 'scholar-drive';
      if (!row.storage_path) continue;
      const list = byBucket.get(bucket) || [];
      list.push(row.storage_path);
      byBucket.set(bucket, list);
    }
    for (const [bucket, paths] of byBucket) {
      const { error } = await admin.storage.from(bucket).remove(paths);
      if (error) throw error;
    }

    const { error: driveError } = await admin.from('drive_files').delete().eq('user_id', user.id);
    if (driveError) throw driveError;

    const { error: stateError } = await admin.from('user_state').upsert({
      user_id: user.id,
      state: { [RESET_MARKER]: true }
    }, { onConflict: 'user_id' });
    if (stateError) throw stateError;

    return res.status(200).json({ ok: true, userId: user.id });
  } catch (error) {
    console.error('[data-delete]', error);
    return res.status(500).json({ error: error?.message || 'Không thể xóa dữ liệu.' });
  }
}
