import React, { useState, useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import { Settings, Cpu, MessageSquarePlus } from 'lucide-react';

const md = new MarkdownIt();

// @ts-ignore
const vscode = acquireVsCodeApi();

interface Message {
    role: 'user' | 'agent';
    content: string;
    image?: string; // Base64 image
}

const App: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [streamingText, setStreamingText] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [selectedModel, setSelectedModel] = useState('');
    const streamingTextRef = useRef('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const message = event.data;
            if (message.type === 'stream_text') {
                setIsStreaming(true);
                streamingTextRef.current += message.value;
                setStreamingText(streamingTextRef.current);
            } else if (message.type === 'stream_end') {
                setIsStreaming(false);
                const currentText = streamingTextRef.current;
                setMessages(prev => {
                    const finalContent = message.value || currentText;
                    return [...prev, { role: 'agent', content: finalContent }];
                });
                streamingTextRef.current = '';
                setStreamingText('');
            } else if (message.type === 'config_updated') {
                if (message.modelId) {
                    setSelectedModel(message.modelId);
                }
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingText]);

    const handleSend = () => {
        if (!input.trim() && !imageBase64) return;
        
        const newMessages: Message[] = [...messages, { role: 'user', content: input, image: imageBase64 || undefined }];
        setMessages(newMessages);
        
        vscode.postMessage({ type: 'prompt', value: input, imageBase64, modelId: selectedModel });
        
        setInput('');
        setImageBase64(null);
        setStreamingText('');
        setIsStreaming(true);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImageBase64(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleSpeechRecognition = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Voice Recognition is not supported in this environment.');
            return;
        }

        if (isRecording) return; // Currently simple tap to record
        
        setIsRecording(true);
        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN'; // Hoặc 'en-US'
        recognition.interimResults = false;
        
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => prev + ' ' + transcript);
            setIsRecording(false);
        };
        
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        
        recognition.start();
    };

    const handleNewChat = () => {
        setMessages([]);
        vscode.postMessage({ type: 'clear_chat' });
    };

    return (
        <div className="flex-1 flex flex-col h-screen max-h-screen bg-[#0d1117] text-gray-200 font-sans">
            <div className="flex-none p-3 border-b border-gray-800 bg-[#161b22] shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-base font-bold text-sky-400">CustomizedCodingSupport</h1>
                    <div className="flex space-x-1">
                        <button 
                            onClick={handleNewChat}
                            className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-sky-300" 
                            title="New Chat"
                        >
                            <MessageSquarePlus size={16} />
                        </button>
                        <button 
                            onClick={() => vscode.postMessage({ type: 'openSettings' })}
                            className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-sky-300" 
                            title="Settings"
                        >
                            <Settings size={16} />
                        </button>
                    </div>
                </div>
                <input 
                    list="bedrock-models"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full border border-gray-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-sky-500"
                    style={{ color: 'var(--vscode-input-foreground)', backgroundColor: 'var(--vscode-input-background)' }}
                    placeholder="Nhập Bedrock Model ID..."
                />
                <datalist id="bedrock-models">
                    <option value="arn:aws:bedrock:us-east-1:609826415497:application-inference-profile/fa4vlb8mlept">My Inference Profile</option>
                    <option value="us.anthropic.claude-3-5-sonnet-20241022-v2:0">Claude Sonnet 3.5 (v2)</option>
                    <option value="us.anthropic.claude-5-sonnet-2026-v1:0">Claude Sonnet 5</option>
                    <option value="us.anthropic.claude-5-opus-2026-v1:0">Claude Opus 5</option>
                    <option value="us.anthropic.claude-4-8-opus-2025-v1:0">Claude Opus 4.8</option>
                </datalist>
            </div>

            <main className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className="font-semibold mb-1 text-sm text-sky-300">{msg.role === 'user' ? 'You' : 'CustomizedCodingSupport'}</div>
                        <div className={`max-w-[90%] p-3 rounded-lg shadow-sm ${msg.role === 'user' ? 'bg-[#238636] text-white rounded-br-none' : 'bg-[#21262d] text-gray-200 border border-gray-700 rounded-bl-none'}`}>
                            {msg.image && <img src={msg.image} alt="Upload" className="max-w-xs mb-2 rounded border border-gray-600" />}
                            <div className="prose prose-invert max-w-none prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-gray-700 prose-a:text-sky-400">
                                <div dangerouslySetInnerHTML={{ __html: md.render(msg.content) }} />
                            </div>
                        </div>
                    </div>
                ))}
                
                {isStreaming && (
                    <div className="flex flex-col items-start">
                        <div className="font-semibold mb-1 text-sm text-sky-300">CustomizedCodingSupport</div>
                        <div className="max-w-[90%] p-3 rounded-lg bg-[#21262d] border border-gray-700 rounded-bl-none text-gray-200">
                            <div className="prose prose-invert max-w-none prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-gray-700 prose-a:text-sky-400">
                                <div dangerouslySetInnerHTML={{ __html: md.render(streamingText) }} />
                            </div>
                            <div className="mt-2 flex items-center space-x-2 text-gray-400">
                                <Cpu size={16} className="animate-spin text-sky-400" />
                                <span className="text-sm animate-pulse">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 bg-slate-800 border-t border-slate-700 flex flex-col gap-2">
                {imageBase64 && (
                    <div className="flex items-center gap-2 text-xs text-sky-300">
                        <span>📎 Image attached</span>
                        <button onClick={() => setImageBase64(null)} className="text-red-400 hover:text-red-300">Remove</button>
                    </div>
                )}
                <div className="flex gap-2">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-slate-700 hover:bg-slate-600 px-3 rounded"
                        title="Upload Image"
                    >
                        📎
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    
                    <button 
                        onClick={toggleSpeechRecognition}
                        className={`px-3 rounded transition-colors ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-slate-700 hover:bg-slate-600'}`}
                        title="Voice to Code"
                    >
                        🎤
                    </button>

                    <textarea 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder="Ask CustomizedCodingSupport to write code..."
                        className="flex-1 border border-gray-700 rounded-md py-2 px-3 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all resize-none text-sm"
                        style={{ color: 'var(--vscode-input-foreground)', backgroundColor: 'var(--vscode-input-background)' }}
                        rows={2}
                    />
                    <button 
                        onClick={handleSend}
                        className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                    >
                        Send
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default App;
