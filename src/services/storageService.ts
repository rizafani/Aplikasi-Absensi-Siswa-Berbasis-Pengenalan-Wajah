import { ClassConfig, Student, AttendanceRecord, AuditLog, ClassItem, LessonScheduleItem, DayOfWeek } from '../types';

const CONFIG_KEY = 'absensi_kelas_config';
const CLASSES_KEY = 'absensi_kelas_list';
const STUDENTS_KEY = 'absensi_kelas_students';
const ATTENDANCE_KEY = 'absensi_kelas_attendance';
const AUDIT_LOG_KEY = 'absensi_kelas_audit';
const SCHEDULES_KEY = 'absensi_kelas_lesson_schedules';

export const DEFAULT_CLASSES: ClassItem[] = [
  {
    id: 'class-xi-infor-1',
    name: 'XI Informatika 1',
    teacherName: 'Dra. Sri Wahyuni, M.Kom',
    academicYear: '2026/2027',
    presentEndTime: '07:30',
    lateEndTime: '08:00',
    room: 'Lab Komputer 1',
  },
  {
    id: 'class-xi-infor-2',
    name: 'XI Informatika 2',
    teacherName: 'Budi Santoso, S.Pd',
    academicYear: '2026/2027',
    presentEndTime: '07:30',
    lateEndTime: '08:00',
    room: 'Lab Komputer 2',
  },
  {
    id: 'class-x-dkv-1',
    name: 'X DKV',
    teacherName: 'Citra Dewi, S.Sn',
    academicYear: '2026/2027',
    presentEndTime: '07:30',
    lateEndTime: '08:00',
    room: 'Studio Multimedia',
  },
  {
    id: 'class-xii-mipa-1',
    name: 'XII MIPA 1',
    teacherName: 'Drs. H. Ahmad Dahlan',
    academicYear: '2026/2027',
    presentEndTime: '07:30',
    lateEndTime: '08:00',
    room: 'Gedung B Lt. 2',
  },
];

export const DEFAULT_CONFIG: ClassConfig = {
  schoolName: 'SMA Negeri 1 Nusantara',
  activeClassId: 'class-xi-infor-1',
  academicYear: '2026/2027',
  presentStartTime: '06:30',
  presentEndTime: '07:30',
  lateEndTime: '08:00',
  afterLateStatus: 'terlambat',
  livenessEnabled: false,
  soundEnabled: true,
  autoCaptureCooldown: 5,
  recognitionThreshold: 0.45,
  fastModeEnabled: true,
  lowLightEnhance: true,
};

// Initial Seed Students distributed across classes
const DEFAULT_STUDENTS: Student[] = [
  {
    id: 'std-001',
    nis: '24251101',
    nisn: '0082341901',
    name: 'Ahmad Fauzan',
    gender: 'L',
    classId: 'class-xi-infor-1',
    className: 'XI Informatika 1',
    photoUrl: '/src/assets/images/student_ahmad_fauzan_1791118009181.jpg',
    faceRegistered: true,
    registeredAt: '2026-09-15 08:30',
    phone: '081234567891',
    notes: 'Ketua Kelas',
  },
  {
    id: 'std-002',
    nis: '24251102',
    nisn: '0082341902',
    name: 'Budi Saputra',
    gender: 'L',
    classId: 'class-xi-infor-1',
    className: 'XI Informatika 1',
    photoUrl: '/src/assets/images/student_budi_saputra_1791118023391.jpg',
    faceRegistered: true,
    registeredAt: '2026-09-15 08:45',
    phone: '081234567892',
  },
  {
    id: 'std-003',
    nis: '24251103',
    nisn: '0082341903',
    name: 'Citra Amelia',
    gender: 'P',
    classId: 'class-xi-infor-1',
    className: 'XI Informatika 1',
    photoUrl: '/src/assets/images/student_citra_amelia_1791118041440.jpg',
    faceRegistered: true,
    registeredAt: '2026-09-16 09:10',
    phone: '081234567893',
    notes: 'Sekretaris',
  },
  {
    id: 'std-004',
    nis: '24251104',
    nisn: '0082341904',
    name: 'Deni Kurniawan',
    gender: 'L',
    classId: 'class-xi-infor-1',
    className: 'XI Informatika 1',
    photoUrl: '',
    faceRegistered: false,
    phone: '081234567894',
  },
  {
    id: 'std-005',
    nis: '24251105',
    nisn: '0082341905',
    name: 'Siti Aisyah',
    gender: 'P',
    classId: 'class-xi-infor-1',
    className: 'XI Informatika 1',
    photoUrl: '/src/assets/images/student_siti_aisyah_1791118054220.jpg',
    faceRegistered: true,
    registeredAt: '2026-09-16 09:25',
    phone: '081234567895',
    notes: 'Bendahara',
  },
  {
    id: 'std-006',
    nis: '24251106',
    nisn: '0082341906',
    name: 'Dimas Aditya',
    gender: 'L',
    classId: 'class-xi-infor-2',
    className: 'XI Informatika 2',
    photoUrl: '',
    faceRegistered: false,
    phone: '081234567896',
  },
  {
    id: 'std-007',
    nis: '24251107',
    nisn: '0082341907',
    name: 'Eka Putri Lestari',
    gender: 'P',
    classId: 'class-xi-infor-2',
    className: 'XI Informatika 2',
    photoUrl: '',
    faceRegistered: false,
    phone: '081234567897',
  },
  {
    id: 'std-008',
    nis: '24251108',
    nisn: '0082341908',
    name: 'Farhan Ramadhan',
    gender: 'L',
    classId: 'class-xi-infor-2',
    className: 'XI Informatika 2',
    photoUrl: '',
    faceRegistered: false,
    phone: '081234567898',
  },
  {
    id: 'std-009',
    nis: '24251109',
    nisn: '0082341909',
    name: 'Gita Savitri',
    gender: 'P',
    classId: 'class-x-dkv-1',
    className: 'X DKV',
    photoUrl: '',
    faceRegistered: false,
    phone: '081234567899',
  },
  {
    id: 'std-010',
    nis: '24251110',
    nisn: '0082341910',
    name: 'Hadi Prayogo',
    gender: 'L',
    classId: 'class-xii-mipa-1',
    className: 'XII MIPA 1',
    photoUrl: '',
    faceRegistered: false,
    phone: '081234567810',
  },
];

