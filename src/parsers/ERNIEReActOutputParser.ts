/**
 * 文心一言 ReAct 输出解析器
 *
 * 专门适配文心一言（ERNIE）模型的中文 ReAct 格式输出解析
 */

import { BaseChineseReActParser } from '../base/BaseChineseReActParser.js';
import { ChineseModelType, LanguageKeywords, ParserOptions } from '../types.js';

/**
 * 文心一言 ReAct 输出格式解析器
 *
 * ERNIE 模型常见格式：
 * ```
 * 思考：需要查询相关信息
 * 调用工具：search
 * 输入：查询内容
 *
 * 思考：基于查询结果进行分析
 * 最终答案：分析结果
 * ```
 */
export class ERNIEReActOutputParser extends BaseChineseReActParser {
  lc_namespace = ['langchain-react-chinese-parser', 'parsers', 'ernie'];
  protected modelType: ChineseModelType = 'ernie';
  protected keywords: LanguageKeywords = {
    chinese: {
      thought: ['思考', '分析', '判断', '考虑'],
      action: ['调用工具', '使用工具', '执行', '操作'],
      actionInput: ['输入', '参数', '内容', '查询'],
      finalAnswer: ['最终答案', '答案', '结论', '回复'],
      observation: ['观察', '工具结果', '返回', '输出'],
    },
    english: {
      thought: ['thought', 'analysis', 'thinking'],
      action: ['call tool', 'use tool', 'action'],
      actionInput: ['input', 'parameter', 'query'],
      finalAnswer: ['final answer', 'answer', 'conclusion'],
      observation: ['observation', 'tool result', 'output'],
    },
  };

  constructor(options: ParserOptions = {}) {
    super(options);
  }

  /**
   * ERNIE 特殊格式处理
   * ERNIE 倾向于使用"调用工具"和较长的关键字
   */
  protected extractCustomAction(text: string) {
    // ERNIE 格式：我需要调用[工具名]来[操作描述]
    const needCallPattern = /我需要调用([^来\n]+)来([^。\n]*)/;
    const needCallMatch = text.match(needCallPattern);
    if (needCallMatch) {
      return {
        action: needCallMatch[1].trim(),
        actionInput: needCallMatch[2].trim(),
        thought: '需要调用工具',
      };
    }

    // 格式：现在调用[工具名]，参数是[参数]
    const nowCallPattern = /现在调用([^，\n]+)[，]?\s*参数是\s*([^。\n]*)/;
    const nowCallMatch = text.match(nowCallPattern);
    if (nowCallMatch) {
      return {
        action: nowCallMatch[1].trim(),
        actionInput: nowCallMatch[2].trim(),
        thought: '调用工具',
      };
    }

    // 处理中英文混合格式
    const mixedPattern = /(?:调用|call)\s*([a-zA-Z_\u4e00-\u9fff]+)\s*[:：]\s*([^\n]+)/i;
    const mixedMatch = text.match(mixedPattern);
    if (mixedMatch) {
      return {
        action: mixedMatch[1].trim(),
        actionInput: mixedMatch[2].trim(),
        thought: '执行操作',
      };
    }

    return null;
  }

  /**
   * ERNIE 特殊的预处理
   * 处理 ERNIE 经常出现的多余描述文字
   */
  protected preprocessText(text: string): string {
    let cleaned = super.preprocessText(text);

    // 移除 ERNIE 常见的冗余表达
    cleaned = cleaned
      .replace(/好的[，,]?/g, '')
      .replace(/我来帮您[^。]*。?/g, '')
      .replace(/让我[^。]*。?/g, '')
      .replace(/根据您的要求[，,]?/g, '');

    return cleaned;
  }

  /**
   * 重写格式化指令
   */
  protected buildFormatInstructions(): string {
    const base = super.buildFormatInstructions();

    return `${base}

**文心一言特殊格式支持：**
- 我需要调用[工具名]来[操作描述]
- 现在调用[工具名]，参数是[参数]
- 推荐使用"调用工具"关键字
- 支持中英文混合：call [tool]: [parameter]
- 会自动过滤常见的冗余表达`;
  }
}
