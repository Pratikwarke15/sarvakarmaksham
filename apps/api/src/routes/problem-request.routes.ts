import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { ProblemRequestService } from "../services/problem-request.service";

const router = Router();

// POST /api/v1/problem-requests/draft
router.post(
  "/draft",
  authenticate,
  authorize("CONSUMER"),
  asyncHandler(async (req, res) => {
    const consumerId = req.user!.id;
    const {
      categoryId,
      subcategoryId,
      problemId,
      textDescription,
      audioUrl,
      audioDuration,
      photos,
      videoUrl,
      additionalNotes,
      address,
      latitude,
      longitude,
    } = req.body;

    const draft = await ProblemRequestService.createDraft(consumerId, {
      categoryId,
      subcategoryId,
      problemId,
      textDescription,
      audioUrl,
      audioDuration,
      photos,
      videoUrl,
      additionalNotes,
      address,
      latitude,
      longitude,
    });

    res.status(201).json({
      success: true,
      message: "Problem request draft saved successfully",
      data: draft,
    });
  })
);

// GET /api/v1/problem-requests/my-drafts
router.get(
  "/my-drafts",
  authenticate,
  authorize("CONSUMER"),
  asyncHandler(async (req, res) => {
    const consumerId = req.user!.id;
    const drafts = await ProblemRequestService.getConsumerDrafts(consumerId);

    res.json({
      success: true,
      data: drafts,
    });
  })
);

// GET /api/v1/problem-requests/:id
router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const draft = await ProblemRequestService.getByIdOrRef(id, req.user!.id);

    res.json({
      success: true,
      data: draft,
    });
  })
);

// DELETE /api/v1/problem-requests/drafts/:id
router.delete(

  "/drafts/:id",
  authenticate,
  authorize("CONSUMER"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const consumerId = req.user!.id;
    await ProblemRequestService.deleteDraft(id, consumerId);

    res.json({
      success: true,
      message: "Draft deleted successfully",
    });
  })
);

export default router;

