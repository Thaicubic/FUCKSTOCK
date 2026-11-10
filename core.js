/* Shared weight-based inventory rules. All persisted weights are kilograms. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.PaintCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const KEYS=['a','b','c'], NAMES={a:'PAINT',b:'HARDENER',c:'THINNER'}, MAX_IMAGE_CHARS=40000;
  const round=n=>Math.round((Number(n)+Number.EPSILON)*1e6)/1e6;
  function number(value,label='น้ำหนัก'){
    if(value===''||value===null||value===undefined||typeof value==='boolean') throw Error(label+' ไม่ถูกต้อง');
    const n=Number(value);
    if(!Number.isFinite(n)||n<0||n>1e9) throw Error(label+' ต้องเป็นตัวเลขตั้งแต่ 0 ถึง 1,000,000,000');
    return n;
  }
  function mixFrom(ratios,key,value){
    if(!KEYS.includes(key))throw Error('ไม่พบส่วนผสม');
    const r=Object.fromEntries(KEYS.map(k=>[k,number(ratios[k],'สูตร '+k.toUpperCase())]));
    if(!r[key])throw Error('ส่วนผสมที่มีสูตรเป็น 0 ใช้เป็นตัวตั้งไม่ได้');
    const anchor=number(value);
    return Object.fromEntries(KEYS.map(k=>[k,round(anchor*r[k]/r[key])]));
  }
  function normalizeColor(raw){
    const c={...raw}, safe=(v,d=0)=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):d;
    c.id=String(c.id||'');c.name=String(c.name||'');c.model=String(c.model||'');
    c.hex=/^#[\da-f]{6}$/i.test(c.hex)?c.hex:'#566577';
    for(const k of [...KEYS,'tare','plan','threshold','stock'])c[k]=safe(c[k]);
    c.image=typeof c.image==='string'?c.image:'';
    c.monitor=!(c.monitor===false||c.monitor===0||c.monitor==='false'||c.monitor==='FALSE');
    c.stockMode=c.stockMode==='components'?'components':'mixed';
    c.components=Object.fromEntries(KEYS.map(k=>{const p=raw.components?.[k]||{};return [k,{name:String(p.name||NAMES[k]),code:String(p.code||''),image:typeof p.image==='string'?p.image:'',stock:safe(p.stock),tare:safe(p.tare)}];}));
    if(c.stockMode==='components') c.stock=round(KEYS.reduce((sum,k)=>sum+c.components[k].stock,0));
    return c;
  }
  function validateImage(data){
    if(!data)return true;
    if(typeof data!=='string'||data.length>MAX_IMAGE_CHARS||!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data))throw Error('ภาพต้องเป็น JPEG/PNG/WebP Base64 ไม่เกิน 40,000 ตัวอักษร');
    return true;
  }
  function dateKey(date=new Date()){
    const d=new Date(date);if(!Number.isFinite(d.getTime()))return '';
    return new Date(d.getTime()+7*60*60*1000).toISOString().slice(0,10);
  }
  function normalizeTransaction(color,t){
    if(!['IN','OUT'].includes(t.type))throw Error('ประเภทรายการไม่ถูกต้อง');
    if(!String(t.user||'').trim())throw Error('กรุณาระบุผู้ทำรายการ');
    if(t.unit&&t.unit!=='kg')throw Error('ข้อมูลจัดเก็บต้องใช้ kg');
    let amounts;
    if(t.amounts) amounts=Object.fromEntries(KEYS.map(k=>[k,number(t.amounts[k]??0)]));
    else if(color.stockMode==='mixed'){
      const sum=color.a+color.b+color.c;if(sum<=0)throw Error('สูตรต้องมีส่วนผสมมากกว่า 0');
      amounts=Object.fromEntries(KEYS.map(k=>[k,round(number(t.qty)*color[k]/sum)]));
    }
    else throw Error('กรุณาระบุปริมาณ A/B/C');
    const qty=round(KEYS.reduce((s,k)=>s+amounts[k],0));
    if(qty<=0)throw Error('น้ำหนักสุทธิต้องมากกว่า 0');
    if(t.qty!==undefined&&Math.abs(number(t.qty)-qty)>0.00001)throw Error('ยอดรวมไม่ตรงกับปริมาณ A/B/C');
    if(t.weightMode==='gross'){
      const gross=number(t.gross,'น้ำหนักรวม'),tare=number(t.tare,'น้ำหนักถัง');
      if(gross<=tare||Math.abs(gross-tare-qty)>0.00001)throw Error('น้ำหนักรวมและถังไม่ตรงกับน้ำหนักสุทธิ');
    }
    const component=t.component||'all';
    if(![...KEYS,'all'].includes(component))throw Error('ส่วนผสมไม่ถูกต้อง');
    if(t.type==='IN'&&component!=='all'&&KEYS.some(k=>k!==component&&amounts[k]!==0))throw Error('รับวัตถุดิบเฉพาะตัวต้องไม่เพิ่มตัวอื่น');
    if(t.mixMode!=='manual'&&component==='all'){
      const sum=color.a+color.b+color.c;
      if(sum<=0||KEYS.some(k=>Math.abs(amounts[k]-qty*color[k]/sum)>0.000002))throw Error('ปริมาณที่เชื่อมสูตรไม่ตรงกับสูตรมาตรฐาน');
    }
    return {...t,user:String(t.user).trim(),amounts,qty,component,unit:'kg',mixMode:t.mixMode==='manual'?'manual':'linked'};
  }
  function fingerprint(t){
    return JSON.stringify([t.colorId,t.type,t.qty,KEYS.map(k=>t.amounts[k]),t.mixMode,t.component,t.user,String(t.mark||''),String(t.lot||''),String(t.line||''),String(t.note||''),t.weightMode||'net',t.gross??null,t.tare??null]);
  }
  function applyTransaction(inputColors,inputHistory,input){
    const colors=inputColors.map(normalizeColor),history=inputHistory.map(h=>({...h}));
    const c=colors.find(c=>c.id===input.colorId);if(!c)throw Error('ไม่พบสี');
    const previous=input.requestId?history.find(h=>h.requestId===input.requestId):null;
    const t=normalizeTransaction(previous?.ratio?{...c,...previous.ratio}:c,input), fp=fingerprint(t);
    if(t.requestId){
      if(previous){if(previous.fingerprint!==fp)throw Error('requestId ซ้ำกับข้อมูลรายการอื่น');return {colors,history,transaction:previous};}
    }
    const direction=t.type==='OUT'?-1:1;
    if(c.stockMode==='components'){
      for(const k of KEYS)if(c.components[k].stock+direction*t.amounts[k]<-0.0000005)throw Error('สต็อก '+NAMES[k]+' ไม่เพียงพอ');
      for(const k of KEYS)c.components[k].stock=round(c.components[k].stock+direction*t.amounts[k]);
      c.stock=round(KEYS.reduce((s,k)=>s+c.components[k].stock,0));
    }else{
      if(c.stock+direction*t.qty<-0.0000005)throw Error('สต็อกสีผสมไม่เพียงพอ');
      c.stock=round(c.stock+direction*t.qty);
    }
    const uuid=()=>typeof globalThis.crypto?.randomUUID==='function'?globalThis.crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2);
    const transaction={...t,id:uuid(),name:c.name,model:c.model,time:new Date(t.time||Date.now()).toISOString(),ratio:{a:c.a,b:c.b,c:c.c},stockMode:c.stockMode,fingerprint:fp};
    history.unshift(transaction);
    return {colors,history,transaction};
  }
  function summarize(inputColors,history,now=new Date()){
    const colors=inputColors.map(normalizeColor).filter(c=>c.monitor),ids=new Set(colors.map(c=>c.id)),today=dateKey(now);
    const out=history.filter(h=>h.type==='OUT'&&ids.has(h.colorId));
    const usedToday=round(out.filter(h=>dateKey(h.time)===today).reduce((s,h)=>s+(Number(h.qty)||0),0));
    const alerts=colors.filter(c=>{
      const used=out.filter(h=>h.colorId===c.id&&dateKey(h.time)===today).reduce((s,h)=>s+(Number(h.qty)||0),0),remaining=Math.max(0,c.plan-used);
      if(c.stockMode==='mixed')return c.stock<=c.threshold||c.stock<remaining;
      const sum=c.a+c.b+c.c;
      return c.stock<=c.threshold||KEYS.some(k=>c[k]>0&&c.components[k].stock<remaining*c[k]/sum);
    });
    const usage=Array.from({length:7},(_,i)=>{const d=new Date(now);d.setUTCDate(d.getUTCDate()-(6-i));const key=dateKey(d);return {date:key,qty:round(out.filter(h=>dateKey(h.time)===key).reduce((s,h)=>s+(Number(h.qty)||0),0))};});
    const remainingPlan=round(colors.reduce((s,c)=>s+Math.max(0,c.plan-out.filter(h=>h.colorId===c.id&&dateKey(h.time)===today).reduce((sum,h)=>sum+(Number(h.qty)||0),0)),0));
    return {stock:round(colors.reduce((s,c)=>s+c.stock,0)),plan:round(colors.reduce((s,c)=>s+c.plan,0)),remainingPlan,usedToday,alerts,usage};
  }
  function csv(history){
    const headers=['time','colorId','name','model','type','qty_kg','a_kg','b_kg','c_kg','mixMode','mark','lot','line','user','note','id'];
    const cell=value=>{let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
    const rows=history.map(t=>[t.time,t.colorId,t.name,t.model,t.type,t.qty,t.amounts?.a,t.amounts?.b,t.amounts?.c,t.mixMode,t.mark,t.lot,t.line,t.user,t.note,t.id]);
    return '\ufeff'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
  }
  function demoColors(){
    return [
      {id:'GD7-11BK01',model:'D03B',name:'GD7 11BK01',hex:'#323b43',a:100,b:15,c:100,tare:1.5,plan:12,threshold:8,stockMode:'components',components:{a:{name:'PAINT',code:'GD7 11BK01',stock:25,tare:1.5},b:{name:'HARDENER',code:'HD-015',stock:5,tare:.5},c:{name:'THINNER',code:'TH-100',stock:25,tare:1}}},
      {id:'SV-002',model:'D05A',name:'Silver Gray',hex:'#9faeb6',a:100,b:20,c:80,tare:1.8,plan:8,threshold:5,stockMode:'components',components:{a:{name:'PAINT',code:'SV-002',stock:7,tare:1.8},b:{name:'HARDENER',code:'HD-020',stock:.4,tare:.5},c:{name:'THINNER',code:'TH-080',stock:6,tare:1}}},
      {id:'RD-003',model:'D08C',name:'Red Pearl',hex:'#a4534b',a:100,b:15,c:100,tare:2.2,plan:5,threshold:3,stockMode:'mixed',stock:18}
    ].map(normalizeColor);
  }
  return {KEYS,MAX_IMAGE_CHARS,round,mixFrom,normalizeColor,validateImage,dateKey,applyTransaction,summarize,csv,demoColors};
});
