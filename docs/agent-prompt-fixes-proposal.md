# Agent Prompt Fixes Proposal: Implementing Research-Backed Orchestration Patterns

## Executive Summary

Based on the critical orchestration failures identified in `docs/agent-orchestration-reflection.md` and comprehensive research into Claude Code CLI best practices, this document proposes specific fixes to all agent prompts to implement proper agent coordination, communication protocols, and orchestration patterns.

**Key Findings**: The current agent prompts suffer from four critical gaps:
1. **Missing Research-First Protocol** for framework issues
2. **Broken Agent Communication** during planning phases  
3. **No Comprehensive Flow Analysis** after implementations
4. **Structural Architecture Error** with orchestrator as main agent

## 🚨 Critical Issues Identified in Current Agent Prompts

### **Issue 1: Orchestrator Acting as Main Agent**
**Current Problem**: `orchestrator.md` is configured as a main agent trying to call sub-agents, which fails.
**Root Cause**: Claude Code CLI architecture requires main agent to focus on user communication while orchestrator operates as sub-agent for coordination.

### **Issue 2: Missing Mandatory Research Phase**
**Current Problem**: No agent prompts enforce "Framework Issue = Research Required" principle.
**Root Cause**: Agents jump to implementation without Context7 MCP + web search for current best practices.

### **Issue 3: No Agent Planning Coordination Protocol**
**Current Problem**: Agents work in isolation during planning phase.
**Root Cause**: Missing "나 이렇게 고칠 거다" reporting pattern and working scratchpads communication.

### **Issue 4: Missing Working Scratchpads Architecture**
**Current Problem**: No agent uses `.claude/scratchpads/` for inter-agent communication.
**Root Cause**: Current prompts don't mention hybrid communication model (file sharing + verbal output).

### **Issue 5: No Mandatory Code Review Gate**
**Current Problem**: Implementations declared "complete" without comprehensive UX validation.
**Root Cause**: `code-reviewer` agent not automatically triggered after all implementations.

## 🛠️ Research-Backed Solutions & Prompt Fixes

### **Fix 1: Restructure Orchestrator as Sub-Agent**

**Current Orchestrator Prompt Issues:**
- Acts as main agent instead of sub-agent
- Tries to call other sub-agents directly
- Mixes user communication with technical coordination

**Proposed Fix - New Orchestrator Architecture:**
```markdown
## 🎯 CORE PRINCIPLE: Sub-Agent Coordination (NOT Main Agent)

**CRITICAL**: You are a SUB-AGENT, not the main agent. You are called BY the main agent to coordinate other sub-agents.

**Correct Architecture Flow:**
```
Main Agent: User communication & request clarification
     ↓ (calls orchestrator sub-agent)
Orchestrator Sub-Agent: Coordination & delegation  
     ↓ (calls implementation sub-agents)
Implementation Sub-Agents: Specialized work
```

**Your Role as Sub-Agent:**
- Focus PURELY on technical coordination and strategic planning
- Never handle user communication directly
- Receive organized requirements from main agent
- Delegate to implementation sub-agents with precise instructions
- Report coordination results back to main agent
```

### **Fix 2: Implement Mandatory Research-First Protocol**

**Add to ALL Implementation Agent Prompts:**
```markdown
## 🚨 MANDATORY RESEARCH-FIRST PROTOCOL

**CRITICAL RULE**: Any framework-related issue MUST trigger research phase first.

**Framework Issue Auto-Triggers:**
- New library integration (LangChain, etc.)
- Package dependency updates
- Build system changes
- API integration patterns
- ES module compatibility
- Security patterns

**Mandatory Sequence:**
```
Framework Issue Detected → STOP → Research Phase (Context7 MCP + Web Search) → Implementation
```

**Before ANY framework implementation:**
1. Check: Is this framework-related? (If YES → Research required)
2. Call researcher agent for Context7 MCP + web search
3. Wait for research findings
4. Only then proceed with implementation based on current best practices
```

### **Fix 3: Implement Agent Planning Coordination Protocol**

**Add to ALL Implementation Agent Prompts:**
```markdown
## 🤝 MANDATORY PLANNING COORDINATION

**Critical Communication Protocol:**
Before implementing ANY changes, you MUST:

1. **Plan Your Approach**: Create detailed implementation plan
2. **Report to Orchestrator**: "나 이렇게 고칠 거다" pattern
3. **Use Working Scratchpads**: Write plan to `.claude/scratchpads/{your-agent-id}-plan.md`
4. **Wait for Coordination**: Let orchestrator coordinate all agent plans
5. **Receive Coordinated Strategy**: Implement based on orchestrator's coordination

**Working Scratchpads Usage:**
```
.claude/scratchpads/
├── {agent-id}-plan.md          # Your implementation plan
├── {agent-id}-status.md        # Current work status  
├── orchestrator-coordination.md # Coordination strategy
└── agent-communication.md     # Cross-agent messages
```

**Communication Pattern:**
```
You: "나 [module]을 이렇게 고칠 거다: [specific plan]"
Orchestrator: "A는 이렇게, B는 이렇게 해서 전체적으로 이런 방향으로 가자"
You: Implement based on coordinated strategy
```
```

