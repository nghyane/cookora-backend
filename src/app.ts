import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { openAPISpecs } from "hono-openapi";

// Import domain modules
import { authRoutes } from "@/modules/auth/routes";
import { ingredientsRoutes } from "@/modules/ingredients/routes";
import { recipesRoutes } from "@/modules/recipes/routes";
import { usersRoutes } from "@/modules/users/routes";
import { pantryRoutes } from "@/modules/pantry/routes";
import { detectionRoutes } from "@/modules/detection/routes";
import { communityRoutes } from "@/modules/community/routes";
import { mediaRoutes } from "@/modules/media/routes";

// Import shared middleware and error handling
import { AppError } from "@/shared/utils/errors";
import { response } from "@/shared/utils/response";
import { logger as appLogger } from "@/shared/utils/logger";
import { HTTPException } from "hono/http-exception";
import { db, sql } from "@/shared/database/connection";

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    credentials: true,
  }),
);

// Request timeout middleware (30 seconds default)
app.use("*", async (c, next) => {
  const timeoutMs = 30000;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
  });

  try {
    await Promise.race([next(), timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && error.message === "Request timeout") {
      return c.json(response.error("Request timeout", "REQUEST_TIMEOUT"), 408);
    }
    throw error;
  }
});

// Mount domain routes
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/pantry", pantryRoutes);
app.route("/api/v1/ingredients", ingredientsRoutes);
app.route("/api/v1/recipes", recipesRoutes);
app.route("/api/v1/users", usersRoutes);
app.route("/api/v1/detect", detectionRoutes);
app.route("/api/v1/community", communityRoutes);
app.route("/api/v1/media", mediaRoutes);

// Error handling with onError
app.onError((err, c) => {
  // Handle AppError instances
  if (err instanceof AppError) {
    appLogger.error("AppError caught", {
      name: err.name,
      message: err.message,
      status: err.status,
      code: err.code,
      path: c.req.path,
      method: c.req.method,
    });

    const isDevelopment = process.env.NODE_ENV === "development";
    const errorDetails = isDevelopment
      ? {
          stack: err.stack,
          path: c.req.path,
          method: c.req.method,
        }
      : err.details;

    return c.json(
      response.error(err.message, err.code, errorDetails),
      err.status,
    );
  }

  // Handle HTTPException
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  // Handle unknown errors
  appLogger.error("Unknown error caught", {
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  });

  const isDevelopment = process.env.NODE_ENV === "development";
  const errorDetails = isDevelopment
    ? {
        stack: err.stack,
        path: c.req.path,
        method: c.req.method,
      }
    : undefined;

  return c.json(
    response.error(
      err.message || "Something went wrong",
      "INTERNAL_SERVER_ERROR",
      errorDetails,
    ),
    500,
  );
});

// OpenAPI documentation
app.get(
  "/openapi.json",
  openAPISpecs(app, {
    documentation: {
      info: {
        title: "Cookora API",
        version: "1.0.0",
        description: "Vietnamese Culinary API",
      },
      components: {
        securitySchemes: {
          Bearer: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [
        {
          Bearer: [],
        },
      ],
    },
  }),
);

// Scalar API documentation UI
app.get(
  "/docs",
  Scalar({
    theme: "deepSpace",
    url: "/openapi.json",
    persistAuth: true,
  }),
);

// Root endpoint - API info
app.get("/", (c) => {
  return c.json(
    response.success(
      {
        name: "Cookora API",
        version: "1.0.0",
        description:
          "Vietnamese Culinary API with AI-powered ingredient detection",
      },
      "Welcome to Cookora API",
    ),
  );
});

// Health check with database connectivity check
app.get("/health", async (c) => {
  const startTime = Date.now();
  let dbStatus = "unknown";
  let dbLatency = 0;

  try {
    // Test database connectivity with timeout
    const dbStart = Date.now();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Health check timeout")), 5000);
    });

    const queryPromise = db.execute(sql`SELECT 1 as health_check`);
    await Promise.race([queryPromise, timeoutPromise]);

    dbLatency = Date.now() - dbStart;
    dbStatus = "connected";
  } catch (error) {
    dbStatus = "disconnected";
    appLogger.error("Database health check failed:", error);
  }

  const healthData = {
    status: dbStatus === "connected" ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    database: dbStatus,
  };

  const httpStatus = dbStatus === "connected" ? 200 : 503;
  return c.json(
    response.success(healthData, `Service is ${healthData.status}`),
    httpStatus,
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    response.error("Route not found", "NOT_FOUND"),
    404 as ContentfulStatusCode,
  );
});

export default app;
