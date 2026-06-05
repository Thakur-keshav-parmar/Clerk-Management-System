// ============================================================
// ADD / EDIT STUDENT FORM
// ============================================================
let editStudentId = null, profilePhotoData = null;

// Returns total months for a course (handles both 'months' and 'years' duration_unit)
function courseDurationMonths(course) {
  var dur = parseInt(course.duration) || 1;
  return (course.duration_unit === 'months') ? dur : dur * 12;
}

function populateCourseDropdown(selectId, selectedVal) {
  selectedVal = selectedVal || '';
  const el = document.getElementById(selectId);
  if (!el) return;
  el.innerHTML = '<option value="">Select Course</option>';
  COURSES.forEach(function(c) {
    el.innerHTML += '<option value="' + c.code + '"' + (c.code === selectedVal ? ' selected' : '') + '>' + c.code + ' \u2013 ' + c.name + '</option>';
  });
}

function onCourseChange() { updateFeePreview(); }
function onFeeTypeChange() { updateFeePreview(); }

function updateFeePreview() {
  const code    = gv('sf_course');
  const feeType = gr('sf_feeType') || 'monthly';
  const waiver  = parseInt(document.getElementById('sf_waiver').value) || 0;
  const preview = document.getElementById('sfFeePreview');
  if (!code) {
    preview.innerHTML = '<p style="color:var(--muted);font-size:.84rem;">\u2190 Select a course to see fee details.</p>';
    return;
  }
  const course = getCourse(code);
  if (!course) return;
  const baseFeePerPeriod  = feeType === 'yearly' ? (course.yearly_fee || 0) : (course.monthly_fee || 0);
  const periods           = feeType === 'yearly' ? (course.duration || 1) : courseDurationMonths(course);
  const perPeriodAfterWaiver = Math.max(0, baseFeePerPeriod - waiver);
  const label             = feeType === 'yearly' ? 'year' : 'month';
  if (baseFeePerPeriod === 0) {
    preview.innerHTML = '<p style="color:var(--warning);font-size:.84rem;">\u26a0\ufe0f Fee not set for this course. Ask admin to configure it.</p>';
    return;
  }
  preview.innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center;">' +
      '<div style="background:#f0fdf4;border-radius:8px;padding:12px;"><div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;margin-bottom:4px;">Fee per ' + label + '</div><div style="font-size:1.1rem;font-weight:800;color:var(--success);">\u20b9' + baseFeePerPeriod.toLocaleString() + '</div></div>' +
      '<div style="background:#fefce8;border-radius:8px;padding:12px;"><div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;margin-bottom:4px;">Waiver per ' + label + '</div><div style="font-size:1.1rem;font-weight:800;color:var(--warning);">- \u20b9' + waiver.toLocaleString() + '</div></div>' +
      '<div style="background:#eff6ff;border-radius:8px;padding:12px;"><div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;margin-bottom:4px;">Payable per ' + label + '</div><div style="font-size:1.1rem;font-weight:800;color:var(--primary);">\u20b9' + perPeriodAfterWaiver.toLocaleString() + '</div></div>' +
    '</div>' +
    '<p style="font-size:.78rem;color:var(--muted);margin-top:10px;">\ud83d\udca1 ' + periods + ' installments of \u20b9' + perPeriodAfterWaiver.toLocaleString() + ' per ' + label + '. First due on admission date, same date every ' + label + '.</p>';
}

function openAddStudentModal() {
  editStudentId = null; profilePhotoData = null;
  resetStudentForm();
  document.getElementById('studentFormTitle').textContent     = '\u2795 Add New Student';
  document.getElementById('studentFormSubmitBtn').textContent = '\u2714 Save Student';
  document.getElementById('studentFormModal').classList.add('open');
  var ml = document.querySelector('.modal-lg'); if (ml) ml.scrollTop = 0;
}

function openEditStudentModal(id) {
  const st = STUDENTS.find(function(s) { return s.id === id; });
  if (!st) return;
  editStudentId    = id;
  profilePhotoData = st.photo || null;
  resetStudentForm();
  populateStudentForm(st);
  document.getElementById('studentFormTitle').textContent     = '\u270f\ufe0f Edit Student: ' + st.name;
  document.getElementById('studentFormSubmitBtn').textContent = '\u2714 Update Student';
  document.getElementById('studentFormModal').classList.add('open');
  var ml = document.querySelector('.modal-lg'); if (ml) ml.scrollTop = 0;
}

