import 'reflect-metadata';
import { EventEmitter } from 'events';
import * as http from 'http';
import * as url from 'url';
import {
  isMcpServer,
  getServerMetadata,
  getToolsMetadata,
  getResourcesMetadata,
  getPromptsMetadata,
} from '@mcp-weave/nestjs';

/**
 * Web UI configuration options
 */
export interface McpWebUIOptions {
  /** Port to run the dashboard (default: 3000) */
  port?: number;
  /** Host to bind to (default: 'localhost') */
  host?: string;
  /** Dashboard title */
  title?: string;
  /** UI theme */
  theme?: 'light' | 'dark';
  /** Enable server logs panel */
  enableLogs?: boolean;
}

/**
 * Server information for the dashboard
 */
export interface ServerInfo {
  name: string;
  version: string;
  description?: string;
  tools: ToolInfo[];
  resources: ResourceInfo[];
  prompts: PromptInfo[];
}

/**
 * Tool information for display
 */
export interface ToolInfo {
  name: string;
  description?: string;
  method: string;
  inputSchema?: Record<string, unknown>;
}

/**
 * Resource information for display
 */
export interface ResourceInfo {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  method: string;
}

/**
 * Prompt information for display
 */
export interface PromptInfo {
  name: string;
  description?: string;
  method: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * Call history entry
 */
export interface CallHistoryEntry {
  id: string;
  type: 'tool' | 'resource' | 'prompt';
  name: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  timestamp: Date;
  duration: number;
}

/**
 * McpWebUI - Web dashboard for testing MCP servers
 */
export class McpWebUI extends EventEmitter {
  private serverClass: new (...args: unknown[]) => unknown;
  private serverInstance: unknown;
  private options: Required<McpWebUIOptions>;
  private httpServer: http.Server | null = null;
  private serverInfo: ServerInfo | null = null;
  private callHistory: CallHistoryEntry[] = [];
  private logs: string[] = [];

  constructor(
    serverClass: new (...args: unknown[]) => unknown,
    options: McpWebUIOptions = {}
  ) {
    super();
    
    if (!isMcpServer(serverClass)) {
      throw new Error(`Class ${serverClass.name} is not decorated with @McpServer`);
    }
    
    this.serverClass = serverClass;
    this.options = {
      port: options.port ?? 3000,
      host: options.host ?? 'localhost',
      title: options.title ?? 'MCP Server Dashboard',
      theme: options.theme ?? 'dark',
      enableLogs: options.enableLogs ?? true,
    };
  }

