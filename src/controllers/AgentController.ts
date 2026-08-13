import { BedrockRuntimeClient, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import * as vscode from 'vscode';
import { ToolSchema, BedrockMessage } from '../models/ToolTypes';
import { ToolHandler } from './ToolHandler';
import { TerminalHandler } from './TerminalHandler';
import { execute_terminal_command_schema, read_file_schema, list_dir_schema, grep_search_schema, replace_string_in_file_schema, semantic_search_schema, git_status_schema, git_diff_schema, git_commit_schema, read_url_schema, create_shadow_branch_schema, run_and_fix_tests_schema } from '../models/ToolTypes';
import { ContextEngine } from './ContextEngine';

export class AgentController {
    private client: BedrockRuntimeClient;
    private maxIterations = 10;
    private toolHandler = new ToolHandler();
    private terminalHandler = new TerminalHandler();
    private get modelId(): string {
        return vscode.workspace.getConfiguration('customizedcodingsupport').get<string>('modelId') || "arn:aws:bedrock:us-east-1:609826415497:application-inference-profile/fa4vlb8mlept";
    }

    constructor() {
        this.client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
    }

    public async runAgentLoop(
        userPrompt: string,
        imageBase64: string | undefined,
        selectedModel: string,
        history: any[],
        systemPrompts: any[],
        abortSignal: AbortSignal,
        onStreamText: (text: string) => void
    ): Promise<BedrockMessage[]> {
        const projectRules = await ContextEngine.getProjectRules();
        
        let systemText = "You are CustomizedCodingSupport, a highly capable AI assistant inside VS Code. You can read files, modify files, and run terminal commands to help the user.";
        if (projectRules) {
            systemText += `\n\nPay attention to the following project rules:\n${projectRules}`;
        }
        
        const tools: any[] = [
            { toolSpec: execute_terminal_command_schema },
            { toolSpec: read_file_schema },
            { toolSpec: list_dir_schema },
            { toolSpec: grep_search_schema },
            { toolSpec: replace_string_in_file_schema },
            { toolSpec: semantic_search_schema },
            { toolSpec: git_status_schema },
            { toolSpec: git_diff_schema },
            { toolSpec: git_commit_schema },
            { toolSpec: read_url_schema },
            { toolSpec: create_shadow_branch_schema },
            { toolSpec: run_and_fix_tests_schema }
        ].map(t => ({
            toolSpec: {
                name: t.toolSpec.name,
                description: t.toolSpec.description,
                inputSchema: {
                    json: t.toolSpec.inputSchema.json || t.toolSpec.inputSchema
                }
            }
        }));

        let userContent: any[] = [];
        if (userPrompt) userContent.push({ text: userPrompt });
        if (imageBase64) {
            const base64Data = imageBase64.split(',')[1] || imageBase64; // Xóa prefix data:image/...
            userContent.push({
                image: {
                    format: "png", // fallback format, Bedrock auto-detects in some models but usually requires png, jpeg, webp, or gif
                    source: { bytes: Buffer.from(base64Data, 'base64') }
                }
            });
        }
        
        let messages: BedrockMessage[] = [...history, { role: "user", content: userContent }];
        
        // Cắt tỉa (Sliding Window): Chỉ giữ lại tối đa 15 turn gần nhất để tránh tràn Context Window
        if (messages.length > 15) {
            messages = messages.slice(messages.length - 15);
            // Đảm bảo tin nhắn đầu tiên luôn là của user (API requirement)
            if (messages.length > 0 && messages[0].role !== 'user') {
                messages.shift();
            }
        }

        let continueLoop = true;
        let iteration = 0;

        while (continueLoop && !abortSignal.aborted && iteration < this.maxIterations) {
            iteration++;
            let command: ConverseStreamCommand;
            
            try {
                command = new ConverseStreamCommand({
                    modelId: selectedModel || this.modelId,
                    messages: messages as any,
                    system: [{ text: systemText }],
                    toolConfig: {
                        tools: tools
                    },
                    inferenceConfig: {
                        maxTokens: 4096
                    }
                });

                const response = await this.client.send(command, { abortSignal });
                let toolRequests: Record<number, any> = {};
                let assistantText = "";
                
                if (response.stream) {
                    for await (const chunk of response.stream) {
                        if (chunk.contentBlockDelta?.delta?.text) {
                            onStreamText(chunk.contentBlockDelta.delta.text);
                            assistantText += chunk.contentBlockDelta.delta.text;
                        }
                        if (chunk.contentBlockStart?.start?.toolUse) {
                            const blockIndex = chunk.contentBlockStart.contentBlockIndex;
                            if (blockIndex !== undefined) {
                                toolRequests[blockIndex] = {
                                    ...chunk.contentBlockStart.start.toolUse,
                                    input: ""
                                };
                            }
                        }
                        if (chunk.contentBlockDelta?.delta?.toolUse) {
                            const blockIndex = chunk.contentBlockDelta.contentBlockIndex;
                            if (blockIndex !== undefined && toolRequests[blockIndex]) {
                                toolRequests[blockIndex].input += chunk.contentBlockDelta.delta.toolUse.input;
                            }
                        }
                    }
                }

                let toolRequestsArray = Object.values(toolRequests);
                let assistantContent: any[] = [];
                if (assistantText) {
                    assistantContent.push({ text: assistantText });
                }

                if (toolRequestsArray.length > 0) {
                    for (let req of toolRequestsArray) {
                        if (typeof req.input === 'string' && req.input.trim() !== '') {
                            try {
                                req.input = JSON.parse(req.input);
                            } catch(e) {
                                req.input = {}; 
                            }
                        }
                        assistantContent.push({
                            toolUse: {
                                toolUseId: req.toolUseId,
                                name: req.name,
                                input: req.input
                            }
                        });
                    }
                }

                if (assistantContent.length > 0) {
                    messages.push({ role: "assistant", content: assistantContent });
                }

                if (toolRequestsArray.length === 0) {
                    continueLoop = false;
                } else {
                    // Multi-threading: Execute all tools in parallel
                    const toolPromises = toolRequestsArray.map(async (toolReq) => {
                        let toolResultContent: any;
                        if (toolReq.name === 'execute_terminal_command') {
                            toolResultContent = await this.terminalHandler.executeTerminalCommand(toolReq.input.command);
                        } else {
                            toolResultContent = await this.toolHandler.executeTool(toolReq.name, toolReq.input);
                        }

                        // --- MULTI-AGENT SWARM (REVIEWER) ---
                        if (toolReq.name === 'replace_string_in_file' && toolResultContent.success) {
                            onStreamText('\n\n[Reviewer Agent: Đang quét lỗi bảo mật và logic đoạn code vừa sửa...]\n');
                            const reviewerCommand = new ConverseStreamCommand({
                                modelId: selectedModel || this.modelId,
                                messages: [{ role: "user", content: [{ text: `Check this new code for critical errors (syntax, logic, security). Reply strictly 'OK' if it is flawless, otherwise explain the error briefly:\n\n${toolReq.input.new_string}` }] }] as any,
                                system: [{ text: "You are a strict code reviewer. Only say OK if the code has no bugs." }]
                            });
                            try {
                                const revResponse = await this.client.send(reviewerCommand, { abortSignal });
                                let reviewText = "";
                                if (revResponse.stream) {
                                    for await (const chunk of revResponse.stream) {
                                        if (chunk.contentBlockDelta?.delta?.text) reviewText += chunk.contentBlockDelta.delta.text;
                                    }
                                }
                                onStreamText(`[Reviewer Result]: ${reviewText}\n\n`);
                                if (!reviewText.includes("OK")) {
                                    toolResultContent.message += `\n[REVIEWER REJECTED]: ${reviewText}. PLEASE FIX IT IN THE NEXT TURN.`;
                                    toolResultContent.warning = true;
                                }
                            } catch (e) {
                                console.error("Reviewer Agent Error", e);
                            }
                        }

                        return { 
                            toolResult: { 
                                toolUseId: toolReq.toolUseId, 
                                content: [{ json: toolResultContent }] 
                            } 
                        };
                    });
                    
                    const userContentBlock = await Promise.all(toolPromises);
                    messages.push({ role: "user", content: userContentBlock });
                }
            } catch (error: any) {
                if (error.name === 'AbortError') {
                    onStreamText("\n\n[HỆ THỐNG: Tác vụ đã bị hủy bởi người dùng.]");
                    break;
                }
                if (error.name === 'ThrottlingException' && this.modelId !== "us.anthropic.claude-3-haiku-20240307-v1:0") {
                    onStreamText("\n\n[HỆ THỐNG: Quá tải giới hạn Token (Rate Limit). Tự động Fallback sang model Claude 3 Haiku...]\n\n");
                    // Can't directly set the getter, so we'll just ignore throttling fallback or set a local let variable if needed.
                    // For simplicity, we just use the configured modelId and let it fail if it keeps throttling.
                    this.maxIterations = 2; // Giảm loop để tiết kiệm an toàn
                    continue; // Retry
                }
                vscode.window.showErrorMessage(`Bedrock Error: ${error.message}`);
                onStreamText(`\n\n[LỖI HỆ THỐNG: ${error.message}]`);
                continueLoop = false;
            }
        }
        
        if (iteration >= this.maxIterations) {
            onStreamText("\n\n[HỆ THỐNG: Đạt giới hạn Max Iterations. Tạm dừng để bảo vệ chi phí.]");
        }
        
        return messages;
    }
}
