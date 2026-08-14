# Coze Studio 插件部署 — TC-AGI 认知引擎

将 TC-AGI 认知服务作为 Coze Studio（扣子开源版）插件接入。

## 架构

```
Coze Studio (Docker) ──插件调用──> tc-agi-cognitive 容器 (:8899)
   OpenAPI 3.0.1           /perceive /infer /prototype /memory
```

## 部署步骤

### 1. 启动 TC-AGI 认知服务容器

```bash
docker build --network=host -t tc-agi-cognitive:0.8.0 .   # 必须 --network=host（容器内 npm DNS 问题）
docker run -d --name tc-agi-cognitive -p 8899:8899 \
  -v tc-agi-memory:/app/data --restart unless-stopped tc-agi-cognitive:0.8.0
```

### 2. 接入 Coze 网络（容器间直连）

```bash
docker network connect <coze-network> tc-agi-cognitive
# coze-network 通常是 coze-studio_coze-network（docker network ls 查看）
```

### 3. 安装插件定义

把 `tc_agi_cognitive.yaml` 复制到 Coze Studio 的插件目录：

```bash
cp tc_agi_cognitive.yaml <coze-studio>/backend/conf/plugin/pluginproduct/
```

在 `plugin_meta.yaml` 追加注册条目（plugin_id 必须唯一）：

```yaml
- plugin_id: 10001
  product_id: 10000000000000010001
  deprecated: false
  version: v1.0.0
  openapi_doc_file: tc_agi_cognitive.yaml
  plugin_type: 1
  manifest:
    schema_version: v1
    name_for_model: tcagi_cognitive
    name_for_human: TC-AGI 认知引擎
    description_for_model: "..."
    description_for_human: TC-AGI 认知引擎：认知感知、主动推理、原型匹配、记忆检索
    auth:
      type: none
    api:
      type: openapi
    common_params:
      body: [ ]
      header:
        - name: Content-Type
          value: application/json
      path: [ ]
      query: [ ]
  tools:
    - tool_id: 10001001
      deprecated: false
      method: post
      sub_url: /perceive
    - tool_id: 10001002
      deprecated: false
      method: post
      sub_url: /infer
    - tool_id: 10001003
      deprecated: false
      method: post
      sub_url: /prototype
    - tool_id: 10001004
      deprecated: false
      method: post
      sub_url: /memory
```

### 4. 重启 coze-server 加载

```bash
docker restart coze-server
```

### 5. 验证

- 市场列表应出现 "TC-AGI 认知引擎"（entity_id=10001）
- 智能体/工作流编辑器 → 插件 → 可拖入 4 个工具

## 踩坑记录

1. **OpenAPI 每个 response 必须有 `description`**，否则插件静默加载失败，日志报：
   `invalid operation POST: a short description of the response is required`
2. **YAML description 含英文冒号必须加引号**，否则解析报 `mapping values are not allowed`
3. **plugin_meta.yaml 追加条目必须独立成行**（原文件末尾可能无换行符，直接 cat 追加会拼接坏）
4. **WSL 端口外部不可达（HTTP 000）**：docker daemon 重启后 iptables 规则损坏，`sudo service docker restart` 根治
