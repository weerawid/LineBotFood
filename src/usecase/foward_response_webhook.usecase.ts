import { AppError, ErrorKey, getErrorMessage } from "../core/error/error.app.js";
import { httpRequest } from "../core/common/http.js";

export interface Request {
  url: string;
  event: any;
}

export default async function forwardWebhook(request: Request): Promise<Response> {
  return new Promise(async (resolve, reject) => {
    const url = `${request.url}`
    try {
      const response = await httpRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: request.event
      });
      resolve(response)
    } catch (e: unknown){
      reject(getErrorMessage(e, ErrorKey.API_UNKNOW_ERROR_10000, 'forwardWebhook'))
    }
  })
}