import stringSimilarity from 'string-similarity';

export class OrderParserUtil {

  static IGNORE_PATTERNS: RegExp[] = [
    /^@\S+/,                          // mention @ชื่อ
    /คิดยอด/,
    /ขอบคุณ/,
    /ค่ะ$|คะ$|ครับ$|นะคะ$/,          // ประโยคลงท้ายอย่างเดียว
    /วางที่ตะกร้า/,
    /รวมยอด/,
    /แยกน้ำ/,                         // modifier ไม่ใช่เมนูตั้งต้น (จะถูก capture เป็น modifier แทน)
  ];

  static ADDRESS_PATTERNS: RegExp[] = [
    /\b\d{1,4}\/\d{1,4}(?:\s*(?:ซอย|ซ\.?)\s*[\w\d]+)?/,
    /\b\d{2,4}\s*(?:ซอย|ซ\.?)\s*[\w\d]+/,
    /บ้าน\s*\d{1,4}(?:\/\d{1,4})?(?:\s*(?:ซอย|ซ\.?)\s*[\w\d]+)?/,
    /บ้าน[^\d]{0,30}?\s*\d{1,4}/
  ];

  /** แปลงตัวเลขไทยเป็นอาหรับ */
  static thaiToArabicDigit(str: string): string {
    const map: Record<string, string> = {
      "๐":"0","๑":"1","๒":"2","๓":"3","๔":"4",
      "๕":"5","๖":"6","๗":"7","๘":"8","๙":"9",
    };
    return str.replace(/[๐-๙]/g, (c) => map[c] ?? c);
  }
 
