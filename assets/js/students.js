// ============================================================
// STUDENTS
// ============================================================
let activeCourseCode = null;
let stuCategoryFilter = ''; // '' = course grid, 'studying'|'break'|'left'|'passout' = flat list

var CAT_META = {
  '':        { label:'All',      bg:'var(--primary)',  color:'#fff',          icon:'' },
  studying:  { label:'Studying', bg:'#dcfce7',         color:'#16a34a',       icon:'📚 ' },
  break:     { label:'Break',    bg:'#fef3c7',         color:'#d97706',       icon:'⏸ ' },
  left:      { label:'Left',     bg:'#fee2e2',         color:'#dc2626',       icon:'🚪 ' },
  passout:   { label:'Passout',  bg:'#e0f2fe',         color:'#0284c7',       icon:'🎓 ' },
};

function updateCategoryNav() {
  document.querySelectorAll('.stu-cat-btn').forEach(function(b) {
    var cat = b.dataset.cat;
    var m   = CAT_META[cat] || CAT_META[''];
    var active = cat === stuCategoryFilter;
    b.style.background = active ? m.bg  : '#fff';
    b.style.color      = active ? (cat === '' ? '#fff' : m.color) : 'var(--text)';
    b.style.borderColor= active ? (cat === '' ? 'var(--primary)' : m.color) : 'var(--border)';
    b.style.fontWeight = active ? '700' : '600';
    // update count
    var cnt = cat === '' ? STUDENTS.length : STUDENTS.filter(function(s){ return s.status === cat; }).length;
    b.textContent = (m.icon) + m.label + ' (' + cnt + ')';
  });
}

function setStudentCategory(cat) {
  stuCategoryFilter = cat;
  activeCourseCode  = null;
  updateCategoryNav();
  document.getElementById('backBtn').style.display = 'none';
  document.getElementById('view-globalSearch').style.display = 'none';
  document.getElementById('view-studentTable').style.display = 'none';
  var dlBtn = document.getElementById('catDownloadBtn');
  if (dlBtn) dlBtn.style.display = cat ? '' : 'none';
  if (cat === '') {
    document.getElementById('view-statusList').style.display = 'none';
    document.getElementById('view-courseGrid').style.display = 'block';
    document.getElementById('stuPageTitle').textContent    = 'Students';
    document.getElementById('stuPageSubtitle').textContent = 'Select a course to view its students';
    renderCourseGrid();
    renderPassoutSection();
  } else {
    document.getElementById('view-courseGrid').style.display  = 'none';
    document.getElementById('view-statusList').style.display  = 'block';
    var m   = CAT_META[cat];
    var cnt = STUDENTS.filter(function(s){ return s.status === cat; }).length;
    document.getElementById('stuPageTitle').textContent    = m.icon + m.label + ' Students';
    document.getElementById('stuPageSubtitle').textContent = cnt + ' student' + (cnt !== 1 ? 's' : '');
    renderStatusList();
  }
}

