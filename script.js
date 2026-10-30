const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const money = n => `₹${Number(n||0).toLocaleString('en-IN')}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = s => new Date(`${s}T00:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
const state = { user:null, csrf:null, vehicles:[], catalogCategories:[], catalogBrands:[], catalogCategoryCounts:{}, selectedVehicle:null, adminStats:null, toastTimer:null };
const featuredPickupAreas = [
  "Anantapur", "Guntakal", "Gooty", "Tadipatri", "Kalyandurg", "Rayadurg", "Uravakonda", "Pamidi", "Yadiki", "Singanamala", "Atmakur", "Narpala", "Garladinne", "Raptadu", "Yellanur", "Kambadur", "Beluguppa", "Peddavadugur", "Peddapappur", "Dharmavaram", "Hindupur", "Kadiri", "Penukonda", "Puttaparthi", "Old Town", "Aravinda Nagar", "Sai Nagar", "Ashok Nagar", "Srinagar Colony", "Ramnagar", "Vijayanagar Colony", "Housing Board Colony", "Sangamesh Nagar", "Bangalore Road", "Surya Nagar", "R.D.T. Area", "SBI Colony", "Maruthi Nagar", "JNTU College Road"
];
function fillPickupLocationOptions() {
  const vehicleLocations = state.vehicles.map(vehicle => vehicle.location);
  const locations = [...new Set([...featuredPickupAreas, ...vehicleLocations])].sort((a,b) => a.localeCompare(b));
  $("#pickupLocationOptions").innerHTML = locations.map(location => "<option value=\"" + esc(location) + "\"></option>").join("");
}

async function api(url, options={}) {
  const headers = new Headers(options.headers||{});
  if (options.body && !(options.body instanceof Blob)) headers.set('content-type','application/json');
  if (state.csrf && !['GET','HEAD'].includes((options.method||'GET').toUpperCase())) headers.set('x-csrf-token',state.csrf);
  const response = await fetch(url,{...options,headers,credentials:'same-origin'});
  const type=response.headers.get('content-type')||'';
  const data=type.includes('application/json')?await response.json():await response.blob();
  if(!response.ok) throw new Error(data?.error||'Something went wrong. Please try again.');
  return data;
}
function toast(message,error=false){const el=$('#toast');el.textContent=message;el.className=`toast show${error?' error':''}`;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.classList.remove('show'),3600);}
function openDialog(id){const d=document.getElementById(id);if(d&&!d.open)d.showModal();}
function closeDialog(el){const d=el.closest('dialog');if(d?.open)d.close();}
function setLoading(el,busy,text){el.disabled=busy;if(!el.dataset.original)el.dataset.original=el.textContent;el.textContent=busy?text:el.dataset.original;}

