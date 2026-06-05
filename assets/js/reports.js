// ============================================================
// REPORTS PAGE
// ============================================================
var _reportsData = null;
var _admChart = null;

async function initReports() {
  var sel = document.getElementById('reportYear');
  if (!sel) return;
  if (!sel.options.length) {
    var yr = new Date().getFullYear();
    for (var y = yr; y >= yr - 3; y--) {
      sel.innerHTML += '<option value="' + y + '">' + y + '</option>';
    }
  }
  await loadReports();
}

async function loadReports() {
  var sel = document.getElementById('reportYear');
  var year = (sel ? sel.value : '') || new Date().getFullYear();
  var errEl = document.getElementById('reportsError');
  if (errEl) errEl.style.display = 'none';
  try {
    _reportsData = await api('/reports?year=' + year);
  } catch(e) {
    if (errEl) { errEl.textContent = 'Failed to load reports: ' + e.message; errEl.style.display = 'block'; }
    console.error(e);
    return;
  }
  // Update stats first (separate try so chart error doesn't hide them)
  try { renderReportStats(_reportsData); } catch(e) { console.error('stat error', e); }
  try { renderReportChart(_reportsData); } catch(e) { console.error('chart error', e); }
  try { renderReportTables(_reportsData); } catch(e) { console.error('table error', e); }
}

function renderReports(d) {
  renderReportStats(d);
  try { renderReportChart(d); } catch(e) { console.error('chart error', e); }
  renderReportTables(d);
}

function renderReportStats(d) {
  var rThis = document.getElementById('rThisMonth');
  var rLast = document.getElementById('rLastMonth');
  var rTot  = document.getElementById('rTotal');
  var rPend = document.getElementById('rPending');
  var rYear = document.getElementById('rChartYear');
  if (rThis) rThis.textContent = '₹' + (d.thisMonth||0).toLocaleString('en-IN');
  if (rLast) rLast.textContent = '₹' + (d.lastMonth||0).toLocaleString('en-IN');
  if (rTot)  rTot.textContent  = '₹' + (d.totalCollected||0).toLocaleString('en-IN');
  if (rPend) rPend.textContent = '₹' + (d.totalDue||0).toLocaleString('en-IN');
  if (rYear) rYear.textContent = d.year;
}

function renderReportChart(d) {
  // Monthly admissions chart
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var counts  = (d.monthlyAdmissions || []).map(function(m){ return m.count; });
  var chartEl = document.getElementById('admissionsChart');
  if (!chartEl) return;
  if (typeof Chart === 'undefined') {
    chartEl.parentNode.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);">Chart.js not loaded — check your internet connection.</div>';
    return;
  }
  var ctx = chartEl.getContext('2d');
  if (_admChart) _admChart.destroy();
  _admChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: 'Students Enrolled',
        data: counts,
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}

function renderReportTables(d) {

  // Course-wise table
  var cwEl = document.getElementById('courseWiseTable');
  if (cwEl) {
    cwEl.innerHTML = (d.courseWise || []).map(function(c) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">' +
        '<div><span class="badge badge-primary">' + c.course + '</span><span style="margin-left:8px;font-size:.82rem;color:var(--muted);">' + c.studentCount + ' students</span></div>' +
        '<div style="font-weight:700;color:var(--success);">₹' + (c.collected||0).toLocaleString('en-IN') + '</div>' +
      '</div>';
    }).join('') || '<div style="color:var(--muted);text-align:center;padding:20px;">No data</div>';
  }

  // Serious defaulters
  var sdEl = document.getElementById('seriousDefaultersTable');
  if (sdEl) {
    sdEl.innerHTML = (d.seriousDefaulters || []).map(function(s) {
      return '<div style="padding:10px 0;border-bottom:1px solid var(--border);">' +
        '<div style="display:flex;justify-content:space-between;">' +
          '<div style="font-weight:600;">' + s.name + '</div>' +
          '<div style="color:var(--danger);font-weight:700;">₹' + s.due.toLocaleString('en-IN') + '</div>' +
        '</div>' +
        '<div style="font-size:.78rem;color:var(--muted);">' + s.course + ' · ' + s.monthsOverdue + ' months overdue · ' + (s.contact||'–') + '</div>' +
      '</div>';
    }).join('') || '<div style="color:var(--success);text-align:center;padding:20px;">✓ No serious defaulters</div>';
  }
}

function exportReportsCSV() {
  if (!_reportsData) { alert('Load reports first'); return; }
  var rows = [['Course','Students','Collected (₹)']];
  (_reportsData.courseWise || []).forEach(function(c) {
    rows.push([c.course, c.studentCount, c.collected]);
  });
  rows.push([]);
  rows.push(['Serious Defaulters']);
  rows.push(['Roll No','Name','Course','Months Overdue','Due (₹)','Contact']);
  (_reportsData.seriousDefaulters || []).forEach(function(s) {
    rows.push([s.id, s.name, s.course, s.monthsOverdue, s.due, s.contact]);
  });
  var csv = rows.map(function(r){ return r.join(','); }).join('\n');
  var a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'edunova-report-' + (_reportsData.year) + '.csv';
  document.body.appendChild(a); a.click();
  setTimeout(function(){ document.body.removeChild(a); }, 100);
}
