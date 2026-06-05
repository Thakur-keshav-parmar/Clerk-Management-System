// ============================================================
// SETTINGS PAGE
// ============================================================
var INST_SETTINGS = {};

async function initSettings() {
  if (!isAdmin()) { navigate('dashboard'); return; }
  try {
    INST_SETTINGS = await api('/settings');
    document.getElementById('sName').value    = INST_SETTINGS.name    || '';
    document.getElementById('sAddress').value = INST_SETTINGS.address || '';
    document.getElementById('sGst').value     = INST_SETTINGS.gst     || '';
    document.getElementById('sPhone').value   = INST_SETTINGS.phone   || '';
    document.getElementById('sEmail').value   = INST_SETTINGS.email   || '';
    if (INST_SETTINGS.logo) {
      document.getElementById('logoPreview').innerHTML = '<img src="' + INST_SETTINGS.logo + '" style="max-height:80px;border-radius:8px;">';
    }
  } catch(e) { console.error(e); }
  loadUsers();
}

function handleLogoUpload(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var b64 = ev.target.result;
    document.getElementById('sLogo').value = b64;
    document.getElementById('logoPreview').innerHTML = '<img src="' + b64 + '" style="max-height:80px;border-radius:8px;">';
  };
  reader.readAsDataURL(file);
}

async function saveSettings() {
  var logo = document.getElementById('sLogo').value || INST_SETTINGS.logo || null;
  var data = {
    name:    document.getElementById('sName').value.trim(),
    address: document.getElementById('sAddress').value.trim(),
    gst:     document.getElementById('sGst').value.trim(),
    phone:   document.getElementById('sPhone').value.trim(),
    email:   document.getElementById('sEmail').value.trim(),
    logo:    logo,
  };
  if (!data.name) { alert('Institute name is required'); return; }
  try {
    INST_SETTINGS = await api('/settings', 'PUT', data);
    showToast('Settings saved successfully!', 'success');
  } catch(e) { alert('Error: ' + e.message); }
}

async function getInstSettings() {
  if (INST_SETTINGS && INST_SETTINGS.name) return INST_SETTINGS;
  try { INST_SETTINGS = await api('/settings'); } catch(e) {}
  return INST_SETTINGS || {};
}

// ============================================================
// USER / IAM MANAGEMENT
// ============================================================
var _usersList = [];

var ROLE_BADGE = {
  admin:   '<span style="background:#fce7f3;color:#be185d;font-size:.7rem;font-weight:800;padding:2px 9px;border-radius:20px;">Admin</span>',
  clerk:   '<span style="background:#dbeafe;color:#1d4ed8;font-size:.7rem;font-weight:800;padding:2px 9px;border-radius:20px;">Clerk</span>',
  teacher: '<span style="background:#dcfce7;color:#15803d;font-size:.7rem;font-weight:800;padding:2px 9px;border-radius:20px;">Teacher</span>',
};

async function loadUsers() {
  var el = document.getElementById('userListContainer');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted);">Loading…</div>';
  try {
    _usersList = await api('/users');
    renderUserList();
  } catch(e) {
    el.innerHTML = '<div style="color:var(--danger);padding:16px;">Failed to load users: ' + e.message + '</div>';
  }
}

