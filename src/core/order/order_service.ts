import { OrderParserUtil } from './order_parser_util.js';
import { getMenuList } from '../google/google_sheet.js';
import { OpenAIManager } from '../openai/open_ai_manager.js';
import { getContext } from '../context/app_context.js';

export interface MenuItem {
  order_list: string;
  price: number;
  key_words: string[];
  type: string;
  profit: number;
  earning: number;
}

export interface OrderItem {
  name: string | null;
  qty: number;
  price: number;
}

export interface AddressItem {
  address: string | null;
  rawAddress: string | null;
}

export interface SummaryOrder {
  items: OrderItem[];
  address: AddressItem | null;
}

export class OrderService {
  constructor(private ai: OpenAIManager) {}

  async process(rawText: string): Promise<SummaryOrder> {
    const context = await getContext()
    const menuList = await getMenuList()
    const menuJSON = JSON.stringify(menuList, null, 2)

    const extractAddress = OrderParserUtil.extractAddress(rawText)

    var text = rawText.replace(extractAddress?.rawAddress ?? "", "")
    var textList  = OrderParserUtil.splitLines(text)
    var patterns = []

    const orderList = []
    const orderUnknow = []
    for (const line of textList) {
      const tokenize = OrderParserUtil.tokenize(line)
      const order = OrderParserUtil.parseMenu(tokenize, menuList, orderList)
      orderList.push(...order.order)
      orderUnknow.push(...order.orderUnknow)
    }
    
    const item = {
      orderItem: orderList,
      unknowItem: orderUnknow
    }
    const result = await this.ai.summarize(item, menuJSON)
    const resultJson = JSON.parse(result)

    const summaryOrder: OrderItem[] = []
    for (const item of resultJson.validated_items) {
      if (item.confidence_score_percent > 70) {
        const findMenu = menuList.find((m) => m['order_list'] == item.corrected_menu_name)
        if (findMenu) {
          const menuPrice = findMenu['price']
          summaryOrder.push({
            name: findMenu['order_list'],
            qty: item.quantity ?? 0,
            price: Number(menuPrice),
          })
        }
      }
    }

    return {
      address: extractAddress,
      items: summaryOrder
    }
  }
}
