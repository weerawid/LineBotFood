import express from 'express';
import Fuse from 'fuse.js';
import * as line from '@line/bot-sdk';
import * as sheet from './google/google_sheet.js';
import { google } from 'googleapis';

const app = express();

const config = {
  channelAccessToken: '/tHXRfAWnQfPjIesfdStK7LkJIlKonXzW7l3n9cA+vpyGtSD185by64L+BmnjE3Zqvns7xXua2B+trdcqchW+vnM8dVKrGoaMIjjTB59wuu5ddNLhtTbKBsILRSKG38/ErqWroYaNVwAcCV6vJQTNQdB04t89/1O/w1cDnyilFU=',
  channelSecret: '331e81c30fc0127ab0298be36d5fae4e',
};

const client = new line.Client(config);

const TTL = 60 * 60 * 1000; 
const receiveMessageStore = new Map();

/* ===== WEBHOOK ===== */
app.use('/webhook', line.middleware(config));

app.post('/webhook', (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.end())
    .catch(err => {
      console.error(err);
      res.status(500).end();
    });
  forwardWebHook(req.body);
});

app.use(express.json());

app.post('/test-webhook', async (req, res) => {
  res.sendStatus(200);

  const events = req.body?.events || [];
  Promise.all(events.map(handleEvent))
    .catch(console.error);

  forwardWebHook(req.body);
});

async function forwardWebHook(body) {
  await fetch(process.env.WEB_HOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;
  const command = event.message.text

  if (command.includes('//cf') ) {
    const quitedId = event.message.quotedMessageId
    var quotedMessage = getValidMessage(quitedId)
    if (quotedMessage) {
      receiveMessageStore.delete(quitedId)
      return summaryOrder(event, quotedMessage)
    }
  } else {
    receiveMessageStore.set(event.message.id, event.message.text)
  }
  
  return;
}

function getValidMessage(messageId) {
  const data = receiveMessageStore.get(messageId);
  if (!data) return null;

  if (Date.now() - data.createdAt > TTL) {
    receiveMessageStore.delete(messageId);
    return null;
  }

  return data;
}

async function summaryOrder(event, message) {
  const menuList = await sheet.getMenuList()
  const menuFilter = menuList.map((item, idx)=>{
    return {
      name: item.order_list,
      price: item.price,
      keywords: (item.key_words ?? '').split(',').filter(Boolean).sort((a, b) => b.length - a.length)
    }
  }).sort((a, b) => b.name.length - a.name.length)


  const lines = message.split('\n')
  var order_list = {}
  
  lineLoop:
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i]
    
    const find_menu = findMenuSafe(text, menuFilter)
    if (find_menu != null) {
      const menuName = find_menu.name
      const price = find_menu.price
      const match = text.match(/(\d+)(?!\s*[%.\d])/);
      const qty = match ? parseInt(match[1], 10) : 1;
      const order_count = (order_list[menuName]?.qty ?? 0) + qty

      order_list[menuName] = {
        'name': menuName,
        'qty': order_count,
        'price': price,
        'total': (price * order_count)
      }
    }
  }

  var line_messages = []
  var sheet_order = []
  var order_total = 0
  const order_list_key = Object.keys(order_list)
  line_messages.push('สรุปรายการขนมและเครื่องดื่ม')
  for(let i=0; i < order_list_key.length; i++) {
    const order = order_list[order_list_key[i]]
    order_total = order_total + order.total
    sheet_order.push(order)
    line_messages.push(` ${i+1}. ${order.name}[${order.qty}]: ${order.total}`)
  }
  line_messages.push(`ยอดรวมทั้งหมด: ${order_total}`)

  const insert_sheet_data = sheet_order.map((item, idx) => {
    if (idx == sheet_order.length - 1) {
      return [formatDateString(), item.name, item.qty, item.price, item.total, '', order_total]
    } else {
      return [formatDateString(), item.name, item.qty, item.price, item.total, '', '']
    }
  })
  sheet.appendData('ยอดขาย','A:G', insert_sheet_data)

  return reply(event.replyToken, line_messages.join('\n'))
}

function normalizeThai(text) {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/[่้๊๋์]/g, '')
    .replace(/([ก-ฮ])์/g, '$1')
    .replace(/[-–—]/g, '')
    .replace(/\s+/g, '')
    .replace(/(.)\1{2,}/g, '$1$1');
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function extractCandidates(input, minLen = 3) {
  const text = normalizeThai(input);
  const tokens = [];

  for (let i = 0; i < text.length; i++) {
    for (let j = i + minLen; j <= text.length; j++) {
      tokens.push(text.slice(i, j));
    }
  }
  return tokens;
}

function findMenuSafe(input, menus) {
  const tokens = extractCandidates(input);

  let best = null;

  for (const menu of menus) {
    for (const kw of menu.keywords) {
      const k = normalizeThai(kw);

      for (const t of tokens) {
        if (Math.abs(t.length - k.length) > 1) continue;

        const dist = levenshtein(t, k);
        const ratio = dist / k.length;

        // 🔒 threshold สำคัญ
        if (ratio <= 0.25) {
          if (!best || ratio < best.ratio) {
            best = { menu, ratio };
          }
        }
      }
    }
  }

  return best ? best.menu : null;
}

function reply(token, text) {
  return client.replyMessage(token, {
    type: 'text',
    text,
  });
}

function formatDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); 
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

app.listen(3000, () => {
  console.log('LINE Bot running on port 3000');
});
