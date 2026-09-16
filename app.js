
const defaultState = {
  businesses: [
    {
      id:'nektara',
      nombre:'Nektara',
      icono:'🍯',
      tipo:'Miel y productos derivados',
      moneda:'MXN',
      descripcion:'Venta de miel y presentaciones derivadas.'
    },
    {
      id:'velas',
      nombre:'Velas',
      icono:'🕯️',
      tipo:'Velas artesanales',
      moneda:'MXN',
      descripcion:'Producción y venta de velas artesanales.'
    }
  ],
  orders: [
    {id:'P-001', cliente:'Mariana López', negocio:'nektara', producto:'Miel 500 g', cantidad:2, total:360, anticipo:360, saldo:0, entrega:'2026-09-13', estado:'Pagado'},
    {id:'P-002', cliente:'Ana Ruiz', negocio:'velas', producto:'Vela vainilla', cantidad:3, total:540, anticipo:200, saldo:340, entrega:'2026-09-14', estado:'Preparando'},
    {id:'P-003', cliente:'Carla Méndez', negocio:'nektara', producto:'Miel 1 kg', cantidad:1, total:320, anticipo:0, saldo:320, entrega:'2026-09-15', estado:'Nuevo'},
    {id:'P-004', cliente:'Fernanda Soto', negocio:'velas', producto:'Vela lavanda', cantidad:2, total:390, anticipo:390, saldo:0, entrega:'2026-09-12', estado:'Listo'}
  ],
  inventory: [
    {nombre:'Miel 500 g', negocio:'nektara', stock:4, minimo:6, unidad:'pzas'},
    {nombre:'Frascos 200 ml', negocio:'velas', stock:7, minimo:10, unidad:'pzas'},
    {nombre:'Esencia vainilla', negocio:'velas', stock:120, minimo:150, unidad:'ml'},
    {nombre:'Miel 1 kg', negocio:'nektara', stock:3, minimo:4, unidad:'pzas'}
  ],
  summary: {
    nektara:{ventas:4960,gastos:1810,utilidad:3150,pedidos:7},
    velas:{ventas:3460,gastos:1340,utilidad:2120,pedidos:5}
  },
  expenseCategories: [
    {id:'materia-prima', nombre:'Materia prima', tipo:'directo', inventariable:true, inventarioTipo:'Materia prima'},
    {id:'empaque', nombre:'Empaque', tipo:'directo', inventariable:true, inventarioTipo:'Empaque'},
    {id:'insumos', nombre:'Insumos', tipo:'directo', inventariable:true, inventarioTipo:'Insumo'},
    {id:'operacion', nombre:'Operación', tipo:'operativo', inventariable:false},
    {id:'ventas', nombre:'Ventas', tipo:'operativo', inventariable:false},
    {id:'administracion', nombre:'Administración', tipo:'operativo', inventariable:false},
    {id:'otros', nombre:'Otros', tipo:'operativo', inventariable:false}
  ],
  expenses: [],
  candleProportionPresets: [],
  containers: [
    {id:'frasco-hex-500', nombre:'Frasco hexagonal 500 g', tipo:'Frasco', capacidad:500, unidad:'g', material:'Vidrio', proveedor:'', costoUnitario:0, stock:0, stockMinimo:0, activo:true},
    {id:'vaso-ambar-250', nombre:'Vaso ámbar 250 ml', tipo:'Vaso', capacidad:250, unidad:'ml', material:'Vidrio', proveedor:'', costoUnitario:0, stock:0, stockMinimo:0, activo:true}
  ],
  honeyTypes: [
    {id:'miel-multifloral', nombre:'Miel multifloral', proveedor:'', activa:true},
    {id:'miel-azahar', nombre:'Miel de azahar', proveedor:'', activa:true}
  ]
};

function migrateState(raw){
  if(!raw) return structuredClone(defaultState);
  const s = raw;
  if(!s.businesses) s.businesses = structuredClone(defaultState.businesses);

  // Migrate previous order/inventory business names to ids.
  (s.orders || []).forEach(o=>{
    if(o.negocio === 'Nektara') o.negocio='nektara';
    if(o.negocio === 'Velas') o.negocio='velas';
  });
  (s.inventory || []).forEach(i=>{
    if(i.negocio === 'Nektara') i.negocio='nektara';
    if(i.negocio === 'Velas') i.negocio='velas';
  });

  // Migrate summary from old all/nektara/velas structure.
  if(s.summary?.all) delete s.summary.all;
  if(!s.summary) s.summary = structuredClone(defaultState.summary);
  if(!s.expenseCategories) s.expenseCategories = structuredClone(defaultState.expenseCategories);
  if(!s.expenses) s.expenses = [];
  if(!s.honeyTypes) s.honeyTypes = structuredClone(defaultState.honeyTypes);
  if(!s.containers) s.containers = structuredClone(defaultState.containers);
  if(!s.candleProportionPresets) s.candleProportionPresets = [];
  s.expenseCategories = s.expenseCategories.map(c=>{
    if(typeof c.inventariable === 'boolean') return c;
    if(['materia-prima','empaque','insumos'].includes(c.id)){
      return {...c, inventariable:true, inventarioTipo:c.id==='materia-prima'?'Materia prima':(c.id==='empaque'?'Empaque':'Insumo')};
    }
    return {...c, inventariable:false};
  });
  for(const b of s.businesses){
    if(!s.summary[b.id]) s.summary[b.id] = {ventas:0,gastos:0,utilidad:0,pedidos:0};
  }
  return s;
}

const stored = JSON.parse(localStorage.getItem('negociosState') || 'null');
const state = migrateState(stored);
let selectedBusiness = 'all';
let selectedSeries = 'ingresos';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = (n, currency='MXN') => new Intl.NumberFormat('es-MX',{style:'currency',currency}).format(n);
const slugify = str => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');


