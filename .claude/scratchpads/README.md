# Working Scratchpads Directory

This directory contains inter-agent communication files for the hybrid communication model.

## File Structure:

### Agent-Specific Files:
- `{agent-id}-plan.md` - Implementation plans for each agent
- `{agent-id}-status.md` - Current work status and progress
- `{agent-id}-memory.md` - Persistent memory and context

### Shared Communication Files:
- `orchestrator-coordination.md` - Coordination strategy from orchestrator
- `agent-communication.md` - Cross-agent messages and coordination

## Usage Pattern:

1. **Planning Phase**: Agents write plans to `{agent-id}-plan.md`
2. **Coordination**: Orchestrator reads all plans and writes coordination strategy
3. **Implementation**: Agents update status in `{agent-id}-status.md`
4. **Communication**: Cross-agent messages via `agent-communication.md`

This implements the research-backed hybrid communication model for improved agent orchestration.