/*
  BET PHARMA CONECTA
  Prototipo frontend para GitHub Pages.

  Escalabilidad:
  - Toda la lógica y datos están centralizados aquí.
  - Para conectar un backend futuro (Supabase, Firebase, Apps Script API, etc.),
    reemplazar únicamente las funciones del objeto Repository.
  - El HTML no necesita cambiar.
*/

const CONFIG = {
  appName: 'BET PHARMA CONECTA',
  storageKey: 'betpharma-conecta-v1',
  pointsPer1000: 1,
  rewardThreshold: 20,
  rewardAmount: 3000,
  expiryWarningDays: 90
};

const Seed = {
  products: [
    {id:'P1',nombre:'Loratadina 10 mg',categoria:'Alergias',precio:3490,stock:28,stockMinimo:8,vencimiento:'2027-03-30',temporada:'Primavera'},
    {id:'P2',nombre:'Levocetirizina',categoria:'Alergias',precio:5290,stock:12,stockMinimo:6,vencimiento:'2027-01-15',temporada:'Primavera'},
    {id:'P3',nombre:'Protector solar SPF 50',categoria:'Cuidado personal',precio:12990,stock:24,stockMinimo:8,vencimiento:'2027-11-30',temporada:'Verano'},
    {id:'P4',nombre:'Trioval día/noche',categoria:'Resfrío',precio:7990,stock:7,stockMinimo:8,vencimiento:'2026-12-28',temporada:'Invierno'},
    {id:'P5',nombre:'Nastizol',categoria:'Resfrío',precio:6490,stock:15,stockMinimo:7,vencimiento:'2027-02-20',temporada:'Invierno'},
    {id:'P6',nombre:'Paracetamol 500 mg',categoria:'Dolor y fiebre',precio:1990,stock:45,stockMinimo:12,vencimiento:'2028-05-31',temporada:'Todo el año'},
    {id:'P7',nombre:'Ibuprofeno 400 mg',categoria:'Dolor y fiebre',precio:2990,stock:5,stockMinimo:10,vencimiento:'2027-04-10',temporada:'Todo el año'},
    {id:'P8',nombre:'Vitamina C',categoria:'Vitaminas',precio:4990,stock:20,stockMinimo:6,vencimiento:'2027-09-30',temporada:'Invierno'}
  ],
  customers: [
    {id:'C1',nombre:'Cliente Demo',rut:'12.345.678-9',telefono:'+56911111111',email:'demo@betpharma.cl',puntos:13,comprasTotales:38970,ultimaCompra:'2026-11-10',autorizado:true}
  ],
  campaigns: [
    {id:'CA1',titulo:'Beneficio cliente frecuente',descripcion:'Acumula puntos y recibe beneficios de recompra.',segmento:'Clientes frecuentes',descuento:8,activa:true},
    {id:'CA2',titulo:'Temporada inteligente',descripcion:'Ofertas seleccionadas según stock real y temporada.',segmento:'Todos',descuento:10,activa:true}
  ],
  sales: [
    {id:'S1',date:'2026-11-02',customerId:'C1',total:14970},
    {id:'S2',date:'2026-11-10',customerId:'C1',total:24000}
  ]
};

const Repository = {
  load(){
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) {
      this.save(structuredClone(Seed));
      return structuredClone(Seed);
    }
    try { return JSON.parse(raw); }
    catch { this.save(structuredClone(Seed)); return structuredClone(Seed); }
  },
  save(data){ localStorage.setItem(CONFIG.storageKey, JSON.stringify(data)); },
  reset(){ localStorage.removeItem(CONFIG.storageKey); return this.load(); }
};

const State = {
  data: Repository.load(),
  activeCustomer: null,
  cart: []
};

const Utils = {
  money(n){ return '$' + Number(n || 0).toLocaleString('es-CL'); },
  date(value){
    if (!value) return '—';
    const d = new Date(value + (value.length===10 ? 'T12:00:00' : ''));
    return Number.isNaN(+d) ? value : d.toLocaleDateString('es-CL');
  },
  uid(prefix){ return prefix + '-' + Math.random().toString(36).slice(2,8).toUpperCase(); },
  daysUntil(date){
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(date+'T12:00:00'); d.setHours(0,0,0,0);
    return Math.ceil((d-today)/86400000);
  },
  normalize(s){ return String(s||'').toLowerCase().replace(/\s/g,'').replace(/[.-]/g,''); },
  season(){
    const m = new Date().getMonth()+1;
    if ([12,1,2].includes(m)) return 'Verano';
    if ([3,4,5].includes(m)) return 'Otoño';
    if ([6,7,8].includes(m)) return 'Invierno';
    return 'Primavera';
  }
};