  /**
   * Initialize server instance and extract metadata
   */
  private initialize(): void {
    this.serverInstance = new this.serverClass();
    
    const serverMeta = getServerMetadata(this.serverClass);
    const toolsMeta = getToolsMetadata(this.serverClass);
    const resourcesMeta = getResourcesMetadata(this.serverClass);
    const promptsMeta = getPromptsMetadata(this.serverClass);
    
    this.serverInfo = {
      name: serverMeta?.name ?? 'Unknown Server',
      version: serverMeta?.version ?? '1.0.0',
      description: serverMeta?.description,
      tools: toolsMeta.map(t => ({
        name: t.name,
        description: t.description,
        method: String(t.propertyKey),
        inputSchema: t.inputSchema as Record<string, unknown> | undefined,
      })),
      resources: resourcesMeta.map(r => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
        method: String(r.propertyKey),
      })),
      prompts: promptsMeta.map(p => ({
        name: p.name,
        description: p.description,
        method: String(p.propertyKey),
        arguments: p.arguments,
      })),
    };
  }

  /**
   * Start the Web UI server
   */
  async start(): Promise<void> {
    this.initialize();
    
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });
      
      this.httpServer.on('error', reject);
      
      this.httpServer.listen(this.options.port, this.options.host, () => {
        // Get actual port (important when port: 0 was used)
        const address = this.httpServer!.address();
        if (address && typeof address === 'object') {
          this.options.port = address.port;
        }
        this.log(`🎨 MCP Web UI started at ${this.getUrl()}`);
        resolve();
      });
    });
  }

  /**
   * Stop the Web UI server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.httpServer) {
        resolve();
        return;
      }
      
      this.httpServer.close((err) => {
        this.httpServer = null;
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Get the URL of the dashboard
   */
  getUrl(): string {
    return `http://${this.options.host}:${this.options.port}`;
  }

  /**
   * Get server information
   */
  getServerInfo(): ServerInfo | null {
    return this.serverInfo;
  }

  /**
   * Get call history
   */
  getCallHistory(): CallHistoryEntry[] {
    return this.callHistory;
  }

  /**
   * Log a message
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.logs.push(logEntry);
    if (this.logs.length > 1000) {
      this.logs.shift();
    }
    this.emit('log', logEntry);
  }

  /**
   * Handle HTTP requests
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const parsedUrl = url.parse(req.url ?? '/', true);
    const pathname = parsedUrl.pathname ?? '/';

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Route handlers
    if (pathname === '/' && req.method === 'GET') {
      this.serveDashboard(res);
    } else if (pathname === '/api/info' && req.method === 'GET') {
      this.serveServerInfo(res);
    } else if (pathname === '/api/tools' && req.method === 'GET') {
      this.serveTools(res);
    } else if (pathname === '/api/resources' && req.method === 'GET') {
      this.serveResources(res);
    } else if (pathname === '/api/prompts' && req.method === 'GET') {
      this.servePrompts(res);
    } else if (pathname === '/api/call-tool' && req.method === 'POST') {
      this.handleCallTool(req, res);
    } else if (pathname === '/api/read-resource' && req.method === 'POST') {
      this.handleReadResource(req, res);
    } else if (pathname === '/api/get-prompt' && req.method === 'POST') {
      this.handleGetPrompt(req, res);
    } else if (pathname === '/api/history' && req.method === 'GET') {
      this.serveHistory(res);
    } else if (pathname === '/api/logs' && req.method === 'GET') {
      this.serveLogs(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  }

  /**
   * Serve the main dashboard HTML
   */
  private serveDashboard(res: http.ServerResponse): void {
    const html = this.generateDashboardHTML();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Serve server info as JSON
   */
  private serveServerInfo(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.serverInfo));
  }

  /**
   * Serve tools list
   */
  private serveTools(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.serverInfo?.tools ?? []));
  }

  /**
   * Serve resources list
   */
  private serveResources(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.serverInfo?.resources ?? []));
  }

  /**
   * Serve prompts list
   */
  private servePrompts(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.serverInfo?.prompts ?? []));
  }

  /**
   * Serve call history
   */
  private serveHistory(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.callHistory));
  }

  /**
   * Serve server logs
   */
  private serveLogs(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.logs));
  }

  /**
   * Handle tool call request
   */
  private async handleCallTool(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.readBody(req);
      const { name, input } = JSON.parse(body);
      
      const tool = this.serverInfo?.tools.find(t => t.name === name);
      if (!tool) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Tool '${name}' not found` }));
        return;
      }

      const startTime = Date.now();
      const historyEntry: CallHistoryEntry = {
        id: this.generateId(),
        type: 'tool',
        name,
        input,
        timestamp: new Date(),
        duration: 0,
      };

      try {
        this.log(`Calling tool: ${name}`);
        this.emit('tool:call', name, input);
        
        const method = (this.serverInstance as Record<string, unknown>)[tool.method] as Function;
        const result = await method.call(this.serverInstance, input);
        
        historyEntry.output = result;
        historyEntry.duration = Date.now() - startTime;
        this.callHistory.unshift(historyEntry);
        
        this.log(`Tool ${name} completed in ${historyEntry.duration}ms`);
        this.emit('tool:result', name, result);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, result }));
      } catch (error) {
        historyEntry.error = error instanceof Error ? error.message : String(error);
        historyEntry.duration = Date.now() - startTime;
        this.callHistory.unshift(historyEntry);
        
        this.log(`Tool ${name} failed: ${historyEntry.error}`);
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: historyEntry.error }));
      }
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
  }

  /**
   * Handle resource read request
   */
  private async handleReadResource(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.readBody(req);
      const { uri } = JSON.parse(body);
      
      const resource = this.serverInfo?.resources.find(r => {
        // Match exact URI or template pattern
        const pattern = r.uri.replace(/{[^}]+}/g, '[^/]+');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(uri);
      });
      
      if (!resource) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Resource matching '${uri}' not found` }));
        return;
      }

      const startTime = Date.now();
      const historyEntry: CallHistoryEntry = {
        id: this.generateId(),
        type: 'resource',
        name: uri,
        timestamp: new Date(),
        duration: 0,
      };

      try {
        this.log(`Reading resource: ${uri}`);
        this.emit('resource:read', uri);
        
        // Extract parameters from URI template
        const params = this.extractUriParams(resource.uri, uri);
        
        const method = (this.serverInstance as Record<string, unknown>)[resource.method] as Function;
        const result = await method.call(this.serverInstance, params);
        
        historyEntry.output = result;
        historyEntry.duration = Date.now() - startTime;
        this.callHistory.unshift(historyEntry);
        
        this.log(`Resource ${uri} read in ${historyEntry.duration}ms`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, result }));
      } catch (error) {
        historyEntry.error = error instanceof Error ? error.message : String(error);
        historyEntry.duration = Date.now() - startTime;
        this.callHistory.unshift(historyEntry);
        
        this.log(`Resource ${uri} failed: ${historyEntry.error}`);
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: historyEntry.error }));
      }
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
  }

  /**
   * Handle prompt get request
   */
  private async handleGetPrompt(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.readBody(req);
      const { name, args } = JSON.parse(body);
      
      const prompt = this.serverInfo?.prompts.find(p => p.name === name);
      if (!prompt) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Prompt '${name}' not found` }));
        return;
      }

      const startTime = Date.now();
      const historyEntry: CallHistoryEntry = {
        id: this.generateId(),
        type: 'prompt',
        name,
        input: args,
        timestamp: new Date(),
        duration: 0,
      };

      try {
        this.log(`Getting prompt: ${name}`);
        this.emit('prompt:get', name, args);
        
        const method = (this.serverInstance as Record<string, unknown>)[prompt.method] as Function;
        const result = await method.call(this.serverInstance, args);
        
        historyEntry.output = result;
        historyEntry.duration = Date.now() - startTime;
        this.callHistory.unshift(historyEntry);
        
        this.log(`Prompt ${name} completed in ${historyEntry.duration}ms`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, result }));
      } catch (error) {
        historyEntry.error = error instanceof Error ? error.message : String(error);
        historyEntry.duration = Date.now() - startTime;
        this.callHistory.unshift(historyEntry);
        
        this.log(`Prompt ${name} failed: ${historyEntry.error}`);
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: historyEntry.error }));
      }
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
  }

  /**
   * Read request body
   */
  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  /**
   * Extract parameters from URI template
   */
  private extractUriParams(template: string, uri: string): Record<string, string> {
    const params: Record<string, string> = {};
    const templateParts = template.split('/');
    const uriParts = uri.split('/');
    
    templateParts.forEach((part, index) => {
      const match = part.match(/^{([^}]+)}$/);
      const uriPart = uriParts[index];
      if (match && match[1] && uriPart) {
        params[match[1]] = uriPart;
      }
    });
    
    return params;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate the dashboard HTML
   */
  private generateDashboardHTML(): string {
    const isDark = this.options.theme === 'dark';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.options.title}</title>
  <style>
    :root {
      --bg-primary: ${isDark ? '#1a1a2e' : '#ffffff'};
      --bg-secondary: ${isDark ? '#16213e' : '#f5f5f5'};
      --bg-card: ${isDark ? '#0f3460' : '#ffffff'};
      --text-primary: ${isDark ? '#ffffff' : '#1a1a2e'};
      --text-secondary: ${isDark ? '#a0a0a0' : '#666666'};
      --accent: #e94560;
      --accent-hover: #ff6b6b;
      --success: #4caf50;
      --error: #f44336;
      --border: ${isDark ? '#2a2a4a' : '#e0e0e0'};
      --code-bg: ${isDark ? '#0d1117' : '#f6f8fa'};
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
    
    header {
      background: var(--bg-secondary);
      padding: 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
    }
    
    header h1 {
      color: var(--accent);
      font-size: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .server-info {
      display: flex;
      gap: 20px;
      margin-top: 10px;
      color: var(--text-secondary);
      font-size: 14px;
    }
    
    .badge {
      background: var(--accent);
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    
    .grid {
      display: grid;
      grid-template-columns: 300px 1fr 350px;
      gap: 20px;
      height: calc(100vh - 150px);
    }
    
    .panel {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    .panel-header {
      background: var(--bg-secondary);
      padding: 12px 16px;
      font-weight: 600;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .panel-content {
      padding: 16px;
      overflow-y: auto;
      flex: 1;
    }
    
    .tabs {
      display: flex;
      gap: 0;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
    }
    
    .tab {
      padding: 10px 16px;
      cursor: pointer;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 14px;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    
    .tab:hover { color: var(--text-primary); }
    .tab.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }
    
    .item {
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .item:hover {
      border-color: var(--accent);
      background: var(--bg-secondary);
    }
    
    .item.selected {
      border-color: var(--accent);
      background: var(--bg-secondary);
    }
    
    .item-name {
      font-weight: 600;
      color: var(--accent);
    }
    
    .item-desc {
      color: var(--text-secondary);
      font-size: 13px;
      margin-top: 4px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      font-size: 14px;
    }
    
    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: inherit;
      font-size: 14px;
    }
    
    .form-group textarea {
      min-height: 150px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
    }
    
    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--accent);
    }
    
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
    }
    
    .btn-primary {
      background: var(--accent);
      color: white;
    }
    
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .result {
      background: var(--code-bg);
      border-radius: 6px;
      padding: 16px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 300px;
      overflow-y: auto;
    }
    
    .result.success { border-left: 3px solid var(--success); }
    .result.error { border-left: 3px solid var(--error); }
    
    .history-item {
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 8px;
      font-size: 13px;
    }
    
    .history-item .type {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
    }
    
    .history-item .type.tool { background: #2196f3; color: white; }
    .history-item .type.resource { background: #9c27b0; color: white; }
    .history-item .type.prompt { background: #ff9800; color: white; }
    
    .history-item .name {
      font-weight: 600;
      margin-left: 8px;
    }
    
    .history-item .time {
      color: var(--text-secondary);
      font-size: 12px;
      margin-top: 4px;
    }
    
    .history-item .duration {
      color: var(--success);
    }
    
    .history-item.error .duration { color: var(--error); }
    
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary);
    }
    
    .spinner {
      border: 3px solid var(--border);
      border-top: 3px solid var(--accent);
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .logs {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      background: var(--code-bg);
      padding: 12px;
      border-radius: 6px;
      max-height: 200px;
      overflow-y: auto;
    }
    
    .log-entry {
      color: var(--text-secondary);
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>🔧 ${this.options.title}</h1>
      <div class="server-info" id="server-info">Loading...</div>
    </div>
  </header>
  
  <div class="container">
    <div class="grid">
      <!-- Left Panel: Items List -->
      <div class="panel">
        <div class="tabs">
          <button class="tab active" data-tab="tools">Tools</button>
          <button class="tab" data-tab="resources">Resources</button>
          <button class="tab" data-tab="prompts">Prompts</button>
        </div>
        <div class="panel-content" id="items-list">
          <div class="empty-state">Loading...</div>
        </div>
      </div>
      
      <!-- Center Panel: Tester -->
      <div class="panel">
        <div class="panel-header">
          <span id="tester-title">Select an item to test</span>
        </div>
        <div class="panel-content" id="tester">
          <div class="empty-state">
            <p>Select a tool, resource, or prompt from the left panel to test it.</p>
          </div>
        </div>
      </div>
      
      <!-- Right Panel: History -->
      <div class="panel">
        <div class="panel-header">
          <span>Call History</span>
          <button class="btn" onclick="clearHistory()" style="padding: 4px 8px; font-size: 12px;">Clear</button>
        </div>
        <div class="panel-content" id="history">
          <div class="empty-state">No calls yet</div>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    // State
    let serverInfo = null;
    let currentTab = 'tools';
    let selectedItem = null;
    let isLoading = false;
    let history = [];
    
    // Initialize
    async function init() {
      await loadServerInfo();
      await loadItems();
      setupTabs();
      pollHistory();
    }
    
    // Load server info
    async function loadServerInfo() {
      try {
        const res = await fetch('/api/info');
        serverInfo = await res.json();
        document.getElementById('server-info').innerHTML = \`
          <span><strong>Name:</strong> \${serverInfo.name}</span>
          <span><strong>Version:</strong> \${serverInfo.version}</span>
          <span class="badge">\${serverInfo.tools.length} Tools</span>
          <span class="badge">\${serverInfo.resources.length} Resources</span>
          <span class="badge">\${serverInfo.prompts.length} Prompts</span>
        \`;
      } catch (err) {
        console.error('Failed to load server info:', err);
      }
    }
    
    // Load items based on current tab
    async function loadItems() {
      const container = document.getElementById('items-list');
      let items = [];
      
      if (currentTab === 'tools') {
        items = serverInfo?.tools || [];
      } else if (currentTab === 'resources') {
        items = serverInfo?.resources || [];
      } else if (currentTab === 'prompts') {
        items = serverInfo?.prompts || [];
      }
      
      if (items.length === 0) {
        container.innerHTML = '<div class="empty-state">No ' + currentTab + ' available</div>';
        return;
      }
      
      container.innerHTML = items.map((item, index) => \`
        <div class="item" onclick="selectItem('\${currentTab}', \${index})">
          <div class="item-name">\${item.name || item.uri}</div>
          <div class="item-desc">\${item.description || ''}</div>
        </div>
      \`).join('');
    }
    
    // Setup tabs
    function setupTabs() {
      document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          currentTab = tab.dataset.tab;
          loadItems();
          clearTester();
        });
      });
    }
    
    // Select an item
    function selectItem(type, index) {
      let items = type === 'tools' ? serverInfo.tools : 
                  type === 'resources' ? serverInfo.resources : 
                  serverInfo.prompts;
      selectedItem = { type, item: items[index] };
      renderTester();
    }
    
    // Clear tester
    function clearTester() {
      selectedItem = null;
      document.getElementById('tester-title').textContent = 'Select an item to test';
      document.getElementById('tester').innerHTML = \`
        <div class="empty-state">
          <p>Select a tool, resource, or prompt from the left panel to test it.</p>
        </div>
      \`;
    }
    
    // Render tester for selected item
    function renderTester() {
      if (!selectedItem) return;
      
      const { type, item } = selectedItem;
      document.getElementById('tester-title').textContent = item.name || item.uri;
      
      let html = '';
      
      if (type === 'tools') {
        html = \`
          <div class="form-group">
            <label>Description</label>
            <p style="color: var(--text-secondary); font-size: 14px;">\${item.description || 'No description'}</p>
          </div>
          <div class="form-group">
            <label>Input (JSON)</label>
            <textarea id="tool-input" placeholder='{"key": "value"}'>{}</textarea>
          </div>
          <button class="btn btn-primary" onclick="callTool()" id="call-btn">Call Tool</button>
          <div id="result-container" style="margin-top: 16px;"></div>
        \`;
      } else if (type === 'resources') {
        html = \`
          <div class="form-group">
            <label>URI Template</label>
            <p style="color: var(--text-secondary); font-size: 14px;">\${item.uri}</p>
          </div>
          <div class="form-group">
            <label>URI to Read</label>
            <input type="text" id="resource-uri" value="\${item.uri.replace(/{[^}]+}/g, 'example')}" />
          </div>
          <button class="btn btn-primary" onclick="readResource()" id="call-btn">Read Resource</button>
          <div id="result-container" style="margin-top: 16px;"></div>
        \`;
      } else if (type === 'prompts') {
        const args = item.arguments || [];
        html = \`
          <div class="form-group">
            <label>Description</label>
            <p style="color: var(--text-secondary); font-size: 14px;">\${item.description || 'No description'}</p>
          </div>
          <div class="form-group">
            <label>Arguments (JSON)</label>
            <textarea id="prompt-args" placeholder='{"arg1": "value1"}'>\${JSON.stringify(args.reduce((acc, a) => ({ ...acc, [a.name]: '' }), {}), null, 2)}</textarea>
          </div>
          <button class="btn btn-primary" onclick="getPrompt()" id="call-btn">Get Prompt</button>
          <div id="result-container" style="margin-top: 16px;"></div>
        \`;
      }
      
      document.getElementById('tester').innerHTML = html;
    }
    
    // Call tool
    async function callTool() {
      if (isLoading) return;
      isLoading = true;
      
      const btn = document.getElementById('call-btn');
      btn.disabled = true;
      btn.textContent = 'Calling...';
      
      try {
        const input = JSON.parse(document.getElementById('tool-input').value || '{}');
        const res = await fetch('/api/call-tool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: selectedItem.item.name, input })
        });
        const data = await res.json();
        showResult(data);
      } catch (err) {
        showResult({ success: false, error: err.message });
      } finally {
        isLoading = false;
        btn.disabled = false;
        btn.textContent = 'Call Tool';
      }
    }
    
    // Read resource
    async function readResource() {
      if (isLoading) return;
      isLoading = true;
      
      const btn = document.getElementById('call-btn');
      btn.disabled = true;
      btn.textContent = 'Reading...';
      
      try {
        const uri = document.getElementById('resource-uri').value;
        const res = await fetch('/api/read-resource', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uri })
        });
        const data = await res.json();
        showResult(data);
      } catch (err) {
        showResult({ success: false, error: err.message });
      } finally {
        isLoading = false;
        btn.disabled = false;
        btn.textContent = 'Read Resource';
      }
    }
    
    // Get prompt
    async function getPrompt() {
      if (isLoading) return;
      isLoading = true;
      
      const btn = document.getElementById('call-btn');
      btn.disabled = true;
      btn.textContent = 'Getting...';
      
      try {
        const args = JSON.parse(document.getElementById('prompt-args').value || '{}');
        const res = await fetch('/api/get-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: selectedItem.item.name, args })
        });
        const data = await res.json();
        showResult(data);
      } catch (err) {
        showResult({ success: false, error: err.message });
      } finally {
        isLoading = false;
        btn.disabled = false;
        btn.textContent = 'Get Prompt';
      }
    }
    
    // Show result
    function showResult(data) {
      const container = document.getElementById('result-container');
      const success = data.success;
      const content = success ? JSON.stringify(data.result, null, 2) : data.error;
      
      container.innerHTML = \`
        <div class="result \${success ? 'success' : 'error'}">
          \${escapeHtml(content)}
        </div>
      \`;
      
      refreshHistory();
    }
    
    // Escape HTML
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    // Poll history
    async function pollHistory() {
      await refreshHistory();
      setTimeout(pollHistory, 2000);
    }
    
    // Refresh history
    async function refreshHistory() {
      try {
        const res = await fetch('/api/history');
        history = await res.json();
        renderHistory();
      } catch (err) {
        console.error('Failed to load history:', err);
      }
    }
    
    // Render history
    function renderHistory() {
      const container = document.getElementById('history');
      
      if (history.length === 0) {
        container.innerHTML = '<div class="empty-state">No calls yet</div>';
        return;
      }
      
      container.innerHTML = history.slice(0, 50).map(entry => \`
        <div class="history-item \${entry.error ? 'error' : ''}">
          <span class="type \${entry.type}">\${entry.type}</span>
          <span class="name">\${entry.name}</span>
          <div class="time">
            \${new Date(entry.timestamp).toLocaleTimeString()} - 
            <span class="duration">\${entry.duration}ms</span>
            \${entry.error ? '<span style="color: var(--error);"> - Error</span>' : ''}
          </div>
        </div>
      \`).join('');
    }
    
    // Clear history
    function clearHistory() {
      history = [];
      renderHistory();
    }
    
    // Start
    init();
  </script>
</body>
</html>`;
  }
}
