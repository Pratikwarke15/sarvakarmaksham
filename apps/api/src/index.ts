import "./config/env";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import http from "http";
import path from "path";
import { swaggerSpec } from "./config/swagger";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { setupWebSocket } from "./lib/websocket";
import { getRedis } from "./lib/redis";
import routes from "./routes";
import { errorHandler, AppError } from "./middleware/errorHandler";

const app = express();
const server = http.createServer(app);

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: (requestOrigin, callback) => {
    if (!requestOrigin) return callback(null, true);
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin);
    if (env.CORS_ORIGIN === "*" || isLocalhost || requestOrigin === env.CORS_ORIGIN) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "public", "uploads")));
app.use(morgan("combined", {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "SIH26089 Shramik Co API Docs",
}));

app.get("/api/docs.json", (_req, res) => {
  res.json(swaggerSpec);
});

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "सर्वकर्मक्षमः (Sarvakarmakshamah) API Server",
    status: "healthy",
    version: "1.2.0-verified-face",
    endpoints: {
      health: "/api/v1/health",
      docs: "/api/docs",
      api: "/api/v1",
    },
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/v1/health", (_req, res) => {
  res.json({
    success: true,
    message: "SIH26089 Shramik Co API is running",
    version: "1.2.0-verified-face",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1", routes);

app.use((_req, res, _next) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

app.use(errorHandler);

setupWebSocket(server);

const redis = getRedis();
if (redis) {
  redis.on("connect", () => {
    logger.info("Redis connected successfully");
  });
  redis.on("error", (err: Error) => {
    logger.error("Redis connection error:", err.message);
  });
}

server.listen(env.API_PORT, () => {
  logger.info(`🚀 SIH26089 Shramik Co API server running on port ${env.API_PORT}`);
  logger.info(`📚 API docs available at http://localhost:${env.API_PORT}/api/docs`);
  logger.info(`🔌 WebSocket available at ws://localhost:${env.API_PORT}/ws`);
});

function gracefulShutdown(signal: string) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection:", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
  gracefulShutdown("uncaughtException");
});

export default app;
