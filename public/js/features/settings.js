import { navigate } from '../core/router.js';
import { getSupabase } from '../core/supabase.js';
import { resetState } from '../core/store.js';

export const settings = {
  title: 'Cài đặt',
  description: 'Quản lý tài khoản và dữ liệu ScholarOS.',
  eyebrow: 'SETTINGS',
  render() {
    return `
      <section class="settings-page">
        <div class="settings-grid">
          <article class="card settings-card">
            <div class="settings-card-heading"><div><span class="settings-kicker">TÀI KHOẢN</span><h2>Thông tin tài khoản</h2></div></div>
            <div id="settingsAccount" class="settings-account-state">Đang tải thông tin tài khoản…</div>
          </article>
          <article class="card settings-card">
            <div class="settings-card-heading"><div><span class="settings-kicker">BẢO MẬT</span><h2>Đổi mật khẩu</h2></div></div>
            <form class="settings-form" data-action="settings-password">
              <label class="field"><span>Mật khẩu mới</span><input name="password" type="password" minlength="6" autocomplete="new-password" required placeholder="Ít nhất 6 ký tự"></label>
              <label class="field"><span>Xác nhận mật khẩu</span><input name="confirmPassword" type="password" minlength="6" autocomplete="new-password" required placeholder="Nhập lại mật khẩu"></label>
              <button class="button primary" type="submit">Đổi mật khẩu</button>
            </form>
          </article>
          <article class="card settings-card">
            <div class="settings-card-heading"><div><span class="settings-kicker">EMAIL</span><h2>Đổi email</h2></div></div>
            <form class="settings-form" data-action="settings-email">
              <label class="field"><span>Email mới</span><input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label>
              <button class="button" type="submit">Đổi email</button>
              <p class="settings-help">Supabase có thể yêu cầu xác nhận email mới qua hộp thư.</p>
            </form>
          </article>
          <article class="card settings-card">
            <div class="settings-card-heading"><div><span class="settings-kicker">HỒ SƠ</span><h2>Đổi tên đăng nhập</h2></div></div>
            <form class="settings-form" data-action="settings-username">
              <label class="field"><span>Tên đăng nhập</span><input name="username" type="text" minlength="2" maxlength="40" required placeholder="Tên của bạn"></label>
              <button class="button" type="submit">Lưu tên đăng nhập</button>
            </form>
          </article>
          <article class="card settings-card settings-danger-card">
            <div class="settings-card-heading"><div><span class="settings-kicker">DỮ LIỆU</span><h2>Quản lý dữ liệu</h2></div></div>
            <p class="settings-help">Xóa toàn bộ dữ liệu học tập và tài liệu Drive của tài khoản này. Tài khoản vẫn được giữ lại.</p>
            <button class="button danger-button" data-action="settings-delete-data">Xóa dữ liệu</button>
          </article>
          <article class="card settings-card settings-danger-card">
            <div class="settings-card-heading"><div><span class="settings-kicker">TÀI KHOẢN</span><h2>Xóa tài khoản</h2></div></div>
            <p class="settings-help">Xóa vĩnh viễn tài khoản cùng dữ liệu liên quan. Hành động này không thể hoàn tác.</p>
            <button class="button danger-button" data-action="settings-delete-account">Xóa tài khoản</button>
          </article>
        </div>
      </section>`;
  },
  async mount() { await loadAccount(); }
};

async function loadAccount() {
  const target = document.getElementById('settingsAccount');
  if (!target) return;
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) { target.innerHTML = '<p class="settings-help">Bạn chưa đăng nhập.</p>'; return; }
    const user = data.user;
    const username = user.user_metadata?.username || 'Chưa đặt';
    target.innerHTML = `<div class="settings-account-row"><span>Email</span><strong>${escapeHtml(user.email || '')}</strong></div><div class="settings-account-row"><span>Tên đăng nhập</span><strong>${escapeHtml(username)}</strong></div><div class="settings-account-row"><span>User ID</span><code>${escapeHtml(user.id)}</code></div>`;
  } catch (error) { target.innerHTML = `<p class="settings-help settings-error">${escapeHtml(error.message || 'Không thể tải tài khoản.')}</p>`; }
}