const Logic = {
  productStatus(p){
    if (p.stock === 0) return 'critical';
    if (p.stock <= p.stockMinimo) return 'warning';
    const d = Utils.daysUntil(p.vencimiento);
    if (d <= 30) return 'critical';
    if (d <= CONFIG.expiryWarningDays) return 'warning';
    return 'ok';
  },
  alerts(){
    const out=[];
    State.data.products.forEach(p=>{
      if (p.stock <= p.stockMinimo){
        out.push({
          type:'stock',level:p.stock===0?'critical':'warning',
          title:p.stock===0?'Sin stock':'Stock bajo',
          product:p.nombre,detail:`${p.stock} unidades · mínimo ${p.stockMinimo}`
        });
      }
      const days=Utils.daysUntil(p.vencimiento);
      if (days <= CONFIG.expiryWarningDays){
        out.push({
          type:'expiry',level:days<=30?'critical':'warning',
          title:days<0?'Producto vencido':'Vencimiento próximo',
          product:p.nombre,detail:days<0?`Venció hace ${Math.abs(days)} días`:`Vence en ${days} días`
        });
      }
    });
    return out;
  },
  dashboard(){
    const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-30);
    const sales=State.data.sales.filter(s=>new Date(s.date+'T12:00:00')>=cutoff);
    const revenue=sales.reduce((a,s)=>a+s.total,0);
    const ticket=sales.length?Math.round(revenue/sales.length):0;
    const buyerMap={};
    State.data.sales.forEach(s=>{
      if(!s.customerId)return;
      buyerMap[s.customerId]=(buyerMap[s.customerId]||0)+1;
    });
    const buyerIds=Object.keys(buyerMap);
    const repeat=buyerIds.filter(id=>buyerMap[id]>=2).length;
    return {
      customers:State.data.customers.length,
      products:State.data.products.length,
      revenue,
      sales:sales.length,
      ticket,
      repurchase:buyerIds.length?Math.round(repeat/buyerIds.length*100):0,
      lowStock:this.alerts().filter(a=>a.type==='stock').length,
      expiring:this.alerts().filter(a=>a.type==='expiry').length
    };
  },
  suggestions(){
    const season=Utils.season();
    const seasonal=State.data.products.filter(p=>p.temporada===season && p.stock>p.stockMinimo);
    const expiring=State.data.products
      .map(p=>({...p,days:Utils.daysUntil(p.vencimiento)}))
      .filter(p=>p.days>=0 && p.days<=90 && p.stock>0)
      .sort((a,b)=>a.days-b.days);
    const list=[];
    if(seasonal.length){
      list.push({
        id:'SUG1',titulo:`${season}: compra inteligente`,
        descripcion:`Promocionar ${seasonal.slice(0,3).map(p=>p.nombre).join(', ')} usando stock disponible.`,
        segmento:'Clientes locales',descuento:10,reason:'Estacionalidad + stock'
      });
    }
    if(expiring.length){
      list.push({
        id:'SUG2',titulo:'Rotación preventiva',
        descripcion:`Impulsar ${expiring.slice(0,3).map(p=>p.nombre).join(', ')} antes del vencimiento.`,
        segmento:'Clientes frecuentes',descuento:15,reason:'FEFO + reducción de merma'
      });
    }
    list.push({
      id:'SUG3',titulo:'Vuelve a BET PHARMA',
      descripcion:'Beneficio de recompra para clientes identificados y autorizados.',
      segmento:'Clientes frecuentes',descuento:8,reason:'Fidelización + recompra'
    });
    return list;
  }
};

