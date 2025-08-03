// Test script to verify agent executor functionality
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { HumanMessage } from "@langchain/core/messages";

// Mock blog tool
const blogSchema = z.object({
  topic: z.string().describe("The main topic or title of the blog post"),
  subtopics: z.array(z.string()).optional().describe("Subtopics to cover in the blog"),
  audience: z.string().optional().describe("Target audience for the blog"),
  tone: z.string().optional().describe("Writing tone (professional, casual, technical, etc.)"),
  keywords: z.array(z.string()).optional().describe("SEO keywords to include")
});

const blogAutomationTool = tool(
  async ({ topic, subtopics, audience, tone, keywords }) => {
    console.log('🚀 [BlogAutomationTool] Called with:', { topic, subtopics, audience, tone, keywords });
    return `✅ Blog automation completed! Topic: "${topic}". The blog has been generated and is ready for publishing.`;
  },
  {
    name: "create_blog_post",
    description: "MUST use this tool when user asks to write a blog, post, or article. Do NOT write blog content in chat. This tool automatically creates title, content, images and publishes to WordPress.",
    schema: blogSchema
  }
);

async function testAgentExecutor() {
  console.log('🧪 Testing agent executor...\n');
  
  // Initialize OpenAI
  const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o",
    temperature: 0.7
  });
  
  // Create prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an AI assistant for 태화트랜스 (Taehwa Trans), specializing in electrical sensors and blog automation.

IMPORTANT RULES:
1. When a user asks you to write a blog, article, or post, you MUST use the create_blog_post tool.
2. Do NOT write blog content directly in the chat.
3. The create_blog_post tool will handle all aspects of blog creation including title, content, images, and publishing.
4. After using the tool, report the result to the user.

Available tool:
- create_blog_post: Use this to create and publish blog posts automatically.

Examples of when to use the tool:
- "블로그 글 써줘"
- "스마트그리드에 대한 블로그 작성해줘"
- "Write a blog about Rogowski coils"
- "새로운 포스트 만들어줘"`
    ],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad")
  ]);
  
  // Create agent
  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools: [blogAutomationTool],
    prompt
  });
  
  // Create agent executor
  const agentExecutor = new AgentExecutor({
    agent,
    tools: [blogAutomationTool],
    verbose: true,
    returnIntermediateSteps: true
  });
  
  // Test cases
  const testCases = [
    "블로그 글 써줘",
    "스마트그리드에 대한 블로그 작성해줘",
    "안녕하세요! 오늘 날씨가 좋네요.",
    "로고스키 코일의 장점에 대한 포스트 만들어줘"
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: "${testCase}"`);
    console.log('─'.repeat(50));
    
    try {
      const result = await agentExecutor.invoke({
        input: testCase,
        chat_history: []
      });
      
      console.log('📤 Response:', result.output);
      if (result.intermediateSteps && result.intermediateSteps.length > 0) {
        console.log('🛠️ Tool was used!');
      } else {
        console.log('💬 Regular chat response (no tool used)');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Run test
testAgentExecutor().then(() => {
  console.log('\n✅ Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});