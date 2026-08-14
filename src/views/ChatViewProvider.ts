import * as vscode from 'vscode';
import { AgentController } from '../controllers/AgentController';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'customizedcodingsupport.chatView';
    private _view?: vscode.WebviewView;
    private agentController: AgentController;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _history: any[] = [];

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
        this.agentController = new AgentController();
        
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('customizedcodingsupport.modelId')) {
                const newModelId = vscode.workspace.getConfiguration('customizedcodingsupport').get<string>('modelId');
                if (this._view) {
                    this._view.webview.postMessage({ type: 'config_updated', modelId: newModelId });
                }
            }
        }, null, this._disposables);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'dist')]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, this._extensionUri);
        
        const initialModelId = vscode.workspace.getConfiguration('customizedcodingsupport').get<string>('modelId');
        setTimeout(() => {
            webviewView.webview.postMessage({ type: 'config_updated', modelId: initialModelId });
        }, 500);

        webviewView.webview.onDidReceiveMessage(
            async (data) => {
                switch (data.type) {
                    case 'prompt':
                        const abortController = new AbortController();
                        this._history = await this.agentController.runAgentLoop(
                            data.value,
                            data.imageBase64,
                            data.modelId,
                            this._history,
                            [],
                            abortController.signal,
                            (text) => {
                                webviewView.webview.postMessage({ type: 'stream_text', value: text });
                            },
                            data.maxIterations
                        );
                        webviewView.webview.postMessage({ type: 'stream_end' });
                        break;
                    case 'clear_chat':
                        this._history = [];
                        break;
                    case 'openSettings':
                        vscode.commands.executeCommand('workbench.action.openSettings', 'customizedcodingsupport');
                        break;
                }
            },
            undefined,
            this._disposables
        );
    }



    private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.css'));

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <title>CustomizedCodingSupport Chat</title>
        </head>
        <body>
            <div id="root"></div>
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}
