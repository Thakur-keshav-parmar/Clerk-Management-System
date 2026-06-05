// ============================================================
// DUES DETAIL MODAL (from dashboard)
// ============================================================
var _duesModalData = [];

async function openDuesModal() {
  var modal = document.getElementById('duesModal');
  if (!modal) return;
  modal.classList.add('open');
  var tb = document.getElementById('duesModalBody');
  if (tb) tb.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted);">Loading…</td></tr>';
  document.getElementById('duesModalSubtitle').textContent = 'Loading…';
  try {
    _duesModalData = await api('/dues');
  } catch(e) {
    if (tb) tb.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--danger);">Failed to load. Try again.</td></tr>';
    return;
  }
  document.getElementById('duesModalSearch').value  = '';
  document.getElementById('duesModalStatus').value  = '';
  renderDuesModal();
}

function closeDuesModal() {
  document.getElementById('duesModal').classList.remove('open');
}

function renderDuesModal() {
  var q      = (document.getElementById('duesModalSearch').value || '').toLowerCase().trim();
  var status = document.getElementById('duesModalStatus').value;
  var list   = _duesModalData.filter(function(s) {
    var mq = !q || s.name.toLowerCase().includes(q) || (s.id||'').toLowerCase().includes(q);
    var ms = !status || s.status === status;
    return mq && ms;
  });
  document.getElementById('duesModalSubtitle').textContent = list.length + ' student' + (list.length !== 1 ? 's' : '') + ' with outstanding dues';
  var STATUS_BG2  = { studying:'#dcfce7', break:'#fef3c7', left:'#fee2e2', passout:'#e0f2fe' };
  var STATUS_CLR2 = { studying:'#16a34a', break:'#d97706', left:'#dc2626', passout:'#0284c7' };
  var STATUS_LBL2 = { studying:'Studying', break:'On Break', left:'Left', passout:'Passout' };
  var tb = document.getElementById('duesModalBody');
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted);">No students with outstanding dues.</td></tr>';
    return;
  }
  tb.innerHTML = list.map(function(s) {
    var sc = STATUS_CLR2[s.status] || 'var(--muted)';
    var sb = STATUS_BG2[s.status]  || '#f1f5f9';
    var badge = '<span style="background:' + sb + ';color:' + sc + ';font-size:.7rem;font-weight:700;padding:2px 9px;border-radius:20px;">' + (STATUS_LBL2[s.status] || s.status) + '</span>';
    var feeCell = s.feeType === 'yearly'
      ? '₹' + (s.totalFees||0).toLocaleString() + '<br><span style="font-size:.72rem;color:var(--muted);">fixed total</span>'
      : '₹' + (s.perPeriod||0).toLocaleString() + '<br><span style="font-size:.72rem;color:var(--muted);">per month</span>';
    return '<tr>' +
      '<td style="font-family:monospace;font-size:.78rem;color:var(--muted);white-space:nowrap;">' + s.id + '</td>' +
      '<td style="font-weight:600;">' + s.name + '</td>' +
      '<td><span class="badge badge-primary">' + s.course + '</span></td>' +
      '<td style="font-size:.8rem;">' + feeCell + '</td>' +
      '<td style="color:var(--success);font-weight:600;">₹' + (s.paid||0).toLocaleString() + '</td>' +
      '<td style="color:var(--danger);font-weight:700;">₹' + (s.due||0).toLocaleString() + '</td>' +
      '<td>' + badge + '</td>' +
    '</tr>';
  }).join('');
}

// ============================================================
// ALL STUDENTS MODAL (from dashboard)
// ============================================================
var STATUS_COLORS = { studying:'var(--success)', break:'var(--warning)', left:'var(--danger)', passout:'var(--info)' };
var STATUS_BG     = { studying:'#dcfce7', break:'#fef3c7', left:'#fee2e2', passout:'#e0f2fe' };

async function openAllStudentsModal() {
  var modal = document.getElementById('allStudentsModal');
  if (!modal) { alert('Modal not found'); return; }
  modal.classList.add('open');

  // Show loading state
  var tb = document.getElementById('allStudentsBody');
  if (tb) tb.innerHTML = '<tr><td colspan="14" style="text-align:center;padding:40px;color:var(--muted);">Loading…</td></tr>';
  document.getElementById('allStuSubtitle').textContent = 'Loading…';

  try {
    var results = await Promise.all([api('/students'), api('/courses')]);
    STUDENTS = results[0] || [];
    COURSES  = results[1] || [];
  } catch(e) {
    console.error('openAllStudentsModal error:', e);
    if (tb) tb.innerHTML = '<tr><td colspan="14" style="text-align:center;padding:40px;color:var(--danger);">Failed to load students. Please try again.</td></tr>';
    return;
  }

  // Populate course filter
  var cf = document.getElementById('allStuCourse');
  cf.innerHTML = '<option value="">All Courses</option>';
  COURSES.forEach(function(c) { cf.innerHTML += '<option value="' + c.code + '">' + c.code + ' \u2013 ' + c.name + '</option>'; });
  document.getElementById('allStuSearch').value = '';
  document.getElementById('allStuStatus').value = '';
  cf.value = '';
  renderAllStudents();
}