async function init(){
  $('#year').textContent=new Date().getFullYear();
  fillPickupLocationOptions();
  const today=new Date();today.setMinutes(today.getMinutes()-today.getTimezoneOffset());const minDate=today.toISOString().slice(0,10);
  $('#searchPickup').min=minDate;$('#searchReturn').min=minDate;$('#bookingForm [name="pickup"]').min=minDate;$('#bookingForm [name="return"]').min=minDate;
  $('#searchPickup').value='';$('#searchReturn').value='';
  const start=await api('/api/bootstrap');state.user=start.user;state.csrf=start.csrf;
  updateNav();await Promise.all([loadFleet(),loadCities()]);if(state.user?.role==='admin')await loadAdmin();else if(state.user)await loadMyBookings();
  bindEvents();
}
function clearVehicleFilters(){
  for(const id of ['filterSearch','filterMinPrice','filterMaxPrice','filterCategory','filterBrand','filterFuel','filterTransmission','filterSeats'])$('#'+id).value='';
  $('#filterSort').value='recommended';
}
async function resetFleetFilters(){
  $('#searchLocation').value='';
  $('#searchPickup').value='';
  $('#searchReturn').value='';
  $('#searchReturn').min='';
  clearVehicleFilters();
  await loadFleet();
}
function addDays(date,days){const d=new Date(`${date}T00:00:00`);d.setDate(d.getDate()+days);return d.toISOString().slice(0,10);}
function updateNav(){const logged=!!state.user;$('#navActions').hidden=logged;$('#signedActions').hidden=!logged;$('#accountNav').hidden=!logged||state.user.role==='admin';$('#adminNav').hidden=!logged||state.user.role!=='admin';$('#account').hidden=!logged||state.user.role==='admin';$('#admin').hidden=!logged||state.user.role!=='admin';$('#userLabel').textContent=state.user?state.user.name.split(' ')[0]:'';}
async function loadFleet(){
  const p=new URLSearchParams();const q=$('#filterSearch').value.trim();const category=$('#filterCategory').value;const brand=$('#filterBrand').value;const fuel=$('#filterFuel').value;const transmission=$('#filterTransmission').value;const seats=$('#filterSeats').value;const min=$('#filterMinPrice').value;const max=$('#filterMaxPrice').value;const sort=$('#filterSort').value;
  if(q)p.set('q',q);if(category)p.set('category',category);if(brand)p.set('brand',brand);if(fuel)p.set('fuel',fuel);if(transmission)p.set('transmission',transmission);if(seats)p.set('seats',seats);if(min)p.set('minPrice',min);if(max)p.set('maxPrice',max);if(sort!=='recommended')p.set('sort',sort);
  const loc=$('#searchLocation').value.trim(),pickup=$('#searchPickup').value,ret=$('#searchReturn').value;
  if(loc)p.set('location',loc);if(pickup&&ret&&ret>pickup){p.set('pickup',pickup);p.set('return',ret);}
  $('#fleetGrid').innerHTML='<div class="loading-card">Loading vehicles…</div>';$('#fleetEmpty').hidden=true;
  try{const data=await api(`/api/vehicles?${p.toString()}`);state.vehicles=data.vehicles;fillPickupLocationOptions();renderFleet();fillCategories();}
  catch(e){$('#fleetGrid').innerHTML='';$('#fleetEmpty').hidden=false;$('#fleetEmpty h3').textContent='Fleet unavailable';$('#fleetEmpty p').textContent=e.message;}
}
async function loadCities(){
  try{
    const {vehicles}=await api('/api/vehicles');
    state.catalogCategories=[...new Set(vehicles.map(vehicle=>vehicle.category))].sort((a,b)=>a.localeCompare(b));
    state.catalogBrands=[...new Set(vehicles.map(vehicle=>vehicle.brand))].sort((a,b)=>a.localeCompare(b));
    state.catalogCategoryCounts=Object.fromEntries(state.catalogCategories.map(category=>[category,vehicles.filter(vehicle=>vehicle.category===category).length]));
    fillCategories();
    const totals=new Map();
    for(const vehicle of vehicles)totals.set(vehicle.location,(totals.get(vehicle.location)||0)+1);
    const extraLocations=[...totals.keys()].filter(name=>!featuredPickupAreas.some(area=>name.toLowerCase().includes(area.toLowerCase()))).sort((a,b)=>(totals.get(b)-totals.get(a))||a.localeCompare(b)).slice(0,6);
    const countAt=name=>[...totals].reduce((sum,[location,count])=>location.toLowerCase().includes(name.toLowerCase())?sum+count:sum,0);
    const places=[...featuredPickupAreas,...extraLocations].map(name=>({name,count:countAt(name)}));
    $('#cityGrid').innerHTML=places.map(place=>'<button class="city-card" type="button" data-city="'+esc(place.name)+'"><span class="city-mark">↗</span><strong>'+esc(place.name)+'</strong><span>'+(place.count?place.count+' '+(place.count===1?'vehicle':'vehicles'):'Pickup area')+'</span></button>').join('');
    $('#citiesEmpty').hidden=places.length>0;
    $('#cityGrid').hidden=places.length===0;
  }catch{
    $('#cityGrid').innerHTML='';
    $('#cityGrid').hidden=true;
    $('#citiesEmpty').hidden=false;
  }
}
function fillCategories(){
  const select=$('#filterCategory'),current=select.value;
  const cats=state.catalogCategories.length?state.catalogCategories:[...new Set(state.vehicles.map(v=>v.category))].sort((a,b)=>a.localeCompare(b));
  select.replaceChildren(new Option('All categories',''));
  for(const category of cats)select.add(new Option(category,category));
  if(cats.includes(current))select.value=current;
  const brands=state.catalogBrands.length?state.catalogBrands:[...new Set(state.vehicles.map(v=>v.brand))].sort((a,b)=>a.localeCompare(b));
  const brandSelect=$('#filterBrand'),currentBrand=brandSelect.value;
  brandSelect.replaceChildren(new Option('All brands',''));
  for(const brand of brands)brandSelect.add(new Option(brand,brand));
  if(brands.includes(currentBrand))brandSelect.value=currentBrand;
  renderCategoryRail();
}
function renderCategoryRail(){
  const rail=$('#categoryRail');if(!rail)return;
  const cats=state.catalogCategories.length?state.catalogCategories:[...new Set(state.vehicles.map(v=>v.category))].sort((a,b)=>a.localeCompare(b));
  const counts=state.catalogCategoryCounts;
  const allCount=Object.values(counts).reduce((sum,count)=>sum+count,0)||state.vehicles.length;
  const icons={'SUV':'🚙','Electric SUV':'⚡','Sedan':'🚘','Luxury Sedan':'🚘','Electric Sedan':'⚡','Hatchback':'🚗','Electric Hatchback':'⚡','MPV':'🚐','Van':'🚐','Motorcycle':'🏍️','Scooter':'🛵','Electric Scooter':'⚡','Auto Rickshaw':'🛺','Electric Auto':'⚡','Pickup Truck':'🛻','Commercial':'🚚'};
  const items=[['','All vehicles',allCount],...cats.map(category=>[category,category,counts[category]||0])];
  const active=$('#filterCategory').value;
  rail.replaceChildren();
  for(const [value,label,count] of items){
    const button=document.createElement('button');button.type='button';button.className='category-chip'+(active===value?' active':'');button.dataset.categoryFilter=value;button.setAttribute('aria-pressed',String(active===value));
    const icon=document.createElement('span');icon.className='category-icon';icon.setAttribute('aria-hidden','true');icon.textContent=value?(icons[value]||'🚘'):'✦';
    const name=document.createElement('span');name.className='category-label';name.textContent=label;
    const total=document.createElement('span');total.className='category-count';total.textContent=String(count);
    button.append(icon,name,total);rail.append(button);
  }
}
function renderFleet(){const grid=$('#fleetGrid');$('#fleetCount').textContent=`${state.vehicles.length} ${state.vehicles.length===1?'vehicle':'vehicles'}`;$('#fleetEmpty').hidden=state.vehicles.length>0;grid.innerHTML=state.vehicles.map(v=>{
  const visual=v.image?`<img src="${esc(v.image)}" alt="${esc(v.name)}" loading="lazy" onerror="this.hidden=true">`:'<span class="vehicle-placeholder" aria-hidden="true">🚘</span>';
  return `<article class="vehicle-card"><div class="vehicle-image">${visual}<span class="vehicle-category">${esc(v.category)}</span><span class="availability">● Available</span></div><div class="vehicle-content"><div class="vehicle-heading"><div><h3>${esc(v.name)}</h3><div class="vehicle-brand">${esc(v.brand)} · ${esc(v.model)}</div></div><div class="vehicle-price">${money(v.pricePerDay)}<small>/day</small></div></div><div class="vehicle-meta"><span>⛽ ${esc(v.fuelType)}</span><span>⚙ ${esc(v.transmission)}</span><span>♙ ${v.seats} seats</span><span>⌖ ${esc(v.location)}</span></div><div class="vehicle-actions"><button class="btn btn-lime" data-book="${v.id}">Book this ride</button><button class="btn btn-outline" data-details="${v.id}">Details</button></div></div></article>`;
 }).join('');renderCategoryRail();}
