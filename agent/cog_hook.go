package agent

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/q1z2q3-debug/TC-AGI-Research/cogspace"
)

// ═══════════════════════════════════════════════════════════════════════════
// Agent Harness 认知预处理钩子
// ═══════════════════════════════════════════════════════════════════════════

// CogHookOutput AgentStep钩子的输出
type CogHookOutput struct {
	// SupplementContext 补充到Prompt的上下文文本
	SupplementContext string
	// TargetVector 本轮映射的九维认知向量
	TargetVector cogspace.CogVector
	// IsExtreme 是否检测到极端认知
	IsExtreme bool
	// IsConverged 认知是否收敛
	IsConverged bool
	// RecallCount 召回的历史认知数量
	RecallCount int
	// ReflectionPrompt 强制反思指令（未收敛时生成）
	ReflectionPrompt string
	// NeedsReflection 是否需要强制反思迭代
	NeedsReflection bool
}

// AgentStep 每轮推理前置认知校正钩子，嵌入Harness循环头部
//
// 执行流程：
//   1. LLM结构化输出解析文本 → 九维向量
//   2. 极端认知自动中和修正
//   3. 召回历史相似认知补充Prompt上下文
//   4. 收敛距离二次校验，未收敛追加强制反思指令
//
// 对应TC-AGI仓库接入点：
//   - autonomous-loop.ts → AutonomousLoop.executeSubTask() 前置插入
//   - engine.ts → EngineLayer.executeStep() 前置插入
func AgentStep(intentText string, mem *CogMemory) CogHookOutput {
	cfg := cogspace.GetConfig()
	output := CogHookOutput{}

	// ━━━ 1. LLM结构化输出解析文本转为九维向量 ━━━
	targetVec := ParseTextToVector(intentText)
	output.TargetVector = targetVec

	// ━━━ 2. 极端认知自动中和修正 ━━━
	if cfg.IsExtremeConfig(targetVec) {
		output.IsExtreme = true
		targetVec = cogspace.Merge(targetVec, cogspace.NewZeroVector())
		output.TargetVector = targetVec
	}

	// ━━━ 3. 召回历史相似认知补充Prompt上下文 ━━━
	topK := cfg.TopKNum
	hist := mem.SearchTopK(targetVec, topK)
	output.RecallCount = len(hist)

	var supplementParts []string
	for _, n := range hist {
		supplementParts = append(supplementParts, fmt.Sprintf("[历史认知] %s", n.Text))
	}

	// ━━━ 4. 收敛距离二次校验，未收敛追加强制反思指令 ━━━
	if cfg.IsConverged(targetVec) {
		output.IsConverged = true
	} else {
		output.IsConverged = false
		output.NeedsReflection = true
		output.ReflectionPrompt = "【认知空间未收敛】当前认知向量偏离原点距离过大，" +
			"请继续分步推理至目标认知点位收敛，禁止直接结束任务。" +
			"建议：补充缺失维度的分析，平衡阴阳态势，使认知趋向中和态。"
		supplementParts = append(supplementParts, output.ReflectionPrompt)
	}

	output.SupplementContext = strings.Join(supplementParts, "\n")
	return output
}

// ═══════════════════════════════════════════════════════════════════════════
// 文本 → 九维向量解析
// ═══════════════════════════════════════════════════════════════════════════

// LLMVectorOutput LLM结构化JSON输出的预期格式
type LLMVectorOutput struct {
	Past      int `json:"past"`       // 过去: -1/0/1
	Present   int `json:"present"`    // 现在: -1/0/1
	Future    int `json:"future"`     // 未来: -1/0/1
	Internal  int `json:"internal"`   // 内: -1/0/1
	Medial    int `json:"medial"`     // 中: -1/0/1
	External  int `json:"external"`   // 外: -1/0/1
	Cause     int `json:"cause"`      // 因: -1/0/1
	Condition int `json:"condition"`  // 缘: -1/0/1
	Effect    int `json:"effect"`     // 果: -1/0/1
}

