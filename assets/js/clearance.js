// ============================================================
// CLEARANCE
// ============================================================
let _clearanceData = [];

async function initClearance() {
  // Load independently so a courses failure never blocks clearance data
  try {
    _clearanceData = await api('/clearance');
  } catch (e) {
    console.error('Clearance load error:', e);
    _clearanceData = [];
  }
  try {
    COURSES = await api('/courses');
  } catch (e) {
    console.error('Courses load error (clearance):', e);
  }
  const el = document.getElementById('clearanceCourse');
  if (el) {
    el.innerHTML = '<option value="">All Courses</option>';
    COURSES.forEach(function(c) { el.innerHTML += '<option value="' + c.code + '">' + c.code + ' – ' + c.name + '</option>'; });
  }
  renderClearanceTable();
}

function renderClearanceTable() {
  const q    = (document.getElementById('clearanceSearch') || {value: ''}).value.toLowerCase();
  const cf   = (document.getElementById('clearanceCourse') || {value: ''}).value;
  const list = _clearanceData.filter(function(s) {
    return (!q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)) && (!cf || s.course === cf);
  });
  const tb = document.getElementById('clearanceBody');
  if (!list.length) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--muted);">No students found.</td></tr>'; return; }
  tb.innerHTML = list.map(function(st) {
    // Use backend-computed cleared flag; fall back to due<=0 if missing
    const due     = (st.due != null) ? Number(st.due) : (Number(st.totalFees || 0) - Number(st.paid || 0));
    const cleared = st.cleared !== undefined ? !!st.cleared : (due <= 0);
    return '<tr>' +
      '<td style="font-weight:600;">' + st.name + '<br><span style="font-size:.74rem;color:var(--muted);">' + st.id + '</span></td>' +
      '<td><span class="badge badge-primary">' + st.course + '</span></td>' +
      '<td><span class="badge badge-info">' + (st.feeType === 'yearly' ? 'Yearly' : 'Monthly') + '</span></td>' +
      '<td style="color:' + (due > 0 ? 'var(--danger)' : 'var(--success)') + ';font-weight:700;">' + (due > 0 ? '₹' + due.toLocaleString() + ' Due' : '✔ Fully Paid') + '</td>' +
      '<td><button class="' + (cleared ? 'clearance-btn-green' : 'clearance-btn-red') + '" onclick="openClearanceModal(\'' + st.id + '\')">' + (cleared ? '✅ CLEARED' : '⚠️ NOT CLEARED') + '</button></td>' +
    '</tr>';
  }).join('');
}

function openClearanceModal(id) {
  const st = _clearanceData.find(function(s) { return s.id === id; });
  if (!st) return;
  const due     = (st.due != null) ? Number(st.due) : (Number(st.totalFees || 0) - Number(st.paid || 0));
  const cleared = st.cleared !== undefined ? !!st.cleared : (due <= 0);
  document.getElementById('clearanceModalContent').innerHTML =
    '<div style="background:#f8fafc;border-radius:10px;padding:12px 16px;margin-bottom:16px;">' +
      '<div style="font-weight:700;font-size:1rem;">' + st.name + '</div>' +
      '<div style="font-size:.8rem;color:var(--muted);">' + st.id + ' · ' + st.course + ' · ' + (st.feeType === 'yearly' ? 'Yearly' : 'Monthly') + ' plan</div>' +
    '</div>' +
    '<div class="cl-item ' + (cleared ? 'cl-ok' : 'cl-fail') + '">' +
      '<div class="cl-item-label">💳 Course Fees</div>' +
      '<div class="cl-item-right">' + (cleared ? '✔ Fully Paid' : '✘ ₹' + due.toLocaleString() + ' still due') + '</div>' +
    '</div>' +
    '<div style="margin-top:16px;padding:14px;border-radius:10px;text-align:center;background:' + (cleared ? 'var(--success-light)' : 'var(--danger-light)') + ';">' +
      '<div style="font-size:1.5rem;margin-bottom:6px;">' + (cleared ? '✅' : '⚠️') + '</div>' +
      '<div style="font-weight:800;font-size:1rem;color:' + (cleared ? 'var(--success)' : 'var(--danger)') + ';">' + (cleared ? 'FEES CLEARED — Certificate can be issued' : 'NOT CLEARED — Fees must be paid first') + '</div>' +
      (!cleared ? '<div style="font-size:.8rem;color:var(--danger);margin-top:6px;">Pending: ₹' + due.toLocaleString() + '</div>' : '') +
    '</div>';
  document.getElementById('clearanceModal').classList.add('open');
}

function closeClearanceModal() { document.getElementById('clearanceModal').classList.remove('open'); }
