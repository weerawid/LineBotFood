import 'dotenv/config';
import { AppError, ErrorKey, getErrorMessage } from '../core/error/error.app.js';
import { httpRequest } from '../core/common/http.js';
import { getContext } from '../core/context/app_context.js';

export interface Request {
  event: any;
  destination: string;
}

export default async function createLineEvent(event: Request): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    const context = await getContext();
    const config = context.config
    const apiHost = config['LINE_BOT_API_HOST'] ?? reject(new AppError(ErrorKey.CONFIG_NOT_FOUND_00500, 'LINE_BOT_API_HOST'))
    const url = `${apiHost}/api/line-event/create`
    try {
      console.log('createLineEvent Start')
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
      console.log('createLineEvent End with response', response)
      if (!response.ok) {
        resolve(false)
      } else {
        resolve(true)
      }
    } catch (e: unknown){
      console.error(e)
      reject(getErrorMessage(e, ErrorKey.API_UNKNOW_ERROR_10000, 'createLineEvent'))
    }
  })
}