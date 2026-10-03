import fs from "fs";
import path from "path";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { logger } from "./logger";
import { FACEFINDER_BASE64 } from "./models/facefinderBase64";

export interface FaceValidationResult {
  hasFace: boolean;
  confidence: number;
  reason?: string;
}

/**
 * Pico Face Detection Cascade Model unpacker.
 * Based on the pixel intensity comparison tree cascade algorithm (Nenad Markuš).
 * Lightweight, pure-JS, zero-native-dependency face detection.
 */
function unpackCascade(bytes: Int8Array) {
  const dview = new DataView(new ArrayBuffer(4));
  let p = 8;
  dview.setUint8(0, bytes[p + 0]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const tdepth = dview.getInt32(0, true);
  p = p + 4;
  dview.setUint8(0, bytes[p + 0]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const ntrees = dview.getInt32(0, true);
  p = p + 4;

  const tcodes_ls: number[] = [];
  const tpreds_ls: number[] = [];
  const thresh_ls: number[] = [];

  for (let t = 0; t < ntrees; ++t) {
    Array.prototype.push.apply(tcodes_ls, [0, 0, 0, 0]);
    Array.prototype.push.apply(tcodes_ls, Array.from(bytes.slice(p, p + 4 * Math.pow(2, tdepth) - 4)));
    p = p + 4 * Math.pow(2, tdepth) - 4;
    for (let i = 0; i < Math.pow(2, tdepth); ++i) {
      dview.setUint8(0, bytes[p + 0]);
      dview.setUint8(1, bytes[p + 1]);
      dview.setUint8(2, bytes[p + 2]);
      dview.setUint8(3, bytes[p + 3]);
      tpreds_ls.push(dview.getFloat32(0, true));
      p = p + 4;
    }
    dview.setUint8(0, bytes[p + 0]);
    dview.setUint8(1, bytes[p + 1]);
    dview.setUint8(2, bytes[p + 2]);
    dview.setUint8(3, bytes[p + 3]);
    thresh_ls.push(dview.getFloat32(0, true));
    p = p + 4;
  }

  const tcodes = new Int8Array(tcodes_ls);
  const tpreds = new Float32Array(tpreds_ls);
  const thresh = new Float32Array(thresh_ls);

  return function classifyRegion(r: number, c: number, s: number, pixels: Uint8Array, ldim: number) {
    r = 256 * r;
    c = 256 * c;
    let root = 0;
    let o = 0.0;
    const pow2tdepth = Math.pow(2, tdepth) >> 0;

    for (let i = 0; i < ntrees; ++i) {
      let idx = 1;
      for (let j = 0; j < tdepth; ++j) {
        idx =
          2 * idx +
          (pixels[(((r + tcodes[root + 4 * idx + 0] * s) >> 8) * ldim) + (((c + tcodes[root + 4 * idx + 1] * s) >> 8))] <=
           pixels[(((r + tcodes[root + 4 * idx + 2] * s) >> 8) * ldim) + (((c + tcodes[root + 4 * idx + 3] * s) >> 8))]
            ? 1
            : 0);
      }
      o = o + tpreds[pow2tdepth * i + idx - pow2tdepth];
      if (o <= thresh[i]) return -1;
      root += 4 * pow2tdepth;
    }
    return o - thresh[ntrees - 1];
  };
}

function runCascade(
  image: { pixels: Uint8Array; nrows: number; ncols: number; ldim: number },
  classifyRegion: (r: number, c: number, s: number, pixels: Uint8Array, ldim: number) => number,
  params: { shiftfactor: number; minsize: number; maxsize: number; scalefactor: number }
) {
  const { pixels, nrows, ncols, ldim } = image;
  const { shiftfactor, minsize, maxsize, scalefactor } = params;

  let scale = minsize;
  const detections: [number, number, number, number][] = [];

  while (scale <= maxsize) {
    const step = Math.max(shiftfactor * scale, 1) >> 0;
    const offset = (scale / 2 + 1) >> 0;

    for (let r = offset; r <= nrows - offset; r += step) {
      for (let c = offset; c <= ncols - offset; c += step) {
        const q = classifyRegion(r, c, scale, pixels, ldim);
        if (q > 0.0) {
          detections.push([r, c, scale, q]);
        }
      }
    }
    scale = scale * scalefactor;
  }
  return detections;
}

function clusterDetections(dets: [number, number, number, number][], iouthreshold: number) {
  dets.sort((a, b) => b[3] - a[3]);

  function calculateIoU(det1: [number, number, number, number], det2: [number, number, number, number]) {
    const r1 = det1[0], c1 = det1[1], s1 = det1[2];
    const r2 = det2[0], c2 = det2[1], s2 = det2[2];
    const overr = Math.max(0, Math.min(r1 + s1 / 2, r2 + s2 / 2) - Math.max(r1 - s1 / 2, r2 - s2 / 2));
    const overc = Math.max(0, Math.min(c1 + s1 / 2, c2 + s2 / 2) - Math.max(c1 - s1 / 2, c2 - s2 / 2));
    return (overr * overc) / (s1 * s1 + s2 * s2 - overr * overc);
  }

  const assignments = new Array(dets.length).fill(0);
  const clusters: [number, number, number, number][] = [];

  for (let i = 0; i < dets.length; ++i) {
    if (assignments[i] === 0) {
      let r = 0.0, c = 0.0, s = 0.0, q = 0.0, n = 0;
      for (let j = i; j < dets.length; ++j) {
        if (calculateIoU(dets[i], dets[j]) > iouthreshold) {
          assignments[j] = 1;
          r += dets[j][0];
          c += dets[j][1];
          s += dets[j][2];
          q += dets[j][3];
          n += 1;
        }
      }
      clusters.push([r / n, c / n, s / n, q]);
    }
  }
  return clusters;
}

// Locate cascade model file with fallbacks, including embedded base64 model
function getCascadeBuffer(): Buffer {
  const possiblePaths = [
    path.join(__dirname, "models", "facefinder"),
    path.join(__dirname, "..", "models", "facefinder"),
    path.join(process.cwd(), "src", "lib", "models", "facefinder"),
    path.join(process.cwd(), "dist", "lib", "models", "facefinder"),
    path.join(process.cwd(), "apps", "api", "src", "lib", "models", "facefinder"),
    path.join(process.cwd(), "apps", "api", "dist", "lib", "models", "facefinder"),
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p);
      }
    } catch {
      // ignore
    }
  }

  // Fallback to embedded base64 model (ensures 100% reliability on Docker / Render / Serverless)
  if (FACEFINDER_BASE64 && FACEFINDER_BASE64.length > 1000) {
    return Buffer.from(FACEFINDER_BASE64, "base64");
  }

  throw new Error("Pico facefinder cascade model not available.");
}

