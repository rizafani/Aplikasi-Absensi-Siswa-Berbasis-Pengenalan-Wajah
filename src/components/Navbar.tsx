import React, { useState, useEffect } from 'react';
import { Camera, Maximize, Clock, ShieldCheck, Sun, Moon } from 'lucide-react';
import { ClassConfig, ClassItem } from '../types';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  config: ClassConfig;
  classes: ClassItem[];
  activeClass: ClassItem;
  onSelectClass: (classId: string) => void;
  onOpenKiosk: () => void;
  isKioskActive: boolean;
  isCameraActive: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  config,
  classes,
  activeClass,
  onSelectClass,
  onOpenKiosk,
  isCameraActive,
  darkMode,
  onToggleDarkMode,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' WIB'
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'absensi', label: 'Absensi' },
    { id: 'jadwal', label: 'Jam Pelajaran' },
    { id: 'siswa', label: 'Data Siswa' },
    { id: 'registrasi', label: 'Registrasi Wajah' },
    { id: 'rekap', label: 'Rekap' },
    { id: 'pengaturan', label: 'Pengaturan' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Wordmark & Class Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-indigo-700 transition-colors">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white block leading-tight">
                  ABSENSI KELAS
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight font-medium">
                  {config.schoolName}
                </span>
              </div>
            </button>

            {/* Multi-Class Switcher */}
            <div className="flex items-center pl-1 sm:pl-2 sm:border-l sm:border-slate-200 sm:dark:border-slate-800">
              <select
                value={activeClass.id}
                onChange={(e) => onSelectClass(e.target.value)}
                title="Pilih Kelas Aktif"
                className="text-xs font-bold text-slate-900 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[160px] sm:max-w-[200px] truncate"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Database Aktif
            </span>

            {isCameraActive && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Kamera Aktif
              </span>
            )}
          </div>

          {/* Zone 2: Navigation Links (Text with active hover indicators) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Time readout & Primary Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentDate}</span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{currentTime}</span>
            </div>

            <button
              onClick={onToggleDarkMode}
              title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onOpenKiosk}
              title="Buka Mode Kiosk Layar Penuh"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
            >
              <Maximize className="w-3.5 h-3.5" />
              <span>Mode Kiosk</span>
            </button>

            <button
              onClick={() => onSelectTab('absensi')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow transition-all whitespace-nowrap"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Mulai</span> Absensi
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Navigation scroll */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 dark:border-slate-800 no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                currentTab === item.id
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
