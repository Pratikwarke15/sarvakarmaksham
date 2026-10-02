"use client";

import { useState, useRef } from "react";
import { Camera, Video, Plus, X, Loader2, Image as ImageIcon, CheckCircle, Film } from "lucide-react";
import { apiUpload } from "@/lib/api";

interface MediaProblemAttachmentProps {
  photos: string[];
  videoUrl?: string | null;
  onPhotosChange: (photos: string[]) => void;
  onVideoChange: (videoUrl: string | null) => void;
}

/**
 * Client-side photo compression using HTML5 Canvas.
 * Resizes images exceeding 1600px and encodes to JPEG at 0.85 quality.
 */
async function compressImageFile(file: File): Promise<Blob> {
  // If already under 800KB, no need to re-encode
  if (file.size < 800 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else resolve(file);
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export function MediaProblemAttachment({
  photos,
  videoUrl,
  onPhotosChange,
  onVideoChange,
}: MediaProblemAttachmentProps) {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 5) {
      setUploadError("You can attach up to 5 photos maximum.");
      return;
    }

    setUploadError(null);
    setIsUploadingPhoto(true);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedBlob = await compressImageFile(file);
        const uploadFileObj = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
          type: "image/jpeg",
        });

        const formData = new FormData();
        formData.append("file", uploadFileObj);

        const res = await apiUpload<{ success: boolean; data: { url: string } }>(
          "/uploads/problem-media",
          formData
        );

        if (res.success && res.data?.url) {
          newUrls.push(res.data.url);
        }
      }

      onPhotosChange([...photos, ...newUrls]);
    } catch (err: any) {
      console.error("Photo upload error:", err);
      setUploadError("Failed to upload photo. Please check file format and try again.");
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setUploadError("Video must be under 25MB.");
      return;
    }

    setUploadError(null);
    setIsUploadingVideo(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiUpload<{ success: boolean; data: { url: string } }>(
        "/uploads/problem-media",
        formData
      );

      if (res.success && res.data?.url) {
        onVideoChange(res.data.url);
      }
    } catch (err: any) {
      console.error("Video upload error:", err);
      setUploadError("Failed to upload video clip.");
    } finally {
      setIsUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
  };

  const removeVideo = () => {
    onVideoChange(null);
  };

  return (
    <div className="space-y-4">
      {uploadError && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
          {uploadError}
        </p>
      )}

      {/* Photos Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Camera className="h-4 w-4 text-[#800020]" />
            <span>Add Photos of the Issue (Optional)</span>
            <span className="text-[11px] font-normal text-slate-400">({photos.length}/5)</span>
          </label>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {/* Uploaded Photos */}
          {photos.map((url, idx) => (
            <div
              key={idx}
              className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Problem attachment ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 text-white hover:bg-rose-600 transition-colors"
                title="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Add Photo Button */}
          {photos.length < 5 && (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="aspect-square rounded-xl border border-dashed border-slate-300 hover:border-[#800020] bg-slate-50 hover:bg-white flex flex-col items-center justify-center p-2 text-slate-500 hover:text-[#800020] transition-all group disabled:opacity-50"
            >
              {isUploadingPhoto ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#800020]" />
              ) : (
                <>
                  <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold mt-1">Add Photo</span>
                </>
              )}
            </button>
          )}
        </div>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handlePhotoSelect}
        />
      </div>

      {/* Video Section */}
      <div className="pt-2 border-t border-slate-100">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
          <Film className="h-4 w-4 text-[#800020]" />
          <span>Add Short Video (Optional)</span>
          <span className="text-[11px] font-normal text-slate-400">Max 25MB</span>
        </label>

        {videoUrl ? (
          <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 max-w-sm">
            <video src={videoUrl} controls className="w-full h-44 object-cover" />
            <button
              type="button"
              onClick={removeVideo}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
              title="Remove video"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={isUploadingVideo}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-[#800020] bg-slate-50 hover:bg-white text-xs font-semibold text-slate-600 hover:text-[#800020] transition-colors disabled:opacity-50"
          >
            {isUploadingVideo ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#800020]" />
                <span>Uploading video...</span>
              </>
            ) : (
              <>
                <Video className="h-4 w-4 text-slate-400 group-hover:text-[#800020]" />
                <span>Attach a short video clip (e.g. leaking pipe, strange sound)</span>
              </>
            )}
          </button>
        )}

        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoSelect}
        />
      </div>
    </div>
  );
}
