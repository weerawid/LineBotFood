import 'dotenv/config';
import { logErrorMessage } from "../common/error/error.helper.js";
import { AppError, ErrorKey, getErrorMessage } from '../common/error/error.app.js';
import { httpRequestBody } from '../core/common/http.js';

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
    const apiHost = process.env.LINE_BOT_API_HOST
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
        logErrorMessage({
          error: response.error?.code,
          desc: response.error?.message,
        })
        resolve(false)
      } else {
        resolve(true)
      }
    } catch (e: unknown){
      reject(getErrorMessage(e, ErrorKey.API_UNKNOW_ERROR_00400, 'createLineMessage'))
    }
  })
}