### **Fix 4: Implement Hybrid Communication Model**

**Add to ALL Agent Prompts:**
```markdown
## 📁 HYBRID COMMUNICATION MODEL (Research-Backed)

**Official Anthropic Pattern**: Use BOTH file sharing + verbal output

**File Sharing (Working Scratchpads):**
- Persistent state management via `.claude/scratchpads/*.md`
- Task coordination and status tracking
- Cross-agent data exchange
- "Markdown files as checklist and working scratchpad"

**Verbal Output (Conversational Reporting):**
- Real-time progress updates to orchestrator
- Error handling and completion notifications
- Context isolation per agent
- Orchestrator coordination through conversation

**Combined Result**: 90.2% performance improvement over single-agent

**Your Scratchpad Files:**
- `.claude/scratchpads/{your-agent-id}-memory.md` - Persistent memory
- `.claude/scratchpads/{your-agent-id}-plan.md` - Current implementation plan
- `.claude/scratchpads/{your-agent-id}-status.md` - Work status and progress
- `.claude/scratchpads/agent-communication.md` - Cross-agent messages (shared)
```

### **Fix 5: Implement Mandatory Code Review Gate**

**Add to Orchestrator Prompt:**
```markdown
## 🛡️ MANDATORY QUALITY GATES - NEVER SKIP

**CRITICAL**: NO implementation is complete without comprehensive code review.

**Quality Gate Protocol:**
```
Phase 1: Research & Planning
├── Framework issues → MANDATORY researcher agent first
├── Agent planning coordination via scratchpads
└── Orchestrator coordination: "A는 이렇게, B는 이렇게..."

Phase 2: Implementation
├── Implementation agents execute with coordinated strategy
├── Cross-agent communication via hybrid model
└── Implementation completion reports

Phase 3: MANDATORY VALIDATION (NO EXCEPTIONS)
├── Launch code-reviewer agent AFTER ALL implementations
├── Comprehensive UX flow analysis: "user clicks this but codebase does that"
├── Function-by-function logical validation
└── Integration testing and build validation

Phase 4: Final Approval
├── Review code-reviewer findings
├── Address any issues found
└── ONLY THEN declare implementation complete
```

**Auto-Trigger Code Review:**
- After ANY implementation task completion
- For multi-agent implementations
- When cross-module changes occur
- Before marking TodoWrite tasks as completed
```

**Add to Code-Reviewer Prompt:**
```markdown
## 🚨 CRITICAL UX FLOW ANALYSIS

**Your Mission**: Prevent "user clicks this but codebase does that" scenarios

**Mandatory Analysis:**
1. **Trace Complete User Workflows**: From UI interaction through business logic to data persistence
2. **Function Usage Validation**: Identify unused or logically inconsistent functions
3. **Integration Gap Detection**: Find mismatches between user expectations and implementation
4. **Cross-Component Flow Analysis**: Ensure seamless integration across agent implementations

**UX Flow Questions**: 
- Does the complete user journey make logical sense?
- Are there broken workflows from UI to backend?
- Do all functions serve the intended user experience?
- Are there integration conflicts between agent implementations?

**Report Format**:
"User at [workspace] clicks [button] to [action] but codebase [actual behavior] - [recommendation]"
```

### **Fix 6: Implement Research Agent Framework Protocol**

**Update Researcher Agent Prompt:**
```markdown
## 🔍 FRAMEWORK RESEARCH PROTOCOL

**Auto-Trigger Scenarios:**
- ANY framework integration request (LangChain, new libraries)
- Package dependency updates
- Build system modifications
- Security pattern implementations
- API integration patterns

**Research Methodology:**
1. **Context7 MCP Search**: Current best practices and documentation
2. **Web Search**: Official docs, recent articles, security advisories
3. **Compatibility Analysis**: electron-vite + ES modules architecture
4. **Security Assessment**: contextIsolation and sandboxing implications

**Deliverable Format:**
```markdown
## Framework Research Report: [Library/Framework]

### Executive Summary:
- [Primary findings and recommendations]
- [Critical actions required]
- [Risk assessment and compatibility status]

### Integration Requirements:
- [Specific electron-vite compatibility steps]
- [ES modules integration patterns]
- [Security considerations for contextIsolation]

### Implementation Guidance:
- [Current best practices (2025)]
- [Code examples adapted for project architecture]
- [Common pitfalls and solutions]

### Action Items for Implementation Agents:
- [ ] [Specific steps with Context7-verified patterns]
- [ ] [Security validation requirements]
- [ ] [Testing and validation approaches]
```
```

## 📋 Specific Prompt File Changes Required

### **1. `.claude/agents/orchestrator.md`**
**Critical Changes:**
- Remove main agent positioning, rewrite as sub-agent
- Add working scratchpads coordination protocols
- Implement mandatory research-first triggers
- Add comprehensive quality gates enforcement
- Remove direct coding prohibition (already sub-agent)

### **2. `.claude/agents/researcher.md`**  
**Critical Changes:**
- Add Context7 MCP framework research protocols
- Implement auto-trigger for framework issues
- Add electron-vite + ES modules compatibility analysis
- Create structured framework research deliverable templates

### **3. `.claude/agents/code-reviewer.md`**
**Critical Changes:**
- Add mandatory UX flow analysis patterns
- Implement "user clicks this but codebase does that" detection
- Add comprehensive post-implementation validation
- Create integration gap detection methodology

### **4. ALL Implementation Agent Prompts**
**Universal Changes Needed:**
- Add mandatory research-first protocol
- Implement planning coordination requirements
- Add working scratchpads usage patterns
- Add hybrid communication model
- Add orchestrator reporting requirements
- Add code-reviewer trigger awareness

### **5. `.claude/agents/prompt-engineer.md`**
**Critical Changes:**
- Add responsibility for maintaining working scratchpads structure
- Implement agent prompt synchronization with research findings
- Add codebase structure change detection and prompt updates

## 🎯 Implementation Priority

### **Phase 1: Critical Architecture Fixes (Immediate)**
1. **Fix orchestrator.md**: Restructure as sub-agent, not main agent
2. **Create working scratchpads**: Set up `.claude/scratchpads/` directory structure
3. **Update researcher.md**: Add Context7 MCP framework research protocol
4. **Update code-reviewer.md**: Add mandatory UX flow analysis

### **Phase 2: Communication Protocol Implementation (Week 1)**
1. **Update all implementation agents**: Add planning coordination requirements
2. **Implement hybrid communication**: Working scratchpads + verbal output
3. **Add research-first protocol**: To all framework-related agents
4. **Test coordination workflows**: Validate agent communication patterns

### **Phase 3: Quality Gates & Validation (Week 2)**
1. **Implement mandatory code review**: Auto-trigger after implementations
2. **Add comprehensive flow analysis**: UX validation for all changes
3. **Create integration testing**: Cross-agent output validation
4. **Monitor orchestration success**: Measure failure prevention metrics

## 🧪 Testing & Validation Plan

### **Test Scenarios:**
1. **Framework Integration Test**: Trigger LangChain integration to test research-first protocol
2. **Multi-Agent Coordination Test**: Complex feature requiring 3+ agents
3. **Planning Coordination Test**: Verify "나 이렇게 고칠 거다" reporting pattern
4. **Quality Gate Test**: Ensure code-reviewer auto-triggers after implementations

### **Success Metrics:**
- Zero framework implementations without prior research
- 100% agent planning coordination before implementation
- Mandatory code review completion rate
- Zero "user clicks this but codebase does that" scenarios
- Working scratchpads utilization rate

## 🔄 Migration Strategy

### **Backward Compatibility:**
- Current agent prompts continue working during transition
- Gradual rollout of working scratchpads structure
- Progressive enhancement of coordination protocols

### **Rollback Plan:**
- Keep backup copies of current agent prompts
- Document all changes for easy reversion
- Test new patterns in isolation before full deployment

## 📊 Expected Outcomes

### **Orchestration Improvement Metrics:**
- **Research Coverage**: 100% of framework issues get prior research
- **Communication Quality**: Structured planning coordination
- **Integration Success**: Zero coordination conflicts between agents
- **Quality Assurance**: Comprehensive flow validation for all implementations
- **Architecture Compliance**: Proper main/sub-agent separation

### **Failure Prevention:**
- **Zero Research Gaps**: Framework issues auto-trigger research
- **Zero Communication Breakdowns**: Structured scratchpad coordination
- **Zero Integration Surprises**: Mandatory code review catches UX issues
- **Zero Architecture Violations**: Proper orchestrator/sub-agent relationships

---

**Next Steps**: This proposal should be reviewed and implemented through the prompt-engineer agent with immediate priority on the critical architecture fixes (Phase 1) to prevent continued orchestration failures.