function closeAllStudentsModal() {
  document.getElementById('allStudentsModal').classList.remove('open');
}

function renderAllStudents() {
  var q       = (document.getElementById('allStuSearch').value || '').toLowerCase().trim();
  var status  = document.getElementById('allStuStatus').value;
  var course  = document.getElementById('allStuCourse').value;
  var list    = (STUDENTS || []).filter(function(s) {
    var mq = !q || s.name.toLowerCase().includes(q) || (s.id||'').toLowerCase().includes(q) || (s.contact||'').includes(q) || (s.aadhaar||'').includes(q) || (s.fatherMobile||'').includes(q);
    var ms = !status || s.status === status;
    var mc = !course || s.course === course;
    return mq && ms && mc;
  });
  document.getElementById('allStuSubtitle').textContent = list.length + ' student' + (list.length !== 1 ? 's' : '') + ' shown';
  var tb = document.getElementById('allStudentsBody');
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="14" style="text-align:center;padding:40px;color:var(--muted);">No students found.</td></tr>';
    return;
  }
  tb.innerHTML = list.map(function(s) {
    var sc = STATUS_COLORS[s.status] || 'var(--muted)';
    var sb = STATUS_BG[s.status]     || '#f1f5f9';
    var statusBadge = '<span style="background:' + sb + ';color:' + sc + ';font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:20px;">' + (s.status || 'studying') + '</span>';
    return '<tr>' +
      '<td style="font-family:monospace;font-size:.76rem;color:var(--muted);white-space:nowrap;">' + (s.id||'–') + '</td>' +
      '<td style="font-weight:600;white-space:nowrap;">' + (s.name||'–') + '</td>' +
      '<td><span class="badge badge-primary">' + (s.course||'–') + '</span></td>' +
      '<td style="font-size:.78rem;white-space:nowrap;">' + (s.dob ? fmtDate(s.dob) : '–') + '</td>' +
      '<td style="font-size:.78rem;">' + (s.contact||'–') + '</td>' +
      '<td style="font-size:.78rem;white-space:nowrap;">' + (s.fatherName||'–') + '</td>' +
      '<td style="font-size:.78rem;">' + (s.fatherMobile||'–') + '</td>' +
      '<td style="font-family:monospace;font-size:.75rem;">' + (s.aadhaar||'–') + '</td>' +
      '<td style="font-size:.78rem;white-space:nowrap;">' + (s.admissionDate ? fmtDate(s.admissionDate) : '–') + '</td>' +
      '<td><span class="badge badge-info">' + (s.feeType === 'yearly' ? 'Yearly' : 'Monthly') + '</span></td>' +
      '<td style="font-weight:600;">' + (s.feeType === 'yearly' ? '₹' + (s.totalFees||0).toLocaleString() : '–') + '</td>' +
      '<td style="color:var(--success);font-weight:600;">₹' + (s.paid||0).toLocaleString() + '</td>' +
      '<td style="color:' + (s.due > 0 ? 'var(--danger)' : 'var(--muted)') + ';font-weight:600;">₹' + (s.due||0).toLocaleString() + '</td>' +
      '<td>' + statusBadge + '</td>' +
    '</tr>';
  }).join('');
}

// ============================================================
// DASHBOARD — redesigned with defaulters and reminders
// ============================================================
var DEFAULTERS = [];