function showToast(message, type='success', detail=''){
  let container = $('#toastContainer');

  if(!container){
    container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toastContainer';
    container.setAttribute('aria-live','polite');
    container.setAttribute('aria-atomic','true');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${type==='success' ? '✓' : type==='error' ? '!' : 'i'}</div>
    <div class="toast-copy">
      <strong>${message}</strong>
      ${detail ? `<small>${detail}</small>` : ''}
    </div>
    <button class="toast-close" aria-label="Cerrar">×</button>
  `;

  container.appendChild(toast);
  requestAnimationFrame(()=>toast.classList.add('show'));

  const remove = ()=>{
    toast.classList.remove('show');
    setTimeout(()=>toast.remove(),220);
  };

  toast.querySelector('.toast-close')?.addEventListener('click',remove);
  setTimeout(remove,3600);
}

function showError(message, detail=''){
  showToast(message,'error',detail);
}


function saveState(){ localStorage.setItem('negociosState', JSON.stringify(state)); }

function getBusiness(id){
  return state.businesses.find(b=>b.id===id);
}
function businessLabel(id){
  const b = getBusiness(id);
  return b ? `${b.icono || '🏷️'} ${b.nombre}` : id;
}
function getSummary(id){
  if(id !== 'all') return state.summary[id] || {ventas:0,gastos:0,utilidad:0,pedidos:0};
  return Object.values(state.summary).reduce((acc,s)=>{
    acc.ventas += Number(s.ventas||0);
    acc.gastos += Number(s.gastos||0);
    acc.utilidad += Number(s.utilidad||0);
    acc.pedidos += Number(s.pedidos||0);
    return acc;
  },{ventas:0,gastos:0,utilidad:0,pedidos:0});
}

const viewMeta = {
  resumen:['Resumen','Vista general del negocio'],
  pedidos:['Pedidos','Seguimiento, cobros y entregas'],
  productos:['Productos','Catálogo y precios'],
  inventario:['Inventario','Existencias y materia prima'],
  produccion:['Producción','Recetas, lotes y consumo de insumos'],
  proporciones:['Proporciones','Calculadora de ingredientes por porcentaje'],
  clientes:['Clientes','Historial y comportamiento de compra'],
  gastos:['Gastos','Egresos y costos del negocio'],
  reportes:['Reportes','Ventas, utilidad y desempeño'],
  catalogos:['Catálogos','Envases, tipos de miel y referencias reutilizables'],
  configuracion:['Configuración','Emprendimientos y preferencias']
};

function goView(name){
  $$('.view').forEach(v => v.classList.remove('active'));
  $('#view-'+name).classList.add('active');
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view===name));
  $('#pageTitle').textContent = viewMeta[name][0];
  const current = selectedBusiness==='all' ? 'Todos los negocios' : businessLabel(selectedBusiness);
  $('#pageSubtitle').textContent = `${viewMeta[name][1]} · ${current}`;
  $('#sidebar').classList.remove('open');
  if(name==='gastos') renderExpensesView();
  if(name==='productos') renderProductsView();
  if(name==='proporciones') renderProportionsView();
  if(name==='catalogos') renderCatalogsView();
}

function selectBusiness(id, closeGate=true){
  selectedBusiness = id;
  updateBusinessSpecificNavigation();
  if(closeGate) $('#businessGate').classList.add('hidden');
  refresh();
}

function renderBusinessGate(){
  const grid = $('#businessSelectorGrid');
  grid.innerHTML = state.businesses.map((b,i)=>`
    <button class="business-choice-card" data-business-choice="${b.id}" style="animation-delay:${i*0.08}s">
      <div class="choice-icon">${b.icono || '🏷️'}</div>
      <h3>${b.nombre}</h3>
      <p>${b.descripcion || b.tipo || 'Gestionar este emprendimiento'}</p>
      <span class="choice-arrow">→</span>
    </button>
  `).join('') + `
    <button class="business-choice-card new-business" id="newBusinessCard" style="animation-delay:${state.businesses.length*0.08}s">
      <div class="choice-icon">＋</div>
      <h3>Crear otro negocio</h3>
      <p>Constituye un nuevo emprendimiento y agrégalo al sistema.</p>
      <span class="choice-arrow">→</span>
    </button>
  `;

  $$('[data-business-choice]').forEach(btn=>{
    btn.addEventListener('click',()=>selectBusiness(btn.dataset.businessChoice));
  });
  $('#newBusinessCard').addEventListener('click',openBusinessModal);
}



function filteredOrders(){
  if(selectedBusiness==='all') return state.orders;
  return state.orders.filter(o => o.negocio===selectedBusiness);
}
function filteredInventory(){
  if(selectedBusiness==='all') return state.inventory;
  return state.inventory.filter(i => i.negocio===selectedBusiness);
}

function renderMetrics(){
  const s = getSummary(selectedBusiness);
  const active = filteredOrders().filter(o=>!['Pagado','Entregado'].includes(o.estado)).length;
  const cards = [
    ['Ventas del mes', money(s.ventas), '+12% vs. mes anterior'],
    ['Gastos', money(s.gastos), 'Costos y egresos registrados'],
    ['Utilidad estimada', money(s.utilidad), s.ventas ? `${Math.round((s.utilidad/s.ventas)*100)}% de margen` : 'Sin ventas registradas'],
    ['Pedidos', s.pedidos, `${active} activos ahora`]
  ];
  $('#metricsGrid').innerHTML = cards.map(c=>`
    <article class="metric-card"><span>${c[0]}</span><strong>${c[1]}</strong><small>${c[2]}</small></article>
  `).join('');
}

function renderRecentOrders(){
  $('#recentOrders').innerHTML = filteredOrders().slice(-4).reverse().map(o=>`
    <div class="order-row">
      <div class="order-meta">
        <strong>${o.cliente}</strong>
        <small>${businessLabel(o.negocio)} · ${money(o.total)}</small>
      </div>
      <span class="badge ${o.estado}">${o.estado}</span>
    </div>
  `).join('') || '<p>No hay pedidos.</p>';
}

function renderLowStock(){
  const low = filteredInventory().filter(i=>i.stock<=i.minimo);
  $('#lowStockList').innerHTML = low.map(i=>`
    <div class="stock-row">
      <div class="stock-meta"><strong>${i.nombre}</strong><small>${businessLabel(i.negocio)}${i.tipo ? ' · '+i.tipo : ''}${i.costoPromedio ? ' · '+money(i.costoPromedio)+'/'+i.unidad : ''}</small></div>
      <span class="badge">${i.stock} ${i.unidad}</span>
    </div>
  `).join('') || '<p>Sin alertas de stock.</p>';
}

function renderBusinessCards(){
  $('#businessCards').innerHTML = state.businesses.map(b=>{
    const s = getSummary(b.id);
    return `
      <div class="business-card">
        <div><strong>${b.icono || '🏷️'} ${b.nombre}</strong><small style="display:block;color:var(--muted);margin-top:3px">${s.pedidos} pedidos este mes</small></div>
        <div style="text-align:right"><strong>${money(s.ventas,b.moneda||'MXN')}</strong><small style="display:block;color:var(--muted);margin-top:3px">Utilidad ${money(s.utilidad,b.moneda||'MXN')}</small></div>
      </div>`;
  }).join('');
}

function renderOrdersTable(){
  const q = ($('#orderSearch')?.value || '').toLowerCase();
  const status = $('#orderStatusFilter')?.value || 'all';
  const rows = filteredOrders().filter(o => {
    const matchesQ = (o.cliente+' '+o.id+' '+o.producto).toLowerCase().includes(q);
    const matchesStatus = status==='all' || o.estado===status;
    return matchesQ && matchesStatus;
  });
  $('#ordersTableBody').innerHTML = rows.map(o=>`
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.cliente}<br><small style="color:var(--muted)">${o.producto}</small></td>
      <td>${businessLabel(o.negocio)}</td>
      <td>${o.entrega}</td>
      <td>${money(o.total,getBusiness(o.negocio)?.moneda || 'MXN')}</td>
      <td>${money(o.saldo,getBusiness(o.negocio)?.moneda || 'MXN')}</td>
      <td><span class="badge ${o.estado}">${o.estado}</span></td>
    </tr>
  `).join('');
}

function drawChart(){
  const c = $('#lineChart');
  if(!c) return;
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = c.getBoundingClientRect();
  c.width = rect.width*dpr;
  c.height = rect.height*dpr;
  ctx.scale(dpr,dpr);
  const w = rect.width, h = rect.height;
  ctx.clearRect(0,0,w,h);

  const allData = {
    ingresos:[5300,6100,5900,7200,7600,8420],
    gastos:[2400,2800,2650,3100,2980,3150],
    utilidad:[2900,3300,3250,4100,4620,5270]
  };
  let series = allData[selectedSeries];
  if(selectedBusiness !== 'all'){
    const s = getSummary(selectedBusiness);
    const ratio = getSummary('all').ventas ? (s.ventas/getSummary('all').ventas) : 0.5;
    series = series.map(v=>Math.round(v*ratio));
  }

  const labels = ['Abr','May','Jun','Jul','Ago','Sep'];
  const pad = {l:42,r:18,t:18,b:34};
  const max = Math.max(...series,1)*1.15;

  ctx.strokeStyle = '#e6e6df';
  ctx.lineWidth = 1;
  for(let i=0;i<4;i++){
    const y = pad.t + ((h-pad.t-pad.b)/3)*i;
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();
  }

  ctx.fillStyle='#8a8a82';
  ctx.font='12px system-ui';
  labels.forEach((lab,i)=>{
    const x = pad.l + (w-pad.l-pad.r)*(i/(labels.length-1));
    ctx.fillText(lab,x-10,h-10);
  });

  const pts = series.map((v,i)=>({
    x:pad.l + (w-pad.l-pad.r)*(i/(series.length-1)),
    y:pad.t + (h-pad.t-pad.b)*(1-v/max)
  }));

  ctx.strokeStyle = '#1c1c1a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  pts.forEach((p,i)=> i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.stroke();

  ctx.fillStyle='#1c1c1a';
  pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();});
}


function expenseCategoryName(id){
  return state.expenseCategories.find(c=>c.id===id)?.nombre || id;
}

function renderExpensesView(){
  const business = selectedBusiness==='all' ? null : getBusiness(selectedBusiness);
  const filtered = selectedBusiness==='all'
    ? state.expenses
    : state.expenses.filter(e=>e.negocio===selectedBusiness);

  if(selectedBusiness==='all'){
    $('#view-gastos').innerHTML = `
      <div class="generic-card">
        <h2>Gastos</h2>
        <p>Para registrar o administrar gastos, entra primero a un negocio específico.</p>
        <button class="primary-btn" id="chooseBusinessForExpensesBtn">Elegir negocio</button>
      </div>`;
    $('#chooseBusinessForExpensesBtn')?.addEventListener('click',()=>{
      $('#businessGate').classList.remove('hidden');
      renderBusinessGate();
    });
    return;
  }

  $('#view-gastos').innerHTML = `
    <div class="section-actions">
      <div>
        <h2>Gastos</h2>
        <p>${selectedBusiness==='all' ? 'Vista consolidada de todos los emprendimientos.' : `Control de gastos de ${businessLabel(selectedBusiness)}.`}</p>
      </div>
    </div>

    <div class="expense-tabs">
      <button class="expense-tab active" data-expense-tab="registrar">Registrar</button>
      <button class="expense-tab" data-expense-tab="historial">Historial</button>
      <button class="expense-tab" data-expense-tab="categorias">Categorías</button>
    </div>

    <div class="expense-pane active" id="expense-pane-registrar">
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3>Registrar gasto</h3>
            <p>Captura rápida y opción de sumar insumos al inventario.</p>
          </div>
        </div>

        <form id="expenseForm">
          <div class="form-grid">
            <label>
              Fecha
              <input name="fecha" type="date" value="${new Date().toISOString().slice(0,10)}" required />
            </label>
            <label>
              Concepto
              <input name="concepto" required placeholder="Ej. Cera de soya 5 kg" />
            </label>
            <label>
              Categoría
              <select name="categoria" required>
                ${state.expenseCategories.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('')}
              </select>
            </label>
            <div class="auto-type-card">
              <span>Tipo asignado automáticamente</span>
              <strong id="autoExpenseTypeLabel">—</strong>
            </div>
            <label>
              Monto
              <input name="monto" type="number" min="0" step="0.01" required placeholder="0.00" />
            </label>
            <label>
              Método de pago
              <select name="metodo">
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Tarjeta</option>
                <option>Otro</option>
              </select>
            </label>
            <label>
              Proveedor
              <input name="proveedor" placeholder="Opcional" />
            </label>
          </div>

          <div class="inventory-link-card hidden" id="inventoryRequiredCard">
            <div class="inventory-required-head">
              <div>
                <strong>Este gasto debe ingresar al inventario</strong>
                <small>La categoría seleccionada corresponde a una compra inventariable.</small>
              </div>
              <span class="badge" id="inventoryTypeBadge">Inventariable</span>
            </div>

            <div class="inventory-fields" id="inventoryFields">
              <div class="form-grid">
                <label>
                  Seleccionar del catálogo
                  <select name="containerCatalogId" id="containerCatalogSelect">
                    <option value="">— Captura manual —</option>
                    ${state.containers.filter(c=>c.activo!==false).map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('')}
                  </select>
                </label>
                <label class="inventory-auto-field">
                  Insumo / producto
                  <input name="inventarioNombre" placeholder="Ej. Cera de soya" />
                </label>
                <label class="inventory-auto-field">
                  Tipo de inventario
                  <select name="inventarioTipo">
                    <option value="Materia prima">Materia prima</option>
                    <option value="Insumo">Insumo</option>
                    <option value="Empaque">Empaque</option>
                    <option value="Producto terminado">Producto terminado</option>
                    <option value="Operación">Operación</option>
                  </select>
                </label>
                <label>
                  Cantidad comprada
                  <input name="inventarioCantidad" type="number" min="0.0001" step="0.0001" placeholder="0" />
                </label>
                <label class="inventory-auto-field">
                  Unidad
                  <input name="inventarioUnidad" placeholder="kg, pzas, ml..." />
                </label>
                <label class="inventory-auto-field">
                  Avisarme cuando queden
                  <input name="inventarioMinimo" type="number" min="0" step="0.0001" value="0" />
                </label>
                <label>
                  Costo unitario calculado
                  <input name="costoUnitarioPreview" id="costoUnitarioPreview" readonly placeholder="$0.00" />
                </label>
              </div>
            </div>
          </div>

          <label class="full">
            Notas
            <textarea name="notas" rows="3" placeholder="Detalles adicionales..."></textarea>
          </label>

          <div class="modal-actions">
            <button type="button" class="secondary-btn" id="clearExpenseBtn">Limpiar</button>
            <button type="submit" class="primary-btn" id="saveExpenseBtn">Guardar gasto</button>
          </div>
        </form>
      </div>
    </div>

    <div class="expense-pane" id="expense-pane-historial">
      <div class="panel table-panel">
        <div class="table-toolbar">
          <input id="expenseSearch" type="search" placeholder="Buscar concepto o proveedor..." />
          <select id="expenseCategoryFilter">
            <option value="all">Todas las categorías</option>
            ${state.expenseCategories.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('')}
          </select>
        </div>
        <div class="expense-summary-strip">
          <div><span>Total registrado</span><strong>${money(filtered.reduce((a,e)=>a+Number(e.monto||0),0))}</strong></div>
          <div><span>Movimientos</span><strong>${filtered.length}</strong></div>
        </div>
        <div class="bulk-actions hidden" id="expenseBulkActions">
          <span><strong id="expenseSelectedCount">0</strong> seleccionados</span>
          <div>
            <button class="secondary-btn" id="bulkDeleteExpenses">Eliminar seleccionados</button>
          </div>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" id="selectAllExpenses" aria-label="Seleccionar todos" /></th>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Negocio</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>Proveedor</th>
                <th>Monto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="expensesTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="expense-pane" id="expense-pane-categorias">
      <div class="dashboard-grid lower">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Categorías actuales</h3>
              <p>Puedes agregar categorías nuevas para otros emprendimientos.</p>
            </div>
          </div>
          <div class="category-list">
            ${state.expenseCategories.map(c=>`
              <div class="category-row">
                <div>
                  <strong>${c.nombre}</strong>
                  <small>${c.tipo==='directo'?'Costo directo':'Gasto operativo'}${c.inventariable?' · Inventariable':''}</small>
                </div>
                <span class="badge">${c.id}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Nueva categoría</h3>
              <p>La categoría estará disponible para todos los negocios.</p>
            </div>
          </div>
          <form id="categoryForm">
            <label>
              Nombre
              <input name="nombre" required placeholder="Ej. Fotografía de producto" />
            </label>
            <label style="margin-top:14px">
              Tipo predeterminado
              <select name="tipo">
                <option value="directo">Costo directo</option>
                <option value="operativo">Gasto operativo</option>
              </select>
            </label>
            <label class="checkbox-row" style="margin-top:14px">
              <input type="checkbox" name="inventariable" id="newCategoryInventariable" />
              <span>
                <strong>Es una categoría inventariable</strong>
                <small>Obligará a capturar existencias al registrar un gasto.</small>
              </span>
            </label>
            <label style="margin-top:14px" id="newCategoryInventoryTypeWrap" class="hidden">
              Tipo de inventario
              <select name="inventarioTipo">
                <option value="Materia prima">Materia prima</option>
                <option value="Insumo">Insumo</option>
                <option value="Empaque">Empaque</option>
                <option value="Producto terminado">Producto terminado</option>
                <option value="Operación">Operación</option>
              </select>
            </label>
            <div class="modal-actions">
              <button type="submit" class="primary-btn">Agregar categoría</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  bindExpenseEvents();
  renderExpenseTable();
}

function renderExpenseTable(){
  const body = $('#expensesTableBody');
  if(!body) return;
  const q = ($('#expenseSearch')?.value || '').toLowerCase();
  const cat = $('#expenseCategoryFilter')?.value || 'all';

  let rows = selectedBusiness==='all'
    ? state.expenses
    : state.expenses.filter(e=>e.negocio===selectedBusiness);

  rows = rows.filter(e=>{
    const matchesQ = (e.concepto+' '+(e.proveedor||'')).toLowerCase().includes(q);
    const matchesCat = cat==='all' || e.categoria===cat;
    return matchesQ && matchesCat;
  }).sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)));

  body.innerHTML = rows.map(e=>`
    <tr data-expense-id="${e.id}">
      <td><input type="checkbox" class="expense-row-check" value="${e.id}" aria-label="Seleccionar gasto" /></td>
      <td>${e.fecha}</td>
      <td><strong>${e.concepto}</strong>${e.inventarioVinculado ? '<br><small style="color:var(--muted)">↳ ligado a inventario</small>' : ''}</td>
      <td>${businessLabel(e.negocio)}</td>
      <td>${expenseCategoryName(e.categoria)}</td>
      <td>${e.tipo==='directo'?'Costo directo':'Operativo'}</td>
      <td>${e.proveedor || '—'}</td>
      <td><strong>${money(e.monto,getBusiness(e.negocio)?.moneda || 'MXN')}</strong></td>
      <td>
        <div class="row-actions">
          <button class="icon-action edit-expense-btn" data-id="${e.id}" title="Editar">✎</button>
          <button class="icon-action danger delete-expense-btn" data-id="${e.id}" title="Eliminar">🗑</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:28px">Aún no hay gastos registrados.</td></tr>`;

  bindExpenseHistoryActions();

}


function recalcBusinessSummaryFromExpenses(businessId){
  const s = state.summary[businessId] || {ventas:0,gastos:0,utilidad:0,pedidos:0};
  s.gastos = state.expenses
    .filter(e=>e.negocio===businessId)
    .reduce((acc,e)=>acc+Number(e.monto||0),0);
  s.utilidad = Number(s.ventas||0) - Number(s.gastos||0);
  state.summary[businessId] = s;
}

function deleteExpenseById(id){
  const expense = state.expenses.find(e=>e.id===id);
  if(!expense) return;

  // Important: deleting an expense does not auto-reverse inventory here.
  // We leave stock intact to avoid accidental negative corrections; inventory adjustments can be explicit.
  state.expenses = state.expenses.filter(e=>e.id!==id);
  recalcBusinessSummaryFromExpenses(expense.negocio);
}

function bindExpenseHistoryActions(){
  const checks = $$('.expense-row-check');
  const selectAll = $('#selectAllExpenses');
  const bulkBar = $('#expenseBulkActions');
  const countEl = $('#expenseSelectedCount');

  function updateBulkState(){
    const selected = $$('.expense-row-check:checked');
    if(countEl) countEl.textContent = selected.length;
    bulkBar?.classList.toggle('hidden', selected.length===0);
    if(selectAll){
      selectAll.checked = checks.length>0 && selected.length===checks.length;
      selectAll.indeterminate = selected.length>0 && selected.length<checks.length;
    }
  }

  checks.forEach(ch=>ch.addEventListener('change',updateBulkState));
  selectAll?.addEventListener('change',e=>{
    checks.forEach(ch=>ch.checked=e.target.checked);
    updateBulkState();
  });

  $$('.delete-expense-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const id = btn.dataset.id;
    if(!confirm('¿Eliminar este gasto?')) return;
    deleteExpenseById(id);
    saveState();
    showToast('Gasto eliminado correctamente');
    renderExpensesView();
    renderMetrics();
  }));

  $$('.edit-expense-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const expense = state.expenses.find(e=>e.id===btn.dataset.id);
    if(!expense) return;
    openExpenseEditModal(expense);
  }));

  $('#bulkDeleteExpenses')?.addEventListener('click',()=>{
    const ids = $$('.expense-row-check:checked').map(ch=>ch.value);
    if(!ids.length) return;
    if(!confirm(`¿Eliminar ${ids.length} gastos seleccionados?`)) return;
    const businesses = new Set();
    ids.forEach(id=>{
      const exp = state.expenses.find(e=>e.id===id);
      if(exp) businesses.add(exp.negocio);
      state.expenses = state.expenses.filter(e=>e.id!==id);
    });
    businesses.forEach(recalcBusinessSummaryFromExpenses);
    saveState();
    renderExpensesView();
    renderMetrics();
  });
}