const UI = {
  toast(msg){
    const el=document.getElementById('toast');
    el.textContent=msg; el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer=setTimeout(()=>el.classList.remove('show'),2600);
  },
  metrics(){
    const d=Logic.dashboard();
    const home=[
      ['Clientes registrados',d.customers],
      ['Productos activos',d.products],
      ['Alertas de stock',d.lowStock],
      ['Próximos a vencer',d.expiring]
    ];
    document.getElementById('homeMetrics').innerHTML=home.map(([l,v])=>`
      <div class="card"><div class="metric">${v}</div><div class="metric-label">${l}</div></div>`).join('');

    const admin=[
      ['Ventas 30 días',Utils.money(d.revenue)],
      ['N° ventas',d.sales],
      ['Ticket promedio',Utils.money(d.ticket)],
      ['Recompra',d.repurchase+'%']
    ];
    document.getElementById('dashboardMetrics').innerHTML=admin.map(([l,v])=>`
      <div class="card"><div class="metric">${v}</div><div class="metric-label">${l}</div></div>`).join('');
  },
  campaigns(){
    const active=State.data.campaigns.filter(c=>c.activa);
    const html=active.length?active.map(c=>`
      <div class="campaign" style="margin-bottom:14px">
        <h4>${c.titulo} <span class="pill red">${c.descuento}%</span></h4>
        <small>${c.segmento}</small>
        <p>${c.descripcion}</p>
      </div>`).join(''):'<div class="empty">Sin campañas activas.</div>';
    document.getElementById('campaignList').innerHTML=html;
    document.getElementById('homeCampaigns').innerHTML=html;
  },
  alerts(){
    const alerts=Logic.alerts();
    const html=alerts.length?alerts.slice(0,8).map(a=>`
      <div class="alert">
        <div><strong>${a.product}</strong><small>${a.title} · ${a.detail}</small></div>
        <span class="pill ${a.level==='critical'?'red':'amber'}">${a.type==='stock'?'Stock':'Vence'}</span>
      </div>`).join(''):'<div class="empty">Sin alertas críticas.</div>';
    document.getElementById('homeAlerts').innerHTML=html;
    document.getElementById('adminAlerts').innerHTML=html;
  },
  products(filter=''){
    const q=Utils.normalize(filter);
    const items=State.data.products.filter(p=>!q || Utils.normalize(p.nombre+' '+p.categoria).includes(q));
    document.getElementById('productGrid').innerHTML=items.map(p=>{
      const status=Logic.productStatus(p);
      return `<article class="card product-card">
        <div class="product-top"><span class="tag">${p.categoria}</span><span class="tag ${status}">${status==='ok'?'Disponible':status==='warning'?'Revisar':'Crítico'}</span></div>
        <h3>${p.nombre}</h3>
        <p>${p.temporada} · vence ${Utils.date(p.vencimiento)}</p>
        <div class="stock">Stock: <b>${p.stock}</b></div>
        <div class="price">${Utils.money(p.precio)}</div>
        <button class="btn primary" ${p.stock<=0?'disabled':''} onclick="App.addToCart('${p.id}')">Agregar</button>
      </article>`;
    }).join('');
  },
  cart(){
    const lines=State.cart.map(item=>{
      const p=State.data.products.find(x=>x.id===item.productId);
      if(!p)return '';
      return `<div class="cart-line">
        <div><strong>${p.nombre}</strong><div class="mini-note">${Utils.money(p.precio)} c/u</div></div>
        <div class="qty">
          <button onclick="App.changeQty('${p.id}',-1)">−</button><b>${item.qty}</b><button onclick="App.changeQty('${p.id}',1)">+</button>
        </div>
        <strong>${Utils.money(p.precio*item.qty)}</strong>
      </div>`;
    }).join('');
    const total=State.cart.reduce((sum,item)=>{
      const p=State.data.products.find(x=>x.id===item.productId);
      return sum+(p?p.precio*item.qty:0);
    },0);
    document.getElementById('cartBox').innerHTML=State.cart.length?`
      ${lines}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:18px">
        <div><div class="mini-note">Cliente</div><strong>${State.activeCustomer?State.activeCustomer.nombre:'Sin identificar'}</strong></div>
        <div style="text-align:right"><div class="mini-note">Total</div><div class="metric">${Utils.money(total)}</div></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
        <button class="btn ghost" onclick="App.openCustomerModal()">Identificar cliente</button>
        <button class="btn primary" onclick="App.checkout()">Registrar venta</button>
      </div>`:'<div class="empty">El carrito está vacío.</div>';
  },
  loyalty(){
    const c=State.activeCustomer;
    if(!c){
      document.getElementById('loyaltyArea').innerHTML=`
        <div class="card empty"><h3>Identifica a un cliente</h3><p>Así podrás mostrar puntos, recompra y beneficios.</p><button class="btn primary" onclick="App.openCustomerModal()">Buscar cliente</button></div>`;
      return;
    }
    const progress=Math.min(100,Math.round((c.puntos/CONFIG.rewardThreshold)*100));
    document.getElementById('loyaltyArea').innerHTML=`
      <div class="loyalty">
        <div class="loyalty-card">
          <div class="eyebrow" style="color:#ff9ba0">BET PHARMA CONECTA</div>
          <h2>${c.nombre}</h2>
          <div class="points">${c.puntos}</div>
          <div>Puntos disponibles</div>
          <div class="progress"><span style="width:${progress}%"></span></div>
          <small>${Math.max(0,CONFIG.rewardThreshold-c.puntos)} puntos para el próximo beneficio</small>
        </div>
        <div class="card">
          <h3>Relación con el cliente</h3>
          <div class="grid cols-2" style="margin-top:12px">
            <div><div class="metric">${Utils.money(c.comprasTotales)}</div><div class="metric-label">Compras acumuladas</div></div>
            <div><div class="metric">${Utils.date(c.ultimaCompra)}</div><div class="metric-label">Última compra</div></div>
          </div>
          <hr style="border:0;border-top:1px solid var(--line);margin:20px 0">
          <h4>Beneficio objetivo</h4>
          <p>Al llegar a ${CONFIG.rewardThreshold} puntos, el prototipo desbloquea un beneficio de ${Utils.money(CONFIG.rewardAmount)} para una compra futura.</p>
          <p class="mini-note">En una implementación real, las reglas se ajustan a la normativa, margen y política comercial de BET PHARMA.</p>
        </div>
      </div>`;
  },
  suggestions(){
    document.getElementById('suggestionList').innerHTML=Logic.suggestions().map(s=>`
      <div class="campaign" style="margin-bottom:14px">
        <h4>${s.titulo}</h4>
        <small>${s.reason}</small>
        <p>${s.descripcion}</p>
        <button class="btn" onclick="App.activateSuggestion('${s.id}')">Activar campaña</button>
      </div>`).join('');
  },
  inventory(){
    document.getElementById('inventoryTable').innerHTML=State.data.products.map(p=>{
      const status=Logic.productStatus(p);
      return `<tr>
        <td><b>${p.nombre}</b></td><td>${p.categoria}</td><td>${p.stock}</td><td>${p.stockMinimo}</td>
        <td>${Utils.date(p.vencimiento)}</td>
        <td><span class="pill ${status==='critical'?'red':status==='warning'?'amber':'green'}">${status}</span></td>
      </tr>`;
    }).join('');
  },
  render(){
    this.metrics(); this.campaigns(); this.alerts(); this.products(document.getElementById('productSearch')?.value||'');
    this.cart(); this.loyalty(); this.suggestions(); this.inventory();
  }
};

