import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  Download,
  Users,
  Search,
  CheckCircle2,
  Clock,
  HeartPulse,
  MailQuestion,
  AlertTriangle,
} from 'lucide-react';
import { Student, AttendanceRecord, ClassConfig, StudentRekapRow, ClassItem } from '../types';
import { exportService } from '../services/exportService';

interface RekapViewProps {
  students: Student[];
  records: AttendanceRecord[];
  config: ClassConfig;
  classes?: ClassItem[];
  activeClass?: ClassItem;
  onSelectClass?: (classId: string) => void;
  onSelectStudent: (student: Student) => void;
}

type PeriodType = 'hari' | 'minggu' | 'bulan' | 'rentang';

export const RekapView: React.FC<RekapViewProps> = ({
  students,
  records,
  config,
  classes = [],
  activeClass,
  onSelectClass,
  onSelectStudent,
}) => {
  const [period, setPeriod] = useState<PeriodType>('bulan');
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>(activeClass?.id || 'all');

  // Date ranges
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Default start date for custom range (7 days ago)
  const defaultStartDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const [customStart, setCustomStart] = useState<string>(defaultStartDate);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  const selectedClass = classes.find((c) => c.id === classFilter);
  const currentClassName = selectedClass?.name || activeClass?.name || config.className || 'Semua Kelas';
  const currentTeacherName = selectedClass?.teacherName || activeClass?.teacherName || config.teacherName || 'Guru';

  // Filter students by class
  const scopedStudents = useMemo(() => {
    if (classFilter === 'all') return students;
    return students.filter((s) => s.classId === classFilter);
  }, [students, classFilter]);

  // Filter records based on selected period
  const { filteredRecords, periodLabel } = useMemo(() => {
    let startDate = '';
    let endDate = todayStr;
    let label = '';

    if (period === 'hari') {
      startDate = todayStr;
      label = `Hari Ini (${today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })})`;
    } else if (period === 'minggu') {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      startDate = monday.toISOString().split('T')[0];
      label = `Minggu Ini (${startDate} s.d. ${endDate})`;
    } else if (period === 'bulan') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      startDate = `${year}-${month}-01`;
      label = `Bulan ${today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
    } else {
      startDate = customStart;
      endDate = customEnd;
      label = `${startDate} s.d. ${endDate}`;
    }

    const filtered = records.filter((r) => r.date >= startDate && r.date <= endDate);
    return { filteredRecords: filtered, periodLabel: label };
  }, [period, records, customStart, customEnd, todayStr]);

  // Aggregate rekap for each student
  const rekapRows: StudentRekapRow[] = useMemo(() => {
    return scopedStudents.map((student) => {
      const studentRecs = filteredRecords.filter((r) => r.studentId === student.id);
      const hadir = studentRecs.filter((r) => r.status === 'hadir').length;
      const terlambat = studentRecs.filter((r) => r.status === 'terlambat').length;
      const sakit = studentRecs.filter((r) => r.status === 'sakit').length;
      const izin = studentRecs.filter((r) => r.status === 'izin').length;
      const alpa = studentRecs.filter((r) => r.status === 'alpa').length;

      const totalEffective = hadir + terlambat + sakit + izin + alpa;
      const percent = totalEffective > 0 ? ((hadir + terlambat) / totalEffective) * 100 : 100;

      return {
        student,
        hadir,
        terlambat,
        sakit,
        izin,
        alpa,
        totalDays: totalEffective,
        attendancePercent: percent,
      };
    });
  }, [scopedStudents, filteredRecords]);

  // Search filtered rows
  const visibleRows = rekapRows.filter((r) =>
    r.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.student.nis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Totals
  const totalHadir = rekapRows.reduce((acc, r) => acc + r.hadir, 0);
  const totalTerlambat = rekapRows.reduce((acc, r) => acc + r.terlambat, 0);
  const totalSakit = rekapRows.reduce((acc, r) => acc + r.sakit, 0);
  const totalIzin = rekapRows.reduce((acc, r) => acc + r.izin, 0);
  const totalAlpa = rekapRows.reduce((acc, r) => acc + r.alpa, 0);

  // Handle Export to Excel
  const handleExportCSV = () => {
    exportService.exportRekapToExcel(rekapRows, currentClassName, config.schoolName, periodLabel);
  };

  // Handle Print / PDF
  const handlePrint = () => {
    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 40px;">No</th>
            <th style="width: 90px;">NIS</th>
            <th>Nama Siswa</th>
            <th class="text-center" style="width: 50px;">L/P</th>
            <th class="text-center" style="width: 60px;">Hadir</th>
            <th class="text-center" style="width: 70px;">Terlambat</th>
            <th class="text-center" style="width: 60px;">Sakit</th>
            <th class="text-center" style="width: 60px;">Izin</th>
            <th class="text-center" style="width: 60px;">Alpa</th>
            <th class="text-right" style="width: 80px;">% Kehadiran</th>
          </tr>
        </thead>
        <tbody>
          ${rekapRows
            .map(
              (r, idx) => `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td>${r.student.nis}</td>
              <td><b>${r.student.name}</b></td>
              <td class="text-center">${r.student.gender}</td>
              <td class="text-center">${r.hadir}</td>
              <td class="text-center">${r.terlambat}</td>
              <td class="text-center">${r.sakit}</td>
              <td class="text-center">${r.izin}</td>
              <td class="text-center">${r.alpa}</td>
              <td class="text-right"><b>${r.attendancePercent.toFixed(1)}%</b></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;

    exportService.printReport(
      config.schoolName,
      currentClassName,
      currentTeacherName,
      config.academicYear,
      'REKAPITULASI PRESENSI SISWA',
      `Periode: ${periodLabel}`,
      tableHtml
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">
              Laporan & Rekapitulasi Multi-Kelas
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Rekap Presensi {currentClassName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Periode Aktif: <span className="font-semibold text-slate-700 dark:text-slate-200">{periodLabel}</span> · Wali/Guru: {currentTeacherName}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Multi-Class Filter */}
            {classes.length > 0 && (
              <select
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  if (onSelectClass && e.target.value !== 'all') {
                    onSelectClass(e.target.value);
                  }
                }}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold cursor-pointer focus:outline-none"
              >
                <option value="all">Semua Kelas ({students.length} Siswa)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            {/* Period selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {(
                [
                  { id: 'hari', label: 'Hari Ini' },
                  { id: 'minggu', label: 'Minggu' },
                  { id: 'bulan', label: 'Bulan' },
                  { id: 'rentang', label: 'Rentang' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    period === p.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            {period === 'rentang' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-400">s/d</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            )}

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Hadir</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {totalHadir}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Terlambat</span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {totalTerlambat}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Sakit</span>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
            {totalSakit}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Izin</span>
          <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
            {totalIzin}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Alpa</span>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
            {totalAlpa}
          </div>
        </div>
      </div>

      {/* Rekap Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="relative max-w-xs flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari siswa..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="text-xs text-slate-400">
            Klik nama siswa untuk melihat profil lengkap
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-28">NIS</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4 w-14 text-center">L/P</th>
                <th className="py-3 px-4 w-20 text-center text-emerald-600 dark:text-emerald-400">Hadir</th>
                <th className="py-3 px-4 w-20 text-center text-amber-600 dark:text-amber-400">Terlambat</th>
                <th className="py-3 px-4 w-20 text-center text-blue-600 dark:text-blue-400">Sakit</th>
                <th className="py-3 px-4 w-20 text-center text-purple-600 dark:text-purple-400">Izin</th>
                <th className="py-3 px-4 w-20 text-center text-rose-600 dark:text-rose-400">Alpa</th>
                <th className="py-3 px-4 w-28 text-right">% Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    Tidak ada data rekapitulasi.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, idx) => (
                  <tr
                    key={row.student.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-mono text-slate-400 tabular-nums">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                      {row.student.nis}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <button
                        onClick={() => onSelectStudent(row.student)}
                        className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
                      >
                        {row.student.name}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-center font-semibold text-slate-500">
                      {row.student.gender}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {row.hadir}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      {row.terlambat}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                      {row.sakit}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-semibold tabular-nums text-purple-600 dark:text-purple-400">
                      {row.izin}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                      {row.alpa}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                      {row.attendancePercent.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
