// ============================================================
// DUE RECORDS
// ============================================================
let _duesData = [];

async function initDues() {
  try {
    [COURSES, _duesData] = await Promise.all([api('/courses'), api('/dues')]);
  } catch (e) {
    console.error('Dues load error:', e);
    _duesData = [];
  }
  const el = document.getElementById('duesCourseFilter');
  if (el) {
    el.innerHTML = '<option value="">All Courses</option>';
    COURSES.forEach(function(c) { el.innerHTML += '<option value="' + c.code + '">' + c.code + ' \u2013 ' + c.name + '</option>'; });
  }
  renderDueRecords();
}

function renderDueRecords() {
  const q    = (document.getElementById('duesSearch') || {value: ''}).value.toLowerCase();
  const cf   = (document.getElementById('duesCourseFilter') || {value: ''}).value;
  const list = _duesData.filter(function(s) {
    return (!q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)) && (!cf || s.course === cf);
  });
  const tb = document.getElementById('duesBody');
  if (!tb) return;
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted);">' +
      (q || cf ? 'No students match the filter.' : '\u2705 No pending dues! All students are cleared.') + '</td></tr>';
    return;
  }
  var STU_BG  = { studying:'#dcfce7', break:'#fef3c7', left:'#fee2e2', passout:'#e0f2fe' };
  var STU_CLR = { studying:'#16a34a', break:'#d97706', left:'#dc2626', passout:'#0284c7' };
  var STU_LBL = { studying:'Studying', break:'On Break', left:'Left', passout:'Passout' };
  const today = new Date().toISOString().split('T')[0];
  tb.innerHTML = list.map(function(st) {
    const overdue = st.isOverdue || false;
    const nextDue = st.nextDueDate || null;
    let dueDateCell = '\u2014';
    if (nextDue) {
      const dDate   = new Date(nextDue);
      const fmtD    = dDate.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
      dueDateCell   = '<span style="color:' + (overdue ? 'var(--danger)' : 'var(--text)') + ';font-weight:' + (overdue ? '700' : '400') + ';">' +
        fmtD + (overdue ? ' \u26a0\ufe0f' : '') + '</span>';
    }
    const dueLabel = overdue ? '<span class="badge badge-danger">Overdue</span>' : '<span class="badge badge-warning">Pending</span>';
    var sc = STU_CLR[st.status] || 'var(--muted)';
    var sb = STU_BG[st.status]  || '#f1f5f9';
    var stuBadge = '<span style="background:' + sb + ';color:' + sc + ';font-size:.69rem;font-weight:700;padding:2px 8px;border-radius:20px;">' + (STU_LBL[st.status]||st.status) + '</span>';
    return '<tr' + (overdue ? ' style="background:#fff5f5;"' : '') + '>' +
      '<td style="font-family:monospace;font-size:.79rem;color:var(--muted);">' + st.id + '</td>' +
      '<td style="font-weight:600;">' + st.name + '</td>' +
      '<td><span class="badge badge-primary">' + st.course + '</span></td>' +
      '<td><span class="badge badge-info">' + (st.feeType === 'yearly' ? 'Yearly' : 'Monthly') + '</span></td>' +
      '<td style="color:var(--danger);font-weight:700;">\u20b9' + st.due.toLocaleString() + '</td>' +
      '<td>' + dueDateCell + '</td>' +
      '<td>' + stuBadge + '</td>' +
      '<td>' + dueLabel + '</td>' +
    '</tr>';
  }).join('');
}
