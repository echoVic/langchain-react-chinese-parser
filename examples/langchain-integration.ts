/**
 * LangChain 集成示例
 * 
 * 展示如何正确使用 Runnable/Chain 组合方式集成中文 ReAct 解析器
 */

import { createAutoParser, createQwenParser } from 'langchain-react-chinese-parser';
// import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
// import { AgentExecutor } from "langchain/agents";
// import { formatLogToString } from "langchain/agents";
// import { pull } from "langchain/hub";

/**
 * 根据官方 API 文档的正确集成方式
 */
export function createChineseReActAgent() {
  const exampleCode = `
import { RunnableSequence } from "@langchain/core/runnables";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { pull } from "langchain/hub";
import { createAutoParser } from 'langchain-react-chinese-parser';

// 🔧 方法一：官方标准方式（推荐）
async function createChineseAgent(llm, tools) {
  // 1. 使用官方 createReactAgent API
  const prompt = await pull("hwchase17/react");
  
  const reactAgent = await createReactAgent({
    llm: llm,              // LLM 模型
    tools: tools,          // 工具数组  
    prompt: prompt,        // 提示词模板
    streamRunnable: true   // 可选：启用流式处理
  });

  // 2. 创建中文解析器
  const parser = createAutoParser({ debug: true });

  // 3. 组合官方 Agent + 中文解析器
  const enhancedAgent = RunnableSequence.from([
    reactAgent,    // 使用官方创建的 Agent
    parser         // 添加我们的中文解析器
  ]);

  // 4. 创建 Agent 执行器
  const agentExecutor = new AgentExecutor({
    agent: enhancedAgent,  // 使用增强后的 Agent
    tools: tools,
    verbose: true,
    maxIterations: 10,
  });

  return agentExecutor;
}

// 🚀 方法二：简洁的 Pipe 方式
async function createChineseAgentSimple(llm, tools) {
  const parser = createAutoParser();
  const prompt = await pull("hwchase17/react");
  
  const agentChain = RunnableSequence.from([
    RunnablePassthrough.assign({
      agent_scratchpad: (input) => formatLogToString(input.intermediate_steps || [])
    }),
    prompt.pipe(llm).pipe(parser)  // 简洁的链式调用
  ]);

  return new AgentExecutor({
    agent: agentChain,
    tools,
    verbose: true
  });
}

// 🎯 方法三：针对特定模型优化
async function createQwenAgent(qwenLLM, tools) {
  const qwenParser = createQwenParser({ 
    debug: true,
    customKeywords: {
      chinese: {
        action: ['动作', '操作', '执行'],
        actionInput: ['动作输入', '参数', '输入']
      }
    }
  });
  
  const prompt = await pull("hwchase17/react");
  
  const agentChain = RunnableSequence.from([
    RunnablePassthrough.assign({
      agent_scratchpad: (input) => formatLogToString(input.intermediate_steps || [])
    }),
    prompt,
    qwenLLM,
    qwenParser  // 通义千问专用解析器
  ]);

  return new AgentExecutor({
    agent: agentChain,
    tools,
    verbose: true
  });
}

// 📋 使用示例
async function main() {
  // 假设你已经有了 LLM 和 tools
  const llm = /* 你的 LLM 实例 */;
  const tools = /* 你的工具数组 */;

  // 创建中文 Agent
  const agent = await createChineseAgent(llm, tools);

  // 执行任务 - 现在完美支持中文 ReAct 输出！
  const result = await agent.invoke({
    input: "请帮我查询北京今天的天气情况"
  });

  console.log('Agent 执行结果:', result.output);
}
  `;

  return exampleCode;
}

/**
 * 条件解析示例
 */
export function createConditionalParser() {
  const example = `
import { RunnableBranch } from "@langchain/core/runnables";
import { 
  createQwenParser, 
  createChatGLMParser, 
  createAutoParser 
} from 'langchain-react-chinese-parser';

// 根据模型类型选择解析器
const conditionalParser = RunnableBranch.from([
  [
    // 条件：如果是通义千问模型
    (input) => input.modelType === 'qwen',
    createQwenParser({ debug: true })
  ],
  [
    // 条件：如果是 ChatGLM 模型
    (input) => input.modelType === 'chatglm', 
    createChatGLMParser({ debug: true })
  ],
  // 默认：使用自动识别解析器
  createAutoParser({ debug: true })
]);

// 在 Agent Chain 中使用条件解析器
const agentChain = RunnableSequence.from([
  RunnablePassthrough.assign({
    agent_scratchpad: (input) => formatLogToString(input.intermediate_steps || []),
    modelType: () => process.env.MODEL_TYPE || 'auto'  // 从环境变量获取模型类型
  }),
  prompt,
  llm,
  conditionalParser  // 根据条件选择解析器
]);
  `;

  return example;
}

