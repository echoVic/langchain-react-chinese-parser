/**
 * 百川 ReAct 输出解析器
 *
 * 专门适配百川（Baichuan）模型的中文 ReAct 格式输出解析
 */

import { BaseChineseReActParser } from '../base/BaseChineseReActParser.js';
import { ChineseModelType, LanguageKeywords, ParserOptions } from '../types.js';

/**
 * 百川 ReAct 输出格式解析器
 *
 * 百川模型常见格式：
 * ```
 * 思考: 需要搜索相关信息
 * 工具: search
 * 工具输入: 查询内容
 *
 * 思考: 根据搜索结果分析
 * 最终答案: 分析结果
 * ```
 */
export class BaichuanReActOutputParser extends BaseChineseReActParser {
  lc_namespace = ['langchain-react-chinese-parser', 'parsers', 'baichuan'];
  protected modelType: ChineseModelType = 'baichuan';
  protected keywords: LanguageKeywords = {
    chinese: {
      thought: ['思考', '分析', '推理'],
      action: ['工具', '动作', '操作', '使用'],
      actionInput: ['工具输入', '参数', '输入', '内容'],
      finalAnswer: ['最终答案', '答案', '结果'],
      observation: ['观察', '工具返回', '返回结果'],
    },
    english: {
      thought: ['thought', 'think', 'reasoning'],
      action: ['tool', 'action', 'use'],
      actionInput: ['tool input', 'parameter', 'input'],
      finalAnswer: ['final answer', 'answer', 'result'],
      observation: ['observation', 'tool result'],
    },
  };

  constructor(options: ParserOptions = {}) {
    super(options);
  }

  /**
   * 百川特殊格式处理
   * 百川模型倾向于使用"工具"而非"动作"
   */
  protected extractCustomAction(text: string) {
    // 百川格式：使用[工具名]工具，输入[参数]
    const useToolPattern = /使用([^工具\n]+)工具[，]?\s*输入\s*([^。\n]*)/;
    const useToolMatch = text.match(useToolPattern);
    if (useToolMatch) {
      return {
        action: useToolMatch[1].trim(),
        actionInput: useToolMatch[2].trim(),
        thought: '使用工具',
      };
    }

    // 格式：调用工具[工具名]进行[操作]
    const callToolPattern = /调用工具([^进行\n]+)进行([^。\n]*)/;
    const callToolMatch = text.match(callToolPattern);
    if (callToolMatch) {
      return {
        action: callToolMatch[1].trim(),
        actionInput: callToolMatch[2].trim(),
        thought: '调用工具',
      };
    }

    // 处理省略"工具"字样的情况
    const directToolPattern = /(?:^|\n)\s*([a-zA-Z_]+)\s*[:：]\s*([^\n]+)/im;
    const directToolMatch = text.match(directToolPattern);
    if (directToolMatch && this.isToolName(directToolMatch[1])) {
      return {
        action: directToolMatch[1].trim(),
        actionInput: directToolMatch[2].trim(),
        thought: '直接调用工具',
      };
    }

    return null;
  }

  /**
   * 判断是否为工具名称
   */
  private isToolName(name: string): boolean {
    // 常见工具名称模式
    const commonTools = [
      'search',
      'calculator',
      'weather',
      'translate',
      'file',
      'web',
      'database',
      'api',
      'code',
    ];

    return (
      commonTools.some(tool => name.toLowerCase().includes(tool)) ||
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
    ); // 符合变量命名规范
  }

  /**
   * 重写格式化指令
   */
  protected buildFormatInstructions(): string {
    const base = super.buildFormatInstructions();

    return `${base}

**百川特殊格式支持：**
- 使用[工具名]工具，输入[参数]
- 调用工具[工具名]进行[操作]
- 推荐使用"工具"而非"动作"关键字
- 支持直接工具名调用：tool_name: parameter`;
  }
}
