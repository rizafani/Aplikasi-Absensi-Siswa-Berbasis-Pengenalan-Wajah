import React from 'react';
import { X, CheckCircle, AlertCircle, Calendar, Clock, ShieldCheck, UserCheck, Phone, FileText } from 'lucide-react';
import { Student, AttendanceRecord, ClassConfig } from '../types';

interface StudentProfileModalProps {
  student: Student | null;
  records: AttendanceRecord[];
  config: ClassConfig;
  onClose: () => void;
  onGoToRegistration: (studentId: string) => void;
  onUpdateTodayStatus?: (studentId: string, status: AttendanceRecord['status']) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  records,
  config,
  onClose,
  onGoToRegistration,
  onUpdateTodayStatus,
}) => {
  if (!student) return null;

  const studentRecords = records.filter((r) => r.studentId === student.id);
  const hadir = studentRecords.filter((r) => r.status === 'hadir').length;
  const terlambat = studentRecords.filter((r) => r.status === 'terlambat').length;
  const sakit = studentRecords.filter((r) => r.status === 'sakit').length;
  const izin = studentRecords.filter((r) => r.status === 'izin').length;
  const alpa = studentRecords.filter((r) => r.status === 'alpa').length;

  const totalEffective = hadir + terlambat + sakit + izin + alpa;
  const attendanceRate = totalEffective > 0 ? (((hadir + terlambat) / totalEffective) * 100).toFixed(1) : '100.0';

  // Check today record
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = studentRecords.find((r) => r.date === todayStr);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="relative">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white/80 shadow-md bg-white"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-indigo-950/40 border-2 border-white/80 flex items-center justify-center text-2xl font-bold text-white shadow-md">
                  {student.name.charAt(0)}
                </div>
              )}
              <span
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center ${
                  student.faceRegistered ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}
                title={student.faceRegistered ? 'Wajah Terdaftar' : 'Belum Registrasi Wajah'}
              >
                {student.faceRegistered ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
              </span>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-indigo-200 font-semibold">Profil Siswa</div>
              <h3 className="text-xl font-bold leading-tight">{student.name}</h3>
              <p className="text-xs text-indigo-100 font-mono mt-0.5">
                NIS: {student.nis} {student.nisn ? `· NISN: ${student.nisn}` : ''}
              </p>
              <p className="text-xs text-indigo-200 mt-1">
                {student.className || config.className || 'Kelas'} · {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Face Registration Status Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
              student.faceRegistered
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <div>
                <span className="font-semibold">
                  {student.faceRegistered ? 'Wajah Terdaftar' : 'Wajah Belum Terdaftar'}
                </span>
                {student.registeredAt && (
                  <span className="block text-[11px] opacity-80">Terdaftar pada: {student.registeredAt}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onGoToRegistration(student.id);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {student.faceRegistered ? 'Perbarui Wajah' : 'Daftarkan Wajah'}
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Statistik Kehadiran
              </span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                {attendanceRate}% Kehadiran
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  {hadir}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Hadir</div>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                  {terlambat}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Terlambat</div>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                  {sakit}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Sakit</div>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
                  {izin}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Izin</div>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                  {alpa}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Alpa</div>
              </div>
            </div>
          </div>

          {/* Today's Status & Quick Action */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Status Presensi Hari Ini:
              </span>
              {todayRecord ? (
                <span
                  className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                    todayRecord.status === 'hadir'
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                      : todayRecord.status === 'terlambat'
                      ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
                  }`}
                >
                  {todayRecord.status} ({todayRecord.time})
                </span>
              ) : (
                <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Belum Presensi</span>
              )}
            </div>

            {onUpdateTodayStatus && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500">Tandai:</span>
                {(['hadir', 'terlambat', 'sakit', 'izin', 'alpa'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => onUpdateTodayStatus(student.id, st)}
                    className="px-2 py-1 text-[11px] font-medium rounded capitalize bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contact & Notes */}
          {(student.phone || student.notes) && (
            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
              {student.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>No. Telp / WhatsApp: {student.phone}</span>
                </div>
              )}
              {student.notes && (
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Catatan: {student.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Recent Attendance Log */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Riwayat Kehadiran Terakhir
            </div>
            {studentRecords.length === 0 ? (
              <div className="text-xs text-slate-400 py-3 text-center italic">Belum ada riwayat presensi tercatat</div>
            ) : (
              <div className="space-y-1.5">
                {studentRecords.slice(0, 5).map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{rec.date}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-slate-500">{rec.time}</span>
                    </div>
                    <span
                      className={`font-semibold capitalize text-[11px] ${
                        rec.status === 'hadir'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : rec.status === 'terlambat'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