// ParseTextToVector 对接LLM结构化JSON输出，解析为九维平衡三进制向量
//
// 优先尝试JSON解析（LLM结构化输出），
// 失败时回退到关键词规则映射（与TS仓库的 semantic.ts 对齐）
func ParseTextToVector(text string) cogspace.CogVector {
	// 优先：尝试JSON解析（LLM结构化输出）
	if vec, ok := tryParseJSON(text); ok {
		return vec
	}

	// 回退：关键词规则映射
	return keywordMapToVector(text)
}

// tryParseJSON 尝试从文本中解析LLM输出的JSON向量
func tryParseJSON(text string) (cogspace.CogVector, bool) {
	text = strings.TrimSpace(text)

	// 尝试直接解析
	var out LLMVectorOutput
	if err := json.Unmarshal([]byte(text), &out); err == nil {
		return llmOutputToVector(out), true
	}

	// 尝试从Markdown代码块中提取JSON
	if idx := strings.Index(text, "```json"); idx >= 0 {
		start := idx + 7
		end := strings.Index(text[start:], "```")
		if end > 0 {
			jsonStr := strings.TrimSpace(text[start : start+end])
			if err := json.Unmarshal([]byte(jsonStr), &out); err == nil {
				return llmOutputToVector(out), true
			}
		}
	}

	// 尝试从普通代码块中提取
	if idx := strings.Index(text, "```"); idx >= 0 {
		start := idx + 3
		end := strings.Index(text[start:], "```")
		if end > 0 {
			jsonStr := strings.TrimSpace(text[start : start+end])
			if err := json.Unmarshal([]byte(jsonStr), &out); err == nil {
				return llmOutputToVector(out), true
			}
		}
	}

	return cogspace.CogVector{}, false
}

// llmOutputToVector 将LLM输出转换为CogVector
func llmOutputToVector(out LLMVectorOutput) cogspace.CogVector {
	clamp := func(v int) cogspace.TriState {
		if v > 0 {
			return cogspace.TriPos
		}
		if v < 0 {
			return cogspace.TriNeg
		}
		return cogspace.TriMid
	}

	return cogspace.CogVector{
		clamp(out.Past),
		clamp(out.Present),
		clamp(out.Future),
		clamp(out.Internal),
		clamp(out.Medial),
		clamp(out.External),
		clamp(out.Cause),
		clamp(out.Condition),
		clamp(out.Effect),
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 关键词规则映射（与TC-AGI仓库 src/cognitive/semantic.ts 对齐）
// ═══════════════════════════════════════════════════════════════════════════

// keywordRule 关键词规则
type keywordRule struct {
	posPattern string // 正向关键词（匹配→阳）
	negPattern string // 负向关键词（匹配→阴）
}

// keywordRules 九维关键词规则表（与 semantic.ts 的 KEYWORD_MAP 对齐）
var keywordRules = [cogspace.DimNum]keywordRule{
	// 时间维
	{posPattern: "过去|历史|曾经|以前|经验|回顾|past|history|before|experience|recall", negPattern: "遗忘|忘记|失去|损失|forget|lost|miss|lose"},
	{posPattern: "现在|当前|目前|正在|此刻|now|current|present|ongoing|moment", negPattern: "混乱|迷惑|不清|迷茫|chaos|confus|unclear|mess"},
	{posPattern: "未来|将来|计划|目标|预期|展望|future|plan|goal|target|expect|vision|roadmap", negPattern: "焦虑|担心|恐惧|绝望|anxious|worry|fear|despair|dread|panic"},
	// 空间维
	{posPattern: "自己|内心|自我|信念|价值观|self|inner|belief|value|mind|soul|introspect", negPattern: "内耗|矛盾|冲突|纠结|conflict|contradict|struggle|tension|dilemma"},
	{posPattern: "连接|沟通|协调|桥梁|关系|connect|communicat|bridge|link|relat|channel|coordinate", negPattern: "阻塞|断裂|无法|隔阂|block|disconnect|broken|barrier|gap|isolat"},
	{posPattern: "世界|环境|市场|外部|他人|world|environ|market|external|other|outside", negPattern: "威胁|危险|危机|风险|threat|danger|crisis|risk|hazard|peril"},
	// 因果维
	{posPattern: "因为|所以|原因|动机|目的|because|cause|reason|motiv|purpose|why|due to", negPattern: ""},
	{posPattern: "条件|机会|资源|工具|condition|opportunity|resource|tool|means|chance", negPattern: ""},
	{posPattern: "结果|成果|实现|完成|result|outcome|achieve|accomplish|done|success|effect", negPattern: ""},
}

// keywordMapToVector 关键词规则映射（与TS仓库 contentToTritVector 对齐）
func keywordMapToVector(input string) cogspace.CogVector {
	lower := strings.ToLower(input)
	var v cogspace.CogVector

	for i, rule := range keywordRules {
		if rule.posPattern != "" && containsAny(lower, rule.posPattern) {
			v[i] = cogspace.TriPos
		} else if rule.negPattern != "" && containsAny(lower, rule.negPattern) {
			v[i] = cogspace.TriNeg
		} else {
			v[i] = cogspace.TriMid
		}
	}

	// 全和 → 悬置观察态
	allMid := true
	for _, s := range v {
		if s != cogspace.TriMid {
			allMid = false
			break
		}
	}
	if allMid {
		return cogspace.NewZeroVector()
	}

	// 时间链传播：过去+现在同向 → 未来同向
	if v[0] == cogspace.TriPos && v[1] == cogspace.TriPos {
		v[2] = cogspace.TriPos
	} else if v[0] == cogspace.TriNeg && v[1] == cogspace.TriNeg {
		v[2] = cogspace.TriNeg
	}

	// 因果链传播：因+缘同向 → 果同向
	if v[6] == cogspace.TriPos && v[7] == cogspace.TriPos {
		v[8] = cogspace.TriPos
	} else if v[6] == cogspace.TriNeg || v[7] == cogspace.TriNeg {
		v[8] = cogspace.TriNeg
	}

	return v
}

// containsAny 检查文本是否包含任意一个关键词（简化版正则匹配）
func containsAny(text, patterns string) bool {
	parts := strings.Split(patterns, "|")
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" && strings.Contains(text, p) {
			return true
		}
	}
	return false
}

