import { OpenAI } from 'openai';
import { OpenAiUtil } from './utils/open_ai_utils.js';
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";

export class OpenAIManager {
  private client: OpenAI;

  constructor(apiKey: string = "") {
    this.client = new OpenAI({ apiKey: apiKey });
  }

  async summarize(input: any, menuList: string): Promise<any> {
    const prompt: ChatCompletionCreateParamsNonStreaming = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: OpenAiUtil.createSystemPrompt(menuList) },
        {
          role: 'user',
          content: JSON.stringify(input, null, 2)
        }
      ]
    }
    const res = await this.client.chat.completions.create(prompt);

    return res.choices[0].message.content || '{}'
  }
}
