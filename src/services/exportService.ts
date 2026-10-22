import * as XLSX from 'xlsx';
import { ClassConfig, Student, AttendanceRecord, StudentRekapRow, ClassItem, ExcelImportPreviewRow, ParsedExcelResult } from '../types';

export const exportService = {
  // 1. Download formatted Excel Template (.xlsx) for student import
  downloadExcelTemplate(classes: ClassItem[], activeClassName?: string) {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Template Data Siswa (Gunakan NIS contoh yang tidak bertabrakan)
    const sampleClass = activeClassName || (classes.length > 0 ? classes[0].name : 'XI Informatika 1');
    const templateData = [
      ['No', 'NIS', 'NISN', 'Nama Siswa', 'L/P', 'Kelas', 'No HP / WA', 'Catatan'],
      [1, '24251121', '0082341921', 'Rian Hidayat', 'L', sampleClass, '081234567821', 'Ketua Kelas'],
      [2, '24251122', '0082341922', 'Nabila Putri', 'P', sampleClass, '081234567822', 'Sekretaris'],
      [3, '24251123', '0082341923', 'Fajar Ramadhan', 'L', sampleClass, '081234567823', 'Bendahara'],
      [4, '24251124', '0082341924', 'Dewi Lestari', 'P', sampleClass, '081234567824', 'Anggota'],
      [5, '24251125', '0082341925', 'Eko Prasetyo', 'L', sampleClass, '081234567825', 'Anggota'],
    ];

    const wsData = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths
    wsData['!cols'] = [
      { wch: 6 },  // No
      { wch: 14 }, // NIS
      { wch: 16 }, // NISN
      { wch: 28 }, // Nama Siswa
      { wch: 8 },  // L/P
      { wch: 22 }, // Kelas
      { wch: 18 }, // No HP
      { wch: 20 }, // Catatan
    ];

    XLSX.utils.book_append_sheet(wb, wsData, 'DATA_SISWA');

    // Sheet 2: Petunjuk & Daftar Kelas yang Tersedia
    const guideData = [
      ['PETUNJUK PENGISIAN TEMPLATE IMPORT SISWA'],
      ['1. Kolom "NIS" dan "Nama Siswa" wajib diisi (jika NIS kosong, sistem akan membuatkan NIS otomatis).'],
      ['2. Kolom "L/P" diisi huruf "L" untuk Laki-laki atau "P" untuk Perempuan.'],
      ['3. Kolom "Kelas" dapat diisi sesuai nama kelas yang terdaftar di bawah ini, atau dapat menggunakan kelas tujuan default di aplikasi.'],
      ['4. Jika siswa dengan NIS yang sama sudah ada di sistem, data siswa akan diperbarui secara otomatis.'],
      ['5. Format file yang didukung: Microsoft Excel (.xlsx, .xls) dan CSV (.csv).'],
      [''],
      ['DAFTAR NAMA KELAS TERDAFTAR DI APLIKASI:'],
      ['No', 'ID Kelas', 'Nama Kelas', 'Wali Kelas / Guru'],
      ...classes.map((c, i) => [i + 1, c.id, c.name, c.teacherName]),
    ];

    const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
    wsGuide['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 28 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, 'PETUNJUK_DAN_KELAS');

    XLSX.writeFile(wb, 'Template_Import_Siswa_Absensi.xlsx');
  },

  // 2. Parse uploaded Excel / CSV file
  async parseExcelFile(
    file: File,
    classes: ClassItem[],
    existingStudents: Student[],
    defaultClassId?: string,
    targetSheetName?: string
  ): Promise<ParsedExcelResult> {
    const arrayBuffer = await file.arrayBuffer();
    let wb: XLSX.WorkBook;
    
    try {
      wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, raw: false });
    } catch (e) {
      // Fallback for raw CSV text if binary array parsing encountered error
      try {
        const text = new TextDecoder('utf-8').decode(arrayBuffer);
        wb = XLSX.read(text, { type: 'string', raw: false });
      } catch (err2) {
        console.error('All XLSX read attempts failed:', err2);
        return { previewRows: [], sheetNames: [], activeSheetName: '' };
      }
    }

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return { previewRows: [], sheetNames: [], activeSheetName: '' };
    }

    // Determine the best sheet to parse:
    // Evaluate candidate sheets by scoring them based on presence of student header keywords and data row counts
    let selectedSheetName = targetSheetName && wb.SheetNames.includes(targetSheetName)
      ? targetSheetName
      : '';

    if (!selectedSheetName) {
      let highestScore = -9999;
      let fallbackSheet = wb.SheetNames[0];

      for (const sName of wb.SheetNames) {
        const ws = wb.Sheets[sName];
        if (!ws) continue;

        const lowerName = sName.toLowerCase().trim();
        let score = 0;

        // Sheet name heuristics
        if (lowerName === 'data_siswa' || lowerName === 'siswa' || lowerName === 'murid' || lowerName.includes('daftar siswa')) {
          score += 100;
        } else if (lowerName.includes('siswa') || lowerName.includes('student') || lowerName.includes('peserta didik')) {
          score += 60;
        } else if (lowerName.includes('petunjuk') || lowerName.includes('panduan') || lowerName.includes('guide') || lowerName.includes('info')) {
          score -= 200; // Demerit instruction sheets
        }

        // Check content rows in the sheet
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false }) as any[][];
        if (!rows || rows.length === 0) continue;

        let hasStudentHeader = false;
        let nonNumberTextRows = 0;

        for (let i = 0; i < Math.min(25, rows.length); i++) {
          const row = rows[i];
          if (!Array.isArray(row)) continue;
          const textJoined = row.map((c) => String(c || '').toLowerCase().trim()).join(' ');

          if (
            (textJoined.includes('nama') && (textJoined.includes('nis') || textJoined.includes('l/p') || textJoined.includes('jk') || textJoined.includes('kelas'))) ||
            (textJoined.includes('nama siswa') || textJoined.includes('nama lengkap') || textJoined.includes('nama peserta didik'))
          ) {
            hasStudentHeader = true;
            score += 80;
            break;
          }
        }

        // Count candidate data rows (rows that have multiple cells and text)
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (Array.isArray(row) && row.filter((c) => String(c || '').trim().length > 0).length >= 2) {
            nonNumberTextRows++;
          }
        }

        score += nonNumberTextRows * 3;

        if (score > highestScore) {
          highestScore = score;
          fallbackSheet = sName;
        }
      }

      selectedSheetName = fallbackSheet;
    }

    const ws = wb.Sheets[selectedSheetName];
    if (!ws) {
      return { previewRows: [], sheetNames: wb.SheetNames, activeSheetName: selectedSheetName };
    }

    // Extract raw rows
    let rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false }) as any[][];

    // If SheetJS sheet_to_json returned fewer than 2 rows, try parsing as raw CSV lines if applicable
    if ((!rawRows || rawRows.length < 2) && file.name.toLowerCase().endsWith('.csv')) {
      try {
        const text = new TextDecoder('utf-8').decode(arrayBuffer);
        const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
        if (lines.length >= 2) {
          // Detect delimiter: semicolon, comma, or tab
          const sample = lines.slice(0, 5).join('\n');
          const semi = (sample.match(/;/g) || []).length;
          const comma = (sample.match(/,/g) || []).length;
          const tab = (sample.match(/\t/g) || []).length;
          let delimiter = ',';
          if (semi > comma && semi > tab) delimiter = ';';
          else if (tab > comma && tab > semi) delimiter = '\t';

          rawRows = lines.map((line) => {
            const cells: string[] = [];
            let inQuotes = false;
            let cur = '';
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  cur += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === delimiter && !inQuotes) {
                cells.push(cur.trim());
                cur = '';
              } else {
                cur += char;
              }
            }
            cells.push(cur.trim());
            return cells;
          });
        }
      } catch (csvErr) {
        console.warn('Fallback CSV text splitting failed:', csvErr);
      }
    }

    if (!rawRows || rawRows.length === 0) {
      return { previewRows: [], sheetNames: wb.SheetNames, activeSheetName: selectedSheetName };
    }

    // Helper to test if a string represents a table title banner rather than a column header
    const isBannerTitle = (val: string): boolean => {
      const v = val.toLowerCase().trim();
      return (
        v.startsWith('daftar nama') ||
        v.startsWith('data siswa') ||
        v.startsWith('daftar siswa') ||
        v.startsWith('rekapitulasi') ||
        v.startsWith('rekap ') ||
        v.startsWith('pemerintah ') ||
        v.startsWith('dinas pendidikan') ||
        v.startsWith('laporan absensi') ||
        v.startsWith('tahun pelajaran') ||
        v.startsWith('petunjuk pengisian')
      );
    };

    // Find the header row by scoring candidate rows (0 to 30)
    let bestHeaderIdx = -1;
    let bestHeaderScore = -1;
    let colMap = {
      no: -1,
      nis: -1,
      nisn: -1,
      name: -1,
      gender: -1,
      className: -1,
      phone: -1,
      notes: -1,
    };

    for (let i = 0; i < Math.min(30, rawRows.length); i++) {
      const row = rawRows[i];
      if (!Array.isArray(row)) continue;

      const populatedCells = row.filter((c) => String(c || '').trim().length > 0);
      if (populatedCells.length < 2) {
        // A single populated cell (e.g. title banner in cell A1) cannot be a column header row
        continue;
      }

      const rowText = row.map((c) => String(c || '').toLowerCase().trim());
      
      // If the entire row is dominated by a banner title, skip
      if (rowText.some((c) => isBannerTitle(c) && c.length > 25)) {
        continue;
      }

      // Check for Name column
      const nameIndex = rowText.findIndex((c) => {
        if (!c) return false;
        if (
          c === 'nama' ||
          c === 'nama siswa' ||
          c === 'nama lengkap' ||
          c === 'nama peserta didik' ||
          c === 'nama murid' ||
          c === 'nama siswa/i' ||
          c === 'nama siswa/siswi' ||
          c === 'name' ||
          c === 'student name' ||
          c === 'student' ||
          c === 'full name'
        ) {
          return true;
        }
        // Substring check: must start with 'nama' or 'nama ' and not be a long title or school/class name
        if (
          (c.startsWith('nama ') || c === 'nama') &&
          c.length <= 25 &&
          !c.includes('kelas') &&
          !c.includes('sekolah') &&
          !c.includes('guru') &&
          !c.includes('wali') &&
          !isBannerTitle(c)
        ) {
          return true;
        }
        return false;
      });

      // Check for NIS / NIPD column
      let nisIndex = rowText.findIndex((c) => {
        if (!c) return false;
        return (
          c === 'nis' ||
          c === 'nipd' || // Indonesian Dapodik standard
          c === 'no. induk' ||
          c === 'no induk' ||
          c === 'nomor induk' ||
          c === 'nomor induk siswa' ||
          c === 'no.induk' ||
          c === 'id siswa' ||
          c === 'student id' ||
          c === 'nis/nipd' ||
          c === 'nis / nipd' ||
          c === 'nis/nisn' ||
          c === 'nis siswa'
        );
      });
      if (nisIndex === -1) {
        nisIndex = rowText.findIndex((c) => c.includes('nis') && !c.includes('nisn') && c.length <= 15);
      }
      if (nisIndex === -1) {
        nisIndex = rowText.findIndex((c) => c.includes('nipd') && c.length <= 15);
      }
      if (nisIndex === -1) {
        nisIndex = rowText.findIndex((c) => c.includes('induk') && c.length <= 20);
      }

      // Check for NISN column
      const nisnIndex = rowText.findIndex(
        (c) => c === 'nisn' || c === 'nomor induk siswa nasional' || (c.includes('nisn') && c.length <= 20)
      );

      // Check for Gender column
      const genderIndex = rowText.findIndex(
        (c) =>
          c === 'l/p' ||
          c === 'l / p' ||
          c === 'jk' ||
          c === 'j.k' ||
          c === 'j.k.' ||
          c === 'jenis kelamin' ||
          c === 'gender' ||
          c === 'sex' ||
          c.includes('kelamin')
      );

      // Check for Class column
      const classIndex = rowText.findIndex(
        (c) =>
          c === 'kelas' ||
          c === 'nama kelas' ||
          c === 'rombel' ||
          c === 'rombongan belajar' ||
          c === 'tingkat' ||
          c === 'tingkat/kelas' ||
          c === 'class'
      );

      // Check for No column
      const noIndex = rowText.findIndex((c) => c === 'no' || c === 'no.' || c === 'nomor' || c === '#');

      // Check for Phone column
      const phoneIndex = rowText.findIndex(
        (c) =>
          c === 'no hp' ||
          c === 'no. hp' ||
          c === 'no wa' ||
          c === 'no. wa' ||
          c === 'hp' ||
          c === 'wa' ||
          c === 'telepon' ||
          c === 'telp' ||
          c === 'no telp' ||
          c === 'phone' ||
          c === 'kontak' ||
          c.includes('hp') ||
          c.includes('telp') ||
          c.includes('wa')
      );

      // Check for Notes column
      const notesIndex = rowText.findIndex(
        (c) =>
          c === 'catatan' ||
          c === 'keterangan' ||
          c === 'ket' ||
          c === 'notes' ||
          c === 'jabatan' ||
          c.includes('catatan') ||
          c.includes('keterangan')
      );

      // Calculate row header score
      let score = 0;
      if (nameIndex >= 0) score += 40;
      if (nisIndex >= 0) score += 30;
      if (genderIndex >= 0) score += 25;
      if (classIndex >= 0) score += 20;
      if (noIndex >= 0) score += 15;
      if (phoneIndex >= 0) score += 10;
      if (nisnIndex >= 0) score += 10;
      if (notesIndex >= 0) score += 5;

      if (score > bestHeaderScore && score >= 40) {
        bestHeaderScore = score;
        bestHeaderIdx = i;
        colMap = {
          no: noIndex,
          nis: nisIndex,
          nisn: nisnIndex,
          name: nameIndex,
          gender: genderIndex,
          className: classIndex,
          phone: phoneIndex,
          notes: notesIndex,
        };
      }
    }

    // Fallback if no matching header detected:
    // Determine whether row 0 has headers or if it's pure data
    if (bestHeaderIdx === -1) {
      bestHeaderIdx = 0;
      colMap = { no: 0, nis: 1, nisn: 2, name: 3, gender: 4, className: 5, phone: 6, notes: 7 };
    }

    const previewRows: ExcelImportPreviewRow[] = [];
    // Map existing students scoped by classId + nis to prevent false updates across different classes
    const existingClassNisMap = new Map<string, Student>();
    existingStudents.forEach((s) => {
      if (s.nis && s.classId) {
        existingClassNisMap.set(`${s.classId}__${s.nis.trim().toLowerCase()}`, s);
      }
    });

    const seenNisInBatch = new Set<string>();

    // Clean cell helper removing trailing .0 from numbers or scientific notation
    const cleanCellString = (val: any): string => {
      if (val === undefined || val === null) return '';
      let str = String(val).trim();
      // Handle numeric strings like 24251101.0
      if (/^\d+\.0$/.test(str)) {
        str = str.replace(/\.0$/, '');
      }
      return str;
    };

    // Iterate through all data rows starting right after the detected header row
    for (let r = bestHeaderIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || !Array.isArray(row)) continue;

      // Skip row if every cell is empty
      const isAllEmpty = row.every((c) => c === undefined || c === null || String(c).trim() === '');
      if (isAllEmpty) continue;

      const getVal = (idx?: number) =>
        idx !== undefined && idx >= 0 && idx < row.length ? cleanCellString(row[idx]) : '';

      let name = getVal(colMap.name);
      let nis = getVal(colMap.nis);
      let nisn = getVal(colMap.nisn);
      let genderStr = getVal(colMap.gender).toUpperCase();
      let rawClassName = getVal(colMap.className);
      let phone = getVal(colMap.phone);
      let notes = getVal(colMap.notes);

      // If name is blank or invalid, search other cells in the row for a candidate person name
      if (!name || name.length < 2 || !isNaN(Number(name))) {
        for (let c = 0; c < row.length; c++) {
          if (c === colMap.no || c === colMap.nis || c === colMap.nisn || c === colMap.gender) continue;
          const val = cleanCellString(row[c]);
          if (
            val.length >= 3 &&
            isNaN(Number(val)) &&
            val.toUpperCase() !== 'L' &&
            val.toUpperCase() !== 'P' &&
            !val.includes('/') &&
            !val.toLowerCase().startsWith('http') &&
            !val.toLowerCase().includes('telepon')
          ) {
            name = val;
            break;
          }
        }
      }

      // If still no name and no NIS, this row is empty or metadata, skip it
      if (!name && !nis) continue;

      // Skip typical footer/signature lines in school documents
      const nameLower = (name || '').toLowerCase();
      if (
        nameLower.startsWith('mengetahui') ||
        nameLower.startsWith('kepala sekolah') ||
        nameLower.startsWith('wali kelas') ||
        nameLower.startsWith('guru pengampu') ||
        nameLower.startsWith('jumlah') ||
        nameLower.startsWith('total') ||
        nameLower.startsWith('catatan:') ||
        nameLower.startsWith('keterangan:') ||
        nameLower.startsWith('dibuat di')
      ) {
        continue;
      }

      // If name is empty but NIS is present, create a fallback name
      if (!name) {
        name = `Siswa ${nis || r}`;
      }

      // If NIS is empty, automatically generate a clean unique 8-digit NIS
      let isAutoGeneratedNis = false;
      if (!nis) {
        nis = `2425${Math.floor(10000 + Math.random() * 90000)}`;
        isAutoGeneratedNis = true;
      }

      // Gender normalization
      const gender: 'L' | 'P' =
        genderStr.startsWith('P') ||
        genderStr.includes('PEREMPUAN') ||
        genderStr.includes('FEMALE') ||
        genderStr === 'W'
          ? 'P'
          : 'L';

      // Match class
      let matchedClass = classes.find(
        (c) => c.name.toLowerCase().trim() === rawClassName.toLowerCase().trim() || c.id === rawClassName
      );

      if (!matchedClass && defaultClassId) {
        matchedClass = classes.find((c) => c.id === defaultClassId);
      }

      if (!matchedClass && classes.length > 0) {
        matchedClass = classes[0];
      }

      const assignedClassId = matchedClass?.id || defaultClassId || (classes[0]?.id ?? '');
      const assignedClassName = matchedClass?.name || rawClassName || (classes[0]?.name ?? '');

      let status: ExcelImportPreviewRow['status'] = 'valid';
      let errorMessage: string | undefined = undefined;

      const nisKey = nis.toLowerCase();

      const classNisKey = `${assignedClassId}__${nisKey}`;

      if (seenNisInBatch.has(classNisKey)) {
        // If duplicated within the same uploaded file, append row index to ensure distinct ID
        nis = `${nis}-${r}`;
        status = 'valid';
        errorMessage = 'NIS duplikat otomatis dibuat unik';
      } else if (existingClassNisMap.has(classNisKey)) {
        // NIS already exists in this target class: mark as 'update' so teacher can update existing student in this class
        status = 'update';
        errorMessage = 'Siswa di kelas ini sudah ada (akan diperbarui)';
      }

      seenNisInBatch.add(`${assignedClassId}__${nis.toLowerCase()}`);

      previewRows.push({
        nis,
        nisn: nisn || '',
        name,
        gender,
        className: assignedClassName,
        classId: assignedClassId,
        phone,
        notes: notes || (isAutoGeneratedNis ? 'NIS dibuat otomatis' : ''),
        status,
        errorMessage,
      });
    }

    return {
      previewRows,
      sheetNames: wb.SheetNames,
      activeSheetName: selectedSheetName,
    };
  },

  // 3. Export Students list to Excel (.xlsx)
  exportStudentsToExcel(students: Student[], className: string, schoolName: string, teacherName: string) {
    const wb = XLSX.utils.book_new();

    const data = [
      [`DAFTAR SISWA - ${className.toUpperCase()}`],
      [`Sekolah: ${schoolName} | Wali Kelas: ${teacherName} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`],
      [''],
      ['No', 'NIS', 'NISN', 'Nama Siswa', 'L/P', 'Kelas', 'Status Wajah', 'No HP / WA', 'Catatan'],
      ...students.map((s, idx) => [
        idx + 1,
        s.nis,
        s.nisn || '-',
        s.name,
        s.gender,
        s.className || className,
        s.faceRegistered ? 'Terdaftar' : 'Belum',
        s.phone || '-',
        s.notes || '',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 16 },
      { wch: 28 },
      { wch: 8 },
      { wch: 20 },
      { wch: 14 },
      { wch: 18 },
      { wch: 22 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Siswa');
    XLSX.writeFile(wb, `Data_Siswa_${className.replace(/\s+/g, '_')}.xlsx`);
  },

  // 4. Export Daily Attendance to Excel (.xlsx)
  exportTodayAttendanceToExcel(
    records: AttendanceRecord[],
    allStudents: Student[],
    className: string,
    schoolName: string,
    dateStr: string
  ) {
    const wb = XLSX.utils.book_new();

    const data = [
      [`PRESENSI HARIAN - ${className.toUpperCase()}`],
      [`Sekolah: ${schoolName} | Tanggal: ${dateStr}`],
      [''],
      ['No', 'NIS', 'Nama Siswa', 'L/P', 'Kelas', 'Jam Presensi', 'Status', 'Metode', 'Akurasi Wajah', 'Catatan'],
      ...allStudents.map((s, idx) => {
        const rec = records.find((r) => r.studentId === s.id);
        return [
          idx + 1,
          s.nis,
          s.name,
          s.gender,
          s.className || className,
          rec ? rec.time : '-',
          rec ? rec.status.toUpperCase() : 'BELUM ABSEN',
          rec ? (rec.method === 'face_recognition' ? 'Face Recognition' : 'Manual') : '-',
          rec?.confidence ? `${rec.confidence}%` : '-',
          rec?.notes || '',
        ];
      }),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 28 },
      { wch: 8 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
      { wch: 22 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Presensi_Harian');
    XLSX.writeFile(wb, `Presensi_${className.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
  },

  // 5. Export Summary (Rekap) to Excel (.xlsx)
  exportRekapToExcel(
    rekapRows: StudentRekapRow[],
    classNameOrConfig: string | ClassConfig,
    schoolNameOrPeriod?: string,
    periodLabelParam?: string
  ) {
    let className = 'Kelas';
    let schoolName = 'Sekolah';
    let periodLabel = 'Semua';

    if (typeof classNameOrConfig === 'object' && classNameOrConfig !== null) {
      className = classNameOrConfig.className || 'Kelas';
      schoolName = classNameOrConfig.schoolName || 'Sekolah';
      periodLabel = schoolNameOrPeriod || 'Semua';
    } else {
      className = classNameOrConfig || 'Kelas';
      schoolName = schoolNameOrPeriod || 'Sekolah';
      periodLabel = periodLabelParam || 'Semua';
    }

    const wb = XLSX.utils.book_new();

    const data = [
      [`REKAPITULASI PRESENSI - ${className.toUpperCase()}`],
      [`Sekolah: ${schoolName} | Periode: ${periodLabel}`],
      [''],
      ['No', 'NIS', 'Nama Siswa', 'L/P', 'Kelas', 'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa', '% Kehadiran'],
      ...rekapRows.map((r, idx) => [
        idx + 1,
        r.student.nis,
        r.student.name,
        r.student.gender,
        r.student.className || className,
        r.hadir,
        r.terlambat,
        r.sakit,
        r.izin,
        r.alpa,
        `${r.attendancePercent.toFixed(1)}%`,
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 28 },
      { wch: 8 },
      { wch: 18 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Presensi');
    XLSX.writeFile(wb, `Rekap_${className.replace(/\s+/g, '_')}_${periodLabel.replace(/\s+/g, '_')}.xlsx`);
  },

  // Alias for backward compatibility
  exportRekapToCSV(
    rekapRows: StudentRekapRow[],
    classNameOrConfig: string | ClassConfig,
    periodLabel?: string
  ) {
    this.exportRekapToExcel(rekapRows, classNameOrConfig, periodLabel);
  },

  // 6. Print Report View (HTML official layout)
  printReport(
    schoolNameOrConfig: string | ClassConfig,
    classNameOrTitle: string,
    teacherNameOrSubtitle?: string,
    academicYearOrHtml?: string,
    titleParam?: string,
    subtitleParam?: string,
    htmlTableContentParam?: string
  ) {
    let schoolName = 'Sekolah';
    let className = 'Kelas';
    let teacherName = 'Guru';
    let academicYear = '2026/2027';
    let title = 'REKAPITULASI PRESENSI';
    let subtitle = '';
    let htmlTableContent = '';

    if (typeof schoolNameOrConfig === 'object' && schoolNameOrConfig !== null) {
      schoolName = schoolNameOrConfig.schoolName || 'Sekolah';
      className = schoolNameOrConfig.className || 'Kelas';
      teacherName = schoolNameOrConfig.teacherName || 'Guru';
      academicYear = schoolNameOrConfig.academicYear || '2026/2027';
      title = classNameOrTitle || 'REKAPITULASI PRESENSI';
      subtitle = teacherNameOrSubtitle || '';
      htmlTableContent = academicYearOrHtml || '';
    } else {
      schoolName = schoolNameOrConfig;
      className = classNameOrTitle;
      teacherName = teacherNameOrSubtitle || 'Guru';
      academicYear = academicYearOrHtml || '2026/2027';
      title = titleParam || 'REKAPITULASI PRESENSI';
      subtitle = subtitleParam || '';
      htmlTableContent = htmlTableContentParam || '';
    }

    const todayFormatted = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const docContent = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>${title} - ${className}</title>
          <style>
            @page { size: A4 portrait; margin: 1.5cm; }
            body { font-family: Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.4; margin: 0; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
            .school-name { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 0; }
            .class-name { font-size: 13pt; font-weight: 600; color: #334155; margin: 4px 0; }
            .meta { font-size: 10pt; color: #64748b; }
            .report-title { font-size: 14pt; font-weight: bold; text-align: center; margin: 16px 0 6px 0; }
            .report-subtitle { font-size: 10pt; text-align: center; color: #64748b; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: 600; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; page-break-inside: avoid; }
            .sig-block { width: 220px; text-align: center; }
            .sig-space { height: 60px; }
            .sig-name { font-weight: bold; text-decoration: underline; }
            @media print {
              body { padding: 0; }
              button { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="school-name">${schoolName}</h1>
            <div class="class-name">KELAS: ${className.toUpperCase()}</div>
            <div class="meta">Tahun Pelajaran: ${academicYear} | Wali Kelas: ${teacherName}</div>
          </div>

          <div class="report-title">${title}</div>
          <div class="report-subtitle">${subtitle}</div>

          ${htmlTableContent}

          <div class="signatures">
            <div class="sig-block">
              <div>Mengetahui,</div>
              <div>Kepala Sekolah</div>
              <div class="sig-space"></div>
              <div class="sig-name">( ........................................ )</div>
              <div>NIP. .....................................</div>
            </div>
            <div class="sig-block">
              <div>Dicetak pada: ${todayFormatted}</div>
              <div>Wali Kelas</div>
              <div class="sig-space"></div>
              <div class="sig-name">${teacherName}</div>
              <div>NIP. -</div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Safe print via hidden iframe to avoid popup block in iframe
    let printFrame = document.getElementById('report-print-frame') as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'report-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(docContent);
      frameDoc.close();
      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 500);
    } else {
      window.print();
    }
  },
};
