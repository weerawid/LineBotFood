import 'dotenv/config';
import { logErrorMessage } from "../common/error/error.helper.js";
import { AppError, ErrorKey, getErrorMessage } from '../common/error/error.app.js';
import { httpRequest } from '../core/common/http.js';

export interface Request {
  id: string;
  text?: string | undefined;
  type?: string | undefined;
  action?: boolean | undefined;
  eventId?: string | undefined;
  quotedToken?: string | undefined;
  quotedId?: string | undefined;
}

export default async function updateLineMessage(message: Request): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    const apiHost = process.env.LINE_BOT_API_HOST
    const url = `${apiHost}/api/line-message/update/${message.id}`
    const payload = {
      id: message.id ?? undefined,
      text: message.text ?? undefined,
      type: message.type ?? undefined,
      action: message.action ?? undefined,
      quotedToken: message.quotedToken ?? undefined,
      quotedId: message.quotedId ?? undefined,
      eventId: message.eventId ?? undefined
    }
    try {
      const response = await httpRequest(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined)))
      });
      if (!response.ok) {
        logErrorMessage({
          error: response.status,
          desc: response.statusText,
        })
        resolve(false)
      } else {
        resolve(true)
      }
    } catch (e: unknown){
      reject(getErrorMessage(e, ErrorKey.API_UNKNOW_ERROR_00400, 'updateLineMessage'))
    }
  })
}