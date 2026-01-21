import express from 'express';
import Fuse from 'fuse.js';
import * as line from '@line/bot-sdk';
import * as sheet from './google/google_sheet.js';

const app = express();

/* ===== LINE CONFIG ===== */
const config = {
  channelAccessToken: '/tHXRfAWnQfPjIesfdStK7LkJIlKonXzW7l3n9cA+vpyGtSD185by64L+BmnjE3Zqvns7xXua2B+trdcqchW+vnM8dVKrGoaMIjjTB59wuu5ddNLhtTbKBsILRSKG38/ErqWroYaNVwAcCV6vJQTNQdB04t89/1O/w1cDnyilFU=',
  channelSecret: '331e81c30fc0127ab0298be36d5fae4e',
};

/* ===== LINE CLIENT ===== */
const client = new line.Client(config);

/* ===== MEMORY STORE (DEMO) ===== */
const sessions = {}; 

const menuList = await sheet.getMenuList()
const menuFilter = menuList.map((item, idx)=>{
  return {
    name: item.order_list,
    price: item.price,
    keywords: item.key_words.split(',')
  }
})
const menuFuse = new Fuse(menuFilter, {
  keys: ['keywords'],
  threshold: 0.1,
  ignoreLocation: true
})

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

/* ===== MAIN LOGIC ===== */
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;
  const lines = event.message.text.split('\n')
  var order_list = {}
  
  lineLoop:
  for (let i = 0; i < lines.length; i++) {
    const list = menuList.sort((a, b) => b.key_words.length - a.key_words.length)
    const text = lines[i]
    
    const find_menu = findMenuSafe(text, menuFilter)
    console.log(text)
    console.log(find_menu)
    // console.log(menuFilter)
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
  var order_total = 0
  const order_list_key = Object.keys(order_list)
  line_messages.push('สรุปรายการขนมและเครื่องดื่ม')
  for(let i=0; i < order_list_key.length; i++) {
    const order = order_list[order_list_key[i]]
    order_total = order_total + order.total
    line_messages.push(` - ${order.name}[${order.qty}]: ${order.total}`)
  }
  line_messages.push(`ยอดรวมทั้งหมด: ${order_total}`)
  // console.log(line_messages.join('\n'))
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
