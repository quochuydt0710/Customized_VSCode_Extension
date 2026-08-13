export interface ToolSchema {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}

export interface BedrockMessage {
    role: "user" | "assistant";
    content: any[];
}

export const read_file_schema: ToolSchema = {
    name: "read_file",
    description: "Đọc nội dung của một file. Có thể truyền start_line và end_line để đọc một phần của file giúp tiết kiệm token.",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "Đường dẫn tuyệt đối hoặc tương đối của file" },
            start_line: { type: "number", description: "Dòng bắt đầu đọc (tuỳ chọn)" },
            end_line: { type: "number", description: "Dòng kết thúc đọc (tuỳ chọn)" }
        },
        required: ["path"]
    }
};

export const list_dir_schema: ToolSchema = {
    name: "list_dir",
    description: "Liệt kê các file và thư mục trong một đường dẫn",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "Đường dẫn thư mục" }
        },
        required: ["path"]
    }
};

export const grep_search_schema: ToolSchema = {
    name: "grep_search",
    description: "Tìm kiếm văn bản trong các file sử dụng Regex",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "Thư mục tìm kiếm" },
            query: { type: "string", description: "Chuỗi hoặc regex tìm kiếm" }
        },
        required: ["path", "query"]
    }
};

export const execute_terminal_command_schema: ToolSchema = {
    name: "execute_terminal_command",
    description: "Chạy một lệnh trên Terminal của hệ thống",
    inputSchema: {
        type: "object",
        properties: {
            command: { type: "string", description: "Lệnh terminal cần chạy (VD: npm run build, ls -la)" }
        },
        required: ["command"]
    }
};

export const replace_string_in_file_schema: ToolSchema = {
    name: "replace_string_in_file",
    description: "Thay thế chính xác một đoạn code cũ bằng đoạn code mới trong file.",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "Đường dẫn file cần sửa" },
            old_string: { type: "string", description: "Đoạn code gốc cần được thay thế (phải khớp 100%)" },
            new_string: { type: "string", description: "Đoạn code mới sẽ đắp vào" }
        },
        required: ["path", "old_string", "new_string"]
    }
};

export const semantic_search_schema: ToolSchema = {
    name: "semantic_search",
    description: "Tìm kiếm mã nguồn theo ngữ nghĩa (Local Vector Search) thay vì từ khóa chính xác.",
    inputSchema: {
        type: "object",
        properties: {
            query: { type: "string", description: "Câu truy vấn ngữ nghĩa (VD: logic xác thực người dùng)" }
        },
        required: ["query"]
    }
};

export const git_status_schema: ToolSchema = {
    name: "git_status",
    description: "Lấy trạng thái git hiện tại (git status).",
    inputSchema: { type: "object", properties: {}, required: [] }
};

export const git_diff_schema: ToolSchema = {
    name: "git_diff",
    description: "Lấy chi tiết git diff.",
    inputSchema: { type: "object", properties: {}, required: [] }
};

export const git_commit_schema: ToolSchema = {
    name: "git_commit",
    description: "Tạo commit tự động với thông báo.",
    inputSchema: {
        type: "object",
        properties: {
            message: { type: "string", description: "Nội dung commit message" }
        },
        required: ["message"]
    }
};

export const read_url_schema: ToolSchema = {
    name: "read_url",
    description: "Đọc nội dung một trang web (HTML sẽ tự được chuyển thành dạng text).",
    inputSchema: {
        type: "object",
        properties: {
            url: { type: "string", description: "URL cần đọc" }
        },
        required: ["url"]
    }
};

export const create_shadow_branch_schema: ToolSchema = {
    name: "create_shadow_branch",
    description: "Tạo một nhánh Git ảo (Shadow Workspace) để làm việc an toàn không ảnh hưởng branch chính.",
    inputSchema: {
        type: "object",
        properties: {
            branch_name: { type: "string", description: "Tên nhánh (vd: customizedcodingsupport-task-1)" }
        },
        required: ["branch_name"]
    }
};

export const run_and_fix_tests_schema: ToolSchema = {
    name: "run_and_fix_tests",
    description: "Chạy test suite và trả về lỗi nếu có để tự sửa (Self-Healing).",
    inputSchema: {
        type: "object",
        properties: {
            command: { type: "string", description: "Lệnh chạy test (vd: npm test)" }
        },
        required: ["command"]
    }
};

export const write_file_schema: ToolSchema = {
    name: "write_file",
    description: "Tạo file mới hoặc ghi đè hoàn toàn nội dung một file.",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "Đường dẫn file cần tạo/ghi đè" },
            content: { type: "string", description: "Nội dung đầy đủ của file" }
        },
        required: ["path", "content"]
    }
};

export const web_search_schema: ToolSchema = {
    name: "web_search",
    description: "Tìm kiếm thông tin trên Internet (ví dụ: Google, DuckDuckGo) để cập nhật kiến thức hoặc debug.",
    inputSchema: {
        type: "object",
        properties: {
            query: { type: "string", description: "Từ khóa tìm kiếm" }
        },
        required: ["query"]
    }
};

export const browser_action_schema: ToolSchema = {
    name: "browser_action",
    description: "Thực hiện các thao tác trên trình duyệt (Playwright) như mở trang, click, chụp ảnh màn hình.",
    inputSchema: {
        type: "object",
        properties: {
            action: { type: "string", description: "Hành động: goto, click, type, screenshot" },
            url: { type: "string", description: "URL (dùng cho goto)" },
            selector: { type: "string", description: "CSS Selector (dùng cho click, type)" },
            text: { type: "string", description: "Text để nhập (dùng cho type)" }
        },
        required: ["action"]
    }
};

export const mcp_request_schema: ToolSchema = {
    name: "mcp_request",
    description: "Gửi request tới một Model Context Protocol (MCP) server.",
    inputSchema: {
        type: "object",
        properties: {
            server: { type: "string", description: "Tên hoặc URL của MCP server" },
            action: { type: "string", description: "Tên phương thức/hành động cần gọi" },
            params: { type: "object", description: "Tham số truyền vào cho hành động" }
        },
        required: ["server", "action"]
    }
};

export const spawn_subagent_schema: ToolSchema = {
    name: "spawn_subagent",
    description: "Tạo một Sub-Agent chuyên trách để thực hiện nhiệm vụ song song.",
    inputSchema: {
        type: "object",
        properties: {
            role: { type: "string", description: "Vai trò của Sub-Agent (ví dụ: research, browser, tester)" },
            task: { type: "string", description: "Mô tả chi tiết nhiệm vụ giao cho Sub-Agent" }
        },
        required: ["role", "task"]
    }
};
