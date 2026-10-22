import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Clock3,
  HeartPulse,
  MailQuestion,
  AlertTriangle,
  Camera,
  Search,
  Download,
  Filter,
  TrendingUp,
  School,
  Sparkles,
} from 'lucide-react';
import { ClassConfig, Student, AttendanceRecord, AttendanceStatus, ClassItem } from '../types';
import { exportService } from '../services/exportService';

interface DashboardViewProps {
  config: ClassConfig;
  classes: ClassItem[];
  activeClass: ClassItem;
  students: Student[];
  records: AttendanceRecord[];
  todayStr: string;
  onSelectClass: (classId: string) => void;
  onNavigate: (tab: string) => void;
  onSelectStudent: (student: Student) => void;
  onUpdateStatus: (recordId: string, status: AttendanceStatus) => void;
  onManualMarkAttendance: (studentId: string, status: AttendanceStatus) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  config,
  classes,
  activeClass,
  students,
  records,
  todayStr,
  onSelectClass,
  onNavigate,
  onSelectStudent,
  onUpdateStatus,
  onManualMarkAttendance,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus | 'belum'>('all');
  const [viewScope, setViewScope] = useState<'class' | 'all'>('class');

  // Filter students by scope (active class vs all classes)
  const scopedStudents = viewScope === 'class'
    ? students.filter((s) => s.classId === activeClass.id)
    : students;

  // Today's attendance records for the scope
  const todayRecords = records.filter((r) => r.date === todayStr);
  const scopedTodayRecords = viewScope === 'class'
    ? todayRecords.filter((r) => r.classId === activeClass.id || scopedStudents.some((s) => s.id === r.studentId))
    : todayRecords;

  const totalStudents = scopedStudents.length;
  const hadirCount = scopedTodayRecords.filter((r) => r.status === 'hadir').length;
  const terlambatCount = scopedTodayRecords.filter((r) => r.status === 'terlambat').length;
  const sakitCount = scopedTodayRecords.filter((r) => r.status === 'sakit').length;
  const izinCount = scopedTodayRecords.filter((r) => r.status === 'izin').length;

  const explicitAlpaCount = scopedTodayRecords.filter((r) => r.status === 'alpa').length;
  const belumAbsenCount = Math.max(0, totalStudents - scopedTodayRecords.length);
  const totalAlpaCount = explicitAlpaCount + belumAbsenCount;

  const totalAttended = hadirCount + terlambatCount;
  const attendanceRate = totalStudents > 0 ? ((totalAttended / totalStudents) * 100).toFixed(1) : '0';

  const registeredCount = scopedStudents.filter((s) => s.faceRegistered).length;

  // Filtered student list for table
  const filteredStudents = scopedStudents.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.className && student.className.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    const record = scopedTodayRecords.find((r) => r.studentId === student.id);

