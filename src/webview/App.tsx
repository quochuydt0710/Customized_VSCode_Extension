import React, { useState, useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import { Settings, Cpu, MessageSquarePlus, Plus, Mic, FileText, ChevronLeft, ChevronUp, CheckSquare, ArrowUp } from 'lucide-react';

const md = new MarkdownIt();

// @ts-ignore
const vscode = acquireVsCodeApi();

interface Message {
    role: 'user' | 'agent';
    content: string;
    image?: string; // Base64 image
}

const getModelDisplayName = (id: string) => {
    const models: Record<string, string> = {
        "gemini-3.1-pro-high": "Gemini 3.1 Pro (High)",
        "arn:aws:bedrock:us-east-1:609826415497:application-inference-profile/fa4vlb8mlept": "My Inference Profile",
        "us.anthropic.claude-3-5-sonnet-20241022-v2:0": "Claude Sonnet 3.5 (v2)",
        "us.anthropic.claude-5-sonnet-2026-v1:0": "Claude Sonnet 5",
        "us.anthropic.claude-5-opus-2026-v1:0": "Claude Opus 5",
        "us.anthropic.claude-4-8-opus-2025-v1:0": "Claude Opus 4.8"
    };
    return models[id] || id || "Gemini 3.1 Pro (High)";
};

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

            <footer className="p-4 bg-[#0d1117] flex flex-col gap-2 shrink-0 border-t border-gray-800">
                {imageBase64 && (
                    <div className="flex items-center gap-2 text-xs text-sky-300 mb-2">
                        <span>📎 Image attached</span>
                        <button onClick={() => setImageBase64(null)} className="text-red-400 hover:text-red-300">Remove</button>
                    </div>
                )}
                
                <div className="flex items-center justify-between text-gray-400 text-xs px-1 mb-1">
                    <div className="flex items-center gap-2 hover:text-gray-200 cursor-pointer transition-colors">
                        <ChevronLeft size={14} />
                        <FileText size={14} />
                        <span>0 Files With Changes</span>
                    </div>
                    <button className="flex items-center gap-1 hover:text-gray-200 border border-gray-700 bg-[#21262d] rounded-md px-2.5 py-1 transition-colors">
                        <CheckSquare size={12} />
                        <span>Review Changes</span>
                    </button>
                </div>

                <div className="bg-[#161b22] border border-gray-700 rounded-xl flex flex-col focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-500 transition-all shadow-sm">
                    <textarea 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder="Ask anything, @ to mention, / for actions"
                        className="w-full bg-transparent border-none rounded-t-xl py-3 px-4 focus:outline-none resize-none text-sm placeholder-gray-500 text-gray-200"
                        rows={Math.min(5, (input.match(/\n/g) || []).length + 1)}
                        style={{ minHeight: '44px', color: 'var(--vscode-input-foreground)' }}
                    />
                    
                    <div className="flex items-center justify-between px-3 pb-2 pt-1">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-1 hover:bg-gray-700 rounded-md text-gray-400 hover:text-gray-200 transition-colors"
                                title="Upload Image"
                            >
                                <Plus size={16} />
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                            
                            <div className="relative group flex items-center">
                                <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-md hover:bg-gray-700/50">
                                    <span>{getModelDisplayName(selectedModel)}</span>
                                    <ChevronUp size={14} />
                                </button>
                                <select 
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                    title="Select Model"
                                >
                                    <option value="gemini-3.1-pro-high">Gemini 3.1 Pro (High)</option>
                                    <option value="arn:aws:bedrock:us-east-1:609826415497:application-inference-profile/fa4vlb8mlept">My Inference Profile</option>
                                    <option value="us.anthropic.claude-3-5-sonnet-20241022-v2:0">Claude Sonnet 3.5 (v2)</option>
                                    <option value="us.anthropic.claude-5-sonnet-2026-v1:0">Claude Sonnet 5</option>
                                    <option value="us.anthropic.claude-5-opus-2026-v1:0">Claude Opus 5</option>
                                    <option value="us.anthropic.claude-4-8-opus-2025-v1:0">Claude Opus 4.8</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={toggleSpeechRecognition}
                                className={`p-1.5 rounded-md transition-colors ${isRecording ? 'bg-red-600/20 text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                                title="Voice to Code"
                            >
                                <Mic size={16} />
                            </button>
                            {input.trim() || imageBase64 ? (
                                <button 
                                    onClick={handleSend}
                                    className="bg-gray-200 hover:bg-white text-black p-1.5 rounded-md text-sm font-semibold transition-colors"
                                >
                                    <ArrowUp size={16} />
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;
