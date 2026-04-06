import type { Request, Response } from "express"
import { AppError, ErrorKey, getErrorMessage } from "../common/error/error.app.js";
import createLineMessage from "../usecase/create_line_message.usecase.js";
import createLineUser from "../usecase/create_line_user.usecase.js";
import createLineEvent from "../usecase/create_line_event.usecase.js";
import updateLineMessage from "../usecase/update-line-message.usecase.js";
import getLineImage from "../usecase/get_line_image.usecase.js";
import checkImageSlipOk from "../usecase/check_image_slip_ok.usecase.js";
import { readQRCodeFromBase64 } from "../common/utils/image.js";
import getSystemSlip from "../usecase/get_systems_slip.usecase.js";
import checkImageSlip2Go from "../usecase/check_image_slip2go.usecase.js";
import { getContext } from "../core/context/app_context.js";
import { isBool } from "../core/utils/string.js";
import forwardWebhhok from "../usecase/foward_response_webhook.usecase.js";
import LineManager from "../core/line/line_manager.js";
import { OrderService, SummaryOrder } from "../core/order/order_service.js";
import { OpenAIManager } from "../core/openai/open_ai_manager.js";
import { createLineOrder, OrderItem } from "../usecase/create_line_order.usecase.js";
import { getLineOrder } from "../usecase/get_line_order.usecase.js";

export interface EventModel {
  event: any;
  type: string;
  destination: string;
}

export async function webhook(
  req: Request,
  res: Response
): Promise<void> {

  Promise.allSettled(req.body.events.map((event: any) => handleEvent(event, req.body.destination)))
    .then(async (results: PromiseSettledResult<EventModel>[]) => {
      await forwardWebhook(req)
      return results
    })
    .then(async (results: PromiseSettledResult<EventModel>[]) => {
      for (const result of results) {
        if (result.status === "fulfilled") {
          switch (result.value.type) {
            case "message": 
              await updateMessageEvent(result.value.event, result.value.destination)
              break
            case "unsend":
              await unsendMessageEvent(result.value.event, result.value.destination)
              break
            default:
              break
          }
        }
      }
      return results
    })
    .then(async (results: PromiseSettledResult<EventModel>[]) => {
      for (const result of results) {
        if (result.status === "fulfilled") {
          await createOrder(result.value.event)
        }
      }
      return results
    })
    .then(() => {
      res.status(200).json({stats: 'ok'})
    }).catch((e: unknown) => {
      res.status(500).json(getErrorMessage(e))
    })  
}

async function forwardWebhook(request: Request): Promise<void> {
  const context = await getContext()
  const config = context.config
  return new Promise<void>((resolve, reject) => {
    if (isBool(config["IS_FORWARD_WEBHOOK"])) {
      forwardWebhhok({
        url: config["FORWARD_WEBHOOK_URL"] ?? "",
        event: request.body
      }).then(() => {
        resolve()
      }).catch((e: unknown) => {
        reject(getErrorMessage(e, ErrorKey.UNKNOW_ERROR_00000, 'forwardWebhook'))
      })
    } else {
      resolve()
    }
  })
}

async function handleEvent(event: any, destination: string): Promise<EventModel | null> {
  const context = await getContext()
  const config = context.config
  const image = context.image

  const lineManager = new LineManager(process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "")

  const eventType = event.type

  if (isBool(config["IS_OLD_CONDITION"]) && (event.type === 'message' || event.message.type === 'text')) {
    const command = event.message.text

    if (command.toLowerCase() == '@qr') {
      if (image) {
        const imageConfig = image["QR_PAY"]
        await lineManager.replyImage(event.replyToken, imageConfig.original || "", imageConfig.thumbnail)
      }
    } else if (command.toLowerCase() == '@menu') {
      if (image) {
        const imageConfig = image["MENU_LIST"]
        await lineManager.replyImage(event.replyToken, imageConfig.original || "", imageConfig.thumbnail)
      }
    } else if (command.includes('//cf')) {
      await getLineOrder({
        message_id: event.message.quotedMessageId
      }).then((response) => {       
         console.log('getLineOrder', response)
      }).catch((e: unknown) => {
        console.error('getLineOrder error', getErrorMessage(e))
      })
    }
  }
  
  if (eventType === "message" && event.message.type === "image" && isBool(config["IS_VALIDATE_IMAGE"])) {
    getLineImage({
      messageId: event.message.id
    }).then((lineImage) => {  
      return readQRCodeFromBase64(lineImage);
    }).then(async (qrValue) => {
      const api = await getSystemSlip()
      return { api, qrValue }
    }).then(( { api, qrValue } ) => {
      console.log('api', api.data)
      switch (api.data?.api) {
        case 'slipOk':
          return checkImageSlipOk({
            apiPath: api.data.url,
            apiKey: api.data.key,
            qrCodeData: qrValue,
            log: false
          })
        case 'slip2go':
          return checkImageSlip2Go({
            apiPath: api.data.url,
            apiKey: api.data.key,
            qrCodeData: qrValue,
            log: false
          })
        default:
          throw getErrorMessage(new AppError(ErrorKey.UNKNOW_ERROR_00000, 'No API for check slip image'))
      }
    }).then((rs) => {
      console.log('qrCodeResult', JSON.stringify(rs))
    }).catch((e: unknown) => {
      console.error('getLineImage error', getErrorMessage(e))
    })
  }

  return Promise.resolve({
    event: event, 
    type: eventType,
    destination: destination
  })
}

async function unsendMessageEvent(event: any, destination: string): Promise<any> {
  return createLineEvent({
    event: event,
    destination: destination
  }).then((result) => {    
    return createLineUser({
      id: event.source.userId,
      address: null,
      description: null
    })
  }).then((result) => {
    return updateLineMessage({
      id: event.unsend.messageId, 
      text: undefined, 
      type: undefined, 
      action: false, 
      eventId: undefined, 
      quotedToken: undefined, 
      quotedId: undefined
    })
  })
}

async function updateMessageEvent(event: any, destination: string): Promise<any> {
  return createLineEvent({
    event: event,
    destination: destination
  })
    .then(() => {
      return createLineUser({
        id: event.source.userId,
        address: null,
        description: null
      })
    })
    .then(() => {
      return createLineMessage({
        id: event.message.id, 
        text: event.message.text, 
        type: event.message.type, 
        action: true, 
        eventId: event.webhookEventId, 
        quotedToken: event.message.quotedToken || null, 
        quotedId: event.message.quotedId || null
      })
    })
}

async function createOrder(event: any) {
  const context = await getContext()
  const config = context.config
  const eventType = event.type
  const message = event.message.text

  return new Promise<SummaryOrder>(async (resolve, reject) => {
    if (eventType == 'message') {
      const openai = new OpenAIManager(config["OPENAI_API_KEY"] ?? "")
      const orderService = new OrderService(openai)
      const menu = await orderService.process(message)
      resolve(menu)
    } else {
      reject()
    }
  })
  .then(async (menu: SummaryOrder) => {
    if (menu.items.length > 0) {
      await createLineOrder({
        item: menu.items.map((i) => ({
          menu: i.name ?? "",
          qty: i.qty,
          price: i.price
        }) as OrderItem
      ),
      userId: event.source.userId,
      messageId: event.message.id
    })
    } 
  })
  .catch((e: unknown) => {
    // throw getErrorMessage(e, ErrorKey.UNKNOW_ERROR_00000, 'createOrder')
  })
}