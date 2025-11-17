/**
 * Logger utility using Winston
 */

import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

// Enhanced format for lambda debugging
const lambdaFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` | ${JSON.stringify(metadata, null, 2)}`;
  }
  
  return msg;
});

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        lambdaFormat
      ),
    }),
  ],
});

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

