import { google } from 'googleapis';

async function getSheetData(range) {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
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