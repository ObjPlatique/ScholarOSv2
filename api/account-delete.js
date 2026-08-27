export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method không được hỗ trợ.' });

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'Thiếu phiên đăng nhập.' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!serviceKey || !supabaseUrl || !anonKey) return res.status(503).json({ message: 'Chức năng xóa tài khoản chưa được cấu hình trên máy chủ.' });

  try {
    const accessToken = authHeader.slice(7);
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } });
    const user = await userResponse.json().catch(() => ({}));
    if (!userResponse.ok || !user.id) return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });

    const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, { method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
    if (!deleteResponse.ok) {
      const detail = await deleteResponse.json().catch(() => ({}));
      return res.status(deleteResponse.status).json({ message: detail.msg || detail.message || 'Supabase không thể xóa tài khoản.' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Không thể xóa tài khoản.' });
  }
}
