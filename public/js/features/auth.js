import { navigate } from '../core/router.js';
import { getSupabase } from '../core/supabase.js';

let authMode = 'login';
let authStatus = '';
let authBusy = false;
let resendEmail = '';

export const auth = {
  title: 'Tài khoản',
  description: 'Đăng nhập để đồng bộ dữ liệu ScholarOS riêng tư theo tài khoản của bạn.',
  eyebrow: 'SCHOLAROS ACCOUNT',
  open(mode = 'login') {
    authMode = mode === 'signup' ? 'signup' : 'login';
    authStatus = '';
    resendEmail = '';
    navigate('auth');
  },
  render() {
    return `
      <section class="auth-page">
        <div class="auth-shell">
          <div class="auth-brand"><div class="auth-logo" aria-hidden="true">S</div><div><strong>ScholarOS</strong><span>Personal Learning System</span></div></div>
          <div class="auth-card card">
            <div class="auth-heading">
              <span class="auth-kicker">TÀI KHOẢN</span>
              <h2>${authMode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản ScholarOS'}</h2>
              <p>${authMode === 'login' ? 'Đăng nhập để tiếp tục học tập.' : 'Tạo tài khoản để dữ liệu của bạn thuộc về riêng bạn.'}</p>
            </div>
            <div class="auth-tabs" role="tablist" aria-label="Xác thực">
              <button class="auth-tab ${authMode === 'login' ? 'active' : ''}" data-action="auth-mode-login" role="tab" aria-selected="${authMode === 'login'}">Đăng nhập</button>
              <button class="auth-tab ${authMode === 'signup' ? 'active' : ''}" data-action="auth-mode-signup" role="tab" aria-selected="${authMode === 'signup'}">Đăng ký</button>
            </div>
            <form class="auth-form" data-action="auth-${authMode}">
              <label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" placeholder="you@example.com" required></label>
              <label class="field"><span>Mật khẩu</span><input name="password" type="password" autocomplete="${authMode === 'login' ? 'current-password' : 'new-password'}" placeholder="Ít nhất 6 ký tự" minlength="6" required></label>
              ${authMode === 'signup' ? '<label class="field"><span>Xác nhận mật khẩu</span><input name="confirmPassword" type="password" autocomplete="new-password" placeholder="Nhập lại mật khẩu" minlength="6" required></label>' : ''}
              <button class="button primary auth-submit" type="submit" ${authBusy ? 'disabled' : ''}>${authBusy ? 'Đang xử lý…' : authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
            </form>
            ${authStatus ? `<div class="auth-status ${authStatus.type || ''}" role="status">${authStatus.message}</div>` : ''}
            ${authStatus?.type === 'success' && resendEmail ? '<button class="text-button auth-resend" data-action="auth-resend">Gửi lại email xác minh</button>' : ''}
            <div class="auth-note"><span aria-hidden="true">🔒</span><span>Dữ liệu tài khoản sẽ được bảo vệ bằng Supabase Auth + Row Level Security khi module dữ liệu được kết nối.</span></div>
          </div>
          <p class="auth-footer">Bạn có thể dùng ScholarOS trên máy tính và điện thoại với cùng một tài khoản.</p>
        </div>
      </section>`;
  },
  async mount() {
    try {
      const supabase = await getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) document.getElementById('appView').innerHTML = renderSignedIn(session.user);
    } catch (error) {
      authStatus = { type: 'error', message: escapeHtml(error.message || 'Chưa thể kết nối Supabase.') };
      rerenderAuth();
    }
  }
};

function renderSignedIn(user) {
  return `
    <section class="auth-page">
      <div class="auth-shell">
        <div class="auth-brand"><div class="auth-logo">S</div><div><strong>ScholarOS</strong><span>Personal Learning System</span></div></div>
        <div class="auth-card card auth-signed-card">
          <div class="auth-success-icon" aria-hidden="true">✓</div>
          <span class="auth-kicker">TÀI KHOẢN</span>
          <h2>Đã đăng nhập</h2>
          <p class="auth-user-email">${escapeHtml(user.email || '')}</p>
          <p class="muted">Tài khoản đã được xác thực. Bạn có thể quay lại ScholarOS.</p>
          <div class="auth-actions"><button class="button primary" data-action="auth-go-dashboard">Đi tới Dashboard</button><button class="button" data-action="auth-signout">Đăng xuất</button></div>
        </div>
      </div>
    </section>`;
}