// Helper to get today's date formatted as YYYY-MM-DD
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Initial Sample Attendance for today
function generateSeedAttendance(): AttendanceRecord[] {
  const today = getTodayString();
  return [
    {
      id: `std-001_${today}`,
      studentId: 'std-001',
      studentName: 'Ahmad Fauzan',
      nis: '24251101',
      classId: 'class-xi-infor-1',
      className: 'XI Informatika 1',
      date: today,
      time: '07:18:24',
      status: 'hadir',
      method: 'face_recognition',
      confidence: 96.8,
    },
    {
      id: `std-002_${today}`,
      studentId: 'std-002',
      studentName: 'Budi Saputra',
      nis: '24251102',
      classId: 'class-xi-infor-1',
      className: 'XI Informatika 1',
      date: today,
      time: '07:35:12',
      status: 'terlambat',
      method: 'face_recognition',
      confidence: 94.2,
      notes: 'Ban sepeda bocor',
    },
    {
      id: `std-003_${today}`,
      studentId: 'std-003',
      studentName: 'Citra Amelia',
      nis: '24251103',
      classId: 'class-xi-infor-1',
      className: 'XI Informatika 1',
      date: today,
      time: '07:22:05',
      status: 'hadir',
      method: 'face_recognition',
      confidence: 97.4,
    },
  ];
}

