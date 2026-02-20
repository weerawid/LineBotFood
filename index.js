import express from 'express';
import OpenAI from "openai";
import fs from "fs";
import path from "path";

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

var openAIKey = await getConfig("OPENAI_API_KEY")
const openai = new OpenAI({
  apiKey: openAIKey,
});

const openaiConfig = {
  model: "gpt-4.1-mini",
  reasoning: { effort: "low" },
  instructions: "Are semicolons optional in JavaScript?"
}

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
});

app.post('/test-message', async (req, res) => {
  res.sendStatus(200);

  const events = req.body?.events || [];
  Promise.all(events.map(testMessage))
    .catch(console.error);
});


async function testMessage(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;
  const text = event.message.text
  var message = await summaryOrder(text) 
  console.log(message.join('\n'))
}

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

  if (command.toLowerCase() == '@qr') {
    return await replyImageWithKey(event.replyToken, "QR_PAY")
  } else if (command.toLowerCase() == '@menu') {
    return await replyImageWithKey(event.replyToken, "MENU_LIST")
  } else if (command.includes('//cf')) {
    const quitedId = event.message.quotedMessageId
    var quotedMessage = getValidMessage(quitedId)
    if (quotedMessage) {
      receiveMessageStore.delete(quitedId)
      var message = await summaryOrder(quotedMessage, true) 
      return reply(event.replyToken, message.join('\n'))
    }
  } else {
    receiveMessageStore.set(event.message.id, event.message.text)
  }
  
  return;
}

async function getConfig(key) {
  const config = await sheet.getConfig()
  return config.find(item => {
    return item.key == key
  }).value
}

async function replyImageWithKey(roken, key) {
  const config = await sheet.getConfig()
  const qrLink = config.find(item => {
    return item.key == key
  }).value
  return await replyImage(roken, qrLink)
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

async function summaryOrder(message, isInsert = false) {
  const aiResponse = await summarizeOrder(message)

  var line_messages = []
  var sheet_order = []
  var order_total = 0
  var menuItem = aiResponse.items
  var unknwonItem = aiResponse.unknown_items
  var address = aiResponse.address
  var addressText = [
    address?.home?.trim() ? `บ้านเลขที่: ${address.home}` : null,
    address?.soi?.trim() ? `ซอย: ${address.soi}` : null
  ].filter(Boolean)

  if (addressText.length > 0) line_messages.push(addressText.join(', '))
  line_messages.push('สรุปรายการขนมและเครื่องดื่ม')
  for(let i=0; i < menuItem.length; i++) {
    const order = menuItem[i]
    order_total = order_total + order.total_price
    sheet_order.push(order)
    const modifiers = order?.modifiers?.length > 0 ? `[${order?.modifiers.join(',')}]` : "";
    line_messages.push(` ${i+1}. ${order.menu_name}[${order.quantity}]${modifiers}: ${order.total_price}`)
  }
  if (unknwonItem.length > 0) {
    line_messages.push(`ไม่พบรายการ: ${unknwonItem.join(',')}`)
  }
  line_messages.push(`ยอดรวมทั้งหมด: ${order_total}`)

  const insert_sheet_data = sheet_order.map((item, idx) => {
    if (idx == sheet_order.length - 1) {
      return [formatDateString(), item.menu_name, item.quantity, item.price, item.total_price, 'Auto', order_total]
    } else {
      return [formatDateString(), item.menu_name, item.quantity, item.price, item.total_price, 'Auto', '']
    }
  })
  if (isInsert) {
    sheet.appendData('ยอดขาย','A:G', insert_sheet_data)
  }
  
  return line_messages 
}

function createOrderSystemPrompt(menuList) {
  const filePath = path.resolve("./asset/text/openAIPrompt.txt");
  const template = fs.readFileSync(filePath, "utf-8");
  const menuJson = JSON.stringify(menuList, null, 2);
  return template.replace("__menuList__", menuJson);
}

async function summarizeOrder(customerText) {
  const menuList = await sheet.getMenuList()
  const prompt = createOrderSystemPrompt(menuList)
  const response = await openai.chat.completions.create({
    model: openaiConfig.model,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: prompt
      },
      {
        role: "user",
        content: customerText
      }
    ],
    response_format: { type: "json_object" } 
  });

  return JSON.parse(response.choices[0].message.content);
}

function reply(token, text) {
  return client.replyMessage(token, {
    type: 'text',
    text,
  });
}

function replyImage(token, image_link) {
  console.log(image_link)
  return client.replyMessage(token, {
    type: "image",
    originalContentUrl: image_link,
    previewImageUrl: image_link
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
