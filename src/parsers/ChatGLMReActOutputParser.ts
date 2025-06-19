/**
 * ChatGLM ReAct 输出解析器
 *
 * 专门适配 ChatGLM 模型的中文 ReAct 格式输出解析
 */

import { BaseChineseReActParser } from '../base/BaseChineseReActParser.js';
import { ChineseModelType, LanguageKeywords, ParserOptions } from '../types.js';

/**
 * ChatGLM ReAct 输出格式解析器
 *
 * ChatGLM 常见格式：
 * ```
 * 思考：我需要查找相关信息
 * 动作：search
 * 动作输入：天气查询
 *
 * 思考：基于搜索结果，我可以给出答案
 * 最终答案：今天天气晴朗
 * ```
 */
export class ChatGLMReActOutputParser extends BaseChineseReActParser {
  lc_namespace = ['langchain-react-chinese-parser', 'parsers', 'chatglm'];
  protected modelType: ChineseModelType = 'chatglm';
  protected keywords: LanguageKeywords = {
    chinese: {
      thought: ['思考', '分析', '理解', '考虑'],
      action: ['动作', '行动', '工具', '操作'],
      actionInput: ['动作输入', '工具输入', '输入', '参数'],
      finalAnswer: ['最终答案', '答案', '结论', '回答'],
      observation: ['观察', '观察结果', '结果'],
    },
    english: {
      thought: ['thought', 'thinking', 'analysis'],
      action: ['action', 'tool', 'operation'],
      actionInput: ['action input', 'tool input', 'input'],
      finalAnswer: ['final answer', 'answer', 'conclusion'],
      observation: ['observation', 'result'],
    },
  };

  constructor(options: ParserOptions = {}) {
    super(options);
  }

  /**
   * ChatGLM 特殊格式处理
   * ChatGLM 经常合并思考和动作，或使用冒号变体
   */
  protected extractCustomAction(text: string) {
    // ChatGLM 常用格式：使用工具：[工具名] 查询：[参数]
    const toolQueryPattern = /使用工具[：:]([^，\n]+)[\s]*查询[：:]([^。\n]*)/;
    const toolQueryMatch = text.match(toolQueryPattern);
    if (toolQueryMatch) {
      return {
        action: toolQueryMatch[1].trim(),
        actionInput: toolQueryMatch[2].trim(),
        thought: '需要使用工具查询',
      };
    }

    // 格式：调用[工具名]，参数为[参数]
    const callToolPattern = /调用([^，\n]+)[，]?\s*参数为\s*([^。\n]*)/;
    const callToolMatch = text.match(callToolPattern);
    if (callToolMatch) {
      return {
        action: callToolMatch[1].trim(),
        actionInput: callToolMatch[2].trim(),
        thought: '调用工具',
      };
    }

    // 处理只有冒号的情况（ChatGLM 有时省略中文冒号）
    const colonOnlyPattern =
      /(?:^|\n)\s*(动作|工具|操作)\s*:\s*([^\n]+)\s*\n\s*(?:输入|参数)\s*:\s*([^\n]+)/im;
    const colonOnlyMatch = text.match(colonOnlyPattern);
    if (colonOnlyMatch) {
      return {
        action: colonOnlyMatch[2].trim(),
        actionInput: colonOnlyMatch[3].trim(),
        thought: '执行操作',
      };
    }

    return null;
  }

  /**
   * ChatGLM 倾向于使用中文冒号，重写预处理逻辑
   */
  protected preprocessText(text: string): string {
    return text
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/：/g, ':') // ChatGLM 特殊处理：统一冒号
      .replace(/\s+/g, ' ')
      .replace(/\n\s+/g, '\n');
  }

  /**
   * 重写格式化指令
   */
  protected buildFormatInstructions(): string {
    const base = super.buildFormatInstructions();

    return `${base}

**ChatGLM 特殊格式支持：**
- 使用工具：[工具名] 查询：[参数]
- 调用[工具名]，参数为[参数]
- 支持中文冒号：和英文冒号:混用
- 推荐使用中文冒号：格式`;
  }
}
