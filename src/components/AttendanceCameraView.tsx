import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Camera,
  CameraOff,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Eye,
  RefreshCw,
  Volume2,
  VolumeX,
  UserX,
  AlertTriangle,
  Smile,
  Check,
  Zap,
  X,
  BookOpen,
  Calendar,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  ClassConfig,
  Student,
  AttendanceRecord,
  FaceQualityInfo,
  LivenessState,
  AttendanceStatus,
  ClassItem,
  LessonScheduleItem,
  DayOfWeek,
} from '../types';
import { faceRecognitionService, FaceDetectionResult } from '../services/faceRecognitionService';
import { speechService } from '../services/speechService';
import { getTodayString } from '../services/storageService';

interface AttendanceCameraViewProps {
  config: ClassConfig;
  classes: ClassItem[];
  activeClass: ClassItem;
  students: Student[];
  records: AttendanceRecord[];
  lessonSchedules?: LessonScheduleItem[];
  preSelectedScheduleId?: string;
  isKiosk: boolean;
  onToggleKiosk: () => void;
  onSelectClass?: (classId: string) => void;
  onRecordAttendance: (record: Omit<AttendanceRecord, 'id'>) => {
    success: boolean;
    record?: AttendanceRecord;
    reason?: string;
  };
  onCameraStateChange?: (isActive: boolean) => void;
}

type ScanStatus = 'idle' | 'scanning' | 'verifying_liveness' | 'success' | 'already_attended' | 'unrecognized';

