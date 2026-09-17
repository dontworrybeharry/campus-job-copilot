/* 只在秋招作战台页面里工作：把插件抓到的岗位交给平台，把平台同步的档案存进插件 */
(function(){
  const isPlatform=()=>!!document.getElementById("agentHome")||/秋招作战台/.test(document.title);
  if(!isPlatform()) return;
  const post=msg=>window.postMessage(Object.assign({source:"qzzt-ext"},msg),"*");
  const sendJobs=()=>chrome.storage.local.get({jobs:[]},r=>{ if(r.jobs.length) post({type:"JOBS",jobs:r.jobs}); });
  post({type:"HELLO"}); sendJobs();
  chrome.storage.local.set({platformUrl:location.href});
  window.addEventListener("message",e=>{
    const d=e.data||{}; if(e.source!==window||d.source!=="qzzt-page") return;
    if(d.type==="PING"){ post({type:"HELLO"}); sendJobs(); }
    if(d.type==="SYNC") chrome.storage.local.set({profile:d.data,resume:d.resume||null,syncedAt:new Date().toISOString()});
    if(d.type==="JOBS_ACK") chrome.storage.local.get({jobs:[]},r=>chrome.storage.local.set({jobs:r.jobs.filter(j=>!(d.ids||[]).includes(j.id))}));
  });
  chrome.storage.onChanged.addListener((c,area)=>{ if(area==="local"&&c.jobs) sendJobs(); });
})();
