# Chat UI Model Selector Update Plan

## Current State Analysis
- LangChainService supports 3 providers: claude, openai, gemini
- Current models in config don't match requested versions
- CSS has provider selector styling but may have alignment issues

## Required Changes

### 1. Update Model Configurations in LangChainService.js
**Current models vs Requested:**
- OpenAI: gpt-4o (current) → GPT-4o (keep same, update display name)
- Gemini: gemini-1.5-pro (current) → Gemini 2.5 Flash (update to newer model)
- Claude: claude-3-5-sonnet-20241022 (current) → Claude 4.0 Sonnet (update display name)

### 2. Update ChatComponent.js Provider Selection Logic
- Already limits to available providers
- Update getProviderIcon() method for better icons
- Update provider display names

### 3. Fix CSS Alignment Issues in app.css
- Check provider-controls styling
- Fix model selector dropdown alignment
- Ensure proper spacing and positioning

## Implementation Steps
1. Update LangChainService provider configs
2. Update ChatComponent provider display logic  
3. Fix CSS styling for provider controls
4. Test functionality

## Expected Outcome
- Only 3 provider options: ChatGPT (GPT-4o), Gemini (2.5 Flash), Claude (4.0 Sonnet)
- Proper alignment and spacing in model selector dropdown
- Clean, professional UI layout