function openExpenseEditModal(expense){
  const old = $('#expenseEditBackdrop');
  if(old) old.remove();

  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.id = 'expenseEditBackdrop';
  wrap.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <div>
          <h2>Editar gasto</h2>
          <p>Actualiza los datos del movimiento.</p>
        </div>
        <button class="icon-button" id="closeExpenseEditBtn">✕</button>
      </div>
      <form id="expenseEditForm">
        <div class="form-grid">
          <label>
            Fecha
            <input name="fecha" type="date" value="${expense.fecha}" required />
          </label>
          <label>
            Concepto
            <input name="concepto" value="${expense.concepto}" required />
          </label>
          <label>
            Categoría
            <select name="categoria">
              ${state.expenseCategories.map(c=>`<option value="${c.id}" ${c.id===expense.categoria?'selected':''}>${c.nombre}</option>`).join('')}
            </select>
          </label>
          <label>
            Monto
            <input name="monto" type="number" min="0" step="0.01" value="${expense.monto}" required />
          </label>
          <label>
            Método de pago
            <select name="metodo">
              ${['Efectivo','Transferencia','Tarjeta','Otro'].map(m=>`<option ${m===expense.metodo?'selected':''}>${m}</option>`).join('')}
            </select>
          </label>
          <label>
            Proveedor
            <input name="proveedor" value="${expense.proveedor || ''}" />
          </label>
        </div>
        <label class="full">
          Notas
          <textarea name="notas" rows="3">${expense.notas || ''}</textarea>
        </label>
        <div class="modal-actions">
          <button type="button" class="secondary-btn" id="cancelExpenseEditBtn">Cancelar</button>
          <button type="submit" class="primary-btn">Guardar cambios</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(wrap);

  const close = ()=>wrap.remove();
  $('#closeExpenseEditBtn').addEventListener('click',close);
  $('#cancelExpenseEditBtn').addEventListener('click',close);
  wrap.addEventListener('click',e=>{ if(e.target===wrap) close(); });

  $('#expenseEditForm').addEventListener('submit',e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    expense.fecha = fd.get('fecha');
    expense.concepto = String(fd.get('concepto')||'').trim();
    expense.categoria = fd.get('categoria');
    const cat = state.expenseCategories.find(c=>c.id===expense.categoria);
    expense.tipo = cat?.tipo || 'operativo';
    expense.monto = Number(fd.get('monto')||0);
    expense.metodo = fd.get('metodo');
    expense.proveedor = String(fd.get('proveedor')||'').trim();
    expense.notas = String(fd.get('notas')||'').trim();

    recalcBusinessSummaryFromExpenses(expense.negocio);
    saveState();
    close();
    showToast('Gasto actualizado correctamente');
    renderExpensesView();
    renderMetrics();
  });
}