const App = {
  init(){
    document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>this.go(btn.dataset.view)));
    document.getElementById('productSearch').addEventListener('input',e=>UI.products(e.target.value));
    document.getElementById('customerForm').addEventListener('submit',e=>this.saveCustomer(e));
    document.getElementById('productForm').addEventListener('submit',e=>this.saveProduct(e));
    UI.render();
  },
  go(id){
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===id));
    window.scrollTo({top:430,behavior:'smooth'});
  },
  openCustomerModal(){ document.getElementById('customerModal').classList.add('show'); },
  closeCustomerModal(){ document.getElementById('customerModal').classList.remove('show'); },
  lookupCustomer(){
    const q=Utils.normalize(document.getElementById('customerQuery').value);
    const c=State.data.customers.find(x=>[x.rut,x.telefono,x.email].some(v=>Utils.normalize(v)===q));
    const box=document.getElementById('customerSearchResult');
    if(!c){
      box.innerHTML='<div class="mini-note">Cliente no encontrado. Puedes registrarlo abajo.</div>';
      return;
    }
    State.activeCustomer=c;
    box.innerHTML=`<div class="card" style="box-shadow:none"><b>${c.nombre}</b><div class="mini-note">${c.puntos} puntos · ${Utils.money(c.comprasTotales)} acumulados</div><button class="btn primary" style="margin-top:8px" onclick="App.selectCustomer('${c.id}')">Usar cliente</button></div>`;
  },
  selectCustomer(id){
    State.activeCustomer=State.data.customers.find(c=>c.id===id)||null;
    this.closeCustomerModal(); UI.render(); this.go('beneficios');
  },
  saveCustomer(e){
    e.preventDefault();
    const form=new FormData(e.currentTarget);
    const customer={
      id:Utils.uid('C'),nombre:String(form.get('nombre')||'').trim(),rut:String(form.get('rut')||'').trim(),
      telefono:String(form.get('telefono')||'').trim(),email:String(form.get('email')||'').trim(),
      puntos:0,comprasTotales:0,ultimaCompra:'',autorizado:form.get('autorizado')==='on'
    };
    if(!customer.nombre || (!customer.rut && !customer.telefono && !customer.email)){
      UI.toast('Completa nombre y al menos un dato de contacto.'); return;
    }
    State.data.customers.push(customer); State.activeCustomer=customer; Repository.save(State.data);
    e.currentTarget.reset(); this.closeCustomerModal(); UI.render(); UI.toast('Cliente registrado.');
    this.go('beneficios');
  },
  addToCart(productId){
    const p=State.data.products.find(x=>x.id===productId);
    if(!p || p.stock<=0)return;
    const line=State.cart.find(x=>x.productId===productId);
    if(line && line.qty<p.stock) line.qty++;
    else if(!line) State.cart.push({productId,qty:1});
    UI.cart(); UI.toast('Producto agregado.');
  },
  changeQty(productId,delta){
    const line=State.cart.find(x=>x.productId===productId);
    const p=State.data.products.find(x=>x.id===productId);
    if(!line||!p)return;
    line.qty=Math.max(0,Math.min(p.stock,line.qty+delta));
    if(line.qty===0) State.cart=State.cart.filter(x=>x.productId!==productId);
    UI.cart();
  },
  checkout(){
    if(!State.cart.length)return;
    let total=0;
    for(const line of State.cart){
      const p=State.data.products.find(x=>x.id===line.productId);
      if(!p || p.stock<line.qty){UI.toast('Revisa el stock antes de vender.');return;}
    }
    State.cart.forEach(line=>{
      const p=State.data.products.find(x=>x.id===line.productId);
      p.stock-=line.qty; total+=p.precio*line.qty;
    });
    const sale={id:Utils.uid('S'),date:new Date().toISOString().slice(0,10),customerId:State.activeCustomer?.id||'',total};
    State.data.sales.push(sale);
    if(State.activeCustomer){
      const before=State.activeCustomer.puntos;
      const earned=Math.floor(total/1000)*CONFIG.pointsPer1000;
      State.activeCustomer.puntos+=earned;
      State.activeCustomer.comprasTotales+=total;
      State.activeCustomer.ultimaCompra=sale.date;
      UI.toast(before<CONFIG.rewardThreshold && State.activeCustomer.puntos>=CONFIG.rewardThreshold
        ? `Beneficio desbloqueado: ${Utils.money(CONFIG.rewardAmount)}`
        : `Venta registrada · +${earned} puntos`);
    }else UI.toast('Venta registrada.');
    State.cart=[]; Repository.save(State.data); UI.render();
  },
  saveProduct(e){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const p={
      id:Utils.uid('P'),nombre:String(f.get('nombre')).trim(),categoria:String(f.get('categoria')).trim(),
      precio:Number(f.get('precio')),stock:Number(f.get('stock')),stockMinimo:Number(f.get('stockMinimo')),
      vencimiento:String(f.get('vencimiento')||''),temporada:String(f.get('temporada')||'Todo el año')
    };
    State.data.products.push(p); Repository.save(State.data); e.currentTarget.reset(); UI.render(); UI.toast('Producto guardado.');
  },
  activateSuggestion(id){
    const s=Logic.suggestions().find(x=>x.id===id); if(!s)return;
    State.data.campaigns.push({id:Utils.uid('CA'),titulo:s.titulo,descripcion:s.descripcion,segmento:s.segmento,descuento:s.descuento,activa:true});
    Repository.save(State.data); UI.render(); UI.toast('Campaña activada.');
  },
  resetDemo(){
    if(!confirm('¿Restablecer los datos de demostración?'))return;
    State.data=Repository.reset(); State.activeCustomer=null; State.cart=[]; UI.render(); UI.toast('Demo restablecida.');
  }
};

window.App=App;
document.addEventListener('DOMContentLoaded',()=>App.init());
