// ============================================================
// FEE COLLECTION MODAL — Cash only
// ============================================================
let feeStudentId = null, _feeStudent = null, _feePayMode = 'cash';

async function openFeeModal(id) {
  var st = STUDENTS.find(s => s.id === id);
  if (!st) {
    try { st = await api('/students/' + id); } catch(e) { return; }
  }
  if (!st) return;
  feeStudentId = id; _feeStudent = st;
  const remainingDue = st.due;
  document.getElementById('feeInfoBox').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px 12px;font-size:.81rem;">
      <div><span style="color:var(--primary);font-weight:700;">Student</span><br>${st.name}</div>
      <div><span style="color:var(--primary);font-weight:700;">Course</span><br>${st.course} &mdash; ${st.feeType === 'yearly' ? 'Yearly' : 'Monthly'} plan</div>
      <div><span style="color:var(--primary);font-weight:700;">Total Fees</span><br>${st.feeType === 'yearly' ? '₹' + st.totalFees.toLocaleString() : '–'}</div>
      <div><span style="color:var(--success);font-weight:700;">Total Paid</span><br>₹${st.paid.toLocaleString()}</div>
      <div><span style="color:var(--danger);font-weight:700;">Balance Due</span><br>₹${st.due.toLocaleString()}</div>
      <div><span style="color:var(--primary);font-weight:700;">Waiver</span><br>₹${(st.waiverAmount || 0).toLocaleString()}</div>
    </div>`;
  document.getElementById('installmentRows').innerHTML = st.installments.map(inst => `
    <div class="installment-row ${inst.paid ? 'inst-paid' : inst.partial ? 'inst-overdue' : 'inst-due'}">
      <div style="font-weight:700;">${inst.num}</div>
      <div>₹${inst.amount.toLocaleString()}</div>
      <div style="font-size:.76rem;">${fmtDate(inst.dueDate)}</div>
      <div>${inst.paid ? '<span class="badge badge-success">Paid</span>' : inst.partial ? '<span class="badge badge-warning">Partial</span>' : '<span class="badge badge-danger">Due</span>'}</div>
      <div style="font-size:.76rem;color:var(--muted);">${inst.paidDate ? fmtDate(inst.paidDate) : '—'}</div>
    </div>`).join('');
  const nextInst = (st.installments || []).find(function(i) { return !i.paid; });
  const nextAmt  = nextInst ? nextInst.amount - (nextInst.paidAmount || 0) : remainingDue;
  document.getElementById('feeHint').textContent = 'Next installment: \u20b9' + nextAmt.toLocaleString() + ' \u00b7 Max: \u20b9' + remainingDue.toLocaleString();
  document.getElementById('feeAmount').value = '';
  document.getElementById('feeAmount').max = remainingDue;
  document.getElementById('err_feeAmount').classList.remove('show');
  document.getElementById('err_feeAmount').textContent = '';
  // Default payment date to today, allow past dates
  var pd = document.getElementById('feePaymentDate');
  if (pd) { pd.value = new Date().toISOString().split('T')[0]; pd.max = new Date().toISOString().split('T')[0]; }
  switchPayMode('cash');
  document.getElementById('feeModal').classList.add('open');
}

function closeFeeModal() {
  document.getElementById('feeModal').classList.remove('open');
  feeStudentId = null; _feeStudent = null;
}

function switchPayMode(mode) {
  _feePayMode = mode;
  var isCash = mode === 'cash';
  document.getElementById('tabCash').style.background    = isCash ? '#2563eb' : '#f1f5f9';
  document.getElementById('tabCash').style.color         = isCash ? '#fff'    : '#475569';
  document.getElementById('tabOnline').style.background  = isCash ? '#f1f5f9' : '#5855e5';
  document.getElementById('tabOnline').style.color       = isCash ? '#475569' : '#fff';
  document.getElementById('cashSection').style.display   = isCash ? '' : 'none';
  document.getElementById('onlineSection').style.display = isCash ? 'none' : '';
  document.getElementById('submitCashBtn').style.display   = isCash ? '' : 'none';
  document.getElementById('submitOnlineBtn').style.display = isCash ? 'none' : '';
}

async function submitFeeRazorpay() {
  var v = validateFeeAmount();
  if (!v) return;
  if (typeof Razorpay === 'undefined') {
    alert('Razorpay SDK not loaded. Check your internet connection and try again.');
    return;
  }
  var btn = document.getElementById('submitOnlineBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Opening Razorpay…'; }
  try {
    var keyRes = await api('/payments/razorpay-key');
    var options = {
      key:         keyRes.key_id,
      amount:      v.amt * 100,
      currency:    'INR',
      name:        'EduNova',
      description: 'Fee payment — ' + v.st.name + ' (' + v.st.course + ')',
      prefill: {
        name:    v.st.name,
        contact: v.st.contact || v.st.fatherMobile || '',
      },
      theme: { color: '#2563eb' },
      handler: async function(response) {
        try {
          var txn = await api('/payments', 'POST', {
            studentId:    feeStudentId,
            amount:       v.amt,
            method:       'Online / Razorpay',
            razorpayData: {
              payment_id: response.razorpay_payment_id,
              order_id:   response.razorpay_order_id  || '',
              signature:  response.razorpay_signature || '',
            }
          });
          var updatedSt = await api('/students/' + feeStudentId);
          var idx = STUDENTS.findIndex(function(s) { return s.id === feeStudentId; });
          if (idx !== -1) STUDENTS[idx] = updatedSt;
          var paidCount = updatedSt.installments.filter(function(i) { return i.paid; }).length;
          var txnFull   = Object.assign({}, txn, { installmentNum: paidCount });
          closeFeeModal();
          renderStudents();
          initDashboard();
          showReceiptModal(txnFull, updatedSt);
        } catch(e) {
          alert('Payment captured by Razorpay but failed to record locally: ' + e.message);
        }
      },
      modal: {
        ondismiss: function() {
          if (btn) { btn.disabled = false; btn.textContent = '🔒 Pay via Razorpay'; }
        }
      }
    };
    var rzp = new Razorpay(options);
    rzp.open();
  } catch(e) {
    alert('Razorpay error: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = '🔒 Pay via Razorpay'; }
  }
}

function validateAmountLive() {
  const st  = _feeStudent || STUDENTS.find(s => s.id === feeStudentId);
  if (!st) return;
  const raw = document.getElementById('feeAmount').value;
  const amt = parseInt(raw);
  const errEl = document.getElementById('err_feeAmount');
  if (!raw || isNaN(amt) || amt <= 0) {
    errEl.textContent = 'Please enter a positive whole number.'; errEl.classList.add('show');
  } else if (amt > st.due) {
    errEl.textContent = 'Amount cannot exceed balance due ₹' + st.due.toLocaleString() + '.'; errEl.classList.add('show');
  } else {
    errEl.classList.remove('show');
  }
}

function validateFeeAmount() {
  const st     = _feeStudent || STUDENTS.find(s => s.id === feeStudentId);
  if (!st) return null;
  const raw    = document.getElementById('feeAmount').value;
  const amt    = parseInt(raw);
  const errEl  = document.getElementById('err_feeAmount');
  if (!raw || isNaN(amt) || amt <= 0) {
    errEl.textContent = 'Please enter a valid amount.'; errEl.classList.add('show');
    document.getElementById('feeAmount').focus(); return null;
  }
  if (amt > st.due) {
    errEl.textContent = 'Amount cannot exceed balance due ₹' + st.due.toLocaleString() + '.'; errEl.classList.add('show');
    document.getElementById('feeAmount').focus(); return null;
  }
  errEl.classList.remove('show');
  return { st, amt };
}

async function submitFeeCash() {
  const v = validateFeeAmount();
  if (!v) return;
  const btn = document.getElementById('submitCashBtn');
  if (btn) btn.disabled = true;
  try {
    var pdEl = document.getElementById('feePaymentDate');
    var paymentDate = (pdEl && pdEl.value) ? pdEl.value : new Date().toISOString().split('T')[0];
    var method = (document.getElementById('feeMethod') || {}).value || 'Cash';
    const txn       = await api('/payments', 'POST', { studentId: feeStudentId, amount: v.amt, method, paymentDate });
    const updatedSt = await api('/students/' + feeStudentId);
    const idx = STUDENTS.findIndex(s => s.id === feeStudentId);
    if (idx !== -1) STUDENTS[idx] = updatedSt;
    const paidCount = updatedSt.installments.filter(i => i.paid).length;
    const txnFull   = Object.assign({}, txn, { installmentNum: paidCount });
    closeFeeModal();
    renderStudents();
    initDashboard();
    showReceiptModal(txnFull, updatedSt);
  } catch (e) {
    alert('Payment error: ' + e.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ─── Receipt modal ────────────────────────────────────────────────────────────
let currentReceiptTxn = null, currentReceiptSt = null;

function showReceiptModal(txn, st) {
  currentReceiptTxn = txn; currentReceiptSt = st;
  document.getElementById('receiptPaper').innerHTML = buildReceiptHTML(txn, st);
  document.getElementById('receiptModal').classList.add('open');
}
function openReceiptModal(txn, st) { showReceiptModal(txn, st); }
function closeReceiptModal() {
  document.getElementById('receiptModal').classList.remove('open');
  currentReceiptTxn = null; currentReceiptSt = null;
}

function buildReceiptHTML(txn, st) {
  const now        = new Date();
  const receiptDate = txn.date ? new Date(txn.date + 'T00:00:00') : now;
  const dateStr    = receiptDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr    = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const paidInWords = numberToWords(Math.round(txn.amount));
  const progress   = (st.feeType === 'yearly' && st.totalFees > 0) ? Math.round((st.paid / st.totalFees) * 100) : 0;
  const progressW  = Math.min(progress, 100);
  const methodLabel = txn.method || 'Cash';
  const methodIcon  = methodLabel === 'Online / Razorpay' ? '📱' : (methodLabel === 'DD' ? '🏦' : '💵');
  return `<div style="font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a202c;font-size:13px;line-height:1.5;">
  <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#3b82f6 100%);padding:22px 24px 18px;position:relative;overflow:hidden;">
    <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;background:rgba(255,255,255,.07);border-radius:50%;"></div>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
      <div style="background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.35);border-radius:50%;width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">💻</div>
      <div><div style="color:#fff;font-size:18px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;">EduNova</div><div style="color:rgba(255,255,255,.75);font-size:11px;">Professional IT Training Centre</div></div>
      <div style="margin-left:auto;background:#22c55e;color:#fff;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;border-radius:20px;white-space:nowrap;">✔ PAID</div>
    </div>
    <div style="display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:6px;">
      <div><div style="color:rgba(255,255,255,.7);font-size:10px;letter-spacing:1px;text-transform:uppercase;">Fee Payment Receipt</div><div style="color:#fff;font-size:13px;font-weight:700;font-family:monospace;margin-top:1px;">${txn.txnId}</div></div>
      <div style="text-align:right;"><div style="color:rgba(255,255,255,.7);font-size:10px;">${dateStr}</div><div style="color:rgba(255,255,255,.6);font-size:10px;">${timeStr}</div></div>
    </div>
  </div>
  <div style="background:#f0f7ff;border-bottom:2px solid #dbeafe;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
    <div>
      <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:2px;">Amount Paid</div>
      <div style="font-size:30px;font-weight:900;color:#1e3a8a;letter-spacing:-1px;">₹${Math.round(txn.amount).toLocaleString()}</div>
      <div style="font-size:10.5px;color:#475569;margin-top:3px;font-style:italic;">${paidInWords} Rupees Only</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">Payment Mode</div>
      <div style="background:#1e3a8a;color:#fff;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;display:inline-block;">${methodIcon} ${methodLabel}</div>
    </div>
  </div>
  <div style="padding:14px 24px 0;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
      <div style="padding:12px 14px;border-right:1px solid #e2e8f0;">
        <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.8px;color:#94a3b8;margin-bottom:6px;font-weight:700;">Student Details</div>
        <div style="font-weight:800;font-size:14px;">${st.name}</div>
        <div style="font-size:11px;color:#475569;margin-top:2px;">ID: <span style="font-family:monospace;font-weight:600;">${st.id}</span></div>
        ${st.fatherName ? `<div style="font-size:11px;color:#475569;">Father: <strong>${st.fatherName}</strong></div>` : ''}
      </div>
      <div style="padding:12px 14px;background:#fafbff;">
        <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.8px;color:#94a3b8;margin-bottom:6px;font-weight:700;">Course Details</div>
        <div style="font-weight:800;font-size:13px;color:#1e3a8a;">${st.course}</div>
        <div style="font-size:11px;color:#475569;">Plan: <strong>${st.feeType === 'yearly' ? 'Yearly' : 'Monthly'}</strong></div>
        <div style="font-size:11px;color:#475569;">Installment: <strong>${txn.installmentNum || '—'}</strong></div>
      </div>
    </div>
  </div>
  <div style="padding:14px 24px 0;">
    <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.8px;color:#94a3b8;font-weight:700;margin-bottom:8px;">Fee Summary</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <tr style="background:#f8fafc;"><td style="padding:8px 12px;border:1px solid #e2e8f0;color:#64748b;">Total Course Fees</td><td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;font-weight:700;">${st.feeType === 'yearly' ? '₹' + st.totalFees.toLocaleString() : '—'}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;color:#64748b;">Previously Paid</td><td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#16a34a;">₹${(st.paid - txn.amount).toLocaleString()}</td></tr>
      <tr style="background:#eff6ff;"><td style="padding:8px 12px;border:1px solid #bfdbfe;font-weight:700;color:#1e3a8a;">This Payment</td><td style="padding:8px 12px;border:1px solid #bfdbfe;text-align:right;font-weight:800;color:#1e3a8a;font-size:13px;">₹${Math.round(txn.amount).toLocaleString()}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;color:#64748b;">Total Paid to Date</td><td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#16a34a;">₹${st.paid.toLocaleString()}</td></tr>
      <tr style="background:${st.due <= 0 ? '#f0fdf4' : '#fff7ed'};"><td style="padding:8px 12px;border:1px solid ${st.due <= 0 ? '#bbf7d0' : '#fed7aa'};font-weight:700;color:${st.due <= 0 ? '#15803d' : '#c2410c'};">Balance Remaining</td><td style="padding:8px 12px;border:1px solid ${st.due <= 0 ? '#bbf7d0' : '#fed7aa'};text-align:right;font-weight:800;color:${st.due <= 0 ? '#15803d' : '#c2410c'};">₹${st.due.toLocaleString()}</td></tr>
    </table>
  </div>
  <div style="padding:14px 24px 0;">
    <div style="display:flex;justify-content:space-between;font-size:10.5px;color:#64748b;margin-bottom:4px;"><span>Payment Progress</span><span style="font-weight:700;color:#1e3a8a;">${progress}% Complete</span></div>
    <div style="background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;"><div style="background:linear-gradient(90deg,#2563eb,#22c55e);height:100%;width:${progressW}%;border-radius:99px;"></div></div>
  </div>
  <div style="margin:16px 24px 0;border-top:1.5px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;"><span style="background:#fff;padding:0 8px;font-size:11px;color:#94a3b8;margin-top:-10px;">✂ Retain for your records</span></div>
  <div style="padding:10px 24px 16px;font-size:9.5px;color:#94a3b8;"><div>💻 EduNova · Fee Section</div><div>This is a system-generated receipt · No signature required</div></div>
</div>`;
}

function numberToWords(n) {
  n = Math.round(Math.abs(n));
  if (n === 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function helper(num) {
    if (num === 0) return '';
    if (num < 20) return ones[num] + ' ';
    if (num < 100) return tens[Math.floor(num / 10)] + ' ' + (num % 10 ? ones[num % 10] + ' ' : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred ' + (num % 100 ? helper(num % 100) : '');
    if (num < 100000) return helper(Math.floor(num / 1000)) + 'Thousand ' + (num % 1000 ? helper(num % 1000) : '');
    if (num < 10000000) return helper(Math.floor(num / 100000)) + 'Lakh ' + (num % 100000 ? helper(num % 100000) : '');
    return helper(Math.floor(num / 10000000)) + 'Crore ' + (num % 10000000 ? helper(num % 10000000) : '');
  }
  return helper(n).trim();
}

function printReceipt() {
  const paper = document.getElementById('receiptPaper');
  const area  = document.getElementById('printReceiptArea');
  area.innerHTML = `<div style="max-width:520px;margin:0 auto;">${paper.innerHTML}</div>`;
  area.style.display = 'block';
  window.print();
  setTimeout(() => { area.style.display = 'none'; area.innerHTML = ''; }, 1000);
}

// ============================================================
// PAYMENTS PAGE — simple list of who paid and when
// ============================================================
async function initPayments() {
  document.getElementById('searchPayment').value = '';
  try {
    PAYMENTS = await api('/payments');
  } catch (e) {
    console.error('Payments load error:', e);
    PAYMENTS = [];
  }
  renderPayments();
}

function renderPayments() {
  const today     = new Date().toISOString().split('T')[0];
  const monthPfx  = today.slice(0, 7); // 'YYYY-MM'
  const allTime   = PAYMENTS.reduce((s, p) => s + (p.amount || 0), 0);
  const thisMonth = PAYMENTS.filter(p => (p.date || '').startsWith(monthPfx)).reduce((s, p) => s + (p.amount || 0), 0);
  const todayAmt  = PAYMENTS.filter(p => p.date === today).reduce((s, p) => s + (p.amount || 0), 0);
  const se = document.getElementById('stat-alltime');
  const sm = document.getElementById('stat-month');
  const st = document.getElementById('stat-today');
  if (se) se.textContent = '₹' + allTime.toLocaleString();
  if (sm) sm.textContent = '₹' + thisMonth.toLocaleString();
  if (st) st.textContent = '₹' + todayAmt.toLocaleString();

  const q = (document.getElementById('searchPayment').value || '').toLowerCase();
  const f = PAYMENTS.filter(p =>
    !q || p.studentName.toLowerCase().includes(q) || p.studentId.toLowerCase().includes(q) || (p.course || '').toLowerCase().includes(q)
  );
  document.getElementById('paymentsSummary').textContent = `Showing ${f.length} payment${f.length !== 1 ? 's' : ''}`;
  const tb = document.getElementById('paymentsBody');
  if (!f.length) { tb.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--muted);">No payments found</td></tr>`; return; }
  tb.innerHTML = f.map(p => `<tr>
    <td style="font-family:monospace;font-size:.76rem;color:var(--muted);">${p.txnId}</td>
    <td><div style="font-weight:600;">${p.studentName}</div><div style="font-size:.74rem;color:var(--muted);">${p.studentId}</div></td>
    <td><span class="badge badge-primary">${p.course || '–'}</span></td>
    <td style="font-weight:700;color:var(--success);">₹${p.amount.toLocaleString()}</td>
    <td style="font-size:.78rem;">${fmtDate(p.date)}<br><span style="color:var(--muted);font-size:.72rem;">${p.displayTime || ''}</span></td>
    <td><span class="badge badge-success">✔ Paid</span></td>
  </tr>`).join('');
}