export async function handleSettingsAction(action, event, target) {
  if (action === 'settings-delete-data') return deleteData();
  if (action === 'settings-delete-account') return deleteAccount();
  const form = target?.tagName === 'FORM' ? target : event?.target?.closest('form[data-action]');
  if (!form) return;
  const data = new FormData(form);
  try {
    const supabase = await getSupabase();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) throw new Error('Bạn cần đăng nhập để thay đổi cài đặt.');
    if (action === 'settings-password') {
      const password = String(data.get('password') || '');
      const confirmPassword = String(data.get('confirmPassword') || '');
      if (password.length < 6) throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      if (password !== confirmPassword) throw new Error('Mật khẩu xác nhận chưa khớp.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      notify('Đã đổi mật khẩu.');
      form.reset();
    } else if (action === 'settings-email') {
      const email = String(data.get('email') || '').trim();
      if (!email) throw new Error('Vui lòng nhập email mới.');
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      notify('Đã gửi yêu cầu xác nhận email mới.');
      form.reset();
      await loadAccount();
    } else if (action === 'settings-username') {
      const username = String(data.get('username') || '').trim();
      if (username.length < 2) throw new Error('Tên đăng nhập phải có ít nhất 2 ký tự.');
      const { error } = await supabase.auth.updateUser({ data: { username } });
      if (error) throw error;
      notify('Đã cập nhật tên đăng nhập.');
      await loadAccount();
      updateAccountMenu();
    }
  } catch (error) { notify(error.message || 'Không thể cập nhật cài đặt.'); }
}

async function deleteData() {
  if (!confirm('Xóa toàn bộ dữ liệu học tập và tài liệu Drive? Tài khoản sẽ không bị xóa.')) return;
  try {
    const supabase = await getSupabase();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) throw new Error('Bạn cần đăng nhập.');
    const userId = userData.user.id;
    const { data: files, error: filesError } = await supabase.from('drive_files').select('storage_path').eq('user_id', userId);
    if (filesError) throw filesError;
    const paths = (files || []).map(row => row.storage_path).filter(Boolean);
    if (paths.length) await supabase.storage.from('scholar-drive').remove(paths);
    const { error: driveError } = await supabase.from('drive_files').delete().eq('user_id', userId);
    if (driveError) throw driveError;
    const { error: stateError } = await supabase.from('user_state').delete().eq('user_id', userId);
    if (stateError) throw stateError;
    resetState();
    localStorage.removeItem('scholaros.v2.state');
    notify('Đã xóa toàn bộ dữ liệu.');
    navigate('dashboard');
  } catch (error) { notify(error.message || 'Không thể xóa dữ liệu.'); }
}

async function deleteAccount() {
  const first = confirm('Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu?');
  if (!first) return;
  const second = prompt('Nhập XOA TAI KHOAN để xác nhận:');
  if (second !== 'XOA TAI KHOAN') return notify('Đã hủy xóa tài khoản.');
  try {
    const supabase = await getSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
    const response = await fetch('/api/account-delete', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Không thể xóa tài khoản.');
    localStorage.clear();
    await supabase.auth.signOut();
    window.location.hash = '#auth';
    window.location.reload();
  } catch (error) { notify(error.message || 'Không thể xóa tài khoản.'); }
}

function notify(message) { const toast = document.getElementById('toast'); if (!toast) return; toast.textContent = message; toast.classList.add('show'); clearTimeout(window.__toast); window.__toast = setTimeout(() => toast.classList.remove('show'), 3500); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function updateAccountMenu() { window.dispatchEvent(new CustomEvent('scholaros:account-updated')); }
