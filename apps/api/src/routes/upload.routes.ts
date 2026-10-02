import { Router } from "express";
import multer from "multer";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { uploadFile } from "../lib/storage";
import { validateHumanFace } from "../lib/faceDetector";
import prisma from "../lib/prisma";

const router = Router();

const kycUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    cb(null, allowed.includes(file.mimetype.toLowerCase()));
  },
});

router.post("/kyc", authenticate, authorize("WORKER"), kycUpload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: "No file provided" });
    return;
  }
  const { url, path } = await uploadFile("kyc-documents", req.file.buffer, req.file.originalname, req.file.mimetype);
  const fileUpload = await prisma.fileUpload.create({
    data: {
      userId: req.user!.id,
      fileName: path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url,
      bucket: "kyc-documents",
      purpose: "KYC",
    },
  });
  const wp = await prisma.workerProfile.findUnique({ where: { userId: req.user!.id } });
  if (wp) {
    await prisma.workerProfile.update({
      where: { id: wp.id },
      data: { kycDocumentUrl: url, kycStatus: "UNDER_REVIEW" },
    });
  }
  res.json({ success: true, data: { url, fileUpload } });
}));

router.post("/consumer-kyc", authenticate, authorize("CONSUMER"), kycUpload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: "No file provided" });
    return;
  }
  const { url, path } = await uploadFile("kyc-documents", req.file.buffer, req.file.originalname, req.file.mimetype);
  const fileUpload = await prisma.fileUpload.create({
    data: {
      userId: req.user!.id,
      fileName: path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url,
      bucket: "kyc-documents",
      purpose: "KYC",
    },
  });
  await prisma.consumerProfile.update({
    where: { userId: req.user!.id },
    data: { kycDocumentUrl: url, kycStatus: "VERIFIED" },
  });
  res.json({ success: true, data: { url, fileUpload } });
}));

/**
 * Public route for profile photo capture during registration (no token required).
 * Validates human face presence before storing to profile-photos bucket.
 */
router.post("/register-photo", (req, res, next) => {
  photoUpload.single("file")(req, res, (err) => {
    if (err) {
      res.status(400).json({ success: false, error: `Upload parse error: ${err.message}` });
      return;
    }
    next();
  });
}, asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: "No photo provided. Please capture your photo." });
    return;
  }

  try {
    // 1. Server-side face presence validation
    let faceCheck;
    try {
      faceCheck = validateHumanFace(req.file.buffer, req.file.mimetype);
    } catch (faceErr: any) {
      res.status(500).json({
        success: false,
        error: `Face detector internal error: ${faceErr?.message}`,
        stack: faceErr?.stack,
      });
      return;
    }

    if (!faceCheck.hasFace) {
      res.status(400).json({
        success: false,
        error: faceCheck.reason || "No detectable human face found. Please take a clear photo of yourself.",
      });
      return;
    }

    // 2. Upload to storage
    let url: string;
    try {
      const uploadResult = await uploadFile(
        "profile-photos",
        req.file.buffer,
        req.file.originalname || "profile.jpg",
        req.file.mimetype || "image/jpeg"
      );
      url = uploadResult.url;
    } catch (storageErr: any) {
      const mime = req.file.mimetype || "image/jpeg";
      url = `data:${mime};base64,${req.file.buffer.toString("base64")}`;
    }

    res.json({
      success: true,
      message: "Photo validated and uploaded successfully",
      data: {
        url,
        faceDetected: true,
        confidence: faceCheck.confidence,
      },
    });
  } catch (outerErr: any) {
    res.status(500).json({
      success: false,
      error: `Unexpected error: ${outerErr?.message}`,
      stack: outerErr?.stack,
    });
  }
}));

/**
 * Authenticated profile photo update (from consumer or worker profile page).
 * Validates face presence and updates User.avatarUrl.
 */
router.post("/profile-photo", authenticate, photoUpload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: "No file provided" });
    return;
  }

  // 1. Server-side face presence validation
  const faceCheck = validateHumanFace(req.file.buffer, req.file.mimetype);
  if (!faceCheck.hasFace) {
    res.status(400).json({
      success: false,
      error: faceCheck.reason || "No detectable human face found. Please take a clear photo of yourself.",
    });
    return;
  }

  // 2. Upload to storage
  const { url, path } = await uploadFile("profile-photos", req.file.buffer, req.file.originalname, req.file.mimetype);
  const fileUpload = await prisma.fileUpload.create({
    data: {
      userId: req.user!.id,
      fileName: path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url,
      bucket: "profile-photos",
      purpose: "PROFILE_PHOTO",
    },
  });

  // 3. Update User avatar
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { avatarUrl: url },
  });

  res.json({
    success: true,
    message: "Profile photo updated successfully",
    data: {
      url,
      fileUpload,
      faceDetected: true,
      confidence: faceCheck.confidence,
    },
  });
}));

const problemAudioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype.toLowerCase();
    const isAudio =
      mime.startsWith("audio/") ||
      mime === "video/webm" || // some browsers record audio/webm as video/webm
      mime === "application/octet-stream";
    cb(null, isAudio);
  },
});

/**
 * Upload voice audio explanation for problem request
 */
router.post(
  "/problem-audio",
  authenticate,
  problemAudioUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No audio file provided or invalid audio format" });
      return;
    }

    const ext = req.file.originalname.includes(".") ? req.file.originalname.split(".").pop() : "webm";
    const filename = `audio-${Date.now()}.${ext}`;

    const { url, path } = await uploadFile("problem-audios", req.file.buffer, filename, req.file.mimetype || "audio/webm");

    const fileUpload = await prisma.fileUpload.create({
      data: {
        userId: req.user!.id,
        fileName: path,
        originalName: req.file.originalname || filename,
        mimeType: req.file.mimetype || "audio/webm",
        size: req.file.size,
        url,
        bucket: "problem-audios",
        purpose: "PROBLEM_AUDIO",
      },
    });

    res.json({
      success: true,
      data: {
        url,
        fileUploadId: fileUpload.id,
        size: req.file.size,
      },
    });
  })
);

const problemMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype.toLowerCase();
    const isImage = mime.startsWith("image/");
    const isVideo = mime.startsWith("video/");
    cb(null, isImage || isVideo);
  },
});

/**
 * Upload photos or video attachments for problem request
 */
router.post(
  "/problem-media",
  authenticate,
  problemMediaUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No media file provided or unsupported file format" });
      return;
    }

    const { url, path } = await uploadFile(
      "problem-attachments",
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const isVideo = req.file.mimetype.toLowerCase().startsWith("video/");
    const fileUpload = await prisma.fileUpload.create({
      data: {
        userId: req.user!.id,
        fileName: path,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url,
        bucket: "problem-attachments",
        purpose: isVideo ? "PROBLEM_VIDEO" : "PROBLEM_PHOTO",
      },
    });

    res.json({
      success: true,
      data: {
        url,
        fileUploadId: fileUpload.id,
        mimeType: req.file.mimetype,
        isVideo,
        size: req.file.size,
      },
    });
  })
);

export default router;
