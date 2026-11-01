import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
try {
  const envText = await fs.readFile(path.resolve(ROOT, '../.env'), 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch {}
const DATA_FILE = path.join(ROOT, 'data', 'db.json');
const PORT = Number(process.env.API_PORT || 4000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const COOKIE_NAME = 'cu_admin_session';
const sessions = new Map();
const attempts = new Map();

const seed = {
  vehicles: [
    { id: 1, name: 'Corvette Stingray', type: 'Sports car', year: 2026, price: 68900, power: '495 hp', engine: '6.2L V8', status: 'active' },
    { id: 2, name: 'Silverado 1500', type: 'Pickup', year: 2026, price: 37200, power: '310 hp', engine: '2.7L TurboMax', status: 'active' },
    { id: 3, name: 'Equinox EV', type: 'Electric SUV', year: 2026, price: 34995, power: '220 hp', engine: 'Electric', status: 'active' },
    { id: 4, name: 'Tahoe', type: 'Full-size SUV', year: 2026, price: 58900, power: '355 hp', engine: '5.3L V8', status: 'active' },
    { id: 5, name: 'Blazer EV', type: 'Electric SUV', year: 2026, price: 44995, power: '288 hp', engine: 'Electric', status: 'active' }
  ],
  bookings: [],
  orders: [],
  products: [
    { id: 'ACC-001', name: 'All-weather floor liners', category: 'Interior', price: 189, description: 'Durable fitted protection for everyday driving.', stock: 24 },
    { id: 'ACC-002', name: 'Cargo organizer', category: 'Storage', price: 95, description: 'Keep essentials neatly arranged in the cargo area.', stock: 18 },
    { id: 'ACC-003', name: 'Premium wheel locks', category: 'Exterior', price: 79, description: 'A practical added layer for wheel security.', stock: 40 },
    { id: 'ACC-004', name: 'Portable EV charging cable', category: 'Electric', price: 399, description: 'Portable charging equipment. Compatibility must be confirmed.', stock: 8 },
    { id: 'ACC-005', name: 'Roof cross rails', category: 'Exterior', price: 329, description: 'Versatile carrying support for compatible vehicles.', stock: 12 },
    { id: 'ACC-006', name: 'Cargo area mat', category: 'Interior', price: 115, description: 'A removable mat designed to help protect the cargo floor.', stock: 21 }
  ],
  audit: []
};

async function readDb() {
  try { return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')); }
  catch { await writeDb(seed); return structuredClone(seed); }
}
async function writeDb(db) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, DATA_FILE);
}
const json = (res, status, data, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
};
const parseCookies = header => Object.fromEntries((header || '').split(';').map(x => x.trim()).filter(Boolean).map(x => { const i=x.indexOf('='); return [x.slice(0,i), decodeURIComponent(x.slice(i+1))]; }));
const sign = value => crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
function sessionFor(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token) return false;
  const [id, signature] = token.split('.');
  if (!id || !signature) return false;
  const supplied = Buffer.from(signature); const expected = Buffer.from(sign(id));
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return false;
  const expires = sessions.get(id);
  if (!expires || expires < Date.now()) { sessions.delete(id); return false; }
  return true;
}
function requireAdmin(req, res) { if (sessionFor(req)) return true; json(res, 401, { error: 'Admin authentication required' }); return false; }
async function body(req) {
  let raw=''; for await (const chunk of req) { raw += chunk; if (raw.length > 1_000_000) throw new Error('Request body too large'); }
  return raw ? JSON.parse(raw) : {};
}
const audit = (db, action, detail) => { db.audit.unshift({ id: crypto.randomUUID(), action, detail, at: new Date().toISOString() }); db.audit = db.audit.slice(0, 300); };

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, service: 'Chevrolet Universe API', time: new Date().toISOString() });
    if (req.method === 'POST' && url.pathname === '/api/auth/admin') {
      if (!ADMIN_PASSWORD || !SESSION_SECRET) return json(res, 503, { error: 'Set ADMIN_PASSWORD and SESSION_SECRET in the environment' });
      const ip = req.socket.remoteAddress || 'unknown';
      const state = attempts.get(ip) || { count: 0, until: 0 };
      if (state.until > Date.now()) return json(res, 429, { error: 'Too many attempts. Try again later.' });
      const input = await body(req);
      const supplied = Buffer.from(String(input.password || ''));
      const expected = Buffer.from(ADMIN_PASSWORD);
      const valid = supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
      if (!valid) {
        state.count += 1; if (state.count >= 6) { state.until = Date.now() + 10 * 60 * 1000; state.count = 0; }
        attempts.set(ip, state);
        return json(res, 401, { error: 'Invalid admin credentials' });
      }
      attempts.delete(ip);
      const id = crypto.randomUUID(); sessions.set(id, Date.now() + 8 * 60 * 60 * 1000);
      const token = `${id}.${sign(id)}`;
      return json(res, 200, { ok: true, expiresIn: 28800 }, { 'Set-Cookie': `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}` });
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
      if (token) sessions.delete(token.split('.')[0]);
      return json(res, 200, { ok: true }, { 'Set-Cookie': `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0` });
    }
    if (req.method === 'GET' && url.pathname === '/api/admin/session') return json(res, 200, { authenticated: sessionFor(req) });
    if (url.pathname.startsWith('/api/admin/')) {
      if (!requireAdmin(req, res)) return;
      const db = await readDb();
      if (req.method === 'GET' && url.pathname === '/api/admin/vehicles') return json(res, 200, db.vehicles);
      if (req.method === 'POST' && url.pathname === '/api/admin/vehicles') {
        const item = await body(req);
        if (!item.name?.trim() || !Number.isFinite(Number(item.price)) || Number(item.price) <= 0) return json(res, 400, { error: 'Vehicle name and positive price are required' });
        const record = { ...item, id: crypto.randomUUID(), year: Number(item.year), price: Number(item.price), status: 'active', createdAt: new Date().toISOString() };
        db.vehicles.unshift(record); audit(db, 'vehicle.created', record.name); await writeDb(db); return json(res, 201, record);
      }
      const vehicleMatch = url.pathname.match(/^\/api\/admin\/vehicles\/([^/]+)$/);
      if (vehicleMatch && req.method === 'PUT') {
        const patch = await body(req); const index = db.vehicles.findIndex(v => String(v.id) === vehicleMatch[1]);
        if (index < 0) return json(res, 404, { error: 'Vehicle not found' });
        db.vehicles[index] = { ...db.vehicles[index], ...patch, id: db.vehicles[index].id, updatedAt: new Date().toISOString() };
        audit(db, 'vehicle.updated', db.vehicles[index].name); await writeDb(db); return json(res, 200, db.vehicles[index]);
      }
      if (vehicleMatch && req.method === 'DELETE') {
        const index = db.vehicles.findIndex(v => String(v.id) === vehicleMatch[1]);
        if (index < 0) return json(res, 404, { error: 'Vehicle not found' });
        const [removed] = db.vehicles.splice(index, 1); audit(db, 'vehicle.deleted', removed.name); await writeDb(db); return json(res, 200, { ok: true });
      }
      if (req.method === 'GET' && url.pathname === '/api/admin/audit') return json(res, 200, db.audit);
    }
    if (req.method === 'GET' && url.pathname === '/api/products') {
      const db = await readDb(); return json(res, 200, db.products || seed.products);
    }
    if (req.method === 'POST' && url.pathname === '/api/orders') {
      const input = await body(req);
      const customer = String(input.customer || '').trim();
      const email = String(input.email || '').trim();
      const items = Array.isArray(input.items) ? input.items : [];
      if (!customer || !/^\S+@\S+\.\S+$/.test(email) || !items.length) return json(res, 400, { error: 'Customer name, valid email and at least one item are required' });
      const db = await readDb(); const products = db.products || seed.products; const normalized = [];
      for (const line of items) {
        const product = products.find(p => p.id === line.id); const quantity = Math.max(1, Math.min(20, Number(line.quantity) || 1));
        if (!product || product.stock < quantity) return json(res, 409, { error: `Product unavailable or insufficient stock: ${line.id}` });
        normalized.push({ id: product.id, name: product.name, price: product.price, quantity });
      }
      const total = normalized.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const order = { id: `CU-${new Date().getFullYear()}-${crypto.randomInt(10000,99999)}`, customer, email, phone: String(input.phone || '').slice(0,40), items: normalized, total, status: 'Awaiting dealer confirmation', paymentStatus: 'Not paid', createdAt: new Date().toISOString() };
      db.orders ||= []; db.orders.unshift(order); audit(db, 'order.created', order.id); await writeDb(db);
      return json(res, 201, order);
    }
    if (url.pathname === '/api/admin/orders') {
      if (!requireAdmin(req, res)) return;
      const db = await readDb();
      if (req.method === 'GET') return json(res, 200, db.orders || []);
    }
    const orderMatch = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)$/);
    if (orderMatch && req.method === 'PATCH') {
      if (!requireAdmin(req, res)) return;
      const patch = await body(req);
      const allowed = ['Awaiting dealer confirmation','Confirmed','Preparing','Ready for pickup','Completed','Cancelled'];
      if (!allowed.includes(patch.status)) return json(res, 400, { error: 'Unsupported order status' });
      const db = await readDb(); const order = (db.orders || []).find(item => item.id === orderMatch[1]);
      if (!order) return json(res, 404, { error: 'Order not found' });
      order.status = patch.status; order.updatedAt = new Date().toISOString();
      audit(db, 'order.status.updated', `${order.id}: ${order.status}`); await writeDb(db);
      return json(res, 200, order);
    }
    if (req.method === 'GET' && url.pathname === '/api/service-bookings') {
      const db = await readDb(); return json(res, 200, db.bookings);
    }
    if (req.method === 'POST' && url.pathname === '/api/service-bookings') {
      const item = await body(req);
      if (!item.vehicle || !item.service || !/^\d{4}-\d{2}-\d{2}$/.test(item.date || '') || !item.time) return json(res, 400, { error: 'Vehicle, service, date and time are required' });
      if (item.date < new Date().toISOString().slice(0,10)) return json(res, 400, { error: 'Booking date must be in the future' });
      const db = await readDb(); const record = { ...item, id: `SV-${crypto.randomInt(1000,9999)}`, status: 'Requested', createdAt: new Date().toISOString() };
      db.bookings.unshift(record); await writeDb(db); return json(res, 201, record);
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/service-bookings/')) {
      const id = decodeURIComponent(url.pathname.split('/').pop()); const db = await readDb(); const before = db.bookings.length;
      db.bookings = db.bookings.filter(x => x.id !== id); if (db.bookings.length === before) return json(res, 404, { error: 'Booking not found' });
      await writeDb(db); return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: 'Route not found' });
  } catch (error) {
    const status = error.message === 'Request body too large' ? 413 : 400;
    return json(res, status, { error: status === 413 ? error.message : 'Invalid request' });
  }
});
server.listen(PORT, () => console.log(`Chevrolet Universe API listening on http://localhost:${PORT}`));
