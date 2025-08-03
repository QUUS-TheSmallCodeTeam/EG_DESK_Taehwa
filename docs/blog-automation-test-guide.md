# Blog Automation Test Guide

## Overview
This guide explains how to test the integrated WordPress blog automation workflow in the EG-Desk:Taehwa application.

## Prerequisites

1. **API Keys**: Ensure you have at least one AI provider API key configured (Claude, OpenAI, or Gemini)
2. **WordPress Credentials**: You need WordPress credentials for m8chaa.mycafe24.com
   - Username: Your WordPress username
   - Password: Application Password (recommended) or regular password

## Testing Steps

### 1. Start the Application
```bash
yarn dev
```

### 2. Switch to Blog Automation Workspace
- Click on "🤖 블로그자동화" button on the start screen
- The workspace will load with browser and chat components

### 3. Select AI Provider
- In the chat header, select your preferred AI provider (Claude, OpenAI, or Gemini)
- Make sure the provider has a valid API key configured

### 4. Test Blog Commands

#### Create a New Blog Post
Type one of these commands in the chat:

**Slash Command:**
```
/blog new
```

**Natural Language (Korean):**
```
태화트랜스 로고스키 코일에 대한 블로그 글 써줘
```

```
전류센서 기술 동향에 대한 글 작성해줘
```

```
SEO 키워드 '전기센서'로 최적화된 글 만들어줘
```

#### Follow the Workflow
1. **Requirements Gathering**: The system will ask about your blog topic and requirements
2. **Outline Generation**: AI will create a structured outline
3. **Content Generation**: Full content will be generated based on the outline
4. **Review**: You can review and request edits
5. **Publishing**: Approve and publish to WordPress

### 5. Available Commands

- `/blog new` - Start a new blog post
- `/blog publish` - Publish the current draft
- `/blog list` - Show saved drafts
- `/blog status` - Check workflow status
- `/blog help` - Show help information

### 6. WordPress Publishing

When ready to publish:

1. Make sure you have WordPress credentials saved
2. Use `/blog publish` or click the "게시하기" button
3. The system will:
   - Create the post via WordPress REST API
   - Set categories and tags
   - Add SEO metadata
   - Return the published URL

### 7. Test Scenarios

#### Basic Blog Creation
```
User: /blog new
AI: 블로그 주제를 알려주세요. 어떤 내용을 다루고 싶으신가요?
User: 로고스키 코일의 장점과 응용 분야
AI: [Generates outline]
User: 승인
AI: [Generates content]
User: /blog publish
```

#### SEO-Focused Content
```
User: SEO 키워드 '전류 측정'으로 최적화된 블로그 글 작성해줘
AI: [Starts workflow with SEO focus]
```

#### Product-Specific Content
```
User: 태화트랜스 영상변류기의 특징을 설명하는 블로그 글 써줘
AI: [Creates product-focused content]
```

## Troubleshooting

### API Key Not Configured
- Error: "Claude API 키가 설정되지 않았습니다"
- Solution: Add your API key in the settings

### WordPress Connection Failed
- Check your credentials
- Ensure you're using an Application Password (not regular password)
- Verify the WordPress site is accessible

### Content Generation Issues
- Try switching to a different AI provider
- Check your internet connection
- Ensure you have sufficient API credits

## WordPress Credentials Setup

1. Log in to WordPress admin: https://m8chaa.mycafe24.com/wp-admin
2. Go to Users → Your Profile
3. Scroll to "Application Passwords"
4. Create a new application password
5. Use this password with your username in the blog automation

## Expected Results

After successful blog creation and publishing:
- Post appears on WordPress site
- You receive a confirmation with the post URL
- Post includes proper SEO metadata
- Categories and tags are properly assigned

## Notes

- All generated content is in Korean by default
- Content is optimized for the electrical sensor industry
- SEO optimization includes Korean keyword targeting
- Drafts are automatically saved for later editing