  /** normalize text: lowercase, trim, collapse spaces, ลบ zero-width chars */
  static normalizeText(text: string): string {
    return OrderParserUtil.thaiToArabicDigit(text)
      .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ") // zero-width + NBSP
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  static splitLines(text: string): string[] {
    return text.split(/\n/)
      .map((s) => {
        return s.replace(/[()]/g, " ")
        .replace(/ค่ะ|คะ/g, "")
        .replace(/\s+/g, " ")
        .trim()
      })
      .filter(Boolean);
  }

  static tokenize(text: string): { name: string; qty: number; raw: string }[] {
    const results: any[] = [];

    const numberPattern = /\d+/g
    const patterns = [
      /([^\d]+?)(\d+)/g,  /** เมนู 1 */
      /(\d+)([^\d]+)/g,   /** 1 เมนู */
    ];

    for (const pattern of patterns) {
      let match = pattern.exec(text)
      if (match !== null ) {
        let name: string;
        let qty: number;

        if (pattern === patterns[0]) {
          name = match[1].trim();
          qty = Number(match[2]);
        } else if (pattern === patterns[1]) {
          name = match[2].trim();
          qty = Number(match[1]);
        } else {
          continue
        }

        if (qty < 5) {
          if (pattern === patterns[0]) {
            const sum = [...text.matchAll(/[^\d]+\s*(\d+)/g)].map(m => Number(m[1])).filter((q) => q < 5).reduce((acc, curr) => acc + curr, 0);
            results.push({ name, qty: (sum ?? 0), raw: text });
          } else {
            results.push({ name, qty, raw: text });
          }
        } else {
          const sum = text.match(/\d+/g)?.map(Number).filter((q) => q < 5).reduce((acc, curr) => acc + curr, 0);
          results.push({ name: text, qty: (sum ?? 0), raw: text });
        }
        break;
      } else if (pattern === patterns.at(-1)) {
        results.push({ name: text, qty: 1, raw: text });
        break;
      }
    }
    return results;
  }

  static parseMenu(tokenize: { name: string; qty: number; raw: string }[], menuSheet: Record<string, string | null>[], orderList: { name: string, qty: Number, optional: string, type: string, rawText: string}[]) {
    var order: { name: string; qty: number; optional: string, type: string, rawText: string }[] = []
    var orderUnknow: { name: string; qty: number; raw: string }[] = []
    var menuList = menuSheet.map((item, idx)=>{
      return {
        name: item['order_list'],
        price: item['price'],
        keywords: (item['key_words'] ?? '').split(',').filter(Boolean).sort((a, b) => b.length - a.length),
        type: item['type']
      }
    })

    tokenloop:
    for (const token of tokenize) {
      const orderMerge = [...orderList, ...order]
      const isDrink = (orderMerge.at(-1)?.type ?? 'DRINK') == 'DRINK'
      const typePriority: Record<string, number>  = isDrink ? { 'DRINK': 1, 'CROFFLE': 2 } : { 'CROFFLE': 1, 'DRINK': 2 };

      const menuSorting = menuList.sort((a,b) => {
        const typeDiff = typePriority[a.type ?? ''] - typePriority[b.type ?? '']
        if (typeDiff !== 0) return typeDiff;

        return (b.name ?? '').length - (a.name ?? '').length;
      })
      menuloop:
      for (const menu of menuSorting) {
        if (OrderParserUtil.validateContent(token.name.trim(), menu.name?.trim() ?? '')) {
          const optional = token.name.replace(menu.name ?? '', '')
          order.push({ name: menu.name ?? '', qty: token.qty, optional: optional.trim(), type: menu.type ?? '', rawText: token.raw})
          break menuloop
        } 

        keyloop:
        for (const key of menu.keywords) {
          if (OrderParserUtil.validateContent(token.name.trim(), key.trim(), token.name.includes('สตอเบอรี่'))) {
            const optional = token.name.replace(key ?? '', '')
            order.push({ name: menu.name ?? '', qty: token.qty, optional: optional.trim(), type: menu.type ?? '', rawText: token.raw})
            break menuloop
          } else {
            continue keyloop
          }
        }
        
        if (menu === menuSorting.at(-1)) {
          orderUnknow.push(token)
        }
      }
    }

    return { order, orderUnknow }
  }

  static validateContent(text: string, target: string, log: boolean = false) {
    const targetLength = target.length
    const best = OrderParserUtil.findBestMatch(text, target, log)
    
    const matchLength = best.match.length - targetLength
    // if (log) console.log(`${target}, ${matchLength}`);
    
    if (matchLength > 0) {
      const scoreList = []
      for (let i = 0; i < matchLength; i++) {
        const str = best.match.substring(i, i + targetLength)
        const score = OrderParserUtil.similarity(str, target);

        scoreList.push({ str: str, target: target, score: score })
      }

      if (scoreList.length > 0) {
        const scoreMax = scoreList.reduce((prev, curr) =>
          curr.score > prev.score ? curr : prev
        );

        return scoreMax.score > 0.8
      } else {
        return false
      }
    } else if (matchLength == 0 && target.trim() !== "" && best.score > 0.8) {
      return true
    } else {
      return false
    }
  }

  static findBestMatch(text: string, target: string, log: boolean = false) {
    const words = text.split(/[\s,]+/); // ตัดคำแบบง่าย
    let best = { match: "", score: 0 };

    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j <= words.length; j++) {
        const chunk = words.slice(i, j).join("");
        const score = stringSimilarity.compareTwoStrings(chunk, target);
        // if (log) console.log(`${chunk},${target},${score}`);
        
        if (score > best.score) {
          best = { match: chunk, score };
        }
      }
    }
    return best;
  }

  static extractAddress(text: string): { address: string | null; rawAddress: string | null } | null {
    for (const pattern of OrderParserUtil.ADDRESS_PATTERNS) {
      const m = text.match(pattern);
      if (m) {
        const fullMatch = m[0];
        const rawAddress = fullMatch.match(/\d{1,4}(?:\/\d{1,4})?$/)?.[0] ?? null;
        const address = OrderParserUtil.normalizeAddress(rawAddress)
        
        return { address, rawAddress };
      }
    }
    return null
  }

  static normalizeAddress(input: string | null | undefined): string | null {
    if (!input) return null;
    const trimmed = input.trim();
    if (/^\d{1,3}\/\d{1,3}$/.test(trimmed)) return trimmed;

    if (/^\d{1,3}$/.test(trimmed)) {
      const num = Number(trimmed);
      if (num >= 1 && num <= 500) {
        return `98/${num}`;
      }
    }

    return null;
  }

  static levenshtein(a: string, b: string): number {
    const matrix = Array.from({ length: b.length + 1 }, () =>
      Array(a.length + 1).fill(0)
    );

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1,
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  static similarity(a: string, b: string): number {
    const distance = OrderParserUtil.levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return 1 - distance / maxLen;
  }
}