// ═══════════════════════════════════════════════════════════════════════════
// 后置钩子：结果写入认知记忆池
// ═══════════════════════════════════════════════════════════════════════════

// AgentPostStep 每轮推理后置钩子：将结果编码为新认知点位写入记忆池
//
// 对应TC-AGI仓库接入点：
//   - autonomous-loop.ts → executeSubTask() 完成后调用
//   - engine.ts → executeStep() 完成后调用
func AgentPostStep(
	resultText string,
	intentVec cogspace.CogVector,
	mem *CogMemory,
	score float64,
) {
	// 将推理结果文本重新映射为向量（可能因结果内容而微调）
	resultVec := ParseTextToVector(resultText)

	// 如果结果向量与意图向量不同，使用结果向量写入（更精确）
	writeVec := resultVec
	if cogspace.DistHamming(resultVec, intentVec) == 0 {
		// 向量相同，直接使用意图向量
		writeVec = intentVec
	}

	// 写入认知记忆池
	mem.WriteWithTags(writeVec, resultText, score, []string{"reasoning", "post-step"})
}

// ═══════════════════════════════════════════════════════════════════════════
// 双重终止校验
// ═══════════════════════════════════════════════════════════════════════════

// TerminationCheck 双重终止校验
//
// 第一层：原有业务完成判定（由调用方传入）
// 第二层：认知空间收敛距离阈值
//
// 只有两层都通过才允许终止，否则强制继续迭代
type TerminationCheck struct {
	// BusinessDone 业务完成判定（原有逻辑）
	BusinessDone bool
	// CogConverged 认知收敛判定
	CogConverged bool
	// CogVector 当前认知向量
	CogVector cogspace.CogVector
	// BiasDistance 到原点距离
	BiasDistance float64
	// ConvergeThreshold 收敛阈值
	ConvergeThreshold float64
}