function renderStatusList() {
  var cat  = stuCategoryFilter;
  var q    = (document.getElementById('searchStudent').value || '').trim().toLowerCase();
  var list = STUDENTS.filter(function(s) {
    var ms = s.status === cat;
    var mq = !q || s.name.toLowerCase().includes(q) || (s.id||'').toLowerCase().includes(q) || (s.contact||'').includes(q);
    return ms && mq;
  });
  document.getElementById('stuPageSubtitle').textContent = list.length + ' student' + (list.length !== 1 ? 's' : '');
  document.getElementById('statusListMeta').textContent  = list.length + ' student' + (list.length !== 1 ? 's' : '') + ' in this category';
  var m   = CAT_META[cat] || CAT_META[''];
  var tb  = document.getElementById('statusListBody');
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--muted);">No ' + m.label + ' students found.</td></tr>';
    return;
  }
  tb.innerHTML = list.map(function(s) {
    var sm  = STATUS_META[s.status] || STATUS_META.studying;
    var cm  = CAT_META[s.status]    || CAT_META.studying;
    var badge = '<span style="background:' + cm.bg + ';color:' + cm.color + ';font-size:.7rem;font-weight:700;padding:2px 9px;border-radius:20px;">' + sm.label + '</span>';
    var perPeriod = s.totalFees && s.installments && s.installments.length ? Math.round(s.totalFees / s.installments.length) : 0;
    var actions = '';
    if (canManage()) {
      if (s.status === 'studying' && s.due > 0) actions += '<button class="btn btn-primary btn-sm" onclick="openFeeModal(\'' + s.id + '\')">💳 Pay</button> ';
      if (s.status === 'studying') actions += '<button class="btn btn-warning btn-sm" onclick="openEditStudentModal(\'' + s.id + '\')">✏️</button> ';
      var statusOpts2 = ['studying','break','left','passout'].filter(function(v){ return v !== s.status; })
        .map(function(v){ return '<option value="' + v + '">' + STATUS_META[v].label + '</option>'; }).join('');
      actions += '<select class="btn btn-ghost btn-sm" style="padding:4px 6px;font-size:.74rem;cursor:pointer;" onchange="changeStudentStatus(\'' + s.id + '\',this.value);this.value=\'\'">' +
        '<option value="">Change Status</option>' + statusOpts2 + '</select> ';
      if (isAdmin()) actions += '<button class="btn btn-danger btn-sm" onclick="openConfirmDelete(\'' + s.id + '\')">🗑️</button>';
    }
    // Date column: show relevant date per category
    var dateCell = '';
    if (cat === 'studying') {
      dateCell = '<span style="font-size:.75rem;color:var(--muted);">Joined<br></span>' + (s.admissionDate ? fmtDate(s.admissionDate) : '–');
    } else if (cat === 'left') {
      dateCell = '<span style="font-size:.75rem;color:var(--muted);">Joined: ' + (s.admissionDate ? fmtDate(s.admissionDate) : '–') + '</span><br>'
               + '<span style="color:var(--danger);font-size:.75rem;">Left: ' + (s.leftDate ? fmtDate(s.leftDate) : '–') + '</span>';
    } else if (cat === 'break') {
      dateCell = '<span style="font-size:.75rem;color:var(--muted);">Joined: ' + (s.admissionDate ? fmtDate(s.admissionDate) : '–') + '</span><br>'
               + '<span style="color:var(--warning);font-size:.75rem;">Break: ' + (s.breakFromDate ? fmtDate(s.breakFromDate) : '–') + '</span>'
               + (s.breakRemarks ? '<br><em style="font-size:.72rem;color:var(--muted);">"' + s.breakRemarks + '"</em>' : '');
    } else if (cat === 'passout') {
      dateCell = '<span style="font-size:.75rem;color:var(--muted);">Joined: ' + (s.admissionDate ? fmtDate(s.admissionDate) : '–') + '</span><br>'
               + '<span style="color:var(--success);font-size:.75rem;">Passout: ' + (s.passoutDate ? fmtDate(s.passoutDate) : '–') + '</span>';
    }
    return '<tr>' +
      '<td style="font-family:monospace;font-size:.78rem;color:var(--muted);white-space:nowrap;">' + s.id + '</td>' +
      '<td style="font-weight:600;">' + s.name + '</td>' +
      '<td><span class="badge badge-primary">' + s.course + '</span></td>' +
      '<td style="font-size:.8rem;">' + (s.feeType === 'yearly'
          ? '<span class="badge badge-info">Yearly</span><br><span style="color:var(--muted);font-size:.75rem;">Total ₹' + (s.totalFees||0).toLocaleString() + '</span>'
          : '<span class="badge badge-primary">Monthly</span><br><span style="color:var(--muted);font-size:.75rem;">₹' + (s.perPeriod||0).toLocaleString() + '/mo</span>') + '</td>' +
      '<td style="color:var(--success);font-weight:600;">₹' + (s.paid||0).toLocaleString() + '</td>' +
      '<td style="color:' + (s.due > 0 ? 'var(--danger)' : 'var(--muted)') + ';font-weight:700;">₹' + (s.due||0).toLocaleString() + '</td>' +
      '<td style="font-size:.78rem;line-height:1.5;">' + dateCell + '</td>' +
      '<td>' + badge + '</td>' +
      '<td style="display:flex;gap:4px;flex-wrap:wrap;">' + actions + '</td>' +
    '</tr>';
  }).join('');
}

