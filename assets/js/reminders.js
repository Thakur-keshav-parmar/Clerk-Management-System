// ============================================================
// REMINDERS & SNOOZE
// ============================================================
var REMINDERS = [];
var _snoozeStudentId = '';
var _snoozeStudentName = '';

async function loadReminders() {
  try { REMINDERS = await api('/reminders'); } catch(e) { REMINDERS = []; }
}

function scrollToReminders() {
  var el = document.getElementById('remindersPanel');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function openSnoozeModal(studentId, studentName) {
  _snoozeStudentId   = studentId;
  _snoozeStudentName = studentName;
  document.getElementById('snoozeStudentName').textContent = studentName;
  document.getElementById('snoozeDate').value = '';
  document.getElementById('snoozeAmount').value = '';
  document.getElementById('snoozeNote').value = '';
  setSnoozePreset(3);
  document.getElementById('snoozeModal').classList.add('open');
}

function closeSnoozeModal() {
  document.getElementById('snoozeModal').classList.remove('open');
  _snoozeStudentId = '';
}

function setSnoozePreset(days) {
  var d = new Date();
  d.setDate(d.getDate() + days);
  document.getElementById('snoozeDate').value = d.toISOString().split('T')[0];
  document.querySelectorAll('.snooze-preset').forEach(function(b) {
    b.style.background = '';
    b.style.color = '';
  });
}

async function submitSnooze() {
  var date = document.getElementById('snoozeDate').value;
  var amt  = parseInt(document.getElementById('snoozeAmount').value) || 0;
  var note = document.getElementById('snoozeNote').value.trim();
  if (!date) { alert('Please select a date'); return; }
  if (!_snoozeStudentId) return;
  try {
    await api('/reminders', 'POST', {
      studentId:     _snoozeStudentId,
      reminderDate:  date,
      promiseAmount: amt,
      note:          note,
    });
    closeSnoozeModal();
    await initDashboard();
    showToast('Reminder set for ' + _snoozeStudentName, 'success');
  } catch(e) { alert('Error: ' + e.message); }
}

async function markReminderDone(id) {
  try {
    await api('/reminders/' + id + '/done', 'PUT', {});
    await initDashboard();
    showToast('Reminder marked done', 'success');
  } catch(e) { alert('Error: ' + e.message); }
}

async function rescheduleReminder(id) {
  var days = prompt('Reschedule in how many days?', '3');
  if (!days) return;
  var d = new Date();
  d.setDate(d.getDate() + parseInt(days));
  var newDate = d.toISOString().split('T')[0];
  try {
    await api('/reminders/' + id + '/reschedule', 'PUT', { reminderDate: newDate });
    await initDashboard();
    showToast('Reminder rescheduled', 'success');
  } catch(e) { alert('Error: ' + e.message); }
}

function renderRemindersPanel(reminders) {
  var panel = document.getElementById('remindersPanel');
  var container = document.getElementById('remindersContainer');
  var meta = document.getElementById('remindersPanelMeta');
  if (!panel || !container) return;
  if (!reminders || !reminders.length) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = 'block';
  if (meta) meta.textContent = reminders.length + ' active reminder' + (reminders.length !== 1 ? 's' : '');
  container.innerHTML = reminders.map(function(r) {
    var isEsc = r.status === 'escalated';
    var cardBg = isEsc ? 'background:#fef2f2;border:2px solid #fca5a5;' : 'background:#fffbeb;border:2px solid #fde68a;';
    var dateLabel = isEsc
      ? '<span style="color:#dc2626;font-weight:700;">⚠ Overdue since ' + r.reminderDate + '</span>'
      : '<span style="color:#d97706;font-weight:600;">📅 ' + r.reminderDate + '</span>';
    var dueStr = r.currentDue > 0 ? '₹' + r.currentDue.toLocaleString('en-IN') + ' due' : 'No dues';
    var promStr = r.promiseAmount > 0 ? ' · promised ₹' + r.promiseAmount.toLocaleString('en-IN') : '';
    return '<div style="' + cardBg + 'border-radius:12px;padding:14px 18px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">' +
      '<div>' +
        '<div style="font-weight:700;font-size:.95rem;">' + r.studentName + ' <span class="badge badge-primary" style="font-size:.7rem;">' + r.course + '</span></div>' +
        '<div style="font-size:.8rem;margin-top:3px;color:var(--muted);">' + dateLabel + ' · ' + dueStr + promStr + '</div>' +
        (r.note ? '<div style="font-size:.78rem;color:var(--muted);margin-top:2px;font-style:italic;">"' + r.note + '"</div>' : '') +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
        '<button class="btn btn-success btn-sm" onclick="markReminderDone(' + r.id + ')">✓ Done</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="rescheduleReminder(' + r.id + ')">↻ Reschedule</button>' +
      '</div>' +
    '</div>';
  }).join('');
}