export const AttendanceCameraView: React.FC<AttendanceCameraViewProps> = ({
  config,
  classes,
  activeClass,
  students,
  records,
  lessonSchedules = [],
  preSelectedScheduleId,
  isKiosk,
  onToggleKiosk,
  onSelectClass,
  onRecordAttendance,
  onCameraStateChange,
}) => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [qualityInfo, setQualityInfo] = useState<FaceQualityInfo | null>(null);
  const [targetClassFilter, setTargetClassFilter] = useState<string>('all'); // 'all' or classId

  // Calculate day of week in Indonesian
  const getTodayDayOfWeek = (): DayOfWeek => {
    const dayIndex = new Date().getDay();
    switch (dayIndex) {
      case 1:
        return 'Senin';
      case 2:
        return 'Selasa';
      case 3:
        return 'Rabu';
      case 4:
        return 'Kamis';
      case 5:
        return 'Jumat';
      case 6:
        return 'Sabtu';
      default:
        return 'Senin';
    }
  };

  const todayDay = getTodayDayOfWeek();

  // Filter today's schedules for this class
  const todayClassSchedules = useMemo(() => {
    return lessonSchedules
      .filter((s) => s.classId === activeClass.id && s.day === todayDay)
      .sort((a, b) => a.jamKe - b.jamKe || a.startTime.localeCompare(b.startTime));
  }, [lessonSchedules, activeClass.id, todayDay]);

  // Find ongoing schedule right now
  const ongoingSchedule = useMemo(() => {
    const now = new Date();
    const currMinutes = now.getHours() * 60 + now.getMinutes();
    return todayClassSchedules.find((s: LessonScheduleItem) => {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      return currMinutes >= sh * 60 + sm && currMinutes <= eh * 60 + em;
    });
  }, [todayClassSchedules]);

  // Attendance Mode: 'daily' (Masuk Pagi) or 'lesson' (Per Jam Pelajaran)
  const [attendanceMode, setAttendanceMode] = useState<'daily' | 'lesson'>(
    preSelectedScheduleId ? 'lesson' : 'daily'
  );
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    preSelectedScheduleId || ''
  );

  useEffect(() => {
    if (preSelectedScheduleId) {
      setSelectedScheduleId(preSelectedScheduleId);
      setAttendanceMode('lesson');
    }
  }, [preSelectedScheduleId]);

  useEffect(() => {
    if (attendanceMode === 'lesson' && !selectedScheduleId && todayClassSchedules.length > 0) {
      setSelectedScheduleId(ongoingSchedule?.id || todayClassSchedules[0].id);
    }
  }, [attendanceMode, selectedScheduleId, todayClassSchedules, ongoingSchedule]);

  const activeLessonSchedule = useMemo(() => {
    return todayClassSchedules.find((s: LessonScheduleItem) => s.id === selectedScheduleId) || ongoingSchedule || todayClassSchedules[0];
  }, [todayClassSchedules, selectedScheduleId, ongoingSchedule]);

  const [liveness, setLiveness] = useState<LivenessState>({
    step: 'none',
    message: '',
    progress: 0,
    verified: false,
  });

  // Current feedback match state
  const [activeMatch, setActiveMatch] = useState<{
    student: Student;
    record?: AttendanceRecord;
    confidence: number;
    time: string;
    status: AttendanceStatus;
  } | null>(null);

  // Already attended feedback state
  const [alreadyAttendedInfo, setAlreadyAttendedInfo] = useState<{
    student: Student;
    record: AttendanceRecord;
  } | null>(null);

  const [cooldownCountdown, setCooldownCountdown] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(!config.soundEnabled);
  const [fastMode, setFastMode] = useState<boolean>(config.fastModeEnabled !== false);
  const [lowLightBoost, setLowLightBoost] = useState<boolean>(config.lowLightEnhance !== false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const lastMatchedStudentIdRef = useRef<string | null>(null);
  const studentAnnouncementTimeRef = useRef<Map<string, number>>(new Map());
  const noFaceStreakRef = useRef<number>(0);
  const lastScanTimeRef = useRef<number>(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const livenessTimerRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveMatchRef = useRef<{ studentId: string; count: number }>({ studentId: '', count: 0 });

  // Registered students with descriptors
  const registeredStudents = students.filter((s) => s.faceRegistered);

  // Today's records count
  const todayStr = getTodayString();
  const todayRecords = records.filter((r) => r.date === todayStr);
  const attendedCount = todayRecords.filter((r) => r.status === 'hadir' || r.status === 'terlambat').length;
  const totalStudents = students.length;

  const [cameraError, setCameraError] = useState<string | null>(null);

  // List available media devices
  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setCameras(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      } catch (err) {
        console.warn('Could not enumerate cameras:', err);
      }
    }
    getDevices();
  }, [selectedDeviceId]);

  // Sync mute state with sound service
  useEffect(() => {
    speechService.setEnabled(!isMuted);
  }, [isMuted]);

  // Determine attendance status based on current time and config
  const determineStatusByTime = (currentTimeStr: string): AttendanceStatus => {
    // format "HH:mm"
    const [currH, currM] = currentTimeStr.split(':').map(Number);
    const currMinutes = currH * 60 + currM;

    const [presEndH, presEndM] = config.presentEndTime.split(':').map(Number);
    const presentEndMinutes = presEndH * 60 + presEndM;

    const [lateEndH, lateEndM] = config.lateEndTime.split(':').map(Number);
    const lateEndMinutes = lateEndH * 60 + lateEndM;

    if (currMinutes <= presentEndMinutes) {
      return 'hadir';
    } else if (currMinutes <= lateEndMinutes) {
      return 'terlambat';
    } else {
      return config.afterLateStatus;
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // Preload models
      await faceRecognitionService.loadModels();

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: selectedDeviceId ? undefined : 'user',
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      setIsCameraActive(true);
      setScanStatus('scanning');
      onCameraStateChange?.(true);

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        try {
          await video.play();
        } catch (playErr: any) {
          if (playErr?.name !== 'AbortError') {
            console.warn('Video play interrupted:', playErr);
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.warn('Camera play was interrupted by a new load request (safe to ignore)');
        return;
      }
      console.error('Camera access error:', err);
      setCameraError('Gagal mengakses kamera perangkat. Pastikan izin kamera telah diberikan pada browser.');
      setIsCameraActive(false);
      onCameraStateChange?.(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
      videoRef.current.srcObject = null;
    }
    speechService.stop();
    setIsCameraActive(false);
    setScanStatus('idle');
    setQualityInfo(null);
    onCameraStateChange?.(false);
  };

  // Dismiss Attendance popup immediately and resume scanning
  const dismissAttendancePopup = useCallback(() => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    setActiveMatch(null);
    setAlreadyAttendedInfo(null);
    // Keep lastMatchedStudentIdRef.current intact so the student still in front of camera doesn't re-trigger audio!
    consecutiveMatchRef.current = { studentId: '', count: 0 };
    setScanStatus('scanning');
  }, []);

  // Trigger Cooldown: Pop up notifikasi tampil beberapa detik lalu otomatis hilang
  const startCooldown = useCallback(() => {
    const cooldownSec = Math.max(2, config.autoCaptureCooldown || 3);
    setCooldownCountdown(cooldownSec);

    let remaining = cooldownSec;
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);

    cooldownTimerRef.current = setInterval(() => {
      remaining -= 1;
      setCooldownCountdown(remaining);
      if (remaining <= 0) {
        if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
        dismissAttendancePopup();
      }
    }, 1000);
  }, [dismissAttendancePopup, config.autoCaptureCooldown]);

  // Process video detection loop
  const runDetectionLoop = useCallback(async () => {
    if (!videoRef.current || !isCameraActive || videoRef.current.paused || videoRef.current.ended) {
      return;
    }

    if (scanStatus === 'success' || scanStatus === 'already_attended') {
      // Waiting for cooldown to finish
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    const now = performance.now();
    const minInterval = fastMode ? 30 : 50;
    if (now - lastScanTimeRef.current < minInterval) {
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }
    lastScanTimeRef.current = now;

    if (!isProcessingRef.current) {
      isProcessingRef.current = true;

      try {
        const video = videoRef.current;
        const result: FaceDetectionResult = await faceRecognitionService.detectFace(
          video,
          registeredStudents,
          config.recognitionThreshold,
          {
            fastMode,
            lowLightEnhance: lowLightBoost,
          }
        );

        setQualityInfo(result.quality);

        // Track face presence to clear lastMatchedStudentId when user walks away
        if (!result.detected) {
          noFaceStreakRef.current += 1;
          // If no face has been seen for ~20 frames (~1.2 seconds), camera is empty and ready for next person
          if (noFaceStreakRef.current > 20) {
            lastMatchedStudentIdRef.current = null;
            consecutiveMatchRef.current = { studentId: '', count: 0 };
          }
        } else {
          noFaceStreakRef.current = 0;
        }

        // Draw bounding box and name tag on canvas overlay
        const canvas = canvasRef.current;
        if (canvas && video.videoWidth && video.videoHeight) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (result.detected && result.box) {
              const { x, y, width, height } = result.box;

              // Draw stylized facial detection corner brackets
              const cornerLength = Math.min(width, height) * 0.22;
              ctx.lineWidth = 3.5;
              ctx.strokeStyle = result.matchedStudent
                ? '#10b981' // Green when matched
                : result.isAmbiguous
                ? '#f59e0b' // Amber when ambiguous
                : result.quality.goodQuality
                ? '#6366f1' // Indigo when scanning
                : '#f59e0b'; // Amber when low light / quality adjustment active

              // Top-left
              ctx.beginPath();
              ctx.moveTo(x, y + cornerLength);
              ctx.lineTo(x, y);
              ctx.lineTo(x + cornerLength, y);
              ctx.stroke();

              // Top-right
              ctx.beginPath();
              ctx.moveTo(x + width - cornerLength, y);
              ctx.lineTo(x + width, y);
              ctx.lineTo(x + width, y + cornerLength);
              ctx.stroke();

              // Bottom-left
              ctx.beginPath();
              ctx.moveTo(x, y + height - cornerLength);
              ctx.lineTo(x, y + height);
              ctx.lineTo(x + cornerLength, y + height);
              ctx.stroke();

              // Bottom-right
              ctx.beginPath();
              ctx.moveTo(x + width - cornerLength, y + height);
              ctx.lineTo(x + width, y + height);
              ctx.lineTo(x + width, y + height - cornerLength);
              ctx.stroke();

              // Name label if student matched or ambiguous feedback
              if (result.matchedStudent) {
                const name = result.matchedStudent.student.name;
                const isAlreadyAttended = records.some(
                  (r) =>
                    r.studentId === result.matchedStudent!.student.id &&
                    r.date === todayStr &&
                    (attendanceMode !== 'lesson' || r.scheduleId === activeLessonSchedule?.id)
                );

                const confText = `${result.matchedStudent.confidence}%`;
                const displayText = isAlreadyAttended ? `✓ ${name} (Sudah Hadir)` : `${name} (${confText})`;

                ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
                const textWidth = ctx.measureText(displayText).width + 24;
                const bannerWidth = Math.max(width, textWidth);

                ctx.fillStyle = isAlreadyAttended ? '#059669' : '#10b981';
                ctx.beginPath();
                ctx.roundRect(x, y - 34, bannerWidth, 30, 8);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.fillText(displayText, x + 10, y - 14);
              } else if (result.isAmbiguous) {
                const text = result.ambiguousReason || 'Posisikan wajah lebih dekat & lurus';
                ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
                const textWidth = ctx.measureText(text).width + 20;
                const bannerWidth = Math.max(width, textWidth);

                ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
                ctx.beginPath();
                ctx.roundRect(x, y - 34, bannerWidth, 30, 8);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.fillText(text, x + 10, y - 14);
              }
            }
          }
        }

        // Logic when a registered face is detected and matched against database
        if (
          result.detected &&
          result.matchedStudent &&
          scanStatus === 'scanning'
        ) {
          const matchedStudent = result.matchedStudent.student;
          const confidence = result.matchedStudent.confidence;

          // Prevent immediate repetitive trigger on same student who is still standing in front of camera
          const lastAnnounced = studentAnnouncementTimeRef.current.get(matchedStudent.id) || 0;
          const isSameStudentStillInFront =
            lastMatchedStudentIdRef.current === matchedStudent.id ||
            Date.now() - lastAnnounced < 25000;

          if (isSameStudentStillInFront) {
            consecutiveMatchRef.current = { studentId: '', count: 0 };
            isProcessingRef.current = false;
            animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
            return;
          }

          // Multi-frame temporal confirmation: require 2 consecutive frames (~80ms)
          // agreeing on the EXACT same student identity to eliminate false positive flickers
          if (consecutiveMatchRef.current.studentId === matchedStudent.id) {
            consecutiveMatchRef.current.count += 1;
          } else {
            consecutiveMatchRef.current = { studentId: matchedStudent.id, count: 1 };
          }

          if (consecutiveMatchRef.current.count >= 2) {
            consecutiveMatchRef.current = { studentId: '', count: 0 };
            processAttendanceSuccess(matchedStudent, confidence);
          }
        } else {
          // If no match or face lost or ambiguous, reset consecutive counter
          consecutiveMatchRef.current = { studentId: '', count: 0 };
        }
      } catch (err) {
        console.error('Detection loop iteration error:', err);
      } finally {
        isProcessingRef.current = false;
      }
    }

    if (isCameraActive) {
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
    }
  }, [isCameraActive, scanStatus, registeredStudents, config, fastMode, lowLightBoost, activeClass, classes]);

  // Handle successful student identification
  const processAttendanceSuccess = (student: Student, confidence: number) => {
    lastMatchedStudentIdRef.current = student.id;
    studentAnnouncementTimeRef.current.set(student.id, Date.now());

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    let status: AttendanceStatus = 'hadir';
    let scheduleToRecord: LessonScheduleItem | undefined = undefined;

    if (attendanceMode === 'lesson' && activeLessonSchedule) {
      scheduleToRecord = activeLessonSchedule;
      const [sh, sm] = activeLessonSchedule.startTime.split(':').map(Number);
      const [eh, em] = activeLessonSchedule.endTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      const tolerance = activeLessonSchedule.lateToleranceMinutes || 10;
      const [ch, cm] = timeStr.split(':').map(Number);
      const curMin = ch * 60 + cm;

      if (curMin <= startMin + tolerance) {
        status = 'hadir';
      } else if (curMin <= endMin) {
        status = 'terlambat';
      } else {
        status = config.afterLateStatus;
      }
    } else {
      status = determineStatusByTime(timeStr);
    }

    const snapshot = videoRef.current ? faceRecognitionService.captureSnapshot(videoRef.current) : '';

    const studentClass = classes.find((c) => c.id === student.classId);
    const classNameStr = studentClass?.name || student.className || activeClass.name;

    const res = onRecordAttendance({
      studentId: student.id,
      studentName: student.name,
      nis: student.nis,
      classId: student.classId || activeClass.id,
      className: classNameStr,
      date: todayStr,
      time: timeStr,
      status,
      method: 'face_recognition',
      confidence,
      snapshotUrl: snapshot,
      scheduleId: scheduleToRecord?.id,
      jamKe: scheduleToRecord?.jamKe,
      subject: scheduleToRecord?.subject,
      isDailyAttendance: attendanceMode === 'daily',
    });

    if (res.success && res.record) {
      // 4. ABSENSI BERHASIL
      setScanStatus('success');
      setActiveMatch({
        student,
        record: res.record,
        confidence,
        time: timeStr,
        status,
      });

      // Confetti celebration
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // ignore
      }

      // Voice readout
      if (attendanceMode === 'lesson' && scheduleToRecord) {
        speechService.speak(`Presensi ${student.name} untuk jam ${scheduleToRecord.subject} berhasil dicatat.`);
      } else {
        speechService.speakSuccess(student.name);
      }

      startCooldown();
    } else if (res.reason === 'already_attended' && res.record) {
      // 5. PENCEGAHAN ABSENSI GANDA
      setScanStatus('already_attended');
      setAlreadyAttendedInfo({
        student,
        record: res.record,
      });

      // Voice readout
      if (res.record.subject) {
        speechService.speak(`Anda sudah melakukan absensi untuk jam ${res.record.subject}.`);
      } else {
        speechService.speakAlreadyAttended(student.name);
      }

      startCooldown();
    }
  };

  // Start loop when camera is turned on
  useEffect(() => {
    if (isCameraActive) {
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
      if (livenessTimerRef.current) {
        clearTimeout(livenessTimerRef.current);
      }
    };
  }, [isCameraActive, runDetectionLoop]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const formattedDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className={`space-y-4 ${isKiosk ? 'fixed inset-0 z-50 bg-slate-950 p-4 sm:p-6 overflow-hidden flex flex-col justify-between' : ''}`}>
      {/* Kiosk or Regular Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">
              Presensi Siswa Berbasis Pengenalan Wajah
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-xs font-mono text-slate-500">{formattedDate}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Absensi Otomatis {activeClass.name}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Fast mode & low-light sensitivity toggle */}
          <button
            onClick={() => {
              const next = !fastMode;
              setFastMode(next);
              setLowLightBoost(next);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              fastMode
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
            title="Optimasi kamera kualitas rendah & redup (3x lebih cepat)"
          >
            <Zap className={`w-3.5 h-3.5 ${fastMode ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{fastMode ? 'Mode Cepat & Redup: ON' : 'Mode Cepat: OFF'}</span>
            <span className="sm:hidden">{fastMode ? 'Cepat' : 'Normal'}</span>
          </button>

          {/* Audio toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title={isMuted ? 'Aktifkan Suara' : 'Bisukan Suara'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
          </button>

          {/* Fullscreen Kiosk toggle */}
          <button
            onClick={onToggleKiosk}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            {isKiosk ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isKiosk ? 'Keluar Kiosk' : 'Layar Penuh Kiosk'}</span>
          </button>
        </div>
      </div>

      {/* Attendance Session Mode Bar: Masuk Harian vs Jam Pelajaran */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Sesi Presensi:</span>
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAttendanceMode('daily')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                attendanceMode === 'daily'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🌅 Masuk Harian (Pagi)
            </button>
            <button
              type="button"
              onClick={() => setAttendanceMode('lesson')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                attendanceMode === 'lesson'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Per Jam Pelajaran ({todayDay})</span>
              {ongoingSchedule && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>
          </div>
        </div>

        {/* Schedule Selector if lesson mode */}
        {attendanceMode === 'lesson' && (
          <div className="flex items-center gap-2 flex-1 md:justify-end">
            {todayClassSchedules.length > 0 ? (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-[11px] font-semibold text-slate-500 shrink-0">Pilih Jam:</span>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-full md:max-w-md truncate"
                >
                  {todayClassSchedules.map((s: LessonScheduleItem) => {
                    const isNow = ongoingSchedule?.id === s.id;
                    return (
                      <option key={s.id} value={s.id}>
                        Jam {s.jamKe} ({s.startTime}–{s.endTime}): {s.subject} {isNow ? '🟢 [SEDANG BERLANGSUNG]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/60">
                Belum ada jadwal hari {todayDay} untuk kelas ini. Atur di menu <b>Jam Pelajaran</b>.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Camera Stage Card */}
      <div className="relative bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 max-w-4xl mx-auto w-full aspect-[4/3] sm:aspect-[16/10] flex items-center justify-center">
        {/* HTML5 Video element */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${!isCameraActive ? 'opacity-0 absolute inset-0 pointer-events-none' : 'opacity-100 block'}`}
        />

        {/* Canvas overlay for facial bounding boxes and landmarks */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100 ${
            !isCameraActive ? 'opacity-0' : 'opacity-100 block'
          }`}
        />

        {/* Inactive Camera State with Large Call-To-Action */}
        {!isCameraActive && (
          <div className="text-center p-8 z-10 max-w-md">
            <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 text-indigo-400 mx-auto flex items-center justify-center mb-5 ring-8 ring-indigo-500/10">
              <Camera className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Kamera Absensi Belum Aktif</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Klik tombol di bawah untuk menyalakan kamera. Siswa dapat langsung menghadap ke arah kamera untuk mencatat presensi secara otomatis.
            </p>

            {cameraError && (
              <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs text-left">
                {cameraError}
              </div>
            )}

            <button
              onClick={startCamera}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-bold text-base bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl hover:shadow-indigo-500/30 transition-all scale-100 hover:scale-105 active:scale-95"
            >
              <Camera className="w-5 h-5" />
              <span>📷 MULAI ABSENSI</span>
            </button>

            {registeredStudents.length === 0 && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs text-left">
                ⚠ Belum ada siswa dengan wajah terdaftar. Daftarkan wajah siswa terlebih dahulu pada menu <b>Registrasi Wajah</b>.
              </div>
            )}
          </div>
        )}

        {/* Active HUD / Overlay elements */}
        {isCameraActive && (
          <>
            {/* Top HUD: School Info & Live Attendance Count */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
              <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-white text-xs flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-bold">{activeClass.name}</span>
                <span className="text-slate-400">·</span>
                <span className="font-mono text-emerald-400">
                  Hadir: {attendedCount}/{totalStudents} Siswa
                </span>
              </div>

              {/* Stop camera button */}
              <button
                onClick={stopCamera}
                className="pointer-events-auto bg-rose-600/80 hover:bg-rose-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md transition-colors shadow-lg flex items-center gap-1.5"
              >
                <CameraOff className="w-3.5 h-3.5" />
                <span>Hentikan Kamera</span>
              </button>
            </div>

            {/* Quality Indicator Banner */}
            {qualityInfo && scanStatus === 'scanning' && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all">
                <div
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg flex items-center gap-2 border ${
                    qualityInfo.goodQuality
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                      : 'bg-amber-950/85 border-amber-500/40 text-amber-200'
                  }`}
                >
                  {qualityInfo.goodQuality ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                  )}
                  <span>{qualityInfo.message}</span>
                </div>
              </div>
            )}

            {/* 4. RESULT CARD: ABSENSI BERHASIL */}
            {scanStatus === 'success' && activeMatch && (
              <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-in zoom-in-95 duration-200">
                <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden">
                  {/* Decorative glowing header bar */}
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 to-teal-400" />

                  {/* Countdown progress bar */}
                  <div className="absolute top-2 left-0 right-0 h-1 bg-slate-800/80 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-1000 ease-linear"
                      style={{
                        width: `${Math.max(0, Math.min(100, (cooldownCountdown / Math.max(1, config.autoCaptureCooldown || 3)) * 100))}%`,
                      }}
                    />
                  </div>

                  {/* Close button to dismiss immediately */}
                  <button
                    type="button"
                    onClick={dismissAttendancePopup}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                    title="Tutup & Pindai Sekarang"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center mb-4 mt-2">
                    <Check className="w-8 h-8" />
                  </div>

                  <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs uppercase tracking-wider mb-2">
                    ✓ ABSENSI BERHASIL
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-1">
                    {activeMatch.student.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mb-4">
                    NIS: {activeMatch.student.nis} · {activeClass.name}
                  </p>

                  <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 grid grid-cols-2 gap-3 text-left mb-5">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Sesi Presensi</span>
                      <span className="text-xs font-bold text-indigo-300">
                        {activeMatch.record?.subject
                          ? `Jam ${activeMatch.record.jamKe}: ${activeMatch.record.subject}`
                          : 'Masuk Harian'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Waktu Presensi</span>
                      <span className="text-xs font-mono font-bold text-slate-100">{activeMatch.time} WIB</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Status</span>
                      <span className={`text-xs font-bold uppercase ${
                        activeMatch.status === 'hadir' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {activeMatch.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Akurasi Wajah</span>
                      <span className="text-xs font-mono font-semibold text-emerald-300">
                        {activeMatch.confidence}%
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Menutup dalam <strong className="text-emerald-300 font-mono text-sm">{cooldownCountdown}s</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={dismissAttendancePopup}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                    >
                      <span>Lanjut Pindai</span>
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. RESULT CARD: SUDAH ABSEN (PENCEGAHAN ABSENSI GANDA) */}
            {scanStatus === 'already_attended' && alreadyAttendedInfo && (
              <div className="absolute inset-0 bg-amber-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-in zoom-in-95 duration-200">
                <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 to-yellow-400" />

                  {/* Countdown progress bar */}
                  <div className="absolute top-2 left-0 right-0 h-1 bg-slate-800/80 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all duration-1000 ease-linear"
                      style={{
                        width: `${Math.max(0, Math.min(100, (cooldownCountdown / Math.max(1, config.autoCaptureCooldown || 3)) * 100))}%`,
                      }}
                    />
                  </div>

                  {/* Close button to dismiss immediately */}
                  <button
                    type="button"
                    onClick={dismissAttendancePopup}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                    title="Tutup & Pindai Sekarang"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 mx-auto flex items-center justify-center mb-4 mt-2">
                    <AlertCircle className="w-8 h-8" />
                  </div>

                  <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs uppercase tracking-wider mb-2">
                    ⚠ SUDAH ABSEN HARI INI
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-1">
                    {alreadyAttendedInfo.student.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mb-4">
                    NIS: {alreadyAttendedInfo.student.nis} · {activeClass.name}
                  </p>

                  <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 text-left mb-5">
                    <div className="text-xs text-amber-200 mb-2">
                      Siswa ini sudah tercatat melakukan presensi hari ini. Sistem mencegah pencatatan absensi ganda.
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-700">
                      <span className="text-slate-400">Waktu Absensi:</span>
                      <span className="font-mono font-bold text-white">
                        {alreadyAttendedInfo.record.time} WIB ({alreadyAttendedInfo.record.status.toUpperCase()})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>Menutup dalam <strong className="text-amber-300 font-mono text-sm">{cooldownCountdown}s</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={dismissAttendancePopup}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                    >
                      <span>Lanjut Pindai</span>
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Kiosk Status bar */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
              <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-white text-xs flex items-center gap-2">
                <span className="text-slate-400">Status Kamera:</span>
                <span className="font-semibold text-emerald-400">Siap & Memindai Wajah</span>
              </div>

              {cameras.length > 1 && (
                <div className="pointer-events-auto">
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      stopCamera();
                      setTimeout(startCamera, 300);
                    }}
                    className="bg-slate-900/90 text-white text-xs px-2.5 py-1.5 rounded-xl border border-white/20 focus:outline-none"
                  >
                    {cameras.map((c, i) => (
                      <option key={c.deviceId} value={c.deviceId}>
                        {c.label || `Kamera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Instructions & Help info below camera */}
      {!isKiosk && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
              1
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">Posisi Wajah</div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Pastikan wajah berada di tengah lingkaran pemindai dengan pencahayaan cukup.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
              2
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">Verifikasi Otomatis</div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Sistem akan mencocokkan wajah dan mengonfirmasi suara saat absensi berhasil.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
              3
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">Pencegahan Ganda</div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Siswa yang sudah absen tidak akan diduplikasi datanya pada hari yang sama.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
