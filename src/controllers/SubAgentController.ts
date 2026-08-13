import { AgentController } from './AgentController';
import * as vscode from 'vscode';

export class SubAgentController {
    /**
     * Khởi chạy một Sub-Agent chuyên trách.
     * @param role Vai trò (research, browser, tester)
     * @param task Nhiệm vụ cụ thể
     * @param onStream Hàm callback để hiển thị log lên UI (tùy chọn)
     * @returns Kết quả báo cáo cuối cùng của Sub-Agent
     */
    public static async spawn(role: string, task: string, onStream?: (text: string) => void): Promise<string> {
        const controller = new AgentController();
        const abortController = new AbortController();
        
        const rolePrompts: Record<string, string> = {
            'research': "You are a Research Sub-Agent. Your task is to investigate the codebase, find architectural patterns, and return a comprehensive report.",
            'browser': "You are a Browser Sub-Agent. Your task is to automate browser actions using the browser_action tool and report the results or errors.",
            'tester': "You are a Testing Sub-Agent. Your task is to write and run tests, and fix code if it fails."
        };
        
        const systemPrompt = rolePrompts[role.toLowerCase()] || `You are a Sub-Agent specialized in: ${role}`;
        
        let report = "";
        const mockStream = (text: string) => {
            report += text;
            if (onStream) {
                onStream(`\n[Sub-Agent ${role}]: ${text}`);
            }
        };

        try {
            // Mượn runAgentLoop của AgentController để chạy
            // Nhưng truyền system prompt dưới dạng history giả (hoặc inject vào task)
            const prompt = `System Instructions: ${systemPrompt}\n\nYour Task:\n${task}\n\nDo not ask for user input. Execute the task using your tools and return a final summary report.`;
            
            await controller.runAgentLoop(
                prompt,
                undefined,
                "", // Use default model
                [], // Empty history
                [], // Empty system prompts
                abortController.signal,
                mockStream
            );

            return `\n\n--- BÁO CÁO TỪ SUB-AGENT (${role}) ---\n${report}`;
        } catch (error: any) {
            return `\n\n[Lỗi Sub-Agent ${role}]: ${error.message}`;
        }
    }
}