function closeStudentFormModalSafe() {
  const hasData = gv('sf_name') || gv('sf_contact');
  if (hasData && !editStudentId) {
    if (!confirm('You have unsaved data. Are you sure you want to close?')) return;
  }
  document.getElementById('studentFormModal').classList.remove('open');
  editStudentId = null;
}

function resetStudentForm() {
  populateCourseDropdown('sf_course', '');
  ['sf_name','sf_contact','sf_address','sf_aadhaar','sf_dob','sf_admissionDate','sf_fatherName','sf_fatherMobile'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = '';
    var er = document.getElementById('err_' + id); if (er) er.classList.remove('show');
  });
  // Default admission date to today
  var adEl = document.getElementById('sf_admissionDate');
  if (adEl) adEl.value = new Date().toISOString().split('T')[0];
  var rr = document.getElementById('sf_rollRow'); if (rr) rr.style.display = '';
  var rd = document.getElementById('sf_rollDisplay');
  if (rd) { rd.value = ''; rd.readOnly = false; rd.style.background = ''; rd.style.color = ''; }
  var rl = document.getElementById('sf_rollLabel');
  if (rl) rl.innerHTML = 'Roll Number <span style="font-size:.74rem;color:var(--muted);font-weight:400;">(leave blank to auto-assign)</span>';
  var wv = document.getElementById('sf_waiver'); if (wv) wv.value = '0';
  document.querySelectorAll('.input-error').forEach(function(el) { el.classList.remove('input-error'); });
  var mt = document.querySelector('input[name="sf_feeType"][value="monthly"]');
  if (mt) mt.checked = true;
  var pb = document.getElementById('photoUploadBox');
  if (profilePhotoData) {
    pb.innerHTML = '<img src="' + profilePhotoData + '" alt="Photo" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">';
  } else {
    pb.innerHTML = '<div style="font-size:1.6rem;">\ud83d\udcf7</div><div style="font-size:.7rem;color:var(--muted);text-align:center;padding:4px 6px;line-height:1.4;">Click to upload</div>';
  }
  var pi = document.getElementById('profilePhotoInput'); if (pi) pi.value = '';
  updateFeePreview();
}

function populateStudentForm(st) {
  populateCourseDropdown('sf_course', st.course);
  var sv = function(id, val) { var el = document.getElementById(id); if (el && val != null) el.value = val; };
  sv('sf_name',          st.name);
  sv('sf_dob',           st.dob || '');
  sv('sf_admissionDate', st.admissionDate || new Date().toISOString().split('T')[0]);
  sv('sf_contact',       st.contact);
  sv('sf_address',      st.address);
  sv('sf_aadhaar',      st.aadhaar);
  sv('sf_fatherName',   st.fatherName);
  sv('sf_fatherMobile', st.fatherMobile);
  sv('sf_waiver',       st.waiverAmount || 0);
  var ftEl = document.querySelector('input[name="sf_feeType"][value="' + (st.feeType || 'monthly') + '"]');
  if (ftEl) ftEl.checked = true;
  // Show roll number as readonly for existing students
  var rr = document.getElementById('sf_rollRow');
  var rd = document.getElementById('sf_rollDisplay');
  var rl = document.getElementById('sf_rollLabel');
  if (rr) rr.style.display = '';
  if (rd) { rd.value = st.id || ''; rd.readOnly = true; rd.style.background = 'var(--surface)'; rd.style.color = 'var(--primary)'; }
  if (rl) rl.innerHTML = 'Roll Number';
  updateFeePreview();
}

function handlePhotoUpload(e) {
  var file = e.target.files[0]; if (!file) return;
  if (file.size > 2 * 1024 * 1024) { alert('Photo must be under 2MB.'); return; }
  var r = new FileReader();
  r.onload = function(ev) {
    profilePhotoData = ev.target.result;
    document.getElementById('photoUploadBox').innerHTML = '<img src="' + profilePhotoData + '" alt="Photo" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">';
  };
  r.readAsDataURL(file);
}

function clearPhoto() {
  profilePhotoData = null;
  document.getElementById('photoUploadBox').innerHTML = '<div style="font-size:1.6rem;">\ud83d\udcf7</div><div style="font-size:.7rem;color:var(--muted);text-align:center;padding:4px 6px;line-height:1.4;">Click to upload</div>';
  var pi = document.getElementById('profilePhotoInput'); if (pi) pi.value = '';
}

