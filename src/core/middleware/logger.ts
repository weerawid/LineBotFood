import type { Request, Response, NextFunction } from 'express';
import { getContext } from '../context/app_context.js';

export const logger = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const context = await getContext();
  const config = context.config
  try {
    if (config['IS_KEEP_LOG_REQ_RES']?.toUpperCase() === 'TRUE') {
      const start = Date.now();
      let responseBody: any;

      const oldSend = res.send.bind(res);

      res.send = ((body?: any) => {
        responseBody = body;
        return oldSend(body);
      }) as Response['send'];

      res.on('finish', () => {
        const log = {
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          requestBody: req.body,
          responseBody: tryParseJSON(responseBody),
          responseTime: `${Date.now() - start}ms`,
        };

        console.log(JSON.stringify(log));
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

function tryParseJSON(data: any) {
  try {
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch {
    return data;
  }
}