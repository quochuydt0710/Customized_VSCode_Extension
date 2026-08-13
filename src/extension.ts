import * as vscode from 'vscode';
import { ChatViewProvider } from './views/ChatViewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('CustomizedCodingSupport Extension is now active!');

    const provider = new ChatViewProvider(context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ChatViewProvider.viewType, 
            provider,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    let disposable = vscode.commands.registerCommand('customizedcodingsupport.startChat', () => {
        vscode.commands.executeCommand('customizedcodingsupport.chatView.focus');
    });

    let terminalDisposable = vscode.commands.registerCommand('customizedcodingsupport.sendTerminalSelection', async () => {
        await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
        const text = await vscode.env.clipboard.readText();
        if (text) {
            vscode.window.showInformationMessage("Đã gửi lỗi Terminal vào CustomizedCodingSupport!");
            // In a full implementation, we'd send 'text' directly to the ChatPanel's agent loop
        }
    });

    context.subscriptions.push(disposable, terminalDisposable);
}

export function deactivate() {}
