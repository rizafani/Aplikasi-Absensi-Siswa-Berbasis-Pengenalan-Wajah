import React, { useState, useRef } from 'react';
import {
  Save,
  RotateCcw,
  Download,
  Upload,
  AlertTriangle,
  Volume2,
  Eye,
  ShieldCheck,
  Clock,
  School,
  FileText,
  Trash2,
  CheckCircle,
  Plus,
  Edit2,
  Check,
  X,
  Layers,
  Zap,
  Sparkles,
} from 'lucide-react';
import { ClassConfig, AuditLog, ClassItem } from '../types';
import { speechService } from '../services/speechService';
import { storageService } from '../services/storageService';

interface SettingsViewProps {
  config: ClassConfig;
  classes: ClassItem[];
  activeClass: ClassItem;
  auditLogs: AuditLog[];
  onSaveConfig: (config: ClassConfig) => void;
  onSaveClass?: (cls: ClassItem) => void;
  onDeleteClass?: (classId: string) => void;
  onSelectClass?: (classId: string) => void;
  onResetToday: () => void;
  onRestoreAll: (jsonStr: string) => boolean;
  onResetToDefault: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  classes = [],
  activeClass,
  auditLogs,
  onSaveConfig,
  onSaveClass,
  onDeleteClass,
  onSelectClass,
  onResetToday,
  onRestoreAll,
  onResetToDefault,
}) => {
  const [formData, setFormData] = useState<ClassConfig>({ ...config });
  const [saveToast, setSaveToast] = useState(false);
  const [showResetTodayModal, setShowResetTodayModal] = useState(false);
  const [showResetAllModal, setShowResetAllModal] = useState(false);

  // Class Management State
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [classFormData, setClassFormData] = useState<ClassItem>({
    id: '',
    name: '',
    teacherName: '',
    academicYear: config.academicYear || '2026/2027',
    room: '',
    presentEndTime: config.presentEndTime || '07:30',
    lateEndTime: config.lateEndTime || '08:00',
  });
  const [deleteClassTarget, setDeleteClassTarget] = useState<ClassItem | null>(null);

  const [statusNotification, setStatusNotification] = useState<{ message: string; isError?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showNotification = (message: string, isError = false) => {
    setStatusNotification({ message, isError });
    setTimeout(() => setStatusNotification(null), 4000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleTestVoice = () => {
    speechService.speakSuccess('Ahmad Fauzan');
  };

  const handleBackup = () => {
    const jsonStr = storageService.exportAllData();
    const dateStr = new Date().toISOString().split('T')[0];
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const currentClassName = activeClass?.name || config.className || 'Semua_Kelas';
    a.download = `Backup_Absensi_${currentClassName.replace(/\s+/g, '_')}_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('File cadangan berhasil diunduh.');
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = onRestoreAll(content);
        if (ok) {
          showNotification('Data berhasil dipulihkan dari cadangan JSON.');
        } else {
          showNotification('Format file cadangan tidak valid.', true);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Class Management Handlers
  const handleOpenAddClass = () => {
    setEditingClass(null);
    setClassFormData({
      id: `class-${Date.now().toString(36)}`,
      name: '',
      teacherName: '',
      academicYear: formData.academicYear || '2026/2027',
      room: '',
      presentEndTime: formData.presentEndTime || '07:30',
      lateEndTime: formData.lateEndTime || '08:00',
    });
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (item: ClassItem) => {
    setEditingClass(item);
    setClassFormData({ ...item });
    setIsClassModalOpen(true);
  };

  const handleSaveClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classFormData.name.trim() || !classFormData.teacherName.trim()) {
      showNotification('Nama kelas dan nama wali/guru wajib diisi!', true);
      return;
    }

    if (onSaveClass) {
      onSaveClass(classFormData);
      showNotification(`Kelas ${classFormData.name} berhasil disimpan!`);
    }
    setIsClassModalOpen(false);
  };

  const handleDeleteClassConfirm = () => {
    if (!deleteClassTarget) return;
    if (classes.length <= 1) {
      showNotification('Minimal harus ada 1 kelas terdaftar!', true);
      setDeleteClassTarget(null);
      return;
    }

    if (onDeleteClass) {
      onDeleteClass(deleteClassTarget.id);
      showNotification(`Kelas ${deleteClassTarget.name} berhasil dihapus.`);
    }
    setDeleteClassTarget(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">
              Konfigurasi & Pengelolaan
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Pengaturan Sekolah & Daftar Kelas
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Kelola daftar banyak kelas, identitas sekolah, rentang jam masuk, dan pengenalan wajah
            </p>
          </div>

          <div className="flex items-center gap-2">
            {statusNotification && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold animate-in fade-in ${
                  statusNotification.isError
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                <span>{statusNotification.message}</span>
              </div>
            )}

            {saveToast && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Pengaturan Tersimpan</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 1: Manajemen Daftar Kelas (BANYAK KELAS) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                1. Manajemen Daftar Kelas (Banyak Kelas)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aplikasi mendukung banyak kelas. Tambah, edit wali kelas, atau pilih kelas yang sedang aktif.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddClass}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kelas</span>
          </button>
        </div>

        {/* Classes Table */}
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">No</th>
                <th className="py-2.5 px-3">Nama Kelas</th>
                <th className="py-2.5 px-3">Wali Kelas / Guru</th>
                <th className="py-2.5 px-3">Ruangan</th>
                <th className="py-2.5 px-3 text-center">Status Aktif</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {classes.map((cls, idx) => {
                const isActive = cls.id === activeClass?.id || cls.id === formData.activeClassId;
                return (
                  <tr
                    key={cls.id}
                    className={`transition-colors ${
                      isActive
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {cls.name}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                      {cls.teacherName}
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                      {cls.room || '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          <Check className="w-3 h-3" />
                          <span>Kelas Aktif</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectClass) onSelectClass(cls.id);
                            setFormData((prev) => ({ ...prev, activeClassId: cls.id }));
                            showNotification(`Kelas aktif dialihkan ke ${cls.name}`);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Pilih Aktif
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditClass(cls)}
                          title="Edit Kelas"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteClassTarget(cls)}
                          disabled={classes.length <= 1}
                          title="Hapus Kelas"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 2: Data Identitas Sekolah & Tahun Pelajaran */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <School className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              2. Identitas Sekolah & Tahun Pelajaran
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Sekolah
              </label>
              <input
                type="text"
                required
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tahun Pelajaran
              </label>
              <input
                type="text"
                required
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                placeholder="2026/2027"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Aturan Jam Masuk & Status Kehadiran */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              3. Aturan Waktu & Ambang Batas Status Kehadiran
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jam Mulai Presensi
              </label>
              <input
                type="time"
                value={formData.presentStartTime}
                onChange={(e) => setFormData({ ...formData, presentStartTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Waktu pembukaan scanner (misal 06:30)</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batas Jam Tepat Waktu (HADIR)
              </label>
              <input
                type="time"
                value={formData.presentEndTime}
                onChange={(e) => setFormData({ ...formData, presentEndTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Hingga jam ini status = HADIR (07:30)</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batas Jam Terlambat (TERLAMBAT)
              </label>
              <input
                type="time"
                value={formData.lateEndTime}
                onChange={(e) => setFormData({ ...formData, lateEndTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Hingga jam ini = TERLAMBAT (08:00)</span>
            </div>
          </div>

          <div className="pt-2 text-xs">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Status Setelah Melewati Batas Terlambat ({formData.lateEndTime} ke atas):
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="afterLateStatus"
                  value="terlambat"
                  checked={formData.afterLateStatus === 'terlambat'}
                  onChange={() => setFormData({ ...formData, afterLateStatus: 'terlambat' })}
                  className="w-4 h-4 text-indigo-600 accent-indigo-600"
                />
                <span>Tetap catat sebagai TERLAMBAT</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="afterLateStatus"
                  value="alpa"
                  checked={formData.afterLateStatus === 'alpa'}
                  onChange={() => setFormData({ ...formData, afterLateStatus: 'alpa' })}
                  className="w-4 h-4 text-indigo-600 accent-indigo-600"
                />
                <span>Tandai sebagai ALPA</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Fitur Face Recognition, Liveness & Audio */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              4. Pengenalan Wajah & Audio
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            {/* Sound Feedback Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">
                  Umpan Balik Suara Bahasa Indonesia (Text-to-Speech)
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Mengucapkan konfirmasi suara &quot;Absensi berhasil. Selamat belajar&quot; dan notifikasi lainnya.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestVoice}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300"
                >
                  Tes Suara
                </button>
                <input
                  type="checkbox"
                  checked={formData.soundEnabled}
                  onChange={(e) => setFormData({ ...formData, soundEnabled: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Fast Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
              <div className="pr-3">
                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Mode Cepat & Optimasi Kamera Kualitas Rendah (3x Lebih Cepat)</span>
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                  Menggunakan resolusi inferensi adaptif dan ambang batas sensitif sehingga kamera resolusi rendah (webcam 480p/laptop murah) mendeteksi wajah secara instan tanpa lag.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.fastModeEnabled !== false}
                onChange={(e) => setFormData({ ...formData, fastModeEnabled: e.target.checked })}
                className="w-5 h-5 rounded text-amber-600 accent-amber-600 cursor-pointer shrink-0"
              />
            </div>

            {/* Low-Light Enhancement Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40">
              <div className="pr-3">
                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Peningkat Kontras & Cahaya Otomatis (Low-Light & Noise Boost)</span>
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                  Secara cerdas meningkatkan kontras fitur wajah pada pencahayaan redup atau kamera berbintik (grainy) menggunakan akselerasi GPU perangkat.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.lowLightEnhance !== false}
                onChange={(e) => setFormData({ ...formData, lowLightEnhance: e.target.checked })}
                className="w-5 h-5 rounded text-indigo-600 accent-indigo-600 cursor-pointer shrink-0"
              />
            </div>

            {/* Recognition Threshold & Cooldown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Durasi Tampil Pop-up Notifikasi: {formData.autoCaptureCooldown} Detik
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={formData.autoCaptureCooldown}
                  onChange={(e) =>
                    setFormData({ ...formData, autoCaptureCooldown: parseInt(e.target.value) || 5 })
                  }
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Lama pop-up kartu absensi tampil di layar sebelum otomatis hilang (standar 5 detik)
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ambang Batas Toleransi Biometrik: {(formData.recognitionThreshold * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.38"
                  max="0.48"
                  step="0.01"
                  value={formData.recognitionThreshold}
                  onChange={(e) =>
                    setFormData({ ...formData, recognitionThreshold: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  44% - 46% sangat direkomendasikan untuk membedakan wajah satu siswa dengan siswa lainnya secara presisi dan mencegah salah mengenali.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Semua Pengaturan</span>
          </button>
        </div>
      </form>

      {/* Section 5: Cadangan, Pemulihan, & Tindakan Bahaya */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            5. Cadangan Data & Tindakan Pemeliharaan
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <button
            type="button"
            onClick={handleBackup}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-start gap-3 transition-colors cursor-pointer"
          >
            <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                Cadangkan Data (Backup JSON)
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                Unduh seluruh data siswa, template wajah biometrik, riwayat absensi, dan pengaturan ke file JSON.
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-start gap-3 transition-colors cursor-pointer"
          >
            <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                Pulihkan Data (Restore JSON)
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                Unggah file JSON cadangan untuk memulihkan seluruh data aplikasi.
              </span>
            </div>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleRestoreFile}
            accept=".json"
            className="hidden"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowResetTodayModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 transition-colors"
          >
            Reset Presensi Hari Ini
          </button>

          <button
            type="button"
            onClick={() => setShowResetAllModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 transition-colors"
          >
            Reset Semua Data ke Contoh Awal
          </button>
        </div>
      </div>

      {/* Section 6: Log Aktivitas Sistem (Audit Log) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              6. Log Aktivitas & Keamanan Data (Audit Log)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">{auditLogs.length} catatan</span>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
          {auditLogs.length === 0 ? (
            <div className="text-center py-4 text-slate-400">Belum ada aktivitas tercatat.</div>
          ) : (
            auditLogs.slice(0, 15).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
              >
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">[{log.action}] </span>
                  <span className="text-slate-600 dark:text-slate-300">{log.detail}</span>
                </div>
                <div className="font-mono text-[11px] text-slate-400 shrink-0 ml-3">{log.timestamp}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal: Tambah / Edit Kelas */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingClass ? 'Edit Data Kelas' : 'Tambah Kelas Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsClassModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClassSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Kelas *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: XI Informatika 3"
                  value={classFormData.name}
                  onChange={(e) => setClassFormData({ ...classFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Wali Kelas / Guru Pengampu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Drs. H. Ahmad Dahlan"
                  value={classFormData.teacherName}
                  onChange={(e) => setClassFormData({ ...classFormData, teacherName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ruangan / Lab
                  </label>
                  <input
                    type="text"
                    placeholder="Lab Komputer 3"
                    value={classFormData.room || ''}
                    onChange={(e) => setClassFormData({ ...classFormData, room: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tahun Pelajaran
                  </label>
                  <input
                    type="text"
                    placeholder="2026/2027"
                    value={classFormData.academicYear}
                    onChange={(e) => setClassFormData({ ...classFormData, academicYear: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  {editingClass ? 'Simpan Perubahan' : 'Tambahkan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Hapus Kelas Confirmation */}
      {deleteClassTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Hapus Kelas {deleteClassTarget.name}?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              Anda yakin ingin menghapus data kelas <b>{deleteClassTarget.name}</b>?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteClassTarget(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteClassConfirm}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
              >
                Hapus Kelas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset Today Attendance Confirmation */}
      {showResetTodayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Reset Presensi Hari Ini?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              Seluruh catatan presensi siswa untuk hari ini akan dihapus sehingga siswa dapat melakukan absensi ulang. Data profil dan template wajah tetap aman.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowResetTodayModal(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetToday();
                  setShowResetTodayModal(false);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700"
              >
                Ya, Reset Hari Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset All to Default Confirmation */}
      {showResetAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Reset ke Pengaturan Awal?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              Tindakan ini akan mengembalikan data ke daftar siswa contoh bawaan. Seluruh perubahan yang dibuat akan digantikan.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowResetAllModal(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetToDefault();
                  setShowResetAllModal(false);
                  setFormData({ ...storageService.getConfig() });
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
              >
                Reset Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