// Generate default realistic lesson schedules for a class across standard weekdays
export function generateDefaultClassSchedule(classId: string, className = 'Kelas'): LessonScheduleItem[] {
  const isInfo1 = classId.includes('infor-1');
  const isInfo2 = classId.includes('infor-2');
  const isDkv = classId.includes('dkv');
  const isMipa = classId.includes('mipa');

  const mainMajorSubject = isDkv
    ? 'Desain Komunikasi Visual (DKV)'
    : isInfo1 || isInfo2
    ? 'Informatika (Pemrograman & Web)'
    : isMipa
    ? 'Fisika & Matematika Peminatan'
    : 'Mata Pelajaran Kejuruan';

  const teacherName = isDkv
    ? 'Citra Dewi, S.Sn'
    : isInfo1
    ? 'Dra. Sri Wahyuni, M.Kom'
    : isInfo2
    ? 'Budi Santoso, S.Pd'
    : 'Drs. H. Ahmad Dahlan';

  const defaultRoom = isDkv ? 'Studio Multimedia' : isInfo1 || isInfo2 ? 'Lab Komputer 1' : 'Ruang Kelas';

  return [
    // SENIN
    {
      id: `sch-${classId}-senin-1`,
      classId,
      className,
      day: 'Senin',
      jamKe: 1,
      startTime: '07:00',
      endTime: '07:45',
      lateToleranceMinutes: 10,
      subject: 'Upacara Bendera & Pembiasaan Karakter',
      teacherName,
      room: 'Lapangan Utama',
      notes: 'Wajib hadir tepat waktu untuk upacara bendera',
    },
    {
      id: `sch-${classId}-senin-2`,
      classId,
      className,
      day: 'Senin',
      jamKe: 2,
      startTime: '07:45',
      endTime: '08:30',
      lateToleranceMinutes: 10,
      subject: mainMajorSubject,
      teacherName,
      room: defaultRoom,
    },
    {
      id: `sch-${classId}-senin-3`,
      classId,
      className,
      day: 'Senin',
      jamKe: 3,
      startTime: '08:30',
      endTime: '09:15',
      lateToleranceMinutes: 10,
      subject: mainMajorSubject,
      teacherName,
      room: defaultRoom,
    },
    {
      id: `sch-${classId}-senin-4`,
      classId,
      className,
      day: 'Senin',
      jamKe: 4,
      startTime: '09:45',
      endTime: '10:30',
      lateToleranceMinutes: 10,
      subject: 'Matematika',
      teacherName: 'Budi Santoso, S.Pd',
      room: 'Ruang Kelas',
    },
    {
      id: `sch-${classId}-senin-5`,
      classId,
      className,
      day: 'Senin',
      jamKe: 5,
      startTime: '10:30',
      endTime: '11:15',
      lateToleranceMinutes: 10,
      subject: 'Matematika',
      teacherName: 'Budi Santoso, S.Pd',
      room: 'Ruang Kelas',
    },
    {
      id: `sch-${classId}-senin-6`,
      classId,
      className,
      day: 'Senin',
      jamKe: 6,
      startTime: '11:15',
      endTime: '12:00',
      lateToleranceMinutes: 10,
      subject: 'Bahasa Inggris',
      teacherName: 'Anita Wijaya, M.Pd',
      room: 'Ruang Kelas',
    },
    {
      id: `sch-${classId}-senin-7`,
      classId,
      className,
      day: 'Senin',
      jamKe: 7,
      startTime: '12:45',
      endTime: '13:30',
      lateToleranceMinutes: 10,
      subject: 'Bahasa Indonesia',
      teacherName: 'Drs. H. Ahmad Dahlan',
      room: 'Ruang Kelas',
    },

    // SELASA
    {
      id: `sch-${classId}-selasa-1`,
      classId,
      className,
      day: 'Selasa',
      jamKe: 1,
      startTime: '07:00',
      endTime: '07:45',
      lateToleranceMinutes: 10,
      subject: 'Literasi & ' + mainMajorSubject,
      teacherName,
      room: defaultRoom,
    },
    {
      id: `sch-${classId}-selasa-2`,
      classId,
      className,
      day: 'Selasa',
      jamKe: 2,
      startTime: '07:45',
      endTime: '08:30',
      lateToleranceMinutes: 10,
      subject: mainMajorSubject,
      teacherName,
      room: defaultRoom,
    },
    {
      id: `sch-${classId}-selasa-3`,
      classId,
      className,
      day: 'Selasa',
      jamKe: 3,
      startTime: '08:30',
      endTime: '09:15',
      lateToleranceMinutes: 10,
      subject: 'Fisika Terapan',
      teacherName: 'Hendra Prasetyo, M.Si',
      room: 'Lab Fisika',
    },
    {
      id: `sch-${classId}-selasa-4`,
      classId,
      className,
      day: 'Selasa',
      jamKe: 4,
      startTime: '09:45',
      endTime: '10:30',
      lateToleranceMinutes: 10,
      subject: 'Fisika Terapan',
      teacherName: 'Hendra Prasetyo, M.Si',
      room: 'Lab Fisika',
    },
    {
      id: `sch-${classId}-selasa-5`,
      classId,
      className,
      day: 'Selasa',
      jamKe: 5,
      startTime: '10:30',
      endTime: '11:15',
      lateToleranceMinutes: 10,
      subject: 'Pendidikan Agama Islam (PAI)',
      teacherName: 'Ustadz M. Ridwan, S.Ag',
      room: 'Ruang Kelas',
    },
    {
      id: `sch-${classId}-selasa-6`,
      classId,
      className,
      day: 'Selasa',
      jamKe: 6,
      startTime: '11:15',
      endTime: '12:00',
      lateToleranceMinutes: 10,
      subject: 'Pendidikan Agama Islam (PAI)',
      teacherName: 'Ustadz M. Ridwan, S.Ag',
      room: 'Ruang Kelas',
    },
    {
      id: `sch-${classId}-selasa-7`,
      classId,
      className,
      day: 'Selasa',
      jamKe: 7,
      startTime: '12:45',
      endTime: '13:30',
      lateToleranceMinutes: 10,
      subject: 'Sejarah Indonesia',
      teacherName: 'Rina Marlina, S.Pd',
      room: 'Ruang Kelas',
    },

    // RABU
    {
      id: `sch-${classId}-rabu-1`,
      classId,
      className,
      day: 'Rabu',
      jamKe: 1,
      startTime: '07:00',
      endTime: '07:45',
      lateToleranceMinutes: 10,
      subject: 'PJOK (Pendidikan Jasmani & Olahraga)',
      teacherName: 'Bambang Sutrisno, S.Pd',
      room: 'Lapangan Olahraga',
    },
    {
      id: `sch-${classId}-rabu-2`,
      classId,
      className,
      day: 'Rabu',
      jamKe: 2,
      startTime: '07:45',
      endTime: '08:30',
      lateToleranceMinutes: 10,
      subject: 'PJOK (Pendidikan Jasmani & Olahraga)',
      teacherName: 'Bambang Sutrisno, S.Pd',
      room: 'Lapangan Olahraga',
    },
    {
      id: `sch-${classId}-rabu-3`,
      classId,
      className,
      day: 'Rabu',
      jamKe: 3,
      startTime: '08:30',
      endTime: '09:15',
      lateToleranceMinutes: 10,
      subject: 'PJOK (Pendidikan Jasmani & Olahraga)',
      teacherName: 'Bambang Sutrisno, S.Pd',
      room: 'Lapangan Olahraga',
    },
    {
      id: `sch-${classId}-rabu-4`,
      classId,
      className,
      day: 'Rabu',
      jamKe: 4,
      startTime: '09:45',
      endTime: '10:30',
      lateToleranceMinutes: 10,
      subject: 'Bahasa Inggris',
      teacherName: 'Anita Wijaya, M.Pd',
      room: 'Ruang Kelas',
    },
    {
      id: `sch-${classId}-rabu-5`,
      classId,
      className,
      day: 'Rabu',
      jamKe: 5,
      startTime: '10:30',
      endTime: '11:15',
      lateToleranceMinutes: 10,
      subject: 'Kimia Terapan',
      teacherName: 'Dr. Nurul Hidayati, M.Sc',
      room: 'Lab Kimia',
    },
    {
      id: `sch-${classId}-rabu-6`,
      classId,
      className,
      day: 'Rabu',
      jamKe: 6,
      startTime: '11:15',
      endTime: '12:00',
      lateToleranceMinutes: 10,
      subject: 'Pendidikan Pancasila (PPKn)',
      teacherName: 'Wahid Hasyim, S.Pd',
      room: 'Ruang Kelas',
    },

    // KAMIS
    {
      id: `sch-${classId}-kamis-1`,
      classId,
      className,
      day: 'Kamis',
      jamKe: 1,
      startTime: '07:00',
      endTime: '07:45',
      lateToleranceMinutes: 10,
      subject: 'Jaringan Komputer & Basis Data',
      teacherName: 'Andi Kusuma, S.Kom',
      room: defaultRoom,
    },
    {
      id: `sch-${classId}-kamis-2`,
      classId,
      className,
      day: 'Kamis',
      jamKe: 2,
      startTime: '07:45',
      endTime: '08:30',
      lateToleranceMinutes: 10,
      subject: 'Jaringan Komputer & Basis Data',
      teacherName: 'Andi Kusuma, S.Kom',
      room: defaultRoom,
    },
    {
      id: `sch-${classId}-kamis-3`,
      classId,
      className,
      day: 'Kamis',
      jamKe: 3,
      startTime: '08:30',
      endTime: '09:15',
      lateToleranceMinutes: 10,
      subject: 'Matematika',
      teacherName: 'Budi Santoso, S.Pd',
      room: 'Ruang Kelas',
    },
    {
      id: `sch-${classId}-kamis-4`,
      classId,
      className,
      day: 'Kamis',
      jamKe: 4,
      startTime: '09:45',
      endTime: '10:30',
      lateToleranceMinutes: 10,
      subject: 'Seni Budaya & Desain',
      teacherName: 'Citra Dewi, S.Sn',
      room: 'Studio Multimedia',
    },
    {
      id: `sch-${classId}-kamis-5`,
      classId,
      className,
      day: 'Kamis',
      jamKe: 5,
      startTime: '10:30',
      endTime: '11:15',
      lateToleranceMinutes: 10,
      subject: 'Seni Budaya & Desain',
      teacherName: 'Citra Dewi, S.Sn',
      room: 'Studio Multimedia',
    },
    {
      id: `sch-${classId}-kamis-6`,
      classId,
      className,
      day: 'Kamis',
      jamKe: 6,
      startTime: '11:15',
      endTime: '12:00',
      lateToleranceMinutes: 10,
      subject: 'Bahasa Indonesia',
      teacherName: 'Drs. H. Ahmad Dahlan',
      room: 'Ruang Kelas',
    },

    // JUMAT
    {
      id: `sch-${classId}-jumat-1`,
      classId,
      className,
      day: 'Jumat',
      jamKe: 1,
      startTime: '07:00',
      endTime: '07:45',
      lateToleranceMinutes: 10,
      subject: 'Senam Pagi & Sholat Dhuha Berjamaah',
      teacherName: 'Tim Kesiswaan',
      room: 'Halaman / Masjid',
    },
    {
      id: `sch-${classId}-jumat-2`,
      classId,
      className,
      day: 'Jumat',
      jamKe: 2,
      startTime: '07:45',
      endTime: '08:30',
      lateToleranceMinutes: 10,
      subject: 'Bimbingan Konseling (BK)',
      teacherName: 'Fitri Handayani, S.Psi',
      room: 'Ruang BK',
    },
    {
      id: `sch-${classId}-jumat-3`,
      classId,
      className,
      day: 'Jumat',
      jamKe: 3,
      startTime: '08:30',
      endTime: '09:15',
      lateToleranceMinutes: 10,
      subject: 'Bahasa Daerah / Muatan Lokal',
      teacherName: 'Suhartono, S.Pd',
      room: 'Ruang Kelas',
    },
    {
      id: `sch-${classId}-jumat-4`,
      classId,
      className,
      day: 'Jumat',
      jamKe: 4,
      startTime: '09:30',
      endTime: '10:15',
      lateToleranceMinutes: 10,
      subject: 'Projek Penguatan Pelajar Pancasila (P5)',
      teacherName: 'Tim Fasilitator P5',
      room: 'Aula Sekolah',
    },
    {
      id: `sch-${classId}-jumat-5`,
      classId,
      className,
      day: 'Jumat',
      jamKe: 5,
      startTime: '10:15',
      endTime: '11:00',
      lateToleranceMinutes: 10,
      subject: 'Projek Penguatan Pelajar Pancasila (P5)',
      teacherName: 'Tim Fasilitator P5',
      room: 'Aula Sekolah',
    },

    // SABTU
    {
      id: `sch-${classId}-sabtu-1`,
      classId,
      className,
      day: 'Sabtu',
      jamKe: 1,
      startTime: '07:30',
      endTime: '08:15',
      lateToleranceMinutes: 10,
      subject: 'Pramuka Wajib',
      teacherName: 'Pembina Pramuka',
      room: 'Lapangan Utama',
    },
    {
      id: `sch-${classId}-sabtu-2`,
      classId,
      className,
      day: 'Sabtu',
      jamKe: 2,
      startTime: '08:15',
      endTime: '09:00',
      lateToleranceMinutes: 10,
      subject: 'Ekstrakurikuler Pilihan & Pengembangan Minat',
      teacherName: 'Instruktur Ekskul',
      room: 'Ruang Kegiatan',
    },
  ];
}

