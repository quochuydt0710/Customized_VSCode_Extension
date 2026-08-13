import * as vscode from 'vscode';
import * as path from 'path';
import { SemanticSearch } from './SemanticSearch';

export class ToolHandler {
    constructor() {}

    public async executeTool(name: string, input: any): Promise<any> {
        try {
            switch (name) {
                case 'read_file':
                    return await this.readFile(input.path, input.start_line, input.end_line);
                case 'write_file':
                    return await this.writeFile(input.path, input.content);
                case 'list_dir':
                    return await this.listDir(input.path);
                case 'grep_search':
                    return await this.grepSearch(input.path, input.query);
                case 'semantic_search':
                    return await SemanticSearch.search(input.query);
                case 'replace_string_in_file':
                    return await this.replaceStringInFile(input.path, input.oldString, input.newString);
                case 'git_status':
                    return await this.runCommand('git status');
                case 'git_diff':
                    return await this.runCommand('git diff');
                case 'git_commit':
                    return await this.runCommand(`git add . && git commit -m "${input.message}"`);
                case 'read_url':
                    return await this.readUrl(input.url);
                case 'web_search':
                    return await this.webSearch(input.query);
                case 'browser_action':
                    return await this.browserAction(input.action, input);
                case 'mcp_request':
                    return await this.mcpRequest(input.server, input.action, input.params);
                case 'create_shadow_branch':
                    return await this.runCommand(`git checkout -b ${input.branch_name}`);
                case 'run_and_fix_tests':
                    return await this.runTestCommand(input.command);
                default:
                    return { error: true, message: `Tool ${name} not found in ToolHandler` };
            }
        } catch (error: any) {
            return { error: true, message: error.message };
        }
    }

