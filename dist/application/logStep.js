export async function logStep(storage, sessionId, action, implications) {
    await storage.insertStep(sessionId, action, implications);
    return {
        content: [{ type: "text", text: "Step registrado." }],
    };
}
//# sourceMappingURL=logStep.js.map