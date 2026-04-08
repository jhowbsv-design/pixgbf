import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { logOut, db, auth, handleFirestoreError, OperationType, signInWithCustomToken } from './firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, setDoc, doc, where, Timestamp, deleteDoc } from 'firebase/firestore';
import { PixRecord, Bank, PixStatus, UserProfile, AuditLog, Draw, Empresa, TVState, BusinessGroup } from './types';
import { format, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Tv,
  Monitor,
  Sparkles,
  LayoutDashboard, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  History, 
  Settings, 
  Printer, 
  LogOut, 
  Search, 
  Filter, 
  Download, 
  Trophy, 
  AlertCircle,
  Banknote,
  Users,
  FileText,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  ShieldAlert,
  Gift,
  Building2,
  Clock,
  TrendingUp,
  User,
  Calendar,
  Lock,
  UserCircle,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';

// --- COMPONENTS ---

const RealTimeClock = ({ className }: { className?: string }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Clock size={14} />
      <span className="capitalize">
        {format(time, "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR })}
      </span>
    </div>
  );
};

const Button = ({ className, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' }) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-50',
    ghost: 'bg-transparent hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
  };
  return (
    <button 
      className={cn('px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2', variants[variant], className)} 
      {...props} 
    />
  );
};

const Input = ({ className, label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input 
      className={cn('w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all', error ? 'border-red-500' : 'border-gray-300', className)} 
      {...props} 
    />
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
);

const Select = ({ className, label, options, error, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, options: { value: string, label: string }[], error?: string }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <select 
      className={cn('w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white', error ? 'border-red-500' : 'border-gray-300', className)} 
      {...props}
    >
      <option value="">Selecione...</option>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
);

const Card = ({ children, className, title, subtitle, onClick }: { children: React.ReactNode, className?: string, title?: string, subtitle?: string, onClick?: () => void }) => (
  <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden', className)} onClick={onClick}>
    {(title || subtitle) && (
      <div className="px-6 py-4 border-bottom border-gray-100">
        {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };
  return <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant])}>{children}</span>;
};

// --- PRINT COMPONENT ---

const ThermalPrint = React.forwardRef<HTMLDivElement, { record: PixRecord, bankName: string }>(({ record, bankName }, ref) => (
  <div ref={ref} className="p-4 bg-white text-black font-mono text-[10px] leading-tight w-[58mm] mx-auto uppercase">
    <div className="text-center font-bold mb-2 border-b border-dashed border-black pb-1">GBF SMARTPIX</div>
    <div className="flex justify-between mb-1">
      <span>PIX R$: {record.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      <span>DATA: {format(parseISO(record.data_pix), 'dd/MM/yyyy')}</span>
    </div>
    <div className="mb-1">CLIENTE: {record.cliente}</div>
    <div className="mb-1">DEPOSITANTE: {record.depositante}</div>
    <div className="flex justify-between mb-1">
      <span>PROMOTOR: {record.promotor}</span>
      <span>EMPRESA: {record.empresa}</span>
    </div>
    <div className="mt-2 pt-2 border-t border-dashed border-black">
      <div className="mb-1">CONF R$: {record.status === 'confirmed' || record.status === 'launched' ? record.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '____'}</div>
      <div className="mb-1">DATA: {record.confirmed_at ? format(parseISO(record.confirmed_at), 'dd/MM/yyyy') : '____'}</div>
      <div className="flex justify-between items-end mt-2">
        <div className="flex flex-col gap-1">
          <span>ASS: __________</span>
          <span>BANCO: {bankName}</span>
        </div>
      </div>
    </div>
    <div className="text-[8px] text-center mt-4 opacity-50">COMPROVANTE NÃO FISCAL</div>
  </div>
));

import { Toaster, toast } from 'sonner';

const maskCPF = (cpf?: string) => {
  if (!cpf) return '***.xxx.xxx-**';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `${clean.substring(0, 3)}.xxx.xxx-${clean.substring(9)}`;
};

const TVView = ({ state }: { state: TVState | null }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayStatus, setDisplayStatus] = useState<'idle' | 'drawing' | 'result'>('idle');
  const [rollingName, setRollingName] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!state) return;
    
    if (state.status === 'drawing') {
      setDisplayStatus('drawing');
      let count = 0;
      const interval = setInterval(() => {
        if (state.participantsNames && state.participantsNames.length > 0) {
          setRollingName(state.participantsNames[count % state.participantsNames.length]);
          count++;
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        setDisplayStatus('result');
      }, 8000); // 8 seconds of suspense

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } else {
      setDisplayStatus(state.status);
    }
  }, [state?.status, state?.timestamp]);

  return (
    <div className="fixed inset-0 bg-[#050505] text-white overflow-hidden font-sans select-none">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-20 md:h-24 px-6 md:px-12 flex items-center justify-between border-b border-white/5 backdrop-blur-md z-50">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg shadow-blue-500/20">GBF</div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">SmartPix</h1>
            <p className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold">Premium Live Panel</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg md:text-xl font-medium">{format(currentTime, "HH:mm:ss")}</p>
          <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest">{format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="h-full flex flex-col items-center justify-center p-6 md:p-12">
        <AnimatePresence mode="wait">
          {displayStatus === 'idle' && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="text-center px-4"
            >
              <div className="w-24 h-24 md:w-32 md:h-32 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 border border-white/10">
                <Monitor size={48} className="text-blue-500 md:hidden" />
                <Monitor size={64} className="text-blue-500 hidden md:block" />
              </div>
              <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">Aguardando Sorteio</h2>
              <p className="text-lg md:text-xl text-white/40 max-w-lg mx-auto leading-relaxed">
                O painel está conectado e pronto para exibir o próximo sorteio em tempo real.
              </p>
            </motion.div>
          )}

          {displayStatus === 'drawing' && (
            <motion.div 
              key="drawing"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center w-full max-w-4xl px-4"
            >
              <Sparkles className="text-yellow-400 mx-auto mb-6 md:mb-8 animate-bounce" size={60} />
              <h2 className="text-xl md:text-3xl font-bold text-blue-400 uppercase tracking-[0.3em] md:tracking-[0.5em] mb-8 md:mb-12">Sorteando Agora</h2>
              
              <div className="relative h-32 md:h-48 flex items-center justify-center overflow-hidden">
                <motion.div 
                  key={rollingName}
                  initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter text-white truncate w-full"
                >
                  {rollingName}
                </motion.div>
              </div>
              
              <div className="mt-8 md:mt-12 flex justify-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <motion.div 
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="w-2 h-2 md:w-3 md:h-3 bg-blue-500 rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          )}

          {displayStatus === 'result' && state?.winners && state.winners[0] && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center w-full max-w-6xl px-4"
            >
              <div className="mb-4 md:mb-6 inline-flex items-center gap-2 md:gap-3 px-4 md:px-6 py-1.5 md:py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-500 font-bold text-xs md:text-sm uppercase tracking-widest">
                <Trophy size={16} className="md:w-[18px] md:h-[18px]" />
                Parabéns ao Ganhador
              </div>
              
              <h2 className="text-5xl sm:text-7xl md:text-9xl lg:text-[10rem] xl:text-[12rem] font-black leading-none tracking-tighter mb-6 md:mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 break-words">
                {state.winners[0].cliente}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mt-8 md:mt-12">
                <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-2xl md:rounded-3xl backdrop-blur-xl">
                  <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest mb-1 md:mb-2 font-bold">CPF</p>
                  <p className="text-2xl md:text-4xl font-black">{maskCPF(state.winners[0].cpf_cliente)}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-2xl md:rounded-3xl backdrop-blur-xl">
                  <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest mb-1 md:mb-2 font-bold">Empresa</p>
                  <p className="text-2xl md:text-4xl font-black">{state.winners[0].empresa}</p>
                </div>
              </div>

              <div className="mt-10 md:mt-16 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 opacity-60">
                <div className="flex flex-col items-center">
                  <p className="text-[8px] md:text-[10px] uppercase font-bold tracking-widest">Promotor</p>
                  <p className="text-base md:text-lg font-bold">{state.winners[0].promotor}</p>
                </div>
                <div className="hidden md:block w-px h-8 bg-white/20" />
                <div className="flex flex-col items-center">
                  <p className="text-[8px] md:text-[10px] uppercase font-bold tracking-widest">Data do Pix</p>
                  <p className="text-base md:text-lg font-bold">{format(parseISO(state.winners[0].data_pix), 'dd/MM/yyyy')}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Branding */}
      <div className="absolute bottom-6 md:bottom-12 left-0 right-0 text-center opacity-20 px-4">
        <p className="text-[8px] md:text-xs font-bold tracking-[0.5em] md:tracking-[1em] uppercase">GBF SmartPix • Professional Management System</p>
      </div>
    </div>
  );
};

// --- MAIN APP ---

function AppContent() {
  const { user, profile, loading, isAdmin, isPromoter, isCashier } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'pix' | 'banks' | 'users' | 'reports' | 'draws' | 'hist_draws' | 'logs' | 'empresas' | 'cadastrar_pix' | 'tv'>('home');
  const [pixFilterStatus, setPixFilterStatus] = useState<PixStatus | ''>('');
  const [pixRecords, setPixRecords] = useState<PixRecord[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [businessGroups, setBusinessGroups] = useState<BusinessGroup[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'custom' | 'register'>('custom');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [tvState, setTvState] = useState<TVState | null>(null);
  const [printingRecord, setPrintingRecord] = useState<PixRecord | null>(null);
  const printRef = React.useRef<HTMLDivElement>(null);
  const appStartTime = React.useRef(new Date().toISOString());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'tv') {
      setActiveTab('tv');
    }
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Comprovante PIX',
  });

  useEffect(() => {
    if (!user || !profile || !profile.active) return;

    // Build Pix Records Query based on role
    let pixQuery;
    if (isAdmin) {
      pixQuery = query(collection(db, 'pix_records'), orderBy('created_at', 'desc'));
    } else if (isPromoter) {
      pixQuery = query(collection(db, 'pix_records'), where('promotor_id', '==', user.uid), orderBy('created_at', 'desc'));
    } else if (isCashier && profile.empresa_id) {
      pixQuery = query(
        collection(db, 'pix_records'), 
        where('empresa_id', '==', profile.empresa_id),
        where('status', 'in', ['confirmed', 'launched']),
        orderBy('created_at', 'desc')
      );
    }

    let unsubPix = () => {};
    if (pixQuery) {
      unsubPix = onSnapshot(pixQuery, (snap) => {
        const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PixRecord));
        
        // Notification logic for admins
        if (isAdmin) {
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const newRecord = change.doc.data() as PixRecord;
              // Only notify if it's pending and created AFTER the app started
              if (newRecord.status === 'pending' && newRecord.created_at > appStartTime.current) {
                toast.info(`Novo PIX Pendente: R$ ${newRecord.valor.toLocaleString('pt-BR')}`, {
                  description: `Cliente: ${newRecord.cliente}`,
                  action: {
                    label: 'Ver Agora',
                    onClick: () => setActiveTab('pix')
                  },
                  duration: 5000,
                });
              }
            }
          });
        }
        
        setPixRecords(records);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'pix_records'));
    }

    // Banks Query
    let banksQuery;
    if (isAdmin) {
      banksQuery = query(collection(db, 'banks'));
    } else if (profile.empresa_id) {
      banksQuery = query(collection(db, 'banks'), where('empresa_id', '==', profile.empresa_id));
    }

    let unsubBanks = () => {};
    if (banksQuery) {
      unsubBanks = onSnapshot(banksQuery, (snap) => {
        setBanks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bank)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'banks'));
    }

    const unsubTv = onSnapshot(doc(db, 'settings', 'tv_state'), (snap) => {
      if (snap.exists()) {
        setTvState({ id: snap.id, ...snap.data() } as TVState);
      }
    });

    let unsubUsers, unsubLogs, unsubDraws, unsubEmpresas, unsubBusinessGroups;

    if (isAdmin) {
      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        setUsers(snap.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
      unsubLogs = onSnapshot(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc')), (snap) => {
        setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'audit_logs'));
      unsubDraws = onSnapshot(query(collection(db, 'draws'), orderBy('timestamp', 'desc')), (snap) => {
        setDraws(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Draw)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'draws'));
      unsubEmpresas = onSnapshot(collection(db, 'empresas'), (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Empresa));
        console.log("Empresas fetched:", data.length);
        setEmpresas(data);
      }, (error) => {
        console.error("Error fetching empresas:", error);
        handleFirestoreError(error, OperationType.LIST, 'empresas');
      });
      unsubBusinessGroups = onSnapshot(collection(db, 'business_groups'), (snap) => {
        setBusinessGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BusinessGroup)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'business_groups'));
    }

    return () => { 
      unsubPix(); 
      unsubBanks(); 
      unsubTv(); 
      if (unsubUsers) unsubUsers();
      if (unsubLogs) unsubLogs();
      if (unsubDraws) unsubDraws();
      if (unsubEmpresas) unsubEmpresas();
      if (unsubBusinessGroups) unsubBusinessGroups();
    };
  }, [user, profile, isAdmin, isPromoter, isCashier]);

  const logAction = async (action: string, details: string) => {
    if (!user) return;
    await addDoc(collection(db, 'audit_logs'), {
      userId: user.uid,
      userEmail: user.email,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Carregando GBF SmartPix...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const handleCustomLogin = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setLoginLoading(true);
      const formData = new FormData(e.currentTarget);
      const username = formData.get('username') as string;
      const password = formData.get('senha') as string;

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario: username, senha: password })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao fazer login');

        await signInWithCustomToken(auth, data.token);
        toast.success('Login realizado com sucesso!');
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoginLoading(false);
      }
    };

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setRegisterLoading(true);
      const formData = new FormData(e.currentTarget);
      const nome = formData.get('nome') as string;
      const usuario = formData.get('usuario') as string;
      const senha = formData.get('senha') as string;
      const tipo = formData.get('tipo') as string;
      const empresa_id = formData.get('empresa_id') as string;

      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, usuario, senha, tipo, empresa_id })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao realizar cadastro');

        toast.success(data.message || 'Cadastro realizado com sucesso!');
        setLoginMode('custom');
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setRegisterLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 text-center flex flex-col gap-6 shadow-xl border-t-4 border-t-blue-600">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Banknote size={40} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">GBF SmartPix</h1>
              <p className="text-gray-500 mt-1 font-medium">Sistema Profissional de Gestão de PIX</p>
            </div>
             <button
                onClick={() => setLoginMode('custom')}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                  (loginMode === 'custom' || loginMode === 'register') ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Login Interno
              </button>
            </div>
              <form onSubmit={handleRegister} className="space-y-4 text-left">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <UserCircle size={16} /> Nome Completo
                  </label>
                  <input
                    name="username"
                    type="text"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <UserCircle size={16} /> Usuário
                  </label> 
                    <input
                    // alterei aqui
                    name="username" 
                    type="text"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Escolha um usuário"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Lock size={16} /> Senha
                  </label>
                  <input
                  // alterei aqui
                    name="password"
                    type="password"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Crie uma senha"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <ShieldCheck size={16} /> Tipo de Acesso
                  </label>
                  <select
                    name="tipo"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                  >
                    <option value="promoter">Promotor</option>
                    <option value="cashier">Caixa</option>
                  </select>
                </div>
                <Button type="submit" disabled={registerLoading} className="w-full h-12 text-lg">
                  {registerLoading ? "Cadastrando..." : "Realizar Cadastro"}
                </Button>
                <div className="text-center">
                  <button 
                    type="button"
                    onClick={() => setLoginMode('custom')}
                    className="text-sm text-blue-600 hover:underline font-medium"
                  >
                    Já tem uma conta? Faça login
                  </button>
                </div>
              </form>
            )}
            
            <div className="pt-4 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">© 2026 GBF SmartPix • V 2.5.0</p>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (profile && !profile.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-8 text-center flex flex-col gap-6">
          <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Aguardando Aprovação</h1>
            <p className="text-gray-500 mt-2">Olá, <span className="font-bold text-blue-600">{profile.displayName}</span>!</p>
            <p className="text-gray-500 mt-1">Seu acesso foi registrado e está aguardando a aprovação de um administrador.</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl text-left">
            <p className="text-xs text-blue-800 leading-relaxed">
              O administrador irá conferir seus dados, definir seu nível de acesso (Caixa, Promotor ou ADM) e vincular sua conta à empresa correspondente.
            </p>
          </div>
          <Button variant="outline" onClick={() => auth.signOut()} className="w-full">
            Sair da Conta
          </Button>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">GBF SmartPix • Segurança e Controle</p>
        </Card>
      </div>
    );
  }

  const NavItem = ({ tab, icon: Icon, label, badge }: { tab: typeof activeTab, icon: any, label: string, badge?: number }) => (
    <button
      onClick={() => { setActiveTab(tab); setPixFilterStatus(''); }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium relative whitespace-nowrap',
        activeTab === tab 
          ? 'bg-blue-50 text-blue-600' 
          : 'text-gray-600 hover:bg-gray-100'
      )}
    >
      <Icon size={18} />
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ml-1">
          {badge}
        </span>
      )}
    </button>
  );

  const pendingCount = pixRecords.filter(r => r.status === 'pending').length;

  if (activeTab as string === 'tv') {
    return <TVView state={tvState} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setActiveTab('home')}>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">GBF</div>
              <span className="font-bold text-gray-900 hidden sm:inline">SmartPix</span>
            </div>
            
            <nav className="hidden lg:flex items-center gap-1">
              <NavItem tab="dashboard" icon={LayoutDashboard} label="Dashboard" />
              {(isAdmin || isPromoter) && <NavItem tab="cadastrar_pix" icon={PlusCircle} label="Cadastrar Pix" />}
              {(isAdmin || isCashier) && <NavItem tab="pix" icon={ShieldCheck} label="Conferência" badge={(isAdmin || isCashier) ? pendingCount : undefined} />}
              {(isAdmin || isCashier || isPromoter) && <NavItem tab="reports" icon={FileText} label="Relatórios" />}
              {isAdmin && <NavItem tab="draws" icon={Gift} label="Sorteio" />}
              {isAdmin && <NavItem tab="hist_draws" icon={Trophy} label="Hist. Sorteios" />}
              {isAdmin && <NavItem tab="users" icon={Users} label="Usuários" />}
              {isAdmin && <NavItem tab="banks" icon={Settings} label="Bancos" />}
              {isAdmin && <NavItem tab="empresas" icon={Building2} label="Empresas" />}
            </nav>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium text-gray-900">{profile?.displayName}</span>
              <button onClick={() => auth.signOut()} className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1">
                <LogOut size={12} /> Sair
              </button>
            </div>
            <button className="lg:hidden p-2 text-gray-600" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-72 bg-white z-[70] shadow-2xl p-6 flex flex-col gap-6 lg:hidden"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">Menu</span>
                <button onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
              </div>
              <nav className="flex flex-col gap-2">
                <NavItem tab="dashboard" icon={LayoutDashboard} label="Dashboard" />
                {(isAdmin || isPromoter) && <NavItem tab="cadastrar_pix" icon={PlusCircle} label="Cadastrar Pix" />}
                {(isAdmin || isCashier) && <NavItem tab="pix" icon={ShieldCheck} label="Conferência" badge={(isAdmin || isCashier) ? pendingCount : undefined} />}
                {(isAdmin || isCashier || isPromoter) && <NavItem tab="reports" icon={FileText} label="Relatórios" />}
                {isAdmin && <NavItem tab="draws" icon={Gift} label="Sorteio" />}
                {isAdmin && <NavItem tab="hist_draws" icon={Trophy} label="Hist. Sorteios" />}
                {isAdmin && <NavItem tab="users" icon={Users} label="Usuários" />}
                {isAdmin && <NavItem tab="banks" icon={Settings} label="Bancos" />}
                {isAdmin && <NavItem tab="empresas" icon={Building2} label="Empresas" />}
              </nav>
              <div className="mt-auto pt-6 border-t border-gray-100">
                <button onClick={() => auth.signOut()} className="flex items-center gap-3 text-red-600 font-medium px-4 py-3 rounded-xl hover:bg-red-50 w-full transition-colors">
                  <LogOut size={20} /> Sair
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <HomeView 
              key="home"
              profile={profile} 
              pendingCount={pendingCount} 
              onNavigate={setActiveTab} 
            />
          )}
          {activeTab === 'dashboard' && (
            <DashboardView 
              key="dashboard"
              pixRecords={pixRecords} 
              banks={banks} 
              users={users}
              onNavigate={(tab, status) => {
                setActiveTab(tab);
                if (status !== undefined) setPixFilterStatus(status);
                else setPixFilterStatus('');
              }}
            />
          )}
          {activeTab === 'cadastrar_pix' && (
            <CadastrarPixView 
              key="cadastrar_pix"
              banks={banks} 
              empresas={empresas}
              profile={profile}
              onSuccess={() => setActiveTab('dashboard')}
            />
          )}
          {activeTab === 'pix' && (
            <PixRecordsView 
              key="pix"
              pixRecords={pixRecords} 
              banks={banks} 
              onPrint={(record) => { 
                setPrintingRecord(record); 
                setTimeout(() => {
                  console.log("Triggering print for record:", record.id);
                  handlePrint();
                }, 300); 
              }} 
              initialStatus={pixFilterStatus}
            />
          )}
          {activeTab === 'reports' && <ReportsView key="reports" pixRecords={pixRecords} users={users} empresas={empresas} banks={banks} />}
          {activeTab === 'draws' && <DrawsView key="draws" pixRecords={pixRecords} draws={draws} onLog={logAction} />}
          {activeTab === 'hist_draws' && <HistDrawsView key="hist_draws" draws={draws} />}
          {activeTab === 'users' && <UsersView key="users" users={users} empresas={empresas} onLog={logAction} />}
          {activeTab === 'empresas' && <EmpresasView key="empresas" empresas={empresas} businessGroups={businessGroups} onLog={logAction} />}
          {activeTab === 'banks' && <BanksView key="banks" banks={banks} onLog={logAction} />}
          {activeTab === 'logs' && <LogsView key="logs" logs={logs} />}
        </AnimatePresence>
      </main>

      {/* Hidden Print Area */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        {printingRecord && (
          <ThermalPrint 
            ref={printRef} 
            record={printingRecord} 
            bankName={banks.find(b => b.id === printingRecord.banco_id)?.name || 'N/A'} 
          />
        )}
      </div>
    </div>
  );
}

