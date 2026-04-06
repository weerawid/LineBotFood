import jsqrImport from "jsqr";
import { Jimp } from "jimp";

const jsQR = (jsqrImport as any).default || jsqrImport;

export async function readQRCodeFromBase64(base64: string): Promise<string | null> {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const image = await Jimp.read(buffer);
  const { data, width, height } = image.bitmap;
  const qrCode = jsQR(new Uint8ClampedArray(data), width, height);
  if (qrCode) {
    return qrCode.data;
  } else {
    return null;
  }
}