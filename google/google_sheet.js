import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import 'dotenv/config';

const decoded = Buffer
  .from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64')
  .toString('utf8');

const credPath = '/tmp/credentials.json';
fs.writeFileSync(credPath, decoded);

async function getSheetData(range) {
  const auth = new GoogleAuth({
    keyFile: credPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = '12tlVlmmv9dEAaygF1-gm1E4EN2t_jLMjCF39Gjhv1z0'; // ดูจาก URL

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return rowsToObjects(response.data.values)
}

function rowsToObjects(rows) {
  const [headers, ...data] = rows;

  return data.map(row =>
    headers.reduce((obj, key, index) => {
      obj[key] = row[index] ?? null;
      return obj;
    }, {})
  );
}

export async function getMenuList() {
  const sheetRange = 'รายการสินค้า!A1:C'
  return getSheetData(sheetRange)
}