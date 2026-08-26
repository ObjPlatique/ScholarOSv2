import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configure these values in Vercel/Supabase before testing real authentication.
const SUPABASE_URL = window.SCHOLAROS_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.SCHOLAROS_SUPABASE_ANON_KEY || '';
const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const views = ['login','signup','verify','forgot'];
const $ = id => document.getElementById(id);
const notice = $('authConfigNotice');
const message = $('authMessage');
let lastSignupEmail = '';

if (!configured) notice.hidden = false;

function showView(name){
  views.forEach(view => { $(view + 'View').hidden = view !== name; });
  clearMessage();
}
function setMessage(text,type='success'){ message.textContent=text; message.className='auth-message '+type; message.hidden=false; }
function clearMessage(){ message.hidden=true; message.textContent=''; }
function values(form){ return Object.fromEntries(new FormData(form).entries()); }
function ensureClient(){ if(!supabase){ setMessage('Preview chưa có cấu hình Supabase. UI đã sẵn sàng, nhưng cần thêm SUPABASE_URL và SUPABASE_ANON_KEY trước khi đăng nhập thật.','error'); return false; } return true; }

function validateEmail(email){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelectorAll('[data-toggle-password]').forEach(button => button.addEventListener('click', () => {
  const input=button.parentElement.querySelector('input'); input.type=input.type==='password'?'text':'password'; button.textContent=input.type==='password'?'Hiện':'Ẩn';
}));

$('loginForm').addEventListener('submit', async event => {
  event.preventDefault(); const {email,password}=values(event.currentTarget);
  if(!validateEmail(email)) return setMessage('Vui lòng nhập email hợp lệ.','error');
  if(!ensureClient()) return;
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error) return setMessage(error.message,'error');
  if(!data.user?.email_confirmed_at){ await supabase.auth.signOut(); lastSignupEmail=email; $('verifyEmail').textContent=email; return showView('verify'); }
  window.location.href='./index.html';
});

$('signupForm').addEventListener('submit', async event => {
  event.preventDefault(); const {email,password,confirmPassword}=values(event.currentTarget);
  if(!validateEmail(email)) return setMessage('Vui lòng nhập email hợp lệ.','error');
  if(password.length<6) return setMessage('Mật khẩu cần ít nhất 6 ký tự.','error');
  if(password!==confirmPassword) return setMessage('Mật khẩu xác nhận không khớp.','error');
  if(!ensureClient()) return;
  const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:new URL('./auth.html',window.location.href).href}});
  if(error) return setMessage(error.message,'error');
  lastSignupEmail=email; $('verifyEmail').textContent=email; showView('verify');
});

$('resendButton').addEventListener('click', async () => {
  if(!ensureClient() || !lastSignupEmail) return;
  const {error}=await supabase.auth.resend({type:'signup',email:lastSignupEmail,options:{emailRedirectTo:new URL('./auth.html',window.location.href).href}});
  setMessage(error ? error.message : 'Đã gửi lại email xác minh. Hãy kiểm tra hộp thư.','success');
});

$('forgotForm').addEventListener('submit', async event => {
  event.preventDefault(); const {email}=values(event.currentTarget);
  if(!validateEmail(email)) return setMessage('Vui lòng nhập email hợp lệ.','error');
  if(!ensureClient()) return;
  const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:new URL('./auth.html',window.location.href).href});
  if(error) return setMessage(error.message,'error');
  setMessage('Nếu tài khoản tồn tại, email đặt lại mật khẩu đã được gửi.','success');
});

if(configured){
  supabase.auth.getSession().then(({data})=>{ if(data.session) window.location.href='./index.html'; });
  supabase.auth.onAuthStateChange((_event,session)=>{ if(session) window.location.href='./index.html'; });
}

showView('login');