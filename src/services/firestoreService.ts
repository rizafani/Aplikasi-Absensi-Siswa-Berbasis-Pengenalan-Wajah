import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  deleteField,
  onSnapshot,
  query,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ClassConfig, Student, AttendanceRecord, AuditLog, AttendanceStatus, ClassItem, LessonScheduleItem } from '../types';
import { DEFAULT_CONFIG, storageService } from './storageService';

// Collection names matching firebase-blueprint.json and firestore.rules
const CONFIG_COLLECTION = 'config';
const CLASSES_COLLECTION = 'classes';
const STUDENTS_COLLECTION = 'students';
const ATTENDANCE_COLLECTION = 'attendance';
const AUDIT_LOGS_COLLECTION = 'audit_logs';
const SCHEDULES_COLLECTION = 'lesson_schedules';

/**
 * Strips undefined properties and converts empty strings/nulls cleanly for Firestore
 */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = sanitizeForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Serializes student data for Firestore:
 * - Strips undefined properties
 * - Converts multi-dimensional number[][] face descriptors to faceDescriptorsJson string
 *   because Firestore strictly prohibits nested arrays (Function setDoc called with invalid data. Nested arrays are not supported)
 */
function serializeStudentForFirestore(student: Student): Record<string, any> {
  const result: any = sanitizeForFirestore(student);
  if (student.faceDescriptors && Array.isArray(student.faceDescriptors)) {
    result.faceDescriptorsJson = JSON.stringify(student.faceDescriptors);
    delete result.faceDescriptors;
  }
  return result;
}

/**
 * Deserializes student document from Firestore into application Student model:
 * - Unpacks faceDescriptorsJson into faceDescriptors: number[][]
 * - Preserves backward compatibility if faceDescriptors was stored as array of objects
 */
function deserializeStudentFromFirestore(raw: any): Student {
  const student: Student = { ...raw };
  if (raw.faceDescriptorsJson && typeof raw.faceDescriptorsJson === 'string') {
    try {
      student.faceDescriptors = JSON.parse(raw.faceDescriptorsJson);
    } catch (e) {
      console.warn('Failed to parse faceDescriptorsJson for student:', student.id, e);
    }
  } else if (Array.isArray(raw.faceDescriptors) && raw.faceDescriptors.length > 0) {
    if (raw.faceDescriptors[0] && typeof raw.faceDescriptors[0] === 'object' && Array.isArray(raw.faceDescriptors[0].values)) {
      student.faceDescriptors = raw.faceDescriptors.map((item: any) => item.values);
    }
  }
  return student;
}

