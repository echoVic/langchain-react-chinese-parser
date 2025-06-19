/**
 * 中文 ReAct 解析器工厂
 *
 * 提供便捷的方法创建各种中文模型的 ReAct 解析器
 */

import { AgentAction, AgentFinish } from '@langchain/core/agents';
import { BaseOutputParser } from '@langchain/core/output_parsers';
import { BaichuanReActOutputParser } from './parsers/BaichuanReActOutputParser.js';
import { ChatGLMReActOutputParser } from './parsers/ChatGLMReActOutputParser.js';
import { ERNIEReActOutputParser } from './parsers/ERNIEReActOutputParser.js';
import { QwenReActOutputParser } from './parsers/QwenReActOutputParser.js';
import { ChineseModelType, IChineseReActParser, ParserOptions } from './types.js';

/**
 * 解析器工厂类
 */
export class ChineseReActParserFactory {
  /**
   * 创建指定类型的解析器
   */
  static createParser(
    modelType: ChineseModelType,
    options: ParserOptions = {},
  ): IChineseReActParser {
    switch (modelType) {
    case 'qwen':
      return new QwenReActOutputParser(options);

    case 'chatglm':
      return new ChatGLMReActOutputParser(options);

    case 'baichuan':
      return new BaichuanReActOutputParser(options);

    case 'ernie':
      return new ERNIEReActOutputParser(options);

    case 'glm':
      // 智谱GLM 使用与 ChatGLM 相同的解析器
      return new ChatGLMReActOutputParser(options);

    case 'minimax':
      // Minimax 使用通义千问的解析器（格式相似）
      return new QwenReActOutputParser(options);

    case 'auto':
      // 自动模式：返回支持多种格式的通用解析器
      return new UniversalChineseReActParser(options);

    default:
      throw new Error(`不支持的模型类型: ${modelType}`);
    }
  }

  /**
   * 获取所有支持的模型类型
   */
  static getSupportedModels(): ChineseModelType[] {
    return ['qwen', 'chatglm', 'baichuan', 'glm', 'ernie', 'minimax', 'auto'];
  }

  /**
   * 检查是否支持指定模型
   */
  static isSupported(modelType: string): boolean {
    return this.getSupportedModels().includes(modelType as ChineseModelType);
  }
}

/**
 * 通用中文 ReAct 解析器
 * 尝试多种解析策略，适配不同的中文模型输出格式
 */
class UniversalChineseReActParser
  extends BaseOutputParser<AgentAction | AgentFinish>
  implements IChineseReActParser
{
  lc_namespace = ['langchain-react-chinese-parser', 'parsers', 'universal'];

  private parsers: IChineseReActParser[];
  private options: ParserOptions;

  constructor(options: ParserOptions = {}) {
    super();
    this.options = options;
    this.parsers = [
      new QwenReActOutputParser(options),
      new ChatGLMReActOutputParser(options),
      new BaichuanReActOutputParser(options),
      new ERNIEReActOutputParser(options),
    ];
  }

  async parse(text: string) {
    const errors: Error[] = [];

    // 依次尝试各个解析器
    for (const parser of this.parsers) {
      try {
        const result = await parser.parse(text);

        if (this.options.debug) {
          console.log(`[Universal] 成功使用 ${parser.getType()} 解析`);
        }

        return result;
      } catch (error) {
        errors.push(error as Error);

        if (this.options.debug) {
          console.log(`[Universal] ${parser.getType()} 解析失败:`, error);
        }
      }
    }

    // 所有解析器都失败
    throw new Error(
      `所有解析器都无法解析此输出。错误详情:\n${errors.map(e => e.message).join('\n\n')}`,
    );
  }

  getFormatInstructions(): string {
    return `请按照以下任一格式回答：

**通义千问格式：**
思考: 描述思考过程
动作: 工具名称  
动作输入: 工具参数

**ChatGLM格式：**
思考：描述思考过程
工具：工具名称
工具输入：工具参数

**百川格式：**
思考: 描述思考过程
工具: 工具名称
工具输入: 工具参数

**文心一言格式：**
思考：描述思考过程
调用工具：工具名称
输入：工具参数

**最终答案格式（任何模型）：**
思考: 描述思考过程
最终答案: 你的答案

**注意：**
- 支持中英文关键字混用
- 支持中文冒号：和英文冒号:
- 工具名和参数要清晰明确`;
  }

  getType(): string {
    return 'universal_chinese_react_parser';
  }
}

/**
 * 便捷函数：创建解析器
 */
export function createChineseReActParser(
  modelType: ChineseModelType,
  options: ParserOptions = {},
): IChineseReActParser {
  return ChineseReActParserFactory.createParser(modelType, options);
}

/**
 * 便捷函数：创建通义千问解析器
 */
export function createQwenParser(options: ParserOptions = {}): QwenReActOutputParser {
  return new QwenReActOutputParser(options);
}

/**
 * 便捷函数：创建 ChatGLM 解析器
 */
export function createChatGLMParser(options: ParserOptions = {}): ChatGLMReActOutputParser {
  return new ChatGLMReActOutputParser(options);
}

/**
 * 便捷函数：创建百川解析器
 */
export function createBaichuanParser(options: ParserOptions = {}): BaichuanReActOutputParser {
  return new BaichuanReActOutputParser(options);
}

/**
 * 便捷函数：创建文心一言解析器
 */
export function createERNIEParser(options: ParserOptions = {}): ERNIEReActOutputParser {
  return new ERNIEReActOutputParser(options);
}

/**
 * 便捷函数：创建自动解析器
 */
export function createAutoParser(options: ParserOptions = {}): IChineseReActParser {
  return ChineseReActParserFactory.createParser('auto', options);
}