function bindExpenseEvents(){
  const expenseCategorySelect = $('#expenseForm select[name="categoria"]');
  const invCard = $('#inventoryRequiredCard');
  const invName = $('#expenseForm input[name="inventarioNombre"]');
  const invQty = $('#expenseForm input[name="inventarioCantidad"]');
  const invUnit = $('#expenseForm input[name="inventarioUnidad"]');
  const invType = $('#expenseForm select[name="inventarioTipo"]');
  const amountInput = $('#expenseForm input[name="monto"]');

  function syncInventoryRequirement(){
    const cat = state.expenseCategories.find(c=>c.id===expenseCategorySelect?.value);
    const required = !!cat?.inventariable;
    const autoType = $('#autoExpenseTypeLabel');
    if(autoType) autoType.textContent = cat?.tipo==='directo' ? 'Costo directo' : 'Gasto operativo';
    invCard?.classList.toggle('hidden', !required);

    [invName,invQty,invUnit].forEach(el=>{
      if(el) el.required = required;
    });

    if(required){
      if(invType && cat?.inventarioTipo) invType.value = cat.inventarioTipo;
      $('#inventoryTypeBadge').textContent = cat?.inventarioTipo || 'Inventariable';
    }
    updateUnitCostPreview();
  }

  function updateUnitCostPreview(){
    const amount = Number(amountInput?.value || 0);
    const qty = Number(invQty?.value || 0);
    const preview = $('#costoUnitarioPreview');
    if(preview){
      preview.value = qty > 0 ? money(amount/qty) : '';
    }
  }

  expenseCategorySelect?.addEventListener('change',syncInventoryRequirement);
  amountInput?.addEventListener('input',updateUnitCostPreview);
  invQty?.addEventListener('input',updateUnitCostPreview);
  syncInventoryRequirement();

  $('#clearExpenseBtn')?.addEventListener('click',()=>{
    const form=$('#expenseForm');
    if(!form) return;
    form.reset();
    const dateEl=form.querySelector('input[name="fecha"]');
    if(dateEl) dateEl.value=new Date().toISOString().slice(0,10);
    invCard?.classList.remove('catalog-selected');
    $$('.inventory-auto-field').forEach(x=>x.classList.remove('hidden'));
    if(invName){ invName.value=''; invName.readOnly=false; }
    if(invUnit){ invUnit.value=''; invUnit.readOnly=false; }
    if(invType){ invType.disabled=false; }
    const preview=$('#costoUnitarioPreview'); if(preview) preview.value='';
    syncInventoryRequirement();
  });
  $('#containerCatalogSelect')?.addEventListener('change',e=>{
    const c = state.containers.find(x=>x.id===e.target.value);
    const autoFields = $$('.inventory-auto-field');
    const minEl = $('#expenseForm input[name="inventarioMinimo"]');
    if(!c){
      invCard?.classList.remove('catalog-selected');
      autoFields.forEach(x=>x.classList.remove('hidden'));
      if(invName){ invName.value=''; invName.readOnly=false; }
      if(invUnit){ invUnit.value=''; invUnit.readOnly=false; }
      if(invType){ invType.disabled=false; }
      if(minEl) minEl.value=0;
      return;
    }

    invCard?.classList.add('catalog-selected');
    autoFields.forEach(x=>x.classList.add('hidden'));
    if(invName){ invName.value=c.nombre; invName.readOnly=true; }
    const conceptEl=$('#expenseForm input[name="concepto"]'); if(conceptEl && !conceptEl.value.trim()) conceptEl.value=c.nombre;
    const providerEl=$('#expenseForm input[name="proveedor"]'); if(providerEl && c.proveedor) providerEl.value=c.proveedor;
    if(invUnit){ invUnit.value='pzas'; invUnit.readOnly=true; }
    if(invType){ invType.value='Empaque'; invType.disabled=true; }
    if(minEl) minEl.value=c.stockMinimo||0;
    $('#inventoryTypeBadge').textContent='Empaque';
    invQty?.focus();
  });

  $$('.expense-tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      $$('.expense-tab').forEach(x=>x.classList.remove('active'));
      $$('.expense-pane').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      $('#expense-pane-'+btn.dataset.expenseTab).classList.add('active');
    });
  });

  $('#expenseSearch')?.addEventListener('input',renderExpenseTable);
  $('#expenseCategoryFilter')?.addEventListener('change',renderExpenseTable);

  $('#expenseForm')?.addEventListener('submit',e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const negocio = selectedBusiness;
    if(negocio==='all'){ showError('Selecciona un negocio','Entra primero a un emprendimiento específico.'); return; }

    const monto = Number(fd.get('monto')||0);
    if(!(monto>0)){ alert('Captura un monto válido.'); return; }

    const category = state.expenseCategories.find(c=>c.id===fd.get('categoria'));
    if(!category){ showError('No se pudo guardar el gasto','Selecciona una categoría válida.'); return; }
    const linked = !!category.inventariable;

    const containerCatalogId = String(fd.get('containerCatalogId')||'');
    const selectedContainer = containerCatalogId ? state.containers.find(c=>c.id===containerCatalogId) : null;

    let invData = null;
    if(linked){
      const cantidad = Number(fd.get('inventarioCantidad')||0);
      if(!(cantidad>0)){ alert('Captura la cantidad comprada.'); invQty?.focus(); return; }

      const nombre = selectedContainer ? selectedContainer.nombre : (String(fd.get('inventarioNombre')||'').trim());
      const unidad = selectedContainer ? 'pzas' : (String(fd.get('inventarioUnidad')||'').trim());
      const inventarioTipo = selectedContainer ? 'Empaque' : String(fd.get('inventarioTipo') || category.inventarioTipo || 'Insumo');
      const minimo = selectedContainer ? Number(selectedContainer.stockMinimo||0) : Number(fd.get('inventarioMinimo')||0);

      if(!nombre){ alert('Indica qué insumo o producto ingresará al inventario.'); return; }
      if(!unidad){ alert('Indica la unidad del inventario.'); return; }

      invData={nombre,cantidad,unidad,inventarioTipo,minimo,containerCatalogId,selectedContainer,costoUnitarioCompra:monto/cantidad};
    }

    const expense = {
      id:'G-'+Date.now(), negocio, fecha:fd.get('fecha'),
      concepto:String(fd.get('concepto')||'').trim(), categoria:category.id,
      tipo:category.tipo || 'operativo', monto, metodo:fd.get('metodo'),
      proveedor:String(fd.get('proveedor')||'').trim(), notas:String(fd.get('notas')||'').trim(),
      inventarioVinculado:linked
    };

    // Aplicar inventario primero; si algo falla, no queda un gasto parcial.
    if(invData){
      const {nombre,cantidad,unidad,inventarioTipo,minimo,containerCatalogId,selectedContainer,costoUnitarioCompra}=invData;
      let item = state.inventory.find(i=>i.negocio===negocio && i.nombre.toLowerCase()===nombre.toLowerCase() && i.unidad===unidad && (i.tipo||inventarioTipo)===inventarioTipo);
      if(item){
        const stockAnterior=Number(item.stock||0), costoAnterior=Number(item.costoPromedio||0);
        const nuevoStock=stockAnterior+cantidad;
        item.stock=nuevoStock;
        item.costoUltimo=costoUnitarioCompra;
        item.costoPromedio=nuevoStock>0?((stockAnterior*costoAnterior)+(cantidad*costoUnitarioCompra))/nuevoStock:costoUnitarioCompra;
        item.tipo=inventarioTipo;
        if(containerCatalogId) item.containerId=containerCatalogId;
        if(minimo>0) item.minimo=minimo;
      }else{
        state.inventory.push({nombre,negocio,stock:cantidad,minimo,unidad,tipo:inventarioTipo,costoUltimo:costoUnitarioCompra,costoPromedio:costoUnitarioCompra,containerId:containerCatalogId||undefined});
      }

      if(selectedContainer){
        const oldStock=Number(selectedContainer.stock||0), oldCost=Number(selectedContainer.costoUnitario||0);
        const newStock=oldStock+cantidad;
        selectedContainer.stock=newStock;
        selectedContainer.costoUnitario=newStock>0?((oldStock*oldCost)+(cantidad*costoUnitarioCompra))/newStock:costoUnitarioCompra;
      }
      expense.inventarioDetalle={nombre,cantidad,unidad,tipo:inventarioTipo,costoUnitario:costoUnitarioCompra,containerId:containerCatalogId||undefined};
    }

    state.expenses.push(expense);
    if(!state.summary[negocio]) state.summary[negocio]={ventas:0,gastos:0,utilidad:0,pedidos:0};
    recalcBusinessSummaryFromExpenses(negocio);
    saveState();
    showToast(
      'Gasto agregado correctamente',
      'success',
      linked ? 'El gasto y el inventario fueron actualizados.' : 'El movimiento quedó registrado correctamente.'
    );
    renderExpensesView(); renderMetrics(); renderLowStock();
  });


  $('#newCategoryInventariable')?.addEventListener('change',e=>{
    $('#newCategoryInventoryTypeWrap')?.classList.toggle('hidden', !e.target.checked);
  });

  $('#categoryForm')?.addEventListener('submit',e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const nombre = String(fd.get('nombre')||'').trim();
    if(!nombre) return;

    let id = slugify(nombre) || 'categoria';
    let base = id, n=2;
    while(state.expenseCategories.some(c=>c.id===id)) id = `${base}-${n++}`;
    const inventariable = fd.get('inventariable') === 'on';
    state.expenseCategories.push({
      id,
      nombre,
      tipo:fd.get('tipo'),
      inventariable,
      inventarioTipo: inventariable ? fd.get('inventarioTipo') : undefined
    });
    saveState();
    showToast('Categoría creada correctamente');
    renderExpensesView();
  });
}


