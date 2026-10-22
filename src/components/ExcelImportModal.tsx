import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileCheck,
  RefreshCw,
  School,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { ClassItem, Student, ExcelImportPreviewRow } from '../types';
import { exportService } from '../services/exportService';

interface ExcelImportModalProps {
  classes: ClassItem[];
  currentClassId: string;
  existingStudents: Student[];
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedStudents: Student[]) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  classes,
  currentClassId,
  existingStudents,
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<ExcelImportPreviewRow[]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedTargetClassId, setSelectedTargetClassId] = useState<string>(currentClassId || (classes[0]?.id ?? ''));
  const [overrideClass, setOverrideClass] = useState<boolean>(false);
  const [updateExistingStudents, setUpdateExistingStudents] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const currentClass = classes.find((c) => c.id === selectedTargetClassId) || classes[0];

  const handleDownloadTemplate = () => {
    exportService.downloadExcelTemplate(classes, currentClass?.name);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await processFile(selectedFile);
  };

  const processFile = async (uploadedFile: File, sheetOverride?: string) => {
    setFile(uploadedFile);
    setIsParsing(true);
    setParseError(null);
    try {
      const result = await exportService.parseExcelFile(
        uploadedFile,
        classes,
        existingStudents,
        selectedTargetClassId,
        sheetOverride
      );

      setPreviewRows(result.previewRows);
      setSheetNames(result.sheetNames);
      setSelectedSheet(result.activeSheetName);

      if (result.previewRows.length === 0) {
        setParseError(
          'Tidak ada data siswa yang terbaca dari lembar kerja ini. Pastikan kolom Nama dan NIS terisi, atau pilih lembar kerja (sheet) yang sesuai.'
        );
      }
    } catch (err) {
      console.error('Error parsing excel:', err);
      setParseError('Gagal membaca file Excel. Pastikan file berformat .xlsx, .xls, atau .csv yang valid.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSheetChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSheet = e.target.value;
    setSelectedSheet(newSheet);
    if (file) {
      await processFile(file, newSheet);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await processFile(droppedFile);
    }
  };

  // Determine importable rows: valid rows + update rows (if update checkbox is active)
  const newRows = previewRows.filter((r) => r.status === 'valid');
  const updateRows = previewRows.filter((r) => r.status === 'update');
  const errorRows = previewRows.filter((r) => r.status !== 'valid' && r.status !== 'update');

  const importableRows = updateExistingStudents
    ? previewRows.filter((r) => r.status === 'valid' || r.status === 'update')
    : newRows;

  const handleExecuteImport = () => {
    if (importableRows.length === 0) return;

    setIsSubmitting(true);
    const targetClass = classes.find((c) => c.id === selectedTargetClassId);

    const studentsToSave: Student[] = importableRows.map((row) => {
      const effectiveClassId = overrideClass ? selectedTargetClassId : (row.classId || selectedTargetClassId);
      const effectiveClassName = overrideClass ? (targetClass?.name || '') : (row.className || targetClass?.name || '');

      // Check if existing student in database matches NIS strictly within the SAME class
      // Never match or overwrite students from other classes!
      const existing = existingStudents.find(
        (s) =>
          s.classId === effectiveClassId &&
          s.nis &&
          row.nis &&
          s.nis.trim().toLowerCase() === row.nis.trim().toLowerCase()
      );

      if (existing && updateExistingStudents) {
        return {
          ...existing,
          name: row.name,
          gender: row.gender,
          classId: effectiveClassId,
          className: effectiveClassName,
          nisn: row.nisn || existing.nisn || '',
          phone: row.phone || existing.phone || '',
          notes: row.notes || existing.notes || '',
        };
      }

      return {
        id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${Math.floor(Math.random() * 1000)}`,
        nis: row.nis,
        nisn: row.nisn || '',
        name: row.name,
        gender: row.gender,
        classId: effectiveClassId,
        className: effectiveClassName,
        photoUrl: '',
        faceRegistered: false,
        phone: row.phone || '',
        notes: row.notes || '',
      };
    });

    onImportSuccess(studentsToSave);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Import Data Siswa dari Excel / CSV
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unggah file Excel (.xlsx, .xls) atau CSV untuk menambahkan dan memperbarui siswa secara massal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Step 1 & 2 Action Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Download Template Box */}
            <div className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <span>Langkah 1: Format File</span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                  Unduh Template Excel (.xlsx)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Gunakan format kolom yang sudah disediakan (NIS, Nama Siswa, L/P, Kelas, dll.) agar data terbaca 100% akurat.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors w-full cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Template Excel</span>
              </button>
            </div>

            {/* Target Class Setting */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">
                  <School className="w-3.5 h-3.5" />
                  <span>Pengaturan Kelas Target</span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                  Pilih Kelas Default
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  Tentukan kelas tujuan jika pada kolom file tidak tertera nama kelas.
                </p>
                <select
                  value={selectedTargetClassId}
                  onChange={(e) => setSelectedTargetClassId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.teacherName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={overrideClass}
                    onChange={(e) => setOverrideClass(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
                  />
                  <span>Paksa semua siswa ke kelas ini (abaikan kolom kelas di file)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={updateExistingStudents}
                    onChange={(e) => setUpdateExistingStudents(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
                  />
                  <span>Perbarui data jika siswa dengan NIS sama sudah ada di sistem</span>
                </label>
              </div>
            </div>
          </div>

          {/* Parse error banner */}
          {parseError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all ${
              file
                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/10'
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/20'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-2">
              {isParsing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : file ? (
                <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </div>

            {file ? (
              <div>
                <span className="font-bold text-slate-900 dark:text-white block text-sm">
                  {file.name}
                </span>
                <span className="text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB · Berhasil dipindai
                </span>
                <div className="mt-2.5 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                  >
                    Ganti file lain
                  </button>

                  {/* Multi-sheet selector if Excel file has more than 1 sheet */}
                  {sheetNames.length > 1 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                      <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-slate-500">Sheet:</span>
                      <select
                        value={selectedSheet}
                        onChange={handleSheetChange}
                        className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                      >
                        {sheetNames.map((s) => (
                          <option key={s} value={s} className="bg-white dark:bg-slate-800">
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <span className="font-bold text-slate-900 dark:text-white block text-sm mb-1">
                  Tarik dan lepas file Excel atau CSV di sini, atau klik tombol di bawah
                </span>
                <span className="text-xs text-slate-400 block mb-3">
                  Mendukung Microsoft Excel (.xlsx, .xls), Dapodik, dan CSV (.csv)
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-sm transition-colors cursor-pointer"
                >
                  Pilih File Excel
                </button>
              </div>
            )}
          </div>

          {/* Preview Table */}
          {previewRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Hasil Analisis File ({previewRows.length} Siswa Terbaca)
                  </h4>
                  {selectedSheet && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium">
                      Sheet: {selectedSheet}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{newRows.length} Siswa Baru</span>
                  </span>
                  {updateRows.length > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg">
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{updateRows.length} Update Data</span>
                    </span>
                  )}
                  {errorRows.length > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errorRows.length} Masalah</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3 w-28">NIS</th>
                      <th className="py-2.5 px-3">Nama Siswa</th>
                      <th className="py-2.5 px-3 w-14 text-center">L/P</th>
                      <th className="py-2.5 px-3 w-32">Kelas</th>
                      <th className="py-2.5 px-3 w-36">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {previewRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.status === 'valid'
                            ? 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                            : row.status === 'update'
                            ? 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/50'
                            : 'bg-rose-50/40 dark:bg-rose-950/20'
                        }
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {row.nis}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                          {row.name}
                        </td>
                        <td className="py-2 px-3 text-center font-semibold text-slate-600 dark:text-slate-400">
                          {row.gender}
                        </td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">
                          {overrideClass ? currentClass?.name : row.className}
                        </td>
                        <td className="py-2 px-3">
                          {row.status === 'valid' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Siswa Baru</span>
                            </span>
                          ) : row.status === 'update' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              <RefreshCw className="w-3 h-3" />
                              <span>Update Data</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                              <AlertCircle className="w-3 h-3" />
                              <span>{row.errorMessage || 'Error'}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {importableRows.length > 0 ? (
              <span>
                Siap memproses <b>{importableRows.length}</b> siswa ({newRows.length} siswa baru, {updateRows.length} pembaruan).
              </span>
            ) : previewRows.length > 0 ? (
              <span className="text-rose-500">Tidak ada baris siswa yang valid untuk diimpor.</span>
            ) : (
              <span>Silakan pilih file Excel untuk melihat pratinjau data siswa.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={importableRows.length === 0 || isSubmitting}
              onClick={handleExecuteImport}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
                importableRows.length > 0 && !isSubmitting
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting
                ? 'Mengimpor...'
                : `Impor & Simpan ${importableRows.length} Siswa`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
