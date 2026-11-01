import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock3, MapPin, Plus, Trash2, Wrench } from 'lucide-react';
import { vehicles } from '../../data';
import { createRecord, deleteRecord, readCollection } from '../../services/localDatabase';
import { apiRequest } from '../../services/api';

const seed = [
  { id: 'SV-2048', vehicle: vehicles[0].name, service: 'Scheduled maintenance', date: '2026-11-12', time: '10:30', center: 'Tashkent Demo Service Center', status: 'Confirmed' }
];
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
export default function ServiceBooking({ notify = () => {} }) {
  const [records, setRecords] = useState(() => readCollection('service-bookings', seed));
  const [serverMode, setServerMode] = useState(false);
  useEffect(() => { apiRequest('/api/service-bookings').then(data => { setRecords(data); setServerMode(true); }).catch(() => setServerMode(false)); }, []);
  const [form, setForm] = useState({ vehicle: vehicles[0].name, service: 'Routine maintenance', date: '', time: '10:00', center: 'Tashkent Demo Service Center', notes: '' });
  const [show, setShow] = useState(false);
  const upcoming = useMemo(() => [...records].sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)), [records]);
  const submit = async event => {
    event.preventDefault();
    if (!form.date || form.date < today) { notify('Kelajakdagi sanani tanlang'); return; }
    let next;if(serverMode){try{await apiRequest('/api/service-bookings',{method:'POST',body:JSON.stringify(form)});next=await apiRequest('/api/service-bookings')}catch(e){notify(`Server error: ${e.message}`);return}}else{next=createRecord('service-bookings', { ...form, id: `SV-${Math.floor(1000 + Math.random() * 9000)}`, status: 'Requested' }, seed)}
    setRecords(next); setShow(false); setForm({ ...form, date: '', notes: '' }); notify('Servis so‘rovi saqlandi');
  };
  const cancel = async id => {let next;if(serverMode){try{await apiRequest(`/api/service-bookings/${encodeURIComponent(id)}`,{method:'DELETE'});next=await apiRequest('/api/service-bookings')}catch(e){notify(`Server error: ${e.message}`);return}}else{next=deleteRecord('service-bookings', id, seed)}setRecords(next); notify('Yozuv o‘chirildi'); };
  return <div className="service-booking-page"><section className="service-booking-hero"><span className="eco-kicker">CHEVROLET UNIVERSE / SERVICE</span><h1>Care that keeps<br/><em>you moving.</em></h1><p>Servis tashrifini rejalashtiring va so‘rovlaringizni bitta joyda kuzating.</p><button className="gold-btn" onClick={() => setShow(true)}><Plus size={16}/> Uchrashuv belgilash</button></section>
    <section className="service-booking-content"><div className="service-booking-heading"><div><span className="eco-kicker">YOUR SERVICE ACTIVITY</span><h2>Servis <em>uchrashuvlari</em></h2></div><span>{records.length} ta yozuv</span></div>
      {upcoming.length ? <div className="service-booking-list">{upcoming.map(item => <article className="service-booking-card" key={item.id}><div className="service-booking-icon"><Wrench/></div><div className="service-booking-info"><span>{item.id} · {item.status}</span><h3>{item.service}</h3><p>{item.vehicle}</p><div className="service-booking-meta"><span><CalendarDays/> {item.date}</span><span><Clock3/> {item.time}</span><span><MapPin/> {item.center}</span></div>{item.notes && <small>{item.notes}</small>}</div><button className="service-booking-delete" onClick={() => cancel(item.id)} aria-label="Delete booking"><Trash2/></button></article>)}</div> : <div className="service-booking-empty"><CheckCircle2/><h3>Hozircha uchrashuv yo‘q</h3><p>Servis tashrifini belgilash orqali boshlang.</p></div>}
      <div className="service-booking-notice">{serverMode?'API serveriga ulangan demo ma’lumotlar bazasi. Bu hali rasmiy Chevrolet servis markazlari jadvali emas.':'Lokal demo rejimi. API serverini ishga tushirsangiz, so‘rovlar serverdagi JSON bazada saqlanadi.'}</div>
      <Link className="service-booking-back" to="/portal/customer">← Mijoz portaliga qaytish</Link>
    </section>
    {show && <div className="ea-modal-backdrop" onClick={() => setShow(false)}><form className="ea-modal service-modal" onSubmit={submit} onClick={e => e.stopPropagation()}><div className="ea-modal-head"><div><span className="eco-kicker">SERVICE REQUEST</span><h2>Uchrashuv belgilash</h2></div><button type="button" onClick={() => setShow(false)}>×</button></div><div className="ea-form-grid"><label>Avtomobil<select value={form.vehicle} onChange={e => setForm({...form, vehicle:e.target.value})}>{vehicles.map(v=><option key={v.id}>{v.name}</option>)}</select></label><label>Servis turi<select value={form.service} onChange={e => setForm({...form, service:e.target.value})}>{['Routine maintenance','Oil & filter change','Brake inspection','Tire service','Diagnostics','Warranty inspection'].map(x=><option key={x}>{x}</option>)}</select></label><label>Sana<input type="date" min={today} required value={form.date} onChange={e => setForm({...form,date:e.target.value})}/></label><label>Vaqt<select value={form.time} onChange={e => setForm({...form,time:e.target.value})}>{['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00'].map(x=><option key={x}>{x}</option>)}</select></label><label className="service-full-field">Servis markazi<input value={form.center} onChange={e=>setForm({...form,center:e.target.value})} required/></label><label className="service-full-field">Izoh<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Qo‘shimcha ma’lumot..."/></label></div><div className="ea-modal-actions"><button type="button" className="ea-secondary" onClick={() => setShow(false)}>Bekor qilish</button><button type="submit" className="ea-primary"><CalendarDays/> So‘rov yuborish</button></div></form></div>}
  </div>;
}
