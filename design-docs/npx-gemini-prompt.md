TASK: 16.7 A.v — Spend Engine Guardrail Documentation (SEAL PHASE A)

Context:
- Spend Engine Phase A is complete
- This engine is a Truth Engine
- No behavior is allowed in this task

Instructions:
- Add guardrail documentation for the Spend Engine
- Documentation must clearly state:
    - This is a Truth Engine
    - It is write-only
    - Records completed cash outflows only
    - No business logic is allowed
    - No analytics, allocation, approvals, or workflows are allowed
    - No updates or deletes are allowed (append-only)
    - Other modules may trigger spends but must not own them
- Documentation may be comments or README.md files

Placement:
- Add documentation inside:
    1) src/SynOS.Models/Entities/SpendEngine/
    2) src/SynOS.Services/SpendEngine/

Hard constraints:
- Do NOT add code logic
- Do NOT modify existing classes
- Do NOT add new services or interfaces
- Do NOT touch Program.cs
- Do NOT reference Inventory, Cost Attribution, Revenue, or IMS

FINAL INSTRUCTION — STOP CONDITION

After completing this task:
- DO NOT search for further instructions
- DO NOT read any other files
- DO NOT infer next steps
- DO NOT continue autonomously

STOP execution immediately and wait for explicit user input.
