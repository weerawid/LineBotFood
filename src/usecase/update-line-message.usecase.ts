import 'dotenv/config';
import { AppError, ErrorKey, getErrorMessage } from '../common/error/error.app.js';
import { httpRequest } from '../core/common/http.js';
import { getContext } from '../core/context/app_context.js';

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
    const context = await getContext()
    const config = context.config
    const apiHost = config['LINE_BOT_API_HOST'] ?? reject(new AppError(ErrorKey.CONFIG_NOT_FOUND_00500, 'LINE_BOT_API_HOST'))
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
        resolve(false)
      } else {
        resolve(true)
      }
    } catch (e: unknown){
      reject(getErrorMessage(e, ErrorKey.API_UNKNOW_ERROR_00400, 'updateLineMessage'))
    }
  })
}