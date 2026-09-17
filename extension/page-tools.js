/* 这两个函数会被注入到招聘网站页面里执行，必须自包含（不能引用外部变量） */

/* 抓取当前页面的岗位信息：优先用选中的文字，否则找同时包含「职责」「要求」的最小内容块 */
function qzztExtractJob(){
  const clean=s=>(s||"").replace(/ /g," ").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
  const sel=clean(String(window.getSelection()||""));
  let jd=sel.length>60?sel:"";
  if(!jd){
    const re1=/岗位职责|工作职责|职位描述|工作内容|职责描述|你将负责|Responsibilities/i, re2=/任职要求|岗位要求|职位要求|任职资格|我们希望你|Requirements|Qualifications/i;
    let best=null;
    document.querySelectorAll("main,article,section,div").forEach(el=>{
      const t=el.innerText||""; if(t.length<30||t.length>8000) return;
      if(re1.test(t)&&re2.test(t)&&(!best||t.length<best.length)) best=t;
    });
    if(!best){ document.querySelectorAll("main,article,section,div").forEach(el=>{ const t=el.innerText||""; if(t.length>=30&&t.length<6000&&re1.test(t)&&(!best||t.length<best.length)) best=t; }); }
    jd=clean(best||"");
  }
  const host=location.hostname;
  const coMap=[[/bytedance|toutiao|tiktok|feishu/,"字节跳动"],[/qq\.com|tencent/,"腾讯"],[/meituan/,"美团"],[/alibaba|aliyun|antgroup|taobao/,"阿里巴巴"],[/jd\.com/,"京东"],[/kuaishou/,"快手"],[/xiaohongshu/,"小红书"],[/pddglobalhr|pinduoduo/,"拼多多"],[/baidu/,"百度"],[/163\.com|netease/,"网易"],[/mihoyo/,"米哈游"],[/shein/,"SHEIN"],[/anker/,"安克创新"],[/huawei/,"华为"],[/didi/,"滴滴"],[/bilibili/,"哔哩哔哩"],[/cmbchina/,"招商银行"],[/boc\.cn|chinahr/,"中国银行"]];
  let company=(coMap.find(([r])=>r.test(host))||[])[1]||"";
  const h1=document.querySelector("h1,h2,[class*=title],[class*=Title]");
  let role=clean(h1?h1.innerText:"").split("\n")[0].slice(0,40);
  if(!role) role=clean(document.title).split(/[-_|｜]/)[0].slice(0,40);
  const city=((document.body.innerText||"").match(/(北京|上海|深圳|广州|杭州|成都|武汉|南京|西安|苏州|长沙|重庆|天津|厦门|香港)/)||[])[1]||"";
  return {company,role,city,jd,url:location.href};
}

