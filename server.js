const express=require('express'),fs=require('fs'),crypto=require('crypto'),QR=require('qrcode');
const app=express();app.use(express.urlencoded({extended:true}));
const DB='./db.json',ADMIN_PW=process.env.ADMIN_PW||'admin2026',MIN=10000;
let db;const save=()=>fs.writeFileSync(DB,JSON.stringify(db,null,1));
function seed(){const m=new Date(),ym=d=>d.toISOString();const ago=n=>new Date(Date.now()-n*864e5).toISOString();
db={products:[{id:'clover',name:'幸運草墜鍊',price:11680,desc:'925銀胎，外層包覆純金。四片葉子，一片給勇氣、一片給好運、一片給被愛、一片留給未來的自己。附保卡標示金重與銀重。'},{id:'cross',name:'小十字墜鍊',price:15000,direct:true,wholesale:'待定',desc:'925銀胎，外層包覆純金。給走在自己路上的人，提醒自己不忘初衷。附保卡標示金重與銀重。'}],
agents:[{code:'AMY01',name:'Amy 林',pin:'1111',phone:'0911-000-001',active:true,prices:{clover:11680,cross:15000}},{code:'BEN02',name:'Ben 陳',pin:'2222',phone:'0911-000-002',active:true,prices:{clover:10800,cross:14000}},{code:'CICI3',name:'Cici 黃',pin:'3333',phone:'0911-000-003',active:true,prices:{clover:11000,cross:15000}}],orders:[],seq:1};
const add=(a,p,q,paid,shipped,d)=>{const pr=p=='cross'?15000:(cloverPaid(a,nowYm())<3?11680:db.agents.find(x=>x.code==a).prices[p]);db.orders.push({id:db.seq++,created:ago(d),productId:p,qty:q,unitPrice:pr,agentCode:p=='cross'?null:a,name:'示範客戶'+db.seq,phone:'0922-123-456',address:'台北市信義區示範路1號',note:'',paid,paidAt:paid?ago(d):null,shipped})};
add('AMY01','clover',2,1,1,0);add('AMY01','cross',1,1,0,0);add('AMY01','clover',1,0,0,0);
add('BEN02','clover',4,1,1,0);add('BEN02','cross',3,1,1,0);add('BEN02','clover',2,1,0,0);
add('CICI3','clover',1,1,0,0);add('CICI3','cross',1,0,0,0);save()}

