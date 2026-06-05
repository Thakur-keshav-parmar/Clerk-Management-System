// ============================================================
// ADMIN PANEL
// ============================================================
let adminTab = 'courses';

function formatDuration(dur, unit) {
  dur = parseInt(dur) || 1;
  unit = unit || 'years';
  if (unit === 'months') return dur + ' Month' + (dur !== 1 ? 's' : '');
  return dur + ' Year' + (dur !== 1 ? 's' : '');
}

async function initAdmin() {
  try {
    [COURSES, STUDENTS] = await Promise.all([api('/courses'), api('/students')]);
  } catch (e) {
    console.error('Admin load error:', e);
  }
  renderCoursesList();
  renderFeeCourseSelect();
  switchAdminTab('courses');
}

function switchAdminTab(tab) {
  adminTab = tab;
  ['courses', 'fees'].forEach(function(t) {
    document.getElementById('adminTab-' + t).style.display = t === tab ? 'block' : 'none';
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
  });
  if (tab === 'fees') renderFeeGrid();
}

function renderCoursesList() {
  const list = document.getElementById('coursesList');
  document.getElementById('courseCountTag').textContent = COURSES.length + ' course' + (COURSES.length !== 1 ? 's' : '');
  list.innerHTML = COURSES.map(function(c) {
    return '<div class="course-card">' +
      '<div>' +
        '<div style="font-weight:800;font-size:1rem;color:var(--primary);">' + c.code + '</div>' +
        '<div style="font-size:.84rem;font-weight:600;">' + c.name + '</div>' +
        '<div style="font-size:.75rem;color:var(--muted);margin-top:2px;">' + formatDuration(c.duration, c.duration_unit) + ' &nbsp;|&nbsp; ' +
          '\u20b9' + (c.monthly_fee || 0).toLocaleString() + '/mo &nbsp;|&nbsp; ' +
          '\u20b9' + (c.yearly_fee  || 0).toLocaleString() + '/yr' +
        '</div>' +
      '</div>' +
      '<button class="btn btn-danger btn-xs" onclick="removeCourse(\'' + c.code + '\')">&#128465;</button>' +
    '</div>';
  }).join('');
}

function renderCourses() { renderCoursesList(); }

async function addCourse() {
  const codeRaw = document.getElementById('newCourseCode').value.trim().toUpperCase();
  const name    = document.getElementById('newCourseName').value.trim();
  const codeErr = document.getElementById('err_courseCode');
  const nameErr = document.getElementById('err_courseName');
  let valid = true;

  const codeOk = /^[A-Z]{2,10}$/.test(codeRaw);
  codeErr.classList.toggle('show', !codeOk);
  document.getElementById('newCourseCode').classList.toggle('input-error', !codeOk);
  if (!codeOk) valid = false;

  const nameOk = name.length >= 2 && name.length <= 80;
  nameErr.classList.toggle('show', !nameOk);
  document.getElementById('newCourseName').classList.toggle('input-error', !nameOk);
  if (!nameOk) valid = false;
  if (!valid) return;

  if (COURSES.find(function(c) { return c.code === codeRaw; })) {
    alert('Course code "' + codeRaw + '" already exists.');
    return;
  }

  const duration   = parseInt(document.getElementById('newCourseDurationNum').value) || 1;
  const durUnit    = document.getElementById('newCourseDurationUnit').value || 'months';
  const monthlyFee = parseInt(document.getElementById('newCourseMonthlyFee').value) || 0;
  const yearlyFee  = parseInt(document.getElementById('newCourseYearlyFee').value)  || 0;

  try {
    const newCourse = await api('/courses', 'POST', {
      code: codeRaw, name, duration, duration_unit: durUnit, monthly_fee: monthlyFee, yearly_fee: yearlyFee
    });
    COURSES.push(newCourse);
    document.getElementById('newCourseCode').value         = '';
    document.getElementById('newCourseName').value         = '';
    document.getElementById('newCourseDurationNum').value  = '1';
    document.getElementById('newCourseDurationUnit').value = 'months';
    document.getElementById('newCourseMonthlyFee').value   = '';
    document.getElementById('newCourseYearlyFee').value    = '';
    codeErr.classList.remove('show'); nameErr.classList.remove('show');
    renderCoursesList(); renderFeeCourseSelect(); refreshCourseSelects();
    alert('\u2705 Course "' + codeRaw + ' \u2013 ' + name + '" added!');
  } catch (e) {
    alert('Error adding course: ' + e.message);
  }
}

function refreshCourseSelects() {
  ['feeCourseSelect','clearanceCourse','duesCourseFilter'].forEach(function(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const isFilter = id !== 'feeCourseSelect';
    el.innerHTML = isFilter ? '<option value="">All Courses</option>' : '<option value="">\u2014 Choose a course \u2014</option>';
    COURSES.forEach(function(c) { el.innerHTML += '<option value="' + c.code + '">' + c.code + ' \u2013 ' + c.name + '</option>'; });
  });
}

