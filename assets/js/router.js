// ============================================================
// ROUTING — role-based navigation
// admin: all pages
// clerk: all except settings, cannot delete students or edit fees
// teacher: only dashboard + students (read-only)
// ============================================================
let currentPage="dashboard",collectionChart=null;

function showLogin(){
  document.getElementById("mainNav").style.display="none";
  ["login","dashboard","students","payments","admin","dues","clearance","settings","reports"].forEach(p=>{const el=document.getElementById("page-"+p);if(el)el.style.display="none";});
  document.getElementById("page-login").style.display="block";
}

function showApp(){
  document.getElementById("page-login").style.display="none";
  document.getElementById("mainNav").style.display="flex";
  document.getElementById("navUserName").textContent=currentUser.name;
  document.getElementById("navAvatar").textContent=currentUser.name.charAt(0).toUpperCase();

  // Show/hide nav links based on role
  // nav-settings: admin only
  var settingsNav = document.getElementById("nav-settings");
  if (settingsNav) settingsNav.style.display = isAdmin() ? "" : "none";

  // nav-reports: admin + clerk
  var reportsNav = document.getElementById("nav-reports");
  if (reportsNav) reportsNav.style.display = canManage() ? "" : "none";

  // nav-payments: admin + clerk
  var paymentsNav = document.getElementById("nav-payments");
  if (paymentsNav) paymentsNav.style.display = canManage() ? "" : "none";

  // nav-admin: admin + clerk
  var adminNav = document.getElementById("nav-admin");
  if (adminNav) adminNav.style.display = canManage() ? "" : "none";

  // nav-dues: admin + clerk (legacy)
  var duesNav = document.getElementById("nav-dues");
  if (duesNav) duesNav.style.display = canManage() ? "" : "none";

  // nav-clearance: admin + clerk (legacy)
  var clearanceNav = document.getElementById("nav-clearance");
  if (clearanceNav) clearanceNav.style.display = canManage() ? "" : "none";

  navigate("dashboard");
}

function navigate(page){
  // Teacher can only access dashboard and students
  if(isTeacher()&&!["dashboard","students"].includes(page))return;
  // Clerk cannot access settings
  if(isClerk()&&page==="settings")return;

  currentPage=page;
  ["dashboard","students","payments","admin","dues","clearance","settings","reports"].forEach(p=>{
    const el=document.getElementById("page-"+p);if(el)el.style.display="none";
    const n=document.getElementById("nav-"+p);if(n)n.classList.remove("active");
  });
  var pageEl = document.getElementById("page-"+page);
  if (pageEl) pageEl.style.display="block";
  const navEl=document.getElementById("nav-"+page);if(navEl)navEl.classList.add("active");
  if(page==="dashboard")initDashboard();
  if(page==="students")initStudents();
  if(page==="payments")initPayments();
  if(page==="admin")initAdmin();
  if(page==="dues")initDues();
  if(page==="clearance")initClearance();
  if(page==="settings")initSettings();
  if(page==="reports")initReports();
}
