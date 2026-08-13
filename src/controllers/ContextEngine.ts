import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ContextEngine {
    
    /**
     * Tự động quét các file cấu hình AI phổ biến tại thư mục gốc
     * Trả về đoạn text gộp lại để thêm vào System Prompt.
     */
    public static async getProjectRules(): Promise<string> {
        let rulesText = "";

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return rulesText;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        
        const ruleFiles = [
            '.clauderc',
            'CLAUDE.md',
            '.cursorrules',
            '.customizedcodingsupportrules'
        ];

        for (const filename of ruleFiles) {
            const filePath = path.join(rootPath, filename);
            if (fs.existsSync(filePath)) {
                try {
                    const content = await fs.promises.readFile(filePath, 'utf-8');
                    rulesText += `\n--- PROJECT RULES FROM ${filename} ---\n${content}\n`;
                } catch (err) {
                    console.error(`Error reading ${filename}`, err);
                }
            }
        }

        return rulesText;
    }
}
