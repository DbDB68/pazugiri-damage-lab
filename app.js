(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const STORAGE_KEY = "pazugiri-damage-lab-v1";
  const labels = {pink:"3级粉球",green:"2级绿球",skill:"奥义攻击",white:"4级白球",normal:"普通连线"};
  const buffLabels = {none:"无",ran:"乱藤四郎奥义",other:"其他",unknown:"未记"};
  const seed = [
    {id:"p1",type:"pink",actor:"",count:21,damage:1093,attack:575,phase:"out",buff:"none",crit:"no"},
    {id:"p2",type:"pink",actor:"",count:19,damage:1481,attack:586,phase:"in",buff:"none",crit:"no"},
    {id:"p3",type:"pink",actor:"",count:23,damage:1177,attack:null,phase:"out",buff:"unknown",crit:"unknown"},
    {id:"p4",type:"pink",actor:"",count:18,damage:1748,attack:null,phase:"in",buff:"unknown",crit:"unknown"},
    {id:"p5",type:"pink",actor:"",count:19,damage:1781,attack:null,phase:"in",buff:"ran",crit:"no"},
    {id:"p6",type:"pink",actor:"",count:25,damage:2385,attack:null,phase:"in",buff:"ran",crit:"no"},
    {id:"p7",type:"green",actor:"",count:12,damage:526,attack:null,phase:"in",buff:"ran",crit:"no"},
    {id:"p8",type:"skill",actor:"压切长谷部",count:24,damage:2439,attack:null,phase:"in",buff:"unknown",crit:"no"},
    {id:"umugwma8t4ozs",type:"normal",actor:"",count:16,damage:750,attack:575,phase:"in",buff:"none",crit:"no"},
    {id:"umugwwa8bzvbg",type:"normal",actor:"",count:13,damage:614,attack:575,phase:"out",buff:"ran",crit:"no"}
  ];
  const valid = r => r && typeof r.id === "string" && r.id.length <= 100 && Object.hasOwn(labels,r.type) &&
    typeof r.actor === "string" && r.actor.length <= 40 && Number.isInteger(r.count) && r.count > 0 && r.count <= 999 &&
    Number.isInteger(r.damage) && r.damage > 0 && r.damage <= 999999 &&
    (r.attack === null || Number.isInteger(r.attack) && r.attack > 0 && r.attack <= 99999) &&
    ["in","out"].includes(r.phase) && Object.hasOwn(buffLabels,r.buff) && ["no","yes","unknown"].includes(r.crit);
  const validSet = rows => Array.isArray(rows) && rows.length <= 2000 && rows.every(valid) && new Set(rows.map(r=>r.id)).size === rows.length;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const unit = r => r.damage/r.count;
  const mean = xs => xs.length ? xs.reduce((sum,x)=>sum+x,0)/xs.length : null;
  const ratio = x => x === null ? "—" : x.toFixed(2)+"×";
  let records = seed.map(r=>({...r}));
  let editing = null;
  try {const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(validSet(saved))records=saved;} catch (_) {}
  function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(records));return true}catch(_){$("#live-result").textContent="浏览器未能保存记录，请导出 JSON 备份。";return false}}

  function renderStats(){
    const base=records.filter(r=>r.type==="pink"&&r.buff==="none"&&r.crit==="no");
    const outside=base.filter(r=>r.phase==="out"),inside=base.filter(r=>r.phase==="in");
    const rawOut=mean(outside.map(unit)),rawIn=mean(inside.map(unit));
    const correctedOut=mean(outside.filter(r=>r.attack).map(r=>unit(r)*575/r.attack));
    const correctedIn=mean(inside.filter(r=>r.attack).map(r=>unit(r)*575/r.attack));
    $("#raw-ratio").textContent=ratio(rawOut && rawIn ? rawIn/rawOut : null);
    $("#adj-ratio").textContent=ratio(correctedOut && correctedIn ? correctedIn/correctedOut : null);
    $("#raw-detail").textContent=rawOut && rawIn ? `外 ${rawOut.toFixed(1)} / 怪 → 内 ${rawIn.toFixed(1)} / 怪` : "需无 Buff 的同类粉球内外记录";
  }
  function renderActorFilter(){
    const select=$("#chart-actor"),current=selectedActor();
    const actors=[...new Set(records.map(r=>r.actor).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"zh-CN"));
    select.innerHTML='<option value="all">全部</option><option value="unknown">未记</option>'+actors.map((a,i)=>`<option value="actor-${i}">${escape(a)}</option>`).join("");
    select.querySelectorAll('option[value^="actor-"]').forEach((option,i)=>{option.dataset.actor=actors[i]});
    const match=[...select.options].find(o=>o.dataset.actor===current||o.value===current);
    if(match)select.value=match.value;
  }
  function selectedActor(){const selected=$("#chart-actor").selectedOptions[0];return selected?.dataset.actor ?? selected?.value ?? "all"}
  function renderChart(){
    const type=$("#chart-type").value,actor=selectedActor();
    const shown=records.filter(r=>r.type===type && ["none","ran"].includes(r.buff) && r.crit==="no" && (actor==="all" || (actor==="unknown" ? !r.actor : r.actor===actor)));
    const svg=$("#chart"), width=700,height=310,left=54,right=14,top=22,bottom=62,plotW=width-left-right,plotH=height-top-bottom;
    const groups=[{phase:"out",buff:"none",label:"外 · 无"},{phase:"out",buff:"ran",label:"外 · 乱"},{phase:"in",buff:"none",label:"内 · 无"},{phase:"in",buff:"ran",label:"内 · 乱"}];
    const ceiling=Math.ceil(Math.max(20,...shown.map(unit))*1.18/10)*10;
    const y=value=>top+plotH-value/ceiling*plotH;
    let content=`<title>${escape(labels[type])}每怪伤害</title><desc>按乱舞阶段和 Buff 分组。仅显示暴击为无、Buff 为无或乱藤四郎奥义的记录。</desc><rect class="frame" x="${left}" y="${top}" width="${plotW}" height="${plotH}"/>`;
    for(let i=0;i<=4;i++){const value=ceiling*i/4,yy=y(value);content+=`<line class="grid" x1="${left}" y1="${yy}" x2="${left+plotW}" y2="${yy}"/><text class="axis" x="${left-8}" y="${yy+4}" text-anchor="end">${Math.round(value)}</text>`}
    groups.forEach((group,index)=>{
      const x=left+plotW*(index+.5)/4, items=shown.filter(r=>r.phase===group.phase&&r.buff===group.buff),ran=group.buff==="ran"?" ran":"";
      if(items.length){const avg=mean(items.map(unit));content+=`<line class="guide${ran}" x1="${x-14}" x2="${x+14}" y1="${y(avg)}" y2="${y(avg)}"/>`}
      items.forEach((r,i)=>{const px=x+(i-(items.length-1)/2)*Math.min(18,plotW/30),py=y(unit(r)),info=`${labels[r.type]}，${r.actor||"出手人未记"}，${r.count} 怪，${r.damage} 伤害，${unit(r).toFixed(1)} 每怪`;content+=`<circle class="dot${ran}" cx="${px}" cy="${py}" r="6" tabindex="0"><title>${escape(info)}</title></circle><text class="value" x="${px}" y="${Math.max(15,py-11)}" text-anchor="middle">${unit(r).toFixed(1)}</text>`});
      content+=`<text class="axis" x="${x}" y="${top+plotH+25}" text-anchor="middle">${group.label}</text>`;
    });
    svg.setAttribute("viewBox",`0 0 ${width} ${height}`);svg.innerHTML=content;
    $("#chart-note").textContent=shown.length ? "Buff「其他／未记」或暴击「有／未记」的记录不放进这张对照图。普通连线可按出手人筛选。" : "当前条件下没有可比较的记录。可切换攻击类型或出手人。";
  }
  function renderTable(){
    $("#record-count").textContent=`${records.length} 条`;
    $("#records").innerHTML=records.slice().reverse().map(r=>`<tr><td>${escape(labels[r.type])}</td><td>${escape(r.actor||"未记")}</td><td>${r.phase==="in"?"乱舞内":"乱舞外"}</td><td>${escape(buffLabels[r.buff])}</td><td>${r.crit==="no"?"无":r.crit==="yes"?"有":"未记"}</td><td class="num">${r.count}</td><td class="num">${r.damage}</td><td class="num">${unit(r).toFixed(1)}</td><td class="num">${r.attack??"—"}</td><td><button type="button" data-edit="${escape(r.id)}">编辑</button><button type="button" data-remove="${escape(r.id)}" aria-label="删除这条记录">删除</button></td></tr>`).join("");
  }
  function render(){renderStats();renderActorFilter();renderChart();renderTable()}
  function formRecord(){
    const f=$("#entry-form").elements;
    const r={id:editing||`u${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`,type:f.type.value,actor:f.actor.value.trim(),count:Number(f.count.value),damage:Number(f.damage.value),attack:f.attack.value.trim()===""?null:Number(f.attack.value),phase:f.phase.value,buff:f.buff.value,crit:f.crit.value};
    return valid(r)?r:null;
  }
  function clearForm(){editing=null;$("#entry-form").reset();$("#save-button").textContent="加入记录";$("#cancel-button").hidden=true;$("#form-error").textContent=""}
  $("#entry-form").addEventListener("submit",event=>{
    event.preventDefault();const r=formRecord();if(!r){$("#form-error").textContent="请检查出手人、怪数、伤害和队伍攻击力。";return}
    if(editing){const i=records.findIndex(x=>x.id===editing);if(i>=0)records[i]=r}else records.push(r);
    clearForm();persist();render();$("#live-result").textContent="记录已保存";
  });
  $("#cancel-button").addEventListener("click",clearForm);
  $("#records").addEventListener("click",event=>{
    const button=event.target.closest("button");if(!button)return;
    const id=button.dataset.edit||button.dataset.remove,r=records.find(x=>x.id===id);if(!r)return;
    if(button.dataset.remove){records=records.filter(x=>x.id!==id);if(editing===id)clearForm();persist();render();$("#live-result").textContent="记录已删除";return}
    editing=id;const f=$("#entry-form").elements;for(const key of ["type","actor","count","damage","attack","phase","buff","crit"])f[key].value=r[key]??"";
    $("#save-button").textContent="保存修改";$("#cancel-button").hidden=false;$("#entry-form").scrollIntoView({block:"nearest"});
  });
  $("#chart-type").addEventListener("change",renderChart);
  $("#chart-actor").addEventListener("change",renderChart);
  $("#export-button").addEventListener("click",()=>{
    const file=new Blob([JSON.stringify({version:1,records},null,2)],{type:"application/json"}),url=URL.createObjectURL(file),link=document.createElement("a");
    link.href=url;link.download="pazugiri-damage-records.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $("#import-button").addEventListener("click",()=>$("#import-file").click());
  $("#import-file").addEventListener("change",async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{const data=JSON.parse(await file.text());if(data.version!==1||!validSet(data.records))throw Error("格式不正确");records=data.records.map(r=>({...r}));clearForm();persist();render();$("#live-result").textContent=`已导入 ${records.length} 条记录`}
    catch(_){alert("导入失败：请使用本实验台导出的 JSON 文件。")}
    event.target.value="";
  });
  render();
})();
