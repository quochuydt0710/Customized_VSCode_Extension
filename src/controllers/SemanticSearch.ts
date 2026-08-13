import { pipeline } from '@xenova/transformers';
import * as vscode from 'vscode';
import * as path from 'path';

export class SemanticSearch {
    private static extractor: any;
    private static isInitialized = false;

    public static async init() {
        if (this.isInitialized) return;
        // Load the MiniLM model for embeddings
        this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        this.isInitialized = true;
    }

    public static async getEmbeddings(text: string) {
        await this.init();
        const output = await this.extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }

    // Cosine similarity
    private static cosineSimilarity(a: number[], b: number[]) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    public static async indexWorkspace() {
        await this.init();
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;
        
        const files = await vscode.workspace.findFiles('**/*.{ts,js,py,go,java,md}', '**/node_modules/**');
        let indexData: any = [];
        
        // Cắt chunk nhỏ và embedding (Demo index tối đa 20 file đầu tiên để test)
        for (let i = 0; i < Math.min(files.length, 20); i++) {
            const doc = await vscode.workspace.openTextDocument(files[i]);
            const text = doc.getText().substring(0, 1000); // chunk 1000 char
            const vector = await this.getEmbeddings(text);
            indexData.push({ path: files[i].fsPath, vector });
        }
        
        const indexPath = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'customizedcodingsupport_index.json');
        const fs = require('fs');
        if (!fs.existsSync(path.dirname(indexPath))) fs.mkdirSync(path.dirname(indexPath), { recursive: true });
        fs.writeFileSync(indexPath, JSON.stringify(indexData));
        return "Workspace Indexed Successfully!";
    }

    // Dummy search to illustrate local semantic search
    public static async search(query: string) {
        await this.init();
        const queryVector = await this.getEmbeddings(query);
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return "No workspace";
        const indexPath = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'customizedcodingsupport_index.json');
        
        const fs = require('fs');
        if (!fs.existsSync(indexPath)) {
            await this.indexWorkspace();
        }
        
        const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        let bestMatch = "";
        let bestScore = -1;
        
        for (const item of data) {
            const score = this.cosineSimilarity(queryVector, item.vector);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = item.path;
            }
        }
        
        return `Local Semantic Search Result: Best match found in ${bestMatch} with confidence ${Math.round(bestScore*100)}%`;
    }
}