async function initStudents() {
  activeCourseCode  = null;
  stuCategoryFilter = '';
  document.getElementById('searchStudent').value = '';
  document.getElementById('searchClearBtn').style.display  = 'none';
  document.getElementById('backBtn').style.display         = 'none';
  document.getElementById('stuPageTitle').textContent      = 'Students';
  document.getElementById('stuPageSubtitle').textContent   = 'Select a course to view its students';
  document.getElementById('view-globalSearch').style.display  = 'none';
  document.getElementById('view-courseGrid').style.display    = 'block';
  document.getElementById('view-studentTable').style.display  = 'none';
  document.getElementById('view-statusList').style.display    = 'none';
  const addBtn = document.getElementById('addStudentBtn');
  if (addBtn) addBtn.style.display = isAdmin() ? '' : 'none';

  try {
    [COURSES, STUDENTS] = await Promise.all([api('/courses'), api('/students')]);
  } catch (e) { console.error('Students load error:', e); }
  updateCategoryNav();
  renderCourseGrid();
  renderPassoutSection();
}

function onStudentSearch() {
  const q = document.getElementById('searchStudent').value.trim();
  document.getElementById('searchClearBtn').style.display = q ? 'block' : 'none';
  if (activeCourseCode) { renderStudentTable(); }
  else if (stuCategoryFilter) { renderStatusList(); }
  else if (q.length >= 1) {
    document.getElementById('view-courseGrid').style.display   = 'none';
    document.getElementById('view-globalSearch').style.display = 'block';
    renderGlobalSearch(q);
  } else {
    document.getElementById('view-globalSearch').style.display = 'none';
    document.getElementById('view-courseGrid').style.display   = 'block';
  }
}

function clearStudentSearch() {
  document.getElementById('searchStudent').value = '';
  document.getElementById('searchClearBtn').style.display = 'none';
  document.getElementById('searchStudent').focus();
  if (activeCourseCode) { renderStudentTable(); }
  else {
    document.getElementById('view-globalSearch').style.display = 'none';
    document.getElementById('view-courseGrid').style.display   = 'block';
  }
}

function highlightMatch(text, q) {
  if (!q || !text || text === '\u2014') return String(text);
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text).replace(new RegExp('(' + escaped + ')', 'gi'), '<mark style="background:#fef08a;border-radius:2px;padding:0 1px;">$1</mark>');
}

function renderGlobalSearch(q) {
  const ql   = q.toLowerCase();
  const list = STUDENTS.filter(function(s) {
    return s.name.toLowerCase().includes(ql) || s.id.toLowerCase().includes(ql) ||
           (s.contact && String(s.contact).includes(ql)) ||
           (s.fatherMobile && String(s.fatherMobile).includes(ql));
  });
  document.getElementById('globalSearchMeta').innerHTML = 'Showing <strong>' + list.length + '</strong> result' + (list.length !== 1 ? 's' : '') + ' for "<strong>' + q + '</strong>"';
  const tbody = document.getElementById('globalSearchBody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted);">No students found.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(s) {
    return '<tr>' +
      '<td style="font-family:monospace;font-size:.79rem;color:var(--muted);">' + highlightMatch(s.id, q) + '</td>' +
      '<td style="font-weight:600;">' + highlightMatch(s.name, q) + '</td>' +
      '<td><span class="badge badge-primary">' + s.course + '</span></td>' +
      '<td><span class="badge badge-info">' + (s.feeType === 'yearly' ? 'Yearly' : 'Monthly') + '</span></td>' +
      '<td style="font-size:.81rem;">' + highlightMatch(s.contact || '\u2014', q) + '</td>' +
      '<td>' + stuStatusBadge(s.status) + '</td>' +
      '<td style="display:flex;gap:5px;flex-wrap:wrap;">' +
        (isAdmin() && s.due > 0 ? '<button class="btn btn-primary btn-sm" onclick="openFeeModal(\'' + s.id + '\')">&#x1F4B3; Collect</button>' : '') +
        (isAdmin() ? '<button class="btn btn-warning btn-sm" onclick="openEditStudentModal(\'' + s.id + '\')">&#x270F;&#xFE0F;</button>' : '') +
        (isAdmin() ? '<button class="btn btn-danger btn-sm" onclick="openConfirmDelete(\'' + s.id + '\')">&#x1F5D1;&#xFE0F;</button>' : '') +
      '</td>' +
    '</tr>';
  }).join('');
}

