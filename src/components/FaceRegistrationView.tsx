import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Trash2,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  User,
  Info,
  Check,
  Eye,
  Sliders,
  Play,
  RotateCcw,
  UserCheck,
  HelpCircle,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import { Student, FaceQualityInfo, ClassItem } from '../types';
import {
  faceRecognitionService,
  FaceDetectionResult,
  HeadPoseEstimate,
  FaceConflictResult,
} from '../services/faceRecognitionService';
import { speechService } from '../services/speechService';

interface FaceRegistrationViewProps {
  students: Student[];
  classes?: ClassItem[];
  activeClass?: ClassItem;
  preSelectedStudentId?: string;
  onSaveFace: (studentId: string, descriptors: number[][], photoDataUrl?: string) => boolean | Promise<boolean>;
  onDeleteFace: (studentId: string) => boolean | Promise<boolean>;
}

// 5 Guided Poses for comprehensive 3D biometric representation
interface PoseStepConfig {
  id: string;
  name: string;
  instruction: string;
  targetDirection: 'center' | 'left' | 'right' | 'up' | 'down' | 'any';
  tip: string;
  iconText: string;
}

const POSE_STEPS: PoseStepConfig[] = [
  {
    id: 'front',
    name: '1. Menghadap Lurus (Netral)',
    instruction: 'Tatap lurus ke kamera dengan ekspresi wajah santai',
    targetDirection: 'center',
    tip: 'Posisikan mata dan hidung tepat di tengah oval panduan',
    iconText: '😐',
  },
  {
    id: 'left',
    name: '2. Sedikit Serong Kiri (~15°)',
    instruction: 'Tengokkan kepala sedikit ke arah kiri',
    targetDirection: 'left',
    tip: 'Mata tetap memandang ke arah layar kamera',
    iconText: '👈',
  },
  {
    id: 'right',
    name: '3. Sedikit Serong Kanan (~15°)',
    instruction: 'Tengokkan kepala sedikit ke arah kanan',
    targetDirection: 'right',
    tip: 'Tengok perlahan sekitar 10–15 derajat',
    iconText: '👉',
  },
  {
    id: 'smile',
    name: '4. Ekspresi Senyum Alami',
    instruction: 'Tersenyumlah sedikit secara alami',
    targetDirection: 'center',
    tip: 'Merekam variasi kontur bibir saat siswa tersenyum',
    iconText: '😊',
  },
  {
    id: 'final',
    name: '5. Verifikasi Jarak & Fokus',
    instruction: 'Tegakkan posisi dan tahan stabil sejenak',
    targetDirection: 'center',
    tip: 'Sampel penutup untuk memperkuat akurasi pengenalan',
    iconText: '🎯',
  },
];

interface CapturedSampleItem {
  id: string;
  descriptor: number[];
  photoUrl: string;
  poseName: string;
  sharpness: number;
}

