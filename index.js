const express = require("express");
const line = require("@line/bot-sdk");

const app = express();

/* ===== LINE CONFIG ===== */
const config = {
  channelAccessToken: "Np7VCSpBvkoVV7aN93KLt3bX1d2ZjHSVwXw9kxLAxYs/s0pA3foo9FZw1rC/Kk4xqvns7xXua2B+trdcqchW+vnM8dVKrGoaMIjjTB59wutMI8XzxSolncOTZbVGrQbbvEvqkrhBRxeO91TiGjzlGQdB04t89/1O/w1cDnyilFU=",
  channelSecret: "331e81c30fc0127ab0298be36d5fae4e",
};

/* ===== LINE CLIENT ===== */
const client = new line.Client(config);

/* ===== MEMORY STORE (DEMO) ===== */
const sessions = {}; 
// sessions[groupId] = { isOpen: true, orders: { userId: [] } }

const MENU_CONTENT = {
  "ลิ้นจี่โซดา": [],
  "สตอเบอรี่โซดา": [],
  "แดงโซดา": [],
  "แดงมะนาวโซดา": [],
  "นมชมพู": [],
  "โกโก้": [],
  "ชาเย็น": [],
  "อเมริกาโน่": [],
  "อเมริกาโน่น้ำส้ม": [],
  "อเมริกาโน่มะพร้าว": [],
  "อเมริกาโน่ special": [],
  "ลาเต้": [],
  "คาปูชิโน่": [],
  "เอสเพรสโซ่": [],
  "ม๊อคค่า": []
};

/* ===== WEBHOOK ===== */
app.post("/webhook", line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.end())
    .catch(err => {
      console.error(err);
      res.status(500).end();
    });
});

/* ===== MAIN LOGIC ===== */
async function handleEvent(event) {
  // if (event.type !== "message" || event.message.type !== "text") return;

  // const text = event.message.text.trim();
  // const { groupId, userId } = event.source;



  // if (!groupId) {
  //   return reply(event.replyToken, "❌ ใช้ได้เฉพาะในไลน์กลุ่ม");
  // }

  // // init group
  // if (!sessions[groupId]) {
  //   sessions[groupId] = { isOpen: false, orders: {} };
  // }

  // const group = sessions[groupId];

  // /* ===== COMMANDS ===== */
  // if (text === "@bot เปิดออเดอร์") {
  //   group.isOpen = true;
  //   group.orders = {};
  //   return reply(event.replyToken, "🟢 เปิดรับออเดอร์แล้ว");
  // }

  // if (text === "@bot ปิดออเดอร์") {
  //   group.isOpen = false;
  //   return reply(event.replyToken, "🔴 ปิดออเดอร์แล้ว");
  // }

  // // if (text === "เมนู") {
  // //   const menuText = Object.entries(MENU)
  // //     .map(([k, v]) => `${k} ${v} บาท`)
  // //     .join("\n");
  // //   return reply(event.replyToken, `📋 เมนู\n${menuText}`);
  // // }

  // if (text === "ของฉัน") {
  //   const items = group.orders[userId] || [];
  //   if (items.length === 0) {
  //     return reply(event.replyToken, "🧾 ยังไม่มีรายการของคุณ");
  //   }

  //   let total = 0;
  //   const lines = items.map(i => {
  //     total += i.price * i.qty;
  //     return `- ${i.menu} x${i.qty} = ${i.price * i.qty}`;
  //   });

  //   return reply(
  //     event.replyToken,
  //     `🧾 บิลของคุณ\n${lines.join("\n")}\nรวม ${total} บาท`
  //   );
  // }

  // /* ===== ADD ORDER ===== */
  // if (!group.isOpen) {
  //   return reply(event.replyToken, "⛔ ยังไม่เปิดรับออเดอร์");
  // }

  // // format: เมนู จำนวน
  // const parts = text.split(" ");
  // const menuName = parts[0];
  // const qty = parseInt(parts[1] || "1", 10);

  // if (!MENU[menuName]) {
  //   return reply(event.replyToken, "❓ ไม่พบเมนูนี้ (พิมพ์ 'เมนู' เพื่อดูรายการ)");
  // }

  // if (!group.orders[userId]) {
  //   group.orders[userId] = [];
  // }

  // group.orders[userId].push({
  //   menu: menuName,
  //   qty,
  //   price: MENU[menuName],
  // });

  // return reply(
  //   event.replyToken,
  //   `✅ เพิ่ม ${menuName} x${qty} (${MENU[menuName] * qty} บาท)`
  // );
}

/* ===== REPLY ===== */
function reply(token, text) {
  return client.replyMessage(token, {
    type: "text",
    text,
  });
}

/* ===== START SERVER ===== */
app.listen(3000, () => {
  console.log("LINE Bot running on port 3000");
});