function showStudentTable(code) {
  activeCourseCode = code;
  const course = getCourse(code);
  const count  = STUDENTS.filter(function(s) { return s.course === code; }).length;
  document.getElementById('backBtn').style.display        = 'inline-flex';
  document.getElementById('stuPageTitle').textContent     = code + (course ? ' \u2014 ' + course.name : '');
  document.getElementById('stuPageSubtitle').textContent  = count + ' student' + (count !== 1 ? 's' : '') + ' enrolled';
  document.getElementById('view-globalSearch').style.display  = 'none';
  document.getElementById('view-courseGrid').style.display    = 'none';
  document.getElementById('view-studentTable').style.display  = 'block';
  document.getElementById('searchStudent').value = '';
  document.getElementById('searchClearBtn').style.display = 'none';
  renderStudentTable();
}

function backToCourseGrid() {
  activeCourseCode  = null;
  stuStatusFilter   = 'studying';
  stuCategoryFilter = '';
  var fb = document.getElementById('stuFilterBar'); if (fb) fb.remove();
  document.getElementById('backBtn').style.display           = 'none';
  document.getElementById('stuPageTitle').textContent        = 'Students';
  document.getElementById('stuPageSubtitle').textContent     = 'Select a course to view its students';
  document.getElementById('searchStudent').value = '';
  document.getElementById('searchClearBtn').style.display    = 'none';
  document.getElementById('view-globalSearch').style.display = 'none';
  document.getElementById('view-studentTable').style.display = 'none';
  document.getElementById('view-statusList').style.display   = 'none';
  document.getElementById('view-courseGrid').style.display   = 'block';
  updateCategoryNav();
  renderCourseGrid();
}

const CARD_PALETTES = [
  {bg:'#dbeafe',accent:'#2563eb',icon:'\ud83d\udcbb'},
  {bg:'#dcfce7',accent:'#16a34a',icon:'\ud83c\udf10'},
  {bg:'#fef3c7',accent:'#d97706',icon:'\u2615'},
  {bg:'#ede9fe',accent:'#7c3aed',icon:'\ud83d\udcca'},
  {bg:'#fce7f3',accent:'#db2777',icon:'\ud83d\udd0c'},
  {bg:'#e0f2fe',accent:'#0284c7',icon:'\ud83e\uddee'},
  {bg:'#f0fdf4',accent:'#15803d',icon:'\ud83d\udda5\ufe0f'},
  {bg:'#fff7ed',accent:'#ea580c',icon:'\ud83d\udcf1'},
];

