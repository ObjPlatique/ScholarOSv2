import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const url = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  if (!url || !serviceKey) return res.status(503).json({ error: 'Chức năng xóa tài khoản chưa được cấu hình trên máy chủ.' });
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
    const { error: stateError } = await admin.from('user_state').delete().eq('user_id', user.id);
    if (stateError) throw stateError;

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false);
    if (deleteError) throw deleteError;
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[account-delete]', error);
    return res.status(500).json({ error: error?.message || 'Không thể xóa tài khoản.' });
  }
}