    private async readFile(filePath: string, startLine?: number, endLine?: number) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceFolder) throw new Error("No workspace folder open.");
        
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(workspaceFolder, filePath);
        const uri = vscode.Uri.file(absolutePath);
        
        const content = await vscode.workspace.fs.readFile(uri);
        let text = Buffer.from(content).toString('utf-8');

        if (startLine !== undefined || endLine !== undefined) {
            const lines = text.split('\n');
            const start = startLine !== undefined ? Math.max(0, startLine - 1) : 0;
            const end = endLine !== undefined ? Math.min(lines.length, endLine) : lines.length;
            text = lines.slice(start, end).map((line, index) => `${start + index + 1}: ${line}`).join('\n');
        }

        return { success: true, content: text };
    }

    private async listDir(dirPath: string) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceFolder) throw new Error("No workspace folder open.");
        
        const absolutePath = path.isAbsolute(dirPath) ? dirPath : path.join(workspaceFolder, dirPath);
        const uri = vscode.Uri.file(absolutePath);
        
        const entries = await vscode.workspace.fs.readDirectory(uri);
        return { 
            success: true, 
            files: entries.map(e => ({ name: e[0], type: e[1] === vscode.FileType.Directory ? 'dir' : 'file' })) 
        };
    }

    private async grepSearch(dirPath: string, query: string) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceFolder) throw new Error("No workspace folder open.");
        
        const absolutePath = path.isAbsolute(dirPath) ? dirPath : path.join(workspaceFolder, dirPath);
        
        const relativePath = path.relative(workspaceFolder, absolutePath);
        const pattern = new vscode.RelativePattern(workspaceFolder, `${relativePath}/**/*`);
        
        const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
        let results = [];
        
        for (const file of files.slice(0, 10)) {
            const content = await vscode.workspace.fs.readFile(file);
            const text = Buffer.from(content).toString('utf-8');
            if (new RegExp(query, 'g').test(text)) {
                results.push(file.fsPath);
            }
        }
        
        return { success: true, matched_files: results, note: "Showing max 10 files for safety." };
    }

    private async replaceStringInFile(filePath: string, oldString: string, newString: string) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceFolder) throw new Error("No workspace folder open.");
        
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(workspaceFolder, filePath);
        const uri = vscode.Uri.file(absolutePath);
        
        const document = await vscode.workspace.openTextDocument(uri);
        const content = document.getText();
        
        const startIndex = content.indexOf(old_string);
        if (startIndex === -1) {
            return { error: true, message: "Target old_string not found in file. Ensure exact match including whitespace." };
        }

        const range = new vscode.Range(
            document.positionAt(startIndex),
            document.positionAt(startIndex + oldString.length)
        );

        // --- LIVE STREAMING DIFF ---
        const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uri.toString());
        if (editor) {
            await editor.edit(editBuilder => editBuilder.delete(range));
            let currentPos = range.start;
            const chunks = newString.match(/.{1,10}/g) || []; // Type 10 chars at a time
            for (const chunk of chunks) {
                await new Promise(resolve => setTimeout(resolve, 20)); // Delay for typing effect
                await editor.edit(editBuilder => editBuilder.insert(currentPos, chunk));
                // Move position (rough approximation for typing)
                const textSoFar = document.getText();
                currentPos = document.positionAt(textSoFar.indexOf(newString) !== -1 ? textSoFar.indexOf(newString) + chunk.length : startIndex + chunk.length); 
            }
        } else {
            const edit = new vscode.WorkspaceEdit();
            edit.replace(uri, range, newString);
            await vscode.workspace.applyEdit(edit);
        }
        
        await vscode.window.showTextDocument(document, { preview: true });

        const fileName = path.basename(absolutePath);
        const choice = await vscode.window.showInformationMessage(
            `Agent wants to modify ${fileName}. Keep changes?`, 
            { modal: true }, 
            'Keep', 'Reject'
        );

        if (choice === 'Reject') {
            await vscode.commands.executeCommand('undo');
            return { error: true, message: "User rejected the change." };
        }

        // Auto-Linter Self-Correction
        await new Promise(resolve => setTimeout(resolve, 500)); // Chờ Linter chạy
        const diagnostics = vscode.languages.getDiagnostics(uri);
        const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
        if (errors.length > 0) {
            const errorMsgs = errors.map(e => `Line ${e.range.start.line + 1}: ${e.message}`).join("\n");
            return { 
                warning: true, 
                message: `Code replaced successfully, BUT caused the following LINTER ERRORS:\n${errorMsgs}\nPlease fix them immediately.` 
            };
        }

        return { success: true, message: "Code replaced successfully." };
    }

    private async runCommand(command: string): Promise<any> {
        const dangerousKeywords = ['rm -rf', 'git push --force', 'drop database'];
        const isDangerous = dangerousKeywords.some(kw => command.includes(kw));

        if (isDangerous) {
            const userChoice = await vscode.window.showWarningMessage(
                `Agent wants to run a dangerous command: "${command}". Do you allow this?`,
                { modal: true },
                'Allow', 'Deny'
            );

            if (userChoice !== 'Allow') {
                return { error: true, message: "User denied the execution of this dangerous command." };
            }
        }
        
        return new Promise((resolve) => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) return resolve({ error: "No workspace open." });
            
            require('child_process').exec(command, { cwd: workspaceFolders[0].uri.fsPath }, (err: any, stdout: string, stderr: string) => {
                if (err) return resolve({ error: err.message, stderr });
                resolve({ stdout });
            });
        });
    }

    private async readUrl(url: string): Promise<any> {
        try {
            const response = await fetch(url);
            const html = await response.text();
            // Lọc cơ bản HTML tag
            const text = html.replace(/<[^>]*>?/gm, '');
            return { content: text.substring(0, 5000) }; // Giới hạn 5000 ký tự
        } catch (err: any) {
            return { error: err.message };
        }
    }

    private async runTestCommand(command: string): Promise<any> {
        return new Promise((resolve) => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) return resolve({ error: "No workspace open." });
            
            require('child_process').exec(command, { cwd: workspaceFolders[0].uri.fsPath }, (err: any, stdout: string, stderr: string) => {
                if (err) {
                    return resolve({ 
                        warning: true, 
                        message: `Test Failed!\nError Code: ${err.code}\nOutput:\n${stdout}\n${stderr}\nPlease self-heal (fix the code) and run tests again.` 
                    });
                }
                resolve({ success: true, message: `All tests passed!\n${stdout}` });
            });
        });
    }

    private async writeFile(filePath: string, content: string) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceFolder) throw new Error("No workspace folder open.");
        
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(workspaceFolder, filePath);
        const uri = vscode.Uri.file(absolutePath);
        
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document, { preview: true });
        
        return { success: true, message: `File created/written successfully at ${absolutePath}` };
    }

    private async webSearch(query: string) {
        try {
            // Using a simple HTML scraping from DuckDuckGo HTML version if duckduckgo-search is not available
            const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            const html = await response.text();
            
            // Basic regex to extract snippets
            const results = [];
            const snippetRegex = /<a class="result__url" href="([^"]+)">.*?<a class="result__snippet[^>]*>(.*?)<\/a>/gs;
            let match;
            let count = 0;
            while ((match = snippetRegex.exec(html)) !== null && count < 5) {
                results.push({ url: match[1], snippet: match[2].replace(/<[^>]*>?/gm, '').trim() });
                count++;
            }
            if (results.length === 0) return { warning: true, message: "No search results found or duckduckgo layout changed." };
            return { success: true, results };
        } catch (error: any) {
            return { error: true, message: `Web search failed: ${error.message}` };
        }
    }

    private async browserAction(action: string, params: any) {
        try {
            const { chromium } = require('playwright');
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            let result: any = { success: true };
            const logs: string[] = [];
            
            page.on('console', (msg: any) => logs.push(`[Console] ${msg.type()}: ${msg.text()}`));
            page.on('pageerror', (err: any) => logs.push(`[PageError] ${err.message}`));

            if (action === 'goto' && params.url) {
                await page.goto(params.url);
                await page.waitForTimeout(500); // Wait briefly to catch logs
                result.title = await page.title();
            } else if (action === 'screenshot') {
                if (params.url) await page.goto(params.url);
                const buffer = await page.screenshot({ fullPage: true });
                result.screenshot = "data:image/png;base64," + buffer.toString('base64');
            } else if (action === 'click' && params.selector) {
                if (params.url) await page.goto(params.url);
                await page.click(params.selector);
                await page.waitForTimeout(500);
                result.message = `Clicked on ${params.selector}`;
            } else if (action === 'type' && params.selector && params.text) {
                if (params.url) await page.goto(params.url);
                await page.type(params.selector, params.text);
                result.message = `Typed text into ${params.selector}`;
            } else {
                result = { error: true, message: "Invalid browser action or missing parameters." };
            }
            
            if (logs.length > 0) {
                result.console_logs = logs;
            }
            
            await browser.close();
            return result;
        } catch (error: any) {
            if (error.code === 'MODULE_NOT_FOUND') {
                return { error: true, message: "Playwright is not installed. Run 'npm install playwright' in the workspace first." };
            }
            return { error: true, message: `Browser action failed: ${error.message}` };
        }
    }

    private async mcpRequest(server: string, action: string, params: any) {
        return { warning: true, message: "MCP Request is a stub. Full integration requires MCP Client SDK." };
    }
}
