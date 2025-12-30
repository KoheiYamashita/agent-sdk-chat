[日本語](./README.md) | [English](./README_EN.md)

# Agent SDK Chat

> **注意**：本项目仅供个人使用。不支持商业或多用户使用。

基于 Claude Agent SDK 的浏览器聊天应用程序。通过类似 ChatGPT 的界面与 Claude Code 进行交互。

## 演示

https://github.com/user-attachments/assets/3f392e56-efb6-4d51-85d3-e021e2a93ea6

## 功能

- **实时聊天**：通过 SSE（服务器发送事件）进行流式响应
- **思考过程展示**：实时查看 Claude 的推理过程
- **工具执行审批**：在工具执行前需要用户批准的工作流程
- **会话管理**：保存和继续对话历史
- **自动生成标题**：根据对话内容自动生成标题
- **自定义模型**：创建带有自定义系统提示词和图标的模型
- **技能**：管理和执行 Claude Agent SDK 技能
- **文件管理**：在工作区内进行文件操作
- **终端访问**：直接从浏览器操作终端（xterm.js + WebSocket）
- **外观自定义**：网站图标设置、UI主题

## 设置

### 1. 环境变量

在项目根目录创建 `.env` 文件，内容如下：

```bash
DATABASE_URL="file:./prisma/dev.db"
ANTHROPIC_API_KEY=your-api-key
```

### 2. 安装和启动

```bash
# 安装依赖
npm install

# 生成 Prisma 客户端
npm run db:generate

# 数据库迁移
npm run db:migrate

# 生产构建
npm run build

# 启动服务器
npm run start
# 或后台启动
npm run start:bg
# 指定主机
npm run start -- --host 0.0.0.0
```

### 3. 访问

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

## 开发

```bash
# 启动开发服务器（热重载）
npm run dev

# 运行 ESLint
npm run lint

# TypeScript 类型检查
npm run typecheck

# 启动 Prisma Studio
npm run db:studio
```