function renderCourseGrid() {
  const grid = document.getElementById('courseButtonGrid');
  if (!grid) return;
  if (!COURSES.length) {
    grid.innerHTML = '<div class="card" style="text-align:center;padding:40px;color:var(--muted);grid-column:1/-1;">No courses configured. Go to Admin \u2192 Courses to add one.</div>';
    return;
  }
  grid.innerHTML = COURSES.map(function(c, idx) {
    const pal       = CARD_PALETTES[idx % CARD_PALETTES.length];
    const cs       = STUDENTS.filter(function(s) { return s.course === c.code; });
    const studying = cs.filter(function(s){ return s.status === 'studying'; }).length;
    const onBreak  = cs.filter(function(s){ return s.status === 'break'; }).length;
    const passout  = cs.filter(function(s){ return s.status === 'passout'; }).length;
    const left     = cs.filter(function(s){ return s.status === 'left'; }).length;
    return '<div onclick="showStudentTable(\'' + c.code + '\')"' +
      ' style="background:var(--surface);border:2px solid ' + pal.accent + ';border-radius:14px;padding:20px 22px;cursor:pointer;transition:all .18s;box-shadow:var(--shadow);"' +
      ' onmouseover="this.style.borderColor=\'' + pal.accent + '\';this.style.transform=\'translateY(-3px)\';this.style.boxShadow=\'0 8px 24px rgba(0,0,0,.15)\';"' +
      ' onmouseout="this.style.borderColor=\'' + pal.accent + '\';this.style.transform=\'\';this.style.boxShadow=\'var(--shadow)\';">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
        '<div style="width:48px;height:48px;border-radius:12px;background:' + pal.bg + ';display:flex;align-items:center;justify-content:center;font-size:1.6rem;">' + pal.icon + '</div>' +
        '<span style="background:' + pal.bg + ';color:' + pal.accent + ';font-size:.72rem;font-weight:800;padding:3px 10px;border-radius:20px;">' + c.code + '</span>' +
      '</div>' +
      '<div style="font-weight:800;font-size:1rem;margin-bottom:3px;">' + c.name + '</div>' +
      '<div style="font-size:.75rem;color:var(--muted);margin-bottom:14px;">' + c.duration + ' yr &nbsp;\u00b7&nbsp; \u20b9' + (c.monthly_fee||0).toLocaleString() + '/mo &nbsp;\u00b7&nbsp; \u20b9' + (c.yearly_fee||0).toLocaleString() + '/yr</div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">' +
        '<div style="background:#dcfce7;border-radius:8px;padding:7px 4px;text-align:center;"><div style="font-size:1.1rem;font-weight:800;color:#16a34a;">' + studying + '</div><div style="font-size:.62rem;color:#16a34a;font-weight:600;text-transform:uppercase;">Studying</div></div>' +
        '<div style="background:#fef3c7;border-radius:8px;padding:7px 4px;text-align:center;"><div style="font-size:1.1rem;font-weight:800;color:#d97706;">' + onBreak + '</div><div style="font-size:.62rem;color:#d97706;font-weight:600;text-transform:uppercase;">Break</div></div>' +
        '<div style="background:#e0f2fe;border-radius:8px;padding:7px 4px;text-align:center;"><div style="font-size:1.1rem;font-weight:800;color:#0891b2;">' + passout + '</div><div style="font-size:.62rem;color:#0891b2;font-weight:600;text-transform:uppercase;">Passout</div></div>' +
        '<div style="background:#fee2e2;border-radius:8px;padding:7px 4px;text-align:center;"><div style="font-size:1.1rem;font-weight:800;color:#dc2626;">' + left + '</div><div style="font-size:.62rem;color:#dc2626;font-weight:600;text-transform:uppercase;">Left</div></div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderStudents() {
  if (activeCourseCode) { renderStudentTable(); } else { renderCourseGrid(); }
}

// studying | left | break | passout
var stuStatusFilter = 'studying';

var STATUS_META = {
  studying: { label:'Studying',  badge:'badge-success', color:'var(--success)',  dim: false },
  break:    { label:'On Break',  badge:'badge-warning', color:'var(--warning)',  dim: true  },
  left:     { label:'Left',      badge:'badge-danger',  color:'var(--danger)',   dim: true  },
  passout:  { label:'Passout',   badge:'badge-info',    color:'var(--info)',     dim: true  },
};

function stuStatusBadge(status) {
  var m = STATUS_META[status] || STATUS_META.studying;
  return '<span class="badge ' + m.badge + '">' + m.label + '</span>';
}

function setStatusFilter(val) {
  stuStatusFilter = val;
  document.querySelectorAll('.stu-filter-btn').forEach(function(b) {
    b.style.background = b.dataset.filter === val ? 'var(--primary)' : '';
    b.style.color      = b.dataset.filter === val ? '#fff' : '';
  });
  renderStudentTable();
}

var _statusChangeId = null, _statusChangeNew = null;

function changeStudentStatus(id, newStatus) {
  _statusChangeId  = id;
  _statusChangeNew = newStatus;
  var s = STUDENTS.find(function(x){ return x.id === id; }) || {};
  if (newStatus === 'break') {
    document.getElementById('scModalTitle').textContent  = '⏸ Mark as Break';
    document.getElementById('scModalLabel').textContent  = 'Break start date & remarks';
    document.getElementById('scDate').value    = s.breakFromDate || new Date().toISOString().split('T')[0];
    document.getElementById('scRemarks').value = s.breakRemarks  || '';
    document.getElementById('scRemarksRow').style.display = '';
    document.getElementById('statusChangeModal').classList.add('open');
  } else if (newStatus === 'left') {
    document.getElementById('scModalTitle').textContent  = '🚪 Mark as Left';
    document.getElementById('scModalLabel').textContent  = 'Date of leaving';
    document.getElementById('scDate').value    = s.leftDate || new Date().toISOString().split('T')[0];
    document.getElementById('scRemarks').value = '';
    document.getElementById('scRemarksRow').style.display = 'none';
    document.getElementById('statusChangeModal').classList.add('open');
  } else if (newStatus === 'passout') {
    document.getElementById('scModalTitle').textContent  = '🎓 Mark as Passout';
    document.getElementById('scModalLabel').textContent  = 'Passout date';
    document.getElementById('scDate').value    = s.passoutDate || new Date().toISOString().split('T')[0];
    document.getElementById('scRemarks').value = '';
    document.getElementById('scRemarksRow').style.display = 'none';
    document.getElementById('statusChangeModal').classList.add('open');
  } else {
    if (!confirm('Re-enroll this student back to STUDYING?')) { return; }
    submitStatusChange(id, { status: 'studying' });
  }
}

function closeStatusChangeModal() {
  document.getElementById('statusChangeModal').classList.remove('open');
  _statusChangeId = null; _statusChangeNew = null;
}

async function confirmStatusChange() {
  var id      = _statusChangeId;
  var date    = document.getElementById('scDate').value;
  var remarks = document.getElementById('scRemarks').value.trim();
  var payload = { status: _statusChangeNew };
  if (_statusChangeNew === 'break')   { payload.breakFromDate = date; payload.breakRemarks = remarks; }
  if (_statusChangeNew === 'left')    { payload.leftDate    = date; }
  if (_statusChangeNew === 'passout') { payload.passoutDate = date; }
  closeStatusChangeModal();
  await submitStatusChange(id, payload);
}

async function submitStatusChange(id, payload) {
  try {
    await api('/students/' + id + '/status', 'PUT', payload);
    STUDENTS = await api('/students');
    updateCategoryNav();
    if (stuCategoryFilter) renderStatusList(); else renderStudentTable();
    renderPassoutSection();
    showToast('Status updated', 'success');
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

// ─── Download helpers ─────────────────────────────────────────────────────────
function downloadCategoryCSV(cat) {
  var list = STUDENTS.filter(function(s){ return s.status === cat; });
  var rows = [];
  if (cat === 'studying') {
    rows.push(['Roll No','Name','Course','Contact','Father Name','Admission Date','Fee Type','Fees/Mo or Total','Paid','Balance Due']);
    list.forEach(function(s) {
      rows.push([s.id, s.name, s.course, s.contact||'', s.fatherName||'',
        s.admissionDate||'', s.feeType === 'yearly' ? 'Yearly' : 'Monthly',
        s.feeType === 'yearly' ? s.totalFees||0 : s.perPeriod||0,
        s.paid||0, s.due||0]);
    });
  } else if (cat === 'left') {
    rows.push(['Roll No','Name','Course','Contact','Father Name','Admission Date','Date Left','Paid','Balance Due']);
    list.forEach(function(s) {
      rows.push([s.id, s.name, s.course, s.contact||'', s.fatherName||'',
        s.admissionDate||'', s.leftDate||'', s.paid||0, s.due||0]);
    });
  } else if (cat === 'break') {
    rows.push(['Roll No','Name','Course','Contact','Father Name','Admission Date','Break From','Break Remarks','Paid','Balance Due']);
    list.forEach(function(s) {
      rows.push([s.id, s.name, s.course, s.contact||'', s.fatherName||'',
        s.admissionDate||'', s.breakFromDate||'', '"' + (s.breakRemarks||'').replace(/"/g,'""') + '"',
        s.paid||0, s.due||0]);
    });
  } else if (cat === 'passout') {
    rows.push(['Roll No','Name','Course','Contact','Father Name','Admission Date','Passout Date','Total Paid']);
    list.sort(function(a,b){ return b.id.localeCompare(a.id); });
    list.forEach(function(s) {
      rows.push([s.id, s.name, s.course, s.contact||'', s.fatherName||'',
        s.admissionDate||'', s.passoutDate||'', s.paid||0]);
    });
  }
  var csv = rows.map(function(r){ return r.join(','); }).join('\n');
  var label = { studying:'Studying', left:'Left', break:'OnBreak', passout:'Passout' }[cat] || cat;
  var a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = 'EduNova-' + label + '-' + new Date().toISOString().split('T')[0] + '.csv';
  document.body.appendChild(a); a.click();
  setTimeout(function(){ document.body.removeChild(a); }, 100);
}

function renderPassoutSection() {
  var sec  = document.getElementById('passoutSection');
  var list = STUDENTS.filter(function(s) { return s.status === 'passout'; })
    .sort(function(a, b) { return b.id.localeCompare(a.id); });
  if (!sec) return;
  if (!list.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';
  var rows = list.map(function(s) {
    var cleared = s.due <= 0;
    return '<tr>' +
      '<td style="font-family:monospace;font-size:.79rem;">' + s.id + '</td>' +
      '<td style="font-weight:600;">' + s.name + '</td>' +
      '<td><span class="badge badge-primary">' + s.course + '</span></td>' +
      '<td style="color:var(--success);font-weight:600;">\u20b9' + s.paid.toLocaleString() + '</td>' +
      '<td style="color:' + (s.due > 0 ? 'var(--danger)' : 'var(--muted)') + ';font-weight:700;">\u20b9' + s.due.toLocaleString() + '</td>' +
      '<td>' + (cleared ? '<span class="badge badge-success">\u2714 Cleared</span>' : '<span class="badge badge-danger">\u26a0\ufe0f Dues Pending</span>') + '</td>' +
      '<td style="display:flex;gap:5px;">' +
        (!cleared ? '<button class="btn btn-primary btn-sm" onclick="openFeeModal(\'' + s.id + '\')">&#x1F4B3; Collect</button>' : '') +
        (cleared  ? '<button class="btn btn-success btn-sm" onclick="alert(\'Fees cleared — safe to issue document.\')">&#x1F4C4; Issue Doc</button>' : '') +
        '<button class="btn btn-danger btn-sm" onclick="openConfirmDelete(\'' + s.id + '\')">&#x1F5D1;&#xFE0F;</button>' +
      '</td>' +
    '</tr>';
  }).join('');
  document.getElementById('passoutBody').innerHTML = rows || '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--muted);">No passout students.</td></tr>';
}

function renderStudentTable() {
  const q   = (document.getElementById('searchStudent') || {value: ''}).value.trim();
  const ql  = q.toLowerCase();
  const all = STUDENTS.filter(function(s) { return s.course === activeCourseCode; });

  // Build filter bar
  var hdr = document.getElementById('stuTableHeader');
  if (hdr && isAdmin() && !document.getElementById('stuFilterBar')) {
    var bar = document.createElement('div');
    bar.id        = 'stuFilterBar';
    bar.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap;';
    ['studying','break','left','passout'].forEach(function(v) {
      var cnt = all.filter(function(s){ return s.status === v; }).length;
      var b   = document.createElement('button');
      b.className      = 'btn btn-ghost btn-sm stu-filter-btn';
      b.dataset.filter = v;
      b.textContent    = STATUS_META[v].label + ' (' + cnt + ')';
      b.style.background = v === stuStatusFilter ? 'var(--primary)' : '';
      b.style.color      = v === stuStatusFilter ? '#fff' : '';
      b.onclick = function(){ setStatusFilter(v); };
      bar.appendChild(b);
    });
    hdr.appendChild(bar);
  } else if (hdr) {
    // update counts
    var bar = document.getElementById('stuFilterBar');
    if (bar) {
      bar.querySelectorAll('.stu-filter-btn').forEach(function(b) {
        var v   = b.dataset.filter;
        var cnt = all.filter(function(s){ return s.status === v; }).length;
        b.textContent    = STATUS_META[v].label + ' (' + cnt + ')';
        b.style.background = v === stuStatusFilter ? 'var(--primary)' : '';
        b.style.color      = v === stuStatusFilter ? '#fff' : '';
      });
    }
  }

  const list = all.filter(function(s) {
    return s.status === stuStatusFilter && (!q || s.name.toLowerCase().includes(ql) || s.id.toLowerCase().includes(ql) || (s.contact && String(s.contact).includes(ql)));
  });

  const meta = document.getElementById('stuTableMeta');
  var studying = all.filter(function(s){ return s.status==='studying'; }).length;
  meta.innerHTML = '<strong>' + studying + '</strong> studying &nbsp;·&nbsp; ' +
    all.filter(function(s){ return s.status==='break'; }).length + ' on break &nbsp;·&nbsp; ' +
    all.filter(function(s){ return s.status==='left'; }).length + ' left &nbsp;·&nbsp; ' +
    all.filter(function(s){ return s.status==='passout'; }).length + ' passout';

  const tbody = document.getElementById('studentsBody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted);">No ' + STATUS_META[stuStatusFilter].label + ' students' + (q ? ' matching.' : '.') + '</td></tr>';
    return;
  }

  var isInactive = stuStatusFilter !== 'studying';

  if (isTeacher()) {
    tbody.innerHTML = list.map(function(s) {
      return '<tr style="' + (isInactive ? 'opacity:.6;' : '') + '">' +
        '<td style="font-family:monospace;font-size:.79rem;color:var(--muted);">' + highlightMatch(s.id, q) + '</td>' +
        '<td style="font-weight:600;">' + highlightMatch(s.name, q) + ' ' + stuStatusBadge(s.status) + '</td>' +
        '<td><span class="badge badge-primary">' + s.course + '</span></td>' +
        '<td style="font-size:.81rem;">' + highlightMatch(s.contact || '\u2014', q) + '</td>' +
      '</tr>';
    }).join('');
    return;
  }

  tbody.innerHTML = list.map(function(s) {
    var inactive = s.status !== 'studying';
    var statusOpts = ['studying','break','left','passout'].filter(function(v){ return v !== s.status; })
      .map(function(v){ return '<option value="' + v + '">' + STATUS_META[v].label + '</option>'; }).join('');
    var statusSel = '<select class="btn btn-ghost btn-sm" style="padding:4px 6px;font-size:.74rem;cursor:pointer;" onchange="changeStudentStatus(\'' + s.id + '\',this.value);this.value=\'\'">' +
      '<option value="">Change Status</option>' + statusOpts + '</select>';
    return '<tr style="' + (inactive ? 'opacity:.65;background:#f8fafc;' : '') + '">' +
      '<td style="font-family:monospace;font-size:.79rem;color:var(--muted);">' + highlightMatch(s.id, q) + '</td>' +
      '<td style="font-weight:600;">' + highlightMatch(s.name, q) + '</td>' +
      '<td>' + stuStatusBadge(s.status) + '</td>' +
      '<td>' + (s.feeType === 'yearly'
          ? '<span class="badge badge-info">Yearly</span><br><span style="font-size:.73rem;color:var(--muted);">Total ₹' + (s.totalFees||0).toLocaleString() + '</span>'
          : '<span class="badge badge-primary">Monthly</span><br><span style="font-size:.73rem;color:var(--muted);">₹' + (s.perPeriod||0).toLocaleString() + '/mo</span>') + '</td>' +
      '<td style="color:var(--success);font-weight:600;">\u20b9' + s.paid.toLocaleString() + '</td>' +
      '<td style="color:' + (s.due > 0 ? 'var(--danger)' : 'var(--muted)') + ';font-weight:700;">\u20b9' + s.due.toLocaleString() + '</td>' +
      '<td style="display:flex;gap:4px;flex-wrap:wrap;">' +
        (s.status === 'studying' && s.due > 0 ? '<button class="btn btn-primary btn-sm" onclick="openFeeModal(\'' + s.id + '\')">&#x1F4B3; Collect</button>' : '') +
        (s.status === 'studying' ? '<button class="btn btn-warning btn-sm" onclick="openEditStudentModal(\'' + s.id + '\')">&#x270F;&#xFE0F;</button>' : '') +
        statusSel +
        '<button class="btn btn-danger btn-sm" onclick="openConfirmDelete(\'' + s.id + '\')">&#x1F5D1;&#xFE0F;</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function instBadge(s) {
  const paid  = (s.installments || []).filter(function(i) { return i.paid; }).length;
  const total = (s.installments || []).length;
  if (!total) return '<span class="badge badge-info">N/A</span>';
  if (paid === total) return '<span class="badge badge-success">' + paid + '/' + total + ' \u2714</span>';
  if (paid === 0)     return '<span class="badge badge-danger">0/' + total + '</span>';
  return '<span class="badge badge-warning">' + paid + '/' + total + '</span>';
}
const installmentBadge = instBadge;

// Expose on window so onclick attributes always find it
window.setStudentCategory = setStudentCategory;

// Also wire via delegation as belt-and-suspenders
document.getElementById('stuCategoryNav').addEventListener('click', function(e) {
  var btn = e.target.closest('.stu-cat-btn');
  if (btn) setStudentCategory(btn.dataset.cat || '');
});
