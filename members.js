// Customer (member) accounts: registration, login, self-orders, admin tools.
module.exports=function(x){const {app,save,page,esc,fmt,P,A,sess,login,ck,S,CLOVER,crypto}=x;const D=()=>x.db();
const norm=s=>String(s||'').replace(/\D/g,'');const okPhone=s=>/^09\d{8}$/.test(s);
const hash=pw=>{const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(String(pw),salt,64).toString('hex')};
const verify=(pw,h)=>{if(!h)return false;const [salt,k]=h.split(':');const a=crypto.scryptSync(String(pw),salt,64),b=Buffer.from(k,'hex');return a.length==b.length&&crypto.timingSafeEqual(a,b)};
const C=id=>D().customers.find(c=>c.id==id);const cs=()=>D().customers;
const agentPhones=()=>new Set(D().agents.map(a=>norm(a.phone)).filter(Boolean));
const CROSS='<svg viewBox="0 0 24 24" fill="none" stroke="#e9d6ad" stroke-width=".9"><path d="M10.5 3h3v6h5v3h-5v9h-3v-9h-5V9h5z"/></svg>';
const mask=p=>p.length==10?p.slice(0,4)+'***'+p.slice(7):p;
const stats=c=>{const os=D().orders.filter(o=>o.customerId==c.id&&o.paid);return{n:os.reduce((s,o)=>s+o.qty,0),t:os.reduce((s,o)=>s+o.qty*o.unitPrice,0),all:D().orders.filter(o=>o.customerId==c.id).length}};
const err=(m,back)=>page('提示',`<div class="card"><div class="err">${esc(m)}</div><p style="text-align:center;margin-top:18px"><a class="btn" href="${back}">返回</a></p></div>`);
// create an order for a customer; attribution always follows the customer's binding (never client input)
const mkOrder=(c,p,qty,address,note,paid)=>{const db=D();const o={id:db.seq++,created:new Date().toISOString(),productId:p.id,qty,unitPrice:p.price,agentCode:p.direct?null:(c.agentCode||null),customerId:c.id,name:c.name,phone:c.phone,address,note:note||'',paid:paid?1:0,paidAt:paid?new Date().toISOString():null,shipped:0};db.orders.push(o);save();return o};
// moves an agent's customers to company (history/orders untouched)
const release=code=>{let n=0;cs().forEach(c=>{if(c.agentCode==code){c.agentCode=null;c.releasedFrom=code;c.releasedAt=new Date().toISOString();n++}});if(n)save();return n};

app.get('/join',(q,r)=>{const ref=String(q.query.ref||'').toUpperCase().replace(/[^A-Z0-9]/g,''),ag=A(ref);
r.send(page('會員註冊',`<form class="card" method="post" action="/join"><h2>會員註冊</h2>${ag&&ag.active?`<div class="ok">專屬顧問：${esc(ag.name)}（${ag.code}）</div><br>`:''}
<label>姓名</label><input name="name" required maxlength="30"><label>手機號碼</label><input name="phone" type="tel" inputmode="numeric" placeholder="09xxxxxxxx" pattern="09[0-9]{8}" required>
<label>密碼（至少 6 碼）</label><input name="pw" type="password" minlength="6" required autocomplete="new-password">
<label>邀請碼（選填）</label><input name="ref" value="${esc(ref)}" placeholder="例如 AMY01" ${ag&&ag.active?'readonly':''}>
<p class="muted">未填邀請碼將成為公司直屬會員；註冊後綁定關係無法更改。</p>
<label style="display:flex;gap:10px;align-items:flex-start;letter-spacing:.05em;font-size:13px;color:#cfc4a8"><input type="checkbox" name="consent" value="1" required style="width:auto;margin:5px 0 0">我同意鎏光敘物依個人資料保護法蒐集、處理及利用我的姓名、手機與收件資料，僅用於訂單處理、出貨與會員服務。</label>
<button style="width:100%;margin-top:14px">註冊</button><p class="muted" style="text-align:center">已有帳號？<a href="/?tab=m">會員登入</a></p></form>`))});
app.post('/join',(q,r)=>{const b=q.body,ph=norm(b.phone),name=String(b.name||'').trim(),ref=String(b.ref||'').trim(),back='/join'+(ref?'?ref='+encodeURIComponent(ref):'');
if(!name)return r.send(err('請填寫姓名',back));if(!okPhone(ph))return r.send(err('手機格式需為 09 開頭共 10 碼',back));
if(String(b.pw||'').length<6)return r.send(err('密碼至少 6 碼',back));if(b.consent!='1')return r.send(err('請勾選個資同意',back));
if(cs().some(c=>c.phone==ph))return r.send(err('此手機已註冊，請直接登入','/?tab=m'));
if(agentPhones().has(ph))return r.send(err('此手機為代理商號碼，代理不可註冊為會員',back));
let agentCode=null;if(ref){const ag=A(ref);if(!ag||!ag.active)return r.send(err('邀請碼無效，請確認或留空',back));agentCode=ag.code}
const db=D();const c={id:'C'+(db.cseq=(db.cseq||0)+1),name,phone:ph,pw:hash(b.pw),agentCode,consentAt:new Date().toISOString(),created:new Date().toISOString()};db.customers.push(c);save();
login(r,{cust:c.id});r.redirect('/member')});
app.post('/member/login',(q,r)=>{const ph=norm(q.body.phone),c=cs().find(c=>c.phone==ph);if(!c||!verify(q.body.pw,c.pw))return r.send(err('手機或密碼錯誤','/?tab=m'));login(r,{cust:c.id});r.redirect('/member')});
app.get('/member/logout',(q,r)=>{delete S[ck(q).sid];r.redirect('/?tab=m')});
const me=q=>{const s=sess(q);return s?.cust?C(s.cust):null};
app.get('/member',(q,r)=>{const c=me(q);if(!c)return r.redirect('/?tab=m');const ag=c.agentCode&&A(c.agentCode);const mine=D().orders.filter(o=>o.customerId==c.id).slice().reverse();
r.send(page('會員專區',`<nav><a href="/member">✦ 訂購</a><a href="/member/logout">登出</a></nav><h2 style="text-align:center">${esc(c.name)} 您好</h2><p class="muted" style="text-align:center">${ag?'專屬顧問：'+esc(ag.name):'公司直屬會員'}</p>${q.query.msg?`<div class="ok">${esc(q.query.msg)}</div>`:''}
<div class="pgrid">${D().products.map(p=>`<label class="pcard"><input type="radio" name="productId" value="${p.id}" form="of" ${p.id=='clover'?'checked':''} required><span class="pin">${p.id=='clover'?CLOVER:CROSS}</span><b>${esc(p.name)}</b><span class="big">${fmt(p.price)}</span><small class="muted">${esc(p.desc).slice(0,22)}…</small></label>`).join('')}</div>
<form id="of" class="card" method="post" action="/member/order"><h3>訂購資料</h3><label>數量</label><input name="qty" type="number" min="1" max="20" value="1" required>
<label>收件／聯絡方式</label><textarea name="address" rows="2" required placeholder="收件地址，或面交時間地點"></textarea><label>備註</label><input name="note" maxlength="200"><button style="width:100%">送出訂單</button><p class="muted">訂單成立後由專人聯繫確認，確認收款後出貨。售出商品恕不退換。</p></form>
<div class="card wrap"><h3>我的訂單</h3>${mine.length?`<table><tr><th>#</th><th>日期</th><th>商品</th><th>數</th><th>金額</th><th>狀態</th></tr>${mine.map(o=>`<tr><td>${o.id}</td><td>${o.created.slice(5,10)}</td><td>${esc(P(o.productId)?.name)}</td><td>${o.qty}</td><td>${fmt(o.qty*o.unitPrice)}</td><td>${o.paid?'已付款':'待確認'}${o.shipped?'／已出貨':''}</td></tr>`).join('')}</table>`:'<p class="muted" style="text-align:center">尚無訂單</p>'}</div>`))});
app.post('/member/order',(q,r)=>{const c=me(q);if(!c)return r.redirect('/?tab=m');const p=P(q.body.productId),qty=parseInt(q.body.qty),addr=String(q.body.address||'').trim();
if(!p||!(qty>=1&&qty<=20)||!addr)return r.send(err('訂購資料有誤','/member'));const o=mkOrder(c,p,qty,addr,q.body.note,false);r.redirect('/member?msg='+encodeURIComponent(`訂單 #${o.id} 已成立，應付 ${fmt(o.qty*o.unitPrice)}`))});

// agent dashboard card
const custCard=(ag,link)=>{const mine=cs().filter(c=>c.agentCode==ag.code);return `<div class="card"><h3>我的邀請連結</h3><input readonly value="${link}" onclick="this.select()"><div style="text-align:center"><img src="/qr/${ag.code}.png" style="width:200px;background:#fff;padding:8px;border-radius:6px"><br><a class="btn btn2" href="/qr/${ag.code}.png" download="鎏光敘物-${ag.code}.png">下載 QR code</a></div><p class="muted">邀請碼：${ag.code}。客人註冊時綁定，之後無法更改；客人自行下單的幸運草計入您的當月件數。</p></div>
<div class="card wrap"><h3>我的會員（${mine.length}）</h3>${mine.length?`<table><tr><th>姓名</th><th>手機</th><th>已購件數</th><th>累計金額</th><th>註冊日</th></tr>${mine.map(c=>{const s=stats(c);return `<tr><td>${esc(c.name)}</td><td>${mask(c.phone)}</td><td>${s.n}</td><td>${fmt(s.t)}</td><td>${c.created.slice(0,10)}</td></tr>`}).join('')}</table><p class="muted">件數／金額只計已付款訂單。</p>`:'<p class="muted" style="text-align:center">尚無會員，分享邀請連結開始吧</p>'}</div>`};

// admin section
const adminSection=()=>{const db=D(),cust=cs().slice().reverse(),cphones=new Set(cust.map(c=>c.phone));const warn=[];const seen={};
db.agents.forEach(a=>{const p=norm(a.phone);if(!p)warn.push(`代理 ${a.code} 未設定手機（無法阻擋其註冊為會員）`);else{if(cphones.has(p))warn.push(`代理 ${a.code} 的手機 ${p} 已是會員帳號`);if(seen[p])warn.push(`代理 ${a.code} 與 ${seen[p]} 手機重複`);seen[p]=a.code}});
return `<div class="card wrap" id="customers"><h3>會員名單（${cust.length}）</h3>${warn.length?`<div class="err">${warn.map(esc).join('<br>')}</div><br>`:''}
<table><tr><th>姓名</th><th>手機</th><th>所屬</th><th>註冊日</th><th>已購</th></tr>${cust.map(c=>{const s=stats(c);return `<tr><td>${esc(c.name)}<br><span class="muted">${c.id}</span></td><td>${c.phone}</td><td>${c.agentCode?esc(c.agentCode):'公司'}${c.releasedFrom?`<br><span class="muted">原 ${esc(c.releasedFrom)}</span>`:''}</td><td>${c.created.slice(0,10)}</td><td>${s.n} 件<br><span class="muted">${fmt(s.t)}</span></td></tr>`}).join('')}</table></div>
<form class="card" id="corder" method="post" action="/admin/corder"><h3>補登訂單</h3><label>會員</label><select name="customerId" required>${cust.map(c=>`<option value="${c.id}">${esc(c.name)} ${c.phone}｜${c.agentCode||'公司'}</option>`).join('')}</select>
<label>商品</label><select name="productId">${db.products.map(p=>`<option value="${p.id}">${esc(p.name)} ${fmt(p.price)}</option>`).join('')}</select><label>數量</label><input name="qty" type="number" min="1" max="20" value="1" required>
<label>收件／面交</label><input name="address" value="現場面交"><label>備註</label><input name="note"><label style="display:flex;gap:10px;align-items:center"><input type="checkbox" name="paid" value="1" style="width:auto;margin:0" checked>已現場收款</label>
<button>補登</button><p class="muted">業績自動歸屬該會員綁定的代理（小十字一律公司直營）。</p></form>
<div class="card wrap" id="exit"><h3>代理停權／退出</h3><p class="muted">停權後該代理的會員全數轉為公司會員（不可回復），已結算紀錄保留。</p>${db.agents.filter(a=>a.active).map(a=>`<form method="post" action="/admin/agent/${a.code}/exit" style="display:inline" onsubmit="return confirm('確定停權 ${a.code}？其會員將轉為公司會員')"><button class="btn2" style="padding:6px 12px;font-size:12px;margin:4px">${esc(a.code)} ${esc(a.name)}（${cs().filter(c=>c.agentCode==a.code).length} 會員）</button></form>`).join('')}</div>`};
app.post('/admin/corder',(q,r)=>{if(!sess(q)?.admin)return r.redirect('/admin');const c=C(q.body.customerId),p=P(q.body.productId),qty=parseInt(q.body.qty);
if(!c||!p||!(qty>=1&&qty<=20))return r.redirect('/admin?msg='+encodeURIComponent('補登資料有誤')+'#corder');const o=mkOrder(c,p,qty,String(q.body.address||'現場面交'),q.body.note,q.body.paid=='1');
r.redirect('/admin?msg='+encodeURIComponent(`已補登 #${o.id}｜歸屬 ${o.agentCode||'公司'}`)+'#orders')});
app.post('/admin/agent/:code/exit',(q,r)=>{if(!sess(q)?.admin)return r.redirect('/admin');const a=A(q.params.code);if(!a)return r.redirect('/admin');a.active=false;const n=release(a.code);save();r.redirect('/admin?msg='+encodeURIComponent(`${a.code} 已停權，${n} 位會員轉為公司`)+'#customers')});
return {custCard,adminSection,release,norm}};
