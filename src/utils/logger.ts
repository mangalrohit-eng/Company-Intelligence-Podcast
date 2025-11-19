/**
 * Logger utility using Winston
 */

import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

// Track current run ID for log streaming
let currentRunId: string | null = null;
let s3Transport: any = null;

// Enhanced format for lambda debugging
const lambdaFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` | ${JSON.stringify(metadata, null, 2)}`;
  }
  
  return msg;
});

// Create base logger
const loggerTransports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      lambdaFormat
    ),
  }),
];

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: loggerTransports,
});

/**
 * Enable S3 log streaming for a specific run
 */
export function enableS3LogStreaming(runId: string) {
  try {
    if (currentRunId === runId && s3Transport) {
      return; // Already enabled for this run
    }

    // Remove old transport if exists
    if (s3Transport) {
      try {
        logger.remove(s3Transport);
      } catch (removeError) {
        // Ignore remove errors
      }
      s3Transport = null;
    }

    // Add S3 transport for this run
    const { createS3LogTransport } = require('./log-streamer');
    s3Transport = createS3LogTransport(runId);
    logger.add(s3Transport);
    currentRunId = runId;
  } catch (error: any) {
    // Log error but don't throw - logging is non-critical
    console.error(`Failed to enable S3 log streaming:`, error.message);
    // Reset state on error
    s3Transport = null;
    currentRunId = null;
    throw error; // Re-throw so caller knows it failed, but pipeline can continue
  }
}

/**
 * Disable S3 log streaming
 */
export function disableS3LogStreaming() {
  if (s3Transport) {
    logger.remove(s3Transport);
    s3Transport = null;
    currentRunId = null;
  }
}

// Lambda-specific logging helper
export const lambdaLogger = {
  logRequest: (functionName: string, event: any) => {
    logger.info(`[${functionName}] Request received`, {
      functionName,
      path: event.path,
      httpMethod: event.httpMethod,
      pathParameters: event.pathParameters,
      queryStringParameters: event.queryStringParameters,
      hasBody: !!event.body,
      headers: {
        authorization: event.headers?.Authorization ? '[PRESENT]' : '[MISSING]',
        contentType: event.headers?.['Content-Type'] || event.headers?.['content-type'],
      },
    });
  },

  logAuth: (functionName: string, authContext: any) => {
    logger.info(`[${functionName}] Auth context`, {
      functionName,
      hasAuthorizer: !!authContext,
      userId: authContext?.claims?.sub ? '[PRESENT]' : '[MISSING]',
      orgId: authContext?.claims?.['custom:org_id'] ? '[PRESENT]' : '[MISSING]',
      authKeys: authContext ? Object.keys(authContext) : [],
    });
  },

  logResponse: (functionName: string, statusCode: number, data?: any) => {
    logger.info(`[${functionName}] Response sent`, {
      functionName,
      statusCode,
      dataSize: data ? JSON.stringify(data).length : 0,
    });
  },

  logError: (functionName: string, error: any, context?: any) => {
    logger.error(`[${functionName}] Error occurred`, {
      functionName,
      errorName: error?.name,
      errorMessage: error?.message,
      errorStack: error?.stack,
      context,
    });
  },

  logMetrics: (functionName: string, metrics: Record<string, any>) => {
    logger.info(`[${functionName}] Metrics`, {
      functionName,
      ...metrics,
    });
  },
};

export default logger;