async function removeCourse(code) {
  const stuCount = STUDENTS.filter(function(s) { return s.course === code; }).length;
  if (stuCount > 0) { alert('Cannot remove "' + code + '": ' + stuCount + ' student(s) enrolled.'); return; }
  if (!confirm('Remove course "' + code + '"?')) return;
  try {
    await api('/courses/' + code, 'DELETE');
    const idx = COURSES.findIndex(function(c) { return c.code === code; });
    if (idx !== -1) COURSES.splice(idx, 1);
    renderCoursesList(); renderFeeCourseSelect(); refreshCourseSelects();
  } catch (e) {
    alert('Error removing course: ' + e.message);
  }
}

function renderFeeCourseSelect() {
  const sel = document.getElementById('feeCourseSelect');
  sel.innerHTML = '<option value="">\u2014 Choose a course \u2014</option>';
  COURSES.forEach(function(c) { sel.innerHTML += '<option value="' + c.code + '">' + c.code + ' \u2013 ' + c.name + '</option>'; });
}

async function renderFeeGrid() {
  const code = document.getElementById('feeCourseSelect').value;
  const grid = document.getElementById('feeGrid');
  if (!code) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:.84rem;text-align:center;padding:20px;">\u2190 Select a course to configure its fees.</p>';
    return;
  }
  const course = getCourse(code);
  if (!course) { grid.innerHTML = ''; return; }

  const stuCount = STUDENTS.filter(function(s) { return s.course === code; }).length;
  var feeDisabled = isClerk() ? ' disabled title="Only admin can edit fees"' : '';
  var feeDisabledNote = isClerk() ? '<div style="font-size:.75rem;color:var(--danger);margin-top:6px;">🔒 Only admin can edit fees</div>' : '';
  grid.innerHTML =
    '<div style="background:var(--primary-light);border-radius:10px;padding:14px 16px;margin-bottom:16px;font-size:.84rem;">' +
      '<strong>' + code + ' \u2013 ' + course.name + '</strong> &nbsp;&middot;&nbsp; ' + formatDuration(course.duration, course.duration_unit) + ' &nbsp;&middot;&nbsp; ' + stuCount + ' student' + (stuCount !== 1 ? 's' : '') + ' enrolled' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
      '<div style="background:var(--surface);border:1.5px solid var(--border);border-radius:10px;padding:16px;">' +
        '<div style="font-weight:700;font-size:.9rem;margin-bottom:10px;">\ud83d\udcc5 Monthly Fee</div>' +
        '<div class="form-group" style="margin-bottom:10px;"><label style="font-size:.77rem;">Amount per month (\u20b9)</label>' +
        '<input type="number" id="fee_monthly_' + code + '" value="' + (course.monthly_fee || '') + '" placeholder="e.g. 3000" min="0"' + feeDisabled + '></div>' +
        feeDisabledNote +
        (!isClerk() ? '<button class="btn btn-success btn-sm" style="width:100%;justify-content:center;" onclick="saveFees(\'' + code + '\')">&#128274; Save Fees</button>' : '') +
      '</div>' +
      '<div style="background:var(--surface);border:1.5px solid var(--border);border-radius:10px;padding:16px;">' +
        '<div style="font-weight:700;font-size:.9rem;margin-bottom:10px;">\ud83d\udcc6 Yearly Fee</div>' +
        '<div class="form-group" style="margin-bottom:10px;"><label style="font-size:.77rem;">Amount per year (\u20b9)</label>' +
        '<input type="number" id="fee_yearly_' + code + '" value="' + (course.yearly_fee || '') + '" placeholder="e.g. 30000" min="0"' + feeDisabled + '></div>' +
        feeDisabledNote +
        (!isClerk() ? '<button class="btn btn-success btn-sm" style="width:100%;justify-content:center;" onclick="saveFees(\'' + code + '\')">&#128274; Save Fees</button>' : '') +
      '</div>' +
    '</div>' +
    '<p style="font-size:.78rem;color:var(--muted);margin-top:12px;">\ud83d\udca1 Students can also get an individual waiver at admission time.</p>';
}

async function saveFees(code) {
  const mVal = parseInt(document.getElementById('fee_monthly_' + code).value);
  const yVal = parseInt(document.getElementById('fee_yearly_' + code).value);
  if (isNaN(mVal) && isNaN(yVal)) { alert('Please enter at least one fee amount.'); return; }

  const payload = {};
  if (!isNaN(mVal) && mVal >= 0) payload.monthly_fee = mVal;
  if (!isNaN(yVal) && yVal >= 0) payload.yearly_fee  = yVal;

  try {
    const updated = await api('/courses/' + code + '/fee-structure', 'PUT', payload);
    const idx = COURSES.findIndex(function(c) { return c.code === code; });
    if (idx !== -1) COURSES[idx] = Object.assign(COURSES[idx], updated);
    renderFeeGrid();
    alert('\u2705 Fees saved for ' + code + '!');
  } catch (e) {
    alert('Error saving fees: ' + e.message);
  }
}

function populateFeeCourseSelect() { renderFeeCourseSelect(); }
