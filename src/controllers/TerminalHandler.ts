import * as vscode from 'vscode';
import * as cp from 'child_process';
import { promisify } from 'util';

const exec = promisify(cp.exec);

export class TerminalHandler {
    constructor() {}

    public async executeTerminalCommand(command: string): Promise<any> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceFolder) {
            return { error: true, message: "No workspace folder open." };
        }

        // Tier 3 Approval
        const dangerousKeywords = ['rm', 'git push --force', '.env', 'drop'];
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
        } else {
            // Tier 2 Approval
            const userChoice = await vscode.window.showInformationMessage(
                `Agent wants to run command: "${command}".`,
                'Allow', 'Deny'
            );
            if (userChoice !== 'Allow') {
                return { error: true, message: "User denied the execution of this command." };
            }
        }

        try {
            const { stdout, stderr } = await exec(command, { cwd: workspaceFolder, maxBuffer: 1024 * 1024 * 5 });
            return { success: true, stdout, stderr };
        } catch (error: any) {
            return { error: true, message: error.message, stdout: error.stdout, stderr: error.stderr };
        }
    }
}
