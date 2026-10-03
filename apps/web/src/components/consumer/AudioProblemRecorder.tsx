"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Play, Pause, RotateCcw, Trash2, CheckCircle, AlertCircle, Loader2, Volume2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUpload } from "@/lib/api";

interface AudioProblemRecorderProps {
  onAudioReady: (audioData: { audioUrl: string; duration: number } | null) => void;
  existingAudioUrl?: string | null;
}

type RecordingState = "IDLE" | "RECORDING" | "PAUSED" | "RECORDED";

export function AudioProblemRecorder({ onAudioReady, existingAudioUrl }: AudioProblemRecorderProps) {
  const [state, setState] = useState<RecordingState>(existingAudioUrl ? "RECORDED" : "IDLE");
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioPlaybackUrl, setAudioPlaybackUrl] = useState<string | null>(existingAudioUrl || null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(existingAudioUrl || null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);

  // Clear timers and streams on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioPlaybackUrl && !audioPlaybackUrl.startsWith("http")) {
        URL.revokeObjectURL(audioPlaybackUrl);
      }
    };
  }, [audioPlaybackUrl]);

  // Handle format seconds into mm:ss
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    setUploadError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const localUrl = URL.createObjectURL(audioBlob);
        setAudioPlaybackUrl(localUrl);
        setState("RECORDED");

        // Stop tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        // Upload to server
        await uploadAudio(audioBlob);
      };

      recorder.start(250); // slice chunks every 250ms
      setState("RECORDING");
      setDuration(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setUploadError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Microphone permission was denied. Please allow microphone access in your browser settings to record."
          : "Unable to access microphone on this device."
      );
      setState("IDLE");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && state === "RECORDING") {
      mediaRecorderRef.current.pause();
      setState("PAUSED");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && state === "PAUSED") {
      mediaRecorderRef.current.resume();
      setState("RECORDING");
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && (state === "RECORDING" || state === "PAUSED")) {
      mediaRecorderRef.current.stop();
    }
  };

  const uploadAudio = async (blob: Blob) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
      const file = new File([blob], `voice-problem-${Date.now()}.${ext}`, { type: blob.type });

      const formData = new FormData();
      formData.append("file", file);

      const res = await apiUpload<{ success: boolean; data: { url: string } }>(
        "/uploads/problem-audio",
        formData
      );

      if (res.success && res.data?.url) {
        setUploadedUrl(res.data.url);
        onAudioReady({ audioUrl: res.data.url, duration });
      } else {
        throw new Error("Failed to obtain uploaded audio URL");
      }
    } catch (err: any) {
      console.error("Voice upload error:", err);
      setUploadError("Failed to upload audio recording. You can retry or record again.");
      onAudioReady(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAudioFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setUploadError("Audio file must be under 15MB.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const localUrl = URL.createObjectURL(file);
      setAudioPlaybackUrl(localUrl);

      // Probe duration
      const tempAudio = new Audio(localUrl);
      tempAudio.onloadedmetadata = () => {
        if (tempAudio.duration && !isNaN(tempAudio.duration)) {
          setDuration(Math.round(tempAudio.duration));
        }
      };

      const formData = new FormData();
      formData.append("file", file);

      const res = await apiUpload<{ success: boolean; data: { url: string } }>(
        "/uploads/problem-audio",
        formData
      );

      if (res.success && res.data?.url) {
        setUploadedUrl(res.data.url);
        setState("RECORDED");
        onAudioReady({ audioUrl: res.data.url, duration: duration || 15 });
      } else {
        throw new Error("Failed to upload audio file");
      }
    } catch (err: any) {
      console.error("Audio file upload error:", err);
      setUploadError("Could not upload audio file. Please try another format or record directly.");
    } finally {
      setIsUploading(false);
      if (audioFileInputRef.current) audioFileInputRef.current.value = "";
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const deleteRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && state === "RECORDING") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    if (audioPlaybackUrl && !audioPlaybackUrl.startsWith("http")) {
      URL.revokeObjectURL(audioPlaybackUrl);
    }
    setAudioPlaybackUrl(null);
    setUploadedUrl(null);
    setDuration(0);
    setIsPlaying(false);
    setPlaybackProgress(0);
    setState("IDLE");
    onAudioReady(null);
  };

  const retakeRecording = () => {
    deleteRecording();
    setTimeout(() => {
      startRecording();
    }, 100);
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition-all">
      {/* Hidden file input for uploading audio files */}
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm,.aac"
        className="hidden"
        onChange={handleAudioFileSelect}
      />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${state === "RECORDING" ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-[#800020]/10 text-[#800020]"}`}>
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Voice Explanation</h4>
            <p className="text-[11px] text-slate-500">Record voice or upload an audio file</p>
          </div>
        </div>

        {/* State Badge */}
        {state === "RECORDING" && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200">
            <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
            Recording ({formatTime(duration)})
          </span>
        )}
        {state === "PAUSED" && (
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
            Paused ({formatTime(duration)})
          </span>
        )}
        {state === "RECORDED" && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            Voice Note Ready
          </span>
        )}
      </div>

      {uploadError && (
        <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* RECORDING / PAUSED VIEW */}
      {(state === "RECORDING" || state === "PAUSED") && (
        <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center space-y-3">
          <div className="flex items-center gap-1.5 h-8">
            {[40, 70, 30, 90, 60, 100, 50, 80, 45, 95, 35].map((height, i) => (
              <span
                key={i}
                style={{ height: state === "RECORDING" ? `${height}%` : "20%" }}
                className={`w-1 rounded-full transition-all duration-150 ${state === "RECORDING" ? "bg-[#800020]" : "bg-slate-300"}`}
              />
            ))}
          </div>

          <div className="text-xl font-mono font-bold text-slate-800 tracking-wider">
            {formatTime(duration)}
          </div>

          <div className="flex items-center gap-3 pt-2">
            {state === "RECORDING" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={pauseRecording}
                className="gap-1.5 rounded-xl border-amber-300 text-amber-800 hover:bg-amber-50"
              >
                <Pause className="h-4 w-4" />
                <span>Pause</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resumeRecording}
                className="gap-1.5 rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              >
                <Play className="h-4 w-4" />
                <span>Resume</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={stopRecording}
              className="gap-1.5 rounded-xl bg-[#800020] hover:bg-[#68001a] text-white shadow-xs"
            >
              <Square className="h-4 w-4 fill-white" />
              <span>Stop & Save</span>
            </Button>
          </div>
        </div>
      )}

      {/* RECORDED / PLAYBACK VIEW */}
      {state === "RECORDED" && audioPlaybackUrl && (
        <div className="my-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          {/* Audio controller */}
          <audio
            ref={audioPlayerRef}
            src={audioPlaybackUrl}
            controls
            onTimeUpdate={() => {
              if (audioPlayerRef.current) {
                const cur = audioPlayerRef.current.currentTime;
                const dur = audioPlayerRef.current.duration || duration || 1;
                setPlaybackProgress((cur / dur) * 100);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setPlaybackProgress(0);
            }}
            className="w-full h-8 rounded-lg accent-[#800020]"
          />

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-xs">
            <div className="flex items-center gap-2">
              {isUploading ? (
                <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading audio...
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  Audio saved securely ({formatTime(duration)})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={retakeRecording}
                disabled={isUploading}
                className="h-8 px-2.5 rounded-lg text-slate-600 hover:text-slate-900 gap-1 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Re-record</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => audioFileInputRef.current?.click()}
                disabled={isUploading}
                className="h-8 px-2.5 rounded-lg text-slate-600 hover:text-slate-900 gap-1 text-xs"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Change File</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={deleteRecording}
                disabled={isUploading}
                className="h-8 px-2.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* IDLE VIEW */}
      {state === "IDLE" && (
        <div className="my-2 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70">
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold text-slate-700">Don&apos;t want to type? Just speak or upload!</p>
            <p className="text-[11px] text-slate-500">Record a voice note or choose an audio file from your device.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              onClick={startRecording}
              className="flex-1 sm:flex-none rounded-xl bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold gap-1.5 px-3.5 py-2 shadow-xs transition-transform active:scale-95"
            >
              <Mic className="h-4 w-4" />
              <span>Record Voice</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => audioFileInputRef.current?.click()}
              className="flex-1 sm:flex-none rounded-xl border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold gap-1.5 px-3.5 py-2 transition-transform active:scale-95"
            >
              <Upload className="h-4 w-4 text-slate-500" />
              <span>Upload Audio</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
