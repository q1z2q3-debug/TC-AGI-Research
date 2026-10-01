package agent

import (
	"fmt"
	"os"
	"sync"
	"testing"

	"github.com/q1z2q3-debug/TC-AGI-Research/cogspace"
)

// ═══════════════════════════════════════════════════════════════════════════
// 认知记忆池读写测试
// ═══════════════════════════════════════════════════════════════════════════

// TestMemoryWriteRead 基本读写测试
func TestMemoryWriteRead(t *testing.T) {
	mem := NewCogMemory()

	vec := cogspace.NewVector(
		cogspace.TriPos, cogspace.TriMid, cogspace.TriNeg,
		cogspace.TriPos, cogspace.TriMid, cogspace.TriNeg,
		cogspace.TriPos, cogspace.TriMid, cogspace.TriNeg,
	)

	mem.Write(vec, "测试认知点位", 0.8)

	if mem.Count() != 1 {
		t.Errorf("expected count=1, got %d", mem.Count())
	}

	node := mem.Read(vec)
	if node == nil {
		t.Fatal("read returned nil")
	}
	if node.Text != "测试认知点位" {
		t.Errorf("text mismatch: %s", node.Text)
	}
	if node.Score != 0.8 {
		t.Errorf("score mismatch: %f", node.Score)
	}
}

// TestMemoryWriteByID 按ID写入测试
func TestMemoryWriteByID(t *testing.T) {
	mem := NewCogMemory()

	ok := mem.WriteByID(9841, "原点认知", 1.0)
	if !ok {
		t.Error("WriteByID should succeed for valid ID")
	}

	node := mem.ReadByID(9841)
	if node == nil {
		t.Fatal("read by ID returned nil")
	}
	if node.Text != "原点认知" {
		t.Errorf("text mismatch: %s", node.Text)
	}
}

// TestMemoryWriteInvalidID 非法ID写入测试
func TestMemoryWriteInvalidID(t *testing.T) {
	mem := NewCogMemory()
	ok := mem.WriteByID(cogspace.TotalNum, "invalid", 0.5)
	if ok {
		t.Error("should fail for invalid ID")
	}
}

// TestMemoryOverwrite 覆盖写入测试
func TestMemoryOverwrite(t *testing.T) {
	mem := NewCogMemory()
	vec := cogspace.NewZeroVector()

	mem.Write(vec, "第一版", 0.5)
	mem.Write(vec, "第二版", 0.9)

	if mem.Count() != 1 {
		t.Errorf("overwrite should not increase count, got %d", mem.Count())
	}

	node := mem.Read(vec)
	if node.Text != "第二版" {
		t.Errorf("expected '第二版', got '%s'", node.Text)
	}
	if node.Score != 0.9 {
		t.Errorf("expected score 0.9, got %f", node.Score)
	}
}

// TestMemoryDelete 删除测试
func TestMemoryDelete(t *testing.T) {
	mem := NewCogMemory()
	vec := cogspace.NewZeroVector()

	mem.Write(vec, "待删除", 0.5)
	if mem.Count() != 1 {
		t.Fatalf("expected 1, got %d", mem.Count())
	}

	mem.Delete(vec)
	if mem.Count() != 0 {
		t.Errorf("expected 0 after delete, got %d", mem.Count())
	}
	if mem.Has(vec) {
		t.Error("Has should return false after delete")
	}
}

// TestMemoryHas 检查存在性
func TestMemoryHas(t *testing.T) {
	mem := NewCogMemory()
	vec := cogspace.NewVector(cogspace.TriPos, cogspace.TriPos, cogspace.TriPos,
		cogspace.TriMid, cogspace.TriMid, cogspace.TriMid,
		cogspace.TriMid, cogspace.TriMid, cogspace.TriMid)

	if mem.Has(vec) {
		t.Error("should not exist before write")
	}

	mem.Write(vec, "test", 0.5)
	if !mem.Has(vec) {
		t.Error("should exist after write")
	}
}

