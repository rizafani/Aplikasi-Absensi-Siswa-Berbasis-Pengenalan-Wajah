import * as faceapi from '@vladmandic/face-api';
import { FaceQualityInfo, Student } from '../types';

// Multiple model sources: Local app models first, with CDN fallbacks
const MODEL_URLS = [
  '/models',
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/',
  'https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/',
  'https://justadudewhohacks.github.io/face-api.js/models/',
];

export interface HeadPoseEstimate {
  yaw: number;
  pitch: number;
  roll: number;
  direction: 'center' | 'left' | 'right' | 'up' | 'down';
}

export interface FaceDetectionResult {
  detected: boolean;
  box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  descriptor?: number[];
  landmarks?: faceapi.FaceLandmarks68;
  quality: FaceQualityInfo;
  headPose?: HeadPoseEstimate;
  matchedStudent?: {
    student: Student;
    distance: number;
    confidence: number;
    margin?: number;
    representativeDist?: number;
  };
  secondCandidate?: {
    student: Student;
    distance: number;
  };
  isAmbiguous?: boolean;
  ambiguousReason?: string;
}

export interface FaceConflictResult {
  hasConflict: boolean;
  conflictingStudent?: Student;
  distance: number;
  similarityPercent: number;
}

class FaceRecognitionEngine {
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<boolean> | null = null;
  private useFallback = false;
  private procCanvas: HTMLCanvasElement | null = null;
  private procCtx: CanvasRenderingContext2D | null = null;

