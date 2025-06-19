/**
 * 基础使用示例
 *
 * 演示如何使用 langchain-react-chinese-parser 解析各种中文模型的输出
 * 以及如何与 LangChain 的 Runnable/Chain 架构正确集成
 */

import {
  createAutoParser,
  createChatGLMParser,
  createQwenParser,
  SUPPORTED_MODELS,
} from 'langchain-react-chinese-parser';

// LangChain 相关导入（用于集成示例）
// import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
// import { AgentExecutor } from "langchain/agents";
// import { formatLogToString } from "langchain/agents";
// import { pull } from "langchain/hub";

async function demonstrateBasicUsage() {
  console.log('🚀 LangChain 中文 ReAct 解析器演示\n');

  // 1. 基础用法 - 通义千问
  console.log('1️⃣ 通义千问解析器');
  const qwenParser = createQwenParser({ debug: true });

  const qwenOutput = `
思考: 我需要搜索今天北京的天气情况
动作: search
动作输入: 北京今日天气
  `;

  try {
    const qwenResult = await qwenParser.parse(qwenOutput);
    console.log('✅ 解析成功:', {
      tool: qwenResult.tool,
      toolInput: qwenResult.toolInput,
    });
  } catch (error) {
    console.log('❌ 解析失败:', error.message);
  }

  console.log('\n---\n');

  // 2. ChatGLM 解析器
  console.log('2️⃣ ChatGLM 解析器');
  const glmParser = createChatGLMParser();

  const glmOutput = `
思考：用户询问天气，我需要调用天气查询工具
工具：weather_query
工具输入：北京
  `;

  try {
    const glmResult = await glmParser.parse(glmOutput);
    console.log('✅ 解析成功:', {
      tool: glmResult.tool,
      toolInput: glmResult.toolInput,
    });
  } catch (error) {
    console.log('❌ 解析失败:', error.message);
  }

  console.log('\n---\n');

  // 3. 最终答案解析
  console.log('3️⃣ 最终答案解析');
  const finalAnswerOutput = `
思考: 根据搜索结果，我可以提供天气信息
最终答案: 今天北京天气晴朗，气温25°C，适宜出行。
  `;

  try {
    const finalResult = await qwenParser.parse(finalAnswerOutput);
    console.log('✅ 最终答案:', finalResult.returnValues?.output);
  } catch (error) {
    console.log('❌ 解析失败:', error.message);
  }

  console.log('\n---\n');

  // 4. 自动解析器（推荐）
  console.log('4️⃣ 自动解析器（智能识别格式）');
  const autoParser = createAutoParser({ debug: true });

  const mixedOutputs = [
    '思考: 需要计算\n动作: calculator\n动作输入: 100+200',
    '思考：查询数据库\n工具：database\n工具输入：SELECT * FROM users',
    '思考: 翻译文本\n调用工具: translate\n输入: hello world',
    '思考: 任务完成\n最终答案: 计算结果是300',
  ];

  for (let i = 0; i < mixedOutputs.length; i++) {
    try {
      const result = await autoParser.parse(mixedOutputs[i]);
      console.log(`✅ 自动解析 ${i + 1}:`, {
        type: 'tool' in result ? 'action' : 'finish',
        content:
          'tool' in result ? `${result.tool}(${result.toolInput})` : result.returnValues?.output,
      });
    } catch (error) {
      console.log(`❌ 自动解析 ${i + 1} 失败:`, error.message);
    }
  }

  console.log('\n---\n');

  // 5. 支持的模型列表
  console.log('5️⃣ 支持的模型列表');
  console.log('支持的模型:', SUPPORTED_MODELS.join(', '));

  console.log('\n---\n');

  // 6. 错误处理演示
  console.log('6️⃣ 错误处理演示');
  const invalidOutput = '这是一个无效的输出格式';

  try {
    await autoParser.parse(invalidOutput);
  } catch (error) {
    console.log('❌ 预期的解析错误:', `${error.message.substring(0, 100)  }...`);
  }

  console.log('\n🎉 基础演示完成！');
}

