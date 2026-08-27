export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';

  if (!url || !anonKey) {
    return res.status(503).json({
      configured: false,
      message: 'Supabase chưa được cấu hình. Hãy thêm SUPABASE_URL và SUPABASE_ANON_KEY vào Environment Variables.'
    });
  }

  return res.status(200).json({ configured: true, url, anonKey });
}