async function initDashboard() {
  var h = new Date().getHours();
  var greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  var gEl = document.getElementById('dashGreeting');
  if (gEl && currentUser) gEl.textContent = greet + ', ' + currentUser.name;

  // Fetch all three independently so one failure doesn't block others
  var dash = {};
  try { dash = await api('/dashboard'); } catch(e) { console.error('Dashboard API:', e); }

  try { DEFAULTERS = await api('/defaulters'); } catch(e) { DEFAULTERS = []; console.error('Defaulters API:', e); }
  if (!Array.isArray(DEFAULTERS)) DEFAULTERS = [];

  try { REMINDERS = await api('/reminders'); } catch(e) { REMINDERS = []; console.error('Reminders API:', e); }
  if (!Array.isArray(REMINDERS)) REMINDERS = [];

  // Stat: Total Students
  var dsTot = document.getElementById('dashTotalStudents');
  if (dsTot) dsTot.textContent = dash.totalStudents || 0;

  // Stat: Total Dues (from defaulters)
  var totalDue = DEFAULTERS.reduce(function(s,d){ return s + (d.due||0); }, 0);
  var dsDue = document.getElementById('dashTotalDue');
  if (dsDue) dsDue.textContent = '₹' + totalDue.toLocaleString('en-IN');

  // Stat: Reminders Today
  var todayStr = new Date().toISOString().split('T')[0];
  var todayRem = REMINDERS.filter(function(r){ return r.reminderDate && r.reminderDate <= todayStr; });
  var dsRemCount = document.getElementById('dashReminderCount');
  if (dsRemCount) dsRemCount.textContent = todayRem.length > 0 ? todayRem.length : '–';

  // Stat: This Month
  var dsMonth = document.getElementById('dashThisMonth');
  if (dsMonth) dsMonth.textContent = '₹' + ((dash.thisMonth || 0)).toLocaleString('en-IN');

  // Panels
  try { renderRemindersPanel(REMINDERS); } catch(e) { console.error('renderReminders:', e); }
  try { renderDefaulters(); } catch(e) {
    console.error('renderDefaulters:', e);
    var el = document.getElementById('defaultersContainer');
    if (el) el.innerHTML = '<div style="color:var(--danger);padding:20px;">Error loading defaulters: ' + e.message + '</div>';
  }

  // Course filter for defaulters
  var cf = document.getElementById('defaulterCourseFilter');
  if (cf && DEFAULTERS.length) {
    var courses = [...new Set(DEFAULTERS.map(function(d){ return d.course; }))].sort();
    cf.innerHTML = '<option value="">All Courses</option>' + courses.map(function(c){ return '<option value="' + c + '">' + c + '</option>'; }).join('');
  }
}

function renderDefaulters() {
  var courseFilter = (document.getElementById('defaulterCourseFilter') || {value:''}).value;
  var list = DEFAULTERS.filter(function(d){ return !courseFilter || d.course === courseFilter; });
  var meta = document.getElementById('defaultersMeta');
  if (meta) meta.textContent = list.length + ' student' + (list.length !== 1 ? 's' : '');

  var el = document.getElementById('defaultersContainer');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<div class="card" style="padding:30px;text-align:center;color:var(--success);font-weight:600;">✓ No defaulters right now</div>';
    return;
  }

  el.innerHTML = list.map(function(d) {
    var isEsc = d.isEscalated;
    var monthLabel = d.monthsOverdue > 0 ? d.monthsOverdue + ' month' + (d.monthsOverdue !== 1 ? 's' : '') + ' overdue' : 'Due this month';
    var rowBg = isEsc ? 'background:#fef2f2;' : d.monthsOverdue >= 2 ? 'background:#fff7ed;' : '';
    var badge = isEsc
      ? '<span style="background:#fca5a5;color:#991b1b;font-size:.7rem;font-weight:800;padding:2px 9px;border-radius:20px;">🔴 ESCALATED</span>'
      : d.monthsOverdue >= 2
        ? '<span style="background:#fed7aa;color:#9a3412;font-size:.7rem;font-weight:700;padding:2px 9px;border-radius:20px;">⚠ ' + monthLabel + '</span>'
        : '<span style="background:#fef3c7;color:#92400e;font-size:.7rem;font-weight:600;padding:2px 9px;border-radius:20px;">' + monthLabel + '</span>';

    var showAdmin = canManage();
    return '<div style="' + rowBg + 'border:1.5px solid var(--border);border-radius:12px;padding:14px 18px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">' +
      '<div style="flex:1;min-width:200px;">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
          '<span style="font-weight:700;font-size:.95rem;">' + d.name + '</span>' +
          '<span class="badge badge-primary">' + d.course + '</span>' +
          badge +
        '</div>' +
        '<div style="font-size:.8rem;color:var(--muted);margin-top:4px;">' +
          (d.contact ? '📞 ' + d.contact + (showAdmin ? ' · ' : '') : '') +
          (showAdmin ? '₹' + (d.perPeriod||0).toLocaleString('en-IN') + '/mo · Paid ₹' + (d.paid||0).toLocaleString('en-IN') : '') +
          (isEsc && d.snoozeNote ? ' · <em>"' + d.snoozeNote + '"</em>' : '') +
        '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
        '<div style="font-size:1.2rem;font-weight:800;color:var(--danger);">₹' + (d.due||0).toLocaleString('en-IN') + '</div>' +
        (showAdmin ? '<button class="btn btn-primary btn-sm" onclick="openFeeModal(\'' + d.id + '\')">💳 Collect</button>' : '') +
        (showAdmin ? '<button class="btn btn-ghost btn-sm" onclick="openSnoozeModal(\'' + d.id + '\',\'' + d.name.replace(/'/g,"\\'") + '\')">📅 Promise</button>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}