/**
 * 错误恢复策略示例
 */
export function createFallbackStrategy() {
  const example = `
import { RunnablePassthrough } from "@langchain/core/runnables";
import { 
  createQwenParser,
  createChatGLMParser,
  createBaichuanParser,
  createAutoParser
} from 'langchain-react-chinese-parser';

// 多解析器降级策略
class FallbackParser {
  private parsers = [
    createQwenParser(),
    createChatGLMParser(), 
    createBaichuanParser(),
    createAutoParser()
  ];

  async parse(text: string) {
    for (const parser of this.parsers) {
      try {
        const result = await parser.parse(text);
        console.log(\`✅ 成功使用 \${parser.getType()} 解析\`);
        return result;
      } catch (error) {
        console.log(\`❌ \${parser.getType()} 解析失败，尝试下一个\`);
        continue;
      }
    }
    throw new Error('所有解析器都无法解析此输出');
  }

  getType() {
    return 'fallback_parser';
  }
}

// 在 Chain 中使用降级解析器
const agentChain = RunnableSequence.from([
  RunnablePassthrough.assign({
    agent_scratchpad: (input) => formatLogToString(input.intermediate_steps || [])
  }),
  prompt,
  llm,
  new FallbackParser()  // 使用降级策略
]);
  `;

  return example;
}

/**
 * 实际项目集成示例
 */
export function createRealWorldExample() {
  const example = `
// 实际项目中的完整集成示例

import { ChatQwen } from '@langchain/community/chat_models/tongyi';
import { DynamicTool } from 'langchain/tools';
import { RunnableSequence } from "@langchain/core/runnables";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { pull } from "langchain/hub";
import { createAutoParser } from 'langchain-react-chinese-parser';

// 1. 初始化 LLM
const llm = new ChatQwen({
  apiKey: process.env.QWEN_API_KEY,
  model: 'qwen-turbo',
  temperature: 0.1
});

// 2. 定义工具
const tools = [
  new DynamicTool({
    name: "weather_query",
    description: "查询指定城市的天气信息",
    func: async (cityName: string) => {
      // 实际的天气查询逻辑
      return \`\${cityName}今天天气：晴朗，25°C\`;
    },
  }),
  new DynamicTool({
    name: "calculator", 
    description: "执行数学计算",
    func: async (expression: string) => {
      try {
        const result = eval(expression);
        return \`计算结果：\${result}\`;
      } catch (error) {
        return '计算错误，请检查表达式';
      }
    },
  })
];

// 3. 创建智能客服 Agent
async function createCustomerServiceAgent() {
  // 使用官方 createReactAgent API
  const prompt = await pull("hwchase17/react");
  
  const reactAgent = await createReactAgent({
    llm: llm,
    tools: tools,
    prompt: prompt,
    streamRunnable: true
  });

  // 添加中文解析器
  const parser = createAutoParser({ debug: true });
  
  const enhancedAgent = RunnableSequence.from([
    reactAgent,    // 官方 Agent
    parser         // 中文解析器
  ]);

  return new AgentExecutor({
    agent: enhancedAgent,
    tools,
    verbose: true,
    maxIterations: 5,
    returnIntermediateSteps: true
  });
}

// 4. 使用 Agent
async function handleUserQuery(query: string) {
  const agent = await createCustomerServiceAgent();
  
  try {
    const result = await agent.invoke({
      input: query
    });
    
    return {
      success: true,
      answer: result.output,
      steps: result.intermediateSteps || []
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 5. 测试用例
async function testChineseAgent() {
  const testQueries = [
    "请帮我查询北京今天的天气",
    "计算 100 + 200 * 3 的结果", 
    "上海的天气怎么样？",
    "12 乘以 34 等于多少？"
  ];

  for (const query of testQueries) {
    console.log(\`\\n📝 用户提问: \${query}\`);
    const result = await handleUserQuery(query);
    
    if (result.success) {
      console.log(\`✅ 回答: \${result.answer}\`);
      console.log(\`🔧 推理步骤: \${result.steps.length} 步\`);
    } else {
      console.log(\`❌ 错误: \${result.error}\`);
    }
  }
}

// 运行测试
testChineseAgent().catch(console.error);
  `;

  return example;
}

// 导出示例代码
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  console.log('🔧 LangChain 中文 ReAct 集成示例\\n');
  
  console.log('1️⃣ 基础集成方式:');
  console.log(createChineseReActAgent());
  
  console.log('\\n2️⃣ 条件解析策略:');
  console.log(createConditionalParser());
  
  console.log('\\n3️⃣ 错误恢复策略:'); 
  console.log(createFallbackStrategy());
  
  console.log('\\n4️⃣ 实际项目示例:');
  console.log(createRealWorldExample());
} 