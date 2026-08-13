import * as vscode from 'vscode';
import * as path from 'path';
import { SemanticSearch } from './SemanticSearch';

export class ToolHandler {
    constructor() {}

    public async executeTool(name: string, input: any): Promise<any> {
        try {
            switch (name) {
                case 'read_file':
                    return await this.readFile(input.path);
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

    private async readFile(filePath: string) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceFolder) throw new Error("No workspace folder open.");
        
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(workspaceFolder, filePath);
        const uri = vscode.Uri.file(absolutePath);
        
        const content = await vscode.workspace.fs.readFile(uri);
        return { success: true, content: Buffer.from(content).toString('utf-8') };
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
}
