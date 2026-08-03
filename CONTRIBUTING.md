# 贡献指南

感谢你对 TC-AGI-Research 的兴趣！本文档描述如何参与项目贡献。

## 开发环境

```bash
# 克隆仓库
git clone https://github.com/q1z2q3-debug/TC-AGI-Research.git
cd TC-AGI-Research

# 安装依赖
npm install

# 编译检查
npm run build

# 运行测试
npm test

# Lint 检查
npm run lint
```

要求：Node.js 18+，TypeScript 5.0+。

## 贡献流程

1. **Fork** 仓库到你的 GitHub 账号
2. **创建分支**：`git checkout -b feat/your-feature` 或 `git checkout -b fix/your-fix`
3. **编写代码**：遵循现有代码风格，保持 TypeScript strict 模式通过
4. **编写测试**：新功能必须附带测试，确保 `npm test` 全部通过
5. **提交**：使用规范的 commit message（见下方）
6. **推送**：`git push origin feat/your-feature`
7. **发起 Pull Request**：描述变更内容和动机

## Commit Message 规范

```
<type>: <描述>

[可选正文]
```

类型：
- `feat` — 新功能
- `fix` — 修复 bug
- `docs` — 文档变更
- `refactor` — 重构（不改变功能）
- `test` — 测试相关
- `chore` — 构建/工具/配置

## 代码风格

- TypeScript strict 模式，不使用 `any`（必要时用 `warn` 级别）
- 中文注释用于哲学概念说明，英文用于技术描述
- 每个认知模块应有对应的测试文件
- 公共 API 需有 JSDoc 注释

## 认知模块贡献

新增认知模块时：
1. 在 `src/cognitive/` 下创建 `.ts` 文件
2. 在 `src/cognitive/index.ts` 中导出
3. 在 `tests/` 下创建对应测试文件
4. 更新 README.md 和 README_CN.md 的组件表和测试表
5. 更新项目结构树

## 认知探索贡献

在 `cognitive-explorations/` 目录下分享认知空间预演：
1. 创建 `NN-title.md` 文件（NN 为序号）
2. 标注为"认知预演"而非数学证明
3. 使用现有认知工具（MID门、精度加权自由能、Φ序参量等）进行分析
4. 记录核心发现和预测
5. 更新 `cognitive-explorations/README.md` 索引

## 问题反馈

- Bug 报告：请使用 GitHub Issues，附上复现步骤和环境信息
- 功能建议：欢迎在 Issues 中讨论新认知模块或架构改进的想法
- 安全问题：请勿公开报告，直接联系维护者
