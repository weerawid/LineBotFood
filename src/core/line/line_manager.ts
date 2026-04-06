import { messagingApi } from '@line/bot-sdk';

export default class LineManager {

  private client: messagingApi.MessagingApiClient;

  private blobClient: messagingApi.MessagingApiBlobClient

  constructor(
    public channelAccessToken: string
  ) {
    this.client = new messagingApi.MessagingApiClient({
      channelAccessToken: channelAccessToken
    });

    this.blobClient = new messagingApi.MessagingApiBlobClient({
      channelAccessToken: 'YOUR_CHANNEL_ACCESS_TOKEN'
    });
  }

   /**
   * reply
   * ใช้ตอบกลับ message จาก webhook
   * ⚠️ replyToken ใช้ได้ครั้งเดียว และมีเวลา limit
   */
  async reply(
    replyToken: string,
    messages: messagingApi.Message[]
  ): Promise<void> {
    try {
      await this.client.replyMessage({
        replyToken,
        messages
      });
    } catch (error) {
      console.error('LINE reply error:', error);
    }
  }

  /**
   * push
   * ใช้ส่ง message ไปหา user โดยตรง (ไม่ต้องมี replyToken)
   * เหมาะกับ notification / cron job
   */
  async push(
    userId: string,
    messages: messagingApi.Message[]
  ): Promise<void> {
    try {
      await this.client.pushMessage({
        to: userId,
        messages
      });
    } catch (error) {
      console.error('LINE push error:', error);
    }
  }

  /**
   * replyText
   * helper สำหรับส่งข้อความ text กลับไป
   */
  async replyText(replyToken: string, text: string) {
    return this.reply(replyToken, [
      {
        type: 'text',
        text
      }
    ]);
  }

  /**
   * pushText
   * ส่งข้อความ text ไปหา user โดยตรง
   */
  async pushText(userId: string, text: string) {
    return this.push(userId, [
      {
        type: 'text',
        text
      }
    ]);
  }

  /**
   * replyImage
   * ส่งรูปภาพกลับไป
   * - originalContentUrl = รูปจริง
   * - previewImageUrl = รูป preview (ใช้ URL เดียวกันได้)
   */
  async replyImage(replyToken: string, original: string, thumbnail?: string | null) {
    return this.reply(replyToken, [
      {
        type: 'image',
        originalContentUrl: original,
        previewImageUrl: thumbnail ?? original
      }
    ]);
  }

  /**
   * pushImage
   * ส่งรูปภาพไปหา user โดยตรง
   */
  async pushImage(userId: string, url: string) {
    return this.push(userId, [
      {
        type: 'image',
        originalContentUrl: url,
        previewImageUrl: url
      }
    ]);
  }

  async replyFlex(
    replyToken: string,
    altText: string,
    contents: any
  ) {
    return this.reply(replyToken, [
      {
        type: 'flex',
        altText,
        contents
      }
    ]);
  }

  async getProfile(userId: string) {
    try {
      return await this.client.getProfile(userId);
    } catch (error) {
      console.error('getProfile error:', error);
      return null;
    }
  }

  async getMessageContent(messageId: string) {
    try {
      return await this.blobClient.getMessageContent(messageId);
    } catch (error) {
      console.error('getMessageContent error:', error);
      return null;
    }
  }

  async replyError(
    replyToken: string,
    message = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
  ) {
    return this.replyText(replyToken, message);
  }
}