import { getConfig, getImage, ImageConfig } from '../google/google_sheet.js';

/**
 * โครงสร้างของ config ที่ดึงมาจาก Google Sheet
 * ถ้าอยาก strict กว่านี้ สามารถกำหนด key เฉพาะได้
 */

/**
 * โครงสร้างของ AppContext
 */
export interface AppContext {
  config: Record<string, string | null>;
  image: Record<string, ImageConfig> | null; 
}

let context: AppContext | null = null

export async function initializeContext(): Promise<AppContext> {
  const config = await getConfig()
  const imageConfig = await getImage()

  context = {
    config: config,
    image: imageConfig
  }

  return context
}

export async function updateContext(): Promise<void> {
  if (!context) {
    await initializeContext()
  }

  const config = await getConfig()
  const imageConfig = await getImage()

  context!.config = config
  context!.image = imageConfig
}

export async function getContext(): Promise<AppContext> {
  if (!context) {
    return await initializeContext()
  }

  return context
}
