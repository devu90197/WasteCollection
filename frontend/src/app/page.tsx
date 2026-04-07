"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../utils/supabaseClient';
import { Truck, MapPin, History, CreditCard, AlertTriangle, CheckCircle, LogOut, Settings as SettingsIcon, Shield, ChevronRight, User } from 'lucide-react';

const MapWithNoSSR = dynamic(() => import('../components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="h-[400px] bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center text-white/50 border border-white/20 animate-pulse">Initializing Neural Map...</div>
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('dashboard');
  const [pickups, setPickups] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [collectors, setCollectors] = useState<any[]>([]);
  const [fineSettings, setFineSettings] = useState<any[]>([]);
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('citizen');
  const [selectedPickup, setSelectedPickup] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const fetchData = async () => {
    if (!user || !user.id) return;
    try {
      // Unified Audit Fetching Logic
      const [pRes, fRes] = await Promise.all([
        axios.get(`${API_URL}/pickups?role=${user.role}&user_id=${user.id}`),
        axios.get(`${API_URL}/fines`, { params: user.role === 'admin' ? {} : { user_id: user.id } })
      ]);
      
      setPickups(pRes.data);
      setFines(fRes.data);
      
      if (user.role === 'admin' || user.role === 'collector') {
        const sRes = await axios.get(`${API_URL}/fine-settings`);
        setFineSettings(sRes.data);
      }
      if (user.role === 'admin') {
        const cRes = await axios.get(`${API_URL}/users/collectors`);
        setCollectors(cRes.data);
      }
    } catch (err) { 
        // Silent retry only on actual network failure
        console.warn("Connection pulse lost. Re-establishing link...");
    }
  };

  useEffect(() => {
    if (user && user.id) {
       fetchData();
       // Debounced Realtime Handlers to prevent Network Errors on Windows
       const stabilize = () => setTimeout(fetchData, 150);
       const pickupsChannel = supabase.channel('gl_p_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'pickups' }, stabilize).subscribe();
       const finesChannel = supabase.channel('gl_f_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'fines' }, stabilize).subscribe();
       return () => { supabase.removeChannel(pickupsChannel); supabase.removeChannel(finesChannel); };
    }
  }, [user]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/users`, { email, full_name: fullName, role });
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    } catch (err) { alert("Registration failed."); } finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/login`, { email });
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    } catch (err) { alert("Access Denied: Record not found."); setIsRegister(true); } finally { setLoading(false); }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] relative flex items-center justify-center p-4 overflow-hidden">
        {/* Animated Mesh Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full delay-1000 animate-pulse" />
        
        <div className="z-10 max-w-lg w-full">
            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 shadow-2xl text-white">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                        <Truck size={32} />
                    </div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">Eco System</h1>
                    <p className="text-white/40 text-sm font-medium tracking-wide font-mono">Waste Management Portal v2.0</p>
                </div>

                <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-6">
                    {isRegister && (
                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400 transition-colors" size={18} />
                            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-400/50 focus:bg-white/10 transition-all font-medium placeholder:text-white/20" placeholder="Identity Name" required />
                        </div>
                        <div className="relative group">
                            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400 transition-colors" size={18} />
                            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-400/50 focus:bg-white/10 transition-all font-medium appearance-none cursor-pointer">
                                <option value="citizen" className="bg-slate-900 border-none">Citizen Node</option>
                                <option value="collector" className="bg-slate-900 border-none">Collector Asset</option>
                                <option value="admin" className="bg-slate-900 border-none">Administrative Core</option>
                            </select>
                        </div>
                    </div>
                    )}
                    <div className="relative group">
                        <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400 transition-colors" size={18} />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-400/50 focus:bg-white/10 transition-all font-medium placeholder:text-white/20" placeholder="System Email" required />
                    </div>

                    <button type="submit" disabled={loading} className="group w-full relative h-16 bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 italic skew-x-12" />
                        <span className="relative z-10">{loading ? "Synchronizing..." : (isRegister ? "Launch Access" : "Secure Entry")}</span>
                    </button>
                </form>

                <button onClick={() => setIsRegister(!isRegister)} className="mt-8 w-full text-center text-xs font-black uppercase text-white/30 hover:text-white/60 tracking-widest transition-colors">
                    {isRegister ? "Auth Existing Account" : "Initiate System Registration"}
                </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col md:flex-row p-6 md:p-8 gap-8 font-sans selection:bg-emerald-500/30 overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-emerald-600/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-blue-600/5 blur-[150px] pointer-events-none" />

      {/* Floating Sidebar */}
      <aside className="w-full md:w-72 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col z-20 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="mb-12 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/40">
                <Truck size={20} />
            </div>
            <h2 className="font-black text-lg text-white uppercase tracking-tighter">Eco Hub</h2>
        </div>

        <nav className="flex-1 space-y-3">
          <SidebarLink icon={<MapPin size={20}/>} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <SidebarLink icon={<History size={20}/>} label="Duty Log" active={view === 'pickups'} onClick={() => setView('pickups')} />
          <SidebarLink icon={<CreditCard size={20}/>} label="Fines" active={view === 'fines'} onClick={() => setView('fines')} />
          {user.role === 'admin' && <SidebarLink icon={<SettingsIcon size={20}/>} label="Config" active={view === 'settings'} onClick={() => setView('settings')} />}
        </nav>

        <div className="mt-12 pt-8 border-t border-white/5">
            <div className="flex items-center gap-3 mb-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white font-bold">
                    {user.full_name[0].toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-black text-white truncate">{user.full_name}</p>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{user.role}</p>
                </div>
            </div>
            <button onClick={() => { setUser(null); localStorage.removeItem('user'); }} className="flex items-center gap-2 text-red-400 text-xs font-black uppercase tracking-widest hover:text-red-300 transition-colors pl-4"><LogOut size={14}/> Sign Output</button>
        </div>
      </aside>

      {/* Main Glass Panel */}
      <main className="flex-1 space-y-8 z-10 max-w-full">
        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Welcome Back</h1>
                    <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Environmental Status Overview</p>
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest uppercase">Live Connection</div>
                </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 ${user.role === 'admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-8`}>
                <GlassStatCard label="Pending Nodes" value={pickups.filter(p => !['Completed', 'Cancelled'].includes(p.status)).length} icon={<AlertTriangle />} tint="blue" />
                <GlassStatCard label="Resolved" value={pickups.filter(p => p.status === 'Completed').length} icon={<CheckCircle />} tint="emerald" />
                <GlassStatCard label="Penalty Debt" value={`₹${fines.filter(f => f.status === 'Unpaid').reduce((acc, curr) => acc + Number(curr.amount), 0)}`} icon={<CreditCard />} tint="red" />
                {user.role === 'admin' && (
                  <GlassStatCard label="Revenue Collected" value={`₹${fines.filter(f => f.status === 'Paid').reduce((acc, curr) => acc + Number(curr.amount), 0)}`} icon={<CheckCircle />} tint="emerald" />
                )}
            </div>

            {user.role === 'citizen' && (
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none" />
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black text-white tracking-tighter">Geospatial Dispatch</h3>
                        <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Select Location Node</p>
                    </div>
                    <MapWithNoSSR user={user} refreshData={fetchData} />
                </div>
            )}

            {user.role === 'admin' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white/5 backdrop-blur-3xl border border-white/10 p-8 rounded-[3rem] shadow-2xl">
                        <h3 className="text-xl font-black text-white tracking-tighter mb-8 flex items-center gap-3">
                            <Truck size={20} className="text-blue-400" /> Administrative Operational Queue
                        </h3>
                        <div className="space-y-4">
                            {pickups.filter(p => !['Completed', 'Cancelled'].includes(p.status)).map(p => (
                                <div key={p.id} className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-white/10 transition-all flex flex-col md:flex-row items-center justify-between gap-6 group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20 shrink-0">
                                            <MapPin size={24} />
                                        </div>
                                        <div className="max-w-[250px]">
                                            <p className="text-sm font-black text-white truncate">{p.locations?.address}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                                    p.status === 'Pending' ? 'text-indigo-400 border-indigo-400/20 bg-indigo-400/10' :
                                                    p.status === 'Reached' ? 'text-blue-400 border-blue-400/20 bg-blue-400/10' : 'text-amber-400 border-amber-400/20 bg-amber-400/10'
                                                }`}>
                                                    {p.status === 'Pending' ? 'Awaiting Dispatch' : p.status === 'Reached' ? 'Vehicle Arrived' : 'In Transit'}
                                                </span>
                                                <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{p.citizen?.full_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full md:w-auto">
                                        {p.status === 'Pending' ? (
                                            <select onChange={async (e) => {
                                                try { await axios.post(`${API_URL}/pickups/${p.id}/assign/${e.target.value}`); fetchData(); } catch(e){ alert("Assign error"); }
                                            }} className="w-full md:w-64 p-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all cursor-pointer appearance-none">
                                                <option value="" className="bg-[#0F172A]">Assign Staff Member...</option>
                                                {collectors.map(c => <option key={c.id} value={c.id} className="bg-[#0F172A]">{c.full_name}</option>)}
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-3 px-6 py-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                                <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-[10px] text-emerald-400">{p.collector?.full_name?.[0]}</div>
                                                <div>
                                                    <p className="text-[8px] font-black uppercase text-white/30 tracking-widest leading-none">Active Driver</p>
                                                    <p className="text-xs font-black text-white">{p.collector?.full_name}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500/20 to-blue-500/20 backdrop-blur-3xl border border-white/10 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                         <div className="absolute top-4 right-4 text-white/10"><Shield size={48} /></div>
                         <h3 className="text-xl font-black text-white tracking-tighter mb-4">System Registry</h3>
                         <p className="text-xs text-white/50 font-medium mb-10 leading-relaxed italic">Managing {collectors.length} active collection nodes across the unified environmental grid.</p>
                         <div className="space-y-4">
                            {collectors.slice(0,4).map(c => (
                                <div key={c.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-[10px] font-black uppercase">{c.full_name[0]}</div>
                                    <p className="text-xs font-black text-white/80">{c.full_name}</p>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
            )}

            {user.role === 'collector' && (
                <div className="space-y-8">
                     {selectedPickup ? (
                            <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest flex items-center gap-2"> Deployment Operations <span className="w-12 h-[1px] bg-white/10" /></p>
                                    <div className="flex gap-4">
                                        <button onClick={() => axios.post(`${API_URL}/pickups/${selectedPickup.id}/complete?status=Reached`).then(() => fetchData())} className="flex-1 group relative h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center gap-3 overflow-hidden shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-white border border-white/10">
                                            <CheckCircle size={18}/> <span className="font-black text-[10px] uppercase tracking-[0.2em]">Mark Arrived</span>
                                        </button>
                                        <button onClick={() => axios.post(`${API_URL}/pickups/${selectedPickup.id}/complete?status=Picked`).then(() => fetchData())} className="flex-1 group relative h-16 bg-amber-600 rounded-[1.5rem] flex items-center justify-center gap-3 overflow-hidden shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-white border border-white/10">
                                            <Truck size={18}/> <span className="font-black text-[10px] uppercase tracking-[0.2em]">Mark Picked</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest flex items-center gap-2"> Environmental Penalty System <span className="w-12 h-[1px] bg-white/10" /></p>
                                    <div className="flex gap-3">
                                        <div className="flex-1 relative">
                                            <select 
                                                id={`nav-flag-${selectedPickup.id}`} 
                                                className="w-full h-16 px-6 bg-white/5 border border-white/10 rounded-[1.5rem] text-[10px] font-black text-white/60 outline-none hover:border-red-500/30 transition-all cursor-pointer appearance-none"
                                            >
                                                <option value="" className="bg-[#0F172A]">Grid Status: Normal</option>
                                                {fineSettings.map(fs => <option key={fs.id} value={fs.violation_type} className="bg-slate-900">{fs.violation_type} (₹{fs.amount})</option>)}
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/20"><ChevronRight size={14}/></div>
                                        </div>
                                        <button onClick={() => {
                                            const flag = (document.getElementById(`nav-flag-${selectedPickup.id}`) as HTMLSelectElement)?.value;
                                            axios.post(`${API_URL}/pickups/${selectedPickup.id}/complete?status=Completed${flag ? `&flagged_reason=${flag}` : ''}`).then(() => {
                                                alert(flag ? "Violation Flagged & Fined" : "Job Finalized Successfully");
                                                fetchData();
                                                setSelectedPickup(null);
                                            });
                                        }} className="px-8 h-16 bg-emerald-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-500 transition-all active:scale-95 border border-white/10">
                                            Finalize Job
                                        </button>
                                    </div>
                                </div>
                            </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                             {pickups.filter(p => !['Completed', 'Pending'].includes(p.status)).length === 0 ? (
                                <div className="col-span-full py-20 bg-white/5 backdrop-blur-xl border border-dashed border-white/10 rounded-[3rem] text-center">
                                    <Truck size={48} className="mx-auto text-white/10 mb-4" />
                                    <p className="text-white/30 font-black uppercase tracking-widest text-xs">No active nodes in deployment queue</p>
                                </div>
                             ) : (
                                pickups.filter(p => !['Completed', 'Pending'].includes(p.status)).map(p => (
                                    <div key={p.id} className="bg-white/5 backdrop-blur-3xl border border-white/10 p-8 rounded-[3rem] shadow-2xl hover:border-white/20 transition-all group">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-xs font-black ring-1 ring-white/10 tracking-tighter">ID</div>
                                            <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">{p.id.slice(0,10).toUpperCase()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">{p.users?.full_name || 'Guest Citizen'}</p>
                                            <p className="text-[10px] text-white/20 font-bold leading-none">{p.users?.email}</p>
                                        </div>
                                    </div>
                                    <p className="text-lg font-black text-white tracking-widest truncate mb-1">{p.locations?.address}</p>
                                    <div className="flex items-center gap-2 mb-6">
                                        <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{p.waste_type} Waste</span>
                                        {p.flagged_reason && (
                                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-md text-[8px] font-black uppercase tracking-widest border border-red-500/20 flex items-center gap-1">
                                                <AlertTriangle size={8}/> Flagged: {p.flagged_reason}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex gap-3">
                                            <button onClick={() => setSelectedPickup(p)} className="flex-1 py-4 bg-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10 shadow-xl active:scale-95">Track Route</button>
                                            {!p.flagged_reason && (
                                                <select 
                                                    id={`flag-${p.id}`} 
                                                    className="w-1/3 p-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/50 outline-none hover:border-red-500/30 transition-all cursor-pointer appearance-none text-center"
                                                >
                                                    <option value="">Report Violation...</option>
                                                    {fineSettings.map(fs => <option key={fs.id} value={fs.violation_type} className="bg-slate-900">{fs.violation_type}</option>)}
                                                </select>
                                            )}
                                        </div>
                                        <button onClick={() => {
                                            const flag = (document.getElementById(`flag-${p.id}`) as HTMLSelectElement)?.value;
                                            axios.post(`${API_URL}/pickups/${p.id}/complete?status=Completed${flag ? `&flagged_reason=${flag}` : ''}`).then(() => {
                                                alert(flag ? "Violation Flagged Successfully" : "Job Finalized");
                                                fetchData();
                                            });
                                        }} className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-[1.01] active:scale-95 transition-all">
                                            Complete Settlement
                                        </button>
                                    </div>
                                    </div>
                                ))
                             )}
                        </div>
                    )}
                </div>
            )}
          </div>
        )}

        {view === 'settings' && (
            <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl animate-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-500/20"><SettingsIcon /></div>
                    <div>
                        <h3 className="text-2xl font-black text-white tracking-tighter">Neural Config</h3>
                        <p className="text-xs font-bold text-white/30 uppercase tracking-widest leading-none">Global Penalty Calibration</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                    {fineSettings.map(setting => (
                        <div key={setting.id} className="p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/5 group hover:border-white/10 transition-all">
                            <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">{setting.violation_type}</p>
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-3xl font-black text-white leading-none mb-1">₹{setting.amount}</p>
                                    <p className="text-[10px] text-white/20 font-bold uppercase">Current Threshold</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="number" id={`rate-${setting.id}`} className="w-24 p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-black outline-none focus:border-emerald-500/50 transition-all" placeholder="New" />
                                    <button onClick={() => {
                                        const val = (document.getElementById(`rate-${setting.id}`) as HTMLInputElement).value;
                                        if(val) {
                                            axios.post(`${API_URL}/fine-settings/update?violation_type=${setting.violation_type}&amount=${val}`).then(() => {
                                                fetchData();
                                                alert("System Recalibrated Ready");
                                            });
                                        }
                                    }} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white hover:bg-emerald-600 transition-all border border-white/10"><ChevronRight size={18} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {view === 'fines' && (
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-end">
                    <div>
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-2">Revenue Audit Log</h2>
                        <p className="text-xs text-white/30 font-bold uppercase tracking-widest">Financial Oversight Node</p>
                    </div>
                    <div className="mt-8 md:mt-0 text-right space-y-1">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-tighter">Collective Liability</p>
                        <p className="text-5xl font-black text-red-500 leading-none">₹{fines.filter(f => f.status === 'Unpaid').reduce((acc, curr) => acc + Number(curr.amount), 0)}</p>
                    </div>
                </div>

                {user.role === 'admin' ? (
                    <div className="space-y-12">
                        {/* Admin Specific Segregation */}
                        <div className="space-y-6">
                            <h4 className="text-xs font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-3">
                                <AlertTriangle size={14} className="text-red-500" /> Outstanding Penalties (Requires Recovery)
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                {fines.filter(f => f.status === 'Unpaid').map(f => (
                                    <div key={f.id} className="p-6 bg-white/5 border border-red-500/10 rounded-3xl flex items-center justify-between gap-6 hover:bg-white/10 transition-all border-l-4 border-l-red-500">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-black text-white">{f.users?.full_name}</span>
                                                <span className="text-[9px] text-white/20">| {f.users?.email}</span>
                                            </div>
                                            <p className="text-[10px] text-white/60 font-medium italic truncate max-w-[300px] mb-2">{f.pickups?.locations?.address}</p>
                                            <div className="flex items-center gap-3">
                                                <span className="px-2 py-0.5 bg-white/5 rounded text-[8px] font-black uppercase text-white/40 border border-white/5">Issued by Driver: {f.driver_name}</span>
                                                <span className="text-[8px] font-black text-red-400 uppercase">{f.reason}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-white">₹{f.amount}</p>
                                            <p className="text-[8px] text-white/20 font-black uppercase">{new Date(f.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6 opacity-80 hover:opacity-100 transition-opacity">
                            <h4 className="text-xs font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-3">
                                <CheckCircle size={14} className="text-emerald-500" /> Collected Revenue (Settled)
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                {fines.filter(f => f.status === 'Paid').map(f => (
                                    <div key={f.id} className="p-6 bg-white/5 border border-emerald-500/10 rounded-3xl flex items-center justify-between gap-6 border-l-4 border-l-emerald-500 grayscale hover:grayscale-0 transition-all">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-black text-white">{f.users?.full_name}</span>
                                                <span className="text-[9px] text-emerald-400">PAID AT: {new Date(f.paid_at).toLocaleTimeString()}</span>
                                            </div>
                                            <p className="text-[10px] text-white/40 italic truncate max-w-[300px]">{f.pickups?.locations?.address}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-emerald-400">₹{f.amount}</p>
                                            <p className="text-[8px] text-white/20 font-black uppercase">Ref: {f.id.slice(0,8)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Citizen View - Standard Fines */
                    <div className="grid grid-cols-1 gap-6">
                        {fines.filter(f => f.status === 'Unpaid').map(f => (
                            <div key={f.id} className="p-8 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-red-500/20 flex flex-col md:flex-row items-center justify-between gap-8 group hover:bg-white/10 transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[50px]" />
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-3xl flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/10"><AlertTriangle size={32} /></div>
                                    <div>
                                        <h4 className="text-xl font-black text-white tracking-widest uppercase mb-1">{f.reason}</h4>
                                        <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] leading-none">Registered Node: {f.id.slice(0,12).toUpperCase()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8 w-full md:w-auto">
                                    <div className="text-right">
                                        <p className="text-3xl font-black text-white leading-none mb-1">₹{f.amount}</p>
                                        <span className="text-[10px] bg-red-500 text-white px-3 py-1 rounded-full font-black uppercase tracking-tighter">PENDING</span>
                                    </div>
                                    <button onClick={() => axios.post(`${API_URL}/fines/${f.id}/pay`).then(() => { alert("Payment Authenticated"); fetchData(); })} className="flex-1 md:flex-none px-10 py-5 bg-white text-black rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">Complete Clearance</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
        {/* HISTORY SECTION - UNIVERSAL ACROSS ALL PANELS */}
        <div className="mt-12 bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            <h3 className="text-xl font-black text-white tracking-tighter mb-10 flex items-center gap-4">
                <History size={24} className="text-emerald-400 group-hover:rotate-[-360deg] transition-transform duration-1000" /> 
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/40">Operation Deployment History</span>
            </h3>
            
            {pickups.filter(p => p.status === 'Completed').length === 0 ? (
                <div className="text-center py-20 opacity-20 font-black uppercase tracking-widest text-[10px] bg-white/5 rounded-[2rem] border border-dashed border-white/10">No historical nodes discovered...</div>
            ) : (
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs font-bold text-white/50 border-separate border-spacing-y-3">
                        <thead className="uppercase tracking-[0.3em] text-[9px]">
                            <tr>
                                <th className="px-6 pb-2 opacity-30">Deployment ID</th>
                                <th className="px-6 pb-2 opacity-30">Location Node</th>
                                <th className="px-6 pb-2 opacity-30">Status</th>
                                <th className="px-6 pb-2 opacity-30">Flagged Violation</th>
                                <th className="px-6 pb-2 opacity-30">Environmental Link</th>
                            </tr>
                        </thead>
                        <tbody className="mt-4">
                                {pickups.filter(p => p.status === 'Completed').sort((a,b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime()).map(p => (
                                <tr key={p.id} className="group/row bg-white/5 hover:bg-white/10 transition-all cursor-default">
                                    <td className="py-6 px-6 font-black text-white/80 rounded-l-[1.5rem] ring-1 ring-inset ring-white/5">{p.id.slice(0,8).toUpperCase()}</td>
                                    <td className="py-6 px-6 truncate max-w-[250px] font-medium italic">{p.locations?.address}</td>
                                    <td className="py-6 px-6"><span className="text-[10px] px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full font-black border border-emerald-500/20">RESOLVED</span></td>
                                    <td className="py-6 px-6">
                                        {p.flagged_reason ? (
                                            <span className="text-[10px] text-red-400 px-3 py-1 bg-red-400/10 rounded-full border border-red-400/20 flex items-center gap-2">
                                                <AlertTriangle size={10}/> {p.flagged_reason}
                                            </span>
                                        ) : (
                                            <span className="opacity-20 flex items-center gap-2"><CheckCircle size={10}/> Verified Clean</span>
                                        )}
                                    </td>
                                    <td className="py-6 px-6 font-black text-white/60 rounded-r-[1.5rem] ring-1 ring-inset ring-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-[8px] text-blue-400">{p.citizen?.full_name?.[0]}</div>
                                                <div className="text-left">
                                                    <p className="text-[6px] uppercase text-white/20 leading-none">Citizen</p>
                                                    <p className="text-[9px] text-white/80 truncate max-w-[60px]">{p.citizen?.full_name}</p>
                                                </div>
                                            </div>
                                            <div className="w-[1px] h-6 bg-white/10" />
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center text-[8px] text-emerald-400">{p.collector?.full_name?.[0]}</div>
                                                <div className="text-left">
                                                    <p className="text-[6px] uppercase text-white/20 leading-none">Driver</p>
                                                    <p className="text-[9px] text-white/80 truncate max-w-[60px]">{p.collector?.full_name || 'System'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`group relative w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all overflow-hidden ${active ? 'bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40 border border-emerald-400/50' : 'text-white/30 hover:text-white/80 hover:bg-white/5 border border-transparent hover:border-white/5'}`}>
      <div className={`transition-transform duration-500 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</div>
      <span className="relative z-10">{label}</span>
      {active && <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]" />}
    </button>
  );
}

function GlassStatCard({ label, value, icon, tint }: { label: string, value: any, icon: any, tint: string }) {
  const tints: any = { 
    blue: 'border-blue-500/30 text-blue-400 bg-blue-500/5 shadow-blue-500/5', 
    emerald: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 shadow-emerald-500/5', 
    red: 'border-red-500/30 text-red-400 bg-red-500/5 shadow-red-500/5' 
  };
  return (
    <div className={`p-8 backdrop-blur-3xl border rounded-[2.5rem] shadow-2xl transition-all hover:scale-[1.02] relative overflow-hidden group ${tints[tint]}`}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity translate-x-1/4 -translate-y-1/4 rotate-12 scale-[3] pointer-events-none">
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-3">{label}</p>
      <p className="text-4xl font-black text-white tracking-widest">{value}</p>
    </div>
  );
}

function CollectorActionBtn({ onClick, label, icon, color }: { onClick: any, label: string, icon: any, color: string }) {
    return (
        <button onClick={onClick} className={`flex-1 group relative h-20 bg-gradient-to-r ${color} rounded-[1.8rem] flex items-center justify-center gap-3 overflow-hidden shadow-2xl hover:scale-[1.02] active:scale-95 transition-all`}>
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 italic skew-x-12 opacity-0 group-hover:opacity-100" />
            <div className="transition-transform group-hover:scale-125 duration-500">{icon}</div>
            <span className="font-black text-xs uppercase tracking-widest relative z-10 text-white">{label}</span>
        </button>
    );
}
