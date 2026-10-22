import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { AttendanceCameraView } from './components/AttendanceCameraView';
import { LessonScheduleView } from './components/LessonScheduleView';
import { StudentListView } from './components/StudentListView';
import { FaceRegistrationView } from './components/FaceRegistrationView';
import { RekapView } from './components/RekapView';
import { SettingsView } from './components/SettingsView';
import { StudentProfileModal } from './components/StudentProfileModal';
import { storageService, getTodayString, DEFAULT_CLASSES } from './services/storageService';
import { firestoreService } from './services/firestoreService';
import { ClassConfig, Student, AttendanceRecord, AuditLog, AttendanceStatus, ClassItem, LessonScheduleItem, DayOfWeek } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [config, setConfig] = useState<ClassConfig>(() => storageService.getConfig());
  const [classes, setClasses] = useState<ClassItem[]>(() => storageService.getClasses());
  const [students, setStudents] = useState<Student[]>(() => storageService.getStudents());
  const [records, setRecords] = useState<AttendanceRecord[]>(() => storageService.getAttendanceRecords());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => storageService.getAuditLogs());
  const [schedules, setSchedules] = useState<LessonScheduleItem[]>(() => storageService.getLessonSchedules());
  const [selectedScheduleIdForAttendance, setSelectedScheduleIdForAttendance] = useState<string | undefined>(undefined);

  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [preSelectedStudentIdForReg, setPreSelectedStudentIdForReg] = useState<string | undefined>(undefined);
  const [isKioskActive, setIsKioskActive] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Active class calculation
  const activeClass: ClassItem =
    classes.find((c) => c.id === config.activeClassId) ||
    classes[0] ||
    DEFAULT_CLASSES[0];

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('absensi_dark_mode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('absensi_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('absensi_dark_mode', 'false');
    }
  }, [darkMode]);

  const todayStr = getTodayString();

  // Real-time Firestore synchronization
  useEffect(() => {
    const unsubConfig = firestoreService.subscribeConfig((cfg) => {
      setConfig(cfg);
      storageService.saveConfig(cfg);
    });

    const unsubClasses = firestoreService.subscribeClasses((classList) => {
      if (classList.length > 0) {
        setClasses(classList);
        storageService.saveClasses(classList);
      } else {
        firestoreService.seedInitialClasses(storageService.getClasses());
      }
    });

    const unsubStudents = firestoreService.subscribeStudents((stdList) => {
      if (stdList.length > 0) {
        setStudents(stdList);
        storageService.saveStudents(stdList);
      } else {
        // If Firestore is brand new and empty, seed default students into Firestore
        firestoreService.seedInitialStudents(storageService.getStudents());
      }
    });

    const unsubAttendance = firestoreService.subscribeAttendance((recList) => {
      if (recList.length > 0) {
        setRecords(recList);
        storageService.saveAttendanceRecords(recList);
      }
    });

    const unsubLogs = firestoreService.subscribeAuditLogs((logs) => {
      if (logs.length > 0) {
        setAuditLogs(logs);
      }
    });

    const unsubSchedules = firestoreService.subscribeLessonSchedules((schedList) => {
      if (schedList.length > 0) {
        setSchedules(schedList);
        storageService.saveLessonSchedules(schedList);
      } else {
        // If Firestore is empty, seed initial schedules
        firestoreService.seedInitialSchedules(storageService.getLessonSchedules());
      }
    });

    return () => {
      unsubConfig();
      unsubClasses();
      unsubStudents();
      unsubAttendance();
      unsubLogs();
      unsubSchedules();
    };
  }, []);

  // Update Config
  const handleSaveConfig = async (newConfig: ClassConfig) => {
    setConfig(newConfig);
    storageService.saveConfig(newConfig);
    await firestoreService.saveConfig(newConfig);
  };

  // Switch Active Class
  const handleSelectClass = async (classId: string) => {
    const newConfig = { ...config, activeClassId: classId };
    setConfig(newConfig);
    storageService.saveConfig(newConfig);
    await firestoreService.saveConfig(newConfig);
  };

  // Save / Update Class Item
  const handleSaveClass = async (item: ClassItem) => {
    storageService.saveClass(item);
    setClasses(storageService.getClasses());
    await firestoreService.saveClass(item);
  };

  // Delete Class Item
  const handleDeleteClass = async (classId: string) => {
    storageService.deleteClass(classId);
    const updated = storageService.getClasses();
    setClasses(updated);
    if (config.activeClassId === classId && updated.length > 0) {
      handleSelectClass(updated[0].id);
    }
    await firestoreService.deleteClass(classId);
  };

  // Add Student
  const handleAddStudent = async (student: Student) => {
    storageService.saveStudent(student);
    setStudents(storageService.getStudents());
    await firestoreService.saveStudent(student);
  };

  // Add Batch Students from Excel Import
  const handleAddBatchStudents = async (newStudents: Student[]) => {
    const updated = storageService.saveBatchStudents(newStudents);
    setStudents(updated);
    try {
      await firestoreService.saveBatchStudents(newStudents);
    } catch (err) {
      console.warn('Firestore batch student sync error:', err);
    }
  };

  // Update Student
  const handleUpdateStudent = async (student: Student) => {
    storageService.saveStudent(student);
    setStudents(storageService.getStudents());
    await firestoreService.saveStudent(student);
  };

  // Delete Student
  const handleDeleteStudent = async (id: string) => {
    storageService.deleteStudent(id);
    setStudents(storageService.getStudents());
    await firestoreService.deleteStudent(id);
  };

  // Save Face Registration
  const handleSaveFace = async (studentId: string, descriptors: number[][], photoDataUrl?: string) => {
    const ok = storageService.saveFaceRegistration(studentId, descriptors, photoDataUrl);
    if (ok) {
      setStudents(storageService.getStudents());
      try {
        await firestoreService.saveFaceRegistration(studentId, descriptors, photoDataUrl);
      } catch (err) {
        console.warn('Firestore face registration sync error:', err);
      }
    }
    return ok;
  };

  // Delete Face Registration
  const handleDeleteFace = async (studentId: string) => {
    const ok = storageService.deleteFaceRegistration(studentId);
    if (ok) {
      setStudents(storageService.getStudents());
      try {
        await firestoreService.deleteFaceRegistration(studentId);
      } catch (err) {
        console.warn('Firestore face deletion sync error:', err);
      }
    }
    return ok;
  };

  // Record Attendance from Camera scanner
  const handleRecordAttendance = (record: Omit<AttendanceRecord, 'id'>) => {
    const result = storageService.recordAttendance(record);
    if (result.success && result.record) {
      setRecords(storageService.getAttendanceRecords());
      setAuditLogs(storageService.getAuditLogs());
      firestoreService.recordAttendance(result.record).catch(console.warn);
    }
    return result;
  };

  // Manual Update Attendance Status
  const handleUpdateAttendanceStatus = async (recordId: string, status: AttendanceStatus) => {
    storageService.updateAttendanceStatus(recordId, status);
    setRecords(storageService.getAttendanceRecords());
    await firestoreService.updateAttendanceStatus(recordId, status);
  };

  // Manual Mark Attendance for student who hasn't checked in yet
  const handleManualMarkAttendance = async (studentId: string, status: AttendanceStatus) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const res = storageService.recordAttendance({
      studentId: student.id,
      studentName: student.name,
      nis: student.nis,
      classId: student.classId || activeClass.id,
      className: student.className || activeClass.name,
      date: todayStr,
      time: timeStr,
      status,
      method: 'manual',
      notes: 'Tandai manual oleh guru',
    });

    if (res.success && res.record) {
      setRecords(storageService.getAttendanceRecords());
      await firestoreService.recordAttendance(res.record);
    }
  };

  // Reset Today Attendance
  const handleResetToday = async () => {
    storageService.resetTodayAttendance();
    setRecords(storageService.getAttendanceRecords());
    await firestoreService.resetTodayAttendance(todayStr);
  };

  // Restore All Data from JSON
  const handleRestoreAll = (jsonStr: string) => {
    const ok = storageService.importAllData(jsonStr);
    if (ok) {
      const cfg = storageService.getConfig();
      const cls = storageService.getClasses();
      const stds = storageService.getStudents();
      setConfig(cfg);
      setClasses(cls);
      setStudents(stds);
      firestoreService.saveConfig(cfg).catch(console.warn);
      firestoreService.seedInitialClasses(cls).catch(console.warn);
      firestoreService.seedInitialStudents(stds).catch(console.warn);
    }
    return ok;
  };

  // Reset All to Default Seeds
  const handleResetToDefault = () => {
    storageService.resetToDefault();
    const cfg = storageService.getConfig();
    const cls = storageService.getClasses();
    const stds = storageService.getStudents();
    setConfig(cfg);
    setClasses(cls);
    setStudents(stds);
    firestoreService.saveConfig(cfg).catch(console.warn);
    firestoreService.seedInitialClasses(cls).catch(console.warn);
    firestoreService.seedInitialStudents(stds).catch(console.warn);
  };

  // Navigation handlers
  const handleNavigateToRegistration = (studentId: string) => {
    setPreSelectedStudentIdForReg(studentId);
    setCurrentTab('registrasi');
  };

  // Lesson Schedule Handlers (Jam Pelajaran per Kelas)
  const handleSaveSchedule = async (schedule: LessonScheduleItem) => {
    storageService.saveLessonSchedule(schedule);
    setSchedules(storageService.getLessonSchedules());
    try {
      await firestoreService.saveLessonSchedule(schedule);
    } catch (err) {
      console.warn('Firestore saveLessonSchedule sync error:', err);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    storageService.deleteLessonSchedule(id);
    setSchedules(storageService.getLessonSchedules());
    try {
      await firestoreService.deleteLessonSchedule(id);
    } catch (err) {
      console.warn('Firestore deleteLessonSchedule sync error:', err);
    }
  };

  const handleCopyScheduleToDay = async (classId: string, fromDay: DayOfWeek, toDay: DayOfWeek) => {
    const updated = storageService.copyScheduleToDay(classId, fromDay, toDay);
    setSchedules(updated);
    try {
      const targetDayItems = updated.filter((s) => s.classId === classId && s.day === toDay);
      await firestoreService.saveBatchLessonSchedules(targetDayItems);
    } catch (err) {
      console.warn('Firestore copySchedule sync error:', err);
    }
  };

  const handleLoadDefaultSchedule = async (classId: string) => {
    const targetClass = classes.find((c) => c.id === classId) || activeClass;
    const updated = storageService.generateDefaultScheduleForClass(classId, targetClass.name);
    setSchedules(updated);
    try {
      const classItems = updated.filter((s) => s.classId === classId);
      await firestoreService.saveBatchLessonSchedules(classItems);
    } catch (err) {
      console.warn('Firestore seedSchedule sync error:', err);
    }
  };

  const handleStartAttendanceForLesson = (classId: string, schedule: LessonScheduleItem) => {
    if (classId !== activeClass.id) {
      handleSelectClass(classId);
    }
    setSelectedScheduleIdForAttendance(schedule.id);
    setCurrentTab('absensi');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setIsKioskActive(false);
          if (tab !== 'absensi') {
            setSelectedScheduleIdForAttendance(undefined);
          }
          setCurrentTab(tab);
        }}
        config={config}
        classes={classes}
        activeClass={activeClass}
        onSelectClass={handleSelectClass}
        onOpenKiosk={() => {
          setCurrentTab('absensi');
          setIsKioskActive(true);
        }}
        isKioskActive={isKioskActive}
        isCameraActive={isCameraActive}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            config={config}
            classes={classes}
            activeClass={activeClass}
            students={students}
            records={records}
            todayStr={todayStr}
            onSelectClass={handleSelectClass}
            onNavigate={(tab) => setCurrentTab(tab)}
            onSelectStudent={(student) => setSelectedStudentForProfile(student)}
            onUpdateStatus={handleUpdateAttendanceStatus}
            onManualMarkAttendance={handleManualMarkAttendance}
          />
        )}

        {currentTab === 'absensi' && (
          <AttendanceCameraView
            config={config}
            classes={classes}
            activeClass={activeClass}
            students={students}
            records={records}
            lessonSchedules={schedules}
            preSelectedScheduleId={selectedScheduleIdForAttendance}
            isKiosk={isKioskActive}
            onToggleKiosk={() => setIsKioskActive(!isKioskActive)}
            onSelectClass={handleSelectClass}
            onRecordAttendance={handleRecordAttendance}
            onCameraStateChange={(active) => setIsCameraActive(active)}
          />
        )}

        {currentTab === 'jadwal' && (
          <LessonScheduleView
            classes={classes}
            activeClass={activeClass}
            schedules={schedules}
            onSelectClass={handleSelectClass}
            onSaveSchedule={handleSaveSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onCopyScheduleToDay={handleCopyScheduleToDay}
            onLoadDefaultSchedule={handleLoadDefaultSchedule}
            onStartAttendanceForLesson={handleStartAttendanceForLesson}
          />
        )}

        {currentTab === 'siswa' && (
          <StudentListView
            students={students}
            classes={classes}
            activeClass={activeClass}
            config={config}
            onAddStudent={handleAddStudent}
            onAddBatchStudents={handleAddBatchStudents}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onGoToRegistration={handleNavigateToRegistration}
            onSelectStudent={(student) => setSelectedStudentForProfile(student)}
          />
        )}

        {currentTab === 'registrasi' && (
          <FaceRegistrationView
            students={students}
            classes={classes}
            activeClass={activeClass}
            preSelectedStudentId={preSelectedStudentIdForReg}
            onSaveFace={handleSaveFace}
            onDeleteFace={handleDeleteFace}
          />
        )}

        {currentTab === 'rekap' && (
          <RekapView
            students={students}
            records={records}
            config={config}
            classes={classes}
            activeClass={activeClass}
            onSelectClass={handleSelectClass}
            onSelectStudent={(student) => setSelectedStudentForProfile(student)}
          />
        )}

        {currentTab === 'pengaturan' && (
          <SettingsView
            config={config}
            classes={classes}
            activeClass={activeClass}
            auditLogs={auditLogs}
            onSaveConfig={handleSaveConfig}
            onSaveClass={handleSaveClass}
            onDeleteClass={handleDeleteClass}
            onSelectClass={handleSelectClass}
            onResetToday={handleResetToday}
            onRestoreAll={handleRestoreAll}
            onResetToDefault={handleResetToDefault}
          />
        )}
      </main>

      {/* Student Profile Modal */}
      {selectedStudentForProfile && (
        <StudentProfileModal
          student={selectedStudentForProfile}
          records={records}
          config={config}
          onClose={() => setSelectedStudentForProfile(null)}
          onGoToRegistration={(studentId) => {
            setSelectedStudentForProfile(null);
            handleNavigateToRegistration(studentId);
          }}
          onUpdateTodayStatus={(studentId, status) => {
            handleManualMarkAttendance(studentId, status);
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">ABSENSI KELAS</span> · Presensi Siswa Berbasis Pengenalan Wajah
          </div>
          <div>
            {config.schoolName} · <span className="font-medium text-slate-700 dark:text-slate-300">{activeClass.name}</span> · T.P. {config.academicYear}
          </div>
        </div>
      </footer>
    </div>
  );
}
