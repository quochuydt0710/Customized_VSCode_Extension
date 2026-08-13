import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import Parser from 'web-tree-sitter';

export class ASTParser {
    private static isInitialized = false;
    private static languageCache: Map<string, Parser.Language> = new Map();

    public static async init(extensionUri: vscode.Uri) {
        if (this.isInitialized) return;

        // In production extension, __dirname is the dist folder
        const wasmDir = vscode.Uri.joinPath(extensionUri, 'dist', 'wasm').fsPath;

        await Parser.init({
            locateFile: (scriptName: string, _scriptDirectory: string) => {
                return path.join(wasmDir, scriptName);
            }
        });
        
        this.isInitialized = true;
    }

    private static getWasmPathForLanguage(ext: string): string {
        switch (ext) {
            case '.js':
            case '.jsx':
                return 'tree-sitter-javascript.wasm';
            case '.ts':
            case '.tsx':
                return 'tree-sitter-typescript.wasm'; // Using typescript for both ts and tsx to simplify
            case '.py':
                return 'tree-sitter-python.wasm';
            case '.go':
                return 'tree-sitter-go.wasm';
            case '.java':
                return 'tree-sitter-java.wasm';
            default:
                return 'tree-sitter-javascript.wasm';
        }
    }

    public static async getLanguage(extensionUri: vscode.Uri, ext: string): Promise<Parser.Language> {
        await this.init(extensionUri);
        
        const wasmFile = this.getWasmPathForLanguage(ext);
        
        if (this.languageCache.has(wasmFile)) {
            return this.languageCache.get(wasmFile)!;
        }

        const wasmPath = path.join(extensionUri.fsPath, 'dist', 'wasm', wasmFile);
        const lang = await Parser.Language.load(wasmPath);
        this.languageCache.set(wasmFile, lang);
        
        return lang;
    }

    private static astCache = new Map<string, { mtimeMs: number, symbols: string[] }>();

    public static async extractSymbols(extensionUri: vscode.Uri, filePath: string, code: string): Promise<string[]> {
        try {
            const stat = fs.statSync(filePath);
            const cached = this.astCache.get(filePath);
            if (cached && cached.mtimeMs === stat.mtimeMs) {
                return cached.symbols;
            }

            const ext = path.extname(filePath);
            const lang = await this.getLanguage(extensionUri, ext);
            
            const parser = new Parser();
            parser.setLanguage(lang);
            
            const tree = parser.parse(code);
            const symbols: string[] = [];
            
            // Basic extraction (can be expanded)
            // Just walking the AST to find functions, classes, methods
            const walk = (node: Parser.SyntaxNode) => {
                const type = node.type;
                if (
                    type === 'function_declaration' || 
                    type === 'class_declaration' || 
                    type === 'method_definition' ||
                    type === 'arrow_function'
                ) {
                    // Try to get name identifier
                    const nameNode = node.childForFieldName('name') || node.children.find(c => c.type === 'identifier');
                    if (nameNode) {
                        symbols.push(`[${type}] ${nameNode.text}`);
                    }
                }
                node.children.forEach(walk);
            };

            walk(tree.rootNode);
            
            // Limit cache size to 100 files
            if (this.astCache.size > 100) {
                const firstKey = this.astCache.keys().next().value;
                if (firstKey) this.astCache.delete(firstKey);
            }
            this.astCache.set(filePath, { mtimeMs: stat.mtimeMs, symbols });
            
            return symbols;
        } catch (error) {
            console.error("Failed to parse AST:", error);
            return ["Error extracting symbols"];
        }
    }
}