// CanTerminate 是否可以终止任务
func (tc *TerminationCheck) CanTerminate() bool {
	return tc.BusinessDone && tc.CogConverged
}

// CheckTermination 执行双重终止校验
func CheckTermination(businessDone bool, currentVec cogspace.CogVector) TerminationCheck {
	cfg := cogspace.GetConfig()
	bias := currentVec.BiasToOrigin()
	converged := cfg.IsConverged(currentVec)

	return TerminationCheck{
		BusinessDone:      businessDone,
		CogConverged:      converged,
		CogVector:         currentVec,
		BiasDistance:      bias,
		ConvergeThreshold: cfg.ConvergeThresh,
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 完整Agent认知循环示例
// ═══════════════════════════════════════════════════════════════════════════

// CogAgentLoop 完整的认知Agent循环
//
// 展示如何将认知钩子嵌入Agent Harness的ReAct循环：
//   1. 前置：AgentStep（向量映射 + 极端中和 + 记忆召回 + 收敛校验）
//   2. 中间：原有业务逻辑执行（LLM推理 + 工具调用）
//   3. 后置：AgentPostStep（结果写入记忆池）
//   4. 终止：CheckTermination（双重校验）
type CogAgentLoop struct {
	Memory      *CogMemory
	MaxRounds   int           // 最大迭代轮数
	ReflectionFn func(string, string) (string, error) // 反思函数（LLM调用）
}

// NewCogAgentLoop 创建认知Agent循环
func NewCogAgentLoop(mem *CogMemory) *CogAgentLoop {
	return &CogAgentLoop{
		Memory:    mem,
		MaxRounds: 10,
	}
}

// Run 执行完整的认知Agent循环
//
// intentText: 用户意图文本
// executeFn: 业务执行函数（返回结果文本 + 是否完成）
// 返回：最终结果文本 + 终止校验结果
func (loop *CogAgentLoop) Run(
	intentText string,
	executeFn func(intent string, supplement string) (result string, businessDone bool, err error),
) (string, TerminationCheck, error) {
	var lastResult string
	var lastVec cogspace.CogVector

	for round := 0; round < loop.MaxRounds; round++ {
		// ━━━ 前置认知钩子 ━━━
		hookOut := AgentStep(intentText, loop.Memory)
		lastVec = hookOut.TargetVector

		// ━━━ 执行业务逻辑 ━━━
		result, businessDone, err := executeFn(intentText, hookOut.SupplementContext)
		if err != nil {
			return result, TerminationCheck{}, err
		}
		lastResult = result

		// ━━━ 后置认知钩子：写入记忆池 ━━━
		score := 0.5
		if businessDone {
			score = 1.0
		}
		AgentPostStep(result, hookOut.TargetVector, loop.Memory, score)

		// ━━━ 双重终止校验 ━━━
		termCheck := CheckTermination(businessDone, lastVec)
		if termCheck.CanTerminate() {
			return lastResult, termCheck, nil
		}

		// ━━━ 未收敛 → 注入反思Prompt强制继续 ━━━
		if termCheck.NeedsReflection() && loop.ReflectionFn != nil {
			reflection, err := loop.ReflectionFn(intentText, lastResult)
			if err == nil && reflection != "" {
				// 将反思结果写入记忆
				reflVec := ParseTextToVector(reflection)
				loop.Memory.Write(reflVec, reflection, 0.3)
				// 更新意图为反思结果
				intentText = reflection
			}
		}
	}

	// 达到最大轮数
	termCheck := CheckTermination(false, lastVec)
	return lastResult, termCheck, nil
}

// NeedsReflection 终止校验是否需要反思
func (tc *TerminationCheck) NeedsReflection() bool {
	return !tc.CogConverged
}

// String 终止校验结果的可读字符串
func (tc *TerminationCheck) String() string {
	status := "继续迭代"
	if tc.CanTerminate() {
		status = "可以终止"
	}
	return fmt.Sprintf("终止校验[%s] 业务=%v 认知收敛=%v 偏差=%.4f 阈值=%.4f",
		status, tc.BusinessDone, tc.CogConverged, tc.BiasDistance, tc.ConvergeThreshold)
}
