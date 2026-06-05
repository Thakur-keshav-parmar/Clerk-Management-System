// ============================================================
// UTILS
// ============================================================
function fmtCurrency(n){if(n>=100000)return"₹"+(n/100000).toFixed(2)+"L";if(n>=1000)return"₹"+(n/1000).toFixed(1)+"K";return"₹"+n;}

function fmtDate(d){
  if(!d)return"—";
  const parts=String(d).split("T")[0].split("-");
  if(parts.length!==3)return String(d);
  const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(parts[2])} ${months[parseInt(parts[1])-1]} ${parts[0]}`;
}

function statusBadge(st){
  if(st.due<=0)return'<span class="badge badge-success">Fully Paid</span>';
  const paidInst=st.installments.filter(x=>x.paid).length;
  if(paidInst===0)return'<span class="badge badge-danger">No Payment</span>';
  return`<span class="badge badge-warning">${paidInst}/4 Installments</span>`;
}

function gv(id){const el=document.getElementById(id);return el?el.value.trim():"";}
function gr(name){const el=document.querySelector(`input[name="${name}"]:checked`);return el?el.value:"No";}

// ID is now generated server-side; kept as no-op for legacy references
function genId() { return ''; }

// ============================================================
// VALIDATION HELPERS
// ============================================================
function showFieldError(id,show){
  const el=document.getElementById(id);
  if(!el)return;
  if(show){el.classList.add('show');}else{el.classList.remove('show');}
}
function markInput(inputId,invalid){
  const el=document.getElementById(inputId);
  if(!el)return;
  if(invalid){el.classList.add('input-error');}else{el.classList.remove('input-error');}
}
function validateEmail(email){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);}
function validateMobile(mob){return /^[6-9]\d{9}$/.test(mob);}
function validatePin(pin){return /^\d{6}$/.test(pin);}
function validateAadhaar(val){const digits=val.replace(/\s/g,'');return digits===''||/^\d{12}$/.test(digits);}
function validateBatch(val){return /^\d{4}-\d{4}$/.test(val)&&parseInt(val.split('-')[1])>parseInt(val.split('-')[0]);}
function validateYear(val){const y=parseInt(val);return !isNaN(y)&&y>=1950&&y<=new Date().getFullYear();}
function validateDOB(val){
  if(!val)return false;
  const dob=new Date(val);
  const now=new Date();
  const minAge=new Date(now.getFullYear()-15,now.getMonth(),now.getDate());
  return dob<=minAge;
}

function formatAadhaar(input){
  let val=input.value.replace(/\D/g,'').slice(0,12);
  input.value=val.replace(/(\d{4})(?=\d)/g,'$1 ').trim();
}

function setDOBMax(){
  const el=document.getElementById('sf_dob');
  if(!el)return;
  const d=new Date();
  d.setFullYear(d.getFullYear()-15);
  el.max=d.toISOString().split('T')[0];
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(msg, type) {
  type = type || 'info';
  var colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb', warning: '#d97706' };
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;background:' + (colors[type]||colors.info) + ';color:#fff;padding:12px 20px;border-radius:10px;font-weight:600;font-size:.88rem;box-shadow:0 4px 20px rgba(0,0,0,.2);opacity:1;transition:opacity .4s;max-width:320px;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function(){ toast.style.opacity='0'; setTimeout(function(){ if(toast.parentNode) document.body.removeChild(toast); }, 400); }, 3000);
}

// ============================================================
// HAMBURGER NAV
// ============================================================
function toggleNav() {
  var links = document.getElementById('navLinks');
  var btn   = document.getElementById('hamburgerBtn');
  if (!links || !btn) return;
  var isOpen = links.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}
function closeNav() {
  var links = document.getElementById('navLinks');
  var btn   = document.getElementById('hamburgerBtn');
  if (!links || !btn) return;
  links.classList.remove('open');
  btn.classList.remove('open');
  document.body.style.overflow = '';
}
// Close nav when clicking outside
document.addEventListener('click', function(e) {
  var nav = document.getElementById('mainNav');
  if (nav && !nav.contains(e.target)) closeNav();
});
