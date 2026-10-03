import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import fs from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { env } from "../config/env";
import { logger } from "./logger";

if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as any).WebSocket = WebSocket;
}

let supabase: ReturnType<typeof createClient> | null = null;

const localUploadRoot = path.resolve(process.cwd(), "public", "uploads");

const DEFAULT_SUPABASE_URL = "https://rzagxntjipxfinvlajos.supabase.co";
const DEFAULT_SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWd4bnRqaXB4Zmludmxham9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzc2OTE5NSwiZXhwIjoyMTAzMzQ1MTk1fQ.8SS7m3x3BoeOuOtscSam2_IoUUL-2wBTTb0W3Jbe7mc";

function getSupabase() {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || DEFAULT_SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return null;
  }
  try {
    if (typeof globalThis.WebSocket === "undefined") {
      (globalThis as any).WebSocket = WebSocket;
    }
    supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return supabase;
  } catch (err: any) {
    logger.warn(`Supabase client initialization warning: ${err?.message}`);
    return null;
  }
}

async function uploadFileLocally(
  bucket: string,
  fileBuffer: Buffer,
  originalName: string,
  mimeType?: string
): Promise<{ url: string; path: string }> {
  try {
    const ext = originalName.split(".").pop() || "jpg";
    const fileName = `${uuid()}.${ext}`;
    const relativePath = `${bucket}/${fileName}`;
    const directory = path.join(localUploadRoot, bucket);
    const absolutePath = path.join(directory, fileName);

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(absolutePath, fileBuffer);

    const baseUrl =
      process.env.PUBLIC_API_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "https://coopgig.onrender.com");
    return {
      path: relativePath,
      url: `${baseUrl}/uploads/${relativePath}`,
    };
  } catch (err: any) {
    logger.warn(`Local upload failed (${err?.message}); using data URI fallback`);
    const resolvedMime = mimeType || (originalName.endsWith(".png") ? "image/png" : "image/jpeg");
    return {
      path: `data:${resolvedMime}`,
      url: `data:${resolvedMime};base64,${fileBuffer.toString("base64")}`,
    };
  }
}

export async function uploadFile(
  bucket: string,
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<{ url: string; path: string }> {
  const ext = originalName.split(".").pop() || "jpg";
  const fileName = `${uuid()}.${ext}`;
  const client = getSupabase();

  if (client) {
    try {
      let { data, error } = await client.storage
        .from(bucket)
        .upload(fileName, fileBuffer, { contentType: mimeType, upsert: true });

      if (
        error &&
        (error.message?.toLowerCase().includes("not found") ||
          (error as any).statusCode === 404 ||
          (error as any).statusCode === "404")
      ) {
        await client.storage.createBucket(bucket, { public: true });
        const retry = await client.storage
          .from(bucket)
          .upload(fileName, fileBuffer, { contentType: mimeType, upsert: true });
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        const { data: urlData } = client.storage.from(bucket).getPublicUrl(fileName);
        return { url: urlData.publicUrl, path: fileName };
      }

      logger.warn(`Supabase upload returned error (${error?.message}); falling back`);
    } catch (err: any) {
      logger.warn(`Supabase upload threw error (${err?.message}); falling back`);
    }
  }

  return uploadFileLocally(bucket, fileBuffer, originalName, mimeType);
}


export async function deleteFile(
  bucket: string,
  filePath: string
): Promise<void> {
  const client = getSupabase();
  if (client) {
    try {
      await client.storage.from(bucket).remove([filePath]);
      return;
    } catch {
      // ignore
    }
  }
  try {
    await fs.rm(path.join(localUploadRoot, filePath), { force: true });
  } catch {
    // ignore
  }
}
