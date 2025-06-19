/**
 * 自定义 Agent 类集成示例
 *
 * 展示如何在现有的自定义 Agent 类中集成我们的中文 ReAct 解析器
 */

import {
  createAutoParser,
  createChatGLMParser, createQwenParser,
} from 'langchain-react-chinese-parser';

/**
 * 示例：通义千问 ReAct Agent
 *
 * 这是一个典型的自定义 Agent 类，展示如何集成我们的解析器
 */
export class QwenReActAgent {
  private llm: any;
  private tools: any[];
  private parser: any;
  private maxIterations: number;
  private debug: boolean;

  constructor(options: {
    llm: any;
    tools: any[];
    maxIterations?: number;
    debug?: boolean;
    parserType?: 'qwen' | 'auto';
  }) {
    this.llm = options.llm;
    this.tools = options.tools;
    this.maxIterations = options.maxIterations || 10;
    this.debug = options.debug || false;

    // 🔧 使用我们的解析器
    if (options.parserType === 'auto') {
      this.parser = createAutoParser({ debug: this.debug });
    } else {
      this.parser = createQwenParser({
        debug: this.debug,
        relaxedMode: true,
      });
    }

    if (this.debug) {
      console.log(`🚀 QwenReActAgent 初始化完成，使用解析器: ${this.parser.getType()}`);
    }
  }

  async invoke(input: string): Promise<{ output: string; success: boolean }> {
    let iteration = 0;
    let agentScratchpad = '';

    while (iteration < this.maxIterations) {
      try {
        // 1. 构建提示词
        const prompt = this.buildPrompt(input, agentScratchpad);

        // 2. LLM 推理
        const rawOutput = await this.llm.invoke(prompt);

        if (this.debug) {
          console.log(`🧠 [迭代 ${iteration + 1}] LLM 原始输出:`, rawOutput);
        }

        // 3. 🔧 使用我们的解析器解析输出
        const parsed = await this.parser.parse(rawOutput);

        if ('tool' in parsed) {
          // 处理工具调用
          if (this.debug) {
            console.log(`🔧 [迭代 ${iteration + 1}] 工具调用:`, {
              tool: parsed.tool,
              input: parsed.toolInput,
            });
          }

          const toolResult = await this.executeTool(parsed.tool, parsed.toolInput);
          agentScratchpad += `\n动作: ${parsed.tool}\n动作输入: ${parsed.toolInput}\n观察: ${toolResult}`;
        } else {
          // 最终答案
          if (this.debug) {
            console.log(`✅ [迭代 ${iteration + 1}] 最终答案:`, parsed.returnValues.output);
          }

          return {
            output: parsed.returnValues.output,
            success: true,
          };
        }
      } catch (error) {
        console.error(`❌ [迭代 ${iteration + 1}] 解析失败:`, error.message);

        // 可以添加降级策略或错误恢复
        if (iteration === this.maxIterations - 1) {
          return {
            output: `抱歉，在处理您的请求时遇到了问题：${error.message}`,
            success: false,
          };
        }
      }

      iteration++;
    }

    return {
      output: '达到最大迭代次数，未能完成任务',
      success: false,
    };
  }

  private buildPrompt(input: string, scratchpad: string): string {
    const toolNames = this.tools.map(t => t.name).join(', ');
    const toolDescriptions = this.tools.map(t => `${t.name}: ${t.description}`).join('\n');

    return `你是一个智能助手，可以使用以下工具来回答问题：

可用工具:
${toolDescriptions}

工具名称: ${toolNames}

请按照以下格式回答：

思考: [分析问题，决定是否需要使用工具]
动作: [工具名称]  
动作输入: [工具的输入参数]
观察: [工具的执行结果]
... (这个过程可以重复)
思考: [基于观察结果的分析]
最终答案: [最终的回答]

问题: ${input}

${scratchpad}

思考:`;
  }

  private async executeTool(toolName: string, toolInput: string): Promise<string> {
    const tool = this.tools.find(t => t.name === toolName);

    if (!tool) {
      return `错误：未找到工具 ${toolName}`;
    }

    try {
      const result = await tool.func(toolInput);
      return result;
    } catch (error) {
      return `错误：工具 ${toolName} 执行失败 - ${error.message}`;
    }
  }
}

/**
 * 示例：通用中文 ReAct Agent
 *
 * 支持多种中文模型的通用 Agent
 */
export class UniversalChineseAgent {
  private llm: any;
  private tools: any[];
  private parser: any;
  private maxIterations: number;