// TestMemoryClear 清空测试
func TestMemoryClear(t *testing.T) {
	mem := NewCogMemory()

	for i := 0; i < 5; i++ {
		vec := cogspace.NewZeroVector()
		vec[i] = cogspace.TriPos
		mem.Write(vec, fmt.Sprintf("认知-%d", i), 0.5)
	}

	if mem.Count() != 5 {
		t.Fatalf("expected 5, got %d", mem.Count())
	}

	mem.Clear()
	if mem.Count() != 0 {
		t.Errorf("expected 0 after clear, got %d", mem.Count())
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// TopK召回测试
// ═══════════════════════════════════════════════════════════════════════════

// TestSearchTopK TopK召回测试
func TestSearchTopK(t *testing.T) {
	mem := NewCogMemory()

	// 写入5个认知点位
	points := []struct {
		vec  cogspace.CogVector
		text string
	}{
		{cogspace.NewVector(cogspace.TriPos, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid), "近-单维阳"},
		{cogspace.NewVector(cogspace.TriPos, cogspace.TriPos, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid), "中近-双维阳"},
		{cogspace.NewVector(cogspace.TriPos, cogspace.TriPos, cogspace.TriPos, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid), "中远-三维阳"},
		{cogspace.NewVector(cogspace.TriPos, cogspace.TriPos, cogspace.TriPos, cogspace.TriPos, cogspace.TriPos, cogspace.TriPos, cogspace.TriPos, cogspace.TriPos, cogspace.TriPos), "远-全阳"},
		{cogspace.NewVector(cogspace.TriNeg, cogspace.TriNeg, cogspace.TriNeg, cogspace.TriNeg, cogspace.TriNeg, cogspace.TriNeg, cogspace.TriNeg, cogspace.TriNeg, cogspace.TriNeg), "最远-全阴"},
	}

	for _, p := range points {
		mem.Write(p.vec, p.text, 0.5)
	}

	// 以原点为目标，召回Top3
	target := cogspace.NewZeroVector()
	results := mem.SearchTopK(target, 3)

	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}

	// 最近的应该是单维阳
	if results[0].Text != "近-单维阳" {
		t.Errorf("nearest should be '近-单维阳', got '%s'", results[0].Text)
	}
}

// TestSearchTopKEmpty 空池召回
func TestSearchTopKEmpty(t *testing.T) {
	mem := NewCogMemory()
	results := mem.SearchTopK(cogspace.NewZeroVector(), 3)
	if len(results) != 0 {
		t.Errorf("empty pool should return 0 results, got %d", len(results))
	}
}

// TestSearchTopKKLargerThanCount K大于已写入数量
func TestSearchTopKKLargerThanCount(t *testing.T) {
	mem := NewCogMemory()
	mem.Write(cogspace.NewZeroVector(), "only one", 0.5)

	results := mem.SearchTopK(cogspace.NewZeroVector(), 10)
	if len(results) != 1 {
		t.Errorf("expected 1 result, got %d", len(results))
	}
}

// TestSearchTopKWithDecay 带时间衰减的TopK召回
func TestSearchTopKWithDecay(t *testing.T) {
	mem := NewCogMemory()

	// 写入两个等距离的点位
	vec1 := cogspace.NewVector(cogspace.TriPos, cogspace.TriMid, cogspace.TriMid,
		cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid)
	vec2 := cogspace.NewVector(cogspace.TriNeg, cogspace.TriMid, cogspace.TriMid,
		cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid)

	mem.Write(vec1, "新鲜认知", 0.5)
	mem.Write(vec2, "陈旧认知", 0.5)

	// 以原点为目标，两个距离相同
	results := mem.SearchTopKWithDecay(cogspace.NewZeroVector(), 2, 0.0)
	if len(results) != 2 {
		t.Fatalf("expected 2, got %d", len(results))
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 协程安全测试
// ═══════════════════════════════════════════════════════════════════════════

// TestConcurrentWriteRead 并发读写测试
func TestConcurrentWriteRead(t *testing.T) {
	mem := NewCogMemory()
	var wg sync.WaitGroup

	// 并发写入
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			vec := cogspace.NewZeroVector()
			vec[idx%9] = cogspace.TriState(idx % 3 - 1)
			mem.Write(vec, fmt.Sprintf("concurrent-%d", idx), 0.5)
		}(i)
	}

	// 并发读取
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			mem.SearchTopK(cogspace.NewZeroVector(), 5)
		}()
	}

	wg.Wait()

	// 验证最终状态一致
	if mem.Count() == 0 {
		t.Error("count should not be 0 after concurrent writes")
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 快照落盘加载测试
// ═══════════════════════════════════════════════════════════════════════════

// TestSnapshotRoundTrip 快照保存加载往返测试
func TestSnapshotRoundTrip(t *testing.T) {
	mem1 := NewCogMemory()

	// 写入多个认知
	vecs := []cogspace.CogVector{
		cogspace.NewZeroVector(),
		cogspace.NewVector(cogspace.TriPos, cogspace.TriPos, cogspace.TriMid,
			cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid),
		cogspace.NewVector(cogspace.TriNeg, cogspace.TriNeg, cogspace.TriNeg,
			cogspace.TriNeg, cogspace.TriNeg, cogspace.TriNeg, cogspace.TriNeg, cogspace.TriNeg, cogspace.TriNeg),
	}
	for i, v := range vecs {
		mem1.Write(v, fmt.Sprintf("认知-%d", i), float64(i)/3.0)
	}

	// 保存快照
	path := fmt.Sprintf("/tmp/cog_mem_test_%d.json", os.Getpid())
	defer os.Remove(path)

	if err := mem1.SaveSnapshot(path); err != nil {
		t.Fatalf("save snapshot: %v", err)
	}

	// 加载到新实例
	mem2 := NewCogMemory()
	if err := mem2.LoadSnapshot(path); err != nil {
		t.Fatalf("load snapshot: %v", err)
	}

	// 验证数据一致
	if mem1.Count() != mem2.Count() {
		t.Fatalf("count mismatch: %d vs %d", mem1.Count(), mem2.Count())
	}

	for i, v := range vecs {
		node := mem2.Read(v)
		if node == nil {
			t.Fatalf("node %d not found after load", i)
		}
		expected := fmt.Sprintf("认知-%d", i)
		if node.Text != expected {
			t.Errorf("node %d text: expected '%s', got '%s'", i, expected, node.Text)
		}
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 统计信息测试
// ═══════════════════════════════════════════════════════════════════════════

// TestMemoryStats 统计信息测试
func TestMemoryStats(t *testing.T) {
	mem := NewCogMemory()

	// 空池统计
	stats := mem.GetStats()
	if stats.TotalNodes != 0 {
		t.Errorf("empty pool: expected 0 nodes, got %d", stats.TotalNodes)
	}
	if stats.Capacity != cogspace.TotalNum {
		t.Errorf("capacity: expected %d, got %d", cogspace.TotalNum, stats.Capacity)
	}

	// 写入后统计
	mem.Write(cogspace.NewZeroVector(), "test1", 0.5)
	mem.Write(cogspace.NewVector(cogspace.TriPos, cogspace.TriMid, cogspace.TriMid,
		cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid, cogspace.TriMid), "test2", 1.0)

	stats = mem.GetStats()
	if stats.TotalNodes != 2 {
		t.Errorf("expected 2 nodes, got %d", stats.TotalNodes)
	}
	if stats.AvgScore != 0.75 {
		t.Errorf("expected avg score 0.75, got %f", stats.AvgScore)
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 文本向量解析测试
// ═══════════════════════════════════════════════════════════════════════════

// TestParseTextToVectorKeyword 关键词映射测试
func TestParseTextToVectorKeyword(t *testing.T) {
	// 时间维度关键词
	vec := ParseTextToVector("回顾过去的经验，展望未来的计划")
	if vec[0] != cogspace.TriPos {
		t.Errorf("past should be Pos for '过去', got %v", vec[0])
	}
	if vec[2] != cogspace.TriPos {
		t.Errorf("future should be Pos for '未来/计划', got %v", vec[2])
	}

	// 空间维度关键词
	vec2 := ParseTextToVector("内心的信念连接外部世界")
	if vec2[3] != cogspace.TriPos {
		t.Errorf("internal should be Pos for '内心/信念', got %v", vec2[3])
	}
	if vec2[4] != cogspace.TriPos {
		t.Errorf("medial should be Pos for '连接', got %v", vec2[4])
	}
	if vec2[5] != cogspace.TriPos {
		t.Errorf("external should be Pos for '世界', got %v", vec2[5])
	}
}

// TestParseTextToVectorJSON JSON解析测试
func TestParseTextToVectorJSON(t *testing.T) {
	jsonStr := `{"past":1,"present":0,"future":-1,"internal":1,"medial":0,"external":-1,"cause":1,"condition":0,"effect":-1}`
	vec := ParseTextToVector(jsonStr)

	if vec[0] != cogspace.TriPos {
		t.Errorf("past should be Pos, got %v", vec[0])
	}
	if vec[2] != cogspace.TriNeg {
		t.Errorf("future should be Neg, got %v", vec[2])
	}
	if vec[8] != cogspace.TriNeg {
		t.Errorf("effect should be Neg, got %v", vec[8])
	}
}

// TestParseTextToVectorJSONMarkdown Markdown代码块中的JSON
func TestParseTextToVectorJSONMarkdown(t *testing.T) {
	input := "```json\n{\"past\":1,\"present\":1,\"future\":0,\"internal\":0,\"medial\":0,\"external\":0,\"cause\":0,\"condition\":0,\"effect\":0}\n```"
	vec := ParseTextToVector(input)

	if vec[0] != cogspace.TriPos {
		t.Errorf("past should be Pos, got %v", vec[0])
	}
	if vec[1] != cogspace.TriPos {
		t.Errorf("present should be Pos, got %v", vec[1])
	}
}

// TestParseTextToVectorEmpty 空文本→零向量
func TestParseTextToVectorEmpty(t *testing.T) {
	vec := ParseTextToVector("")
	// 空文本应返回零向量
	zero := cogspace.NewZeroVector()
	for i := 0; i < cogspace.DimNum; i++ {
		if vec[i] != zero[i] {
			t.Errorf("dim %d: expected %v, got %v", i, zero[i], vec[i])
		}
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// AgentStep钩子测试
// ═══════════════════════════════════════════════════════════════════════════

// TestAgentStepNormal 正常输入的AgentStep
func TestAgentStepNormal(t *testing.T) {
	mem := NewCogMemory()
	// 预写入一些历史认知
	mem.Write(cogspace.NewZeroVector(), "历史平衡态认知", 0.5)

	out := AgentStep("回顾过去的经验", mem)

	if out.TargetVector[0] != cogspace.TriPos {
		t.Errorf("past should be Pos, got %v", out.TargetVector[0])
	}
}

// TestAgentStepExtreme 极端认知自动中和
func TestAgentStepExtreme(t *testing.T) {
	mem := NewCogMemory()

	// 构造极端向量（全阳，9维非零）
	jsonStr := `{"past":1,"present":1,"future":1,"internal":1,"medial":1,"external":1,"cause":1,"condition":1,"effect":1}`
	out := AgentStep(jsonStr, mem)

	if !out.IsExtreme {
		t.Error("should detect extreme")
	}
	// 中和后应该与原点融合（阳+和=阳，所以仍为阳）
	// 但关键是检测到了极端并执行了中和流程
}

// TestAgentStepConvergence 收敛判定
func TestAgentStepConvergence(t *testing.T) {
	mem := NewCogMemory()

	// 原点附近（零向量）→ 收敛
	out := AgentStep("", mem)
	if !out.IsConverged {
		t.Error("zero vector should be converged")
	}

	// 极端向量 → 未收敛
	jsonStr := `{"past":1,"present":1,"future":1,"internal":1,"medial":1,"external":1,"cause":1,"condition":1,"effect":1}`
	out2 := AgentStep(jsonStr, mem)
	if out2.IsConverged {
		t.Error("extreme vector should not be converged")
	}
	if !out2.NeedsReflection {
		t.Error("should need reflection when not converged")
	}
	if out2.ReflectionPrompt == "" {
		t.Error("reflection prompt should not be empty")
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 双重终止校验测试
// ═══════════════════════════════════════════════════════════════════════════

// TestTerminationCheckBothPass 双重通过
func TestTerminationCheckBothPass(t *testing.T) {
	vec := cogspace.NewZeroVector()
	tc := CheckTermination(true, vec)

	if !tc.BusinessDone {
		t.Error("business should be done")
	}
	if !tc.CogConverged {
		t.Error("should be converged")
	}
	if !tc.CanTerminate() {
		t.Error("should be able to terminate when both pass")
	}
}

// TestTerminationCheckCogNotConverged 认知未收敛
func TestTerminationCheckCogNotConverged(t *testing.T) {
	vec := cogspace.NewVector(cogspace.TriPos, cogspace.TriPos, cogspace.TriPos,
		cogspace.TriPos, cogspace.TriPos, cogspace.TriPos, cogspace.TriPos, cogspace.TriPos, cogspace.TriPos)
	tc := CheckTermination(true, vec)

	if !tc.BusinessDone {
		t.Error("business should be done")
	}
	if tc.CogConverged {
		t.Error("should not be converged (bias=3.0 > 2.5)")
	}
	if tc.CanTerminate() {
		t.Error("should NOT be able to terminate when cog not converged")
	}
}

// TestTerminationCheckBusinessNotDone 业务未完成
func TestTerminationCheckBusinessNotDone(t *testing.T) {
	vec := cogspace.NewZeroVector()
	tc := CheckTermination(false, vec)

	if tc.CanTerminate() {
		t.Error("should NOT terminate when business not done")
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Agent循环测试
// ═══════════════════════════════════════════════════════════════════════════

// TestCogAgentLoop 完整循环测试
func TestCogAgentLoop(t *testing.T) {
	mem := NewCogMemory()
	loop := NewCogAgentLoop(mem)
	loop.MaxRounds = 3

	callCount := 0
	result, tc, err := loop.Run(
		"测试任务",
		func(intent, supplement string) (string, bool, error) {
			callCount++
			if callCount >= 2 {
				return "任务完成", true, nil
			}
			return "进行中", false, nil
		},
	)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != "任务完成" {
		t.Errorf("expected '任务完成', got '%s'", result)
	}
	if callCount < 2 {
		t.Errorf("expected at least 2 calls, got %d", callCount)
	}
	_ = tc // 终止校验结果
}

// TestCogAgentLoopMaxRounds 达到最大轮数
func TestCogAgentLoopMaxRounds(t *testing.T) {
	mem := NewCogMemory()
	loop := NewCogAgentLoop(mem)
	loop.MaxRounds = 2

	_, tc, err := loop.Run(
		"永不完成的任务",
		func(intent, supplement string) (string, bool, error) {
			return "继续", false, nil
		},
	)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tc.CanTerminate() {
		t.Error("should not be able to terminate at max rounds")
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 性能基准
// ═══════════════════════════════════════════════════════════════════════════

// BenchmarkMemoryWrite 写入基准
func BenchmarkMemoryWrite(b *testing.B) {
	mem := NewCogMemory()
	vec := cogspace.NewZeroVector()
	for i := 0; i < b.N; i++ {
		vec[0] = cogspace.TriState(i % 3 - 1)
		mem.Write(vec, "bench", 0.5)
	}
}

// BenchmarkSearchTopK TopK召回基准
func BenchmarkSearchTopK(b *testing.B) {
	mem := NewCogMemory()
	// 预写入100个点位
	for i := 0; i < 100; i++ {
		vec := cogspace.NewZeroVector()
		vec[i%9] = cogspace.TriState(i % 3 - 1)
		mem.Write(vec, "bench", 0.5)
	}
	target := cogspace.NewZeroVector()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		mem.SearchTopK(target, 5)
	}
}

// BenchmarkAgentStep AgentStep钩子基准
func BenchmarkAgentStep(b *testing.B) {
	mem := NewCogMemory()
	mem.Write(cogspace.NewZeroVector(), "历史认知", 0.5)
	for i := 0; i < b.N; i++ {
		AgentStep("回顾过去的经验，展望未来", mem)
	}
}