// ============================================================
// SUBMIT
// ============================================================
async function submitStudentForm() {
  let valid = true;
  function fieldErr(inputId, errId, condition) {
    markInput(inputId, condition); showFieldError(errId, condition);
    if (condition && valid) { valid = false; const el = document.getElementById(inputId); if (el) el.focus(); }
  }

  const name = gv('sf_name');
  fieldErr('sf_name', 'err_sf_name', !name || name.length < 2 || name.length > 80);

  const code = gv('sf_course');
  if (!code) { alert('Please select a Course.'); valid = false; }

  const contact = gv('sf_contact');
  fieldErr('sf_contact', 'err_sf_contact', valid && (!contact || !validateMobile(contact)));

  const address = gv('sf_address');
  fieldErr('sf_address', 'err_sf_address', !address || address.trim().length < 5);

  const aadhaar = gv('sf_aadhaar');
  fieldErr('sf_aadhaar', 'err_sf_aadhaar', !aadhaar || !validateAadhaar(aadhaar));

  const dob = gv('sf_dob');
  fieldErr('sf_dob', 'err_sf_dob', !dob);

  const fatherName = gv('sf_fatherName');
  fieldErr('sf_fatherName', 'err_sf_fatherName', !fatherName);

  const fatherMobile = gv('sf_fatherMobile');
  fieldErr('sf_fatherMobile', 'err_sf_fatherMobile', !fatherMobile || !validateMobile(fatherMobile));

  if (!valid) return;

  const feeType  = gr('sf_feeType') || 'monthly';
  const waiver   = parseInt(document.getElementById('sf_waiver').value) || 0;
  const course   = getCourse(code);
  const basePerP = feeType === 'yearly' ? (course ? course.yearly_fee || 0 : 0) : (course ? course.monthly_fee || 0 : 0);
  const periods  = feeType === 'yearly' ? (course ? course.duration || 1 : 1) : (course ? courseDurationMonths(course) : 12);
  const totalBase = basePerP * periods;

  if (basePerP === 0 && !editStudentId) {
    alert('No fee set for this course. Please configure it in Admin > Fee Structure first.');
    return;
  }
  if (waiver > totalBase) {
    alert('Waiver cannot exceed total fees.');
    return;
  }

  var manualRoll = (document.getElementById('sf_rollDisplay') || {}).value;
  if (manualRoll) manualRoll = manualRoll.trim(); else manualRoll = '';
  const d = {
    name, course: code, contact, address: gv('sf_address'),
    dob: gv('sf_dob') || null,
    admissionDate: gv('sf_admissionDate') || new Date().toISOString().split('T')[0],
    fatherName, fatherMobile, aadhaar,
    feeType, waiverAmount: waiver,
    photo: profilePhotoData,
    manualRollNumber: editStudentId ? null : (manualRoll || null),
  };

  const btn = document.getElementById('studentFormSubmitBtn');
  if (btn) btn.disabled = true;
  try {
    if (editStudentId) {
      const updated = await api('/students/' + editStudentId, 'PUT', d);
      const idx = STUDENTS.findIndex(function(s) { return s.id === editStudentId; });
      if (idx !== -1) STUDENTS[idx] = updated;
    } else {
      const created = await api('/students', 'POST', d);
      STUDENTS.push(created);
      document.getElementById('studentFormModal').classList.remove('open');
      editStudentId = null;
      showStudentTable(created.course);
      initDashboard();
      return;
    }
    document.getElementById('studentFormModal').classList.remove('open');
    editStudentId = null;
    renderStudents();
    initDashboard();
  } catch (e) {
    alert('Error saving student: ' + e.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ============================================================
// DELETE
// ============================================================
let deleteStudentId = null;

function openConfirmDelete(id) {
  const st = STUDENTS.find(function(s) { return s.id === id; }); if (!st) return;
  deleteStudentId = id;
  document.getElementById('deleteStudentName').textContent = st.name + ' (' + st.id + ')';
  document.getElementById('confirmDeleteModal').classList.add('open');
}
function closeConfirmDelete() {
  document.getElementById('confirmDeleteModal').classList.remove('open');
  deleteStudentId = null;
}
async function confirmDelete() {
  if (!deleteStudentId) return;
  try {
    await api('/students/' + deleteStudentId, 'DELETE');
    const idx = STUDENTS.findIndex(function(s) { return s.id === deleteStudentId; });
    if (idx !== -1) STUDENTS.splice(idx, 1);
    closeConfirmDelete(); renderStudents(); initDashboard();
  } catch (e) { alert('Error deleting student: ' + e.message); }
}
