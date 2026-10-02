import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { CatalogService } from "../services/catalog.service";
import { AppError } from "../middleware/errorHandler";

const router = Router();

// GET /api/v1/services/categories
router.get("/categories", asyncHandler(async (req, res) => {
  const onlyAvailable = req.query.available === "true" || req.query.hasProblems === "true";
  const categories = await CatalogService.getCategories(onlyAvailable);
  res.json({
    success: true,
    data: categories,
  });
}));

// GET /api/v1/services/categories/:slug
router.get("/categories/:slug", asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const category = await CatalogService.getCategoryBySlug(slug);

  if (!category) {
    throw new AppError(`Category with slug '${slug}' not found`, 404);
  }

  res.json({
    success: true,
    data: category,
  });
}));

// GET /api/v1/services/problems/:id
router.get("/problems/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const problem = await CatalogService.getProblemById(id);

  if (!problem) {
    throw new AppError(`Problem with ID '${id}' not found`, 404);
  }

  res.json({
    success: true,
    data: problem,
  });
}));

export default router;