function renderReceiptPaper(txn, st) { return buildReceiptHTML(txn, st); }

// ============================================================
// EXCEL / CSV EXPORT
// ============================================================
function downloadPaymentsExcel(filter) {
  try {
    var todayStr = new Date().toISOString().split('T')[0];
    var monthPfx = todayStr.slice(0, 7);
    var yearPfx  = todayStr.slice(0, 4);

    // Student lookup
    var stuMap = {};
    (STUDENTS || []).forEach(function(s) { stuMap[s.id] = s; });

    // Filter
    var filtered = (PAYMENTS || []).slice();
    var label    = 'All_Records';

    if (filter === 'month') {
      filtered = filtered.filter(function(p) { return (p.date || '').slice(0,7) === monthPfx; });
      label    = 'Month_' + monthPfx;
    } else if (filter === 'year') {
      filtered = filtered.filter(function(p) { return (p.date || '').slice(0,4) === yearPfx; });
      label    = 'Year_' + yearPfx;
    } else if (filter === 'range') {
      var from = (document.getElementById('dlFrom').value || '').trim();
      var to   = (document.getElementById('dlTo').value   || '').trim();
      if (!from || !to) { alert('Please select both From and To dates.'); return; }
      if (from > to)    { alert('"From" date cannot be after "To" date.'); return; }
      filtered = filtered.filter(function(p) { return p.date >= from && p.date <= to; });
      label    = 'Range_' + from + '_to_' + to;
    }

    if (!filtered.length) {
      alert('No payment records found for the selected period.');
      return;
    }

    // Build CSV
    function esc(v) {
      var s = String(v == null ? '' : v);
      return (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0)
        ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    var lines = ['Roll Number,Student Name,Course,Payment Date,Payment Time,Amount Paid (Rs),Total Paid Till Now (Rs),Total Fees (Rs),Fees Left (Rs)'];
    filtered.forEach(function(p) {
      var s = stuMap[p.studentId] || {};
      lines.push([esc(p.studentId), esc(p.studentName), esc(p.course||''), esc(p.date||''), esc(p.displayTime||''), esc(p.amount||0), esc(s.paid||0), esc(s.totalFees||0), esc(s.due||0)].join(','));
    });

    var csv  = '\uFEFF' + lines.join('\r\n');
    var fname = 'EduNova_Payments_' + label + '.csv';

    // Download via data URI (most compatible)
    var a = document.createElement('a');
    a.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    a.setAttribute('download', fname);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() { document.body.removeChild(a); }, 100);

  } catch(err) {
    alert('Download error: ' + err.message);
  }
}