export const firestoreService = {
  // 1. Config operations
  async saveConfig(config: ClassConfig): Promise<void> {
    const path = `${CONFIG_COLLECTION}/class_main`;
    try {
      await setDoc(doc(db, CONFIG_COLLECTION, 'class_main'), config);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  subscribeConfig(callback: (config: ClassConfig) => void): () => void {
    const docRef = doc(db, CONFIG_COLLECTION, 'class_main');
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as ClassConfig);
        } else {
          this.saveConfig(DEFAULT_CONFIG).catch(() => {});
          callback(DEFAULT_CONFIG);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `${CONFIG_COLLECTION}/class_main`);
      }
    );
  },

  // 2. Classes operations (Multi-Class)
  async saveClass(item: ClassItem): Promise<void> {
    const path = `${CLASSES_COLLECTION}/${item.id}`;
    try {
      await setDoc(doc(db, CLASSES_COLLECTION, item.id), item);
      await this.addAuditLog('Perbarui Kelas', `Data kelas ${item.name} disimpan ke database`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteClass(id: string): Promise<void> {
    const path = `${CLASSES_COLLECTION}/${id}`;
    try {
      await deleteDoc(doc(db, CLASSES_COLLECTION, id));
      await this.addAuditLog('Hapus Kelas', `Kelas ID ${id} dihapus dari database`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  subscribeClasses(callback: (classes: ClassItem[]) => void): () => void {
    const colRef = collection(db, CLASSES_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const classes: ClassItem[] = [];
        snapshot.forEach((docSnap) => {
          classes.push(docSnap.data() as ClassItem);
        });
        classes.sort((a, b) => a.name.localeCompare(b.name));
        callback(classes);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, CLASSES_COLLECTION);
      }
    );
  },

  // 3. Students operations
  async saveStudent(student: Student): Promise<void> {
    const path = `${STUDENTS_COLLECTION}/${student.id}`;
    try {
      const serialized = serializeStudentForFirestore(student);
      await setDoc(doc(db, STUDENTS_COLLECTION, student.id), serialized, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveBatchStudents(students: Student[]): Promise<void> {
    if (!students || students.length === 0) return;
    try {
      // Use writeBatch for atomic and high-performance multi-document writes
      // Chunk into batches of up to 400 documents (Firestore limit is 500)
      const chunkSize = 400;
      for (let i = 0; i < students.length; i += chunkSize) {
        const chunk = students.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const s of chunk) {
          const serialized = serializeStudentForFirestore(s);
          const docRef = doc(db, STUDENTS_COLLECTION, s.id);
          batch.set(docRef, serialized, { merge: true });
        }
        await batch.commit();
      }
      await this.addAuditLog('Import Siswa', `Berhasil menyimpan permanen ${students.length} siswa ke database`);
    } catch (error) {
      console.error('saveBatchStudents failed:', error);
      handleFirestoreError(error, OperationType.WRITE, STUDENTS_COLLECTION);
    }
  },

  async deleteStudent(id: string): Promise<void> {
    const path = `${STUDENTS_COLLECTION}/${id}`;
    try {
      await deleteDoc(doc(db, STUDENTS_COLLECTION, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  subscribeStudents(callback: (students: Student[]) => void): () => void {
    const colRef = collection(db, STUDENTS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const localStudents = storageService.getStudents();
        const localMap = new Map(localStudents.map((s) => [s.id, s]));

        const students: Student[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data();
          const student = deserializeStudentFromFirestore(raw);

          // If the Firestore document has faceRegistered === true but descriptors are missing in snapshot, preserve local descriptors
          const local = localMap.get(student.id);
          if (student.faceRegistered && (!student.faceDescriptors || student.faceDescriptors.length === 0)) {
            if (local?.faceDescriptors && local.faceDescriptors.length > 0) {
              student.faceDescriptors = local.faceDescriptors;
            }
          }
          students.push(student);
        });
        students.sort((a, b) => a.name.localeCompare(b.name));
        callback(students);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, STUDENTS_COLLECTION);
      }
    );
  },

  async saveFaceRegistration(studentId: string, descriptors: number[][], photoUrl?: string): Promise<void> {
    const path = `${STUDENTS_COLLECTION}/${studentId}`;
    try {
      const studentDoc = await getDoc(doc(db, STUDENTS_COLLECTION, studentId));
      let current: Student | undefined = studentDoc.exists()
        ? deserializeStudentFromFirestore(studentDoc.data())
        : undefined;

      // Fallback: If document does not exist yet in Firestore, retrieve from local storage
      if (!current) {
        current = storageService.getStudents().find((s) => s.id === studentId);
      }

      if (!current) {
        console.warn('saveFaceRegistration: Student not found:', studentId);
        return;
      }

      const updated: Student = {
        ...current,
        faceRegistered: true,
        faceDescriptors: descriptors,
        registeredAt: new Date().toLocaleString('id-ID'),
      };
      if (photoUrl) {
        updated.photoUrl = photoUrl;
      }

      const serialized = serializeStudentForFirestore(updated);
      await setDoc(doc(db, STUDENTS_COLLECTION, studentId), serialized, { merge: true });
      await this.addAuditLog('Registrasi Wajah', `Wajah siswa ${current.name} didaftarkan ke database (${descriptors.length} sampel)`);
    } catch (error) {
      console.error('saveFaceRegistration error:', error);
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteFaceRegistration(studentId: string): Promise<void> {
    const path = `${STUDENTS_COLLECTION}/${studentId}`;
    try {
      const studentDoc = await getDoc(doc(db, STUDENTS_COLLECTION, studentId));
      let current: Student | undefined = studentDoc.exists()
        ? deserializeStudentFromFirestore(studentDoc.data())
        : undefined;

      if (!current) {
        current = storageService.getStudents().find((s) => s.id === studentId);
      }
      if (!current) return;

      const updated: Student = {
        ...current,
        faceRegistered: false,
      };
      delete updated.faceDescriptors;
      delete updated.faceDescriptorsJson;
      delete updated.registeredAt;

      const serialized = serializeStudentForFirestore(updated);
      await setDoc(doc(db, STUDENTS_COLLECTION, studentId), {
        ...serialized,
        faceDescriptors: deleteField(),
        faceDescriptorsJson: deleteField(),
      }, { merge: true });
      await this.addAuditLog('Hapus Wajah', `Template biometrik wajah siswa ${current.name} dihapus dari database`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // 4. Attendance operations
  async recordAttendance(record: AttendanceRecord): Promise<void> {
    const path = `${ATTENDANCE_COLLECTION}/${record.id}`;
    try {
      await setDoc(doc(db, ATTENDANCE_COLLECTION, record.id), record);
      await this.addAuditLog(
        'Presensi Tercatat',
        `Presensi ${record.studentName} (${record.status.toUpperCase()}) tercatat di database`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateAttendanceStatus(recordId: string, status: AttendanceStatus, notes?: string): Promise<void> {
    const path = `${ATTENDANCE_COLLECTION}/${recordId}`;
    try {
      const recDoc = await getDoc(doc(db, ATTENDANCE_COLLECTION, recordId));
      if (!recDoc.exists()) return;
      const current = recDoc.data() as AttendanceRecord;
      const updated: AttendanceRecord = {
        ...current,
        status,
        ...(notes !== undefined ? { notes } : {}),
      };
      await setDoc(doc(db, ATTENDANCE_COLLECTION, recordId), updated);
      await this.addAuditLog('Ubah Status Presensi', `Status presensi ${current.studentName} diubah ke ${status.toUpperCase()}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async resetTodayAttendance(todayStr: string, classId?: string): Promise<void> {
    try {
      const q = query(collection(db, ATTENDANCE_COLLECTION));
      const snaps = await getDocs(q);
      const deletes: Promise<void>[] = [];
      snaps.forEach((docSnap) => {
        const data = docSnap.data() as AttendanceRecord;
        if (data.date === todayStr && (!classId || data.classId === classId)) {
          deletes.push(deleteDoc(doc(db, ATTENDANCE_COLLECTION, docSnap.id)));
        }
      });
      await Promise.all(deletes);
      await this.addAuditLog('Reset Presensi Harian', `Seluruh presensi tanggal ${todayStr} direset dari database`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, ATTENDANCE_COLLECTION);
    }
  },

  subscribeAttendance(callback: (records: AttendanceRecord[]) => void): () => void {
    const colRef = collection(db, ATTENDANCE_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const records: AttendanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          records.push(docSnap.data() as AttendanceRecord);
        });
        records.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
        callback(records);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, ATTENDANCE_COLLECTION);
      }
    );
  },

  // 5. Audit Log operations
  async addAuditLog(action: string, detail: string, actor = 'Guru'): Promise<void> {
    const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const path = `${AUDIT_LOGS_COLLECTION}/${id}`;
    const log: AuditLog = {
      id,
      timestamp: new Date().toLocaleString('id-ID'),
      action,
      detail,
      actor,
    };
    try {
      await setDoc(doc(db, AUDIT_LOGS_COLLECTION, id), log);
    } catch (error) {
      console.warn('Audit log write error:', error);
    }
  },

  subscribeAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
    const q = query(collection(db, AUDIT_LOGS_COLLECTION), limit(50));
    return onSnapshot(
      q,
      (snapshot) => {
        const logs: AuditLog[] = [];
        snapshot.forEach((docSnap) => {
          logs.push(docSnap.data() as AuditLog);
        });
        logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        callback(logs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, AUDIT_LOGS_COLLECTION);
      }
    );
  },

  // Seed initial data
  async seedInitialClasses(initialClasses: ClassItem[]): Promise<void> {
    try {
      const snap = await getDocs(collection(db, CLASSES_COLLECTION));
      if (snap.empty) {
        console.info('Seeding initial classes into Firestore...');
        for (const c of initialClasses) {
          await setDoc(doc(db, CLASSES_COLLECTION, c.id), c);
        }
      }
    } catch (err) {
      console.warn('Seeding initial classes error:', err);
    }
  },

  async seedInitialStudents(initialStudents: Student[]): Promise<void> {
    try {
      const snap = await getDocs(collection(db, STUDENTS_COLLECTION));
      if (snap.empty && initialStudents.length > 0) {
        console.info('Seeding initial students into Firestore...');
        const batch = writeBatch(db);
        for (const s of initialStudents.slice(0, 400)) {
          const serialized = serializeStudentForFirestore(s);
          batch.set(doc(db, STUDENTS_COLLECTION, s.id), serialized, { merge: true });
        }
        await batch.commit();
      }
    } catch (err) {
      console.warn('Seeding initial students error:', err);
    }
  },

  // 6. Lesson Schedules Operations (Jam Pelajaran)
  async saveLessonSchedule(item: LessonScheduleItem): Promise<void> {
    const path = `${SCHEDULES_COLLECTION}/${item.id}`;
    try {
      await setDoc(doc(db, SCHEDULES_COLLECTION, item.id), item);
      await this.addAuditLog(
        'Jadwal Pelajaran',
        `Jadwal ${item.subject} Jam Ke-${item.jamKe} (${item.day}) disimpan ke database`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteLessonSchedule(id: string): Promise<void> {
    const path = `${SCHEDULES_COLLECTION}/${id}`;
    try {
      await deleteDoc(doc(db, SCHEDULES_COLLECTION, id));
      await this.addAuditLog('Hapus Jadwal', `Jadwal ID ${id} dihapus dari database`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async saveBatchLessonSchedules(items: LessonScheduleItem[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const item of items) {
        const ref = doc(db, SCHEDULES_COLLECTION, item.id);
        batch.set(ref, item);
      }
      await batch.commit();
      await this.addAuditLog('Batch Jadwal', `Menyimpan ${items.length} jam pelajaran ke database`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, SCHEDULES_COLLECTION);
    }
  },

  subscribeLessonSchedules(callback: (schedules: LessonScheduleItem[]) => void): () => void {
    const colRef = collection(db, SCHEDULES_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const schedules: LessonScheduleItem[] = [];
        snapshot.forEach((docSnap) => {
          schedules.push(docSnap.data() as LessonScheduleItem);
        });
        schedules.sort((a, b) => a.jamKe - b.jamKe);
        callback(schedules);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, SCHEDULES_COLLECTION);
      }
    );
  },

  async seedInitialSchedules(initialSchedules: LessonScheduleItem[]): Promise<void> {
    try {
      const snap = await getDocs(collection(db, SCHEDULES_COLLECTION));
      if (snap.empty && initialSchedules.length > 0) {
        console.info('Seeding initial lesson schedules into Firestore...');
        const batch = writeBatch(db);
        for (const item of initialSchedules.slice(0, 450)) {
          batch.set(doc(db, SCHEDULES_COLLECTION, item.id), item);
        }
        await batch.commit();
      }
    } catch (err) {
      console.warn('Seeding initial schedules error:', err);
    }
  },
};