// --- VIEW COMPONENTS ---

const HomeView = ({ profile, pendingCount, onNavigate }: { profile: UserProfile | null, pendingCount: number, onNavigate: (tab: any) => void }) => {
  const { isAdmin, isPromoter, isCashier } = useAuth();
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto flex flex-col items-center gap-8 py-12"
    >
      <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-2xl shadow-blue-200">
        GBF
      </div>
      
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Olá, {profile?.displayName}</h1>
        <p className="text-gray-500 mt-1 capitalize">{profile?.role}</p>
        <RealTimeClock className="justify-center text-sm text-gray-400 mt-2" />
      </div>

      {(isAdmin || isCashier) && pendingCount > 0 && (
        <button 
          onClick={() => onNavigate('pix')}
          className="w-full bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between group hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
              <AlertCircle size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-blue-900">{pendingCount} Pix pendentes de conferência</p>
              <p className="text-sm text-blue-600">Clique para conferir</p>
            </div>
          </div>
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
            {pendingCount}
          </div>
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <HomeButton icon={LayoutDashboard} label="Dashboard" color="blue" onClick={() => onNavigate('dashboard')} />
        {(isAdmin || isPromoter) && <HomeButton icon={PlusCircle} label="Cadastrar Pix" color="green" onClick={() => onNavigate('cadastrar_pix')} />}
        {(isAdmin || isCashier) && <HomeButton icon={ShieldCheck} label="Conferência Pix" color="orange" onClick={() => onNavigate('pix')} />}
        {(isAdmin || isCashier || isPromoter) && <HomeButton icon={FileText} label="Relatórios" color="slate" onClick={() => onNavigate('reports')} />}
        {isAdmin && <HomeButton icon={Gift} label="Sorteio" color="purple" onClick={() => onNavigate('draws')} />}
        {isAdmin && <HomeButton icon={Building2} label="Empresas" color="indigo" onClick={() => onNavigate('empresas')} />}
        {isAdmin && <HomeButton icon={Settings} label="Bancos" color="orange" onClick={() => onNavigate('banks')} />}
      </div>
    </motion.div>
  );
};

const HomeButton = ({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) => {
  const colors: any = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    orange: 'bg-orange-600',
    slate: 'bg-slate-700',
    purple: 'bg-purple-600',
    indigo: 'bg-indigo-600',
  };
  return (
    <button 
      onClick={onClick}
      className="w-full bg-white border border-gray-100 rounded-2xl p-6 flex items-center gap-6 shadow-sm hover:shadow-md transition-all group"
    >
      <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0', colors[color])}>
        <Icon size={28} />
      </div>
      <span className="text-xl font-bold text-gray-700 group-hover:text-gray-900">{label}</span>
    </button>
  );
};

const CadastrarPixView = ({ banks, empresas, profile, onSuccess }: { banks: Bank[], empresas: Empresa[], profile: UserProfile | null, onSuccess: () => void }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const empresaId = formData.get('empresa_id') as string || profile?.empresa_id || '';
    const selectedEmpresa = empresas.find(e => e.id === empresaId);
    
    const data = {
      valor: Number(formData.get('valor')),
      data_pix: formData.get('data_pix') as string,
      cliente: formData.get('cliente') as string,
      depositante: formData.get('depositante') as string,
      promotor: profile?.displayName || '',
      promotor_id: profile?.uid || '',
      empresa: selectedEmpresa?.name || selectedEmpresa?.nome || profile?.company || '',
      empresa_id: empresaId,
      cpf_cliente: formData.get('cpf_cliente') as string,
      banco_id: formData.get('banco_id') as string,
      observacoes: formData.get('observacoes') as string,
      status: 'pending' as PixStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'pix_records'), data);
      toast.success('PIX cadastrado com sucesso!');
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'pix_records');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
      <Card className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
            <PlusCircle size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Cadastrar Novo Pix</h2>
            <p className="text-gray-500">Preencha os dados da transação</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">Valor (R$)</label>
            <input name="valor" type="number" step="0.01" required className="h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all" placeholder="0,00" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">Data do Pix</label>
            <input name="data_pix" type="datetime-local" required className="h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all" defaultValue={new Date().toISOString().slice(0, 16)} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">Cliente (Nome Completo)</label>
            <input name="cliente" type="text" required className="h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all" placeholder="Nome do cliente" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">Depositante (Nome no Comprovante)</label>
            <input name="depositante" type="text" required className="h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all" placeholder="Nome do depositante" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">CPF do Cliente</label>
            <input name="cpf_cliente" type="text" className="h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all" placeholder="000.000.000-00" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">Banco de Recebimento</label>
            <select name="banco_id" required className="h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all bg-white">
              <option value="">Selecione o banco</option>
              {banks.filter(b => b.active).map(bank => (
                <option key={bank.id} value={bank.id}>{bank.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-bold text-gray-700">Empresa</label>
            <select name="empresa_id" className="h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all bg-white">
              <option value="">Selecione a empresa (opcional)</option>
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name || emp.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-bold text-gray-700">Observações</label>
            <textarea name="observacoes" rows={3} className="p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none" placeholder="Informações adicionais..."></textarea>
          </div>
          
          <div className="md:col-span-2 flex gap-4 mt-4">
            <Button type="button" variant="ghost" onClick={() => onSuccess()} className="flex-1 h-12">Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1 h-12">
              {loading ? 'Salvando...' : 'Confirmar Cadastro'}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
};

const DashboardView = ({ pixRecords, banks, users, onNavigate }: { pixRecords: PixRecord[], banks: Bank[], users: UserProfile[], onNavigate: (tab: any, status?: PixStatus | '') => void }) => {
  const { profile, isPromoter } = useAuth();
  
  const filteredRecords = isPromoter 
    ? pixRecords.filter(r => r.promotor === profile?.displayName)
    : pixRecords;

  const pending = filteredRecords.filter(r => r.status === 'pending').length;
  const confirmed = filteredRecords.filter(r => r.status === 'confirmed' || r.status === 'launched').length;
  const activePromoters = users.filter(u => u.role === 'promoter' && u.active).length;
  const totalValue = filteredRecords
    .filter(r => r.status === 'confirmed' || r.status === 'launched')
    .reduce((acc, curr) => acc + curr.valor, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{isPromoter ? 'Meu Desempenho' : 'Dashboard Administrativo'}</h2>
        <RealTimeClock className="text-sm text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-100" />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Pix Pendentes" 
          value={pending} 
          icon={Clock} 
          color="yellow" 
          onClick={() => onNavigate('pix', 'pending')}
          className="cursor-pointer hover:border-yellow-200 transition-colors"
        />
        <StatCard 
          title="Pix Confirmados" 
          value={confirmed} 
          icon={CheckCircle2} 
          color="green" 
          onClick={() => onNavigate('pix', 'confirmed')}
          className="cursor-pointer hover:border-green-200 transition-colors"
        />
        {!isPromoter && (
          <StatCard 
            title="Promotores Ativos" 
            value={activePromoters} 
            icon={Users} 
            color="blue" 
            onClick={() => onNavigate('users')}
            className="cursor-pointer hover:border-blue-200 transition-colors"
          />
        )}
        <StatCard title={isPromoter ? "Meu Total" : "Total Geral"} value={`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={TrendingUp} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">{isPromoter ? 'Meus Últimos Pix' : 'Últimos Pix Cadastrados'}</h3>
            <button onClick={() => onNavigate('pix')} className="text-sm text-blue-600 font-medium hover:underline">Ver todos</button>
          </div>
          <div className="flex flex-col gap-4">
            {filteredRecords.slice(0, 5).map(record => {
              const bank = banks.find(b => b.id === record.banco_id);
              return (
                <PixCard 
                  key={record.id} 
                  record={record} 
                  bankName={bank?.name} 
                  bankLogoUrl={bank?.logoUrl}
                />
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-gray-900">Bancos Ativos</h3>
          <div className="flex flex-col gap-4">
            {banks.filter(b => b.active).map(bank => (
              <div key={bank.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold overflow-hidden border border-gray-100 shrink-0">
                    {bank.logoUrl ? (
                      <img src={bank.logoUrl} alt={bank.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      bank.code || '??'
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{bank.name}</span>
                    <span className="text-xs text-gray-500">{bank.pixKey}</span>
                  </div>
                </div>
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                  <ChevronRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const PixCard = ({ record, bankName, bankLogoUrl }: { record: PixRecord, bankName?: string, bankLogoUrl?: string }) => {
  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden",
            record.status === 'confirmed' ? "bg-green-100 text-green-600" : 
            record.status === 'pending' ? "bg-yellow-100 text-yellow-600" : 
            record.status === 'cancelled' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
          )}>
            {bankLogoUrl ? (
              <img src={bankLogoUrl} alt={bankName} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <Banknote size={24} />
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <h4 className="font-bold text-gray-900">{record.cliente}</h4>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><User size={12} /> {record.depositante}</span>
              <span className="flex items-center gap-1"><Calendar size={12} /> {format(parseISO(record.data_pix), 'dd/MM HH:mm')}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{record.empresa}</span>
              <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                {bankLogoUrl && <img src={bankLogoUrl} alt="" className="w-3 h-3 object-contain" referrerPolicy="no-referrer" />}
                <span className="text-[10px] font-medium">{bankName}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold text-gray-900">R$ {record.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            {record.old_valor && (
              <span className="text-xs text-red-400 line-through">R$ {record.old_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            )}
          </div>
          <Badge variant={record.status === 'confirmed' ? 'success' : record.status === 'pending' ? 'warning' : record.status === 'cancelled' ? 'danger' : 'info'}>
            {record.status === 'confirmed' ? 'Confirmado' : record.status === 'pending' ? 'Pendente' : record.status === 'cancelled' ? 'Cancelado' : 'Lançado'}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

const StatCard = ({ title, value, icon: Icon, color, onClick, className }: { title: string, value: string | number, icon: any, color: string, onClick?: () => void, className?: string }) => {
  const colors: any = {
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
  };
  return (
    <Card className={cn("p-6 flex flex-col gap-4", className)} onClick={onClick}>
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colors[color])}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-400 mt-1">{title}</p>
      </div>
    </Card>
  );
};

const PixRecordsView = ({ pixRecords, banks, onPrint, initialStatus }: { pixRecords: PixRecord[], banks: Bank[], onPrint: (record: PixRecord) => void, initialStatus?: PixStatus | '' }) => {
  const { profile, isAdmin, isPromoter, isCashier } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<PixStatus | ''>(initialStatus || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [promoterFilter, setPromoterFilter] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [cancellingRecord, setCancellingRecord] = useState<PixRecord | null>(null);
  const [correctingRecord, setCorrectingRecord] = useState<PixRecord | null>(null);
  const [launchingRecord, setLaunchingRecord] = useState<PixRecord | null>(null);
  const [justification, setJustification] = useState('');
  const [launchJustification, setLaunchJustification] = useState('');
  const [editedClientName, setEditedClientName] = useState('');
  const [newValor, setNewValor] = useState<number>(0);
  const [newCliente, setNewCliente] = useState('');
  const [newDepositante, setNewDepositante] = useState('');
  const [newDataPix, setNewDataPix] = useState('');
  const [newCpfCliente, setNewCpfCliente] = useState('');
  const [viewingRecord, setViewingRecord] = useState<PixRecord | null>(null);

  useEffect(() => {
    if (cancellingRecord) {
      setJustification('');
    }
  }, [cancellingRecord]);

  useEffect(() => {
    if (correctingRecord) {
      setNewValor(correctingRecord.valor);
      setNewCliente(correctingRecord.cliente);
      setNewDepositante(correctingRecord.depositante);
      setNewDataPix(correctingRecord.data_pix);
      setNewCpfCliente(correctingRecord.cpf_cliente || '');
    } else {
      setNewValor(0);
      setNewCliente('');
      setNewDepositante('');
      setNewDataPix('');
      setNewCpfCliente('');
    }
  }, [correctingRecord]);

  const filteredRecords = pixRecords.filter(r => {
    const matchesSearch = r.cliente.toLowerCase().includes(filter.toLowerCase()) || r.depositante.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter ? r.status === statusFilter : true;
    const matchesPromoter = promoterFilter ? r.promotor === promoterFilter : true;
    const matchesBank = bankFilter ? r.banco_id === bankFilter : true;
    
    const recordDate = r.data_pix.split('T')[0];
    const matchesStartDate = startDate ? recordDate >= startDate : true;
    const matchesEndDate = endDate ? recordDate <= endDate : true;

    return matchesSearch && matchesStatus && matchesPromoter && matchesBank && matchesStartDate && matchesEndDate;
  });

  const uniquePromoters = Array.from(new Set(pixRecords.map(r => r.promotor))).filter(Boolean).sort();

  const handleSavePix = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const empresaId = profile?.empresa_id || '';
    
    const data = {
      valor: Number(formData.get('valor')),
      data_pix: formData.get('data_pix') as string,
      cliente: formData.get('cliente') as string,
      depositante: formData.get('depositante') as string,
      promotor: profile?.displayName || '',
      promotor_id: profile?.uid || '',
      empresa: profile?.company || '',
      empresa_id: empresaId,
      cpf_cliente: formData.get('cpf_cliente') as string,
      banco_id: formData.get('banco_id') as string,
      status: 'pending' as PixStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'pix_records'), data);
      setIsFormOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'pix_records');
    }
  };

  const updateStatus = async (record: PixRecord, newStatus: PixStatus, extra: any = {}) => {
    try {
      await updateDoc(doc(db, 'pix_records', record.id), {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...extra
      });
      setCancellingRecord(null);
      setCorrectingRecord(null);
      setLaunchingRecord(null);
      setJustification('');
      setLaunchJustification('');
      setEditedClientName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'pix_records/' + record.id);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              placeholder="Buscar cliente ou depositante..." 
              className="pl-10" 
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Select 
              options={[
                { value: '', label: 'Todos Status' },
                { value: 'pending', label: 'Pendentes' },
                { value: 'confirmed', label: 'Confirmados' },
                { value: 'launched', label: 'Lançados' },
                { value: 'cancelled', label: 'Cancelados' },
              ]}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as PixStatus)}
              className="w-40"
            />
            {(isAdmin || isPromoter) && (
              <Button onClick={() => setIsFormOpen(true)}>
                <PlusCircle size={18} />
                Novo PIX
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Data Inicial</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Data Final</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Promotor</label>
            <Select 
              options={[{ value: '', label: 'Todos Promotores' }, ...uniquePromoters.map(p => ({ value: p, label: p }))]}
              value={promoterFilter}
              onChange={e => setPromoterFilter(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Banco</label>
            <Select 
              options={[{ value: '', label: 'Todos Bancos' }, ...banks.map(b => ({ value: b.id, label: b.name }))]}
              value={bankFilter}
              onChange={e => setBankFilter(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Valor / Data</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Cliente / Dep.</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Promotor / Banco</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRecords.map(record => (
              <tr 
                key={record.id} 
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setViewingRecord(record)}
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">R$ {record.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    {record.old_valor && (
                      <span className="text-[10px] text-red-500 line-through">R$ {record.old_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    )}
                    <span className="text-xs text-gray-500">{format(parseISO(record.data_pix), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{record.cliente}</span>
                    <span className="text-xs text-gray-500">{record.depositante}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-700">{record.promotor}</span>
                    <div className="flex items-center gap-1.5">
                      {banks.find(b => b.id === record.banco_id)?.logoUrl && (
                        <img src={banks.find(b => b.id === record.banco_id)?.logoUrl} alt="" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                      )}
                      <span className="text-xs font-medium text-blue-600">{banks.find(b => b.id === record.banco_id)?.name}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={record.status === 'confirmed' ? 'success' : record.status === 'pending' ? 'warning' : record.status === 'cancelled' ? 'danger' : 'info'}>
                    {record.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onPrint(record)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Imprimir">
                      <Printer size={18} />
                    </button>
                    {isAdmin && record.status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(record, 'confirmed', { confirmed_at: new Date().toISOString(), confirmed_by: profile?.displayName })} className="p-2 text-gray-400 hover:text-green-600 transition-colors" title="Confirmar">
                          <CheckCircle2 size={18} />
                        </button>
                        <button onClick={() => setCorrectingRecord(record)} className="p-2 text-gray-400 hover:text-yellow-600 transition-colors" title="Corrigir Registro">
                          <Settings size={18} />
                        </button>
                        <button onClick={() => setCancellingRecord(record)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Cancelar">
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                    {(isAdmin || isCashier) && record.status === 'confirmed' && (
                      <button 
                        onClick={() => {
                          setLaunchingRecord(record);
                          setEditedClientName(record.cliente);
                          setLaunchJustification('');
                        }} 
                        className="p-2 text-gray-400 hover:text-purple-600 transition-colors" 
                        title="Lançar em Caixa"
                      >
                        <Banknote size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* New PIX Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFormOpen(false)} className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Novo Registro PIX</h3>
                <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleSavePix} className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input name="valor" type="number" step="0.01" label="Valor R$" required />
                  <Input name="data_pix" type="datetime-local" label="Data/Hora" defaultValue={format(new Date(), "yyyy-MM-dd'T'HH:mm")} required />
                </div>
                <Input name="cliente" label="Nome do Cliente" required />
                <Input name="depositante" label="Nome do Depositante" required />
                <Input name="cpf_cliente" label="CPF do Cliente (Opcional)" />
                <Select 
                  name="banco_id" 
                  label="Banco" 
                  options={banks.filter(b => b.active).map(b => ({ value: b.id, label: b.name }))} 
                  required 
                />
                <div className="flex gap-3 mt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1">Salvar e Visualizar</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancellingRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCancellingRecord(null)} className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-red-50">
                <h3 className="text-xl font-bold text-red-900">Confirmar Cancelamento</h3>
                <button onClick={() => setCancellingRecord(null)} className="text-red-400 hover:text-red-600"><X size={24} /></button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="bg-red-100/50 p-4 rounded-xl border border-red-200 flex gap-3">
                  <AlertCircle className="text-red-600 shrink-0" size={20} />
                  <div>
                    <p className="text-red-900 font-bold text-sm">Atenção!</p>
                    <p className="text-red-800 text-xs">Esta ação irá anular permanentemente este registro de PIX. Esta operação não pode ser desfeita.</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Dados do Registro</p>
                  <p className="text-sm text-gray-700"><strong>Valor:</strong> R$ {cancellingRecord.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-sm text-gray-700"><strong>Cliente:</strong> {cancellingRecord.cliente}</p>
                  <p className="text-sm text-gray-700"><strong>Data:</strong> {format(parseISO(cancellingRecord.data_pix), 'dd/MM/yyyy HH:mm')}</p>
                </div>

                <Input 
                  label="Justificativa Obrigatória" 
                  placeholder="Explique o motivo do cancelamento..." 
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  required
                />

                <div className="flex gap-3 mt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setCancellingRecord(null)}>Voltar</Button>
                  <Button 
                    variant="danger" 
                    className="flex-1" 
                    disabled={!justification} 
                    onClick={() => updateStatus(cancellingRecord, 'cancelled', { justification })}
                  >
                    Confirmar Cancelamento
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Correction Modal */}
      <AnimatePresence>
        {correctingRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCorrectingRecord(null)} className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Corrigir Registro</h3>
                <button onClick={() => setCorrectingRecord(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <p className="text-gray-600">Corrigindo PIX de <strong>{correctingRecord.cliente}</strong>.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    type="number"
                    step="0.01"
                    label="Valor R$" 
                    value={newValor || ''}
                    onChange={e => setNewValor(Number(e.target.value))}
                  />
                  <Input 
                    type="datetime-local" 
                    label="Data/Hora" 
                    value={newDataPix}
                    onChange={e => setNewDataPix(e.target.value)}
                  />
                </div>
                
                <Input 
                  label="Nome do Cliente" 
                  value={newCliente}
                  onChange={e => setNewCliente(e.target.value)}
                />

                <Input 
                  label="CPF do Cliente (Opcional)" 
                  value={newCpfCliente}
                  onChange={e => setNewCpfCliente(e.target.value)}
                />
                
                <Input 
                  label="Nome do Depositante" 
                  value={newDepositante}
                  onChange={e => setNewDepositante(e.target.value)}
                />

                <div className="flex gap-3 mt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setCorrectingRecord(null)}>Voltar</Button>
                  <Button 
                    variant="primary" 
                    className="flex-1" 
                    disabled={!newValor || !newCliente || !newDepositante || !newDataPix} 
                    onClick={() => updateStatus(correctingRecord, 'pending', { 
                      old_valor: correctingRecord.valor, 
                      valor: newValor,
                      cliente: newCliente,
                      depositante: newDepositante,
                      data_pix: newDataPix,
                      cpf_cliente: newCpfCliente
                    })}
                  >
                    Confirmar Correção
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Launch to Cashier Modal */}
      <AnimatePresence>
        {launchingRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLaunchingRecord(null)} className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-purple-50">
                <h3 className="text-xl font-bold text-purple-900">Confirmar Lançamento em Caixa</h3>
                <button onClick={() => setLaunchingRecord(null)} className="text-purple-400 hover:text-purple-600"><X size={24} /></button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Valor</span>
                    <span className="font-bold text-gray-900 text-lg">R$ {launchingRecord.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Data PIX</span>
                    <span className="text-sm text-gray-700">{format(parseISO(launchingRecord.data_pix), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Depositante</span>
                    <span className="text-sm text-gray-700 font-medium">{launchingRecord.depositante}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">CPF do Cliente</span>
                    <span className="text-sm text-gray-700">{launchingRecord.cpf_cliente || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Promotor</span>
                    <span className="text-sm text-gray-700">{launchingRecord.promotor}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Empresa</span>
                    <span className="text-sm text-gray-700">{launchingRecord.empresa}</span>
                  </div>
                </div>

                <Input 
                  label="Nome do Cliente (Corrigir se necessário)" 
                  value={editedClientName}
                  onChange={e => setEditedClientName(e.target.value)}
                />

                <Input 
                  label={editedClientName !== launchingRecord.cliente ? "Justificativa Obrigatória (Nome Corrigido)" : "Justificativa (Opcional)"} 
                  placeholder="Motivo do lançamento ou correção de nome..." 
                  value={launchJustification}
                  onChange={e => setLaunchJustification(e.target.value)}
                  required={editedClientName !== launchingRecord.cliente}
                />

                <div className="flex gap-3 mt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setLaunchingRecord(null)}>Cancelar</Button>
                  <Button 
                    variant="primary" 
                    className="flex-1 bg-purple-600 hover:bg-purple-700" 
                    disabled={!editedClientName || (editedClientName !== launchingRecord.cliente && !launchJustification)} 
                    onClick={() => updateStatus(launchingRecord, 'launched', { 
                      cash_launched_at: new Date().toISOString(), 
                      cash_launched_by: profile?.displayName,
                      cliente: editedClientName,
                      justification: launchJustification
                    })}
                  >
                    Confirmar Lançamento
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Details Modal */}
      <AnimatePresence>
        {viewingRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingRecord(null)} className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Detalhes do Registro PIX</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">ID: {viewingRecord.id}</p>
                  </div>
                </div>
                <button onClick={() => setViewingRecord(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              
              <div className="p-8 flex flex-col gap-8 max-h-[80vh] overflow-y-auto">
                {/* Main Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Valor</span>
                    <span className="text-2xl font-black text-blue-600">R$ {viewingRecord.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    {viewingRecord.old_valor && (
                      <span className="text-xs text-red-500 line-through">R$ {viewingRecord.old_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Data do Pix</span>
                    <span className="text-lg font-bold text-gray-900">{format(parseISO(viewingRecord.data_pix), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</span>
                    <div>
                      <Badge variant={viewingRecord.status === 'confirmed' ? 'success' : viewingRecord.status === 'pending' ? 'warning' : viewingRecord.status === 'cancelled' ? 'danger' : 'info'}>
                        {viewingRecord.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-100 w-full" />

                {/* Participants Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cliente</span>
                      <span className="font-bold text-gray-900">{viewingRecord.cliente}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">CPF do Cliente</span>
                      <span className="text-gray-700">{viewingRecord.cpf_cliente || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Depositante</span>
                      <span className="text-gray-700">{viewingRecord.depositante}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Banco</span>
                      <div className="flex items-center gap-2">
                        {banks.find(b => b.id === viewingRecord.banco_id)?.logoUrl && (
                          <img src={banks.find(b => b.id === viewingRecord.banco_id)?.logoUrl} alt="" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                        )}
                        <span className="font-bold text-blue-600">{banks.find(b => b.id === viewingRecord.banco_id)?.name}</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Empresa</span>
                      <span className="text-gray-700 font-medium">{viewingRecord.empresa}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Promotor</span>
                      <span className="text-gray-700">{viewingRecord.promotor}</span>
                    </div>
                  </div>
                </div>

                {/* Audit Info */}
                <div className="bg-gray-50 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border border-gray-100">
                  {viewingRecord.confirmed_at && (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Confirmado por</span>
                      <span className="text-sm font-bold text-gray-900">{viewingRecord.confirmed_by}</span>
                      <span className="text-[10px] text-gray-500">{format(parseISO(viewingRecord.confirmed_at), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  )}
                  {viewingRecord.cash_launched_at && (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lançado em Caixa por</span>
                      <span className="text-sm font-bold text-purple-600">{viewingRecord.cash_launched_by}</span>
                      <span className="text-[10px] text-gray-500">{format(parseISO(viewingRecord.cash_launched_at), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  )}
                  {viewingRecord.justification && (
                    <div className="flex flex-col md:col-span-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Justificativa / Motivo</span>
                      <p className="text-sm text-gray-700 italic bg-white p-3 rounded-lg border border-gray-100">"{viewingRecord.justification}"</p>
                    </div>
                  )}
                  {viewingRecord.observacoes && (
                    <div className="flex flex-col md:col-span-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Observações</span>
                      <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-100">{viewingRecord.observacoes}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setViewingRecord(null)} className="px-8">Fechar Visualização</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const BanksView = ({ banks, onLog }: { banks: Bank[], onLog: (a: string, d: string) => void }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      pixKey: formData.get('pixKey') as string,
      logoUrl: formData.get('logoUrl') as string,
      active: true,
    };

    try {
      if (editingBank) {
        await updateDoc(doc(db, 'banks', editingBank.id), data);
        onLog('Banco Atualizado', `Banco ${data.name} editado.`);
      } else {
        await addDoc(collection(db, 'banks'), data);
        onLog('Banco Criado', `Banco ${data.name} adicionado.`);
      }
      setIsFormOpen(false);
      setEditingBank(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'banks');
    }
  };

  const toggleBank = async (bank: Bank) => {
    await updateDoc(doc(db, 'banks', bank.id), { active: !bank.active });
    onLog('Banco Status Alterado', `Banco ${bank.name} ${!bank.active ? 'ativado' : 'desativado'}.`);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Gerenciamento de Bancos</h3>
        <Button onClick={() => { setEditingBank(null); setIsFormOpen(true); }}>
          <PlusCircle size={18} />
          Novo Banco
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {banks.map(bank => (
          <Card key={bank.id} className="relative">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold overflow-hidden border border-gray-100">
                {bank.logoUrl ? (
                  <img src={bank.logoUrl} alt={bank.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                ) : (
                  bank.code || '??'
                )}
              </div>
              <Badge variant={bank.active ? 'success' : 'danger'}>
                {bank.active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <h4 className="text-lg font-bold text-gray-900">{bank.name}</h4>
            <p className="text-sm text-gray-500 mb-6">{bank.pixKey}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setEditingBank(bank); setIsFormOpen(true); }}>Editar</Button>
              <Button variant={bank.active ? 'danger' : 'success'} className="flex-1" onClick={() => toggleBank(bank)}>
                {bank.active ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFormOpen(false)} className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">{editingBank ? 'Editar Banco' : 'Novo Banco'}</h3>
                <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
                <Input name="name" label="Nome do Banco" defaultValue={editingBank?.name} required />
                <Input name="code" label="Código (Ex: 001)" defaultValue={editingBank?.code} />
                <Input name="pixKey" label="Chave PIX" defaultValue={editingBank?.pixKey} required />
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-sm font-medium text-gray-700">Logo do Banco (URL ou Upload)</label>
                  <div className="flex gap-2">
                    <Input name="logoUrl" placeholder="https://..." defaultValue={editingBank?.logoUrl} className="flex-1" />
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg transition-colors flex items-center justify-center shrink-0 border border-gray-200">
                      <PlusCircle size={20} />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const input = document.getElementsByName('logoUrl')[0] as HTMLInputElement;
                              if (input) input.value = reader.result as string;
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1">Salvar</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const UsersView = ({ users, empresas, onLog }: { users: UserProfile[], empresas: Empresa[], onLog: (a: string, d: string) => void }) => {
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const pendingUsers = users.filter(u => !u.active);
  const activeUsers = users.filter(u => u.active);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    const formData = new FormData(e.currentTarget);
    const data = {
      role: formData.get('role') as any,
      company: formData.get('company') as string,
      active: formData.get('active') === 'on',
      updated_at: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'users', editingUser.uid), data, { merge: true });
      onLog('Usuário Atualizado', `Usuário ${editingUser.email} atualizado: Role=${data.role}, Empresa=${data.company}, Ativo=${data.active}`);
      setEditingUser(null);
      toast.success('Usuário atualizado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users/' + editingUser.uid);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const displayName = formData.get('displayName') as string;
    const role = formData.get('role') as any;
    const company = formData.get('company') as string;

    if (!email || !displayName) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      // Create a pre-registered user document
      // We use a specific ID to make it easier to manage
      const uid = `pre-reg-${Date.now()}`;
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        displayName,
        role,
        company,
        active: true, // Admin registered users are active by default
        isPreRegistered: true,
        created_at: new Date().toISOString()
      });

      onLog('Usuário Cadastrado', `Novo usuário cadastrado pelo ADM: ${email} (${role})`);
      setIsRegistering(false);
      toast.success('Usuário cadastrado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  const copyInviteLink = () => {
    const inviteLink = window.location.origin;
    navigator.clipboard.writeText(inviteLink);
    toast.success('Link de convite copiado!');
    setIsInviting(false);
  };

  const UserTable = ({ data, title }: { data: UserProfile[], title: string }) => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">{title} ({data.length})</h4>
      </div>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Usuário</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Nível / Role</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Empresa / Grupo</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">Nenhum usuário encontrado nesta categoria.</td>
              </tr>
            ) : (
              data.map(u => (
                <tr key={u.uid} className={cn("hover:bg-gray-50 transition-colors", !u.active && "bg-yellow-50/30")}>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{u.displayName}</span>
                      <span className="text-xs text-gray-500">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        u.role === 'admin' ? "bg-purple-500" : u.role === 'cashier' ? "bg-blue-500" : "bg-green-500"
                      )} />
                      {u.role === 'admin' ? 'Administrador' : u.role === 'cashier' ? 'Caixa' : 'Promotor'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Building2 size={14} className="text-gray-400" />
                      {u.company || 'Não Definida'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={u.active ? 'success' : 'danger'}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      variant={!u.active ? 'primary' : 'outline'} 
                      onClick={() => setEditingUser(u)}
                      className={cn("h-9 px-4 text-xs", !u.active ? "bg-blue-600 hover:bg-blue-700" : "")}
                    >
                      {!u.active ? 'Aprovar / Editar' : 'Editar'}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Gestão de Acessos</h3>
          <p className="text-sm text-gray-500">Aprove novos usuários e gerencie permissões do sistema.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsInviting(true)} className="gap-2">
            <User size={18} />
            Convidar Usuário
          </Button>
          <Button onClick={() => setIsRegistering(true)} className="gap-2">
            <PlusCircle size={18} />
            Cadastrar Usuário
          </Button>
        </div>
      </div>

      {pendingUsers.length > 0 && (
        <UserTable data={pendingUsers} title="Aguardando Aprovação" />
      )}

      <UserTable data={activeUsers} title="Usuários Ativos" />

      <AnimatePresence>
        {isRegistering && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRegistering(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">Cadastrar Novo Usuário</h3>
                <p className="text-xs text-gray-500">O usuário será pré-configurado e ativado.</p>
              </div>
              <form onSubmit={handleRegister} className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo</label>
                  <Input name="displayName" placeholder="Ex: João Silva" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">E-mail</label>
                  <Input name="email" type="email" placeholder="usuario@email.com" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nível de Acesso</label>
                  <Select 
                    name="role" 
                    required 
                    options={[
                      { value: 'promoter', label: 'Promotor' },
                      { value: 'cashier', label: 'Caixa' },
                      { value: 'admin', label: 'Administrador' }
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Empresa / Grupo</label>
                  {empresas.length === 0 ? (
                    <div className="p-2 bg-yellow-50 border border-yellow-100 rounded text-xs text-yellow-700 italic">
                      Nenhuma empresa cadastrada. Cadastre uma empresa primeiro.
                    </div>
                  ) : (
                    <Select 
                      name="company" 
                      required 
                      options={[
                        { value: '', label: 'Selecione uma empresa' },
                        ...empresas.map(e => ({ value: e.name || e.nome || '', label: e.name || e.nome || '' }))
                      ]}
                    />
                  )}
                </div>
                <div className="flex gap-3 mt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsRegistering(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1">Cadastrar e Ativar</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isInviting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInviting(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">Convidar Usuário</h3>
                <p className="text-xs text-gray-500">Compartilhe o link de acesso com o novo usuário.</p>
              </div>
              <div className="p-6 flex flex-col gap-6">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Link de Acesso</label>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-blue-200">
                    <span className="text-sm text-gray-600 truncate flex-1">{window.location.origin}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Ao acessar o link e fazer login, o usuário aparecerá na lista de <strong>Aguardando Aprovação</strong>.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setIsInviting(false)}>Fechar</Button>
                  <Button className="flex-1 gap-2" onClick={copyInviteLink}>
                    <FileText size={18} />
                    Copiar Link
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingUser(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900">Configurar Acesso</h3>
                  <p className="text-xs text-gray-500">{editingUser.email}</p>
                </div>
                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600 p-2"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdate} className="p-6 flex flex-col gap-5">
                <Select 
                  name="role" 
                  label="Nível de Acesso" 
                  defaultValue={editingUser.role}
                  options={[
                    { value: 'admin', label: 'Administrador (Acesso Total)' },
                    { value: 'promoter', label: 'Promotor (Lançamentos)' },
                    { value: 'cashier', label: 'Caixa (Conferência)' },
                  ]} 
                  required 
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Empresa / Grupo</label>
                  {empresas.length === 0 ? (
                    <div className="p-2 bg-yellow-50 border border-yellow-100 rounded text-xs text-yellow-700 italic">
                      Nenhuma empresa cadastrada.
                    </div>
                  ) : (
                    <Select 
                      name="company" 
                      defaultValue={editingUser.company}
                      options={empresas.map(e => ({ value: e.name || e.nome || '', label: e.name || e.nome || '' }))}
                      required 
                    />
                  )}
                </div>
                
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">Status da Conta</span>
                      <span className="text-xs text-gray-500">Ative para permitir o acesso ao sistema</span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="active" 
                        id="active-toggle"
                        defaultChecked={editingUser.active} 
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setEditingUser(null)}>Cancelar</Button>
                  <Button type="submit" className="flex-1 h-12 shadow-lg shadow-blue-200">
                    {editingUser.active ? 'Salvar Alterações' : 'Aprovar e Ativar'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ReportsView = ({ pixRecords, users, empresas, banks }: { pixRecords: PixRecord[], users: UserProfile[], empresas: Empresa[], banks: Bank[] }) => {
  const { profile, isAdmin, isPromoter, isCashier } = useAuth();
  
  // Input states
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportType, setReportType] = useState<'confirmation' | 'cash' | 'pix_date'>(isPromoter ? 'pix_date' : 'confirmation');
  const [empresaFilter, setEmpresaFilter] = useState(isPromoter ? profile?.company || '' : '');
  const [bankFilter, setBankFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<PixStatus | ''>('');
  const [promoterFilter, setPromoterFilter] = useState(isPromoter ? profile?.displayName || '' : '');
  const [minValorFilter, setMinValorFilter] = useState<number>(0);

  // Applied filters state
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    reportType: isPromoter ? 'pix_date' : 'confirmation' as any,
    empresa: isPromoter ? profile?.company || '' : '',
    bank: '',
    status: '' as any,
    promoter: isPromoter ? profile?.displayName || '' : '',
    minValor: 0
  });

  const handleGenerate = () => {
    setAppliedFilters({
      startDate,
      endDate,
      reportType,
      empresa: empresaFilter,
      bank: bankFilter,
      status: statusFilter,
      promoter: promoterFilter,
      minValor: minValorFilter
    });
    toast.success('Relatório gerado com sucesso!');
  };

  const handleClear = () => {
    const defaultType = isPromoter ? 'pix_date' : 'confirmation';
    const defaultEmpresa = isPromoter ? profile?.company || '' : '';
    const defaultPromoter = isPromoter ? profile?.displayName || '' : '';
    const today = format(new Date(), 'yyyy-MM-dd');

    setStartDate(today);
    setEndDate(today);
    setReportType(defaultType as any);
    setEmpresaFilter(defaultEmpresa);
    setBankFilter('');
    setStatusFilter('');
    setPromoterFilter(defaultPromoter);
    setMinValorFilter(0);

    setAppliedFilters({
      startDate: today,
      endDate: today,
      reportType: defaultType as any,
      empresa: defaultEmpresa,
      bank: '',
      status: '',
      promoter: defaultPromoter,
      minValor: 0
    });
    toast.info('Filtros limpos.');
  };

  const filteredRecords = pixRecords.filter(r => {
    let dateToCompare = '';
    if (appliedFilters.reportType === 'confirmation') dateToCompare = r.confirmed_at || '';
    else if (appliedFilters.reportType === 'cash') dateToCompare = r.cash_launched_at || '';
    else if (appliedFilters.reportType === 'pix_date') dateToCompare = r.data_pix || '';

    if (!dateToCompare) return false;
    
    const recordDate = dateToCompare.split('T')[0];
    const matchesDateRange = recordDate >= appliedFilters.startDate && recordDate <= appliedFilters.endDate;
    const matchesEmpresa = appliedFilters.empresa ? r.empresa === appliedFilters.empresa : true;
    const matchesBank = appliedFilters.bank ? r.banco_id === appliedFilters.bank : true;
    const matchesStatus = appliedFilters.status ? r.status === appliedFilters.status : true;
    const matchesPromoter = appliedFilters.promoter ? r.promotor === appliedFilters.promoter : true;
    const matchesMinValor = appliedFilters.minValor > 0 ? r.valor >= appliedFilters.minValor : true;

    return matchesDateRange && matchesEmpresa && matchesBank && matchesStatus && matchesPromoter && matchesMinValor;
  });

  const totalValue = filteredRecords.reduce((acc, r) => acc + r.valor, 0);
  const quantity = filteredRecords.length;
  const averageTicket = quantity > 0 ? totalValue / quantity : 0;

  const byOperator = appliedFilters.reportType === 'cash' ? filteredRecords.reduce((acc, r) => {
    const op = r.cash_launched_by || 'N/A';
    acc[op] = (acc[op] || 0) + r.valor;
    return acc;
  }, {} as Record<string, number>) : null;

  const byPromoter = appliedFilters.reportType === 'pix_date' ? filteredRecords.reduce((acc, r) => {
    const prom = r.promotor || 'N/A';
    acc[prom] = (acc[prom] || 0) + r.valor;
    return acc;
  }, {} as Record<string, number>) : null;

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    let title = '';
    if (appliedFilters.reportType === 'confirmation') title = 'Relatório de Confirmação';
    else if (appliedFilters.reportType === 'cash') title = 'Relatório de Caixa (Lançamento)';
    else if (appliedFilters.reportType === 'pix_date') title = 'Relatório por Data do PIX';
    
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${format(parseISO(appliedFilters.startDate), 'dd/MM/yyyy')} até ${format(parseISO(appliedFilters.endDate), 'dd/MM/yyyy')}`, 14, 28);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 34);

    let y = 45;
    
    // Summary Section
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO GERAL', 14, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, y);
    doc.text(`Quantidade: ${quantity}`, 80, y);
    doc.text(`Ticket Médio: R$ ${averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 140, y);
    y += 10;

    if (byOperator) {
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL POR OPERADOR', 14, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      Object.entries(byOperator).forEach(([op, val]) => {
        doc.text(`${op}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, y);
        y += 6;
      });
      y += 4;
    }

    if (byPromoter) {
      doc.setFont('helvetica', 'bold');
      doc.text('DESEMPENHO DE PROMOTORES', 14, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      Object.entries(byPromoter).forEach(([prom, val]) => {
        doc.text(`${prom}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, y);
        y += 6;
      });
      y += 4;
    }

    doc.setFont('helvetica', 'bold');
    doc.text('DETALHAMENTO', 14, y);
    y += 7;
    doc.text('Valor', 14, y);
    doc.text('Cliente', 40, y);
    doc.text('Promotor', 90, y);
    doc.text('Data', 140, y);
    y += 7;
    doc.setFont('helvetica', 'normal');

    filteredRecords.forEach(r => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(`R$ ${r.valor.toFixed(2)}`, 14, y);
      doc.text(r.cliente.substring(0, 20), 40, y);
      doc.text(r.promotor.substring(0, 20), 90, y);
      const dateStr = appliedFilters.reportType === 'confirmation' ? r.confirmed_at : (appliedFilters.reportType === 'cash' ? r.cash_launched_at : r.data_pix);
      doc.text(format(parseISO(dateStr!), 'dd/MM HH:mm'), 140, y);
      y += 6;
    });

    doc.save(`relatorio_${appliedFilters.reportType}_${appliedFilters.startDate}_${appliedFilters.endDate}.pdf`);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <Card title="Filtros do Relatório">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Tipo de Relatório</label>
            <select 
              value={reportType} 
              onChange={e => setReportType(e.target.value as any)}
              disabled={isPromoter}
              className="h-11 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-500"
            >
              {!isPromoter && <option value="confirmation">Por Data de Confirmação</option>}
              {!isPromoter && <option value="cash">Por Data de Lançamento (Caixa)</option>}
              <option value="pix_date">Por Data do PIX</option>
            </select>
          </div>
          
          <Input type="date" label="Data Início" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <Input type="date" label="Data Fim" value={endDate} onChange={e => setEndDate(e.target.value)} />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Banco</label>
            <Select 
              options={[{ value: '', label: 'Todos os Bancos' }, ...banks.map(b => ({ value: b.id, label: b.name }))]}
              value={bankFilter}
              onChange={e => setBankFilter(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <Select 
              options={[
                { value: '', label: 'Todos os Status' },
                { value: 'pending', label: 'Pendente' },
                { value: 'confirmed', label: 'Confirmado' },
                { value: 'launched', label: 'Lançado' },
                { value: 'cancelled', label: 'Cancelado' }
              ]}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Empresa</label>
            <Select 
              options={[{ value: '', label: 'Todas as Empresas' }, ...empresas.map(e => ({ value: e.name || e.nome || '', label: e.name || e.nome || '' }))]}
              value={empresaFilter}
              onChange={e => setEmpresaFilter(e.target.value)}
              disabled={isPromoter}
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Promotor</label>
            <Select 
              options={[{ value: '', label: 'Todos os Promotores' }, ...Array.from(new Set(pixRecords.map(r => r.promotor))).filter(Boolean).sort().map(p => ({ value: p, label: p }))]}
              value={promoterFilter}
              onChange={e => setPromoterFilter(e.target.value)}
              disabled={isPromoter}
              className="h-11"
            />
          </div>

          <Input 
            type="number" 
            label="Valor Mínimo" 
            value={minValorFilter} 
            onChange={e => setMinValorFilter(Number(e.target.value))} 
            placeholder="0,00"
          />

          <div className="md:col-span-3 lg:col-span-4 flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={handleClear} className="h-11">
              <X size={18} />
              Limpar Filtros
            </Button>
            <Button onClick={handleGenerate} className="h-11">
              <Search size={18} />
              Gerar Relatório
            </Button>
            <Button variant="secondary" onClick={generatePDF} className="h-11">
              <Download size={18} />
              Exportar PDF
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Filtrado" value={`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={TrendingUp} color="blue" />
        <StatCard title="Quantidade" value={quantity} icon={FileText} color="green" />
        <StatCard title="Ticket Médio" value={`R$ ${averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Banknote} color="purple" />
      </div>

      {byOperator && (
        <Card title="Total por Operador">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(byOperator).map(([op, val]) => (
              <div key={op} className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                <span className="font-medium text-gray-700">{op}</span>
                <span className="font-bold text-gray-900">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {byPromoter && (
        <Card title="Desempenho de Promotores">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(byPromoter).map(([prom, val]) => (
              <div key={prom} className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                <span className="font-medium text-gray-700">{prom}</span>
                <span className="font-bold text-gray-900">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title={`Detalhamento (${filteredRecords.length})`}>
        <div className="flex flex-col gap-4">
          {filteredRecords.map(r => (
            <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">R$ {r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span className="text-xs text-gray-500">{r.cliente} • {r.promotor}</span>
                <span className="text-[10px] text-gray-400">Banco: {banks.find(b => b.id === r.banco_id)?.name} • Status: {r.status}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-700">
                  {reportType === 'confirmation' ? `Conf: ${r.confirmed_by}` : (reportType === 'cash' ? `Lanç: ${r.cash_launched_by}` : `Pix: ${r.promotor}`)}
                </p>
                <p className="text-[10px] text-gray-400">
                  {format(parseISO((reportType === 'confirmation' ? r.confirmed_at : (reportType === 'cash' ? r.cash_launched_at : r.data_pix))!), 'dd/MM HH:mm')}
                </p>
              </div>
            </div>
          ))}
          {filteredRecords.length === 0 && (
            <div className="py-12 text-center flex flex-col items-center gap-3 text-gray-400">
              <FileText size={48} strokeWidth={1} />
              <p>Nenhum registro encontrado para os filtros selecionados.</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

const DrawsView = ({ pixRecords, draws, onLog }: { pixRecords: PixRecord[], draws: Draw[], onLog: (a: string, d: string) => void }) => {
  const { profile } = useAuth();
  const [isDrawing, setIsDrawing] = useState(false);
  const [winner, setWinner] = useState<PixRecord | null>(null);
  const [filters, setFilters] = useState({
    datePixStart: '',
    datePixEnd: '',
    dateConfStart: '',
    dateConfEnd: '',
    minValue: 0,
  });

  const eligibleRecords = pixRecords.filter(r => {
    if (r.status !== 'confirmed' && r.status !== 'launched') return false;
    if (filters.minValue > 0 && r.valor < filters.minValue) return false;
    
    // Date Pix Filter
    if (filters.datePixStart && filters.datePixEnd) {
      const start = startOfDay(parseISO(filters.datePixStart));
      const end = endOfDay(parseISO(filters.datePixEnd));
      const date = parseISO(r.data_pix);
      if (!isWithinInterval(date, { start, end })) return false;
    }

    // Date Confirmation Filter
    if (filters.dateConfStart && filters.dateConfEnd) {
      const start = startOfDay(parseISO(filters.dateConfStart));
      const end = endOfDay(parseISO(filters.dateConfEnd));
      const date = r.confirmed_at ? parseISO(r.confirmed_at) : null;
      if (!date || !isWithinInterval(date, { start, end })) return false;
    }

    // Exclusion: No repeat winners (simplified: check if record ID was already drawn)
    const alreadyWon = draws.some(d => d.winners.some(w => w.id === r.id));
    return !alreadyWon;
  });

  const updateTVState = async (status: 'idle' | 'drawing' | 'result', winnerRecord?: PixRecord) => {
    try {
      await setDoc(doc(db, 'settings', 'tv_state'), {
        status,
        participantsNames: eligibleRecords.map(r => r.cliente),
        winners: winnerRecord ? [winnerRecord] : [],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/tv_state');
    }
  };

  const runDraw = async () => {
    if (eligibleRecords.length === 0) return;
    setIsDrawing(true);
    
    const randomIndex = Math.floor(Math.random() * eligibleRecords.length);
    const selectedWinner = eligibleRecords[randomIndex];

    // Update TV to drawing state
    await updateTVState('drawing', selectedWinner);
    
    // Simulate drawing animation
    await new Promise(r => setTimeout(r, 2000));
    
    const drawData: Omit<Draw, 'id'> = {
      type: 'Avançado',
      periodStart: filters.datePixStart || filters.dateConfStart,
      periodEnd: filters.datePixEnd || filters.dateConfEnd,
      minValue: filters.minValue,
      participantsCount: eligibleRecords.length,
      winners: [selectedWinner],
      createdBy: profile?.displayName || '',
      timestamp: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'draws'), drawData);
      onLog('Sorteio Realizado', `Ganhador: ${selectedWinner.cliente} (R$ ${selectedWinner.valor})`);
      setWinner(selectedWinner);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'draws');
    } finally {
      setIsDrawing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card title="Configurar Sorteio" className="lg:col-span-1">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" label="Início (PIX)" value={filters.datePixStart} onChange={e => setFilters({...filters, datePixStart: e.target.value})} />
              <Input type="date" label="Fim (PIX)" value={filters.datePixEnd} onChange={e => setFilters({...filters, datePixEnd: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" label="Início (CONF)" value={filters.dateConfStart} onChange={e => setFilters({...filters, dateConfStart: e.target.value})} />
              <Input type="date" label="Fim (CONF)" value={filters.dateConfEnd} onChange={e => setFilters({...filters, dateConfEnd: e.target.value})} />
            </div>
            <Input type="number" label="Valor Mínimo" value={filters.minValue} onChange={e => setFilters({...filters, minValue: Number(e.target.value)})} />
            
            <div className="bg-blue-50 p-4 rounded-xl flex items-center justify-between mt-4">
              <div className="flex flex-col">
                <span className="text-xs text-blue-600 font-bold uppercase">Elegíveis</span>
                <span className="text-2xl font-bold text-blue-900">{eligibleRecords.length}</span>
              </div>
              <Trophy className="text-blue-200" size={40} />
            </div>

            <Button 
              className="h-14 text-lg mt-4" 
              disabled={eligibleRecords.length === 0 || isDrawing}
              onClick={runDraw}
            >
              {isDrawing ? 'Sorteando...' : 'Realizar Sorteio'}
            </Button>

            <div className="pt-4 border-t border-gray-100 mt-4">
              <p className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest">Controle Painel TV</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="text-xs h-10" onClick={() => updateTVState('idle')}>
                  <Monitor size={14} /> Resetar TV
                </Button>
                <Button variant="outline" className="text-xs h-10" onClick={() => window.open(window.location.origin + '?view=tv', '_blank')}>
                  <Tv size={14} /> Abrir TV
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 flex flex-col gap-6">
          {winner && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={120} /></div>
                <h3 className="text-xl font-medium opacity-80 mb-2">🎉 TEMOS UM GANHADOR!</h3>
                <p className="text-4xl font-black mb-4">{winner.cliente}</p>
                <div className="grid grid-cols-2 gap-4 text-left bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                  <div>
                    <p className="text-[10px] uppercase opacity-60">Valor</p>
                    <p className="font-bold">R$ {winner.valor.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase opacity-60">Promotor</p>
                    <p className="font-bold">{winner.promotor}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase opacity-60">Data PIX</p>
                    <p className="font-bold">{format(parseISO(winner.data_pix), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase opacity-60">Confirmação</p>
                    <p className="font-bold">{winner.confirmed_at ? format(parseISO(winner.confirmed_at), 'dd/MM/yyyy') : '-'}</p>
                  </div>
                </div>
                <Button variant="secondary" className="mt-6 w-full" onClick={() => setWinner(null)}>Novo Sorteio</Button>
              </Card>
            </motion.div>
          )}

          <Card title="Histórico de Sorteios">
            <div className="flex flex-col gap-4">
              {draws.map(draw => (
                <div key={draw.id} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{draw.winners[0]?.cliente}</p>
                    <p className="text-xs text-gray-500">
                      {format(parseISO(draw.timestamp), 'dd/MM/yyyy HH:mm')} • {draw.participantsCount} participantes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">R$ {draw.winners[0]?.valor.toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-gray-400">Por: {draw.createdBy}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

const HistDrawsView = ({ draws }: { draws: Draw[] }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
    <h3 className="text-xl font-bold text-gray-900">Histórico Completo de Sorteios</h3>
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Data/Hora</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Ganhador</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Valor</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Participantes</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Realizado por</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {draws.map(draw => (
            <tr key={draw.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm text-gray-500">
                {format(parseISO(draw.timestamp), 'dd/MM/yyyy HH:mm')}
              </td>
              <td className="px-6 py-4">
                <span className="font-bold text-gray-900">{draw.winners[0]?.cliente}</span>
              </td>
              <td className="px-6 py-4 font-bold text-blue-600">
                R$ {draw.winners[0]?.valor.toLocaleString('pt-BR')}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {draw.participantsCount}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {draw.createdBy}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  </motion.div>
);

const EmpresasView = ({ empresas, businessGroups, onLog }: { empresas: Empresa[], businessGroups: BusinessGroup[], onLog: (a: string, d: string) => void }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [editingGroup, setEditingGroup] = useState<BusinessGroup | null>(null);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      cnpj: formData.get('cnpj') as string,
      grupo_empresa_id: formData.get('grupo_empresa_id') as string || null,
      active: true,
    };

    try {
      if (editingEmpresa) {
        await updateDoc(doc(db, 'empresas', editingEmpresa.id), data);
        onLog('Empresa Atualizada', `Empresa ${data.name} editada.`);
      } else {
        await addDoc(collection(db, 'empresas'), data);
        onLog('Empresa Criada', `Empresa ${data.name} adicionada.`);
      }
      setIsFormOpen(false);
      setEditingEmpresa(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'empresas');
    }
  };

  const handleSaveGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      active: true,
      created_at: new Date().toISOString(),
    };

    try {
      if (editingGroup) {
        await updateDoc(doc(db, 'business_groups', editingGroup.id), { name: data.name });
        onLog('Grupo Atualizado', `Grupo ${data.name} editado.`);
      } else {
        await addDoc(collection(db, 'business_groups'), data);
        onLog('Grupo Criado', `Grupo ${data.name} adicionado.`);
      }
      setIsGroupFormOpen(false);
      setEditingGroup(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'business_groups');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Gerenciamento de Empresas</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsGroupFormOpen(true)}>
            <Users size={18} />
            Grupos Empresariais
          </Button>
          <Button onClick={() => { setEditingEmpresa(null); setIsFormOpen(true); }}>
            <PlusCircle size={18} />
            Nova Empresa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {empresas.map(emp => {
          const group = businessGroups.find(g => g.id === emp.grupo_empresa_id);
          return (
            <Card key={emp.id} className="relative">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Building2 size={24} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={emp.active ? 'success' : 'danger'}>
                    {emp.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                  {group && (
                    <Badge variant="info">
                      {group.name}
                    </Badge>
                  )}
                </div>
              </div>
              <h4 className="text-lg font-bold text-gray-900">{emp.name}</h4>
              <p className="text-sm text-gray-500 mb-6">{emp.cnpj || 'Sem CNPJ'}</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setEditingEmpresa(emp); setIsFormOpen(true); }}>Editar</Button>
              </div>
            </Card>
          );
        })}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFormOpen(false)} className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">{editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}</h3>
                <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
                <Input name="name" label="Nome da Empresa" defaultValue={editingEmpresa?.name} required />
                <Input name="cnpj" label="CNPJ (Opcional)" defaultValue={editingEmpresa?.cnpj} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Grupo Empresarial</label>
                  <Select 
                    name="grupo_empresa_id" 
                    defaultValue={editingEmpresa?.grupo_empresa_id || ''}
                    options={[
                      { value: '', label: 'Nenhum Grupo' },
                      ...businessGroups.map(g => ({ value: g.id, label: g.name }))
                    ]}
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1">Salvar</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isGroupFormOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsGroupFormOpen(false)} className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Grupos Empresariais</h3>
                <button onClick={() => setIsGroupFormOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <div className="p-6 flex flex-col gap-6">
                <form onSubmit={handleSaveGroup} className="flex gap-3 items-end bg-gray-50 p-4 rounded-xl">
                  <div className="flex-1">
                    <Input name="name" label={editingGroup ? "Editar Nome do Grupo" : "Novo Grupo"} defaultValue={editingGroup?.name} placeholder="Nome do grupo" required />
                  </div>
                  <div className="flex gap-2">
                    {editingGroup && (
                      <Button type="button" variant="outline" onClick={() => setEditingGroup(null)}>Cancelar</Button>
                    )}
                    <Button type="submit">{editingGroup ? "Atualizar" : "Adicionar"}</Button>
                  </div>
                </form>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-3">Vincular Empresas a Grupos</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Empresa sem Grupo</label>
                      <select 
                        id="manage-empresa-id"
                        className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white"
                      >
                        <option value="">Selecione uma empresa</option>
                        {empresas.filter(e => !e.grupo_empresa_id).map(e => (
                          <option key={e.id} value={e.id}>{e.name || e.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Mover para Grupo</label>
                      <div className="flex gap-2">
                        <select 
                          id="manage-group-id"
                          className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white"
                        >
                          <option value="">Nenhum (Remover)</option>
                          {businessGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                        <Button 
                          onClick={async () => {
                            const empId = (document.getElementById('manage-empresa-id') as HTMLSelectElement).value;
                            const grpId = (document.getElementById('manage-group-id') as HTMLSelectElement).value;
                            if (!empId) return toast.error('Selecione uma empresa');
                            try {
                              await updateDoc(doc(db, 'empresas', empId), { grupo_empresa_id: grpId || null });
                              toast.success('Empresa vinculada com sucesso!');
                            } catch (e) {
                              toast.error('Erro ao vincular empresa');
                            }
                          }}
                        >
                          Vincular
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-3 text-xs font-bold text-gray-500 uppercase">Nome do Grupo</th>
                        <th className="py-3 text-xs font-bold text-gray-500 uppercase">Empresas</th>
                        <th className="py-3 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {businessGroups.map(group => {
                        const groupEmpresas = empresas.filter(e => e.grupo_empresa_id === group.id);
                        return (
                          <tr key={group.id}>
                            <td className="py-3 text-sm font-medium text-gray-900">{group.name}</td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-1">
                                {groupEmpresas.map(e => (
                                  <Badge key={e.id} variant="info">
                                    {e.name || e.nome}
                                  </Badge>
                                ))}
                                {groupEmpresas.length === 0 && <span className="text-xs text-gray-400 italic">Nenhuma</span>}
                              </div>
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button 
                                  onClick={() => setEditingGroup(group)}
                                  className="text-blue-500 hover:text-blue-700 p-2"
                                  title="Editar Nome"
                                >
                                  <Settings size={16} />
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (confirm(`Deseja excluir o grupo ${group.name}?`)) {
                                      await deleteDoc(doc(db, 'business_groups', group.id));
                                      onLog('Grupo Excluído', `Grupo ${group.name} removido.`);
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700 p-2"
                                  title="Excluir Grupo"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {businessGroups.length === 0 && (
                        <tr>
                          <td colSpan={2} className="py-8 text-center text-gray-500 italic">Nenhum grupo cadastrado</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const LogsView = ({ logs }: { logs: AuditLog[] }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
    <h3 className="text-xl font-bold text-gray-900">Auditoria Completa</h3>
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Data/Hora</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Usuário</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Ação</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Detalhes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {logs.map(log => (
            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-xs text-gray-500">
                {format(parseISO(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
              </td>
              <td className="px-6 py-4">
                <span className="text-sm font-medium text-gray-900">{log.userEmail}</span>
              </td>
              <td className="px-6 py-4">
                <Badge variant="info">{log.action}</Badge>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {log.details}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  </motion.div>
);

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" richColors closeButton />
    </AuthProvider>
  );
}
