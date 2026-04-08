import { AppError, ErrorKey, getErrorMessage } from "../core/error/error.app.js";
import { httpRequestBody } from "../core/common/http.js";
import { getContext } from "../core/context/app_context.js";

export interface Request {
  user_id?: string | null;
  message_id?: string | null;
  order_uuid?: string | null;
}

export interface Response {
  success: boolean;
  data: OrderModel[] | [];
}

export interface OrderModel {
  order_uuid: string | null;
  order_total: number | null;
  order_created_at: Date | null;
  message_id: string | null;
  user_id: string | null;
  order_item: OrderItemModel[] | null;
}

export interface OrderItemModel {
  order_item_uuid: string | null;
  order_item_qty: string | null;
  order_item_price: number | null;
  order_item_total: number | null;
  order_item_created_at: Date | null;
  menu_name: string | null;
  menu_price: string | null;
}

export async function getLineOrder(request: Request): Promise<Response> {
  const context = await getContext()
  const config = context.config

  return new Promise(async (resolve, reject) => {
    const context = await getContext();
    const config = context.config
    const apiHost = config['LINE_BOT_API_HOST'] ?? reject(new AppError(ErrorKey.CONFIG_NOT_FOUND_00500, 'LINE_BOT_API_HOST'))
    const url = `${apiHost}/api/line-order/inquiry`
    try {
      const response = await httpRequestBody<Response>(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
      resolve(response)
    } catch (e: unknown){
      reject(getErrorMessage(e, ErrorKey.API_UNKNOW_ERROR_10000, 'getLineOrder'))
    }
  })
}