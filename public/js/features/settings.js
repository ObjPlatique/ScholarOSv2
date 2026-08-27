import { navigate } from '../core/router.js';
import { getSupabase } from '../core/supabase.js';
import { getState, resetState } from '../core/store.js';
import { setTheme } from '../core/theme.js';

let settingsStatus = null;
let busy = false;

export const settings = {
  title: 'Cài đặt',
  description: 'Quản lý giao diện và tài khoản ScholarOS của bạn.',
  eyebrow: 'SETTINGS',
  render() {
    const theme = getState().theme === 'dark' ? 'dark' : 'light';
    return `<section class="settings-page">
      <div class="settings-grid">
        <article class="settings-card card">
          <div class="settings-section-heading"><div class="settings-icon">◐</div><div><h2>Giao diện</h2><p>Tùy chỉnh cách ScholarOS hiển thị trên thiết bị của bạn.</p></div></div>
          <div class="settings-row"><div><strong>Chế độ giao diện</strong><span>Sáng hoặc tối</span></div><div class="theme-choice-group" role="group" aria-label="Chế độ giao diện"><button type="button" class="theme-choice ${theme === 'light' ? 'active' : ''}" data-action="settings-theme-light" aria-pressed="${theme === 'light'}">☀ Sáng</button><button type="button" class="theme-choice ${theme === 'dark' ? 'active' : ''}" data-action="settings-theme-dark" aria-pressed="${theme === 'dark'}">☾ Tối</button></div></div>
        </article>

        <article class="settings-card card">
          <div class="settings-section-heading"><div class="settings-icon">◎</div><div><h2>Tài khoản</h2><p>Thay đổi thông tin và bảo mật tài khoản Supabase.</p></div></div>
          <form class="settings-form" data-action="settings-password">
            <div class="settings-subheading"><strong>Đổi mật khẩu</strong><span>Nhập mật khẩu mới để cập nhật.</span></div>
            <label class="field"><span>Mật khẩu mới</span><input name="password" type="password" minlength="6" autocomplete="new-password" placeholder="Ít nhất 6 ký tự" required></label>
            <label class="field"><span>Xác nhận mật khẩu mới</span><input name="confirmPassword" type="password" minlength="6" autocomplete="new-password" placeholder="Nhập lại mật khẩu" required></label>
            <button class="button" type="submit" ${busy ? 'disabled' : ''}>Đổi mật khẩu</button>
          </form>
          <form class="settings-form settings-divider" data-action="settings-email">
            <div class="settings-subheading"><strong>Đổi email</strong><span>Supabase có thể yêu cầu xác minh email mới.</span></div>
            <label class="field"><span>Email mới</span><input name="email" type="email" autocomplete="email" placeholder="email-moi@example.com" required></label>
            <button class="button" type="submit" ${busy ? 'disabled' : ''}>Đổi email</button>
          </form>
          <form class="settings-form settings-divider" data-action="settings-nickname">
            <div class="settings-subheading"><strong>Đổi nickname</strong><span>Tên hiển thị trên thanh menu tài khoản.</span></div>
            <label class="field"><span>Nickname</span><input name="nickname" type="text" maxlength="40" value="${escapeHtml(window.__scholarUser?.user_metadata?.nickname || '')}" placeholder="Tên hiển thị của bạn" required></label>
            <button class="button" type="submit" ${busy ? 'disabled' : ''}>Lưu nickname</button>
          </form>
        </article>

        <article class="settings-card card settings-danger-card">
          <div class="settings-section-heading"><div class="settings-icon danger-icon">!</div><div><h2>Dữ liệu & tài khoản</h2><p>Các thao tác dưới đây có thể không hoàn tác được.</p></div></div>
          <div class="settings-danger-row"><div><strong>Xóa dữ liệu</strong><span>Xóa dữ liệu học tập đang lưu trên thiết bị này, nhưng giữ nguyên tài khoản.</span></div><button class="button danger-button" data-action="settings-delete-data">Xóa dữ liệu</button></div>
          <div class="settings-danger-row settings-divider"><div><strong>Xóa tài khoản</strong><span>Xóa vĩnh viễn tài khoản Supabase và đăng xuất khỏi ScholarOS.</span></div><button class="button danger-button" data-action="settings-delete-account">Xóa tài khoản</button></div>
        </article>
      </div>
      ${settingsStatus ? `<div class="settings-status ${settingsStatus.type}" role="status">${settingsStatus.message}</div>` : ''}
    </section>`;
  },
  async mount() {
    try {
      const supabase = await getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      window.__scholarUser = session?.user || null;
      if (!session?.user) { navigate('auth'); return; }
      if (!document.querySelector('.settings-page')) return;
      document.getElementById('appView').innerHTML = settings.render();
    } catch (error) {
      settingsStatus = { type: 'error', message: escapeHtml(error.message || 'Không thể tải tài khoản.') };
    }
  }
};

