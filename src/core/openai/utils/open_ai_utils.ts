import fs from "fs";
import path from "path";

export class OpenAiUtil {
  static createSystemPrompt(menuList: string) {
    const filePath = path.resolve('src/core/openai/prompt/open_ai_validate_text.txt');
    const template = fs.readFileSync(filePath, "utf-8");
    const menuJson = JSON.stringify(menuList, null, 2);
    return template.replace("__menuList__", menuJson);
  }
}