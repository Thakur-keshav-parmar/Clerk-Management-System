// ============================================================
// CORE — global state + API client
// ============================================================

// Global state — populated from API on each page init
let COURSES       = [];
let FEE_STRUCTURE = {};   // { courseCode: { "1": 45000, "2": 47000, ... } }
let STUDENTS      = [];
let PAYMENTS      = [];

// ─── API helper ───────────────────────────────────────────────────────────────
async function api(path, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (currentUser && currentUser.token) {
    headers['Authorization'] = 'Bearer ' + currentUser.token;
  }
  const opts = { method, headers };
  if (body !== null) opts.body = JSON.stringify(body);
  // Auto-detect base path so it works in any folder on any server
  var _base = (window._API_BASE !== undefined) ? window._API_BASE
    : window.location.pathname.replace(/\/[^/]*$/, '') + '/api';
  const res  = await fetch(_base + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Server error (' + res.status + ')');
  return data;
}

// ─── Course helpers ───────────────────────────────────────────────────────────
function getCourseFee(courseCode, semNum) {
  return (FEE_STRUCTURE[courseCode] || {})[String(semNum)] || 0;
}
function getCourse(code) {
  return COURSES.find(c => c.code === code);
}

// ─── Installment builder — used for fee preview display only ─────────────────
// (server generates the authoritative installment schedule)
function buildInstallments(totalFees) {
  if (!totalFees || totalFees <= 0) return [];
  const instAmt = Math.floor(totalFees / 4);
  const lastAmt = totalFees - instAmt * 3;
  const amounts = [instAmt, instAmt, instAmt, lastAmt];
  const today   = new Date();
  return amounts.map((amt, i) => {
    const due = new Date(today);
    due.setDate(due.getDate() + (i - 1) * 90);
    return {
      num: i + 1, amount: amt,
      dueDate: due.toISOString().split('T')[0],
      paid: false, partial: false, paidDate: null, paidAmount: 0,
    };
  });
}

// Kept for legacy references (ID is now server-generated)
let EDU_COUNTER = 1;
let TXN_COUNTER = 1000;
