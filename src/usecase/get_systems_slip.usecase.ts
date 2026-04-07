import { AppError, ErrorKey, getErrorMessage } from "../common/error/error.app.js";
import { httpRequestBody } from "../core/common/http.js";
import { getContext } from "../core/context/app_context.js";

export interface Response {
  success: boolean;
  data: {
    api: string;
    url: string;
    key: string;
  } | null;
}

export default async function getSystemSlip(): Promise<Response> {
 
  

  return new Promise(async (resolve, reject) => {
    const context = await getContext()
    const config = context.config
    const apiHost = config['LINE_BOT_API_HOST'] ?? reject(new AppError(ErrorKey.CONFIG_NOT_FOUND_00500, 'LINE_BOT_API_HOST'))
    
    const url = `${apiHost}/api/system-slip`
    try {
      const response = await httpRequestBody<Response>(url, {
        method: 'GET'
      });

      resolve(response)
    } catch (e: unknown){
      reject(getErrorMessage(e, ErrorKey.API_UNKNOW_ERROR_00400, 'getSystemSlip'))
    }
  })
}