function showDetails(id){const v=state.vehicles.find(x=>x.id===Number(id));if(!v)return;$('#vehicleDetail').innerHTML=`<button class="dialog-close" type="button" data-close aria-label="Close">×</button><span class="eyebrow">${esc(v.category)} · ${esc(v.location)}</span><h2>${esc(v.name)}</h2><p class="dialog-sub">${esc(v.brand)} ${esc(v.model)}</p><div class="detail-hero">${v.image?`<img src="${esc(v.image)}" alt="${esc(v.name)}">`:'<span>🚘</span>'}</div><div class="detail-specs"><span>${esc(v.fuelType)}</span><span>${esc(v.transmission)}</span><span>${v.seats} seats</span><span>${money(v.pricePerDay)} / day</span></div><p class="dialog-sub">${esc(v.description||'A well-appointed vehicle, ready for your next trip.')}</p><div class="detail-actions"><button class="btn btn-lime" data-book="${v.id}">Choose dates & book</button></div>`;openDialog('detailDialog');}
function showBooking(id){const v=state.vehicles.find(x=>x.id===Number(id));if(!v)return;if(!state.user){state.selectedVehicle=v;$('#loginDialog').dataset.nextVehicle=String(v.id);openDialog('loginDialog');toast('Log in or create an account to book.');return;}state.selectedVehicle=v;const form=$('#bookingForm');form.reset();form.elements.vehicleId.value=v.id;form.elements.pickup.min=new Date().toISOString().slice(0,10);form.elements.return.min=new Date().toISOString().slice(0,10);form.elements.pickup.value=$('#searchPickup').value||new Date().toISOString().slice(0,10);form.elements.return.value=$('#searchReturn').value||addDays(form.elements.pickup.value,1);form.elements.location.value=$('#searchLocation').value||v.location;$('#selectedVehicle').innerHTML=`<strong>${esc(v.name)}</strong> · ${esc(v.category)} · ${money(v.pricePerDay)} per day`;$('#bookingError').hidden=true;updatePrice();openDialog('bookingDialog');}
function updatePrice(){const f=$('#bookingForm');if(!state.selectedVehicle)return;const p=f.elements.pickup.value,r=f.elements.return.value;let days=0;if(p&&r&&r>p)days=Math.ceil((Date.parse(`${r}T00:00:00Z`)-Date.parse(`${p}T00:00:00Z`))/86400000);const base=days*state.selectedVehicle.pricePerDay,tax=Math.round(base*.18),deposit=2000,total=base+tax+deposit;$('#priceBreakdown').innerHTML=`<div class="price-line"><span>Rental (${days||0} day${days===1?'':'s'} × ${money(state.selectedVehicle.pricePerDay)})</span><strong>${money(base)}</strong></div><div class="price-line"><span>GST (18%)</span><strong>${money(tax)}</strong></div><div class="price-line"><span>Refundable deposit</span><strong>${money(deposit)}</strong></div><div class="price-line total"><span>Total due</span><strong>${money(total)}</strong></div>`;}
async function loadMyBookings(){if(!state.user||state.user.role!=='customer')return;const [data]=await Promise.all([api('/api/bookings')]);const bookings=data.bookings;const by=(s)=>bookings.filter(b=>b.status===s).length;$('#accountStats').innerHTML=[['Total trips',bookings.length],['Upcoming',bookings.filter(b=>['pending','confirmed'].includes(b.status)).length],['Active',by('active')],['Completed',by('completed')],['Cancelled',by('cancelled')]].map(([l,n])=>`<div class="account-stat"><strong>${n}</strong><span>${l}</span></div>`).join('');$('#myBookings').innerHTML=bookings.length?bookings.map(b=>`<article class="booking-card"><div><span class="booking-ref">${esc(b.reference)}</span><h3>${esc(b.vehicle)}</h3><p>${esc(b.location)}</p></div><div><strong>${dateLabel(b.pickup)} – ${dateLabel(b.returnDate)}</strong><p>${b.days} day${b.days===1?'':'s'} · ${money(b.dailyRate)}/day</p></div><div><strong>${money(b.total)}</strong><p>includes ${money(b.deposit)} refundable deposit</p></div><div><span class="status ${esc(b.status)}">${esc(b.status)}</span><div class="action-group" style="margin-top:8px"><button class="btn btn-outline" data-receipt="${b.id}">Receipt</button>${['pending','confirmed'].includes(b.status)&&Date.parse(`${b.pickup}T00:00:00Z`)-Date.now()>=86400000?`<button class="btn btn-outline" data-cancel="${b.id}">Cancel</button>`:''}</div></div></article>`).join(''):'<div class="empty-state"><div class="empty-icon">⌁</div><h3>No bookings yet</h3><p>Your confirmed trips will show up here.</p></div>';}
async function loadAdmin(){if(state.user?.role!=='admin')return;const [stats,bookings,vehicles,customers]=await Promise.all([api('/api/admin/stats'),api('/api/bookings'),api('/api/admin/vehicles'),api('/api/admin/customers')]);state.adminStats=stats;$('#adminStats').innerHTML=[['Vehicles',stats.totalVehicles],['Active fleet',stats.activeVehicles],['Available now',stats.availableVehicles],['Rented now',stats.rented],['Customers',stats.customers],['Bookings',stats.totalBookings],['Pending',stats.pending],['Confirmed',stats.confirmed],['Active rentals',stats.active],['Completed',stats.completed],['Cancelled',stats.cancelled],['Revenue',money(stats.revenue)]].map(([l,n])=>`<div class="admin-stat"><strong>${n}</strong><span>${l}</span></div>`).join('');renderAdminBookings(bookings.bookings);renderAdminVehicles(vehicles.vehicles);$('#adminCustomerRows').innerHTML=customers.customers.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.email)}</td><td>${dateLabel(c.createdAt.slice(0,10))}</td><td>${c.bookings}</td></tr>`).join('')||'<tr><td colspan="4">No customers yet.</td></tr>';}
function renderAdminBookings(rows){$('#adminBookingRows').innerHTML=rows.length?rows.map(b=>{const options={pending:['confirmed','rejected','cancelled'],confirmed:['active','cancelled'],active:['completed'],completed:[],cancelled:[],rejected:[]}[b.status]||[];return `<tr><td><strong>${esc(b.reference)}</strong><br><span class="status ${esc(b.status)}">${esc(b.status)}</span></td><td>${esc(b.customer)}<br>${esc(b.email)}</td><td>${esc(b.vehicle)}</td><td>${dateLabel(b.pickup)} – ${dateLabel(b.returnDate)}<br>${b.days} day(s)</td><td>${money(b.total)}</td><td>${esc(b.status)}</td><td><div class="action-group">${options.map(s=>`<button class="btn btn-outline" data-status="${s}" data-id="${b.id}">${s}</button>`).join('')}<button class="btn btn-outline" data-receipt="${b.id}">Receipt</button></div></td></tr>`;}).join(''):'<tr><td colspan="7">No bookings found.</td></tr>';}
function renderAdminVehicles(rows){$('#adminVehicleRows').innerHTML=rows.length?rows.map(v=>`<tr><td><strong>${esc(v.name)}</strong><br>${esc(v.brand)} ${esc(v.model)}</td><td>${esc(v.category)}</td><td>${money(v.pricePerDay)}</td><td>${esc(v.location)}</td><td><span class="status ${v.status==='active'?'active':'cancelled'}">${esc(v.status)}</span></td><td><div class="action-group"><button class="btn btn-outline" data-edit-vehicle="${v.id}">Edit</button><button class="btn btn-outline" data-toggle-vehicle="${v.id}" data-active="${v.status==='active'}">${v.status==='active'?'Deactivate':'Activate'}</button></div></td></tr>`).join(''):'<tr><td colspan="6">No vehicles yet. Add the first vehicle to start your fleet.</td></tr>';}
async function refreshBookings(){const p=new URLSearchParams();const q=$('#bookingSearch').value.trim(),status=$('#bookingStatus').value,date=$('#bookingDate').value;if(q)p.set('q',q);if(status)p.set('status',status);if(date)p.set('date',date);const {bookings}=await api(`/api/bookings?${p}`);renderAdminBookings(bookings);}
async function handleLogin(e){e.preventDefault();const f=e.currentTarget;$('#loginError').hidden=true;const button=e.submitter;setLoading(button,true,'Signing in…');try{const form=Object.fromEntries(new FormData(f));const data=await api('/api/auth/login',{method:'POST',body:JSON.stringify(form)});state.user=data.user;state.csrf=data.csrf;updateNav();closeDialog(f);f.reset();toast(`Welcome back, ${state.user.name.split(' ')[0]}.`);if(state.user.role==='admin'){await loadAdmin();}else{await loadMyBookings();const id=$('#loginDialog').dataset.nextVehicle;delete $('#loginDialog').dataset.nextVehicle;if(id)showBooking(id);}}catch(err){$('#loginError').textContent=err.message;$('#loginError').hidden=false;}finally{setLoading(button,false);}}
async function handleRegister(e){e.preventDefault();const f=e.currentTarget;$('#registerError').hidden=true;const button=e.submitter;setLoading(button,true,'Creating account…');try{const form=Object.fromEntries(new FormData(f));const data=await api('/api/auth/register',{method:'POST',body:JSON.stringify(form)});state.user=data.user;state.csrf=data.csrf;updateNav();closeDialog(f);f.reset();await loadMyBookings();toast('Your account is ready.');const id=$('#registerDialog').dataset.nextVehicle;delete $('#registerDialog').dataset.nextVehicle;if(id)showBooking(id);}catch(err){$('#registerError').textContent=err.message;$('#registerError').hidden=false;}finally{setLoading(button,false);}}
async function handleBooking(e){e.preventDefault();const b=$('#bookingError');b.hidden=true;const f=e.currentTarget;const pickup=f.elements.pickup.value,ret=f.elements.return.value;if(!pickup||!ret||ret<=pickup){b.textContent='Return date must be after pickup.';b.hidden=false;return;}const button=e.submitter;setLoading(button,true,'Checking availability…');try{const data=await api('/api/bookings',{method:'POST',body:JSON.stringify({vehicleId:Number(f.elements.vehicleId.value),pickup,returnDate:ret,location:f.elements.location.value.trim()})});closeDialog(f);toast(`Booking ${data.booking.reference} received. Status: pending.`);await loadMyBookings();$('#account').scrollIntoView({behavior:'smooth'});}catch(err){b.textContent=err.message;b.hidden=false;}finally{setLoading(button,false);}}
function openVehicleForm(vehicle){const f=$('#vehicleForm');f.reset();$('#uploadPreview').innerHTML='';$('#vehicleFormTitle').textContent=vehicle?'Edit vehicle':'Add a vehicle';if(vehicle){for(const [key,value] of Object.entries({id:vehicle.id,name:vehicle.name,brand:vehicle.brand,model:vehicle.model,category:vehicle.category,pricePerDay:vehicle.pricePerDay,location:vehicle.location,fuelType:vehicle.fuelType,transmission:vehicle.transmission,seats:vehicle.seats,image:vehicle.image,description:vehicle.description,active:vehicle.status==='active'})){if(f.elements[key].type==='checkbox')f.elements[key].checked=value;else f.elements[key].value=value;}}openDialog('vehicleDialog');}
async function handleVehicleSave(e){e.preventDefault();const f=e.currentTarget,button=e.submitter;setLoading(button,true,'Saving…');try{const data=Object.fromEntries(new FormData(f));const v={id:Number(data.id)||undefined,name:data.name,brand:data.brand,model:data.model,category:data.category,pricePerDay:Number(data.pricePerDay),location:data.location,fuelType:data.fuelType,transmission:data.transmission,seats:Number(data.seats),image:data.image||'',description:data.description||'',active:f.elements.active.checked};const editing=!!v.id;await api(editing?`/api/admin/vehicles/${v.id}`:'/api/vehicles',{method:editing?'PUT':'POST',body:JSON.stringify(v)});closeDialog(f);toast(editing?'Vehicle updated.':'Vehicle added.');await Promise.all([loadAdmin(),loadFleet(),loadCities()]);}catch(err){toast(err.message,true);}finally{setLoading(button,false);}}
async function uploadImage(file){if(!file)return;if(file.size>5*1024*1024){toast('Choose an image up to 5 MB.',true);return;}try{const data=await api('/api/uploads',{method:'POST',headers:{'content-type':file.type},body:file});$('#vehicleForm').elements.image.value=data.url;$('#uploadPreview').innerHTML=`<img src="${data.url}" alt="Image preview">`;toast('Image uploaded.');}catch(err){toast(err.message,true);}}
async function cancelBooking(id){if(!confirm('Cancel this booking? The record will stay in your history.'))return;try{await api(`/api/bookings/${id}/cancel`,{method:'POST',body:'{}'});toast('Booking cancelled.');if(state.user.role==='admin')await loadAdmin();else await loadMyBookings();}catch(e){toast(e.message,true);}}
async function changeStatus(id,status){try{await api(`/api/admin/bookings/${id}/status`,{method:'PATCH',body:JSON.stringify({status})});toast(`Booking marked ${status}.`);await loadAdmin();}catch(e){toast(e.message,true);}}
async function toggleVehicle(id,active){const v=await api(`/api/admin/vehicles/${id}`);v.vehicle.status=active?'inactive':'active';const x=v.vehicle;try{await api(`/api/admin/vehicles/${id}`,{method:'PUT',body:JSON.stringify({...x,active:!active})});toast(active?'Vehicle deactivated.':'Vehicle activated.');await Promise.all([loadAdmin(),loadFleet(),loadCities()]);}catch(e){toast(e.message,true);}}
async function downloadReceipt(id){try{const blob=await api(`/api/bookings/${id}/receipt`);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`booking-receipt-${id}.html`;a.click();URL.revokeObjectURL(url);}catch(e){toast(e.message,true);}}
async function logout(){try{await api('/api/auth/logout',{method:'POST',body:'{}'});}catch{}state.user=null;state.csrf=null;updateNav();$('#account').hidden=true;$('#admin').hidden=true;toast('You have logged out.');}

function bindEvents(){
  document.addEventListener('click',async e=>{const opener=e.target.closest('[data-open]');if(opener){openDialog(opener.dataset.open);return;}const closer=e.target.closest('[data-close]');if(closer){closeDialog(closer);return;}const sw=e.target.closest('[data-switch]');if(sw){const from=sw.closest('dialog'),next=sw.dataset.switch;const nextVehicle=from?.dataset.nextVehicle;from?.close();openDialog(next);if(nextVehicle)document.getElementById(next).dataset.nextVehicle=nextVehicle;return;}const book=e.target.closest('[data-book]');if(book){const detail=book.closest('dialog');detail?.close();showBooking(book.dataset.book);return;}const details=e.target.closest('[data-details]');if(details){showDetails(details.dataset.details);return;}const categoryFilter=e.target.closest('[data-category-filter]');if(categoryFilter){const selected=categoryFilter.dataset.categoryFilter;$('#filterCategory').value=$('#filterCategory').value===selected?'':selected;await loadFleet();return;}const city=e.target.closest('[data-city]');if(city){$('#searchLocation').value=city.dataset.city;clearVehicleFilters();await loadFleet();$('#fleet').scrollIntoView({behavior:'smooth'});return;}const cancel=e.target.closest('[data-cancel]');if(cancel){cancelBooking(cancel.dataset.cancel);return;}const receipt=e.target.closest('[data-receipt]');if(receipt){downloadReceipt(receipt.dataset.receipt);return;}const status=e.target.closest('[data-status]');if(status){changeStatus(status.dataset.id,status.dataset.status);return;}const edit=e.target.closest('[data-edit-vehicle]');if(edit){const {vehicles}=await api('/api/admin/vehicles');openVehicleForm(vehicles.find(v=>v.id===Number(edit.dataset.editVehicle)));return;}const toggle=e.target.closest('[data-toggle-vehicle]');if(toggle){toggleVehicle(toggle.dataset.toggleVehicle,toggle.dataset.active==='true');return;}const tab=e.target.closest('[data-tab]');if(tab){$$('.admin-tab').forEach(x=>x.classList.toggle('active',x===tab));$('#adminBookings').hidden=tab.dataset.tab!=='bookings';$('#adminVehicles').hidden=tab.dataset.tab!=='vehicles';$('#adminCustomers').hidden=tab.dataset.tab!=='customers';}
  });
  document.addEventListener('click',e=>{if(e.target.matches('dialog'))e.target.close();});
  $('#loginForm').addEventListener('submit',handleLogin);$('#registerForm').addEventListener('submit',handleRegister);$('#bookingForm').addEventListener('submit',handleBooking);$('#vehicleForm').addEventListener('submit',handleVehicleSave);
  $('#resetFleetFilters').addEventListener('click',resetFleetFilters);
  $('#logoutBtn').addEventListener('click',logout);$('#addVehicleBtn').addEventListener('click',()=>openVehicleForm());$('#searchForm').addEventListener('submit',e=>{e.preventDefault();clearVehicleFilters();loadFleet();document.getElementById('fleet').scrollIntoView({behavior:'smooth'});});
  for(const id of ['searchPickup','searchReturn'])$( `#${id}`).addEventListener('change',()=>{if(id==='searchPickup')$('#searchReturn').min=$('#searchPickup').value;loadFleet();});
  for(const id of ['filterCategory','filterBrand','filterFuel','filterTransmission','filterSeats','filterSort'])$(`#${id}`).addEventListener('change',loadFleet);
  let timer;$('#filterSearch').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(loadFleet,240);});for(const id of ['filterMinPrice','filterMaxPrice'])$(`#${id}`).addEventListener('change',loadFleet);
  $$('input[name="pickup"],input[name="return"]',$('#bookingForm')).forEach(x=>x.addEventListener('change',updatePrice));$('#bookingForm [name="pickup"]').addEventListener('change',()=>$('#bookingForm [name="return"]').min=$('#bookingForm [name="pickup"]').value);
  $('#vehicleForm [name="imageFile"]').addEventListener('change',e=>uploadImage(e.target.files?.[0]));$('#bookingSearch').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(refreshBookings,250);});$('#bookingStatus').addEventListener('change',refreshBookings);$('#bookingDate').addEventListener('change',refreshBookings);
}

init().catch(e=>{console.error(e);$('#fleetGrid').innerHTML='';$('#fleetEmpty').hidden=false;$('#fleetEmpty h3').textContent='Could not connect';$('#fleetEmpty p').textContent='Start the BharatDrive server and reload this page.';toast('Could not connect to the rental service.',true);});