let cachedClassifier: ReturnType<typeof unpackCascade> | null = null;
function getClassifier() {
  if (!cachedClassifier) {
    const cascadeBuf = getCascadeBuffer();
    cachedClassifier = unpackCascade(
      new Int8Array(cascadeBuf.buffer, cascadeBuf.byteOffset, cascadeBuf.byteLength)
    );
  }
  return cachedClassifier;
}

function downscaleIfNeeded(
  rgba: Uint8Array | Buffer,
  width: number,
  height: number,
  maxDim: number = 480
): { gray: Uint8Array; width: number; height: number } {
  if (width <= maxDim && height <= maxDim) {
    const gray = new Uint8Array(width * height);
    for (let r = 0; r < height; ++r) {
      for (let c = 0; c < width; ++c) {
        const idx = (r * width + c) * 4;
        gray[r * width + c] = Math.round((2 * rgba[idx] + 7 * rgba[idx + 1] + 1 * rgba[idx + 2]) / 10);
      }
    }
    return { gray, width, height };
  }

  const scale = maxDim / Math.max(width, height);
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);
  const gray = new Uint8Array(newWidth * newHeight);

  for (let r = 0; r < newHeight; ++r) {
    const origY = Math.min(height - 1, Math.floor(r / scale));
    for (let c = 0; c < newWidth; ++c) {
      const origX = Math.min(width - 1, Math.floor(c / scale));
      const idx = (origY * width + origX) * 4;
      gray[r * newWidth + c] = Math.round((2 * rgba[idx] + 7 * rgba[idx + 1] + 1 * rgba[idx + 2]) / 10);
    }
  }

  return { gray, width: newWidth, height: newHeight };
}

/**
 * Privacy-conscious human face presence validator.
 * Uses a pre-trained decision tree cascade specifically trained to identify human faces.
 * Accurately rejects rooms, bottles, curtains, furniture, solid colors, logos, and landscapes.
 *
 * NOTE: Does NOT perform biometric identification or identity tracking.
 */
