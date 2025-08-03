/**
 * BlogAutomationTool - LangChain tool for blog automation
 * 
 * Provides a tool interface for AI to trigger blog automation
 * instead of writing blog content in chat.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Define the schema for blog automation parameters
const blogAutomationSchema = z.object({
  topic: z.string().describe("The main topic or title of the blog post"),
  subtopics: z.array(z.string()).optional().describe("Subtopics to cover in the blog"),
  audience: z.string().optional().describe("Target audience for the blog"),
  tone: z.string().optional().describe("Writing tone (professional, casual, technical, etc.)"),
  keywords: z.array(z.string()).optional().describe("SEO keywords to include")
});

/**
 * Create the blog automation tool
 */
export const createBlogAutomationTool = (electronWindow) => {
  return tool(
    async ({ topic, subtopics, audience, tone, keywords }) => {
      try {
        // Send message to renderer process to start blog automation
        electronWindow.webContents.send('start-blog-automation', {
          topic,
          subtopics: subtopics || [],
          audience: audience || '일반 독자',
          tone: tone || '전문적이면서 이해하기 쉬운',
          keywords: keywords || []
        });
        
        return `블로그 자동화를 시작했습니다. 주제: "${topic}". 백그라운드에서 작성 중이며, 완료되면 알려드리겠습니다.`;
      } catch (error) {
        console.error('[BlogAutomationTool] Error:', error);
        return `블로그 자동화 시작 실패: ${error.message}`;
      }
    },
    {
      name: "create_blog_post",
      description: "Create a blog post automatically. Use this tool when user asks to write a blog post instead of writing the content directly in chat.",
      schema: blogAutomationSchema
    }
  );
};

export default createBlogAutomationTool;