export const FaceRegistrationView: React.FC<FaceRegistrationViewProps> = ({
  students,
  classes = [],
  activeClass,
  preSelectedStudentId,
  onSaveFace,
  onDeleteFace,
}) => {
  const [classFilter, setClassFilter] = useState<string>(activeClass?.id || 'all');
  const [activeTab, setActiveTab] = useState<'register' | 'test'>('register');
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const scopedStudents =
    classFilter === 'all' ? students : students.filter((s) => s.classId === classFilter);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    preSelectedStudentId || (scopedStudents.length > 0 ? scopedStudents[0].id : (students[0]?.id ?? ''))
  );

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [qualityInfo, setQualityInfo] = useState<FaceQualityInfo | null>(null);
  const [currentHeadPose, setCurrentHeadPose] = useState<HeadPoseEstimate | null>(null);

  // Registration Samples State
  const [capturedSamples, setCapturedSamples] = useState<CapturedSampleItem[]>([]);
  const [currentPoseStepIndex, setCurrentPoseStepIndex] = useState<number>(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Settings in View
  const [showMeshOverlay, setShowMeshOverlay] = useState<boolean>(true);
  const [autoCaptureOnPose, setAutoCaptureOnPose] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureMessage, setCaptureMessage] = useState<string | null>(null);

  // Conflict Detection Alert State
  const [conflictWarning, setConflictWarning] = useState<FaceConflictResult | null>(null);
  const [allowConflictOverride, setAllowConflictOverride] = useState<boolean>(false);

  // Test Mode Detection Result
  const [testResult, setTestResult] = useState<FaceDetectionResult | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);
  const autoCaptureCooldownRef = useRef(0);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const currentStep = POSE_STEPS[Math.min(currentPoseStepIndex, POSE_STEPS.length - 1)];

  // Update selection if prop changes
  useEffect(() => {
    if (preSelectedStudentId) {
      setSelectedStudentId(preSelectedStudentId);
    }
  }, [preSelectedStudentId]);

  // Reset state when switching student
  useEffect(() => {
    setCapturedSamples([]);
    setCurrentPoseStepIndex(0);
    setSaveSuccess(false);
    setConflictWarning(null);
    setCaptureMessage(null);
    setTestResult(null);
  }, [selectedStudentId]);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      await faceRecognitionService.loadModels();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraActive(true);
      setSaveSuccess(false);

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
      if (err?.name === 'AbortError') return;
      console.error('Camera access error:', err);
      setCameraError('Gagal mengakses kamera. Pastikan izin kamera browser telah diizinkan.');
    }
  };

  // Stop Camera
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
    setIsCameraActive(false);
    setQualityInfo(null);
    setCurrentHeadPose(null);
    setTestResult(null);
  };

  // Live Detection Loop
  const runDetectionLoop = useCallback(async () => {
    if (!videoRef.current || !isCameraActive || videoRef.current.paused || videoRef.current.ended) {
      return;
    }

    if (!isProcessingRef.current) {
      isProcessingRef.current = true;

      try {
        const video = videoRef.current;
        // In registration view, pass all registered students to check matches/conflicts
        const detectionResult: FaceDetectionResult = await faceRecognitionService.detectFace(
          video,
          students,
          0.45,
          {
            fastMode: false,
            highAccuracy: true,
            lowLightEnhance: false,
          }
        );

        setQualityInfo(detectionResult.quality);
        setCurrentHeadPose(detectionResult.headPose || null);

        if (activeTab === 'test') {
          setTestResult(detectionResult);
        }

        // Draw overlay
        const canvas = canvasRef.current;
        if (canvas && video.videoWidth && video.videoHeight) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (detectionResult.detected && detectionResult.box) {
              const { x, y, width, height } = detectionResult.box;

              // Check if pose matches target
              const isPoseMatching =
                currentStep.targetDirection === 'any' ||
                detectionResult.headPose?.direction === currentStep.targetDirection;

              const isGood = detectionResult.quality.goodQuality && isPoseMatching;

              // Draw biometric face oval
              ctx.lineWidth = 3.5;
              ctx.strokeStyle = isGood ? '#10b981' : isPoseMatching ? '#6366f1' : '#f59e0b';
              ctx.beginPath();
              ctx.ellipse(x + width / 2, y + height / 2, width * 0.44, height * 0.54, 0, 0, 2 * Math.PI);
              ctx.stroke();

              // Draw 68-point Biometric Mesh
              if (showMeshOverlay && detectionResult.landmarks) {
                faceRecognitionService.drawBiometricMesh(ctx, detectionResult.landmarks, {
                  color: isGood ? 'rgba(16, 185, 129, 0.7)' : 'rgba(99, 102, 241, 0.65)',
                  pointColor: isGood ? '#34d399' : '#818cf8',
                  showPoints: true,
                });
              }

              // Corner brackets
              const cLen = Math.min(width, height) * 0.18;
              ctx.lineWidth = 2.5;
              ctx.strokeStyle = isGood ? '#10b981' : '#6366f1';

              ctx.beginPath();
              ctx.moveTo(x, y + cLen);
              ctx.lineTo(x, y);
              ctx.lineTo(x + cLen, y);
              ctx.moveTo(x + width - cLen, y);
              ctx.lineTo(x + width, y);
              ctx.lineTo(x + width, y + cLen);
              ctx.moveTo(x, y + height - cLen);
              ctx.lineTo(x, y + height);
              ctx.lineTo(x + cLen, y + height);
              ctx.moveTo(x + width - cLen, y + height);
              ctx.lineTo(x + width, y + height);
              ctx.lineTo(x + width, y + height - cLen);
              ctx.stroke();

              // In test mode: draw recognition badge
              if (activeTab === 'test') {
                ctx.fillStyle = detectionResult.matchedStudent ? '#10b981' : '#f59e0b';
                ctx.beginPath();
                ctx.roundRect(x, y - 36, width, 30, 8);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
                const tag = detectionResult.matchedStudent
                  ? `✓ ${detectionResult.matchedStudent.student.name} (${detectionResult.matchedStudent.confidence}%)`
                  : 'Wajah Belum Terdaftar';
                ctx.fillText(tag, x + 10, y - 15);
              }
            }
          }
        }

        // Auto-capture when pose matches and quality is high
        if (
          autoCaptureOnPose &&
          activeTab === 'register' &&
          !isCapturing &&
          capturedSamples.length < 5 &&
          detectionResult.detected &&
          detectionResult.descriptor &&
          detectionResult.quality.goodQuality
        ) {
          const isTargetPose =
            currentStep.targetDirection === 'any' ||
            detectionResult.headPose?.direction === currentStep.targetDirection;

          const now = Date.now();
          if (isTargetPose && now - autoCaptureCooldownRef.current > 1600) {
            autoCaptureCooldownRef.current = now;
            handleTakeSample(detectionResult);
          }
        }
      } catch (err) {
        console.warn('Detection error:', err);
      } finally {
        isProcessingRef.current = false;
      }
    }

    if (isCameraActive) {
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
    }
  }, [
    isCameraActive,
    students,
    activeTab,
    showMeshOverlay,
    autoCaptureOnPose,
    isCapturing,
    capturedSamples.length,
    currentStep,
  ]);

  useEffect(() => {
    if (isCameraActive) {
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCameraActive, runDetectionLoop]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Take a Biometric Sample
  const handleTakeSample = async (existingResult?: FaceDetectionResult) => {
    setCaptureMessage(null);
    if (!videoRef.current) {
      setCaptureMessage('Kamera belum aktif.');
      return;
    }

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const res: FaceDetectionResult =
        existingResult ||
        (await faceRecognitionService.detectFace(video, students, 0.45, {
          fastMode: false,
          highAccuracy: true,
          lowLightEnhance: false,
        }));

      if (!res.detected || !res.descriptor) {
        setCaptureMessage('Wajah tidak terdeteksi dengan jelas. Posisikan wajah di tengah oval.');
        speechService.speak('Posisikan wajah lebih jelas.');
        return;
      }

      // Check Intra-Sample Consistency with already collected samples for this student
      if (capturedSamples.length > 0) {
        const firstSample = capturedSamples[0].descriptor;
        const intraDist = faceRecognitionService.calculateDistance(res.descriptor, firstSample);
        // Distances > 0.42 mean a completely different face or wild distortion
        if (intraDist > 0.42) {
          setCaptureMessage(
            'Sampel tidak konsisten dengan pose sebelumnya. Pastikan siswa yang sama berada di depan kamera.'
          );
          speechService.speak('Wajah tidak cocok dengan sampel sebelumnya.');
          return;
        }
      }

      // Check Cross-Student Conflict (Anti Duplikasi)
      const conflict = faceRecognitionService.checkFaceConflict(
        res.descriptor,
        students,
        selectedStudent?.id
      );

      if (conflict.hasConflict && !allowConflictOverride) {
        setConflictWarning(conflict);
        speechService.speak('Perhatian. Wajah ini mirip dengan siswa lain.');
        return;
      }

      // Snapshot for thumbnail
      const snapshotUrl = faceRecognitionService.captureSnapshot(video);

      const newSample: CapturedSampleItem = {
        id: `sample-${Date.now()}-${capturedSamples.length + 1}`,
        descriptor: res.descriptor,
        photoUrl: snapshotUrl,
        poseName: currentStep.name,
        sharpness: res.quality.sharpnessScore || 85,
      };

      const updated = [...capturedSamples, newSample];
      setCapturedSamples(updated);

      speechService.playSuccessTone();

      // Advance pose step
      const nextIdx = currentPoseStepIndex + 1;
      setCurrentPoseStepIndex(nextIdx);

      // Audio prompt for next pose
      if (nextIdx < POSE_STEPS.length) {
        const nextStep = POSE_STEPS[nextIdx];
        if (nextStep.id === 'left') {
          speechService.speak('Bagus. Sedikit menoleh ke kiri.');
        } else if (nextStep.id === 'right') {
          speechService.speak('Bagus. Sedikit menoleh ke kanan.');
        } else if (nextStep.id === 'smile') {
          speechService.speak('Bagus. Berikan sedikit senyuman.');
        } else if (nextStep.id === 'final') {
          speechService.speak('Satu lagi. Tahan posisi stabil.');
        }
      }

      // If collected 5 samples, auto save
      if (updated.length >= 5) {
        handleSaveTemplate(updated);
      }
    } catch (err) {
      console.error('Error sampling face:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Remove individual sample
  const handleRemoveSample = (sampleId: string) => {
    const updated = capturedSamples.filter((s) => s.id !== sampleId);
    setCapturedSamples(updated);
    setCurrentPoseStepIndex(updated.length);
  };

  // Save template into student record
  const handleSaveTemplate = async (samplesToSave?: CapturedSampleItem[]) => {
    const samples = samplesToSave || capturedSamples;
    if (!selectedStudent || samples.length === 0) return;

    setIsSaving(true);
    try {
      const descriptors = samples.map((s) => s.descriptor);
      const photoUrl = samples[0]?.photoUrl || selectedStudent.photoUrl;

      const ok = await onSaveFace(selectedStudent.id, descriptors, photoUrl);
      if (ok) {
        setSaveSuccess(true);
        speechService.speak(`Wajah ${selectedStudent.name} berhasil didaftarkan.`);
        setTimeout(() => {
          setSaveSuccess(false);
          // Switch to test mode to verify instantly
          setActiveTab('test');
        }, 1800);
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete face data
  const handleDeleteFace = () => {
    if (!selectedStudent) return;
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteFace = async () => {
    if (!selectedStudent) return;
    await onDeleteFace(selectedStudent.id);
    setCapturedSamples([]);
    setSaveSuccess(false);
    setShowDeleteModal(false);
    speechService.speak(`Data wajah ${selectedStudent.name} telah dihapus.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Registrasi Biometrik Wajah Presisi Tinggi</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              Pendaftaran & Penguatan Wajah Siswa
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Rekam 5 pose sudut wajah multi-dimensi agar sistem dapat membedakan setiap siswa dengan akurat dan mencegah salah mengenali
            </p>
          </div>

          {/* Student Selector & Class Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 min-w-[340px]">
            {classes.length > 0 && (
              <div className="w-full sm:w-44">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Filter Kelas:
                </label>
                <select
                  value={classFilter}
                  onChange={(e) => {
                    setClassFilter(e.target.value);
                    const filtered =
                      e.target.value === 'all'
                        ? students
                        : students.filter((s) => s.classId === e.target.value);
                    if (filtered.length > 0) {
                      setSelectedStudentId(filtered[0].id);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua Kelas ({students.length} Siswa)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Pilih Siswa:
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {scopedStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.faceRegistered ? '🟢' : '🔴'} {s.name} ({s.nis})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Student Banner & Mode Tabs */}
      {selectedStudent && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-4">
            {selectedStudent.photoUrl || capturedSamples[0]?.photoUrl ? (
              <img
                src={capturedSamples[0]?.photoUrl || selectedStudent.photoUrl}
                alt={selectedStudent.name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-200 dark:border-indigo-900 bg-white shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xl shrink-0">
                {selectedStudent.name.charAt(0)}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedStudent.name}
                </h3>
                <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                  NIS: {selectedStudent.nis}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {selectedStudent.faceRegistered ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    🟢 Terdaftar ({selectedStudent.faceDescriptors?.length || 3} Sampel Pose)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-500 dark:text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    🔴 Belum Terdaftar
                  </span>
                )}
                {selectedStudent.registeredAt && (
                  <span className="text-[11px] text-slate-400">· {selectedStudent.registeredAt}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Toggle: Register vs Test */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'register'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Pendaftaran 5 Pose
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('test')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  activeTab === 'test'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Uji Pengenalan Langsung</span>
              </button>
            </div>

            {selectedStudent.faceRegistered && (
              <button
                onClick={handleDeleteFace}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
                title="Hapus template biometrik wajah siswa ini"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Wajah</span>
              </button>
            )}

            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Buka Kamera Siswa</span>
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <CameraOff className="w-4 h-4" />
                <span>Tutup Kamera</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Interactive Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center: Camera View */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 aspect-[4/3] relative flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                !isCameraActive ? 'opacity-0 absolute inset-0 pointer-events-none' : 'opacity-100 block'
              }`}
            />
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100 ${
                !isCameraActive ? 'opacity-0' : 'opacity-100 block'
              }`}
            />

            {/* Inactive Camera State */}
            {!isCameraActive && (
              <div className="text-center p-8 text-white max-w-sm z-10">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-4">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold mb-1">Kamera Belum Aktif</h3>
                <p className="text-xs text-slate-400 mb-5">
                  Klik tombol di bawah untuk mengaktifkan webcam dan mulai panduan pendaftaran biometrik.
                </p>

                {cameraError && (
                  <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs text-left">
                    {cameraError}
                  </div>
                )}

                <button
                  onClick={startCamera}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all cursor-pointer"
                >
                  Aktifkan Kamera Siswa
                </button>
              </div>
            )}

            {/* Active Camera Overlay */}
            {isCameraActive && (
              <>
                {/* Top Status Badge */}
                <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                  {qualityInfo && (
                    <div
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg flex items-center gap-2 border ${
                        qualityInfo.goodQuality
                          ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-200'
                          : 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                      }`}
                    >
                      {qualityInfo.goodQuality ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                      )}
                      <span>{qualityInfo.message}</span>
                    </div>
                  )}

                  {/* Pose Direction Indicator */}
                  {currentHeadPose && (
                    <div className="px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg bg-slate-950/80 border border-white/10 text-white flex items-center gap-1.5">
                      <span className="text-slate-400">Arah Wajah:</span>
                      <span className="font-bold text-indigo-400 uppercase">
                        {currentHeadPose.direction === 'center'
                          ? 'Tengah (Lurus)'
                          : currentHeadPose.direction === 'left'
                          ? 'Serong Kiri'
                          : currentHeadPose.direction === 'right'
                          ? 'Serong Kanan'
                          : currentHeadPose.direction === 'up'
                          ? 'Mendongak'
                          : 'Menunduk'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Test Mode Overlay Box */}
                {activeTab === 'test' && (
                  <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-950/90 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Hasil Uji Coba Pengenalan Langsung</span>
                        </div>
                        {testResult?.matchedStudent ? (
                          <div className="mt-1">
                            <span className="text-base font-bold text-emerald-400">
                              ✓ Terkenali sebagai: {testResult.matchedStudent.student.name}
                            </span>
                            <div className="flex flex-wrap gap-3 text-xs text-slate-300 mt-1">
                              <span>Kemiripan: <b>{testResult.matchedStudent.confidence}%</b></span>
                              <span>Jarak Euclidean: <b>{testResult.matchedStudent.distance.toFixed(3)}</b> (Sangat Akurat)</span>
                              {testResult.matchedStudent.margin !== undefined && (
                                <span className="text-emerald-300">
                                  Pemisahan dari siswa lain: +{testResult.matchedStudent.margin.toFixed(3)} (Aman & Unik)
                                </span>
                              )}
                            </div>
                          </div>
                        ) : testResult?.isAmbiguous ? (
                          <div className="mt-1 text-amber-300 text-xs">
                            ⚠️ Wajah belum cukup terbedakan secara unik. Posisikan lebih dekat dan lurus ke kamera.
                          </div>
                        ) : (
                          <div className="mt-1 text-slate-400 text-xs">
                            Arahkan wajah ke kamera untuk menguji apakah sistem mengenali siswa dengan tepat.
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('register')}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 cursor-pointer"
                      >
                        Kembali ke Registrasi
                      </button>
                    </div>
                  </div>
                )}

                {/* Registration Mode Overlay Controls */}
                {activeTab === 'register' && (
                  <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-2.5">
                    {/* Live Instruction Banner */}
                    <div className="bg-slate-950/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-indigo-500/30 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{currentStep.iconText}</span>
                        <div>
                          <div className="text-xs font-bold text-indigo-300">{currentStep.name}</div>
                          <div className="text-[11px] text-slate-300">{currentStep.instruction}</div>
                        </div>
                      </div>

                      <div className="hidden sm:block text-right text-[11px] text-slate-400">
                        {currentStep.tip}
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/90 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                      <div className="text-white text-xs">
                        <span className="text-slate-400">Sampel Terkumpul: </span>
                        <span className="font-bold text-indigo-400">
                          {capturedSamples.length}/5 Pose Wajah
                        </span>
                        <div className="flex gap-1.5 mt-1.5">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`h-2 w-7 rounded-full transition-all ${
                                capturedSamples.length > i
                                  ? 'bg-emerald-500'
                                  : currentPoseStepIndex === i
                                  ? 'bg-indigo-500 animate-pulse'
                                  : 'bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {capturedSamples.length >= 3 && (
                          <button
                            type="button"
                            onClick={() => handleSaveTemplate()}
                            disabled={isSaving}
                            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer transition-all"
                          >
                            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Simpan ({capturedSamples.length} Sampel)</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleTakeSample()}
                          disabled={!qualityInfo?.faceDetected || isCapturing}
                          className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                            qualityInfo?.faceDetected && !isCapturing
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer ring-2 ring-indigo-400/40'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                          }`}
                        >
                          {isCapturing ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Camera className="w-4 h-4" />
                          )}
                          <span>
                            Ambil Pose {capturedSamples.length + 1}
                            {capturedSamples.length < POSE_STEPS.length
                              ? ` (${POSE_STEPS[capturedSamples.length].name.split('.')[1] || ''})`
                              : ''}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Banner Overlay */}
                {saveSuccess && (
                  <div className="absolute inset-0 bg-emerald-950/95 backdrop-blur-md flex items-center justify-center p-6 z-30 animate-in fade-in">
                    <div className="text-center text-white">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center mb-3">
                        <Check className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold mb-1">🟢 5 Pose Wajah Berhasil Terdaftar!</h3>
                      <p className="text-xs text-emerald-200">
                        Template embedding biometrik <b>{selectedStudent?.name}</b> telah tersimpan dengan pemisahan unik.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Quick Camera Overlay Options */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={showMeshOverlay}
                  onChange={(e) => setShowMeshOverlay(e.target.checked)}
                  className="rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                />
                <span>Tampilkan Titik Biometrik (68 Landmark)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={autoCaptureOnPose}
                  onChange={(e) => setAutoCaptureOnPose(e.target.checked)}
                  className="rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                />
                <span>Ambil Otomatis saat Pose Cocok</span>
              </label>
            </div>

            {captureMessage && (
              <span className="text-rose-500 dark:text-rose-400 font-medium">
                {captureMessage}
              </span>
            )}
          </div>
        </div>

        {/* Right Column: 5 Guided Steps Tracker & Captured Samples Strip */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Step Guide Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
              <span>Panduan 5 Pose Wajah</span>
              <span className="text-[11px] font-normal text-slate-500">
                {capturedSamples.length}/5 Selesai
              </span>
            </h3>

            <div className="space-y-2.5">
              {POSE_STEPS.map((step, idx) => {
                const isCompleted = capturedSamples.length > idx;
                const isCurrent = capturedSamples.length === idx;

                return (
                  <div
                    key={step.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isCompleted
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                        : isCurrent
                        ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{step.iconText}</span>
                        <span className="text-xs font-bold">{step.name}</span>
                      </div>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : isCurrent ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                          Target
                        </span>
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600"></span>
                      )}
                    </div>
                    <p className="text-[11px] mt-1 text-slate-600 dark:text-slate-400">
                      {step.instruction}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Captured Samples Gallery Strip */}
          {capturedSamples.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                <span>Sampel yang Berhasil Diambil ({capturedSamples.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    setCapturedSamples([]);
                    setCurrentPoseStepIndex(0);
                  }}
                  className="text-[11px] font-medium text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Ulangi Semua</span>
                </button>
              </h3>

              <div className="grid grid-cols-5 gap-2">
                {capturedSamples.map((sample, idx) => (
                  <div
                    key={sample.id}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 aspect-square"
                  >
                    <img
                      src={sample.photoUrl}
                      alt={`Pose ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveSample(sample.id)}
                        className="p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-500 cursor-pointer"
                        title="Hapus sampel ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white bg-slate-900/80 px-1 rounded">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quality & Security Guidance Card */}
          <div className="bg-indigo-50/60 dark:bg-indigo-950/20 rounded-3xl p-5 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-200 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Keamanan & Pembeda Wajah Antar Siswa</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Dengan merekam 5 sampel pose (Lurus, Kiri, Kanan, Senyum, dan Stabil), algoritma mencocokkan median multi-vektor dan margin separasi (nearest-to-second ratio test), memastikan sistem <b>tidak akan salah mengenali siswa lain</b> bahkan jika memiliki kemiripan fisik.
            </p>
          </div>
        </div>
      </div>

      {/* Cross-Student Face Conflict Modal */}
      {conflictWarning && conflictWarning.conflictingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Peringatan Kemiripan Wajah!
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Wajah yang baru saja dipindai terdeteksi sangat mirip dengan siswa lain yang sudah terdaftar sebelumnya:
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left mb-5 flex items-center gap-3">
              {conflictWarning.conflictingStudent.photoUrl ? (
                <img
                  src={conflictWarning.conflictingStudent.photoUrl}
                  alt={conflictWarning.conflictingStudent.name}
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold flex items-center justify-center text-lg shrink-0">
                  {conflictWarning.conflictingStudent.name.charAt(0)}
                </div>
              )}
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-xs">
                  {conflictWarning.conflictingStudent.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  NIS: {conflictWarning.conflictingStudent.nis} · {conflictWarning.conflictingStudent.className}
                </div>
                <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                  Tingkat Kemiripan: {conflictWarning.similarityPercent}%
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-5 text-left">
              Pastikan Anda mendaftarkan siswa yang benar. Jika kedua siswa memang bersaudara kandung atau kembar, Anda dapat memilih "Tetap Lanjutkan".
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConflictWarning(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer"
              >
                Ambil Ulang Pose
              </button>
              <button
                type="button"
                onClick={() => {
                  setAllowConflictOverride(true);
                  setConflictWarning(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
              >
                Tetap Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Face Confirmation Modal */}
      {showDeleteModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Hapus Data Wajah?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              Yakin ingin menghapus seluruh template embedding biometrik wajah siswa <b>{selectedStudent.name}</b>?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFace}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
              >
                Hapus Wajah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