// Generate default schedules across all seed classes
function generateSeedLessonSchedules(): LessonScheduleItem[] {
  const result: LessonScheduleItem[] = [];
  for (const c of DEFAULT_CLASSES) {
    result.push(...generateDefaultClassSchedule(c.id, c.name));
  }
  return result;
}

export const storageService = {
  // Config
  getConfig(): ClassConfig {
    try {
      const data = localStorage.getItem(CONFIG_KEY);
      if (!data) return DEFAULT_CONFIG;
      const parsed = JSON.parse(data);
      const config = { ...DEFAULT_CONFIG, ...parsed };
      // Automatically calibrate old overly-loose recognition thresholds (>0.47) to 0.45 for accurate student discrimination
      if (typeof config.recognitionThreshold === 'number' && config.recognitionThreshold > 0.47) {
        config.recognitionThreshold = 0.45;
      }
      return config;
    } catch {
      return DEFAULT_CONFIG;
    }
  },

  saveConfig(config: ClassConfig): void {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    this.addAuditLog('Perbarui Pengaturan', 'Pengaturan sistem diperbarui');
  },

  // Classes
  getClasses(): ClassItem[] {
    try {
      const data = localStorage.getItem(CLASSES_KEY);
      if (!data) {
        localStorage.setItem(CLASSES_KEY, JSON.stringify(DEFAULT_CLASSES));
        return DEFAULT_CLASSES;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_CLASSES;
    }
  },

  saveClasses(classes: ClassItem[]): void {
    localStorage.setItem(CLASSES_KEY, JSON.stringify(classes));
  },

  getClassById(id: string): ClassItem | undefined {
    return this.getClasses().find((c) => c.id === id);
  },

  getActiveClass(): ClassItem {
    const config = this.getConfig();
    const classes = this.getClasses();
    return classes.find((c) => c.id === config.activeClassId) || classes[0] || DEFAULT_CLASSES[0];
  },

  saveClass(item: ClassItem): void {
    const classes = this.getClasses();
    const idx = classes.findIndex((c) => c.id === item.id);
    if (idx >= 0) {
      classes[idx] = item;
      this.addAuditLog('Perbarui Kelas', `Data kelas ${item.name} diperbarui`);
    } else {
      classes.push(item);
      this.addAuditLog('Tambah Kelas', `Kelas baru ${item.name} ditambahkan`);
    }
    this.saveClasses(classes);
  },

  deleteClass(id: string): void {
    const classes = this.getClasses();
    const target = classes.find((c) => c.id === id);
    const updated = classes.filter((c) => c.id !== id);
    this.saveClasses(updated);
    if (target) {
      this.addAuditLog('Hapus Kelas', `Kelas ${target.name} dihapus dari sistem`);
    }
  },

  // Students
  getStudents(): Student[] {
    try {
      const data = localStorage.getItem(STUDENTS_KEY);
      if (!data) {
        localStorage.setItem(STUDENTS_KEY, JSON.stringify(DEFAULT_STUDENTS));
        return DEFAULT_STUDENTS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_STUDENTS;
    }
  },

  saveStudents(students: Student[]): void {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  },

  getStudentById(id: string): Student | undefined {
    const students = this.getStudents();
    return students.find((s) => s.id === id);
  },

  saveStudent(student: Student): void {
    const students = this.getStudents();
    const idx = students.findIndex((s) => s.id === student.id);
    if (idx >= 0) {
      students[idx] = student;
      this.addAuditLog('Perbarui Siswa', `Data siswa ${student.name} diperbarui`);
    } else {
      students.push(student);
      this.addAuditLog('Tambah Siswa', `Siswa baru ${student.name} (NIS: ${student.nis}) ditambahkan`);
    }
    this.saveStudents(students);
  },

  saveBatchStudents(newStudents: Student[]): Student[] {
    const students = this.getStudents();
    let updatedCount = 0;
    let addedCount = 0;

    for (const student of newStudents) {
      // Strictly scope existing student matching to the SAME class to prevent deleting or overwriting other classes
      const idx = students.findIndex(
        (s) =>
          (s.id === student.id && s.classId === student.classId) ||
          (s.classId === student.classId &&
            s.nis &&
            student.nis &&
            s.nis.trim().toLowerCase() === student.nis.trim().toLowerCase())
      );
      if (idx >= 0) {
        // Resolve student ID to preserve the existing Firestore document ID
        student.id = students[idx].id;
        // Update existing student in this class, preserving facial biometric data if already registered
        students[idx] = {
          ...students[idx],
          ...student,
          id: students[idx].id,
          classId: students[idx].classId, // Guarantee classId is never accidentally altered
          className: student.className || students[idx].className,
          faceRegistered: students[idx].faceRegistered || student.faceRegistered,
          faceDescriptors: students[idx].faceDescriptors || student.faceDescriptors,
          photoUrl: students[idx].photoUrl || student.photoUrl,
          registeredAt: students[idx].registeredAt || student.registeredAt,
        };
        updatedCount++;
      } else {
        // Ensure new student has unique distinct ID that cannot collide with any other class
        if (!student.id || students.some((s) => s.id === student.id)) {
          student.id = `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${Math.floor(
            Math.random() * 10000
          )}`;
        }
        students.push(student);
        addedCount++;
      }
    }

    this.saveStudents(students);
    this.addAuditLog('Import Siswa Massal', `Berhasil mengimpor ${addedCount} siswa baru dan memperbarui ${updatedCount} siswa`);
    return students;
  },

  deleteStudent(id: string): void {
    const students = this.getStudents();
    const student = students.find((s) => s.id === id);
    const updated = students.filter((s) => s.id !== id);
    this.saveStudents(updated);
    if (student) {
      this.addAuditLog('Hapus Siswa', `Siswa ${student.name} dihapus dari daftar`);
    }
  },

  saveFaceRegistration(studentId: string, descriptors: number[][], photoDataUrl?: string): boolean {
    const students = this.getStudents();
    const idx = students.findIndex((s) => s.id === studentId);
    if (idx === -1) return false;

    students[idx].faceRegistered = true;
    students[idx].faceDescriptors = descriptors;
    students[idx].registeredAt = new Date().toLocaleString('id-ID');
    if (photoDataUrl) {
      students[idx].photoUrl = photoDataUrl;
    }
    this.saveStudents(students);
    this.addAuditLog('Registrasi Wajah', `Wajah siswa ${students[idx].name} berhasil didaftarkan (${descriptors.length} sampel)`);
    return true;
  },

  deleteFaceRegistration(studentId: string): boolean {
    const students = this.getStudents();
    const idx = students.findIndex((s) => s.id === studentId);
    if (idx === -1) return false;

    students[idx].faceRegistered = false;
    delete students[idx].faceDescriptors;
    delete students[idx].registeredAt;
    this.saveStudents(students);
    this.addAuditLog('Hapus Wajah', `Template wajah siswa ${students[idx].name} dihapus demi privasi`);
    return true;
  },

  // Attendance
  getAttendanceRecords(): AttendanceRecord[] {
    try {
      const data = localStorage.getItem(ATTENDANCE_KEY);
      if (!data) {
        const initial = generateSeedAttendance();
        localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveAttendanceRecords(records: AttendanceRecord[]): void {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
  },

  getTodayAttendance(classId?: string): AttendanceRecord[] {
    const today = getTodayString();
    let records = this.getAttendanceRecords().filter((r) => r.date === today);
    if (classId) {
      records = records.filter((r) => r.classId === classId);
    }
    return records;
  },

  // Lesson Schedules (Jam Pelajaran Per Kelas)
  getLessonSchedules(classId?: string): LessonScheduleItem[] {
    try {
      const data = localStorage.getItem(SCHEDULES_KEY);
      let list: LessonScheduleItem[] = [];
      if (!data) {
        list = generateSeedLessonSchedules();
        this.saveLessonSchedules(list);
      } else {
        list = JSON.parse(data);
      }
      if (classId) {
        return list.filter((s) => s.classId === classId);
      }
      return list;
    } catch {
      return generateSeedLessonSchedules();
    }
  },

  saveLessonSchedules(items: LessonScheduleItem[]): void {
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(items));
  },

  saveLessonSchedule(item: LessonScheduleItem): LessonScheduleItem {
    const list = this.getLessonSchedules();
    const idx = list.findIndex((s) => s.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
      this.addAuditLog('Perbarui Jadwal', `Jadwal ${item.subject} Jam Ke-${item.jamKe} (${item.day}) diperbarui`);
    } else {
      if (!item.id) {
        item.id = `sch-${item.classId}-${item.day.toLowerCase()}-${item.jamKe}-${Date.now()}`;
      }
      list.push(item);
      this.addAuditLog('Tambah Jadwal', `Jadwal baru ${item.subject} Jam Ke-${item.jamKe} (${item.day}) ditambahkan`);
    }
    this.saveLessonSchedules(list);
    return item;
  },

  deleteLessonSchedule(id: string): void {
    const list = this.getLessonSchedules();
    const item = list.find((s) => s.id === id);
    const updated = list.filter((s) => s.id !== id);
    this.saveLessonSchedules(updated);
    if (item) {
      this.addAuditLog('Hapus Jadwal', `Jadwal ${item.subject} Jam Ke-${item.jamKe} (${item.day}) dihapus`);
    }
  },

  saveBatchLessonSchedules(items: LessonScheduleItem[]): LessonScheduleItem[] {
    const list = this.getLessonSchedules();
    for (const item of items) {
      const idx = list.findIndex((s) => s.id === item.id);
      if (idx >= 0) {
        list[idx] = item;
      } else {
        list.push(item);
      }
    }
    this.saveLessonSchedules(list);
    this.addAuditLog('Batch Jadwal', `Menyimpan ${items.length} jam pelajaran`);
    return list;
  },

  copyScheduleToDay(classId: string, fromDay: DayOfWeek, toDay: DayOfWeek): LessonScheduleItem[] {
    const list = this.getLessonSchedules();
    const sourceItems = list.filter((s) => s.classId === classId && s.day === fromDay);
    if (sourceItems.length === 0) return list;

    // Filter out existing target day items for this class
    const withoutTarget = list.filter((s) => !(s.classId === classId && s.day === toDay));
    const newItems: LessonScheduleItem[] = sourceItems.map((item) => ({
      ...item,
      id: `sch-${classId}-${toDay.toLowerCase()}-${item.jamKe}-${Math.random().toString(36).substring(2, 6)}`,
      day: toDay,
    }));
    const combined = [...withoutTarget, ...newItems];
    this.saveLessonSchedules(combined);
    this.addAuditLog('Salin Jadwal', `Menyalin ${sourceItems.length} jam pelajaran dari hari ${fromDay} ke ${toDay}`);
    return combined;
  },

  generateDefaultScheduleForClass(classId: string, className?: string): LessonScheduleItem[] {
    const defaultItems = generateDefaultClassSchedule(classId, className);
    const list = this.getLessonSchedules();
    // Remove existing for this class
    const withoutClass = list.filter((s) => s.classId !== classId);
    const combined = [...withoutClass, ...defaultItems];
    this.saveLessonSchedules(combined);
    this.addAuditLog('Template Jadwal', `Memuat template standar jam pelajaran untuk ${className || classId}`);
    return combined;
  },

  hasStudentAttendedToday(studentId: string, dateStr?: string, jamKe?: number): AttendanceRecord | undefined {
    const date = dateStr || getTodayString();
    const records = this.getAttendanceRecords();
    if (typeof jamKe === 'number') {
      return records.find((r) => r.studentId === studentId && r.date === date && r.jamKe === jamKe);
    }
    // Daily general attendance (no jamKe)
    return records.find((r) => r.studentId === studentId && r.date === date && (r.jamKe === undefined || r.isDailyAttendance));
  },

  recordAttendance(record: Omit<AttendanceRecord, 'id'>): { success: boolean; record?: AttendanceRecord; reason?: string } {
    const id = record.jamKe
      ? `${record.studentId}_${record.date}_jam${record.jamKe}`
      : `${record.studentId}_${record.date}`;
    const existing = this.hasStudentAttendedToday(record.studentId, record.date, record.jamKe);

    if (existing) {
      return {
        success: false,
        record: existing,
        reason: 'already_attended',
      };
    }

    const newRecord: AttendanceRecord = {
      ...record,
      id,
    };

    const records = this.getAttendanceRecords();
    records.unshift(newRecord);
    this.saveAttendanceRecords(records);
    const labelJam = record.jamKe ? ` [Jam Ke-${record.jamKe}: ${record.subject || ''}]` : '';
    this.addAuditLog('Presensi Tercatat', `Presensi ${newRecord.studentName}${labelJam} tercatat (${newRecord.status.toUpperCase()}) jam ${newRecord.time}`);

    return { success: true, record: newRecord };
  },

  updateAttendanceStatus(recordId: string, status: AttendanceRecord['status'], notes?: string): void {
    const records = this.getAttendanceRecords();
    const idx = records.findIndex((r) => r.id === recordId);
    if (idx >= 0) {
      records[idx].status = status;
      if (notes !== undefined) records[idx].notes = notes;
      this.saveAttendanceRecords(records);
      this.addAuditLog('Ubah Status Presensi', `Status presensi ${records[idx].studentName} diubah menjadi ${status.toUpperCase()}`);
    }
  },

  resetTodayAttendance(classId?: string): void {
    const today = getTodayString();
    const records = this.getAttendanceRecords();
    const remaining = records.filter((r) => {
      if (r.date !== today) return true;
      if (classId && r.classId !== classId) return true;
      return false;
    });
    this.saveAttendanceRecords(remaining);
    this.addAuditLog('Reset Presensi Harian', `Presensi tanggal ${today} direset`);
  },

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    try {
      const data = localStorage.getItem(AUDIT_LOG_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  addAuditLog(action: string, detail: string, actor = 'Guru'): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleString('id-ID'),
      action,
      detail,
      actor,
    };
    logs.unshift(newLog);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs.slice(0, 100)));
  },

  exportAllData(): string {
    const payload = {
      config: this.getConfig(),
      classes: this.getClasses(),
      students: this.getStudents(),
      lessonSchedules: this.getLessonSchedules(),
      attendance: this.getAttendanceRecords(),
      auditLogs: this.getAuditLogs(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(payload, null, 2);
  },

  importAllData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.config) localStorage.setItem(CONFIG_KEY, JSON.stringify(parsed.config));
      if (parsed.classes) localStorage.setItem(CLASSES_KEY, JSON.stringify(parsed.classes));
      if (parsed.students) localStorage.setItem(STUDENTS_KEY, JSON.stringify(parsed.students));
      if (parsed.lessonSchedules) localStorage.setItem(SCHEDULES_KEY, JSON.stringify(parsed.lessonSchedules));
      if (parsed.attendance) localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(parsed.attendance));
      if (parsed.auditLogs) localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(parsed.auditLogs));
      this.addAuditLog('Restore Data', 'Data sistem berhasil dipulihkan dari file backup');
      return true;
    } catch {
      return false;
    }
  },

  resetToDefault(): void {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
    localStorage.setItem(CLASSES_KEY, JSON.stringify(DEFAULT_CLASSES));
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(DEFAULT_STUDENTS));
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(generateSeedLessonSchedules()));
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(generateSeedAttendance()));
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify([]));
    this.addAuditLog('Reset Sistem', 'Seluruh data direset kembali ke konfigurasi awal bawaan');
  },
};
