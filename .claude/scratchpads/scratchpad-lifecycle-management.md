# Scratchpad Lifecycle Management Protocol

## 🔄 ITERATION LIFECYCLE MANAGEMENT

### **When to Clear Scratchpads:**

#### **Major Iteration Changes (FULL CLEAR):**
- User starts completely new task/project direction
- Architecture changes affecting multiple modules
- Framework migration or major dependency updates
- Complete workflow pivot (e.g., switching from content features to chat features)

#### **Mid-Iteration Direction Changes (SELECTIVE CLEAR):**
- Task scope significantly changes during implementation
- New requirements conflict with current plans
- Different approach needed based on discovery/research
- Priority shifts requiring different agent coordination

#### **Completion-Based Clearing (AUTOMATIC):**
- All agents report implementation complete
- Code review phase successfully completed
- Quality gates passed and task marked done
- Ready for next iteration cycle

## 🗑️ CLEARING PROTOCOLS

### **Full Clear Protocol:**
```bash
# Clear all agent-specific files but preserve structure
rm -f .claude/scratchpads/*-plan.md
rm -f .claude/scratchpads/*-status.md
rm -f .claude/scratchpads/*-memory.md
echo "# Agent Communication Hub

## Current Coordination Status: RESET - Ready for new iteration

### Active Agent Plans:
- No active plans

### Coordination Messages:
- System reset - Ready for new coordination

### Last Reset: $(date)" > .claude/scratchpads/agent-communication.md
```

### **Selective Clear Protocol:**
```bash
# Clear only plans and current status, preserve memory
rm -f .claude/scratchpads/*-plan.md
rm -f .claude/scratchpads/*-status.md
# Keep *-memory.md for agent learning continuity
echo "# Agent Communication Hub

## Current Coordination Status: DIRECTION CHANGED - Previous plans cleared

### Active Agent Plans:
- Previous plans cleared due to direction change

### Coordination Messages:
- Direction change detected - Agents should create new plans

### Last Direction Change: $(date)" > .claude/scratchpads/agent-communication.md
```

### **Completion Clear Protocol:**
```bash
# Archive current iteration and prepare for next
mkdir -p .claude/scratchpads/archive/$(date +%Y%m%d_%H%M%S)
cp .claude/scratchpads/*-*.md .claude/scratchpads/archive/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true
rm -f .claude/scratchpads/*-plan.md
rm -f .claude/scratchpads/*-status.md
echo "# Agent Communication Hub

## Current Coordination Status: ITERATION COMPLETE - Ready for next task

### Active Agent Plans:
- Previous iteration archived and completed

### Coordination Messages:
- Iteration completed successfully - Ready for new tasks

### Last Completion: $(date)" > .claude/scratchpads/agent-communication.md
```

## 🎯 ORCHESTRATOR CLEARING RESPONSIBILITIES

### **Detection Triggers:**
- User requests completely different task type
- Research reveals need for different approach
- Multiple agents report conflicting coordination
- Implementation failures requiring strategy pivot

### **Decision Matrix:**
```
Situation → Clearing Type:
├── New user request (different domain) → FULL CLEAR
├── Research changes approach → SELECTIVE CLEAR  
├── Task scope expansion → SELECTIVE CLEAR
├── All agents completed successfully → COMPLETION CLEAR
├── Mid-task pivot needed → SELECTIVE CLEAR
└── Architecture change → FULL CLEAR
```

## 📋 AGENT CLEARING AWARENESS

### **All Implementation Agents Must:**
1. **Check for stale plans**: Always verify plan timestamp before implementing
2. **Report conflicts**: If scratchpad data conflicts with current request
3. **Request clearing**: When detecting coordination confusion
4. **Handle cleared state**: Gracefully start fresh when scratchpads are empty

### **Clearing Notification Pattern:**
```markdown
Agent: "나 scratchpad이 비어있거나 오래되었는데, 새로운 계획을 세워야 하나?"
Orchestrator: "맞다, 새로운 방향으로 가니까 새 계획을 세워라"
```

## 🔧 IMPLEMENTATION GUIDELINES

### **Orchestrator Clearing Commands:**
```markdown
## 🗑️ SCRATCHPAD LIFECYCLE MANAGEMENT

**Clearing Decision Tree:**
1. **Assess Change Scope**: Is this a new iteration or direction change?
2. **Determine Clearing Type**: Full, Selective, or Completion clear?
3. **Execute Clearing Protocol**: Run appropriate bash commands
4. **Notify Agents**: Update agent-communication.md with clear status
5. **Verify Clean State**: Ensure all agents start fresh

**Auto-Clear Triggers:**
- User: "let's work on something completely different"
- User: "actually, let's change approach"
- Research: "current plans won't work, need different strategy"
- Multiple agents: "coordination conflicts detected"
```

### **Agent Clearing Awareness:**
```markdown
## 🔄 SCRATCHPAD STATE AWARENESS

**Before Any Implementation:**
1. **Check Scratchpad Timestamps**: Verify plans are current
2. **Validate Coordination Context**: Ensure plans align with current task
3. **Request Clearing if Needed**: Alert orchestrator to stale coordination
4. **Handle Fresh Start**: Gracefully begin new planning when cleared

**Stale Data Detection:**
- Plan files older than current session
- Coordination messages conflict with current request
- Agent-communication.md shows "RESET" or "DIRECTION CHANGED"
- Plans reference modules/features not in current scope
```

## 📊 LIFECYCLE MONITORING

### **Health Indicators:**
- **Fresh State**: Empty plans, recent agent-communication.md
- **Active Coordination**: Current plans, ongoing status updates
- **Stale State**: Old timestamps, conflicting coordination context
- **Completion Ready**: All agents report done, quality gates passed

### **Warning Signs:**
- Agents working on conflicting plans
- Scratchpad data older than 2+ hours
- Multiple "coordination failed" messages
- Plans reference outdated requirements

## 🎯 SUCCESS METRICS

- **Zero Coordination Conflicts**: Agents never work on outdated plans
- **Clean Iteration Boundaries**: Clear separation between task cycles
- **Rapid Direction Changes**: Smooth pivots when requirements change
- **No Stale Data Issues**: All coordination based on current context

This lifecycle management ensures scratchpads enhance coordination without becoming a source of confusion or outdated information.