export type Gender = 'L' | 'P';

export type AttendanceStatus = 'hadir' | 'terlambat' | 'sakit' | 'izin' | 'alpa';

export interface ClassItem {
  id: string;
  name: string; // e.g. "XI Informatika 1"
  teacherName: string; // e.g. "Dra. Sri Wahyuni, M.Kom"
  academicYear: string; // e.g. "2026/2027"
  presentEndTime?: string; // e.g. "07:30"
  lateEndTime?: string; // e.g. "08:00"
  room?: string;
}

export interface ClassConfig {
  schoolName: string;
  activeClassId: string;
  className?: string;
  teacherName?: string;
  academicYear: string;
  presentStartTime: string; // e.g. "06:30"
  presentEndTime: string;   // e.g. "07:30"
  lateEndTime: string;      // e.g. "08:00"
  afterLateStatus: 'terlambat' | 'alpa';
  livenessEnabled: boolean;
  soundEnabled: boolean;
  autoCaptureCooldown: number; // in seconds, default 2.5
  recognitionThreshold: number; // default 0.55
  fastModeEnabled?: boolean; // Default true: 3x-5x speedup for low-end hardware
  lowLightEnhance?: boolean; // Default true: auto-boost for low quality/dim cameras
}

export interface Student {
  id: string;
  nis: string;
  nisn?: string;
  name: string;
  gender: Gender;
  classId: string;
  className?: string;
  photoUrl: string;
  faceRegistered: boolean;
  faceDescriptors?: number[][]; // Multiple sample embeddings
  faceDescriptorsJson?: string; // Serialized descriptors for database storage
  registeredAt?: string;
  phone?: string;
  notes?: string;
}

export type DayOfWeek = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';

export interface LessonScheduleItem {
  id: string; // e.g. "sch-xi-infor-1-senin-1"
  classId: string; // ID of the class (per kelas)
  className?: string;
  day: DayOfWeek; // Hari
  jamKe: number; // Jam Ke-1, 2, 3, dst.
  startTime: string; // e.g. "07:00"
  endTime: string; // e.g. "07:45"
  lateToleranceMinutes: number; // e.g. 10 (menit toleransi keterlambatan)
  subject: string; // Mata Pelajaran
  teacherName?: string; // Guru Pengampu
  room?: string; // Ruang Kelas / Lab
  notes?: string;
}

export interface AttendanceRecord {
  id: string; // format: ${studentId}_${date} or ${studentId}_${date}_jam${jamKe}
  studentId: string;
  studentName: string;
  nis: string;
  classId?: string;
  className?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  status: AttendanceStatus;
  method: 'face_recognition' | 'manual';
  confidence?: number; // e.g. 96 (%)
  snapshotUrl?: string; // Captured face snapshot
  notes?: string;
  // Per Jam Pelajaran fields
  scheduleId?: string;
  jamKe?: number; // Jam Ke-X (1, 2, 3...)
  subject?: string; // Mata Pelajaran
  isDailyAttendance?: boolean; // True jika absensi masuk harian umum
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
  actor: string;
}

export interface FaceQualityInfo {
  faceDetected: boolean;
  multipleFaces: boolean;
  tooFar: boolean;
  tooClose: boolean;
  poorLighting: boolean;
  blurry: boolean;
  goodQuality: boolean;
  message: string;
  box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  brightnessScore?: number; // 0-100
  sharpnessScore?: number;  // 0-100
  poseDirection?: 'center' | 'left' | 'right' | 'up' | 'down';
}

export interface LivenessState {
  step: 'none' | 'center' | 'blink' | 'turn' | 'verified' | 'failed';
  message: string;
  progress: number;
  verified: boolean;
}

export interface StudentRekapRow {
  student: Student;
  hadir: number;
  terlambat: number;
  sakit: number;
  izin: number;
  alpa: number;
  totalDays: number;
  attendancePercent: number;
}

export interface ExcelImportPreviewRow {
  nis: string;
  nisn: string;
  name: string;
  gender: Gender;
  className: string;
  classId?: string;
  phone: string;
  notes: string;
  status: 'valid' | 'update' | 'duplicate_nis' | 'missing_required' | 'unknown_class';
  errorMessage?: string;
}

export interface ParsedExcelResult {
  previewRows: ExcelImportPreviewRow[];
  sheetNames: string[];
  activeSheetName: string;
}
