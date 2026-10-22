import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Download,
  Upload,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Camera,
  X,
  Phone,
  ShieldAlert,
  School,
  FileDown,
} from 'lucide-react';
import { Student, ClassConfig, ClassItem } from '../types';
import { exportService } from '../services/exportService';
import { ExcelImportModal } from './ExcelImportModal';

interface StudentListViewProps {
  students: Student[];
  classes: ClassItem[];
  activeClass: ClassItem;
  config: ClassConfig;
  onAddStudent: (student: Student) => void;
  onAddBatchStudents?: (students: Student[]) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onGoToRegistration: (studentId: string) => void;
  onSelectStudent: (student: Student) => void;
}

export const StudentListView: React.FC<StudentListViewProps> = ({
  students,
  classes,
  activeClass,
  config,
  onAddStudent,
  onAddBatchStudents,
  onUpdateStudent,
  onDeleteStudent,
  onGoToRegistration,
  onSelectStudent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>(activeClass.id || 'all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'L' | 'P'>('all');
  const [faceFilter, setFaceFilter] = useState<'all' | 'registered' | 'unregistered'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const [notification, setNotification] = useState<{ message: string; isError?: boolean } | null>(null);

  // Form input fields
  const [formData, setFormData] = useState({
    name: '',
    nis: '',
    nisn: '',
    gender: 'L' as 'L' | 'P',
    classId: activeClass.id || (classes[0]?.id ?? ''),
    phone: '',
    notes: '',
  });

  const showNotification = (message: string, isError = false) => {
    setNotification({ message, isError });
    setTimeout(() => setNotification(null), 3500);
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.nisn && s.nisn.includes(searchTerm));

    if (!matchesSearch) return false;
    if (classFilter !== 'all' && s.classId !== classFilter) return false;
    if (genderFilter !== 'all' && s.gender !== genderFilter) return false;
    if (faceFilter === 'registered' && !s.faceRegistered) return false;
    if (faceFilter === 'unregistered' && s.faceRegistered) return false;
    return true;
  });

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      nis: `2425${Math.floor(1000 + Math.random() * 9000)}`,
      nisn: '',
      gender: 'L',
      classId: classFilter !== 'all' ? classFilter : activeClass.id,
      phone: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      nis: student.nis,
      nisn: student.nisn || '',
      gender: student.gender,
      classId: student.classId || activeClass.id,
      phone: student.phone || '',
      notes: student.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.nis.trim()) {
      showNotification('Nama dan NIS wajib diisi!', true);
      return;
    }

    const assignedClass = classes.find((c) => c.id === formData.classId);

    if (editingStudent) {
      onUpdateStudent({
        ...editingStudent,
        name: formData.name.trim(),
        nis: formData.nis.trim(),
        nisn: formData.nisn.trim(),
        gender: formData.gender,
        classId: formData.classId,
        className: assignedClass?.name || editingStudent.className,
        phone: formData.phone.trim(),
        notes: formData.notes.trim(),
      });
      showNotification(`Data ${formData.name.trim()} berhasil diperbarui.`);
    } else {
      const newStudent: Student = {
        id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: formData.name.trim(),
        nis: formData.nis.trim(),
        nisn: formData.nisn.trim(),
        gender: formData.gender,
        classId: formData.classId,
        className: assignedClass?.name || activeClass.name,
        photoUrl: '',
        faceRegistered: false,
        phone: formData.phone.trim(),
        notes: formData.notes.trim(),
      };
      onAddStudent(newStudent);
      showNotification(`Siswa ${formData.name.trim()} berhasil ditambahkan.`);
    }

    setIsModalOpen(false);
  };

  const handleDownloadTemplate = () => {
    exportService.downloadExcelTemplate(classes, activeClass.name);
    showNotification('Template Excel berhasil diunduh.');
  };

  const handleExportExcel = () => {
    const currentClassName = classFilter !== 'all'
      ? (classes.find((c) => c.id === classFilter)?.name || activeClass.name)
      : 'Semua_Kelas';

    exportService.exportStudentsToExcel(
      filteredStudents,
      currentClassName,
      config.schoolName,
      activeClass.teacherName
    );
    showNotification(`Data siswa ${currentClassName} berhasil diekspor.`);
  };

  const handleImportBatchSuccess = (importedList: Student[]) => {
    if (onAddBatchStudents) {
      onAddBatchStudents(importedList);
    } else {
      importedList.forEach((s) => onAddStudent(s));
    }
    showNotification(`Berhasil mengimpor ${importedList.length} siswa baru!`);
  };

  const currentClassObj = classes.find((c) => c.id === classFilter);

  return (
    <div className="space-y-6">
      {/* Header and Quick Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">
                Manajemen Data Siswa Multi-Kelas
              </span>
              {notification && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    notification.isError
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {notification.message}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {classFilter === 'all' ? 'Seluruh Siswa Sekolah' : `Siswa Kelas ${currentClassObj?.name || activeClass.name}`}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Menampilkan {filteredStudents.length} dari total {students.length} Siswa ·{' '}
              {students.filter((s) => s.faceRegistered).length} Wajah Terdaftar
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Download Excel Template Button */}
            <button
              onClick={handleDownloadTemplate}
              title="Unduh format template Excel untuk pengisian data siswa"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Template Excel</span>
            </button>

            {/* Import Excel Button */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import Excel</span>
            </button>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            {/* Add Student Button */}
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Siswa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        {/* Search & Multi-Class Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berdasarkan nama, NIS, atau kelas..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Class */}
            <div className="flex items-center gap-1.5 text-xs">
              <School className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Semua Kelas ({students.length})</option>
                {classes.map((c) => {
                  const count = students.filter((s) => s.classId === c.id).length;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} ({count} siswa)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Gender filter */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">Semua Gender</option>
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>

            {/* Face status filter */}
            <select
              value={faceFilter}
              onChange={(e) => setFaceFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">Semua Status Wajah</option>
              <option value="registered">🟢 Wajah Terdaftar</option>
              <option value="unregistered">🔴 Belum Registrasi</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-16">Foto</th>
                <th className="py-3 px-4 w-32">NIS / NISN</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4 w-32">Kelas</th>
                <th className="py-3 px-4 w-16 text-center">L/P</th>
                <th className="py-3 px-4 w-36">Status Wajah</th>
                <th className="py-3 px-4 w-32 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada siswa yang ditemukan untuk filter ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
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
                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt={student.name}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-white"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                            {student.name.charAt(0)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-900 dark:text-slate-200 tabular-nums font-semibold">
                          {student.nis}
                        </div>
                        {student.nisn && (
                          <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                            {student.nisn}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => onSelectStudent(student)}
                          className="text-left group focus:outline-none"
                        >
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {student.name}
                          </div>
                          {student.notes && (
                            <div className="text-[11px] text-slate-400">{student.notes}</div>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
                          {studentClass?.name || student.className || 'Kelas'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                        {student.gender}
                      </td>

                      <td className="py-3 px-4">
                        {student.faceRegistered ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                            <span>Terdaftar</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 font-medium">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                            <span>Belum</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onGoToRegistration(student.id)}
                            title="Registrasi Wajah Siswa"
                            className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(student)}
                            title="Edit Siswa"
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(student)}
                            title="Hapus Siswa"
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Ahmad Fauzan"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Class Selector */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kelas *
                </label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.teacherName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    NIS *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    placeholder="24251101"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    NISN
                  </label>
                  <input
                    type="text"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="0082341901"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    No. HP / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="081234567890"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Jabatan (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Contoh: Ketua Kelas, Anggota OSIS"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
                >
                  {editingStudent ? 'Simpan Perubahan' : 'Tambahkan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Hapus Siswa?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              Anda yakin ingin menghapus data siswa <b>{deleteTarget.name}</b>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDeleteStudent(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Excel Import Modal with Template & Preview */}
      <ExcelImportModal
        classes={classes}
        currentClassId={classFilter !== 'all' ? classFilter : activeClass.id}
        existingStudents={students}
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportBatchSuccess}
      />
    </div>
  );
};