function renderUserList() {
  var el = document.getElementById('userListContainer');
  if (!el) return;
  if (!_usersList.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">No users found.</div>';
    return;
  }
  var meUsername = currentUser ? currentUser.username : '';
  el.innerHTML = '<table style="width:100%;border-collapse:collapse;">' +
    '<thead><tr style="font-size:.78rem;color:var(--muted);border-bottom:2px solid var(--border);">' +
      '<th style="text-align:left;padding:8px 10px;">Name</th>' +
      '<th style="text-align:left;padding:8px 10px;">Username</th>' +
      '<th style="text-align:left;padding:8px 10px;">WhatsApp</th>' +
      '<th style="text-align:left;padding:8px 10px;">Role</th>' +
      '<th style="text-align:right;padding:8px 10px;">Actions</th>' +
    '</tr></thead>' +
    '<tbody>' +
    _usersList.map(function(u) {
      var isMe  = u.username === meUsername;
      var badge = ROLE_BADGE[u.role] || u.role;
      var phoneCell = u.phone
        ? '<span style="font-family:monospace;font-size:.82rem;">' + u.phone + '</span>'
        : '<span style="color:var(--muted);font-size:.78rem;">—</span>';
      return '<tr style="border-bottom:1px solid var(--border);">' +
        '<td style="padding:10px 10px;font-weight:600;">' + u.name + (isMe ? ' <span style="font-size:.7rem;color:var(--muted);">(you)</span>' : '') + '</td>' +
        '<td style="padding:10px 10px;font-family:monospace;font-size:.82rem;color:var(--muted);">@' + u.username + '</td>' +
        '<td style="padding:10px 10px;">' + phoneCell + '</td>' +
        '<td style="padding:10px 10px;">' + badge + '</td>' +
        '<td style="padding:10px 10px;text-align:right;white-space:nowrap;">' +
          '<button class="btn btn-ghost btn-sm" style="margin-right:4px;" onclick="openEditUserModal(\'' + u.username + '\',\'' + u.name.replace(/'/g,"\\'") + '\',\'' + u.role + '\',\'' + (u.phone||'').replace(/'/g,"\\'") + '\')">✏️ Edit</button>' +
          (!isMe ? '<button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;border:none;" onclick="deleteUser(\'' + u.username + '\',\'' + u.name.replace(/'/g,"\\'") + '\')">🗑 Remove</button>' : '') +
        '</td>' +
      '</tr>';
    }).join('') +
    '</tbody></table>';
}

// ─── Add User Modal ───────────────────────────────────────────────────────────
function openAddUserModal() {
  document.getElementById('auName').value     = '';
  document.getElementById('auUsername').value = '';
  document.getElementById('auPassword').value = '';
  document.getElementById('auRole').value     = 'clerk';
  document.getElementById('auPhone').value    = '';
  document.getElementById('addUserModal').classList.add('open');
}
function closeAddUserModal() {
  document.getElementById('addUserModal').classList.remove('open');
}

async function submitAddUser() {
  var name     = document.getElementById('auName').value.trim();
  var username = document.getElementById('auUsername').value.trim();
  var password = document.getElementById('auPassword').value;
  var role     = document.getElementById('auRole').value;
  var phone    = document.getElementById('auPhone').value.trim();

  if (!name)     { alert('Name is required'); return; }
  if (!username) { alert('Username is required'); return; }
  if (password.length < 4) { alert('Password must be at least 4 characters'); return; }

  try {
    var newUser = await api('/users', 'POST', { name, username, password, role, phone });
    _usersList.push(newUser);
    renderUserList();
    closeAddUserModal();
    showToast('User @' + username + ' created successfully!', 'success');
  } catch(e) {
    alert('Error: ' + e.message);
  }
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
function openEditUserModal(username, name, role, phone) {
  document.getElementById('euUsername').value = username;
  document.getElementById('euName').value     = name;
  document.getElementById('euRole').value     = role;
  document.getElementById('euPhone').value    = phone || '';
  document.getElementById('euPassword').value = '';
  document.getElementById('editUserTitle').textContent = 'Edit User — @' + username;
  document.getElementById('editUserModal').classList.add('open');
}
function closeEditUserModal() {
  document.getElementById('editUserModal').classList.remove('open');
}

async function submitEditUser() {
  var username = document.getElementById('euUsername').value;
  var name     = document.getElementById('euName').value.trim();
  var role     = document.getElementById('euRole').value;
  var phone    = document.getElementById('euPhone').value.trim();
  var password = document.getElementById('euPassword').value;

  if (!name) { alert('Name is required'); return; }

  var payload = { name, role, phone };
  if (password.length >= 4) payload.password = password;
  else if (password.length > 0) { alert('Password must be at least 4 characters'); return; }

  try {
    var updated = await api('/users/' + username, 'PUT', payload);
    var idx = _usersList.findIndex(function(u){ return u.username === username; });
    if (idx !== -1) _usersList[idx] = updated;
    renderUserList();
    closeEditUserModal();
    showToast('User @' + username + ' updated!', 'success');
  } catch(e) {
    alert('Error: ' + e.message);
  }
}

// ─── Delete User ──────────────────────────────────────────────────────────────
async function deleteUser(username, name) {
  if (!confirm('Remove user "' + name + '" (@' + username + ')?\n\nThis cannot be undone.')) return;
  try {
    await api('/users/' + username, 'DELETE');
    _usersList = _usersList.filter(function(u){ return u.username !== username; });
    renderUserList();
    showToast('User @' + username + ' removed.', 'success');
  } catch(e) {
    alert('Error: ' + e.message);
  }
}
