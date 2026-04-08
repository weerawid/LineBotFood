import { AppError, ErrorKey, getErrorMessage } from "../core/error/error.app.js";
import { httpRequestBody } from "../core/common/http.js";
import { getContext } from "../core/context/app_context.js";

export interface Request {
  messageId: string;
}

export interface Response {
  success: boolean;
  data: LineMessageModel[] | [];
}

export interface LineMessageModel {
  line_message_id: string | null;
  line_message_text: string | null;
  line_message_type: string | null;
  line_message_action: boolean;
  line_message_quoted_token: string | null;
  line_message_quoted_id: string | null;
  line_event_id: string | null;
}

export async function getLineMessage(request: Request): Promise<Response> {
  const context = await getContext()
  const config = context.config

  return new Promise(async (resolve, reject) => {
    const context = await getContext();
    const config = context.config
    const apiHost = config['LINE_BOT_API_HOST'] ?? reject(new AppError(ErrorKey.CONFIG_NOT_FOUND_00500, 'LINE_BOT_API_HOST')) 
    const url = `${apiHost}/api/line-message/${request.messageId}`
    try {
      const response = await httpRequestBody<Response>(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      resolve(response)
    } catch (e: unknown){
      reject(getErrorMessage(e, ErrorKey.API_UNKNOW_ERROR_10000, 'getLineMessage'))
    }
  })
}