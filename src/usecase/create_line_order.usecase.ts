import 'dotenv/config';
import { ErrorKey, getErrorMessage } from '../common/error/error.app.js';
import { httpRequestBody } from '../core/common/http.js';

export interface Request {
  item: OrderItem[];
  userId: string;
  messageId: string;
}

export interface OrderItem {
  menu: string;
  qty: number;
  price: number;
}

export interface Response {
  success: boolean;
  error?: {
    code: string;
    message: string;
  } | null;
}

export async function createLineOrder(request: Request): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    const apiHost = process.env.LINE_BOT_API_HOST
    const url = `${apiHost}/api/line-order/create`
    try {
      const response = await httpRequestBody<Response>(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(
          {
            item: request.item.map(i => ({
              menu: i.menu,
              qty: i.qty,
              price: i.price
            })),
            user_id: request.userId,
            message_id: request.messageId
          }
        )
      });
      if (!response.success) {
        resolve(false)
      } else {
        resolve(true)
      }
    } catch (e: unknown){
      reject(getErrorMessage(e, ErrorKey.API_UNKNOW_ERROR_00400, 'createLineOrder'))
    }
  })
}