export async function handleSettingsAction(action, _id, event, target) {
  if (action === 'settings-theme-light' || action === 'settings-theme-dark') {
    setTheme(action.endsWith('dark') ? 'dark' : 'light');
    settingsStatus = null;
    renderSettings();
    return 'refresh';
  }
  if (action === 'settings-delete-data') {
    if (!confirm('Xóa toàn bộ dữ liệu học tập trên thiết bị này? Tài khoản của bạn sẽ không bị xóa.')) return;
    resetState();
    settingsStatus = { type: 'success', message: 'Đã xóa dữ liệu học tập trên thiết bị này. Tài khoản vẫn được giữ nguyên.' };
    renderSettings();
    return 'refresh';
  }
  if (action === 'settings-delete-account') {
    if (!confirm('Xóa vĩnh viễn tài khoản ScholarOS? Hành động này không thể hoàn tác.')) return;
    busy = true; renderSettings();
    try {
      const supabase = await getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Phiên đăng nhập đã hết hạn.');
      const response = await fetch('/api/account-delete', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không thể xóa tài khoản.');
      await supabase.auth.signOut();
      resetState();
      window.__scholarUser = null;
      navigate('auth');
      return 'refresh';
    } catch (error) {
      settingsStatus = { type: 'error', message: escapeHtml(error.message || 'Không thể xóa tài khoản.') };
    } finally { busy = false; }
    renderSettings();
    return 'refresh';
  }

  if (!action?.startsWith('settings-')) return;
  const form = target?.tagName === 'FORM' ? target : event?.target?.closest('form[data-action]');
  if (!form) return;
  const data = new FormData(form);
  busy = true; settingsStatus = null; renderSettings();
  try {
    const supabase = await getSupabase();
    if (action === 'settings-password') {
      const password = String(data.get('password') || '');
      const confirmPassword = String(data.get('confirmPassword') || '');
      if (password.length < 6) throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      if (password !== confirmPassword) throw new Error('Mật khẩu xác nhận chưa khớp.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      settingsStatus = { type: 'success', message: 'Đã đổi mật khẩu thành công.' };
    } else if (action === 'settings-email') {
      const email = String(data.get('email') || '').trim();
      if (!email) throw new Error('Vui lòng nhập email mới.');
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      settingsStatus = { type: 'success', message: 'Đã yêu cầu đổi email. Hãy kiểm tra hộp thư để hoàn tất xác minh.' };
    } else if (action === 'settings-nickname') {
      const nickname = String(data.get('nickname') || '').trim();
      if (!nickname) throw new Error('Nickname không được để trống.');
      if (nickname.length > 40) throw new Error('Nickname tối đa 40 ký tự.');
      const { data: result, error } = await supabase.auth.updateUser({ data: { nickname } });
      if (error) throw error;
      window.__scholarUser = result.user;
      settingsStatus = { type: 'success', message: 'Đã cập nhật nickname.' };
    }
  } catch (error) { settingsStatus = { type: 'error', message: escapeHtml(error.message || 'Không thể cập nhật tài khoản.') }; }
  finally { busy = false; }
  renderSettings();
  return 'refresh';
}

function renderSettings() { const view = document.getElementById('appView'); if (view) view.innerHTML = settings.render(); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
