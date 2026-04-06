import { AppError, ErrorKey, getErrorMessage } from "../common/error/error.app.js";
import { removeUndefined, toBodyInit } from "../common/utils/object.js";
import { httpRequestBody } from "../core/common/http.js";

export interface Request {
  apiPath: string;
  apiKey: string;
  qrCodeData?: string | null;
  imageBase64?: string | null;
  imageUrl?: string | null;
  log: boolean
}

export interface Response {
  success: boolean;
  data: SlipOkData;
}

export interface SlipOkData {
  success: boolean;
  message: string;
  language: string;
  transRef: string;
  sendingBank: string;
  receivingBank: string;
  transDate: string;
  transTime: string;
  transTimestamp: string;
  sender: Person;
  receiver: Person;
  amount: number;
  paidLocalAmount: number;
  paidLocalCurrency: string;
  countryCode: string;
  transFeeAmount: number;
  ref1: string;
  ref2: string;
  ref3: string;
  toMerchantId: string;
  qrcodeData: string;
}

export interface Person {
  displayName: string;
  name: string;
  proxy: Proxy;
  account: Account;
}

export interface Proxy {
  type?: string;
  value?: string;
}

export interface Account {
  type?: string;
  value?: string;
}

export default async function checkImageSlip2Go(slip: Request): Promise<Response> {
  const payload = {
    data: slip.qrCodeData ?? undefined,
    files: slip.imageBase64 ?? undefined,
    url: slip.imageUrl ?? undefined,
    log: slip.log ?? undefined
  }
  const clearPayload = removeUndefined(payload)

  return new Promise(async (resolve, reject) => {
    const url = `${slip.apiPath}`
    try {
      const response = await httpRequestBody<Response>(url, {
        method: 'POST',
        headers: {
          'content-type': "application/json",
          'x-authorization': `${slip.apiKey}`
        },
        body: toBodyInit(clearPayload)
      });
      resolve(response)
    } catch (e: unknown){
      reject(getErrorMessage(e, ErrorKey.API_UNKNOW_ERROR_00400, 'checkImageSlip2Go'))
    }
  })
}