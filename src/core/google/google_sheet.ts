import fs from 'fs';
import 'dotenv/config';

import { GoogleAuth } from 'google-auth-library';
import { google, sheets_v4 } from 'googleapis';
import { createAppError, ErrorKey } from '../../common/error/error.app.js';

const spreadsheetId: string = '12tlVlmmv9dEAaygF1-gm1E4EN2t_jLMjCF39Gjhv1z0';

const base64Credentials = process.env.GOOGLE_CREDENTIALS_BASE64;

if (!base64Credentials) {
  throw createAppError(ErrorKey.UNKNOW_ERROR_00000, 'GOOGLE_CREDENTIALS_BASE64 is not defined');
}

const decoded: string = Buffer
  .from(base64Credentials, 'base64')
  .toString('utf8');

const credPath = '/tmp/credentials.json';
fs.writeFileSync(credPath, decoded);

export interface ImageConfig {
  original: string | null;
  thumbnail: string | null
}

async function getSheet(): Promise<sheets_v4.Sheets> {
  const auth = new GoogleAuth({
    keyFile: credPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({
    version: 'v4',
    auth,
  });

  return sheets;
}

async function getSheetData(range: string): Promise<Record<string, string | null>[]> {
  const sheets = await getSheet();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];

  return rowsToObjects(rows);
}

function rowsToObjects(rows: string[][]): Record<string, string | null>[] {
  if (rows.length === 0) return [];

  const [headers, ...data] = rows;

  return data.map((row) =>
    headers.reduce<Record<string, string | null>>((obj, key, index) => {
      obj[key] = row[index] ?? null;
      return obj;
    }, {})
  );
}

export async function getMenuList() {
  const sheetRange = 'รายการสินค้า!A1:D'
  return await getSheetData(sheetRange)
}


export async function getConfig(): Promise<Record<string, string | null>> {
  const sheetRange = 'config!A1:B';

  const config = await getSheetData(sheetRange);

  const configMap = config.reduce<Record<string, string | null>>(
    (acc, item) => {
      const key = item.key;
      const value = item.value;

      if (key) {
        acc[key] = value ?? null;
      }

      return acc;
    },
    {}
  );

  return configMap;
}

export async function getImage(): Promise<Record<string, ImageConfig>> {
  const sheetRange = 'image!A1:D';

  const config = await getSheetData(sheetRange);

  const configMap = config.reduce<Record<string, ImageConfig>>(
    (acc, item) => {
      const key = item.key;
      const value = item.value;

      if (key) {
        acc[key] = {
          original: item.original,
          thumbnail: item.thumbnail
        };
      }

      return acc;
    },
    {}
  );
  return configMap;
}


