import app from "./app";
import { env } from "./shared/config/env";
import { logger } from "./shared/utils/logger";

// Error handlers with recovery attempts
let errorCount = 0;
const ERROR_THRESHOLD = 10;
const ERROR_RESET_TIME = 60000; // Reset counter every minute

setInterval(() => {
  errorCount = 0;
}, ERROR_RESET_TIME);

process.on("unhandledRejection", (reason, promise) => {
  errorCount++;
  logger.error("Unhandled Rejection:", {
    reason,
    errorCount,
    promise: promise.constructor.name,
  });

  // Only exit if too many errors in short time
  if (errorCount > ERROR_THRESHOLD) {
    logger.error(`Too many errors (${errorCount}), shutting down for safety`);
    process.exit(1);
  }
});

process.on("uncaughtException", (error) => {
  errorCount++;
  logger.error("Uncaught Exception:", {
    error: error.message,
    stack: error.stack,
    errorCount,
  });

  // Critical errors that should always exit
  const criticalErrors = ["EADDRINUSE", "EACCES", "ENOMEM"];
  if (error.message && criticalErrors.some((e) => error.message.includes(e))) {
    logger.error("Critical error, must shutdown", { message: error.message });
    process.exit(1);
  }

  // Exit if too many errors
  if (errorCount > ERROR_THRESHOLD) {
    logger.error(`Too many errors (${errorCount}), shutting down for safety`);
    process.exit(1);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

// Log startup
logger.info(`Server starting on port ${env.PORT}`);

// Export server config for Bun
export default {
  fetch: app.fetch,
  port: env.PORT,
  hostname: "0.0.0.0",
  development: env.NODE_ENV === "development",
};
