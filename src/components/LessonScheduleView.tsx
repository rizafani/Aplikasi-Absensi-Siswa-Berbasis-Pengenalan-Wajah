import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Sparkles,
  Camera,
  CheckCircle,
  AlertCircle,
  BookOpen,
  User,
  MapPin,
  ChevronRight,
  RotateCcw,
  Layers,
  ArrowRight,
  Info,
  Timer,
  Play,
} from 'lucide-react';
import { ClassItem, LessonScheduleItem, DayOfWeek } from '../types';

interface LessonScheduleViewProps {
  classes: ClassItem[];
  activeClass: ClassItem;
  schedules: LessonScheduleItem[];
  onSelectClass: (classId: string) => void;
  onSaveSchedule: (schedule: LessonScheduleItem) => void | Promise<void>;
  onDeleteSchedule: (id: string) => void | Promise<void>;
  onCopyScheduleToDay: (classId: string, fromDay: DayOfWeek, toDay: DayOfWeek) => void | Promise<void>;
  onLoadDefaultSchedule: (classId: string) => void | Promise<void>;
  onStartAttendanceForLesson: (classId: string, schedule: LessonScheduleItem) => void;
}

const DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const SUBJECT_PRESETS = [
  'Informatika',
  'Pemrograman Web & Mobile',
  'Basis Data',
  'Jaringan Komputer & Siber',
  'Matematika Tingkat Lanjut',
  'Matematika Wajib',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Fisika Terapan',
  'Kimia Terapan',
  'Biologi',
  'Pendidikan Agama Islam (PAI)',
  'Pendidikan Pancasila (PPKn)',
  'PJOK (Olahraga)',
  'Seni Budaya & Desain',
  'Sejarah Indonesia',
  'Bimbingan Konseling (BK)',
  'Projek P5 (Profil Pancasila)',
  'Upacara Bendera',
  'Pramuka',
];

