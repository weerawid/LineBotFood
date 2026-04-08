import { AppError, ErrorKey, getErrorMessage } from "../core/error/error.app.js";
import { httpRequest } from "../core/common/http.js";
import { getContext } from "../core/context/app_context.js";

export interface Request {
  messageId: string;
}

export default async function getLineImage(message: Request): Promise<string> {
  const context = await getContext()
  const config = context.config

  return new Promise(async (resolve, reject) => {
    const url = `${config['LINE_BOT_MESSAGE_API']}/${message.messageId}/content`
    try {
      const response = await httpRequest(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config['LINE_BOT_MESSAGE_TOKEN']}`
        }
      });
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      resolve(base64)
    } catch (e: unknown){
      reject(getErrorMessage(e, ErrorKey.API_UNKNOW_ERROR_10000, 'getLineImage'))
    }
  })
}