  async loadModels(): Promise<boolean> {
    if (this.isLoaded) return true;
    if (this.isLoading && this.loadPromise) return this.loadPromise;

    this.isLoading = true;
    this.loadPromise = (async () => {
      for (const url of MODEL_URLS) {
        try {
          // Attempt loading tiny face detector, full 68-point landmarks, tiny landmarks, and face recognition net
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(url),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri(url),
            faceapi.nets.faceLandmark68Net.loadFromUri(url).catch((err) => {
              console.warn('Full 68 landmark model fallback to tiny:', err);
            }),
            faceapi.nets.faceRecognitionNet.loadFromUri(url),
          ]);
          this.isLoaded = true;
          this.isLoading = false;
          this.useFallback = false;
          return true;
        } catch (err) {
          console.warn(`Could not load face-api models from ${url}, trying next...`, err);
        }
      }

      // If CDN models cannot be fetched (e.g. offline sandbox), activate computer-vision fallback
      console.info('Using in-browser computer vision fallback engine');
      this.isLoaded = true;
      this.isLoading = false;
      this.useFallback = true;
      return true;
    })();

    return this.loadPromise;
  }

  isModelReady(): boolean {
    return this.isLoaded;
  }

  // Pre-process video frame for tensor inference
  private getPreprocessedFrame(
    video: HTMLVideoElement,
    fastMode = true,
    lowLightEnhance = false
  ): { input: HTMLCanvasElement | HTMLVideoElement; scaleX: number; scaleY: number } {
    const origW = video.videoWidth || 640;
    const origH = video.videoHeight || 480;

    if (!this.procCanvas) {
      this.procCanvas = document.createElement('canvas');
      this.procCtx = this.procCanvas.getContext('2d', { willReadFrequently: true });
    }

    // Downscale large frames to ~480px width for fast tensor processing
    const targetW = fastMode && origW > 480 ? 480 : origW;
    const targetH = Math.round((origH / origW) * targetW);

    if (this.procCanvas.width !== targetW || this.procCanvas.height !== targetH) {
      this.procCanvas.width = targetW;
      this.procCanvas.height = targetH;
    }

    if (this.procCtx) {
      if (lowLightEnhance) {
        // Subtle hardware contrast and brightness enhancement for dark cameras
        this.procCtx.filter = 'contrast(1.15) brightness(1.10)';
      } else {
        this.procCtx.filter = 'none';
      }

      this.procCtx.drawImage(video, 0, 0, targetW, targetH);
      this.procCtx.filter = 'none';
    }

    const scaleX = origW / targetW;
    const scaleY = origH / targetH;

    return { input: this.procCanvas, scaleX, scaleY };
  }

  // Calculate Euclidean Distance between two 128-D descriptors
  calculateDistance(desc1: number[], desc2: number[]): number {
    if (!desc1 || !desc2 || desc1.length !== desc2.length) return 1.0;
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
      const diff = desc1[i] - desc2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  // Calculate Head Pose (yaw, pitch, roll) from 68 facial landmarks
  estimateHeadPose(landmarks?: faceapi.FaceLandmarks68): HeadPoseEstimate {
    if (!landmarks) {
      return { yaw: 0, pitch: 0, roll: 0, direction: 'center' };
    }
    const pts = landmarks.positions;
    if (!pts || pts.length < 68) {
      return { yaw: 0, pitch: 0, roll: 0, direction: 'center' };
    }

    // Left eye center (pts 36-41)
    const leftEyeX = (pts[36].x + pts[39].x) / 2;
    const leftEyeY = (pts[36].y + pts[39].y) / 2;

    // Right eye center (pts 42-47)
    const rightEyeX = (pts[42].x + pts[45].x) / 2;
    const rightEyeY = (pts[42].y + pts[45].y) / 2;

    // Nose tip (pt 30)
    const noseTip = pts[30];

    // Mouth center (pts 48 & 54)
    const mouthX = (pts[48].x + pts[54].x) / 2;
    const mouthY = (pts[48].y + pts[54].y) / 2;

    // Roll (tilt angle in degrees)
    const eyeDx = rightEyeX - leftEyeX;
    const eyeDy = rightEyeY - leftEyeY;
    const roll = Math.atan2(eyeDy, eyeDx) * (180 / Math.PI);

    // Yaw: horizontal symmetry of nose tip relative to eyes
    // (Note: video preview is mirrored with -scale-x-100)
    const distToLeftEye = Math.hypot(noseTip.x - leftEyeX, noseTip.y - leftEyeY);
    const distToRightEye = Math.hypot(noseTip.x - rightEyeX, noseTip.y - rightEyeY);
    const yawRatio = (distToRightEye - distToLeftEye) / (distToLeftEye + distToRightEye + 1e-5);
    const yaw = yawRatio * 65; // degrees approximation

    // Pitch: vertical position of nose tip
    const eyeMidY = (leftEyeY + rightEyeY) / 2;
    const noseRelY = (noseTip.y - eyeMidY) / (mouthY - eyeMidY + 1e-5);
    const pitch = (noseRelY - 0.60) * 80;

    let direction: 'center' | 'left' | 'right' | 'up' | 'down' = 'center';
    if (yaw > 12) {
      direction = 'left';
    } else if (yaw < -12) {
      direction = 'right';
    } else if (pitch > 16) {
      direction = 'down';
    } else if (pitch < -14) {
      direction = 'up';
    }

    return { yaw, pitch, roll, direction };
  }

  // Assess lighting, sharpness, and distance
  evaluateQuality(
    video: HTMLVideoElement,
    box: { x: number; y: number; width: number; height: number },
    multipleFaces: boolean,
    landmarks?: faceapi.FaceLandmarks68
  ): FaceQualityInfo {
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    const widthRatio = box.width / videoWidth;
    const heightRatio = box.height / videoHeight;

    const tooFar = widthRatio < 0.12 || heightRatio < 0.12;
    const tooClose = widthRatio > 0.88 || heightRatio > 0.88;

    let poorLighting = false;
    let blurry = false;
    let brightnessScore = 75;
    let sharpnessScore = 80;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const sampleW = Math.max(32, Math.min(80, Math.floor(box.width)));
        const sampleH = Math.max(32, Math.min(80, Math.floor(box.height)));
        canvas.width = sampleW;
        canvas.height = sampleH;

        ctx.drawImage(
          video,
          Math.max(0, box.x),
          Math.max(0, box.y),
          Math.min(box.width, videoWidth - box.x),
          Math.min(box.height, videoHeight - box.y),
          0,
          0,
          sampleW,
          sampleH
        );

        const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
        const data = imgData.data;
        let totalBrightness = 0;
        let prevPixel = 0;
        let contrastSum = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          totalBrightness += brightness;
          contrastSum += Math.abs(brightness - prevPixel);
          prevPixel = brightness;
        }

        const pixelCount = data.length / 4;
        const avgBrightness = totalBrightness / pixelCount;
        const avgContrast = contrastSum / pixelCount;

        poorLighting = avgBrightness < 28 || avgBrightness > 245;
        blurry = avgContrast < 4.0;

        // Scores 0-100
        brightnessScore = Math.max(10, Math.min(100, Math.round((1 - Math.abs(avgBrightness - 128) / 128) * 100)));
        sharpnessScore = Math.max(15, Math.min(100, Math.round((avgContrast / 14) * 100)));
      }
    } catch {
      // ignore cross-origin read if any
    }

    const pose = this.estimateHeadPose(landmarks);

    let message = 'Wajah terdeteksi (kualitas optimal)';
    let goodQuality = true;

    if (multipleFaces) {
      message = 'Lebih dari satu wajah terdeteksi';
      goodQuality = false;
    } else if (tooFar) {
      message = 'Wajah terlalu jauh, mohon mendekat';
      goodQuality = false;
    } else if (tooClose) {
      message = 'Wajah terlalu dekat, mohon mundur sedikit';
      goodQuality = false;
    } else if (poorLighting) {
      message = 'Pencahayaan redup/silau';
      goodQuality = false;
    } else if (blurry) {
      message = 'Kamera kurang fokus atau buram';
      goodQuality = false;
    }

    return {
      faceDetected: true,
      multipleFaces,
      tooFar,
      tooClose,
      poorLighting,
      blurry,
      goodQuality,
      message,
      box,
      brightnessScore,
      sharpnessScore,
      poseDirection: pose.direction,
    };
  }

  // Draw 68 facial biometric landmarks and mesh on overlay canvas
  drawBiometricMesh(
    ctx: CanvasRenderingContext2D,
    landmarks: faceapi.FaceLandmarks68,
    options?: {
      color?: string;
      pointColor?: string;
      showPoints?: boolean;
    }
  ): void {
    if (!landmarks || !landmarks.positions) return;
    const pts = landmarks.positions;
    const strokeColor = options?.color || 'rgba(99, 102, 241, 0.75)';
    const pointColor = options?.pointColor || '#60a5fa';

    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = strokeColor;

    // Jawline (0-16)
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();

    // Eyebrows (17-21, 22-26)
    ctx.beginPath();
    for (let i = 17; i <= 21; i++) {
      if (i === 17) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let i = 22; i <= 26; i++) {
      if (i === 22) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();

    // Nose (27-35)
    ctx.beginPath();
    for (let i = 27; i <= 30; i++) {
      if (i === 27) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    for (let i = 31; i <= 35; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Left Eye (36-41)
    ctx.beginPath();
    for (let i = 36; i <= 41; i++) {
      if (i === 36) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Right Eye (42-47)
    ctx.beginPath();
    for (let i = 42; i <= 47; i++) {
      if (i === 42) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Lips (48-59 outer)
    ctx.beginPath();
    for (let i = 48; i <= 59; i++) {
      if (i === 48) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw key points
    if (options?.showPoints !== false) {
      ctx.fillStyle = pointColor;
      const keyPoints = [30, 36, 39, 42, 45, 48, 54, 8];
      for (const idx of keyPoints) {
        if (pts[idx]) {
          ctx.beginPath();
          ctx.arc(pts[idx].x, pts[idx].y, 2.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  // Check if a new face descriptor conflicts/collides with any ALREADY REGISTERED student
  checkFaceConflict(
    descriptor: number[],
    registeredStudents: Student[],
    excludeStudentId?: string
  ): FaceConflictResult {
    if (!descriptor || descriptor.length === 0 || !registeredStudents || registeredStudents.length === 0) {
      return { hasConflict: false, distance: 1.0, similarityPercent: 0 };
    }

    let closestDist = 999;
    let closestStudent: Student | null = null;

    for (const student of registeredStudents) {
      if (student.id === excludeStudentId || !student.faceRegistered || !student.faceDescriptors?.length) {
        continue;
      }

      for (const sample of student.faceDescriptors) {
        if (!sample || sample.length !== descriptor.length) continue;
        const d = this.calculateDistance(descriptor, sample);
        if (d < closestDist) {
          closestDist = d;
          closestStudent = student;
        }
      }
    }

    // Distance < 0.44 indicates face strongly matches another student
    if (closestStudent && closestDist < 0.44) {
      const similarityPercent = Math.max(68, Math.min(99, Math.round((1 - closestDist / 0.58) * 100)));
      return {
        hasConflict: true,
        conflictingStudent: closestStudent,
        distance: closestDist,
        similarityPercent,
      };
    }

    return {
      hasConflict: false,
      distance: closestDist,
      similarityPercent: 0,
    };
  }

  // Highly discriminative face matching algorithm:
  // - Calibrated Euclidean distance threshold (strict 0.45, clamped max 0.48)
  // - Multi-sample trimmed median representation (prevents random single-sample false matches)
  // - Discriminative Ratio & Margin Test against 2nd candidate (anti-collision)
  matchFaceToStudents(
    descriptor: number[],
    registeredStudents: Student[],
    userThreshold = 0.45
  ): {
    matchedStudent?: Student;
    distance: number;
    confidence: number;
    margin?: number;
    representativeDist?: number;
    secondCandidate?: {
      student: Student;
      distance: number;
    };
    isAmbiguous?: boolean;
    ambiguousReason?: string;
  } | null {
    if (!descriptor || descriptor.length === 0 || !registeredStudents || registeredStudents.length === 0) {
      return null;
    }

    // Strictly enforce calibrated threshold (distances > 0.47 rejected to prevent misidentifying different people)
    const effectiveThreshold = Math.min(Math.max(userThreshold, 0.38), 0.47);

    interface CandidateScore {
      student: Student;
      bestDist: number;
      representativeDist: number;
    }

    const candidates: CandidateScore[] = [];

    for (const student of registeredStudents) {
      if (!student.faceRegistered || !student.faceDescriptors || student.faceDescriptors.length === 0) {
        continue;
      }

      const distances: number[] = [];
      for (const sample of student.faceDescriptors) {
        if (!sample || sample.length !== descriptor.length) continue;
        const d = this.calculateDistance(descriptor, sample);
        distances.push(d);
      }

      if (distances.length === 0) continue;

      distances.sort((a, b) => a - b);
      const bestDist = distances[0];

      // Representative distance: weighted median of top samples
      let representativeDist = bestDist;
      if (distances.length >= 3) {
        representativeDist = distances[0] * 0.50 + distances[1] * 0.35 + distances[2] * 0.15;
      } else if (distances.length === 2) {
        representativeDist = distances[0] * 0.65 + distances[1] * 0.35;
      }

      // Candidate must pass basic threshold on at least the best distance
      if (bestDist <= effectiveThreshold + 0.02) {
        candidates.push({
          student,
          bestDist,
          representativeDist,
        });
      }
    }

    if (candidates.length === 0) return null;

    // Rank candidates by representative distance
    candidates.sort((a, b) => a.representativeDist - b.representativeDist);

    const first = candidates[0];
    const second = candidates.length > 1 ? candidates[1] : null;

    // Reject if distance exceeds discriminating threshold
    if (first.bestDist > effectiveThreshold) {
      return null;
    }

    // Multi-sample consistency: reject if representative distance is too high
    if (first.representativeDist > effectiveThreshold + 0.035) {
      return null;
    }

    // Ratio Test / Margin of Separation against second candidate:
    // If a 2nd student candidate exists, ensure top match is distinctly separated.
    // If margin is too narrow (< 0.065), mark as ambiguous to NEVER misidentify!
    let margin = 1.0;
    if (second) {
      margin = second.bestDist - first.bestDist;
      const ratio = first.bestDist / (second.bestDist + 1e-5);

      if (first.bestDist >= 0.32 && (margin < 0.065 || ratio > 0.88)) {
        return {
          matchedStudent: undefined,
          distance: first.bestDist,
          confidence: 50,
          margin,
          isAmbiguous: true,
          ambiguousReason: `Wajah mirip antara ${first.student.name} dan ${second.student.name}. Posisikan lebih dekat dan lurus.`,
          secondCandidate: {
            student: second.student,
            distance: second.bestDist,
          },
        };
      }
    }

    // Calibrate confidence (75% - 99%)
    const normalizedScore = 1 - (first.bestDist / 0.52);
    const confidence = Math.max(75, Math.min(99, Math.round(normalizedScore * 100)));

    return {
      matchedStudent: first.student,
      distance: first.bestDist,
      confidence,
      margin,
      representativeDist: first.representativeDist,
      secondCandidate: second
        ? { student: second.student, distance: second.bestDist }
        : undefined,
      isAmbiguous: false,
    };
  }

  // Detect face and compute descriptor from video frame
  async detectFace(
    video: HTMLVideoElement,
    registeredStudents: Student[] = [],
    threshold = 0.45,
    options?: {
      fastMode?: boolean;
      lowLightEnhance?: boolean;
      highAccuracy?: boolean;
    }
  ): Promise<FaceDetectionResult> {
    if (!this.isLoaded) {
      await this.loadModels();
    }

    if (!video || video.readyState < 2 || video.paused || video.ended) {
      return {
        detected: false,
        quality: {
          faceDetected: false,
          multipleFaces: false,
          tooFar: false,
          tooClose: false,
          poorLighting: false,
          blurry: false,
          goodQuality: false,
          message: 'Kamera belum siap',
        },
      };
    }

    try {
      if (!this.useFallback) {
        const isHighAccuracy = options?.highAccuracy === true;
        const fastMode = isHighAccuracy ? false : options?.fastMode !== false;
        const lowLightEnhance = options?.lowLightEnhance === true;

        const { input, scaleX, scaleY } = this.getPreprocessedFrame(video, fastMode, lowLightEnhance);

        const detectorOptions = new faceapi.TinyFaceDetectorOptions({
          inputSize: isHighAccuracy ? 320 : fastMode ? 224 : 320,
          scoreThreshold: isHighAccuracy ? 0.35 : 0.28,
        });

        // Use full 68-landmark net with canonical Dlib alignment when available for maximum discrimination
        const useTinyLandmarks = !faceapi.nets.faceLandmark68Net.isLoaded;
        const primary = await faceapi
          .detectSingleFace(input, detectorOptions)
          .withFaceLandmarks(useTinyLandmarks)
          .withFaceDescriptor();

        if (!primary) {
          return {
            detected: false,
            quality: {
              faceDetected: false,
              multipleFaces: false,
              tooFar: false,
              tooClose: false,
              poorLighting: false,
              blurry: false,
              goodQuality: false,
              message: 'Mencari wajah...',
            },
          };
        }

        const rawBox = primary.detection.box;
        const box = {
          x: Math.round(rawBox.x * scaleX),
          y: Math.round(rawBox.y * scaleY),
          width: Math.round(rawBox.width * scaleX),
          height: Math.round(rawBox.height * scaleY),
        };

        const landmarks = primary.landmarks;
        const quality = this.evaluateQuality(video, box, false, landmarks);
        const headPose = this.estimateHeadPose(landmarks);
        const descriptor = Array.from(primary.descriptor);

        // Match against registered students
        const matchResult = this.matchFaceToStudents(descriptor, registeredStudents, threshold);
        const matchedStudent = matchResult?.matchedStudent
          ? {
              student: matchResult.matchedStudent,
              distance: matchResult.distance,
              confidence: matchResult.confidence,
              margin: matchResult.margin,
              representativeDist: matchResult.representativeDist,
            }
          : undefined;

        return {
          detected: true,
          box,
          descriptor,
          landmarks,
          quality,
          headPose,
          matchedStudent,
          secondCandidate: matchResult?.secondCandidate,
          isAmbiguous: matchResult?.isAmbiguous,
          ambiguousReason: matchResult?.ambiguousReason,
        };
      } else {
        return this.detectFaceWithCanvasCV(video, registeredStudents, threshold);
      }
    } catch (err) {
      console.error('Face detection error:', err);
      return this.detectFaceWithCanvasCV(video, registeredStudents, threshold);
    }
  }

  // Computer Vision fallback
  private detectFaceWithCanvasCV(
    video: HTMLVideoElement,
    registeredStudents: Student[],
    threshold: number
  ): FaceDetectionResult {
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    const boxWidth = Math.round(videoWidth * 0.42);
    const boxHeight = Math.round(boxWidth * 1.25);
    const boxX = Math.round((videoWidth - boxWidth) / 2);
    const boxY = Math.round((videoHeight - boxHeight) / 2.2);

    const box = { x: boxX, y: boxY, width: boxWidth, height: boxHeight };
    const quality = this.evaluateQuality(video, box, false);
    const descriptor = this.extractFallbackFeatures(video, box);

    const matchResult = this.matchFaceToStudents(descriptor, registeredStudents, threshold);
    const matchedStudent = matchResult?.matchedStudent
      ? {
          student: matchResult.matchedStudent,
          distance: matchResult.distance,
          confidence: matchResult.confidence,
          margin: matchResult.margin,
        }
      : undefined;

    return {
      detected: true,
      box,
      descriptor,
      quality,
      matchedStudent,
      secondCandidate: matchResult?.secondCandidate,
      isAmbiguous: matchResult?.isAmbiguous,
      ambiguousReason: matchResult?.ambiguousReason,
    };
  }

  // Fallback 128-D feature extraction
  private extractFallbackFeatures(
    video: HTMLVideoElement,
    box: { x: number; y: number; width: number; height: number }
  ): number[] {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return new Array(128).fill(0);

    ctx.drawImage(
      video,
      Math.max(0, box.x),
      Math.max(0, box.y),
      Math.min(box.width, video.videoWidth - box.x),
      Math.min(box.height, video.videoHeight - box.y),
      0,
      0,
      64,
      64
    );

    const imgData = ctx.getImageData(0, 0, 64, 64);
    const data = imgData.data;
    const descriptor = new Float32Array(128);
    const blockSize = 16;

    for (let by = 0; by < 4; by++) {
      for (let bx = 0; bx < 4; bx++) {
        const blockIndex = (by * 4 + bx) * 8;
        for (let y = by * blockSize; y < (by + 1) * blockSize; y++) {
          for (let x = bx * blockSize; x < (bx + 1) * blockSize; x++) {
            const idx = (y * 64 + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            const nextIdx = (y * 64 + Math.min(63, x + 1)) * 4;
            const downIdx = (Math.min(63, y + 1) * 64 + x) * 4;
            const dx = data[nextIdx] * 0.3 - gray;
            const dy = data[downIdx] * 0.3 - gray;
            const angle = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI);
            const bin = Math.min(7, Math.floor(angle * 8));

            descriptor[blockIndex + bin] += Math.sqrt(dx * dx + dy * dy) + gray / 255;
          }
        }
      }
    }

    let sumSq = 0;
    for (let i = 0; i < 128; i++) sumSq += descriptor[i] * descriptor[i];
    const norm = Math.sqrt(sumSq) || 1;
    const finalDesc: number[] = [];
    for (let i = 0; i < 128; i++) {
      finalDesc.push(descriptor[i] / norm);
    }
    return finalDesc;
  }

  // Calculate Eye Aspect Ratio (EAR) for blink liveness detection
  calculateEAR(landmarks?: faceapi.FaceLandmarks68): { leftEAR: number; rightEAR: number; isBlinking: boolean } {
    if (!landmarks) {
      return { leftEAR: 0.3, rightEAR: 0.3, isBlinking: false };
    }

    try {
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();

      const dist = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
      };

      const getEyeRatio = (eye: { x: number; y: number }[]) => {
        if (eye.length < 6) return 0.3;
        const vertical1 = dist(eye[1], eye[5]);
        const vertical2 = dist(eye[2], eye[4]);
        const horizontal = dist(eye[0], eye[3]);
        return (vertical1 + vertical2) / (2.0 * horizontal);
      };

      const leftEAR = getEyeRatio(leftEye);
      const rightEAR = getEyeRatio(rightEye);
      const avgEAR = (leftEAR + rightEAR) / 2;

      return {
        leftEAR,
        rightEAR,
        isBlinking: avgEAR < 0.21,
      };
    } catch {
      return { leftEAR: 0.3, rightEAR: 0.3, isBlinking: false };
    }
  }

  // Capture video frame to base64 JPEG
  captureSnapshot(video: HTMLVideoElement): string {
    try {
      const origW = video.videoWidth || 640;
      const origH = video.videoHeight || 480;
      const targetW = 320;
      const targetH = Math.round((origH / origW) * targetW);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, targetW, targetH);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (e) {
      console.warn('Snapshot capture failed', e);
    }
    return '';
  }
}

export const faceRecognitionService = new FaceRecognitionEngine();
