# Claude Code & Antigravity VS Code Extension

![VS Code](https://img.shields.io/badge/VS_Code-007ACC?style=for-the-badge&logo=visual-studio-code&logoColor=white)
![AWS Bedrock](https://img.shields.io/badge/AWS_Bedrock-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

Một VS Code Extension giả lập hoàn hảo năng lực của **Claude Code CLI** và **Antigravity Engine**, sử dụng sức mạnh của **AWS Bedrock API** (Claude 3.5/3.7 Sonnet). 

Hệ thống được thiết kế theo mô hình **Multi-Agent Orchestrator** phân cấp, kết hợp Tree-sitter AST Parsing, Vector RAG Search, và vòng lặp ReAct (Reasoning + Acting) execution loop với sự kiểm soát an toàn nghiêm ngặt dành cho môi trường doanh nghiệp (Zero Data Retention).

---

## ✨ Tính Năng Nổi Bật (100% Parity Matrix)

* **LLM Streaming & Tools:** Hỗ trợ gọi hàm (Function Call) và Streaming realtime tốc độ cao qua AWS Bedrock `ConverseStream` API.
* **Search & Replace Thông Minh:** Chỉnh sửa chính xác các block code (Diff Patch) mà không cần ghi đè cả file lớn, giúp tiết kiệm lượng lớn Token.
* **AST Context Engine:** Tích hợp WebAssembly Tree-sitter để dựng đồ thị mã nguồn (Symbol Graph, Dependency, Class Relations).
* **Auto-Verification Loop:** Tự động lắng nghe VS Code Diagnostics (Linter/Compiler errors), thu thập lỗi và tự động yêu cầu LLM sửa cho đến khi code Pass hoàn toàn.
* **Project Rules Enforcement:** Tự động parse và tuân thủ các quy tắc từ `.clauderc`, `CLAUDE.md`, hoặc `.cursorrules`.
* **Multi-Agent Coordination:** Hệ thống gồm Planner Sub-Agent (chia nhỏ Todo List) và Coder Agent (Thi hành) giao tiếp liên tục.

---

## 🏗️ Kiến Trúc Hệ Thống (Architecture Blueprint)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                      VS CODE WEBVIEW CHAT UI                                 │
│      (React + Tailwind + Webview Toolkit + Task Checklist & Logs)            │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ IPC Protocol (postMessage / JSON-RPC)
┌──────────────────────────────────────▼───────────────────────────────────────┐
│                    EXTENSION HOST AGENT ORCHESTRATOR                         │
│  ┌──────────────────┐ ┌───────────────────────┐ ┌─────────────────────────┐  │
│  │ Planner Sub-Agent│ │ Coder/Executor Agent  │ │ Reviewer/Verifier Agent │  │
│  │ (Decomposition)  │ │ (Search/Edit/Cmd)     │ │ (Diagnostics/Linter)    │  │
│  └────────┬─────────┘ └──────────┬────────────┘ └───────────┬─────────────┘  │
│           │                      │                          │                │
│  ┌────────▼──────────────────────▼──────────────────────────▼─────────────┐  │
│  │              CONTEXT & AST ENGINE (Tree-Sitter)                        │  │
│  │ • Rules Parser (.clauderc)          • Auto Token Truncation & Pruning  │  │
│  └───────────────────────────────────────┬────────────────────────────────┘  │
└──────────────────────────────────────────┼───────────────────────────────────┘
                                           │ AWS SDK (V3)
┌──────────────────────────────────────────▼───────────────────────────────────┐
│                   AWS BEDROCK CONVERSE STREAM API                            │
│           [Claude 3.7 Sonnet / Claude 3.5 Sonnet / Haiku]                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Độ Bền Bỉ & Quản Trị Rủi Ro (Resilience & Security)

Để đáp ứng tiêu chuẩn Enterprise Production, Extension được trang bị các cơ chế nâng cao:

1. **Bảo Mật Cấp Doanh Nghiệp (Enterprise Security):**
   - **Zero Data Retention:** Codebase không bị lưu trữ/huấn luyện trên AWS.
   - **3-Tier Approval:** 
     - *Cấp 1 (Auto)*: Đọc file, tìm kiếm. 
     - *Cấp 2 (Prompt)*: Ghi file, npm install. 
     - *Cấp 3 (Strict)*: Các lệnh nguy hiểm (`rm`, `git push --force`, sửa `.env`).
2. **Cơ Chế Hủy Tác Vụ (AbortSignal):** Nút **Stop** trên UI truyền `AbortController` trực tiếp tới luồng AWS Bedrock API để chặn lập tức sự "ảo giác" (hallucination) của LLM.
3. **Quản Lý Token & Chi Phí (Cost Control):** 
   - Giới hạn số vòng lặp `MAX_ITERATIONS` cho mỗi task.
   - Tự động cắt tỉa (Truncation) khi output của tool (`grep`, `read`) quá lớn.
   - UI hiển thị ước lượng USD / Token Count.
4. **Self-Correction Loop:** Bắt lỗi Graceful. Nếu LLM truyền sai tham số Tool, hệ thống trả về thông báo lỗi dạng Text để LLM tự học và gọi lại Tool đúng cách, tránh crash ứng dụng.
5. **State Persistence:** Lưu trữ lịch sử Chat và trạng thái Agent bằng VS Code `workspaceState` để giữ nguyên ngữ cảnh khi người dùng ẩn hoặc chuyển tab Webview.

---

## 🔮 Định Hướng Tương Lai (Next-Gen IDE Ideas)

Để vượt xa khả năng của Claude Code CLI truyền thống, dự án nhắm tới 4 tính năng đột phá:

1. **Interactive AST Visualizer (Bản đồ Code trực quan):** Webview hiển thị bản đồ node graph (như Obsidian) thể hiện sự liên kết giữa các file/class.
2. **Predictive Shadow Coding (Auto-suggest chủ động):** Agent chạy ngầm quan sát user code, dùng mô hình tốc độ cao (Haiku) tự động đề xuất refactor mà không cần prompt.
3. **Multi-Model Fallback (Chống sập hệ thống):** Tự động nhảy sang Local Model (Ollama) hoặc LLM khác nếu API chính bị Rate Limit, đảm bảo Zero Downtime.
4. **Sandboxed Directory Control:** Giao diện cho phép khóa/cấp quyền thư mục cụ thể, ngăn Agent sửa hoặc xóa nhầm file ngoài phạm vi cho phép.

---
## 🚀 Lộ Trình Phát Triển (12 Tuần)

* **Phase 1 (Tuần 1 - 2): Core Loop** 
  Khởi tạo ESBuild, TypeScript Host, cấu hình AWS Bedrock Auth và dựng vòng lặp ReAct Engine cơ bản.
* **Phase 2 (Tuần 3 - 4): Core Toolsets**
  Tích hợp các tool đọc/tìm kiếm (`read_file`, `grep_search`) và VS Code Terminal Engine kèm theo luồng xin phép người dùng (User Approval Modal).
* **Phase 3 (Tuần 5 - 6): Search & Replace UI**
  Xây dựng hệ thống sửa code Diff Patch (`vscode.diff`) và hoàn thiện React Webview UI (Streaming text, Markdown).
* **Phase 4 (Tuần 7 - 8): AST Context**
  Nhúng Tree-sitter WASM, tự dựng Dependency Graph, tích hợp đọc Project Rules.
* **Phase 5 (Tuần 9 - 10): Auto-Verification**
  Hook vào `onDidChangeDiagnostics` của VS Code để tạo vòng lặp tự động sửa lỗi Linter/Compiler.
* **Phase 6 (Tuần 11 - 12): Planner & Polish**
  Ra mắt Planner Agent (Todo List Sidebar UI), tối ưu Token Budgeting, và viết CI/CD luồng build `.vsix`.

---

## 🛠️ Hướng Dẫn Cài Đặt Dành Cho Lập Trình Viên

### Yêu cầu tiên quyết (Prerequisites)
- [Node.js](https://nodejs.org/) (v18+)
- [VS Code](https://code.visualstudio.com/) (phiên bản 1.90.0 trở lên)
- Tài khoản AWS với quyền truy cập vào dịch vụ **Amazon Bedrock** (cần enable model Claude 3.5/3.7 Sonnet).
- AWS CLI đã được configure credentials cục bộ hoặc SSO.

### Cài đặt môi trường
1. Clone repository:
   ```bash
   git clone <repo-url>
   cd antigravity-vscode-extension
   ```
2. Cài đặt thư viện:
   ```bash
   npm install
   ```
3. Chạy Extension ở chế độ Develop:
   - Mở dự án bằng VS Code.
   - Nhấn `F5` để mở cửa sổ "Extension Development Host".
   - Bật Command Palette (`Ctrl+Shift+P` hoặc `Cmd+Shift+P`), gõ `Antigravity: Start Chat`.

### 📦 Phase 6: Đóng gói (Packaging)
- Cấu hình ESBuild nén JS, CSS, loại bỏ hoàn toàn `node_modules`.
- Cấu hình tự động copy `.wasm` Tree-sitter.
- Tích hợp Output Logger.
- Build file `antigravity-extension.vsix` dung lượng siêu nhẹ (< 5MB).

### 🚀 Phase 7: Antigravity V2 (Unstoppable Agent)
- **Multi-threading:** Thực thi nhiều Tools song song bằng `Promise.all()` tăng x5 tốc độ.
- **Auto-Linter Self-Correction:** Tự động lắng nghe VS Code Diagnostics (vạch đỏ) và gửi lỗi ngược về LLM để tự sửa chữa ngay lập tức.
- **Local Semantic Search:** Sử dụng mô hình Vector nội bộ (`@xenova/transformers`) để tìm kiếm mã nguồn theo ngữ nghĩa (không phụ thuộc từ khóa).
- **Terminal Context Catcher:** Tích hợp menu chuột phải vào Terminal, cho phép gửi dòng lệnh báo lỗi thẳng vào Chat để Agent debug.

### 🏢 Phase 8: Antigravity V3 (Enterprise Level)
- **RAG Workspace Indexing:** Tự động index toàn bộ mã nguồn vào Vector DB nội bộ (`.json`).
- **Live Streaming Diff:** Gõ code trực tiếp trên Editor theo thời gian thực như người thật.
- **Auto-Git Orchestration:** Tự động kiểm tra trạng thái Git, đọc Diff và viết Commit Message tự động.
- **Web Scraping:** Tool `read_url` giúp đọc tài liệu API và tóm tắt trực tiếp từ mạng.
- **Multi-Agent Swarm:** Mô hình Đa Đặc vụ với Agent Reviewer soi lỗi bảo mật liên tục phía sau hậu trường.

### 🧠 Phase 9: Context Memory & UX Enhancements
- **Stateful History Retention:** Quản lý lịch sử hội thoại (bao gồm Tool Use và Result) theo chuẩn API AWS Bedrock, tránh tình trạng lỗi `toolResult blocks exceeds toolUse`.
- **Webview Persistence:** Kích hoạt `retainContextWhenHidden` để ngăn chặn VS Code tự động hủy Webview khi chuyển tab, bảo vệ toàn vẹn lịch sử tin nhắn.
- **New Chat Logic:** Thêm nút khởi tạo cuộc trò chuyện mới, xóa nhanh ngữ cảnh để tối ưu Token và bộ nhớ.
- **Real-time Streaming Rendering:** Hiển thị trực tiếp nội dung Markdown khi Agent đang type chữ (thay vì chỉ hiện chữ "Thinking...").

---
*Lưu ý: Bạn có thể cập nhật thông tin nhà phát hành trong file `package.json` trước khi build.*

---
*Dự án được thiết kế chuẩn mực nhằm mang lại trải nghiệm Agentic Coding tương đương Claude Code nhưng với độ kiểm soát tối đa trong IDE của bạn.*
