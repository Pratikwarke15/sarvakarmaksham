import prisma from "../lib/prisma";

async function withDbRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isConnectionError =
        err.code === "P1001" ||
        err.name === "PrismaClientKnownRequestError" && err.code === "P1001" ||
        err.message?.includes("Can't reach database") ||
        err.message?.includes("connection pool");
      if (attempt < retries - 1 && isConnectionError) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export class CatalogService {
  /**
   * Fetch all active service categories with their active subcategories count
   */
  static async getCategories(onlyWithProblems: boolean = false) {
    return withDbRetry(() =>
      prisma.serviceCategory.findMany({
        where: {
          active: true,
          ...(onlyWithProblems
            ? {
                subcategories: {
                  some: {
                    active: true,
                    problems: { some: { active: true } },
                  },
                },
              }
            : {}),
        },
        orderBy: { sortOrder: "asc" },
        include: {
          subcategories: {
            where: { active: true },
            orderBy: { sortOrder: "asc" },
            include: {
              problems: {
                where: { active: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
          _count: {
            select: {
              subcategories: {
                where: { active: true },
              },
              problems: {
                where: { active: true },
              },
            },
          },
        },
      })
    );
  }

  /**
   * Fetch a single category by slug with its subcategories and problems
   */
  static async getCategoryBySlug(slug: string) {
    return withDbRetry(() =>
      prisma.serviceCategory.findUnique({
        where: { slug },
        include: {
          subcategories: {
            where: { active: true },
            orderBy: { sortOrder: "asc" },
            include: {
              problems: {
                where: { active: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      })
    );
  }

  /**
   * Fetch a single category by ID
   */
  static async getCategoryById(id: string) {
    return withDbRetry(() =>
      prisma.serviceCategory.findUnique({
        where: { id },
        include: {
          subcategories: {
            where: { active: true },
            orderBy: { sortOrder: "asc" },
            include: {
              problems: {
                where: { active: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      })
    );
  }

  /**
   * Fetch a specific service problem by ID along with its category and subcategory
   */
  static async getProblemById(id: string) {
    return withDbRetry(() =>
      prisma.serviceProblem.findUnique({
        where: { id },
        include: {
          category: true,
          subcategory: true,
        },
      })
    );
  }
}