// LangChain Agent 集成示例
async function demonstrateLangChainIntegration() {
  console.log('\n🔧 LangChain Agent 集成示例\n');

  // 这是一个概念性示例，展示如何正确集成
  const integrationExample = `
// 正确的 LangChain Agent 集成方式

import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { AgentExecutor } from "langchain/agents";
import { formatLogToString } from "langchain/agents";
import { createAutoParser } from 'langchain-react-chinese-parser';

// 1. 创建中文解析器
const parser = createAutoParser({ debug: true });

// 2. 构建 Agent Chain
const agentChain = RunnableSequence.from([
  // 准备输入数据
  RunnablePassthrough.assign({
    agent_scratchpad: (input) => formatLogToString(input.intermediate_steps || [])
  }),
  // 应用提示词模板
  prompt,
  // LLM 推理
  llm,
  // 使用中文解析器
  parser
]);

// 3. 创建 Agent 执行器
const agentExecutor = new AgentExecutor({
  agent: agentChain,
  tools: tools,
  verbose: true,
  maxIterations: 10,
});

// 4. 执行任务
const result = await agentExecutor.invoke({
  input: "请帮我查询北京今天的天气"
});
  `;

  console.log('🔧 集成代码示例:');
  console.log(integrationExample);

  console.log('\n✨ 关键要点:');
  console.log('1. 使用 RunnableSequence 组合 Chain');
  console.log('2. 用 RunnablePassthrough.assign 处理 agent_scratchpad');
  console.log('3. 将解析器作为 Chain 的最后一个环节');
  console.log('4. 推荐使用 createAutoParser() 自动识别格式');
  console.log('5. AgentExecutor 的 agent 参数接受完整的 Chain');
}

// 批量测试不同格式
async function demonstrateFormatVariations() {
  console.log('\n🔍 格式变体测试\n');

  const autoParser = createAutoParser();

  const formatTests = [
    {
      name: '通义千问标准格式',
      output: '思考: 需要搜索\n动作: search\n动作输入: 天气',
    },
    {
      name: '通义千问自然语言格式',
      output: '我将使用search工具来查询北京的天气信息',
    },
    {
      name: 'ChatGLM格式（中文冒号）',
      output: '思考：需要查询\n工具：database\n工具输入：用户信息',
    },
    {
      name: '百川格式',
      output: '思考: 计算数据\n工具: calculator\n工具输入: 1+1',
    },
    {
      name: '文心一言格式',
      output: '思考：需要翻译\n调用工具：translate\n输入：hello',
    },
    {
      name: '英文格式',
      output: 'Thought: need to search\nAction: search\nAction Input: weather',
    },
    {
      name: '中英混合格式',
      output: '思考: need to call tool\nAction: search\n动作输入: Beijing weather',
    },
  ];

  for (const test of formatTests) {
    try {
      const result = await autoParser.parse(test.output);
      console.log(`✅ ${test.name}:`, {
        tool: result.tool,
        input: result.toolInput,
      });
    } catch (error) {
      console.log(`❌ ${test.name}: 解析失败`);
    }
  }
}

// 高级用法演示
async function demonstrateAdvancedUsage() {
  console.log('\n🚀 高级用法演示\n');

  console.log('1️⃣ 自定义关键字配置');
  const customParser = createQwenParser({
    debug: true,
    customKeywords: {
      chinese: {
        action: ['执行', '运行', '调用'],
        actionInput: ['参数', '输入值', '数据'],
      },
    },
  });

  const customOutput = `
思考: 需要执行计算
执行: calculator
参数: 2+3*4
  `;

  try {
    const result = await customParser.parse(customOutput);
    console.log('✅ 自定义关键字解析:', {
      tool: result.tool,
      input: result.toolInput,
    });
  } catch (error) {
    console.log('❌ 自定义解析失败:', error.message);
  }

  console.log('\n2️⃣ 条件解析策略');
  const conditionalParsingExample = `
// 根据模型类型选择解析器
function selectParser(modelType: string) {
  switch (modelType) {
    case 'qwen':
      return createQwenParser();
    case 'chatglm':
      return createChatGLMParser();
    default:
      return createAutoParser();
  }
}

// 在运行时动态选择
const parser = selectParser(process.env.MODEL_TYPE || 'auto');
  `;

  console.log(conditionalParsingExample);

  console.log('\n3️⃣ 错误恢复策略');
  const recoveryExample = `
// 多解析器降级策略
const tryParsers = [
  createQwenParser(),
  createChatGLMParser(),
  createBaichuanParser(),
  createAutoParser()
];

async function parseWithFallback(output: string) {
  for (const parser of tryParsers) {
    try {
      return await parser.parse(output);
    } catch (error) {
      continue; // 尝试下一个解析器
    }
  }
  throw new Error('所有解析器都失败了');
}
  `;

  console.log(recoveryExample);
}

// 运行演示
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateBasicUsage()
    .then(() => demonstrateLangChainIntegration())
    .then(() => demonstrateFormatVariations())
    .then(() => demonstrateAdvancedUsage())
    .catch(console.error);
}