export const LessonScheduleView: React.FC<LessonScheduleViewProps> = ({
  classes,
  activeClass,
  schedules,
  onSelectClass,
  onSaveSchedule,
  onDeleteSchedule,
  onCopyScheduleToDay,
  onLoadDefaultSchedule,
  onStartAttendanceForLesson,
}) => {
  // Determine current day of week in Indonesian
  const getTodayDayOfWeek = (): DayOfWeek => {
    const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
    switch (dayIndex) {
      case 1:
        return 'Senin';
      case 2:
        return 'Selasa';
      case 3:
        return 'Rabu';
      case 4:
        return 'Kamis';
      case 5:
        return 'Jumat';
      case 6:
        return 'Sabtu';
      default:
        return 'Senin';
    }
  };

  const todayDay = getTodayDayOfWeek();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDay);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LessonScheduleItem | null>(null);
  const [copyTargetDay, setCopyTargetDay] = useState<DayOfWeek>('Selasa');
  const [deleteTargetItem, setDeleteTargetItem] = useState<LessonScheduleItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    jamKe: number;
    day: DayOfWeek;
    startTime: string;
    endTime: string;
    lateToleranceMinutes: number;
    subject: string;
    teacherName: string;
    room: string;
    notes: string;
  }>({
    jamKe: 1,
    day: selectedDay,
    startTime: '07:00',
    endTime: '07:45',
    lateToleranceMinutes: 10,
    subject: 'Informatika',
    teacherName: activeClass.teacherName || '',
    room: activeClass.room || 'Ruang Kelas',
    notes: '',
  });

  // Track live time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setCurrentTimeStr(`${h}:${m}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Filter schedules for the current active class and selected day
  const classSchedules = useMemo(() => {
    return schedules.filter((s) => s.classId === activeClass.id);
  }, [schedules, activeClass.id]);

  const currentDaySchedules = useMemo(() => {
    return classSchedules
      .filter((s) => s.day === selectedDay)
      .sort((a, b) => a.jamKe - b.jamKe || a.startTime.localeCompare(b.startTime));
  }, [classSchedules, selectedDay]);

  // Find currently active ongoing schedule
  const activeOngoingSchedule = useMemo(() => {
    if (!currentTimeStr) return null;
    const [currH, currM] = currentTimeStr.split(':').map(Number);
    const currMinutes = currH * 60 + currM;

    return classSchedules.find((s) => {
      if (s.day !== todayDay) return false;
      const [startH, startM] = s.startTime.split(':').map(Number);
      const [endH, endM] = s.endTime.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      return currMinutes >= startMin && currMinutes <= endMin;
    });
  }, [classSchedules, todayDay, currentTimeStr]);

  // Open modal for add
  const handleOpenAddModal = (defaultJamKe?: number) => {
    const nextJam = defaultJamKe || (currentDaySchedules.length > 0 ? Math.max(...currentDaySchedules.map((s) => s.jamKe)) + 1 : 1);
    
    // Auto calculate next time slot if existing
    let nextStart = '07:00';
    let nextEnd = '07:45';
    if (currentDaySchedules.length > 0) {
      const last = currentDaySchedules[currentDaySchedules.length - 1];
      nextStart = last.endTime;
      const [lh, lm] = last.endTime.split(':').map(Number);
      const endTotal = lh * 60 + lm + 45;
      const eh = Math.floor(endTotal / 60);
      const em = endTotal % 60;
      nextEnd = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
    }

    setEditingItem(null);
    setFormData({
      jamKe: nextJam,
      day: selectedDay,
      startTime: nextStart,
      endTime: nextEnd,
      lateToleranceMinutes: 10,
      subject: '',
      teacherName: activeClass.teacherName || '',
      room: activeClass.room || 'Ruang Kelas',
      notes: '',
    });
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEditModal = (item: LessonScheduleItem) => {
    setEditingItem(item);
    setFormData({
      jamKe: item.jamKe,
      day: item.day,
      startTime: item.startTime,
      endTime: item.endTime,
      lateToleranceMinutes: item.lateToleranceMinutes || 10,
      subject: item.subject,
      teacherName: item.teacherName || '',
      room: item.room || '',
      notes: item.notes || '',
    });
    setIsModalOpen(true);
  };

  // Save submit
  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim()) return;

    const payload: LessonScheduleItem = {
      id: editingItem?.id || `sch-${activeClass.id}-${formData.day.toLowerCase()}-${formData.jamKe}-${Date.now()}`,
      classId: activeClass.id,
      className: activeClass.name,
      day: formData.day,
      jamKe: Number(formData.jamKe),
      startTime: formData.startTime,
      endTime: formData.endTime,
      lateToleranceMinutes: Number(formData.lateToleranceMinutes) || 10,
      subject: formData.subject.trim(),
      teacherName: formData.teacherName.trim(),
      room: formData.room.trim(),
      notes: formData.notes.trim(),
    };

    await onSaveSchedule(payload);
    setIsModalOpen(false);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteTargetItem) return;
    await onDeleteSchedule(deleteTargetItem.id);
    setDeleteTargetItem(null);
  };

  // Execute copy
  const handleExecuteCopy = async () => {
    await onCopyScheduleToDay(activeClass.id, selectedDay, copyTargetDay);
    setIsCopyModalOpen(false);
    setSelectedDay(copyTargetDay);
  };

  return (
    <div className="space-y-6">
      {/* Header & Class Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Jadwal Masuk Presensi Multi-Jam</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              Jadwal Jam Pelajaran Per Kelas
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Atur jadwal jam pelajaran per kelas agar absensi wajah dapat mendeteksi jam dan mata pelajaran yang sedang aktif
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Class Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kelas:</span>
              <select
                value={activeClass.id}
                onChange={(e) => onSelectClass(e.target.value)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => onLoadDefaultSchedule(activeClass.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/60 transition-colors cursor-pointer"
              title="Muat template standar 7-8 jam pelajaran untuk kelas ini"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Template Standar</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jam Pelajaran</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ongoing Lesson Live Banner (Real-Time Status) */}
      {activeOngoingSchedule ? (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <Play className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white text-emerald-800">
                  Sedang Berlangsung Hari Ini ({todayDay})
                </span>
                <span className="text-xs font-mono opacity-90">
                  {activeOngoingSchedule.startTime} – {activeOngoingSchedule.endTime} WIB
                </span>
              </div>
              <h3 className="text-lg font-bold mt-0.5">
                Jam Ke-{activeOngoingSchedule.jamKe}: {activeOngoingSchedule.subject}
              </h3>
              <p className="text-xs text-emerald-100 flex items-center gap-3 mt-0.5">
                {activeOngoingSchedule.teacherName && (
                  <span>Guru: <b>{activeOngoingSchedule.teacherName}</b></span>
                )}
                {activeOngoingSchedule.room && <span>Ruang: <b>{activeOngoingSchedule.room}</b></span>}
                <span>Toleransi Terlambat: <b>+{activeOngoingSchedule.lateToleranceMinutes} Menit</b></span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStartAttendanceForLesson(activeClass.id, activeOngoingSchedule)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-white text-emerald-800 hover:bg-emerald-50 shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-emerald-700" />
            <span>Mulai Absensi Wajah Jam Ini</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              Saat ini ({currentTimeStr || '00:00'} WIB), tidak ada jam pelajaran yang sedang berlangsung untuk kelas <b>{activeClass.name}</b>.
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Total {classSchedules.length} Jam Pelajaran Terdaftar
          </span>
        </div>
      )}

      {/* Days Tabs (Senin - Sabtu) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {DAYS.map((day) => {
            const isSelected = selectedDay === day;
            const isToday = todayDay === day;
            const dayCount = classSchedules.filter((s) => s.day === day).length;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <span>{day}</span>
                {isToday && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                      isSelected ? 'bg-white text-indigo-700' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    Hari Ini
                  </span>
                )}
                <span
                  className={`text-[10px] px-1.5 rounded-full ${
                    isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {dayCount}
                </span>
              </button>
            );
          })}
        </div>

        {currentDaySchedules.length > 0 && (
          <button
            type="button"
            onClick={() => setIsCopyModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Salin Jadwal {selectedDay} ke Hari Lain</span>
          </button>
        )}
      </div>

      {/* Lesson Schedule Cards Grid */}
      {currentDaySchedules.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 mx-auto flex items-center justify-center mb-3">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Belum Ada Jadwal untuk Hari {selectedDay}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5 leading-relaxed">
            Kelas <b>{activeClass.name}</b> belum memiliki jam pelajaran pada hari {selectedDay}. Tambahkan jam pertama atau muat template standar.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleOpenAddModal(1)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
            >
              Tambah Jam Ke-1
            </button>
            <button
              onClick={() => onLoadDefaultSchedule(activeClass.id)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
            >
              Muat Template Standar
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentDaySchedules.map((item) => {
            const isOngoing = activeOngoingSchedule?.id === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                  isOngoing
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                        {item.jamKe}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Jam Ke-{item.jamKe}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{item.startTime} – {item.endTime}</span>
                    </div>
                  </div>

                  {/* Subject Title */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug mt-1">
                    {item.subject}
                  </h3>

                  {/* Teacher & Room metadata */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.teacherName || 'Guru Pengampu belum diisi'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.room || 'Ruang Kelas'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <Timer className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Toleransi Masuk: <b>+{item.lateToleranceMinutes || 10} menit</b></span>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="mt-2 text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl italic">
                      "{item.notes}"
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onStartAttendanceForLesson(activeClass.id, item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                    title="Mulai absensi wajah untuk jam pelajaran ini"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Presensi Wajah</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Jam Pelajaran"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTargetItem(item)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Hapus Jam Pelajaran"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Jam Pelajaran */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingItem ? 'Edit Jam Pelajaran' : 'Tambah Jam Pelajaran Baru'}
                </h3>
                <p className="text-xs text-slate-500">
                  Kelas {activeClass.name} · Hari {formData.day}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitSchedule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hari Pelajaran:
                  </label>
                  <select
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: e.target.value as DayOfWeek })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Ke (Urutan):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={formData.jamKe}
                    onChange={(e) => setFormData({ ...formData, jamKe: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Waktu Mulai:
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Waktu Selesai:
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1" title="Menit toleransi setelah jam mulai sebelum dihitung terlambat">
                    Toleransi (Mnt):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="45"
                    required
                    value={formData.lateToleranceMinutes}
                    onChange={(e) => setFormData({ ...formData, lateToleranceMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Subject with Quick Presets */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Mata Pelajaran:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pemrograman Web, Matematika..."
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 self-center">Pilihan cepat:</span>
                  {SUBJECT_PRESETS.slice(0, 8).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormData({ ...formData, subject: preset })}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teacher & Room */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Guru Pengampu:
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Bapak/Ibu Guru..."
                    value={formData.teacherName}
                    onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ruang / Lab:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Lab Komputer 1, Ruang XI..."
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Keterangan Khusus (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Membawa laptop, pakaian olahraga, dll."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-md"
                >
                  Simpan Jam Pelajaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Copy Schedule To Another Day */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 mx-auto flex items-center justify-center mb-3">
              <Copy className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Salin Jadwal Hari {selectedDay}?
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Seluruh ({currentDaySchedules.length}) jam pelajaran hari <b>{selectedDay}</b> untuk kelas <b>{activeClass.name}</b> akan diduplikasi ke hari target yang dipilih.
            </p>

            <div className="text-left mb-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pilih Hari Tujuan:
              </label>
              <select
                value={copyTargetDay}
                onChange={(e) => setCopyTargetDay(e.target.value as DayOfWeek)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
              >
                {DAYS.filter((d) => d !== selectedDay).map((d) => (
                  <option key={d} value={d}>
                    Hari {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteCopy}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                Salin Jadwal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Hapus Jam Pelajaran?
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Yakin ingin menghapus Jam Ke-{deleteTargetItem.jamKe} ({deleteTargetItem.subject}) pada hari {deleteTargetItem.day} untuk kelas {activeClass.name}?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetItem(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