export async function handleAuthAction(action, _id, event, target) {
  if (action === 'auth-mode-login' || action === 'auth-mode-signup') {
    authMode = action.endsWith('signup') ? 'signup' : 'login';
    authStatus = '';
    resendEmail = '';
    rerenderAuth();
    return;
  }

  if (action === 'auth-go-dashboard') {
    navigate('dashboard');
    return;
  }

  if (action === 'auth-signout') {
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      authStatus = { type: 'success', message: 'Đã đăng xuất.' };
      authMode = 'login';
      resendEmail = '';
      rerenderAuth();
    } catch (error) {
      authStatus = { type: 'error', message: escapeHtml(error.message || 'Không thể đăng xuất.') };
      rerenderAuth();
    }
    return;
  }

  if (action === 'auth-resend') {
    if (!resendEmail) return;
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: resendEmail,
        options: { emailRedirectTo: `${window.location.origin}/?auth=1` }
      });
      if (error) throw error;
      authStatus = { type: 'success', message: `Đã gửi lại email xác minh tới <strong>${escapeHtml(resendEmail)}</strong>.` };
    } catch (error) {
      authStatus = { type: 'error', message: escapeHtml(error.message || 'Không thể gửi lại email.') };
    }
    rerenderAuth();
    return;
  }

  if (!action?.startsWith('auth-')) return;
  const form = target?.tagName === 'FORM' ? target : event?.target?.closest('form[data-action]');
  if (!form) return;
  const data = new FormData(form);
  const email = String(data.get('email') || '').trim();
  const password = String(data.get('password') || '');

  if (!email || password.length < 6) {
    authStatus = { type: 'error', message: 'Vui lòng nhập email hợp lệ và mật khẩu từ 6 ký tự.' };
    rerenderAuth();
    return;
  }

  if (action === 'auth-signup') {
    const confirmPassword = String(data.get('confirmPassword') || '');
    if (password !== confirmPassword) {
      authStatus = { type: 'error', message: 'Mật khẩu xác nhận chưa khớp.' };
      rerenderAuth();
      return;
    }
  }

  authBusy = true;
  authStatus = '';
  rerenderAuth();

  try {
    const supabase = await getSupabase();
    if (action === 'auth-signup') {
      const { data: result, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/?auth=1` }
      });
      if (error) throw error;
      resendEmail = email;
      if (result.session) {
        navigate('dashboard');
      } else {
        authStatus = { type: 'success', message: `Đã tạo tài khoản. Hãy kiểm tra email <strong>${escapeHtml(email)}</strong> để xác minh trước khi đăng nhập.` };
      }
    } else {
      const { data: result, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!result.session) throw new Error('Đăng nhập chưa hoàn tất. Hãy xác minh email trước.');
      navigate('dashboard');
    }
  } catch (error) {
    authStatus = { type: 'error', message: escapeHtml(normalizeAuthError(error)) };
  } finally {
    authBusy = false;
    if (!window.location.hash.endsWith('#dashboard')) rerenderAuth();
  }
}

function rerenderAuth() {
  const view = document.getElementById('appView');
  if (!view) return;
  view.innerHTML = auth.render();
}

function normalizeAuthError(error) {
  const message = error?.message || 'Có lỗi xảy ra khi xác thực.';
  if (/invalid login credentials/i.test(message)) return 'Email hoặc mật khẩu không đúng.';
  if (/email not confirmed/i.test(message)) return 'Email chưa được xác minh. Hãy kiểm tra hộp thư và xác minh trước khi đăng nhập.';
  if (/user already registered/i.test(message)) return 'Email này đã được đăng ký. Hãy chuyển sang Đăng nhập.';
  return message;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