function renderHoneyCatalog(){
  const wrap = $('#honeyCatalogSection');
  if(!wrap) return;

  wrap.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>Tipos de miel</h3>
          <p>Catálogo propio de Nektara. Los nombres y proveedores pueden cambiar sin perder el historial.</p>
        </div>
        <button class="primary-btn" id="newHoneyTypeBtn">+ Nuevo tipo</button>
      </div>

      <div class="honey-grid">
        ${state.honeyTypes.map(h=>`
          <div class="honey-card" data-honey-id="${h.id}">
            <div>
              <span class="honey-icon">🍯</span>
              <strong>${h.nombre}</strong>
              <small>${h.proveedor ? 'Proveedor: '+h.proveedor : 'Proveedor no definido'}</small>
            </div>
            <div class="row-actions">
              <button class="icon-action edit-honey-btn" data-id="${h.id}" title="Editar">✎</button>
              <button class="icon-action danger delete-honey-btn" data-id="${h.id}" title="Eliminar">🗑</button>
            </div>
          </div>
        `).join('') || '<p style="color:var(--muted)">Aún no hay tipos de miel registrados.</p>'}
      </div>
    </div>
  `;

  $('#newHoneyTypeBtn')?.addEventListener('click',()=>openHoneyTypeModal());
  $$('.edit-honey-btn').forEach(btn=>btn.addEventListener('click',()=>{
    openHoneyTypeModal(state.honeyTypes.find(h=>h.id===btn.dataset.id));
  }));
  $$('.delete-honey-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const id = btn.dataset.id;
    const referenced = state.inventory.some(i=>i.honeyTypeId===id);
    if(referenced){
      showError('No se puede eliminar','Este tipo de miel ya está relacionado con inventario.');
      return;
    }
    if(!confirm('¿Eliminar este tipo de miel?')) return;
    state.honeyTypes = state.honeyTypes.filter(h=>h.id!==id);
    saveState();
    renderProductsView();
  }));
}

function openHoneyTypeModal(honey=null){
  const old = $('#honeyTypeBackdrop');
  if(old) old.remove();

  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.id = 'honeyTypeBackdrop';
  wrap.innerHTML = `
    <div class="modal small-modal">
      <div class="modal-head">
        <div>
          <h2>${honey ? 'Editar tipo de miel' : 'Nuevo tipo de miel'}</h2>
          <p>Define el nombre comercial y su proveedor actual.</p>
        </div>
        <button class="icon-button" id="closeHoneyModalBtn">✕</button>
      </div>
      <form id="honeyTypeForm">
        <label>
          Nombre del tipo de miel
          <input name="nombre" required value="${honey?.nombre || ''}" placeholder="Ej. Miel de mezquite" />
        </label>
        <label style="margin-top:14px">
          Proveedor actual
          <input name="proveedor" value="${honey?.proveedor || ''}" placeholder="Nombre del proveedor" />
        </label>
        <label class="checkbox-row" style="margin-top:14px">
          <input type="checkbox" name="activa" ${honey?.activa===false ? '' : 'checked'} />
          <span>
            <strong>Tipo de miel activo</strong>
            <small>Los tipos inactivos se conservan para historial, pero no se ofrecen en nuevas capturas.</small>
          </span>
        </label>
        <div class="modal-actions">
          <button type="button" class="secondary-btn" id="cancelHoneyBtn">Cancelar</button>
          <button type="submit" class="primary-btn">${honey ? 'Guardar cambios' : 'Crear tipo'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(wrap);

  const close=()=>wrap.remove();
  $('#closeHoneyModalBtn').addEventListener('click',close);
  $('#cancelHoneyBtn').addEventListener('click',close);
  wrap.addEventListener('click',e=>{if(e.target===wrap) close();});

  $('#honeyTypeForm').addEventListener('submit',e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const nombre = String(fd.get('nombre')||'').trim();
    const proveedor = String(fd.get('proveedor')||'').trim();
    const activa = fd.get('activa') === 'on';

    if(honey){
      honey.nombre = nombre;
      honey.proveedor = proveedor;
      honey.activa = activa;
    }else{
      let id = slugify(nombre) || 'miel';
      let base=id,n=2;
      while(state.honeyTypes.some(h=>h.id===id)) id=`${base}-${n++}`;
      state.honeyTypes.push({id,nombre,proveedor,activa});
    }
    saveState();
    close();
    showToast(honey ? 'Tipo de miel actualizado' : 'Tipo de miel agregado correctamente');
    renderProductsView();
  });
}

function renderProductsView(){
  const view = $('#view-productos');
  const showHoney = selectedBusiness==='nektara' || selectedBusiness==='all';

  view.innerHTML = `
    <div class="section-actions">
      <div>
        <h2>Productos</h2>
        <p>Catálogo, presentaciones y definiciones de producto.</p>
      </div>
    </div>

    ${showHoney ? '<div id="honeyCatalogSection" style="margin-bottom:18px"></div>' : ''}

    <div class="generic-card">
      <h2>Catálogo de productos</h2>
      <p>Aquí integraremos presentaciones, precios, costos y reglas de producción o envasado.</p>
      <div class="generic-grid">
        <div class="generic-mini"><strong>Presentaciones</strong><span>Tamaños de envase o producto.</span></div>
        <div class="generic-mini"><strong>Precio y margen</strong><span>Precio de venta y costo calculado.</span></div>
        <div class="generic-mini"><strong>Método de producción</strong><span>Receta, envasado o producto comprado.</span></div>
      </div>
    </div>
  `;

  if(showHoney) renderHoneyCatalog();
}


function containerIcon(tipo){
  return ({Frasco:'🫙',Vaso:'🥃',Botella:'🍶',Bolsa:'🛍️',Caja:'📦',Lata:'🥫',Otro:'◻️'})[tipo] || '◻️';
}

function renderCatalogsView(){
  const view=$('#view-catalogos'); if(!view) return;
  view.innerHTML=`
    <div class="section-actions"><div><h2>Catálogos</h2><p>Elementos reutilizables para evitar capturas repetidas.</p></div></div>
    <div class="catalog-tabs">
      <button class="catalog-tab active" data-catalog-tab="envases">Envases</button>
      <button class="catalog-tab" data-catalog-tab="mieles">Tipos de miel</button>
    </div>
    <div class="catalog-pane active" id="catalog-pane-envases">
      <div class="panel">
        <div class="panel-head"><div><h3>Catálogo de envases</h3><p>Registra cada envase una sola vez y reutilízalo después.</p></div><button class="primary-btn" id="newContainerBtn">+ Nuevo envase</button></div>
        <div class="table-toolbar"><input id="containerSearch" type="search" placeholder="Buscar envase..."><select id="containerTypeFilter"><option value="all">Todos los tipos</option><option>Frasco</option><option>Vaso</option><option>Botella</option><option>Bolsa</option><option>Caja</option><option>Lata</option><option>Otro</option></select></div>
        <div class="container-grid" id="containerGrid"></div>
      </div>
    </div>
    <div class="catalog-pane" id="catalog-pane-mieles"><div id="honeyCatalogSection"></div></div>`;
  $$('.catalog-tab').forEach(btn=>btn.addEventListener('click',()=>{ $$('.catalog-tab').forEach(x=>x.classList.remove('active')); $$('.catalog-pane').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); $('#catalog-pane-'+btn.dataset.catalogTab).classList.add('active'); }));
  $('#newContainerBtn')?.addEventListener('click',()=>openContainerWizard());
  $('#containerSearch')?.addEventListener('input',renderContainerGrid);
  $('#containerTypeFilter')?.addEventListener('change',renderContainerGrid);
  renderContainerGrid(); renderHoneyCatalog();
}

function renderContainerGrid(){
  const grid=$('#containerGrid'); if(!grid) return;
  const q=($('#containerSearch')?.value||'').toLowerCase(); const type=$('#containerTypeFilter')?.value||'all';
  const rows=state.containers.filter(c=>(c.nombre+' '+c.tipo+' '+c.material+' '+(c.proveedor||'')).toLowerCase().includes(q) && (type==='all'||c.tipo===type));
  grid.innerHTML=rows.map(c=>`<div class="container-card"><div class="container-icon">${containerIcon(c.tipo)}</div><div class="container-main"><strong>${c.nombre}</strong><small>${c.tipo} · ${c.capacidad||'—'} ${c.unidad||''} · ${c.material||'Sin material'}</small><small>${c.proveedor?'Proveedor: '+c.proveedor:'Proveedor no definido'}</small></div><div class="container-meta"><span>${money(Number(c.costoUnitario||0))}</span><small>${Number(c.stock||0)} en stock</small></div><div class="row-actions"><button class="icon-action edit-container-btn" data-id="${c.id}" title="Editar">✎</button><button class="icon-action danger delete-container-btn" data-id="${c.id}" title="Eliminar">🗑</button></div></div>`).join('') || '<p style="color:var(--muted)">No hay envases registrados.</p>';
  $$('.edit-container-btn').forEach(btn=>btn.addEventListener('click',()=>openContainerWizard(state.containers.find(c=>c.id===btn.dataset.id))));
  $$('.delete-container-btn').forEach(btn=>btn.addEventListener('click',()=>{ const c=state.containers.find(x=>x.id===btn.dataset.id); if(state.inventory.some(i=>i.containerId===c?.id)){showError('No se puede eliminar','Este envase ya está vinculado con inventario. Edítalo o desactívalo.');return;} if(!confirm('¿Eliminar este envase?'))return; state.containers=state.containers.filter(x=>x.id!==btn.dataset.id); saveState(); renderContainerGrid(); }));
}

