// ===================== ADMIN =====================
function initBuatWOForm(){
  const csAvatar=document.getElementById('wo-cs-avatar'),csName=document.getElementById('wo-cs-name'),tsNow=document.getElementById('wo-timestamp-now');
  if(csAvatar&&currentUser){csAvatar.textContent=currentUser.avatar;csName.textContent=currentUser.displayName;}
  if(tsNow){const now=new Date();tsNow.textContent=now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+' WIB';}
  const t1=document.getElementById('wo-t1-time');if(t1){const now=new Date();t1.value=now.toTimeString().substring(0,5);}
  if(typeof onWoTipeChange==='function') onWoTipeChange();
}
// handleCreateTask versi Supabase ada di supabase-init.js (window.handleCreateTask = handleCreateTaskWithDB)
// handleAddDevice versi Supabase ada di supabase-init.js (window.handleAddDevice = handleAddDeviceWithDB)

// handleAdminApproval versi Supabase ada di supabase-extended.js
// importPerangkatExcel ada di supabase-init.js
