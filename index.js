import express from 'express';
import * as line from '@line/bot-sdk';
import * as sheet from './google/google_sheet.js';

const app = express();

/* ===== LINE CONFIG ===== */
const config = {
  channelAccessToken: 'Np7VCSpBvkoVV7aN93KLt3bX1d2ZjHSVwXw9kxLAxYs/s0pA3foo9FZw1rC/Kk4xqvns7xXua2B+trdcqchW+vnM8dVKrGoaMIjjTB59wutMI8XzxSolncOTZbVGrQbbvEvqkrhBRxeO91TiGjzlGQdB04t89/1O/w1cDnyilFU=',
  channelSecret: '331e81c30fc0127ab0298be36d5fae4e',
};

/* ===== LINE CLIENT ===== */
const client = new line.Client(config);

/* ===== MEMORY STORE (DEMO) ===== */
const sessions = {}; 

const menuList = await sheet.getMenuList()

/* ===== WEBHOOK ===== */
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.end())
    .catch(err => {
      console.error(err);
      res.status(500).end();
    });
});

app.use(express.json());

app.post('/test-webhook', async (req, res) => {
  const events = req.body?.events || [];
  for (const event of events) {
    await handleEvent(event);
  }

  res.sendStatus(200);
});

/* ===== MAIN LOGIC ===== */
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const lines = event.message.text.split('\n')
  var order_list = {}
  
  lineLoop:
  for (let i = 0; i < lines.length; i++) {
    const list = menuList.sort((a, b) => b.key_words.length - a.key_words.length)
    const text = lines[i]
    
    menuLoop:
    for (let j = 0; j < list.length; j++) {
      const menuName = list[j].order_list
      const price = list[j].price
      const key_word_list = list[j].key_words.split(',') ?? []

      keywordLoop:
      for (let k = 0; k < key_word_list.length; k++) {
        if (text.includes(key_word_list[k].trim())) {
          const match = text.match(/(\d+)(?!\s*[%.\d])/);
          const qty = match ? parseInt(match[1], 10) : 1;
          const order_count = (order_list[menuName]?.qty ?? 0) + qty

          order_list[menuName] = {
            'name': menuName,
            'qty': order_count,
            'price': price,
            'total': (price * order_count)
          }
          break menuLoop
        } else {
          continue
        }
      }
    }
  }

  var line_messages = []
  var order_total = 0
  const order_list_key = Object.keys(order_list)
  line_messages.push('สรุปรายการขนมและเครื่องดื่ม')
  for(let i=0; i < order_list_key.length; i++) {
    const order = order_list['order_list_key']
    order_total = order_total + order.total
    line_messages.push(f` - ${order.name}[${order.qty}]: ${order.total}`)
  }
  line_messages.push(f`ยอดรวมทั้งหมด: ${order_total}`)
  reply(event.replyToken, line_messages.join('\n'))
}

/* ===== REPLY ===== */
function reply(token, text) {
  return client.replyMessage(token, {
    type: 'text',
    text,
  });
}

/* ===== START SERVER ===== */
app.listen(3000, () => {
  console.log('LINE Bot running on port 3000');
});
