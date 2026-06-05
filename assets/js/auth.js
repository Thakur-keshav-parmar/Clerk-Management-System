// ============================================================
// AUTH — IT Coaching Institute
// Roles: admin (full access), teacher (read-only: name/contact/course)
// ============================================================

let currentUser  = null;
let _resetToken  = null;   // holds JWT after OTP verified

async function doLogin() {
  const u   = document.getElementById('loginEmail').value.trim();
  const p   = document.getElementById('loginPassword').value;
  const err = document.getElementById('loginError');

  if (!u || !p) {
    err.textContent = 'Please enter both username and password.';
    err.classList.remove('hidden');
    return;
  }
  err.classList.add('hidden');

  try {
    const data = await api('/auth/login', 'POST', { username: u, password: p });
    currentUser = data;   // { token, name, role, username }
    try { sessionStorage.setItem('ccs_user', JSON.stringify(currentUser)); } catch (e) {}
    showApp();
  } catch (e) {
    err.textContent = e.message || 'Invalid username or password.';
    err.classList.remove('hidden');
  }
}

async function logout() {
  try { await api('/auth/logout', 'POST'); } catch (e) {}
  currentUser = null;
  try { sessionStorage.removeItem('ccs_user'); } catch (e) {}
  showLogin();
}

function checkAuth() {
  try {
    const s = sessionStorage.getItem('ccs_user');
    if (s) { currentUser = JSON.parse(s); showApp(); }
    else showLogin();
  } catch (e) { showLogin(); }
}

function isAdmin()   { return currentUser && currentUser.role === 'admin'; }
function isTeacher() { return currentUser && currentUser.role === 'teacher'; }
function isClerk()   { return currentUser && currentUser.role === 'clerk'; }
function canManage() { return isAdmin() || isClerk(); }

// ============================================================
// FORGOT PASSWORD FLOW
// ============================================================

function showLoginStep() {
  document.getElementById('loginStep').style.display  = '';
  document.getElementById('forgotStep').style.display = 'none';
  document.getElementById('otpStep').style.display    = 'none';
  document.getElementById('resetStep').style.display  = 'none';
}

function showForgotStep() {
  document.getElementById('loginStep').style.display  = 'none';
  document.getElementById('forgotStep').style.display = '';
  document.getElementById('otpStep').style.display    = 'none';
  document.getElementById('resetStep').style.display  = 'none';
  document.getElementById('forgotError').classList.add('hidden');
  var fu = document.getElementById('forgotUsername');
  if (fu) fu.value = '';
}

async function doForgot() {
  const username = document.getElementById('forgotUsername').value.trim();
  const err      = document.getElementById('forgotError');
  if (!username) { err.textContent = 'Please enter your username.'; err.classList.remove('hidden'); return; }
  err.classList.add('hidden');

  const btn = event.target;
  btn.disabled = true; btn.textContent = 'Sending…';

  try {
    const res = await api('/auth/forgot', 'POST', { username });
    document.getElementById('otpHint').textContent = res.message || 'OTP sent to your WhatsApp';
    document.getElementById('otpInput').value = '';
    document.getElementById('otpError').classList.add('hidden');
    document.getElementById('forgotStep').style.display = 'none';
    document.getElementById('otpStep').style.display    = '';
  } catch (e) {
    err.textContent = e.message || 'Failed to send OTP.';
    err.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.textContent = 'Send OTP via WhatsApp';
  }
}

async function doVerifyOtp() {
  const username = document.getElementById('forgotUsername').value.trim();
  const otp      = document.getElementById('otpInput').value.trim();
  const err      = document.getElementById('otpError');
  if (!otp || otp.length !== 6) { err.textContent = 'Enter the 6-digit OTP.'; err.classList.remove('hidden'); return; }
  err.classList.add('hidden');

  const btn = event.target;
  btn.disabled = true; btn.textContent = 'Verifying…';

  try {
    const res = await api('/auth/verify-otp', 'POST', { username, otp });
    _resetToken = res.reset_token;
    document.getElementById('newPassword').value     = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('resetError').classList.add('hidden');
    document.getElementById('otpStep').style.display   = 'none';
    document.getElementById('resetStep').style.display = '';
  } catch (e) {
    err.textContent = e.message || 'Invalid OTP.';
    err.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.textContent = 'Verify OTP';
  }
}

async function doResetPassword() {
  const newPwd  = document.getElementById('newPassword').value;
  const confPwd = document.getElementById('confirmPassword').value;
  const err     = document.getElementById('resetError');

  if (newPwd.length < 4) { err.textContent = 'Password must be at least 4 characters.'; err.classList.remove('hidden'); return; }
  if (newPwd !== confPwd) { err.textContent = 'Passwords do not match.'; err.classList.remove('hidden'); return; }
  err.classList.add('hidden');

  const btn = event.target;
  btn.disabled = true; btn.textContent = 'Saving…';

  try {
    await api('/auth/reset-password', 'POST', { reset_token: _resetToken, new_password: newPwd });
    _resetToken = null;
    showLoginStep();
    document.getElementById('loginError').textContent = 'Password reset! Please log in.';
    document.getElementById('loginError').style.color = 'var(--success, #16a34a)';
    document.getElementById('loginError').classList.remove('hidden');
  } catch (e) {
    err.textContent = e.message || 'Failed to reset password.';
    err.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.textContent = 'Set New Password';
  }
}