/* 按档案填写网申表单：只填空着的字段，不点任何提交按钮 */
function qzztFillForm(profile, resume){
  const P=profile||{}; const report={filled:[],skipped:0};
  const intern=(P.exps||[]).filter(e=>e.sec==="实习经历"), proj=(P.exps||[]).filter(e=>e.sec!=="实习经历");
  const span=p=>{ const m=(p||"").match(/(\d{4})[.\/-年](\d{1,2})\D+(\d{4})[.\/-年](\d{1,2})/); return m?{s:[m[1],m[2].padStart(2,"0")],e:[m[3],m[4].padStart(2,"0")]}:null; };
  /* 字段名：for 关联的 label → 包裹的 label → aria-label / placeholder → 紧挨在前面的短文字（向前找兄弟节点，再向上一层） */
  const shortText=n=>{ if(!n||n.nodeType!==1) return ""; if(n.matches("input,textarea,select")) return ""; if(n.querySelector&&n.querySelector("input,textarea,select")) return ""; const t=(n.innerText||"").trim(); return t.length&&t.length<=24?t:""; };
  const labelOf=el=>{
    let t="";
    if(el.id){ const l=document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if(l) t=l.innerText; }
    if(!t&&el.closest("label")){ const c=el.closest("label").cloneNode(true); c.querySelectorAll("input,textarea,select").forEach(x=>x.remove()); t=c.innerText; }
    if(!t) t=el.getAttribute("aria-label")||"";
    if(!t){ let p=el; for(let up=0;up<3&&!t&&p;up++,p=p.parentElement){ let sib=p.previousElementSibling; for(let k=0;k<2&&sib&&!t;k++,sib=sib.previousElementSibling) t=shortText(sib); } }
    t=[t,el.placeholder,el.name].filter(Boolean).join(" ");
    return t.replace(/\s+/g," ").trim();
  };
  const setVal=(el,v)=>{
    if(v==null||v==="") return false;
    if(el.tagName==="SELECT"){
      const o=[...el.options].find(o=>o.text.includes(v)||v.includes(o.text.trim())&&o.text.trim()); if(!o) return false;
      el.value=o.value;
    } else {
      if(el.type==="month") v=String(v).replace(/(\d{4})\D(\d{2}).*/,"$1-$2");
      if(el.type==="date") v=String(v).replace(/(\d{4})\D(\d{2}).*/,"$1-$2-01");
      const proto=el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,"value").set.call(el,v);
    }
    ["input","change","blur"].forEach(t=>el.dispatchEvent(new Event(t,{bubbles:true})));
    el.style.outline="2px solid #0052D9"; el.style.background="#F2F6FF";
    return true;
  };
  const cnt={}, next=k=>{ cnt[k]=(cnt[k]||0); return cnt[k]++; };
  let group="edu";
  const fields=[...document.querySelectorAll("input,textarea,select")].filter(el=>{
    if(el.disabled||el.readOnly) return false;
    if(el.tagName==="INPUT"&&!/^(text|email|tel|number|date|month|search|)$/.test(el.type||"")) return false;
    const r=el.getBoundingClientRect(); return r.width>0&&r.height>0;
  });
  for(const el of fields){
    if(el.tagName!=="SELECT"&&el.value){ report.skipped++; continue; }
    const L=labelOf(el); let v=null, key="";
    const E=()=>(P.edu||[])[cnt.school?cnt.school-1:0]||{}, X=()=>intern[cnt.company?cnt.company-1:0]||{}, J=()=>proj[cnt.project?cnt.project-1:0]||{};
    if(/学校|院校|school|university|college/i.test(L)){ group="edu"; v=((P.edu||[])[next("school")]||{}).school; key="学校"; }
    else if(/专业|major/i.test(L)){ v=E().major; key="专业"; }
    else if(/学历|学位|degree/i.test(L)){ v=E().degree; key="学历"; }
    else if(/gpa|绩点|成绩/i.test(L)){ v=((E().note||"").match(/GPA\s*[\d.]+\/[\d.]+/i)||[])[0]; key="GPA"; }
    else if(/公司|单位|company|employer|organization/i.test(L)&&!/项目/.test(L)){ group="exp"; v=(intern[next("company")]||{}).org; key="公司"; }
    else if(/项目名称|project/i.test(L)){ group="proj"; v=(proj[next("project")]||{}).org; key="项目名称"; }
    else if(/职位|岗位名称|职务|担任|角色|position|title/i.test(L)&&!/应聘|意向|申请/.test(L)){ v=(group==="proj"?J():X()).role; key="职位"; }
    else if(/(开始|起始|入学|入职)(时间|日期)?|start/i.test(L)){ const s=span(group==="edu"?E().period:group==="proj"?J().period:X().period); v=s&&s.s.join("."); key="开始时间"; }
    else if(/(结束|毕业|离职)(时间|日期)?|end/i.test(L)){ const s=span(group==="edu"?E().period:group==="proj"?J().period:X().period); v=s&&s.e.join("."); key="结束时间"; }
    else if(/描述|内容|职责|业绩|description|responsibilit/i.test(L)&&el.tagName==="TEXTAREA"){ v=(group==="proj"?J():X()).desc; key="经历描述"; }
    else if(/自我评价|自我介绍|个人评价|个人优势|self/i.test(L)){ v=P.self; key="自我评价"; }
    else if(/获奖|奖项|荣誉|award/i.test(L)){ v=(P.awards||[]).join("\n"); key="获奖"; }
    else if(/技能|证书|skill/i.test(L)){ v=P.skills; key="技能"; }
    else if(/邮箱|e-?mail/i.test(L)){ v=P.email; key="邮箱"; }
    else if(/手机|电话|mobile|phone|tel/i.test(L)){ v=P.phone; key="手机"; }
    else if(/姓名|名字|^name$|full ?name/i.test(L)){ v=P.name; key="姓名"; }
    if(key&&setVal(el,v)) report.filled.push(key);
  }
  if(resume&&resume.b64){
    const fi=[...document.querySelectorAll("input[type=file]")].find(el=>/简历|附件|resume|cv/i.test(labelOf(el)+" "+(el.accept||""))||/doc/.test(el.accept||""));
    if(fi&&!fi.files.length){
      try{
        const bin=atob(resume.b64), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
        const dt=new DataTransfer(); dt.items.add(new File([u],resume.name,{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}));
        fi.files=dt.files; fi.dispatchEvent(new Event("change",{bubbles:true})); report.filled.push("简历附件");
      }catch(e){}
    }
  }
  return report;
}