    if (statusFilter === 'all') return true;
    if (statusFilter === 'belum') return !record;
    return record?.status === statusFilter;
  });

  const handleExportToday = () => {
    const classNameStr = viewScope === 'class' ? activeClass.name : 'Semua_Kelas';
    exportService.exportTodayAttendanceToExcel(
      scopedTodayRecords,
      scopedStudents,
      classNameStr,
      config.schoolName,
      todayStr
    );
  };

  const formattedDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* 1. DATA KELAS Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <School className="w-4 h-4" />
              <span>{config.schoolName}</span>
              <span>·</span>
              <span>Multi-Kelas Aktif ({classes.length} Kelas)</span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {viewScope === 'class' ? activeClass.name : 'Seluruh Kelas Sekolah'}
              </h1>

              {/* Class Switcher inside Banner */}
              <select
                value={activeClass.id}
                onChange={(e) => {
                  onSelectClass(e.target.value);
                  setViewScope('class');
                }}
                className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Pindah ke: {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              {viewScope === 'class' && (
                <>
                  <div>
                    Wali Kelas: <span className="font-semibold text-slate-700 dark:text-slate-200">{activeClass.teacherName}</span>
                  </div>
                  {activeClass.room && (
                    <>
                      <span>·</span>
                      <div>Ruang: <span className="font-semibold text-slate-700 dark:text-slate-200">{activeClass.room}</span></div>
                    </>
                  )}
                  <span>·</span>
                </>
              )}
              <div>
                Tahun Pelajaran: <span className="font-semibold text-slate-700 dark:text-slate-200">{config.academicYear}</span>
              </div>
              <span className="hidden sm:inline">·</span>
              <div className="text-slate-600 dark:text-slate-300 font-mono text-xs">
                {formattedDate}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Scope Toggle */}
            <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewScope('class')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewScope === 'class'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Kelas Ini
              </button>
              <button
                type="button"
                onClick={() => setViewScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewScope === 'all'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Semua Kelas
              </button>
            </div>

            <button
              onClick={() => onNavigate('absensi')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Buka Kamera Absensi</span>
            </button>
            <button
              onClick={() => onNavigate('pengaturan')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span>Kelola Kelas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Statistik Presensi Hari Ini ({viewScope === 'class' ? activeClass.name : 'Seluruh Sekolah'})
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold font-mono">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{attendanceRate}% Kehadiran Siswa</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Total Siswa */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Jumlah Siswa</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {totalStudents}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {registeredCount} wajah terdaftar
            </div>
          </div>

          {/* Hadir */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-900/60 shadow-sm bg-emerald-50/20 dark:bg-emerald-950/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Hadir</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {hadirCount}
            </div>
            <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
              Tepat waktu (≤ {config.presentEndTime})
            </div>
          </div>

          {/* Terlambat */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-amber-200 dark:border-amber-900/60 shadow-sm bg-amber-50/20 dark:bg-amber-950/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Terlambat</span>
              <Clock3 className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
              {terlambatCount}
            </div>
            <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1">
              Masuk setelah {config.presentEndTime}
            </div>
          </div>

          {/* Sakit */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-blue-200 dark:border-blue-900/60 shadow-sm bg-blue-50/20 dark:bg-blue-950/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Sakit</span>
              <HeartPulse className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
              {sakitCount}
            </div>
            <div className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-1">
              Surat dokter / medis
            </div>
          </div>

          {/* Izin */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-purple-200 dark:border-purple-900/60 shadow-sm bg-purple-50/20 dark:bg-purple-950/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">Izin</span>
              <MailQuestion className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-600 dark:text-purple-400 tabular-nums">
              {izinCount}
            </div>
            <div className="text-[11px] text-purple-600/80 dark:text-purple-400/80 mt-1">
              Permohonan orang tua
            </div>
          </div>

          {/* Alpa / Belum Hadir */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-rose-200 dark:border-rose-900/60 shadow-sm bg-rose-50/20 dark:bg-rose-950/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Alpa / Belum</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
              {totalAlpaCount}
            </div>
            <div className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-1">
              {belumAbsenCount} siswa belum presensi
            </div>
          </div>
        </div>
      </div>

      {/* Today's Attendance Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Daftar Presensi Hari Ini
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pantau status kehadiran siswa kelas {viewScope === 'class' ? activeClass.name : 'seluruh kelas'} secara real-time
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari siswa atau NIS..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'hadir', label: 'Hadir' },
                  { id: 'terlambat', label: 'Terlambat' },
                  { id: 'sakit', label: 'Sakit' },
                  { id: 'izin', label: 'Izin' },
                  { id: 'alpa', label: 'Alpa' },
                  { id: 'belum', label: 'Belum' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Export Excel */}
            <button
              onClick={handleExportToday}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              title="Unduh laporan presensi hari ini ke format Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4 w-28">NIS</th>
                <th className="py-3 px-4 w-28">Kelas</th>
                <th className="py-3 px-4 w-24">Wajah</th>
                <th className="py-3 px-4 w-24 text-center">Jam</th>
                <th className="py-3 px-4 w-28 text-center">Status</th>
                <th className="py-3 px-4 w-44 text-right">Ubah Status Manual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Tidak ada siswa yang cocok dengan filter atau kelas ini belum memiliki siswa.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const record = scopedTodayRecords.find((r) => r.studentId === student.id);
                  const studentClass = classes.find((c) => c.id === student.classId);

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-mono text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => onSelectStudent(student)}
                          className="flex items-center gap-3 text-left group"
                        >
                          {student.photoUrl ? (
                            <img
                              src={student.photoUrl}
                              alt={student.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-white"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                              {student.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {student.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                              {record?.notes ? ` · ${record.notes}` : ''}
                            </div>
                          </div>
                        </button>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                        {student.nis}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
                          {studentClass?.name || student.className || 'Kelas'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-medium text-[11px] ${
                            student.faceRegistered
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              student.faceRegistered ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                          {student.faceRegistered ? 'Terdaftar' : 'Belum'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {record ? record.time.slice(0, 5) : '-'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {record ? (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                              record.status === 'hadir'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : record.status === 'terlambat'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : record.status === 'sakit'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : record.status === 'izin'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {record.status}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800">
                            Belum Absen
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {(['hadir', 'terlambat', 'sakit', 'izin', 'alpa'] as const).map((st) => {
                            const isCurrent = record?.status === st;
                            return (
                              <button
                                key={st}
                                onClick={() => {
                                  if (record) {
                                    onUpdateStatus(record.id, st);
                                  } else {
                                    onManualMarkAttendance(student.id, st);
                                  }
                                }}
                                title={`Tandai ${st.toUpperCase()}`}
                                className={`px-1.5 py-1 rounded text-[10px] font-semibold uppercase transition-colors ${
                                  isCurrent
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                {st.slice(0, 3)}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
