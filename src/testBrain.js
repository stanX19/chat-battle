/**
 * testBrain.js
 * Manual test for AI Brain logic fallbacks and sanitization.
 * Run with: node testBrain.js
 */

let nextChatContent = '';

// Mock fetch for brain logic
const fetchMock = async (url) => {
    if (url.includes('/models')) {
        return { ok: true, json: async () => ({ data: [{ id: 'test-model' }] }) };
    }

    if (url.includes('/chat/completions')) {
        return {
            ok: true,
            json: async () => ({
                choices: [
                    {
                        message: {
                            content: nextChatContent
                        }
                    }
                ]
            })
        };
    }

    throw new Error(`Unexpected mock URL: ${url}`);
};

global.fetch = fetchMock;

// Import the brain (needs to be done dynamically if ESM, or just require if CJS)
// Since we are in a ESM project, we use dynamic import
(async () => {
    try {
        const { parseCommand } = await import('./aiBrain.js');
        
        const tests = [
            {
                cmd: "Go up!",
                content: '{"target":"up","dialogue":"Adjusting movement vectors."}',
                expectedTarget: "up"
            },
            {
                cmd: "explore the dungeon",
                content: '{"content":"{\\"target\\":\\"explore\\",\\"dialogue\\":\\"Search for materials and discover the sector.\\"}"}',
                expectedTarget: "explore"
            },
            {
                cmd: "yes",
                context: { pendingConfirmation: true, interruptedAction: 'TRAP_RUN' },
                content: '{"content":{"intent":"CONFIRM","dialogue":"Proceeding."}}',
                expectedTarget: "CONFIRM"
            }
        ];

        console.log("--- STARTING BRAIN FALLBACK TESTS ---");
        for(const t of tests) {
            nextChatContent = t.content;
            const res = await parseCommand(t.cmd, t.context || {});
            const pass = res.target === t.expectedTarget;
            console.log(`[${pass ? 'PASS' : 'FAIL'}] Input: "${t.cmd}" -> Got: "${res.target}" (Expected: "${t.expectedTarget}")`);
            if (!pass) process.exit(1);
        }
        console.log("--- ALL TESTS PASSED ---");
    } catch (err) {
        console.error("Test execution failed:", err);
        process.exit(1);
    }
})();