  constructor(options: {
    llm: any;
    tools: any[];
    modelType?: 'qwen' | 'chatglm' | 'baichuan' | 'ernie' | 'auto';
    maxIterations?: number;
  }) {
    this.llm = options.llm;
    this.tools = options.tools;
    this.maxIterations = options.maxIterations || 10;

    // 🔧 根据模型类型选择合适的解析器
    switch (options.modelType) {
    case 'qwen':
      this.parser = createQwenParser({ debug: true });
      break;
    case 'chatglm':
      this.parser = createChatGLMParser({ debug: true });
      break;
    case 'auto':
    default:
      this.parser = createAutoParser({ debug: true });
      break;
    }

    console.log(`🤖 UniversalChineseAgent 初始化，解析器: ${this.parser.getType()}`);
  }

  async invoke(input: string) {
    // 与 QwenReActAgent 类似的实现
    // ... 省略详细实现，核心是使用 this.parser.parse(rawOutput)

    return {
      output: '通用中文 Agent 的响应',
      success: true,
    };
  }
}

/**
 * 工厂方法：创建中文 Agent
 */
export function createChineseAgent(options: {
  llm: any;
  tools: any[];
  modelType: 'qwen' | 'chatglm' | 'baichuan' | 'ernie' | 'auto';
  maxIterations?: number;
  debug?: boolean;
}) {
  if (options.modelType === 'qwen') {
    return new QwenReActAgent({
      llm: options.llm,
      tools: options.tools,
      maxIterations: options.maxIterations,
      debug: options.debug,
      parserType: 'qwen',
    });
  } else {
    return new UniversalChineseAgent({
      llm: options.llm,
      tools: options.tools,
      modelType: options.modelType,
      maxIterations: options.maxIterations,
    });
  }
}

/**
 * 升级现有 Agent 的示例
 *
 * 如果您已经有现有的 Agent 类，可以这样升级
 */
export class ExistingAgentUpgrade {
  private parser: any;

  constructor() {
    // 🔧 升级：将原来的解析器替换为我们的解析器
    // 原来可能是：
    // this.parser = new ReActSingleInputOutputParser();

    // 现在改为：
    this.parser = createAutoParser({ debug: true });
  }

  async processLLMOutput(rawOutput: string) {
    try {
      // 🔧 关键升级点：这行代码保持不变
      const parsed = await this.parser.parse(rawOutput);

      // 处理逻辑保持不变
      if ('tool' in parsed) {
        return { type: 'action', data: parsed };
      } else {
        return { type: 'finish', data: parsed };
      }
    } catch (error) {
      console.error('解析失败:', error.message);
      throw error;
    }
  }
}

/**
 * 使用示例
 */
export async function demonstrateCustomAgentUsage() {
  console.log('🎯 自定义 Agent 类集成演示\n');

  // 模拟工具
  const tools = [
    {
      name: 'search',
      description: '搜索工具',
      func: async (query: string) => `搜索结果：${query}相关信息`,
    },
    {
      name: 'calculator',
      description: '计算器',
      func: async (expression: string) => `计算结果：${expression} = 42`,
    },
  ];

  // 模拟 LLM
  const mockLLM = {
    async invoke(prompt: string) {
      // 模拟中文 ReAct 输出
      return `思考: 用户想要搜索信息，我需要使用搜索工具
动作: search
动作输入: 天气预报`;
    },
  };

  // 1. 创建通义千问 Agent
  const qwenAgent = new QwenReActAgent({
    llm: mockLLM,
    tools,
    debug: true,
    parserType: 'qwen',
  });

  console.log('🔧 测试通义千问 Agent:');
  const result1 = await qwenAgent.invoke('今天天气怎么样？');
  console.log('结果:', result1);

  console.log('\n---\n');

  // 2. 创建通用 Agent
  const universalAgent = new UniversalChineseAgent({
    llm: mockLLM,
    tools,
    modelType: 'auto',
  });

  console.log('🤖 测试通用 Agent:');
  const result2 = await universalAgent.invoke('帮我计算 1+1');
  console.log('结果:', result2);

  console.log('\n---\n');

  // 3. 工厂方法创建
  const factoryAgent = createChineseAgent({
    llm: mockLLM,
    tools,
    modelType: 'auto',
    debug: true,
  });

  console.log('🏭 工厂方法创建的 Agent:');
  const result3 = await factoryAgent.invoke('请帮我搜索相关信息');
  console.log('结果:', result3);
}

// 运行演示
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateCustomAgentUsage().catch(console.error);
}
