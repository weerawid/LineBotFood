import 'dotenv/config';
import { AppError, ErrorKey, getErrorMessage } from '../common/error/error.app.js';
import { httpRequest } from '../core/common/http.js';
import { getContext } from '../core/context/app_context.js';

export interface Request {
  id: string;
  address?: string | null;
  description?: string | null;
}

export default async function createLineUser(user:  Request): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    const context = await getContext();
    const config = context.config
    const apiHost = config['LINE_BOT_API_HOST'] ?? reject(new AppError(ErrorKey.CONFIG_NOT_FOUND_00500, 'LINE_BOT_API_HOST'))
    const url = `${apiHost}/api/line-user/create`
    try {
      const response = await httpRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(
          {
            id: user.id,
            address: user.address,
            description: user.description
          }
        )
      });
      if (!response.ok) {
        resolve(false)
      } else {
        resolve(true)
      }
    } catch (e: unknown){
      reject(getErrorMessage(e, ErrorKey.API_UNKNOW_ERROR_00400, 'createLineUser'))
    }
  })
}