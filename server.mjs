import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(root, 'database');
const imageDir = path.join(root, 'images');
const uploadDir = path.join(imageDir, 'uploads');
const staticFiles = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/style.css', 'style.css'], ['/script.js', 'script.js']]);
fs.mkdirSync(dbDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
export const db = new DatabaseSync(process.env.DATABASE_PATH || path.join(dbDir, 'bharatdrive.sqlite'));
db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('customer','admin')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions(
 token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 csrf TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS vehicles(
 id INTEGER PRIMARY KEY, name TEXT NOT NULL, brand TEXT NOT NULL, model TEXT NOT NULL,
 category TEXT NOT NULL, price_per_day INTEGER NOT NULL CHECK(price_per_day>0),
 fuel_type TEXT NOT NULL, transmission TEXT NOT NULL, seats INTEGER NOT NULL CHECK(seats BETWEEN 1 AND 20),
 image TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', location TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bookings(
 id INTEGER PRIMARY KEY, reference TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL REFERENCES users(id),
 vehicle_id INTEGER NOT NULL REFERENCES vehicles(id), pickup TEXT NOT NULL, return_date TEXT NOT NULL,
 location TEXT NOT NULL, days INTEGER NOT NULL CHECK(days>0), daily_rate INTEGER NOT NULL,
 subtotal INTEGER NOT NULL, tax INTEGER NOT NULL, deposit INTEGER NOT NULL DEFAULT 2000,
 total INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
 CHECK(status IN ('pending','confirmed','active','completed','cancelled','rejected')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(vehicle_id,pickup,return_date,status);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status,category,price_per_day);`);

const scrypt = promisify(crypto.scrypt);
const mimeTypes = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon' };
const reservedStatus = "'pending','confirmed','active'";
const currency = n => Number(n || 0);
function send(res, status, payload, headers={}) { res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'x-content-type-options':'nosniff', ...headers }); res.end(JSON.stringify(payload)); }
function fail(res,status,message){send(res,status,{error:message});}
function parseCookie(req,key){const raw=req.headers.cookie||'';for(const part of raw.split(';')){const [k,...v]=part.trim().split('=');if(k===key)return decodeURIComponent(v.join('='));}return '';}
function safeUser(row){return row?{id:row.id,name:row.name,email:row.email,role:row.role,createdAt:row.created_at}:null;}
function cleanVehicle(row){return {id:row.id,name:row.name,brand:row.brand,model:row.model,category:row.category,pricePerDay:currency(row.price_per_day),fuelType:row.fuel_type,transmission:row.transmission,seats:row.seats,image:row.image,description:row.description,location:row.location,status:row.status};}
function cleanBooking(row){return {id:row.id,reference:row.reference,userId:row.user_id,customer:row.customer_name||'',email:row.customer_email||'',vehicleId:row.vehicle_id,vehicle:row.vehicle_name||'',brand:row.vehicle_brand||'',image:row.vehicle_image||'',pickup:row.pickup,returnDate:row.return_date,location:row.location,days:row.days,dailyRate:row.daily_rate,subtotal:row.subtotal,tax:row.tax,deposit:row.deposit,total:row.total,status:row.status,createdAt:row.created_at};}
const bookingSelect=`SELECT b.*,u.name customer_name,u.email customer_email,v.name vehicle_name,v.brand vehicle_brand,v.image vehicle_image FROM bookings b JOIN users u ON u.id=b.user_id JOIN vehicles v ON v.id=b.vehicle_id`;
async function body(req,limit=1024*1024){let data='';for await(const chunk of req){data+=chunk;if(data.length>limit)throw Object.assign(new Error('Request is too large.'),{status:413});}if(!data)return {};try{return JSON.parse(data);}catch{throw Object.assign(new Error('Invalid JSON body.'),{status:400});}}
function validEmail(v){return typeof v==='string'&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());}
function validDate(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(`${v}T00:00:00Z`))&&new Date(`${v}T00:00:00Z`).toISOString().slice(0,10)===v;}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function getSession(req){const sid=parseCookie(req,'bd_session');if(!sid)return null;const row=db.prepare('SELECT s.csrf,s.expires_at,u.id,u.name,u.email,u.role,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?').get(crypto.createHash('sha256').update(sid).digest('hex'));if(!row||row.expires_at<Date.now()){if(row)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(crypto.createHash('sha256').update(sid).digest('hex'));return null;}return {user:safeUser(row),csrf:row.csrf};}
function requireAuth(session,res,role){if(!session){fail(res,401,'Please log in to continue.');return false;}if(role&&session.user.role!==role){fail(res,403,'You do not have permission to do that.');return false;}return true;}
function requireCsrf(req,session,res){if(!session||!req.headers['x-csrf-token']||req.headers['x-csrf-token']!==session.csrf){fail(res,403,'Your session token expired. Refresh and try again.');return false;}return true;}
function randomRef(){return 'BD-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();}
function bootstrap(){return {adminExists:!!db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get()};}
export async function createAdminAccount(nameValue,emailValue,password){const name=String(nameValue||'').trim(),email=String(emailValue||'').trim().toLowerCase();if(name.length<2||name.length>80||!validEmail(email)||password.length<10||password.length>200)throw new Error('Enter a name, a valid email and a password between 10 and 200 characters.');const salt=crypto.randomBytes(16).toString('hex'),hash=(await scrypt(password,salt,64)).toString('hex');db.exec('BEGIN IMMEDIATE');try{if(bootstrap().adminExists){db.exec('ROLLBACK');throw new Error('An admin account already exists.');}const result=db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'admin')").run(name,email,`scrypt$${salt}$${hash}`);db.exec('COMMIT');return Number(result.lastInsertRowid);}catch(e){if(db.isTransaction)db.exec('ROLLBACK');if(String(e.message).includes('UNIQUE'))throw new Error('That email address already has an account.');throw e;}}

export async function route(req,res){
 const url=new URL(req.url,'http://localhost');const pathname=decodeURIComponent(url.pathname);const method=req.method||'GET';let session=getSession(req);
 if(pathname.startsWith('/api/')){
  if(method==='GET'&&pathname==='/api/bootstrap')return send(res,200,{...bootstrap(),user:session?.user||null,csrf:session?.csrf||null});
  if(method==='POST'&&pathname==='/api/auth/register'){
   const b=await body(req);const name=String(b.name||'').trim();const email=String(b.email||'').trim().toLowerCase();const password=String(b.password||'');
   if(name.length<2||name.length>80)return fail(res,400,'Enter a name between 2 and 80 characters.');if(!validEmail(email))return fail(res,400,'Enter a valid email address.');if(password.length<10||password.length>200)return fail(res,400,'Password must be at least 10 characters.');
   const salt=crypto.randomBytes(16).toString('hex');const hash=(await scrypt(password,salt,64)).toString('hex');try{const result=db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'customer')").run(name,email,`scrypt$${salt}$${hash}`);return await createSession(Number(result.lastInsertRowid),res);}catch(e){if(String(e.message).includes('UNIQUE'))return fail(res,409,'An account with that email already exists.');throw e;}
  }
  if(method==='POST'&&pathname==='/api/auth/login'){
   const b=await body(req);const email=String(b.email||'').trim();const password=String(b.password||'');const u=db.prepare('SELECT * FROM users WHERE email=? COLLATE NOCASE').get(email);if(!u)return fail(res,401,'Email or password is incorrect.');const [,salt,expected]=u.password_hash.split('$');const actual=(await scrypt(password,salt,64)).toString('hex');if(actual.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected,'hex')))return fail(res,401,'Email or password is incorrect.');return await createSession(u.id,res);
  }
  if(method==='POST'&&pathname==='/api/auth/logout'){
   if(!session)return send(res,200,{ok:true},{'set-cookie':'bd_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'});if(!requireCsrf(req,session,res))return;db.prepare('DELETE FROM sessions WHERE user_id=?').run(session.user.id);return send(res,200,{ok:true},{'set-cookie':'bd_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'});
  }
  if(pathname==='/api/vehicles'&&method==='GET'){
   const p=url.searchParams;let sql="SELECT * FROM vehicles WHERE status='active'";const args=[];const q=p.get('q')?.trim();if(q){sql+=' AND (name LIKE ? OR brand LIKE ? OR model LIKE ?)';args.push(`%${q}%`,`%${q}%`,`%${q}%`);}for(const [key,col] of [['category','category'],['brand','brand'],['fuel','fuel_type'],['transmission','transmission']]){const v=p.get(key);if(v){sql+=` AND ${col}=?`;args.push(v);}}const location=p.get('location')?.trim();if(location){sql+=' AND location LIKE ?';args.push(`%${location}%`);}const min=Number(p.get('minPrice')),max=Number(p.get('maxPrice'));if(p.has('minPrice')&&Number.isFinite(min)){sql+=' AND price_per_day>=?';args.push(min);}if(p.has('maxPrice')&&Number.isFinite(max)){sql+=' AND price_per_day<=?';args.push(max);}const seats=Number(p.get('seats'));if(seats>0){sql+=' AND seats>=?';args.push(seats);}const pickup=p.get('pickup'),ret=p.get('return');if(pickup&&ret&&validDate(pickup)&&validDate(ret)){sql+=` AND id NOT IN (SELECT vehicle_id FROM bookings WHERE status IN (${reservedStatus}) AND pickup < ? AND return_date > ?)`;args.push(ret,pickup);}const sort=p.get('sort');sql+=sort==='price-asc'?' ORDER BY price_per_day ASC':sort==='price-desc'?' ORDER BY price_per_day DESC':' ORDER BY created_at DESC';return send(res,200,{vehicles:db.prepare(sql).all(...args).map(cleanVehicle)});
  }
  const vehicleMatch=pathname.match(/^\/api\/vehicles\/(\d+)$/);
  if(vehicleMatch&&method==='GET'){const v=db.prepare("SELECT * FROM vehicles WHERE id=? AND status='active'").get(Number(vehicleMatch[1]));return v?send(res,200,{vehicle:cleanVehicle(v)}):fail(res,404,'Vehicle not found.');}
  if(pathname==='/api/admin/vehicles'&&method==='GET'){if(!requireAuth(session,res,'admin'))return;return send(res,200,{vehicles:db.prepare('SELECT * FROM vehicles ORDER BY created_at DESC').all().map(cleanVehicle)});}
  const vehicleAdminGet=pathname.match(/^\/api\/admin\/vehicles\/(\d+)$/);
  if(vehicleAdminGet&&method==='GET'){if(!requireAuth(session,res,'admin'))return;const v=db.prepare('SELECT * FROM vehicles WHERE id=?').get(Number(vehicleAdminGet[1]));return v?send(res,200,{vehicle:cleanVehicle(v)}):fail(res,404,'Vehicle not found.');}
  if(pathname==='/api/vehicles'&&method==='POST'){
   if(!requireAuth(session,res,'admin')||!requireCsrf(req,session,res))return;const b=await body(req);const v=normalizeVehicle(b,res);if(!v)return;const r=db.prepare('INSERT INTO vehicles(name,brand,model,category,price_per_day,fuel_type,transmission,seats,image,description,location,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(...v);return send(res,201,{vehicle:cleanVehicle(db.prepare('SELECT * FROM vehicles WHERE id=?').get(r.lastInsertRowid))});
  }
  const vehicleAdmin=pathname.match(/^\/api\/admin\/vehicles\/(\d+)$/);
  if(vehicleAdmin&&method==='PUT'){
   if(!requireAuth(session,res,'admin')||!requireCsrf(req,session,res))return;const id=Number(vehicleAdmin[1]);const b=await body(req);const v=normalizeVehicle(b,res);if(!v)return;const result=db.prepare('UPDATE vehicles SET name=?,brand=?,model=?,category=?,price_per_day=?,fuel_type=?,transmission=?,seats=?,image=?,description=?,location=?,status=? WHERE id=?').run(...v,id);return result.changes?send(res,200,{vehicle:cleanVehicle(db.prepare('SELECT * FROM vehicles WHERE id=?').get(id))}):fail(res,404,'Vehicle not found.');
  }
  if(pathname==='/api/uploads'&&method==='POST'){
   if(!requireAuth(session,res,'admin')||!requireCsrf(req,session,res))return;const type=String(req.headers['content-type']||'').toLowerCase();const ext=({ 'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'})[type];if(!ext)return fail(res,415,'Use a JPEG, PNG or WebP image.');const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>5*1024*1024)return fail(res,413,'Images must be 5 MB or smaller.');chunks.push(c);}if(size===0)return fail(res,400,'Choose an image to upload.');const file=`${crypto.randomUUID()}${ext}`;fs.writeFileSync(path.join(uploadDir,file),Buffer.concat(chunks),{flag:'wx'});return send(res,201,{url:`/images/uploads/${file}`});
  }
  if(pathname==='/api/bookings'&&method==='POST'){
   if(!requireAuth(session,res,'customer')||!requireCsrf(req,session,res))return;const b=await body(req);const vehicleId=Number(b.vehicleId),pickup=String(b.pickup||''),ret=String(b.returnDate||''),location=String(b.location||'').trim();if(!Number.isInteger(vehicleId)||!validDate(pickup)||!validDate(ret)||!location||location.length>120)return fail(res,400,'Enter valid pickup and return dates and a pickup location.');const today=new Date().toISOString().slice(0,10);if(pickup<today||ret<=pickup)return fail(res,400,'Return date must be after pickup, and pickup cannot be in the past.');const days=Math.ceil((Date.parse(`${ret}T00:00:00Z`)-Date.parse(`${pickup}T00:00:00Z`))/86400000);if(days>90)return fail(res,400,'A rental can be up to 90 days.');
   db.exec('BEGIN IMMEDIATE');try{const vehicle=db.prepare("SELECT * FROM vehicles WHERE id=? AND status='active'").get(vehicleId);if(!vehicle){db.exec('ROLLBACK');return fail(res,404,'This vehicle is no longer available.');}const overlap=db.prepare(`SELECT 1 FROM bookings WHERE vehicle_id=? AND status IN (${reservedStatus}) AND pickup < ? AND return_date > ? LIMIT 1`).get(vehicleId,ret,pickup);if(overlap){db.exec('ROLLBACK');return fail(res,409,'Those dates are no longer available. Choose another period.');}const daily=vehicle.price_per_day,subtotal=daily*days,tax=Math.round(subtotal*.18),deposit=2000,total=subtotal+tax+deposit,reference=randomRef();const ins=db.prepare('INSERT INTO bookings(reference,user_id,vehicle_id,pickup,return_date,location,days,daily_rate,subtotal,tax,deposit,total,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(reference,session.user.id,vehicleId,pickup,ret,location,days,daily,subtotal,tax,deposit,total,'pending');const saved=db.prepare(`${bookingSelect} WHERE b.id=?`).get(ins.lastInsertRowid);db.exec('COMMIT');return send(res,201,{booking:cleanBooking(saved)});}catch(e){db.exec('ROLLBACK');throw e;}
  }
  if(pathname==='/api/bookings'&&method==='GET'){
   if(!requireAuth(session,res))return;let rows;if(session.user.role==='admin'){let sql=`${bookingSelect} WHERE 1=1`,args=[];const status=url.searchParams.get('status'),q=url.searchParams.get('q'),date=url.searchParams.get('date');if(status){sql+=' AND b.status=?';args.push(status);}if(q){sql+=' AND (b.reference LIKE ? OR u.name LIKE ? OR v.name LIKE ?)';args.push(`%${q}%`,`%${q}%`,`%${q}%`);}if(date&&validDate(date)){sql+=' AND b.pickup=?';args.push(date);}rows=db.prepare(sql+' ORDER BY b.created_at DESC').all(...args);}else rows=db.prepare(`${bookingSelect} WHERE b.user_id=? ORDER BY b.created_at DESC`).all(session.user.id);return send(res,200,{bookings:rows.map(cleanBooking)});
  }
  const bookingCancel=pathname.match(/^\/api\/bookings\/(\d+)\/cancel$/);
  if(bookingCancel&&method==='POST'){
   if(!requireAuth(session,res)||!requireCsrf(req,session,res))return;const id=Number(bookingCancel[1]);const b=db.prepare('SELECT * FROM bookings WHERE id=?').get(id);if(!b)return fail(res,404,'Booking not found.');const admin=session.user.role==='admin';if(!admin&&b.user_id!==session.user.id)return fail(res,404,'Booking not found.');if(!['pending','confirmed'].includes(b.status))return fail(res,409,'This booking can no longer be cancelled.');if(!admin&&Date.parse(`${b.pickup}T00:00:00Z`)-Date.now()<24*60*60*1000)return fail(res,409,'Customer cancellations are available until 24 hours before pickup.');db.prepare("UPDATE bookings SET status='cancelled' WHERE id=?").run(id);return send(res,200,{booking:cleanBooking(db.prepare(`${bookingSelect} WHERE b.id=?`).get(id))});
  }
  const bookingStatus=pathname.match(/^\/api\/admin\/bookings\/(\d+)\/status$/);
  if(bookingStatus&&method==='PATCH'){
   if(!requireAuth(session,res,'admin')||!requireCsrf(req,session,res))return;const b=await body(req);const next=String(b.status||'');const row=db.prepare('SELECT * FROM bookings WHERE id=?').get(Number(bookingStatus[1]));if(!row)return fail(res,404,'Booking not found.');const allowed={pending:['confirmed','rejected','cancelled'],confirmed:['active','cancelled'],active:['completed'],completed:[],cancelled:[],rejected:[]};if(!allowed[row.status]?.includes(next))return fail(res,409,'That status change is not allowed.');if(next==='confirmed'||next==='active'){const overlap=db.prepare(`SELECT 1 FROM bookings WHERE vehicle_id=? AND id<>? AND status IN (${reservedStatus}) AND pickup < ? AND return_date > ?`).get(row.vehicle_id,row.id,row.return_date,row.pickup);if(overlap)return fail(res,409,'Another booking overlaps this period.');}db.prepare('UPDATE bookings SET status=? WHERE id=?').run(next,row.id);return send(res,200,{booking:cleanBooking(db.prepare(`${bookingSelect} WHERE b.id=?`).get(row.id))});
  }
  if(pathname==='/api/admin/stats'&&method==='GET'){
   if(!requireAuth(session,res,'admin'))return;const totalVehicles=db.prepare('SELECT COUNT(*) n FROM vehicles').get().n;const activeVehicles=db.prepare("SELECT COUNT(*) n FROM vehicles WHERE status='active'").get().n;const customers=db.prepare("SELECT COUNT(*) n FROM users WHERE role='customer'").get().n;const counts=db.prepare("SELECT status,COUNT(*) n FROM bookings GROUP BY status").all();const byStatus=Object.fromEntries(counts.map(x=>[x.status,x.n]));const revenue=db.prepare("SELECT COALESCE(SUM(subtotal+tax),0) n FROM bookings WHERE status IN ('confirmed','active','completed')").get().n;const today=new Date().toISOString().slice(0,10);const rented=db.prepare("SELECT COUNT(DISTINCT vehicle_id) n FROM bookings WHERE status='active' AND pickup<=? AND return_date>? ").get(today,today).n;const availableVehicles=Math.max(0,activeVehicles-rented);return send(res,200,{totalVehicles,activeVehicles,availableVehicles,customers,totalBookings:counts.reduce((a,x)=>a+x.n,0),pending:byStatus.pending||0,confirmed:byStatus.confirmed||0,active:byStatus.active||0,completed:byStatus.completed||0,cancelled:byStatus.cancelled||0,rejected:byStatus.rejected||0,rented,revenue});
  }
  if(pathname==='/api/admin/customers'&&method==='GET'){
   if(!requireAuth(session,res,'admin'))return;const rows=db.prepare("SELECT u.id,u.name,u.email,u.created_at,COUNT(b.id) bookings FROM users u LEFT JOIN bookings b ON b.user_id=u.id WHERE u.role='customer' GROUP BY u.id ORDER BY u.created_at DESC").all();return send(res,200,{customers:rows.map(r=>({id:r.id,name:r.name,email:r.email,createdAt:r.created_at,bookings:r.bookings}))});
  }
  const receipt=pathname.match(/^\/api\/bookings\/(\d+)\/receipt$/);
  if(receipt&&method==='GET'){
   if(!requireAuth(session,res))return;const row=db.prepare(`${bookingSelect} WHERE b.id=?`).get(Number(receipt[1]));if(!row||session.user.role!=='admin'&&row.user_id!==session.user.id)return fail(res,404,'Booking not found.');const b=cleanBooking(row);const html=`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(b.reference)}</title><style>body{font:16px Arial,sans-serif;max-width:700px;margin:50px auto;color:#17191d;padding:24px}h1{color:#222}small{color:#555}.row{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:9px 0}.total{font-weight:bold;font-size:20px;margin-top:8px}button{padding:10px 16px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print / Save as PDF</button><h1>BharatDrive booking receipt</h1><p><strong>${esc(b.reference)}</strong><br><small>Booked ${esc(b.createdAt)}</small></p><div class="row"><span>Customer</span><strong>${esc(b.customer)} · ${esc(b.email)}</strong></div><div class="row"><span>Vehicle</span><strong>${esc(b.vehicle)} ${esc(b.brand)}</strong></div><div class="row"><span>Pickup</span><strong>${esc(b.pickup)} · ${esc(b.location)}</strong></div><div class="row"><span>Return</span><strong>${esc(b.returnDate)}</strong></div><div class="row"><span>Duration</span><strong>${b.days} day(s)</strong></div><div class="row"><span>Daily rate × days</span><strong>₹${b.dailyRate.toLocaleString('en-IN')} × ${b.days} = ₹${b.subtotal.toLocaleString('en-IN')}</strong></div><div class="row"><span>GST (18%)</span><strong>₹${b.tax.toLocaleString('en-IN')}</strong></div><div class="row"><span>Refundable deposit</span><strong>₹${b.deposit.toLocaleString('en-IN')}</strong></div><div class="row"><span>Status</span><strong>${esc(b.status)}</strong></div><div class="row total"><span>Total</span><strong>₹${b.total.toLocaleString('en-IN')}</strong></div><p><small>This receipt reflects the booking record at the time it was generated.</small></p></body></html>`;res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-disposition':`attachment; filename="receipt-${b.reference}.html"`,'x-content-type-options':'nosniff'});return res.end(html);
  }
  return fail(res,404,'API route not found.');
 }
 if(method!=='GET'&&method!=='HEAD')return fail(res,405,'Method not allowed.');
 let file;if(staticFiles.has(pathname))file=path.join(root,staticFiles.get(pathname));else if(pathname.startsWith('/images/')){file=path.resolve(imageDir,pathname.slice('/images/'.length));if(!file.startsWith(path.resolve(imageDir)+path.sep))return fail(res,403,'Forbidden.');}else return fail(res,404,'Not found.');if(!fs.existsSync(file)||!fs.statSync(file).isFile())return fail(res,404,'Not found.');const ext=path.extname(file).toLowerCase();res.writeHead(200,{'content-type':mimeTypes[ext]||'application/octet-stream','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin','content-security-policy':"default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",'cache-control':ext==='.html'?'no-cache':'public, max-age=3600'});if(method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
}

function normalizeVehicle(b,res){const name=String(b.name||'').trim(),brand=String(b.brand||'').trim(),model=String(b.model||'').trim(),category=String(b.category||'').trim(),location=String(b.location||'').trim(),fuel=String(b.fuelType||'').trim(),trans=String(b.transmission||'').trim(),description=String(b.description||'').trim(),image=String(b.image||'').trim(),price=Number(b.pricePerDay),seats=Number(b.seats);if(!name||!brand||!model||!category||!location||name.length>100||brand.length>60||model.length>60||category.length>40||location.length>100||description.length>700)return fail(res,400,'Complete the vehicle details using the allowed lengths.'),null;if(!Number.isInteger(price)||price<1||price>10000000||!Number.isInteger(seats)||seats<1||seats>20)return fail(res,400,'Enter a valid daily rate and seating capacity.'),null;if(!['Petrol','Diesel','Electric','Hybrid','CNG'].includes(fuel)||!['Manual','Automatic'].includes(trans))return fail(res,400,'Choose a supported fuel type and transmission.'),null;if(image&&!image.startsWith('/images/uploads/')&&!/^https:\/\//i.test(image))return fail(res,400,'Vehicle images must use HTTPS or a project upload.'),null;return [name,brand,model,category,price,fuel,trans,seats,image,description,location,b.active===false?'inactive':'active'];}

async function createSession(userId,res){const token=crypto.randomBytes(32).toString('base64url'),hash=crypto.createHash('sha256').update(token).digest('hex'),csrf=crypto.randomBytes(24).toString('base64url'),expires=Date.now()+7*86400000;db.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').run(hash,userId,csrf,expires);const user=db.prepare('SELECT * FROM users WHERE id=?').get(userId);send(res,200,{user:safeUser(user),csrf,adminExists:bootstrap().adminExists},{'set-cookie':`bd_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`});}

function promptHidden(label){return new Promise((resolve,reject)=>{const input=process.stdin,output=process.stdout;if(!input.isTTY||typeof input.setRawMode!=='function'){reject(new Error('Run this command in an interactive terminal to enter the admin password safely.'));return;}let value='';output.write(label);input.setRawMode(true);input.resume();const finish=(error)=>{input.off('data',onData);input.setRawMode(false);input.pause();output.write('\n');error?reject(error):resolve(value);};const onData=chunk=>{for(const char of chunk.toString('utf8')){if(char==='\u0003')return finish(new Error('Admin creation cancelled.'));if(char==='\r'||char==='\n')return finish();if(char==='\u007f'||char==='\b'){value=value.slice(0,-1);continue;}value+=char;}};input.on('data',onData);});}
async function createAdminFromTerminal(){if(bootstrap().adminExists)throw new Error('An admin account already exists.');const prompt=readline.createInterface({input:process.stdin,output:process.stdout});const name=(await prompt.question('Admin name: ')).trim();const email=(await prompt.question('Admin email: ')).trim().toLowerCase();prompt.close();const password=await promptHidden('Admin password (minimum 10 characters; input hidden): ');await createAdminAccount(name,email,password);console.log(`Admin account created for ${email}. You can now log in on the website.`);}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.includes('--create-admin'))createAdminFromTerminal().then(()=>db.close()).catch(err=>{console.error(err.message);db.close();process.exitCode=1;});
 else{const server=http.createServer((req,res)=>{Promise.resolve(route(req,res)).catch(err=>{console.error(err);if(!res.headersSent)fail(res,err.status||500,err.status?err.message:'The server encountered an error.');else res.destroy();});});const port=Number(process.env.PORT)||3000;server.listen(port,'127.0.0.1',()=>console.log(`BharatDrive ready at http://127.0.0.1:${port}`));process.on('SIGINT',()=>{server.close(()=>{db.close();process.exit(0);});});}
}
