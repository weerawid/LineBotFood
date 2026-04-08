import 'dotenv/config';
import { AppError, ErrorKey, getErrorMessage } from '../core/error/error.app.js';
import { httpRequestBody } from '../core/common/http.js';
import { getContext } from '../core/context/app_context.js';

export interface Request {
  id: string;
  text: string;
  type: string;
  action: boolean;
  eventId: string;
  quotedToken?: string | null;
  quotedId?: string | null;
}

export interface Response {
  success: boolean;
  error?: {
    code: string;
    message: string;
  } | null;
}

export default async function createLineMessage(message: Request): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    const context = await getContext();
    const config = context.config
    const apiHost = config['LINE_BOT_API_HOST'] ?? reject(new AppError(ErrorKey.CONFIG_NOT_FOUND_00500, 'LINE_BOT_API_HOST'))
    const url = `${apiHost}/api/line-message/create`
    try {
      const response = await httpRequestBody<Response>(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(
          {
            id: message.id,
            text: message.text,
            type: message.type,
            action: message.action,
            quotedToken: message.quotedToken,
            quotedId: message.quotedId,
            eventId: message.eventId
          }
        )
      });
      if (!response.success) {
        resolve(false)
      } else {
        resolve(true)
      }
    } catch (e: unknown){
      reject(getErrorMessage(e, ErrorKey.API_UNKNOW_ERROR_10000, 'createLineMessage'))
    }
  })
}