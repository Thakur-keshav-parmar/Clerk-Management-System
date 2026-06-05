// ============================================================
// APP INIT
// ============================================================

// Modal close on backdrop click
["feeModal","confirmDeleteModal","studentFormModal","clearanceModal","receiptModal","payDetailModal"].forEach(id=>{
  const el=document.getElementById(id);if(!el)return;
  el.addEventListener("click",function(e){
    if(e.target===this){
      if(id==="feeModal")closeFeeModal();
      else if(id==="confirmDeleteModal")closeConfirmDelete();
      else if(id==="clearanceModal")closeClearanceModal();
      else if(id==="receiptModal")closeReceiptModal();
      else if(id==="payDetailModal")closePayDetail();
      else if(id==="studentFormModal")closeStudentFormModalSafe();
    }
  });
});

// Escape key closes modals
document.addEventListener("keydown",e=>{
  if(e.key==="Enter"&&document.getElementById("page-login").style.display!=="none")doLogin();
  if(e.key==="Escape"){
    closeFeeModal();closeConfirmDelete();closeReceiptModal();
    closeClearanceModal();
    if(document.getElementById("payDetailModal"))closePayDetail();
    if(document.getElementById("studentFormModal").classList.contains("open"))closeStudentFormModalSafe();
  }
});

checkAuth();
