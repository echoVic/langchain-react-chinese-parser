/**
 * 通义千问 ReAct 输出解析器
 *
 * 专门适配通义千问（Qwen）模型的中文 ReAct 格式输出解析
 */

import { BaseChineseReActParser } from '../base/BaseChineseReActParser.js';
import { ChineseModelType, LanguageKeywords, ParserOptions } from '../types.js';

/**
 * 通义千问 ReAct 输出格式解析器
 *
 * 支持格式：
 * ```
 * 思考: 我需要搜索相关信息
 * 动作: search
 * 动作输入: 搜索内容
 *
 * 思考: 我已经找到了答案
 * 最终答案: 这是最终的答案
 * ```
 */
export class QwenReActOutputParser extends BaseChineseReActParser {
  lc_namespace = ['langchain-react-chinese-parser', 'parsers', 'qwen'];
  protected modelType: ChineseModelType = 'qwen';
  protected keywords: LanguageKeywords = {
    chinese: {
      thought: ['思考', '推理', '分析', '想法'],
      action: ['动作', '行动', '操作'],
      actionInput: ['动作输入', '操作输入', '输入', '参数'],
      finalAnswer: ['最终答案', '答案', '结果', '回答'],
      observation: ['观察', '结果', '返回'],
    },
    english: {
      thought: ['thought', 'thinking', 'think'],
      action: ['action', 'act'],
      actionInput: ['action input', 'action_input', 'input'],
      finalAnswer: ['final answer', 'answer', 'result'],
      observation: ['observation', 'obs'],
    },
  };

  constructor(options: ParserOptions = {}) {
    super(options);
  }

  /**
   * 通义千问特殊格式处理
   * 处理一些通义千问模型特有的输出变体
   */
  protected extractCustomAction(text: string) {
    // 通义千问有时会输出 "我将..." 格式
    const willDoPattern =
      /我将(?:使用|调用|执行)([^，。\n]+)(?:工具|功能)[，。]?(?:来|去)?([^。\n]*)/;
    const willDoMatch = text.match(willDoPattern);
    if (willDoMatch) {
      return {
        action: willDoMatch[1].trim(),
        actionInput: willDoMatch[2].trim() || 'default',
        thought: '需要使用工具',
      };
    }

    // 处理 "执行:" 格式
    const executePattern = /(?:^|\n)\s*执行\s*[:：]\s*([^\n]+)/im;
    const executeMatch = text.match(executePattern);
    if (executeMatch) {
      const parts = executeMatch[1].split(/[，,]/);
      if (parts.length >= 2) {
        return {
          action: parts[0].trim(),
          actionInput: parts.slice(1).join(',').trim(),
          thought: '执行工具',
        };
      }
    }

    return null;
  }

  /**
   * 重写格式化指令，添加通义千问特殊说明
   */
  protected buildFormatInstructions(): string {
    const base = super.buildFormatInstructions();

    return `${base}

**通义千问特殊格式支持：**
- 也支持：我将使用[工具名]来[参数描述]
- 也支持：执行: [工具名], [参数]
- 支持观察关键字：观察:, 结果:, 返回:`;
  }
}