function openContainerWizard(container=null){
  $('#containerWizardBackdrop')?.remove();
  const wrap=document.createElement('div'); wrap.className='modal-backdrop'; wrap.id='containerWizardBackdrop';
  wrap.innerHTML=`<div class="modal container-wizard"><div class="modal-head"><div><span class="eyebrow dark">${container?'Editar envase':'Nuevo envase'}</span><h2>${container?'Actualiza el envase':'Agrega un envase al catálogo'}</h2><p>La app te guía en tres pasos cortos.</p></div><button class="icon-button" id="closeContainerWizard">✕</button></div>
  <div class="wizard-steps"><div class="wizard-step active" data-step-dot="1"><span>1</span><small>Identificación</small></div><div class="wizard-step" data-step-dot="2"><span>2</span><small>Características</small></div><div class="wizard-step" data-step-dot="3"><span>3</span><small>Compra e inventario</small></div></div>
  <form id="containerWizardForm">
    <div class="wizard-page active" data-step-page="1"><h3>¿Qué tipo de envase es?</h3><div class="type-card-grid">${['Frasco','Vaso','Botella','Bolsa','Caja','Lata','Otro'].map(t=>`<label class="type-card"><input type="radio" name="tipo" value="${t}" ${((container?.tipo||'Frasco')===t)?'checked':''}><span class="type-card-body"><span class="type-card-icon">${containerIcon(t)}</span><strong>${t}</strong></span></label>`).join('')}</div><label style="margin-top:18px">Nombre del envase<input name="nombre" required value="${container?.nombre||''}" placeholder="Ej. Frasco hexagonal 500 g"></label></div>
    <div class="wizard-page" data-step-page="2"><div class="form-grid"><label>Capacidad<input name="capacidad" type="number" min="0" step="0.01" value="${container?.capacidad??''}" placeholder="500"></label><label>Unidad<select name="unidad">${['g','kg','ml','L','pzas'].map(u=>`<option ${u===(container?.unidad||'g')?'selected':''}>${u}</option>`).join('')}</select></label><label>Material<select name="material">${['Vidrio','Plástico','Metal','Cartón','Papel','Madera','Otro'].map(m=>`<option ${m===(container?.material||'Vidrio')?'selected':''}>${m}</option>`).join('')}</select></label><label>Proveedor actual<input name="proveedor" value="${container?.proveedor||''}" placeholder="Opcional"></label></div></div>
    <div class="wizard-page" data-step-page="3"><div class="form-grid"><label>Costo unitario actual<input name="costoUnitario" type="number" min="0" step="0.01" value="${container?.costoUnitario??0}"></label><label>Stock actual<input name="stock" type="number" min="0" step="1" value="${container?.stock??0}"></label><label>Avisarme cuando queden<input name="stockMinimo" type="number" min="0" step="1" value="${container?.stockMinimo??0}"></label><label class="checkbox-row"><input type="checkbox" name="activo" ${container?.activo===false?'':'checked'}><span><strong>Envase activo</strong><small>Aparecerá en nuevas capturas.</small></span></label></div><div class="wizard-summary"><strong>Listo para guardar</strong><p>Luego podrás seleccionarlo sin volver a escribir sus datos.</p></div></div>
    <div class="wizard-actions"><button type="button" class="secondary-btn" id="containerPrevBtn">Atrás</button><div><button type="button" class="secondary-btn" id="cancelContainerWizard">Cancelar</button><button type="button" class="primary-btn" id="containerNextBtn">Continuar</button><button type="submit" class="primary-btn hidden" id="containerSaveBtn">Guardar envase</button></div></div>
  </form></div>`;
  document.body.appendChild(wrap); let step=1;
  const update=()=>{ $$('.wizard-page').forEach(p=>p.classList.toggle('active',Number(p.dataset.stepPage)===step)); $$('[data-step-dot]').forEach(d=>{const n=Number(d.dataset.stepDot);d.classList.toggle('active',n===step);d.classList.toggle('done',n<step);}); $('#containerPrevBtn').style.visibility=step===1?'hidden':'visible'; $('#containerNextBtn').classList.toggle('hidden',step===3); $('#containerSaveBtn').classList.toggle('hidden',step!==3); };
  const close=()=>wrap.remove(); $('#closeContainerWizard').addEventListener('click',close); $('#cancelContainerWizard').addEventListener('click',close); wrap.addEventListener('click',e=>{if(e.target===wrap)close();}); $('#containerPrevBtn').addEventListener('click',()=>{if(step>1){step--;update();}}); $('#containerNextBtn').addEventListener('click',()=>{if(step===1&&!$('#containerWizardForm input[name="nombre"]').value.trim()){showError('Falta el nombre del envase','Escribe un nombre antes de continuar.');return;} if(step<3){step++;update();}});
  $('#containerWizardForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.target);const data={nombre:String(fd.get('nombre')||'').trim(),tipo:String(fd.get('tipo')||'Otro'),capacidad:Number(fd.get('capacidad')||0),unidad:String(fd.get('unidad')||'pzas'),material:String(fd.get('material')||'Otro'),proveedor:String(fd.get('proveedor')||'').trim(),costoUnitario:Number(fd.get('costoUnitario')||0),stock:Number(fd.get('stock')||0),stockMinimo:Number(fd.get('stockMinimo')||0),activo:fd.get('activo')==='on'}; if(container)Object.assign(container,data); else{let id=slugify(data.nombre)||'envase',base=id,n=2;while(state.containers.some(c=>c.id===id))id=`${base}-${n++}`;state.containers.push({id,...data});} saveState();close();renderCatalogsView();}); update();
}


let proportionRowsState = [];

function fmtNum(n){
  return new Intl.NumberFormat('es-MX',{maximumFractionDigits:2}).format(Number(n||0));
}

function renderProportionsView(){
  const view = $('#view-proporciones');
  if(!view) return;

  if(selectedBusiness!=='velas'){
    view.innerHTML = `
      <div class="generic-card">
        <h2>Proporciones</h2>
        <p>Este módulo está disponible dentro del negocio de Velas.</p>
      </div>`;
    return;
  }

  if(!proportionRowsState.length){
    proportionRowsState=[{id:String(Date.now()),nombre:'Ingrediente 1',porcentaje:10,prevPorcentaje:10}];
  }

  view.innerHTML=`
    <div class="section-actions">
      <div>
        <h2>Calculadora de proporciones</h2>
        <p>Indica el peso total y el porcentaje de cada ingrediente.</p>
      </div>
    </div>

    <div class="dashboard-grid lower">
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3>¿Cuánto pesará la vela en total?</h3>
            <p>El cálculo se actualizará automáticamente.</p>
          </div>
        </div>

        <label class="weight-input-label">
          Peso total
          <div class="weight-input-wrap">
            <input id="candleTotalWeight" type="number" inputmode="decimal" min="0.01" step="0.01" value="300">
            <span>g</span>
          </div>
        </label>

        <div class="proportion-builder">
          <div class="panel-head compact">
            <div><h3>Ingredientes</h3><p>Escribe el nombre y el porcentaje.</p></div>
            <button class="secondary-btn" id="addIngredientRowBtn">+ Ingrediente</button>
          </div>

          <div id="proportionRows" class="proportion-rows"></div>

          <div class="proportion-total-card" id="proportionTotalCard">
            <span>Porcentaje total</span>
            <strong id="proportionTotalPct">0%</strong>
            <small id="proportionTotalHint"></small>
          </div>

          <div class="modal-actions">
            <button class="secondary-btn" id="clearProportionBtn">Limpiar</button>
            <button class="primary-btn" id="saveProportionPresetBtn">Guardar fórmula</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <div><h3>Resultado</h3><p>Gramos correspondientes a cada porcentaje.</p></div>
        </div>

        <div class="candle-result-layout">
          <div class="candle-visual-card">
            <div class="candle-weight-chip">
              <span>Peso total</span>
              <strong><span id="resultTotalWeight">300</span> g</strong>
            </div>

            <div class="candle-stage">
              <div class="candle-pour-stream" id="candlePourStream" aria-hidden="true">
                <span class="pour-neck"></span>
                <span class="pour-drop drop-a"></span>
                <span class="pour-drop drop-b"></span>
                <span class="pour-splash"></span>
              </div>
              <div class="candle-flame" aria-hidden="true"></div>
              <div class="candle-wick" aria-hidden="true"></div>
              <div class="candle-shell" id="candleShell" aria-label="Representación visual de las proporciones">
                <div class="candle-liquid" id="candleLiquid"></div>
                <div class="candle-gloss" aria-hidden="true"></div>
              </div>
            </div>

            <div class="candle-fill-status">
              <span>Llenado de fórmula</span>
              <strong id="candleFillPct">0%</strong>
            </div>
          </div>

          <div class="candle-result-details">
            <div id="proportionResults" class="proportion-results"></div>

            <div class="proportion-remainder">
              <span>Resto sin asignar</span>
              <strong id="proportionRemainder">0 g</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head">
        <div><h3>Fórmulas guardadas</h3><p>Reutiliza porcentajes con cualquier peso total.</p></div>
      </div>
      <div id="proportionPresetList" class="preset-list"></div>
    </div>`;

  bindProportionEvents();
  renderProportionRows();
  renderProportionPresets();
  calculateProportions();
}

function bindProportionEvents(){
  $('#candleTotalWeight')?.addEventListener('input',()=>{
    triggerCandleDrain();
    calculateProportions();
  });

  $('#addIngredientRowBtn')?.addEventListener('click',()=>{
    proportionRowsState.push({
      id:String(Date.now()+Math.random()),
      nombre:`Ingrediente ${proportionRowsState.length+1}`,
      porcentaje:0,
      prevPorcentaje:0
    });
    renderProportionRows();
    calculateProportions();
  });

  $('#clearProportionBtn')?.addEventListener('click',()=>{
    proportionRowsState=[{id:String(Date.now()),nombre:'Ingrediente 1',porcentaje:10,prevPorcentaje:10}];
    $('#candleTotalWeight').value=300;
    renderProportionRows();
    calculateProportions();
    showToast('Calculadora reiniciada','info');
  });

  $('#saveProportionPresetBtn')?.addEventListener('click',()=>{
    const valid=proportionRowsState.filter(r=>r.nombre.trim() && Number(r.porcentaje)>0);
    if(!valid.length){
      showError('No se puede guardar','Agrega al menos un ingrediente con porcentaje mayor a 0.');
      return;
    }
    const nombre=prompt('Nombre de la fórmula:');
    if(!nombre) return;
    state.candleProportionPresets.push({
      id:`PF-${Date.now()}`,
      nombre:nombre.trim(),
      ingredientes:valid.map(r=>({nombre:r.nombre,porcentaje:Number(r.porcentaje)}))
    });
    saveState();
    showToast('Fórmula guardada correctamente','success',nombre.trim());
    renderProportionPresets();
  });
}

function renderProportionRows(){
  const wrap=$('#proportionRows');
  if(!wrap) return;
  wrap.innerHTML=proportionRowsState.map((r,i)=>`
    <div class="proportion-row" data-id="${r.id}">
      <div class="proportion-row-number">${i+1}</div>
      <label>Ingrediente
        <input class="ingredient-name" value="${r.nombre}" placeholder="Ej. Fragancia">
      </label>
      <label>Porcentaje
        <div class="percent-input-wrap">
          <input class="ingredient-percent" type="number" inputmode="decimal" min="0" max="100" step="0.01" value="${r.porcentaje}">
          <span>%</span>
        </div>
      </label>
      <div class="ingredient-grams-box">
        <span>Resultado</span>
        <strong class="ingredient-grams">0 g</strong>
      </div>
      <button class="icon-action danger remove-proportion-row" title="Eliminar">×</button>
    </div>`).join('');

  $$('.proportion-row').forEach(el=>{
    const id=el.dataset.id;
    el.querySelector('.ingredient-name')?.addEventListener('input',e=>{
      const row=proportionRowsState.find(r=>r.id===id);
      if(row) row.nombre=e.target.value;
      calculateProportions();
    });
    el.querySelector('.ingredient-percent')?.addEventListener('input',e=>{
      const row=proportionRowsState.find(r=>r.id===id);
      if(!row) return;

      const previous=Number(row.porcentaje||0);
      const next=Math.max(0,Number(e.target.value||0));
      row.prevPorcentaje=previous;
      row.porcentaje=next;

      const index=proportionRowsState.findIndex(r=>r.id===id);
      const palette=['#F2B84B','#E97A5F','#8DB6A3','#8FA7D8','#B694C9','#E6A7B7','#77B8C5','#C9A36A'];

      if(next>previous){
        const totalAfter=proportionRowsState.reduce((sum,item)=>sum+Number(item.porcentaje||0),0);
        const added=next-previous;
        const surfaceBefore=Math.max(0,totalAfter-added);
        triggerCandlePour(
          palette[Math.max(0,index)%palette.length],
          Math.min(100,surfaceBefore)
        );
      }else if(next<previous){
        triggerCandleDrain();
      }

      calculateProportions();
    });
    el.querySelector('.remove-proportion-row')?.addEventListener('click',()=>{
      proportionRowsState=proportionRowsState.filter(r=>r.id!==id);
      if(!proportionRowsState.length) proportionRowsState=[{id:String(Date.now()),nombre:'Ingrediente 1',porcentaje:0,prevPorcentaje:0}];
      renderProportionRows();
      calculateProportions();
    });
  });
}


function triggerCandlePour(color='#F2B84B', surfacePct=0){
  const stream=$('#candlePourStream');
  const shell=$('#candleShell');
  if(!stream || !shell) return;

  const clampedSurface=Math.max(0,Math.min(100,Number(surfacePct||0)));

  // Geometry of the visible candle vessel.
  // At 0% the impact is near the bottom; at 100% it is near the rim.
  const shellHeight=shell.getBoundingClientRect().height || 205;

  // Visual calibration: the perceived liquid surface sits a little higher
  // than the raw geometric box because of the rounded rim and inner border.
  const topInset=6;
  const bottomInset=18;
  const usableHeight=Math.max(1,shellHeight-topInset-bottomInset);

  // Pull the impact point upward slightly across the whole range,
  // with a bit more correction at higher fill levels.
  const rawSurface=topInset + usableHeight*(1-clampedSurface/100);
  const liftPx=8 + (clampedSurface/100)*6;
  const surfaceFromTop=Math.max(2, rawSurface-liftPx);

  // The stream starts above the vessel and ends at the current liquid surface.
  // CSS receives the exact end position so both the stream and splash follow the fill level.
  stream.style.setProperty('--pour-color',color);
  stream.style.setProperty('--impact-y',`${surfaceFromTop}px`);
  stream.style.setProperty('--surface-pct',`${clampedSurface}`);

  stream.classList.remove('active');
  shell.classList.remove('sloshing','settling');

  void stream.offsetWidth;
  void shell.offsetWidth;

  stream.classList.add('active');
  shell.classList.add('sloshing');

  clearTimeout(window.__candlePourTimer);
  window.__candlePourTimer=setTimeout(()=>{
    stream.classList.remove('active');
    shell.classList.remove('sloshing');
    shell.classList.add('settling');
    setTimeout(()=>shell.classList.remove('settling'),500);
  },1050);
}

function triggerCandleDrain(){
  const stream=$('#candlePourStream');
  const shell=$('#candleShell');
  stream?.classList.remove('active');
  shell?.classList.remove('sloshing');
  shell?.classList.remove('settling');
  void shell?.offsetWidth;
  shell?.classList.add('settling');
  clearTimeout(window.__candleDrainTimer);
  window.__candleDrainTimer=setTimeout(()=>shell?.classList.remove('settling'),500);
}

function calculateProportions(){
  const total=Number($('#candleTotalWeight')?.value||0);
  const pct=proportionRowsState.reduce((a,r)=>a+Number(r.porcentaje||0),0);

  if($('#resultTotalWeight')) $('#resultTotalWeight').textContent=fmtNum(total);
  if($('#proportionTotalPct')) $('#proportionTotalPct').textContent=`${fmtNum(pct)}%`;

  const card=$('#proportionTotalCard');
  card?.classList.toggle('over',pct>100);
  card?.classList.toggle('complete',Math.abs(pct-100)<0.001);

  const hint=$('#proportionTotalHint');
  if(hint){
    hint.textContent=pct>100
      ? 'Los porcentajes superan el 100%. Revisa la fórmula.'
      : Math.abs(pct-100)<0.001
        ? 'La fórmula utiliza el 100% del peso.'
        : `Queda ${fmtNum(100-pct)}% sin asignar.`;
  }

  $$('.proportion-row').forEach(el=>{
    const row=proportionRowsState.find(r=>r.id===el.dataset.id);
    const grams=total*(Number(row?.porcentaje||0)/100);
    const g=el.querySelector('.ingredient-grams');
    if(g) g.textContent=`${fmtNum(grams)} g`;
  });

  const palette = [
    '#F2B84B',
    '#E97A5F',
    '#8DB6A3',
    '#8FA7D8',
    '#B694C9',
    '#E6A7B7',
    '#77B8C5',
    '#C9A36A'
  ];

  const results=$('#proportionResults');
  if(results){
    results.innerHTML=proportionRowsState.map((r,index)=>{
      const grams=total*(Number(r.porcentaje||0)/100);
      const color=palette[index % palette.length];
      return `<div class="proportion-result-row">
        <div class="ingredient-result-name">
          <span class="ingredient-color-dot" style="background:${color}"></span>
          <div>
            <strong>${r.nombre||'Sin nombre'}</strong>
            <small>${fmtNum(r.porcentaje)}%</small>
          </div>
        </div>
        <strong>${fmtNum(grams)} g</strong>
      </div>`;
    }).join('');
  }

  const liquid=$('#candleLiquid');
  if(liquid){
    let cumulative=0;
    liquid.innerHTML=proportionRowsState.map((r,index)=>{
      const rawPct=Math.max(0,Number(r.porcentaje||0));
      const visiblePct=Math.max(0,Math.min(rawPct,100-cumulative));
      const bottom=cumulative;
      cumulative=Math.min(100,cumulative+rawPct);
      const color=palette[index % palette.length];

      return `<div
        class="candle-layer"
        title="${r.nombre||'Ingrediente'}: ${fmtNum(rawPct)}%"
        style="--layer-height:${visiblePct}%; --layer-bottom:${bottom}%; --layer-color:${color};"
      ><span class="candle-wave"></span></div>`;
    }).join('');
  }

  const visibleFill=Math.min(100,Math.max(0,pct));
  if($('#candleFillPct')) $('#candleFillPct').textContent=`${fmtNum(pct)}%`;
  $('#candleShell')?.classList.toggle('overfilled',pct>100);
  $('#candleShell')?.style.setProperty('--fill-level',`${visibleFill}%`);

  const remainder=total*Math.max(0,(100-pct)/100);
  if($('#proportionRemainder')) $('#proportionRemainder').textContent=`${fmtNum(remainder)} g`;
}

function renderProportionPresets(){
  const wrap=$('#proportionPresetList');
  if(!wrap) return;
  wrap.innerHTML=state.candleProportionPresets.map(p=>`
    <div class="preset-card">
      <div>
        <strong>${p.nombre}</strong>
        <small>${p.ingredientes.map(i=>`${i.nombre} ${fmtNum(i.porcentaje)}%`).join(' · ')}</small>
      </div>
      <div class="row-actions">
        <button class="secondary-btn load-proportion-preset" data-id="${p.id}">Usar</button>
        <button class="icon-action danger delete-proportion-preset" data-id="${p.id}" title="Eliminar">🗑</button>
      </div>
    </div>`).join('') || '<p style="color:var(--muted)">Aún no hay fórmulas guardadas.</p>';

  $$('.load-proportion-preset').forEach(btn=>btn.addEventListener('click',()=>{
    const p=state.candleProportionPresets.find(x=>x.id===btn.dataset.id);
    if(!p) return;
    proportionRowsState=p.ingredientes.map(i=>({
      id:String(Date.now()+Math.random()),
      nombre:i.nombre,
      porcentaje:Number(i.porcentaje),
      prevPorcentaje:Number(i.porcentaje)
    }));
    renderProportionRows();
    calculateProportions();
    showToast('Fórmula cargada','success',p.nombre);
  }));

  $$('.delete-proportion-preset').forEach(btn=>btn.addEventListener('click',()=>{
    if(!confirm('¿Eliminar esta fórmula?')) return;
    state.candleProportionPresets=state.candleProportionPresets.filter(x=>x.id!==btn.dataset.id);
    saveState();
    renderProportionPresets();
    showToast('Fórmula eliminada');
  }));
}

function updateBusinessSpecificNavigation(){
  const currentBusiness = getBusiness(selectedBusiness);
  const isVelas = selectedBusiness === 'velas' ||
    String(currentBusiness?.nombre || '').trim().toLowerCase() === 'velas';

  $$('.velas-only').forEach(el=>{
    el.style.display = isVelas ? '' : 'none';
  });

  // If user is viewing Proporciones and leaves Velas, return to Resumen.
  if(!isVelas && $('#view-proporciones')?.classList.contains('active')){
    goView('resumen');
  }
}

function renderGenericViews(){
  const content = {
    inventario:['Inventario','Controla producto terminado y materia prima.',['Stock actual','Avisarme cuando queden','Movimientos']],
    produccion:['Producción','Convierte insumos en producto terminado usando recetas.',['Recetas','Lotes','Consumo automático']],
    clientes:['Clientes','Centraliza compradores e historial.',['Frecuencia','Ticket promedio','Última compra']],
    reportes:['Reportes','Analiza ventas, utilidad, productos y periodos.',['Ventas por mes','Producto más rentable','Comparativo de negocios']]
  };
  Object.entries(content).forEach(([key,[title,desc,items]])=>{
    $('#view-'+key).innerHTML = `
      <div class="generic-card">
        <h2>${title}</h2><p>${desc}</p>
        <div class="generic-grid">${items.map(i=>`<div class="generic-mini"><strong>${i}</strong><span>Base preparada para la siguiente fase.</span></div>`).join('')}</div>
      </div>`;
  });

  $('#view-configuracion').innerHTML = `
    <div class="section-actions">
      <div><h2>Configuración</h2><p>Administra los emprendimientos y preferencias.</p></div>
      <button class="primary-btn" id="addBusinessConfigBtn">+ Nuevo negocio</button>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div><h3>Emprendimientos</h3><p>${state.businesses.length} registrados</p></div>
      </div>
      <div class="business-cards">
        ${state.businesses.map(b=>{
          const s=getSummary(b.id);
          return `<div class="business-card">
            <div><strong>${b.icono || '🏷️'} ${b.nombre}</strong><small style="display:block;color:var(--muted);margin-top:3px">${b.tipo || 'Sin categoría'}</small></div>
            <div style="text-align:right"><strong>${money(s.ventas,b.moneda||'MXN')}</strong><small style="display:block;color:var(--muted);margin-top:3px">Ventas del mes</small></div>
          </div>`
        }).join('')}
      </div>
    </div>`;
  $('#addBusinessConfigBtn').addEventListener('click',openBusinessModal);
}

function refresh(){
  updateBusinessSpecificNavigation();
  renderBusinessGate();
  const current = selectedBusiness==='all' ? 'Todos los negocios' : businessLabel(selectedBusiness);
  $('#pageSubtitle').textContent = `${viewMeta[$('.view.active')?.id?.replace('view-','') || 'resumen'][1]} · ${current}`;
  renderMetrics();
  renderRecentOrders();
  renderLowStock();
  renderBusinessCards();
  renderOrdersTable();
  renderGenericViews();
  renderProductsView();
  renderExpensesView();
  renderCatalogsView();
  populateOrderBusinessSelect();
  requestAnimationFrame(drawChart);
}

function populateOrderBusinessSelect(){
  const sel = $('#orderForm select[name="negocio"]');
  sel.innerHTML = state.businesses.map(b=>`<option value="${b.id}">${b.icono || '🏷️'} ${b.nombre}</option>`).join('');
  if(selectedBusiness!=='all' && getBusiness(selectedBusiness)) sel.value=selectedBusiness;
}

function openOrderModal(){
  populateOrderBusinessSelect();
  $('#modalBackdrop').classList.remove('hidden');
}
function closeOrderModal(){
  $('#modalBackdrop').classList.add('hidden');
  $('#orderForm').reset();
}

function openBusinessModal(){
  $('#businessModalBackdrop').classList.remove('hidden');
}
function closeBusinessModal(){
  $('#businessModalBackdrop').classList.add('hidden');
  $('#businessForm').reset();
}

$$('[data-view]').forEach(b => b.addEventListener('click',()=>goView(b.dataset.view)));
$$('[data-view-jump]').forEach(b => b.addEventListener('click',()=>goView(b.dataset.viewJump)));
$('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));

$('#sidebarToggle').addEventListener('click',()=>{
  $('.app-shell').classList.toggle('sidebar-collapsed');
  localStorage.setItem('sidebarCollapsed', $('.app-shell').classList.contains('sidebar-collapsed') ? '1' : '0');
});
if(localStorage.getItem('sidebarCollapsed')==='1'){
  $('.app-shell').classList.add('sidebar-collapsed');
}

$('#changeBusinessBtn').addEventListener('click',()=>{
  $('#businessGate').classList.remove('hidden');
  renderBusinessGate();
});

$('#orderSearch').addEventListener('input',renderOrdersTable);
$('#orderStatusFilter').addEventListener('change',renderOrdersTable);

$$('.seg').forEach(b=>b.addEventListener('click',()=>{
  $$('.seg').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  selectedSeries=b.dataset.series;
  drawChart();
}));

$('#newOrderBtn').addEventListener('click',openOrderModal);
$('#newOrderBtn2').addEventListener('click',openOrderModal);
$('#closeModalBtn').addEventListener('click',closeOrderModal);
$('#cancelOrderBtn').addEventListener('click',closeOrderModal);
$('#modalBackdrop').addEventListener('click',e=>{ if(e.target.id==='modalBackdrop') closeOrderModal(); });

$('#enterConsolidatedBtn').addEventListener('click',()=>selectBusiness('all'));

$('#businessSelectorGrid').addEventListener('click', e=>{
  const businessBtn = e.target.closest('[data-business-choice]');
  if(businessBtn){
    selectBusiness(businessBtn.dataset.businessChoice);
    return;
  }
  const newBtn = e.target.closest('[data-action="new-business"]');
  if(newBtn){
    openBusinessModal();
  }
});

$('#closeBusinessModalBtn').addEventListener('click',closeBusinessModal);
$('#cancelBusinessBtn').addEventListener('click',closeBusinessModal);
$('#businessModalBackdrop').addEventListener('click',e=>{ if(e.target.id==='businessModalBackdrop') closeBusinessModal(); });

$('#businessForm').addEventListener('submit',e=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  const nombre = String(fd.get('nombre')||'').trim();
  if(!nombre) return;

  let baseId = slugify(nombre) || 'negocio';
  let id = baseId;
  let n = 2;
  while(state.businesses.some(b=>b.id===id)) id = `${baseId}-${n++}`;

  const business = {
    id,
    nombre,
    icono:String(fd.get('icono')||'✨').trim() || '✨',
    tipo:String(fd.get('tipo')||'').trim(),
    moneda:String(fd.get('moneda')||'MXN'),
    descripcion:String(fd.get('descripcion')||'').trim()
  };
  state.businesses.push(business);
  state.summary[id] = {ventas:0,gastos:0,utilidad:0,pedidos:0};
  saveState();
  closeBusinessModal();
  showToast('Negocio creado correctamente','success',`${business.icono || '🏷️'} ${business.nombre} ya está disponible.`);
  refresh();
  selectBusiness(id);
});

$('#orderForm').addEventListener('submit',e=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  const total = Number(fd.get('total')||0);
  const anticipo = Number(fd.get('anticipo')||0);
  const id = `P-${String(state.orders.length+1).padStart(3,'0')}`;
  const negocio = fd.get('negocio');

  state.orders.push({
    id,
    cliente:fd.get('cliente'),
    negocio,
    producto:fd.get('producto'),
    cantidad:Number(fd.get('cantidad')||1),
    total,
    anticipo,
    saldo:Math.max(total-anticipo,0),
    entrega:fd.get('entrega'),
    estado:fd.get('estado'),
    notas:fd.get('notas')
  });

  if(!state.summary[negocio]) state.summary[negocio]={ventas:0,gastos:0,utilidad:0,pedidos:0};
  state.summary[negocio].pedidos += 1;
  state.summary[negocio].ventas += total;

  saveState();
  closeOrderModal();
  refresh();
  goView('pedidos');
});

window.addEventListener('resize',()=>requestAnimationFrame(drawChart));

saveState();
refresh();
updateBusinessSpecificNavigation();
