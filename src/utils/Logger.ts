import * as vscode from 'vscode';

export class Logger {
    private static outputChannel: vscode.OutputChannel;

    public static init() {
        if (!this.outputChannel) {
            this.outputChannel = vscode.window.createOutputChannel('CustomizedCodingSupport');
        }
    }

    public static log(message: string) {
        this.init();
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    public static error(message: string, error?: any) {
        this.init();
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ERROR: ${message}`);
        if (error) {
            this.outputChannel.appendLine(String(error));
        }
    }
}
