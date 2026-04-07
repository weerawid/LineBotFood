import 'dotenv/config';
import { AppError, ErrorKey, getErrorMessage } from '../common/error/error.app.js';
import { httpRequest } from '../core/common/http.js';

export interface Request {
  event: any;
  destination: string;
}

export default async function createLineEvent(event: Request): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    const apiHost = process.env.LINE_BOT_API_HOST
    const url = `${apiHost}/api/line-event/create`
    try {
      const response = await httpRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(
          {
            event: JSON.stringify(event.event),
            destination: event.destination
          }
        )
      });
      if (!response.ok) {
        resolve(false)
      } else {
        resolve(true)
      }
    } catch (e: unknown){
      reject(getErrorMessage(e, ErrorKey.API_UNKNOW_ERROR_00400, 'createLineEvent'))
    }
  })
}