const LOCK=3;function cloverPaid(code,ym){return db.orders.filter(o=>o.agentCode==code&&o.productId=='clover'&&o.paid&&ymOf(o.paidAt)==ym).reduce((s,o)=>s+o.qty,0)}
const agentPrice=(ag,p)=>p.direct?p.price:(cloverPaid(ag.code,nowYm())<LOCK?p.price:Math.min(ag.prices[p.id]||p.price,p.price));
const tierOf=n=>n>=20?6500:n>=9?7500:n>=6?8500:n>=3?9500:11680;
const nextTier=n=>n>=20?null:n>=9?[20-n,6500]:n>=6?[9-n,7500]:n>=3?[6-n,8500]:[3-n,9500];
const nowYm=()=>new Date(Date.now()+8*36e5).toISOString().slice(0,7);
const ymOf=iso=>new Date(new Date(iso).getTime()+8*36e5).toISOString().slice(0,7);
const fmt=n=>'NT$'+Number(n).toLocaleString('en-US');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if(fs.existsSync(DB))db=JSON.parse(fs.readFileSync(DB));else seed();
const P=id=>db.products.find(p=>p.id==id),A=c=>db.agents.find(a=>a.code==String(c||'').toUpperCase().trim());
function settle(code,ym){const os=db.orders.filter(o=>o.agentCode==code&&o.productId=='clover'&&o.paid&&ymOf(o.paidAt)==ym);const pcs=os.reduce((s,o)=>s+o.qty,0),w=tierOf(pcs);
const retail=os.reduce((s,o)=>s+o.qty*o.unitPrice,0);return{pcs,w,retail,wholesale:pcs*w,profit:retail-pcs*w,orders:os}}
// sessions
const S={};const ck=r=>Object.fromEntries((r.headers.cookie||'').split(';').filter(Boolean).map(x=>x.trim().split('=')));
const sess=r=>S[ck(r).sid];const login=(res,v)=>{const id=crypto.randomBytes(16).toString('hex');S[id]=v;res.setHeader('Set-Cookie',`sid=${id}; Path=/; HttpOnly; SameSite=Lax; Secure`)};
const css=`*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 50% -10%,#1f2a24 0%,#0c110f 45%,#07090a 100%) fixed;color:#e8e2d4;font-family:"Noto Serif TC","Songti TC","PMingLiU",serif;font-weight:300;font-size:15px;line-height:1.8;letter-spacing:.03em}
a{color:#d8c39a;text-decoration:none;border-bottom:1px solid rgba(216,195,154,.3)}header{padding:48px 16px 32px;text-align:center}
header h1{margin:0;font-weight:300;letter-spacing:.5em;font-size:28px;background:linear-gradient(100deg,#a8874f,#f3e3bd 45%,#c9a66b 55%,#8e6f3e);-webkit-background-clip:text;background-clip:text;color:transparent;background-size:200% auto;animation:sh 8s ease-in-out infinite}
@keyframes sh{50%{background-position:100% center}}header small{display:block;margin-top:8px;color:#8a8370;letter-spacing:.5em;font-size:10px}
header:after{content:"";display:block;width:40px;height:1px;background:#c9b48a;margin:22px auto 0;opacity:.6}
main{max-width:720px;margin:auto;padding:8px 20px 40px}.card{background:rgba(18,24,21,.6);border:1px solid rgba(201,180,138,.18);border-radius:2px;padding:28px 22px;margin:22px 0;animation:fi .8s ease both}
@keyframes fi{from{opacity:0;transform:translateY(6px)}}h2,h3{color:#d8c39a;font-weight:300;letter-spacing:.2em;margin-top:0}
input,select,textarea{width:100%;padding:12px;margin:6px 0 16px;background:transparent;color:#e8e2d4;border:0;border-bottom:1px solid rgba(201,180,138,.35);font-size:16px;font-family:inherit;border-radius:0}
select option{background:#0c110f}input:focus,select:focus,textarea:focus{outline:0;border-color:#d8c39a}
button,.btn{display:inline-block;background:transparent;color:#e9d6ad;border:1px solid #c9b48a;padding:11px 26px;font-size:14px;letter-spacing:.25em;font-family:inherit;cursor:pointer;transition:background .4s,color .4s}
button:hover,.btn:hover{background:#c9b48a;color:#0c110f}.btn2{border-color:rgba(201,180,138,.4);color:#b5a684}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:9px 6px;border-bottom:1px solid rgba(201,180,138,.12);text-align:left;vertical-align:top}th{color:#8a8370;font-weight:300}
.wrap{overflow-x:auto}.muted{color:#8a8370;font-size:12.5px}.err{border:1px solid #7a4a3a;color:#e0b8a8;padding:12px}.ok{border:1px solid rgba(201,180,138,.4);color:#d8c39a;padding:12px}
.big{font-size:24px;color:#e9d6ad;font-weight:300;letter-spacing:.08em}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}nav{text-align:center}nav a{margin:0 9px;font-size:13px;letter-spacing:.15em}
label{font-size:12px;color:#a89c80;letter-spacing:.2em}hr{border:0;border-top:1px solid rgba(201,180,138,.15);margin:24px 0}@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
const page=(t,b)=>`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t}｜鎏光敘物</title><style>${css}</style></head><body><header><h1>鎏光敘物</h1><small>LIUGUANG XUWU</small></header><main>${b}</main><p class="muted" style="text-align:center">© 鎏光敘物 · 925銀包純金 · 每件附保卡</p></body></html>`;
// customer order
app.get('/',(q,r)=>{const ag=A(q.query.ref);const pr=p=>ag?agentPrice(ag,p):p.price;
r.send(page('訂購',`${ag?`<div class="ok">推薦代理：${esc(ag.name)}（${ag.code}）</div>`:''}
${db.products.map(p=>`<div class="card"><h3>${esc(p.name)}</h3><div class="big">${fmt(pr(p))}</div><p>${esc(p.desc)}</p>${p.direct?'<p class="muted">此款為公司直營販售，不經代理。</p>':''}<p class="muted">材質：925銀包純金（非18K、無鑽石），金重／銀重詳見保卡</p></div>`).join('')}
<form class="card" method="post" action="/order"><h3>填寫訂單</h3>
<label>商品</label><select name="productId">${db.products.map(p=>`<option value="${p.id}">${esc(p.name)} ${fmt(pr(p))}</option>`).join('')}</select>
<label>數量</label><input name="qty" type="number" min="1" max="20" value="1" required>
<label>姓名</label><input name="name" required><label>電話</label><input name="phone" type="tel" required>
<label>收件地址</label><input name="address" required><label>代理代碼</label><input name="agentCode" value="${ag?ag.code:''}" placeholder="例如 AMY01"><p class="muted">幸運草需填代理代碼；小十字為公司直營，免填。</p>
<label>備註</label><input name="note"><button>送出訂單</button><p class="muted">付款方式：銀行轉帳，確認入帳後出貨。</p></form>
<p class="muted" style="text-align:center"><a href="/agent">代理登入</a> · <a href="/admin">管理後台</a></p>`))});
app.post('/order',(q,r)=>{const b=q.body,p=P(b.productId),ag=A(b.agentCode),qty=parseInt(b.qty);
const direct=p&&p.direct;if(!p||(!direct&&(!ag||!ag.active))||!(qty>=1&&qty<=20)||!b.name||!b.phone||!b.address)return r.send(page('錯誤',`<div class="err">資料有誤或代理代碼不存在，請返回修改。</div><p><a href="javascript:history.back()">返回</a></p>`));
const up=direct?p.price:agentPrice(ag,p);if(up<MIN)return r.send(page('錯誤','<div class="err">售價低於最低零售價，無法成立訂單。</div>'));
const o={id:db.seq++,created:new Date().toISOString(),productId:p.id,qty,unitPrice:up,agentCode:direct?null:ag.code,name:b.name,phone:b.phone,address:b.address,note:b.note||'',paid:0,paidAt:null,shipped:0};db.orders.push(o);save();
r.send(page('訂單成立',`<div class="card"><h2>訂單成立</h2><p>訂單編號：<b>#${o.id}</b></p><p>${esc(p.name)} × ${qty}</p><p class="big">應付 ${fmt(qty*up)}</p>
<p>請轉帳至：<br>（示範）銀行 000 帳號 0000-0000-0000<br>戶名：鎏光敘物</p><p class="muted">${direct?'轉帳後請私訊官方帳號告知末五碼':'轉帳後請將末五碼告知代理 '+esc(ag.name)}，確認入帳後出貨。</p><a class="btn" href="/${ag&&!direct?'?ref='+ag.code:''}">返回</a></div>`))});
// agent
app.get('/agent',(q,r)=>{const s=sess(q);if(!s||!s.agent)return r.send(page('代理登入',`<form class="card" method="post" action="/agent/login"><h2>代理登入</h2><label>代理代碼</label><input name="code" required><label>PIN</label><input name="pin" type="password" inputmode="numeric" required><button>登入</button></form>`));
const ag=A(s.agent),ym=q.query.m||nowYm(),st=settle(ag.code,ym),nt=nextTier(st.pcs),link=`${q.protocol}://${q.get('host')}/?ref=${ag.code}`;
const mine=db.orders.filter(o=>o.agentCode==ag.code).slice().reverse();
r.send(page('代理後台',`<nav><a href="/agent/logout">登出</a></nav><h2>${esc(ag.name)}（${ag.code}）</h2>${q.query.msg?`<div class="${q.query.e?'err':'ok'}">${esc(q.query.msg)}</div>`:''}
<div class="card"><form><label>月份</label><input type="month" name="m" value="${ym}" onchange="this.form.submit()"></form>
<div class="grid"><div>本月已付款件數<div class="big">${st.pcs}</div></div><div>目前批發價<div class="big">${fmt(st.w)}</div></div>
<div>零售總額<div>${fmt(st.retail)}</div></div><div>批發總額<div>${fmt(st.wholesale)}</div></div></div>
<p>本月可得利潤：<span class="big">${fmt(st.profit)}</span></p><p class="muted">${nt?`再賣 ${nt[0]} 件升級到 ${fmt(nt[1])}／件（全月所有件數適用）`:'已達最高級距 NT$6,500'}</p>
<p class="muted">級距：1–2件 11,680｜3–5件 9,500｜6–8件 8,500｜9–19件 7,500｜20件以上 6,500（依當月已付款累計，全月適用）</p></div>
<div class="card"><h3>我的專屬連結</h3><input readonly value="${link}" onclick="this.select()"><img src="/qr/${ag.code}.png" style="width:200px;background:#fff;padding:8px;border-radius:6px"><br><a class="btn btn2" href="/qr/${ag.code}.png" download="鎏光敘物-${ag.code}.png">下載 QR code</a></div>
<form class="card" method="post" action="/agent/prices"><h3>我的售價</h3>${(()=>{const p=P('clover'),cp=cloverPaid(ag.code,nowYm()),lk=cp<LOCK;return `<label>${esc(p.name)}（定價 ${fmt(p.price)}）</label><input type="number" name="clover" min="${MIN}" max="${p.price}" value="${agentPrice(ag,p)}" ${lk?'disabled':''}>${lk?`<p class="muted">當月滿 3 條後可自訂 10,000–11,680（本月已付款 ${cp} 條，目前鎖定 ${fmt(p.price)}）</p>`:''}${lk?'':'<button>儲存</button>'}`})()}<p class="muted">小十字墜鍊目前為公司直營，不開放代理販售。</p></form>
<div class="card wrap"><h3>我的訂單</h3><table><tr><th>#</th><th>日期</th><th>商品</th><th>數</th><th>單價</th><th>客戶</th><th>狀態</th></tr>${mine.map(o=>`<tr><td>${o.id}</td><td>${o.created.slice(5,10)}</td><td>${esc(P(o.productId)?.name)}</td><td>${o.qty}</td><td>${o.unitPrice}</td><td>${esc(o.name)}</td><td>${o.paid?'已付':'待付'}${o.shipped?'/已出貨':''}</td></tr>`).join('')}</table></div>`))});
app.post('/agent/login',(q,r)=>{const ag=A(q.body.code);if(!ag||ag.pin!==q.body.pin||!ag.active)return r.send(page('登入失敗','<div class="err">代碼或 PIN 錯誤</div><a href="/agent">重試</a>'));login(r,{agent:ag.code});r.redirect('/agent')});
app.get('/agent/logout',(q,r)=>{delete S[ck(q).sid];r.redirect('/agent')});
app.post('/agent/prices',(q,r)=>{const s=sess(q);if(!s?.agent)return r.redirect('/agent');const ag=A(s.agent);
const p=P('clover'),v=parseInt(q.body.clover);if(cloverPaid(ag.code,nowYm())<LOCK)return r.redirect('/agent?e=1&msg='+encodeURIComponent('當月滿 3 條後可自訂 10,000–11,680'));
if(!(v>=MIN&&v<=p.price))return r.redirect('/agent?e=1&msg='+encodeURIComponent(`${p.name} 售價需介於 ${MIN} 與 ${p.price} 之間`));ag.prices.clover=v;save();r.redirect('/agent?msg='+encodeURIComponent('已儲存'))});
app.get('/qr/:code.png',async(q,r)=>{const ag=A(q.params.code);if(!ag)return r.sendStatus(404);r.type('png').send(await QR.toBuffer(`${q.protocol}://${q.get('host')}/?ref=${ag.code}`,{width:600,margin:2}))});
// admin
const isA=q=>sess(q)?.admin;
app.post('/admin/login',(q,r)=>{if(q.body.pw!==ADMIN_PW)return r.send(page('失敗','<div class="err">密碼錯誤</div><a href="/admin">重試</a>'));login(r,{admin:1});r.redirect('/admin')});
app.use('/admin',(q,r,n)=>{if(isA(q)||q.path=='/login')return n();r.send(page('管理登入',`<form class="card" method="post" action="/admin/login"><h2>管理後台</h2><label>密碼</label><input type="password" name="pw"><button>登入</button></form>`))});
app.get('/admin',(q,r)=>{const ym=q.query.m||nowYm(),f=q.query.f||'all';
let os=db.orders.slice().reverse();if(f=='unpaid')os=os.filter(o=>!o.paid);if(f=='toship')os=os.filter(o=>o.paid&&!o.shipped);
const rows=db.agents.map(a=>({a,...settle(a.code,ym)}));const tot=rows.reduce((s,x)=>({pcs:s.pcs+x.pcs,retail:s.retail+x.retail,wh:s.wh+x.wholesale,pf:s.pf+x.profit}),{pcs:0,retail:0,wh:0,pf:0});
r.send(page('管理後台',`<nav><a href="#settle">結算</a><a href="#orders">訂單</a><a href="#agents">代理</a><a href="#products">商品</a><a href="/admin/logout">登出</a></nav>${q.query.msg?`<div class="ok">${esc(q.query.msg)}</div>`:''}
<div class="card wrap" id="settle"><h3>月結算表</h3><form><input type="month" name="m" value="${ym}" onchange="this.form.submit()"></form>
<table><tr><th>代理</th><th>件數</th><th>批發價</th><th>客付總額</th><th>公司應收(批發)</th><th>應付代理利潤</th></tr>${rows.map(x=>`<tr><td>${esc(x.a.name)}<br><span class="muted">${x.a.code}</span></td><td>${x.pcs}</td><td>${x.w}</td><td>${x.retail}</td><td>${x.wholesale}</td><td><b>${x.profit}</b></td></tr>`).join('')}
<tr><th>合計</th><th>${tot.pcs}</th><th></th><th>${tot.retail}</th><th>${tot.wh}</th><th>${tot.pf}</th></tr></table>
<p class="muted">只計入當月已付款訂單（以付款確認日為準）。客人轉帳給公司，公司月底把利潤（售價−批發價）付給代理。</p><a class="btn btn2" href="/admin/settle.csv?m=${ym}">匯出 CSV</a></div>
<div class="card wrap" id="orders"><h3>訂單</h3><p><a href="/admin?f=all#orders">全部</a> · <a href="/admin?f=unpaid#orders">待付款</a> · <a href="/admin?f=toship#orders">待出貨</a></p>
<table><tr><th>#</th><th>日期</th><th>代理</th><th>商品×數</th><th>金額</th><th>客戶</th><th>操作</th></tr>${os.map(o=>`<tr><td>${o.id}</td><td>${o.created.slice(5,10)}</td><td>${o.agentCode||'公司直營'}</td><td>${esc(P(o.productId)?.name)}×${o.qty}</td><td>${o.qty*o.unitPrice}</td><td>${esc(o.name)}<br><span class="muted">${esc(o.phone)}<br>${esc(o.address)}</span></td>
<td><form method="post" action="/admin/order/${o.id}"><button name="a" value="${o.paid?'unpaid':'paid'}" class="${o.paid?'btn2':''}" style="padding:6px 8px;font-size:12px">${o.paid?'已付✓':'標記已付'}</button> <button name="a" value="${o.shipped?'unship':'ship'}" class="${o.shipped?'btn2':''}" style="padding:6px 8px;font-size:12px">${o.shipped?'已出貨✓':'標記出貨'}</button></form></td></tr>`).join('')}</table></div>
<div class="card wrap" id="agents"><h3>代理管理</h3><table><tr><th>代碼</th><th>姓名</th><th>電話</th><th>PIN</th><th>狀態</th><th></th></tr>${db.agents.map(a=>`<tr><form method="post" action="/admin/agent"><input type="hidden" name="code" value="${a.code}"><td>${a.code}<br><a href="/qr/${a.code}.png" download>QR</a></td><td><input name="name" value="${esc(a.name)}"></td><td><input name="phone" value="${esc(a.phone)}"></td><td><input name="pin" value="${esc(a.pin)}"></td><td><select name="active"><option value="1">啟用</option><option value="0" ${a.active?'':'selected'}>停用</option></select></td><td><button style="padding:6px 8px">存</button></td></form></tr>`).join('')}</table>
<form method="post" action="/admin/agent"><h3>新增代理</h3><div class="grid"><input name="code" placeholder="代碼(英數)" required pattern="[A-Za-z0-9]{3,10}"><input name="name" placeholder="姓名" required><input name="phone" placeholder="電話"><input name="pin" placeholder="PIN" required></div><input type="hidden" name="active" value="1"><input type="hidden" name="new" value="1"><button>新增</button></form></div>
<div class="card" id="products"><h3>商品管理</h3>${db.products.map(p=>`<form method="post" action="/admin/product"><input type="hidden" name="id" value="${p.id}"><label>名稱</label><input name="name" value="${esc(p.name)}">${p.direct?`<p class="muted">公司直營（不綁代理）｜代理批發價：${esc(p.wholesale||'待定')}</p>`:''}<label>定價（≥${MIN}）</label><input type="number" name="price" min="${MIN}" value="${p.price}"><label>說明</label><textarea name="desc" rows="3">${esc(p.desc)}</textarea><button>儲存</button></form><hr>`).join('')}</div>`))});
app.get('/admin/logout',(q,r)=>{delete S[ck(q).sid];r.redirect('/admin')});
app.post('/admin/order/:id',(q,r)=>{const o=db.orders.find(x=>x.id==q.params.id);if(o){const a=q.body.a;if(a=='paid'){o.paid=1;o.paidAt=new Date().toISOString()}if(a=='unpaid'){o.paid=0;o.paidAt=null}if(a=='ship')o.shipped=1;if(a=='unship')o.shipped=0;save()}r.redirect('/admin#orders')});
app.post('/admin/agent',(q,r)=>{const b=q.body,code=String(b.code).toUpperCase().trim();let a=A(code);
if(b.new){if(a||!/^[A-Z0-9]{3,10}$/.test(code))return r.redirect('/admin?msg='+encodeURIComponent('代碼重複或格式錯誤'));a={code,prices:{}};db.products.forEach(p=>a.prices[p.id]=p.price);db.agents.push(a)}
if(!a)return r.redirect('/admin');Object.assign(a,{name:b.name,phone:b.phone,pin:String(b.pin),active:b.active=='1'});save();r.redirect('/admin?msg='+encodeURIComponent('已儲存代理 '+code)+'#agents')});
app.post('/admin/product',(q,r)=>{const p=P(q.body.id),v=parseInt(q.body.price);if(p&&v>=MIN){p.name=q.body.name;p.desc=q.body.desc;p.price=v;db.agents.forEach(a=>{if((a.prices[p.id]||0)>v)a.prices[p.id]=v});save()}r.redirect('/admin?msg='+encodeURIComponent('已儲存商品')+'#products')});
app.get('/admin/settle.csv',(q,r)=>{const ym=q.query.m||nowYm();const L=[['月份','代理代碼','代理姓名','件數','批發單價','客付總額','批發總額','應付代理利潤']];
db.agents.forEach(a=>{const s=settle(a.code,ym);L.push([ym,a.code,a.name,s.pcs,s.w,s.retail,s.wholesale,s.profit])});
r.setHeader('Content-Disposition',`attachment; filename="settlement-${ym}.csv"`);r.type('text/csv').send('\ufeff'+L.map(l=>l.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\r\n'))});
app.set('trust proxy',true);const PORT=process.env.PORT||3080;app.listen(PORT,()=>console.log('up '+PORT));