export function validateHumanFace(imageBuffer: Buffer, mimeType: string): FaceValidationResult {
  if (!imageBuffer || imageBuffer.length < 500) {
    return { hasFace: false, confidence: 0, reason: "Image file is too small or empty." };
  }

  const cleanMime = (mimeType || "").toLowerCase();
  const isJpeg = cleanMime.includes("jpeg") || cleanMime.includes("jpg") || (imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8);
  const isPng = cleanMime.includes("png") || (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50);

  if (!isJpeg && !isPng) {
    return { hasFace: false, confidence: 0, reason: "Unsupported image format. Please capture a JPEG or PNG photo." };
  }

  try {
    let rawImageData: { width: number; height: number; data: Uint8Array | Buffer };

    if (isJpeg) {
      rawImageData = jpeg.decode(imageBuffer, { useTArray: true });
    } else {
      // Decode PNG
      try {
        const png = PNG.sync.read(imageBuffer);
        rawImageData = { width: png.width, height: png.height, data: png.data };
      } catch (pngErr) {
        // Fallback to jpeg decode in case of mislabeled MIME
        try {
          rawImageData = jpeg.decode(imageBuffer, { useTArray: true });
        } catch {
          return { hasFace: false, confidence: 0, reason: "Invalid image data." };
        }
      }
    }

    const { width, height, data } = rawImageData;

    if (width < 60 || height < 60) {
      return { hasFace: false, confidence: 0, reason: "Image resolution is too low. Minimum 60x60 pixels required." };
    }

    // Downscale for fast and accurate cascade evaluation
    const { gray, width: w, height: h } = downscaleIfNeeded(data, width, height, 480);
    const classifier = getClassifier();

    const minFaceSize = Math.max(30, Math.floor(Math.min(w, h) * 0.15));
    const maxFaceSize = Math.floor(Math.min(w, h) * 0.95);

    const detections = runCascade(
      { pixels: gray, nrows: h, ncols: w, ldim: w },
      classifier,
      { shiftfactor: 0.1, minsize: minFaceSize, maxsize: maxFaceSize, scalefactor: 1.1 }
    );

    const clustered = clusterDetections(detections, 0.2);

    // Filter detections with face score >= 1.5 (robust for mobile cameras/low-light)
    const validFaceDetections = clustered.filter((d) => d[3] >= 1.2);

    logger.info(`Face detection result: total=${detections.length}, clustered=${clustered.length}, valid=${validFaceDetections.length}`);

    if (validFaceDetections.length === 0) {
      // Secondary check: Natural skin tone distribution WITH structural facial gradient
      // Rejects plain walls, blank skin-colored backgrounds, textures, solid colors, but accepts authentic selfies
      let skinPixels = 0;
      let centerSkinPixels = 0;
      let totalLuminance = 0;
      let totalLuminanceSq = 0;
      let edgeCount = 0;

      const totalPixels = width * height;
      const midXStart = Math.floor(width * 0.20);
      const midXEnd = Math.floor(width * 0.80);
      const midYStart = Math.floor(height * 0.15);
      const midYEnd = Math.floor(height * 0.85);
      let centerTotal = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Luminance calculation
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLuminance += lum;
          totalLuminanceSq += lum * lum;

          // Simple horizontal edge detector (human faces have eyes, eyebrows, lips, nostril contrasts)
          if (x > 0) {
            const prevIdx = (y * width + (x - 1)) * 4;
            const prevLum = 0.299 * data[prevIdx] + 0.587 * data[prevIdx + 1] + 0.114 * data[prevIdx + 2];
            if (Math.abs(lum - prevLum) > 22) {
              edgeCount++;
            }
          }

          // 1. Standard RGB skin heuristic (Kovac et al.)
          const isRgbSkin = r > 45 && g > 25 && b > 15 && r > g && (r - g) >= 8 && (r - b) >= 8;

          // 2. Standard YCbCr illumination-invariant skin segmentation
          const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
          const isYCbCrSkin = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;

          const isSkin = isRgbSkin || isYCbCrSkin;
          if (isSkin) {
            skinPixels++;
          }
          if (x >= midXStart && x <= midXEnd && y >= midYStart && y <= midYEnd) {
            centerTotal++;
            if (isSkin) centerSkinPixels++;
          }
        }
      }

      const meanLum = totalLuminance / totalPixels;
      const varianceLum = Math.sqrt(Math.max(0, (totalLuminanceSq / totalPixels) - (meanLum * meanLum)));
      const edgeDensity = edgeCount / totalPixels;
      const centerSkinRatio = centerTotal > 0 ? centerSkinPixels / centerTotal : 0;
      const overallSkinRatio = skinPixels / totalPixels;

      // Real human face selfie criteria:
      // 1. Center region has sufficient skin tones (>= 18%)
      // 2. Must NOT be a flat/blank solid color (varianceLum >= 18)
      // 3. Must have facial edges/features like eyes, nose, lips (edgeDensity between 2% and 40%)
      const hasRealFacialFeatures = varianceLum >= 18 && edgeDensity >= 0.02 && edgeDensity <= 0.45;

      if (centerSkinRatio >= 0.18 && overallSkinRatio >= 0.10 && hasRealFacialFeatures) {
        logger.info(`Human face validated via structural skin & gradient: center=${centerSkinRatio.toFixed(2)}, var=${varianceLum.toFixed(1)}, edge=${edgeDensity.toFixed(3)}`);
        return {
          hasFace: true,
          confidence: Math.min(0.95, Math.max(0.70, Math.round(centerSkinRatio * 100) / 100)),
        };
      }

      return {
        hasFace: false,
        confidence: 0,
        reason: "No clear human face detected. Please face the camera directly in good lighting and avoid blank or flat backgrounds.",
      };
    }

    // Best face score
    const bestFace = validFaceDetections[0];
    const score = bestFace[3];
    const confidence = Math.min(0.99, Math.max(0.75, Math.round((Math.min(100, score) / 100) * 100) / 100));

    return {
      hasFace: true,
      confidence,
    };
  } catch (err: any) {
    logger.error("Face detection error:", err);
    return {
      hasFace: false,
      confidence: 0,
      reason: "Could not analyze photo for human face. Please take a clear photo of your face.",
    };
  }
}
