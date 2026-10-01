package cogspace

import (
	"fmt"
	"math"
	"os"
	"testing"
)

// ═══════════════════════════════════════════════════════════════════════════
// 全量编解码可逆性测试：遍历19683个点位
// ═══════════════════════════════════════════════════════════════════════════

// TestEncodeDecodeAll 全量校验19683点位编解码双向可逆，无映射误差
// 这是验收标准第1条的核心测试
func TestEncodeDecodeAll(t *testing.T) {
	for rawID := uint16(0); rawID < TotalNum; rawID++ {
		vec, ok := Decode(CogID(rawID))
		if !ok {
			t.Fatalf("decode fail at id=%d", rawID)
		}
		backID := vec.Encode()
		if backID != CogID(rawID) {
			t.Fatalf("round-trip mismatch: id=%d → vec=%v → id=%d", rawID, vec, backID)
		}
	}
}

// TestEncodeDecodeAllReverse 反向遍历，确保无顺序依赖
func TestEncodeDecodeAllReverse(t *testing.T) {
	for rawID := TotalNum - 1; rawID > 0; rawID-- {
		vec, ok := Decode(CogID(rawID))
		if !ok {
			t.Fatalf("decode fail at id=%d", rawID)
		}
		backID := vec.Encode()
		if backID != CogID(rawID) {
			t.Fatalf("reverse round-trip mismatch: id=%d → id=%d", rawID, backID)
		}
	}
}

// TestDecodeInvalidID 非法ID应返回false
func TestDecodeInvalidID(t *testing.T) {
	_, ok := Decode(CogID(TotalNum))
	if ok {
		t.Error("should reject id >= TotalNum")
	}
	_, ok = Decode(CogID(TotalNum + 1))
	if ok {
		t.Error("should reject id > TotalNum")
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 边界值测试
// ═══════════════════════════════════════════════════════════════════════════

// TestBoundaryAllNeg 全阴向量（ID=0）
func TestBoundaryAllNeg(t *testing.T) {
	expected := NewVector(TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg)
	id := expected.Encode()
	if id != 0 {
		t.Fatalf("all-neg should encode to 0, got %d", id)
	}
	vec, ok := Decode(0)
	if !ok {
		t.Fatal("decode id=0 failed")
	}
	for i := 0; i < DimNum; i++ {
		if vec[i] != TriNeg {
			t.Fatalf("dim %d: expected TriNeg, got %v", i, vec[i])
		}
	}
}

// TestBoundaryAllPos 全阳向量（ID=19682）
func TestBoundaryAllPos(t *testing.T) {
	expected := NewVector(TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos)
	id := expected.Encode()
	if id != TotalNum-1 {
		t.Fatalf("all-pos should encode to %d, got %d", TotalNum-1, id)
	}
	vec, ok := Decode(CogID(TotalNum - 1))
	if !ok {
		t.Fatal("decode id=19682 failed")
	}
	for i := 0; i < DimNum; i++ {
		if vec[i] != TriPos {
			t.Fatalf("dim %d: expected TriPos, got %v", i, vec[i])
		}
	}
}

// TestBoundaryAllMid 全和向量（原点，ID=9841）
func TestBoundaryAllMid(t *testing.T) {
	expected := NewZeroVector()
	id := expected.Encode()
	if id != Offset {
		t.Fatalf("all-mid should encode to %d, got %d", Offset, id)
	}
	vec, ok := Decode(CogID(Offset))
	if !ok {
		t.Fatal("decode id=9841 failed")
	}
	for i := 0; i < DimNum; i++ {
		if vec[i] != TriMid {
			t.Fatalf("dim %d: expected TriMid, got %v", i, vec[i])
		}
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 负数区间解码专项测试（原bug的重灾区）
// ═══════════════════════════════════════════════════════════════════════════

// TestNegativeValDecode 专门测试 val < 0 的点位解码
// 原始bug：Go的 % 对负数保留符号，导致负余数未被switch匹配
func TestNegativeValDecode(t *testing.T) {
	// 构造一个明确的负数场景：单维度为阴
	// v[8]=-1 (3^0=1), 其余为和 → sum = -1, ID = -1 + 9841 = 9840
	v1 := NewVector(TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriNeg)
	id1 := v1.Encode()
	if id1 != 9840 {
		t.Fatalf("expected id=9840, got %d", id1)
	}
	back1, _ := Decode(id1)
	if back1[8] != TriNeg {
		t.Fatalf("expected v[8]=TriNeg, got %v", back1[8])
	}

	// v[7]=-1 (3^1=3) → sum = -3, ID = 9838
	v2 := NewVector(TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriNeg, TriMid)
	id2 := v2.Encode()
	if id2 != 9838 {
		t.Fatalf("expected id=9838, got %d", id2)
	}
	back2, _ := Decode(id2)
	if back2[7] != TriNeg {
		t.Fatalf("expected v[7]=TriNeg, got %v", back2[7])
	}

	// 混合正负：v[7]=-1, v[8]=+1 → sum = -3+1 = -2, ID = 9839
	v3 := NewVector(TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriNeg, TriPos)
	id3 := v3.Encode()
	if id3 != 9839 {
		t.Fatalf("expected id=9839, got %d", id3)
	}
	back3, _ := Decode(id3)
	if back3[7] != TriNeg || back3[8] != TriPos {
		t.Fatalf("expected v[7]=TriNeg, v[8]=TriPos, got %v, %v", back3[7], back3[8])
	}

	// v[0]=-1 (3^8=6561) → sum = -6561, ID = 3280
	v4 := NewVector(TriNeg, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid)
	id4 := v4.Encode()
	if id4 != 3280 {
		t.Fatalf("expected id=3280, got %d", id4)
	}
	back4, _ := Decode(id4)
	if back4[0] != TriNeg {
		t.Fatalf("expected v[0]=TriNeg, got %v", back4[0])
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 距离度量精度测试
// ═══════════════════════════════════════════════════════════════════════════

// TestDistHamming 汉明距离精度
func TestDistHamming(t *testing.T) {
	a := NewZeroVector()
	b := NewZeroVector()
	if DistHamming(a, b) != 0 {
		t.Error("identical vectors should have hamming distance 0")
	}

	c := NewVector(TriPos, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid)
	if DistHamming(a, c) != 1 {
		t.Errorf("expected 1, got %d", DistHamming(a, c))
	}

	d := NewVector(TriPos, TriNeg, TriPos, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid)
	if DistHamming(a, d) != 3 {
		t.Errorf("expected 3, got %d", DistHamming(a, d))
	}

	e := NewVector(TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos)
	if DistHamming(a, e) != 9 {
		t.Errorf("expected 9, got %d", DistHamming(a, e))
	}
}

// TestDistEuclid 欧式距离精度
func TestDistEuclid(t *testing.T) {
	a := NewZeroVector()
	b := NewZeroVector()
	if DistEuclid(a, b) != 0 {
		t.Error("identical vectors should have euclidean distance 0")
	}

	// 单维差异1：sqrt(1) = 1
	c := NewVector(TriPos, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid)
	if d := DistEuclid(a, c); math.Abs(d-1.0) > 1e-9 {
		t.Errorf("expected 1.0, got %f", d)
	}

	// 全阳vs全阴：sqrt(9 * 4) = 6
	pos := NewVector(TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos)
	neg := NewVector(TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg)
	if d := DistEuclid(pos, neg); math.Abs(d-6.0) > 1e-9 {
		t.Errorf("expected 6.0, got %f", d)
	}

	// 单维阴阳对立：sqrt(4) = 2
	d2 := NewVector(TriNeg, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid)
	if d := DistEuclid(c, d2); math.Abs(d-2.0) > 1e-9 {
		t.Errorf("expected 2.0, got %f", d)
	}
}

// TestDistManhattan 曼哈顿距离精度
func TestDistManhattan(t *testing.T) {
	a := NewZeroVector()
	b := NewZeroVector()
	if DistManhattan(a, b) != 0 {
		t.Error("identical vectors should have manhattan distance 0")
	}

	c := NewVector(TriPos, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid)
	if DistManhattan(a, c) != 1 {
		t.Errorf("expected 1, got %d", DistManhattan(a, c))
	}

	pos := NewVector(TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos)
	neg := NewVector(TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg)
	if DistManhattan(pos, neg) != 18 {
		t.Errorf("expected 18, got %d", DistManhattan(pos, neg))
	}
}

// TestDistWeightedManhattan 分域加权曼哈顿距离精度
func TestDistWeightedManhattan(t *testing.T) {
	a := NewZeroVector()

	// 仅时间维差异1：距离 = 1 * e
	t1 := NewVector(TriPos, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid)
	if d := DistWeightedManhattan(a, t1); math.Abs(d-Euler) > 1e-9 {
		t.Errorf("time dim: expected %f, got %f", Euler, d)
	}

	// 仅空间维差异1：距离 = 1 * π
	s1 := NewVector(TriMid, TriMid, TriMid, TriPos, TriMid, TriMid, TriMid, TriMid, TriMid)
	if d := DistWeightedManhattan(a, s1); math.Abs(d-Pi) > 1e-9 {
		t.Errorf("space dim: expected %f, got %f", Pi, d)
	}

	// 仅因果维差异1：距离 = 1 * γ
	c1 := NewVector(TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriPos, TriMid, TriMid)
	if d := DistWeightedManhattan(a, c1); math.Abs(d-Gamma) > 1e-9 {
		t.Errorf("cause dim: expected %f, got %f", Gamma, d)
	}

	// 三域各差异1：距离 = e + π + γ
	all1 := NewVector(TriPos, TriMid, TriMid, TriPos, TriMid, TriMid, TriPos, TriMid, TriMid)
	expected := Euler + Pi + Gamma
	if d := DistWeightedManhattan(a, all1); math.Abs(d-expected) > 1e-9 {
		t.Errorf("all dims: expected %f, got %f", expected, d)
	}
}

// TestDistWeightedManhattanWith 自定义权重测试
func TestDistWeightedManhattanWith(t *testing.T) {
	a := NewZeroVector()
	b := NewVector(TriPos, TriMid, TriMid, TriPos, TriMid, TriMid, TriPos, TriMid, TriMid)

	// 等权1.0：应该等于3（三域各差异1）
	if d := DistWeightedManhattanWith(a, b, 1.0, 1.0, 1.0); math.Abs(d-3.0) > 1e-9 {
		t.Errorf("equal weights: expected 3.0, got %f", d)
	}

	// 权重0：应该为0
	if d := DistWeightedManhattanWith(a, b, 0, 0, 0); d != 0 {
		t.Errorf("zero weights: expected 0, got %f", d)
	}
}

// TestBiasToOrigin 原点偏差距离
func TestBiasToOrigin(t *testing.T) {
	v := NewZeroVector()
	if v.BiasToOrigin() != 0 {
		t.Error("zero vector should have 0 bias")
	}

	pos := NewVector(TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos)
	if d := pos.BiasToOrigin(); math.Abs(d-3.0) > 1e-9 {
		t.Errorf("all-pos: expected 3.0, got %f", d)
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 认知算子测试
// ═══════════════════════════════════════════════════════════════════════════

// TestMerge 阴阳和合融合测试
func TestMerge(t *testing.T) {
	// 阳+阴=和
	a := NewVector(TriPos, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid)
	b := NewVector(TriNeg, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid)
	c := Merge(a, b)
	if c[0] != TriMid {
		t.Error("merge pos+neg should be mid")
	}

	// 阳+阳=阳
	d := Merge(a, a)
	if d[0] != TriPos {
		t.Error("merge pos+pos should be pos")
	}

	// 阴+阴=阴
	e := Merge(b, b)
	if e[0] != TriNeg {
		t.Error("merge neg+neg should be neg")
	}

	// 阳+和=阳
	f := Merge(a, NewZeroVector())
	if f[0] != TriPos {
		t.Error("merge pos+mid should be pos")
	}
}

// TestMergeNeutralize 极端向量与原点中和
func TestMergeNeutralize(t *testing.T) {
	extreme := NewVector(TriPos, TriPos, TriPos, TriNeg, TriNeg, TriNeg, TriPos, TriPos, TriNeg)
	neutralized := extreme.NeutralizeWithOrigin()
	// 与原点融合后应保持原值（因为和+阳=阳, 和+阴=阴）
	for i := 0; i < DimNum; i++ {
		if neutralized[i] != extreme[i] {
			t.Errorf("dim %d: neutralize with origin should preserve, got %v vs %v", i, neutralized[i], extreme[i])
		}
	}

	// 对立向量融合应全和
	pos := NewVector(TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos)
	neg := NewVector(TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg)
	merged := Merge(pos, neg)
	for i := 0; i < DimNum; i++ {
		if merged[i] != TriMid {
			t.Errorf("dim %d: pos+neg should be mid, got %v", i, merged[i])
		}
	}
}

// TestIsExtreme 极端认知判定
func TestIsExtreme(t *testing.T) {
	// 9维全非零 → 极端
	v := NewVector(TriPos, TriPos, TriPos, TriNeg, TriNeg, TriNeg, TriPos, TriPos, TriNeg)
	if !v.IsExtreme(6) {
		t.Error("9 non-zero dims should be extreme at threshold 6")
	}
	if !v.IsExtreme(9) {
		t.Error("9 non-zero dims should be extreme at threshold 9")
	}

	// 全和 → 不极端
	zero := NewZeroVector()
	if zero.IsExtreme(1) {
		t.Error("zero vector should not be extreme")
	}

	// 3维非零，阈值4 → 不极端
	v2 := NewVector(TriPos, TriPos, TriPos, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid)
	if v2.IsExtreme(4) {
		t.Error("3 non-zero dims should not be extreme at threshold 4")
	}
	if !v2.IsExtreme(3) {
		t.Error("3 non-zero dims should be extreme at threshold 3")
	}
}

// TestMajority 多数态测试
func TestMajority(t *testing.T) {
	zero := NewZeroVector()
	if zero.Majority() != TriMid {
		t.Error("zero vector majority should be mid")
	}

	pos := NewVector(TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos)
	if pos.Majority() != TriPos {
		t.Error("all-pos majority should be pos")
	}

	neg := NewVector(TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg)
	if neg.Majority() != TriNeg {
		t.Error("all-neg majority should be neg")
	}

	// 5阳4阴 → sum=1，不大于1 → 观察态
	mixed := NewVector(TriPos, TriPos, TriPos, TriPos, TriPos, TriNeg, TriNeg, TriNeg, TriNeg)
	if mixed.Majority() != TriMid {
		t.Error("5pos4neg (sum=1, not >1) majority should be mid")
	}

	// 6阳3阴 → sum=3，大于1 → 扩张态
	mixed2 := NewVector(TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriNeg, TriNeg, TriNeg)
	if mixed2.Majority() != TriPos {
		t.Error("6pos3neg (sum=3, >1) majority should be pos")
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 配置测试
// ═══════════════════════════════════════════════════════════════════════════

// TestConfigDefaults 默认配置测试
func TestConfigDefaults(t *testing.T) {
	cfg := GetConfig()
	cfg.mu.RLock()
	defer cfg.mu.RUnlock()

	if cfg.EWeight != Euler {
		t.Errorf("default EWeight: expected %f, got %f", Euler, cfg.EWeight)
	}
	if cfg.PiWeight != Pi {
		t.Errorf("default PiWeight: expected %f, got %f", Pi, cfg.PiWeight)
	}
	if cfg.GammaWeight != Gamma {
		t.Errorf("default GammaWeight: expected %f, got %f", Gamma, cfg.GammaWeight)
	}
	if cfg.ConvergeThresh != 2.5 {
		t.Errorf("default ConvergeThresh: expected 2.5, got %f", cfg.ConvergeThresh)
	}
	if cfg.ExtremeThresh != 7 {
		t.Errorf("default ExtremeThresh: expected 7, got %d", cfg.ExtremeThresh)
	}
	if cfg.TopKNum != 3 {
		t.Errorf("default TopKNum: expected 3, got %d", cfg.TopKNum)
	}
}

// TestConfigFromEnv 环境变量加载测试
func TestConfigFromEnv(t *testing.T) {
	cfg := GetConfig()

	// 保存原始值
	origE := cfg.EWeight
	origPi := cfg.PiWeight
	origThresh := cfg.ConvergeThresh

	os.Setenv("COG_E_WEIGHT", "3.0")
	os.Setenv("COG_PI_WEIGHT", "4.0")
	os.Setenv("COG_CONVERGE_THRESHOLD", "1.5")
	defer func() {
		os.Unsetenv("COG_E_WEIGHT")
		os.Unsetenv("COG_PI_WEIGHT")
		os.Unsetenv("COG_CONVERGE_THRESHOLD")
		cfg.EWeight = origE
		cfg.PiWeight = origPi
		cfg.ConvergeThresh = origThresh
	}()

	cfg.LoadFromEnv()

	if cfg.EWeight != 3.0 {
		t.Errorf("env EWeight: expected 3.0, got %f", cfg.EWeight)
	}
	if cfg.PiWeight != 4.0 {
		t.Errorf("env PiWeight: expected 4.0, got %f", cfg.PiWeight)
	}
	if cfg.ConvergeThresh != 1.5 {
		t.Errorf("env ConvergeThresh: expected 1.5, got %f", cfg.ConvergeThresh)
	}
}

// TestConfigIsConverged 收敛判定测试
func TestConfigIsConverged(t *testing.T) {
	cfg := GetConfig()

	zero := NewZeroVector()
	if !cfg.IsConverged(zero) {
		t.Error("zero vector should be converged")
	}

	// 3维阳 → bias = sqrt(3) ≈ 1.73 < 2.5 → 收敛
	v3 := NewVector(TriPos, TriPos, TriPos, TriMid, TriMid, TriMid, TriMid, TriMid, TriMid)
	if !cfg.IsConverged(v3) {
		t.Errorf("3-dim pos (bias=%.4f) should be converged (thresh=2.5)", v3.BiasToOrigin())
	}

	// 7维阳 → bias = sqrt(7) ≈ 2.65 > 2.5 → 未收敛
	v7 := NewVector(TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriMid, TriMid)
	if cfg.IsConverged(v7) {
		t.Errorf("7-dim pos (bias=%.4f) should NOT be converged (thresh=2.5)", v7.BiasToOrigin())
	}
}

// TestConfigIsExtremeConfig 动态配置极端检测
func TestConfigIsExtremeConfig(t *testing.T) {
	cfg := GetConfig()

	// 7维非零 → 极端（默认阈值7）
	v7 := NewVector(TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriMid, TriMid)
	if !cfg.IsExtremeConfig(v7) {
		t.Error("7 non-zero dims should be extreme (default threshold=7)")
	}

	// 6维非零 → 不极端
	v6 := NewVector(TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriMid, TriMid, TriMid)
	if cfg.IsExtremeConfig(v6) {
		t.Error("6 non-zero dims should NOT be extreme (default threshold=7)")
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 快照序列化测试
// ═══════════════════════════════════════════════════════════════════════════

// TestSnapshotSaveLoad 快照落盘加载测试
func TestSnapshotSaveLoad(t *testing.T) {
	tmpFile := fmt.Sprintf("/tmp/cog_test_snapshot_%d.json", os.Getpid())
	defer os.Remove(tmpFile)

	snap := &CogSnapshot{
		Version:   "1.0.0",
		Timestamp: 1234567890,
		Nodes: []CogNodeSnapshot{
			{
				ID:      9841,
				Vector:  NewZeroVector().ToArray(),
				Text:    "原点平衡态",
				Score:   1.0,
			},
			{
				ID:      0,
				Vector:  NewVector(TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg).ToArray(),
				Text:    "全阴收敛态",
				Score:   0.5,
			},
		},
		Config: CogConfigSnapshot{
			EWeight:        Euler,
			PiWeight:       Pi,
			GammaWeight:    Gamma,
			ConvergeThresh: 2.5,
			ExtremeThresh:  7,
			TopKNum:        3,
		},
	}

	// 保存
	if err := SaveSnapshotToFile(snap, tmpFile); err != nil {
		t.Fatalf("save snapshot: %v", err)
	}

	// 加载
	loaded, err := LoadSnapshotFromFile(tmpFile)
	if err != nil {
		t.Fatalf("load snapshot: %v", err)
	}

	if loaded.Version != snap.Version {
		t.Errorf("version mismatch: %s vs %s", loaded.Version, snap.Version)
	}
	if len(loaded.Nodes) != len(snap.Nodes) {
		t.Fatalf("node count mismatch: %d vs %d", len(loaded.Nodes), len(snap.Nodes))
	}
	for i, n := range loaded.Nodes {
		if n.ID != snap.Nodes[i].ID {
			t.Errorf("node %d ID mismatch: %d vs %d", i, n.ID, snap.Nodes[i].ID)
		}
		if n.Text != snap.Nodes[i].Text {
			t.Errorf("node %d text mismatch: %s vs %s", i, n.Text, snap.Nodes[i].Text)
		}
		if n.Score != snap.Nodes[i].Score {
			t.Errorf("node %d score mismatch: %f vs %f", i, n.Score, snap.Nodes[i].Score)
		}
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 性能基准测试
// ═══════════════════════════════════════════════════════════════════════════

// BenchmarkEncode 编码性能基准
func BenchmarkEncode(b *testing.B) {
	v := NewVector(TriPos, TriNeg, TriPos, TriMid, TriPos, TriNeg, TriMid, TriPos, TriNeg)
	for i := 0; i < b.N; i++ {
		_ = v.Encode()
	}
}

// BenchmarkDecode 解码性能基准
func BenchmarkDecode(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_, _ = Decode(CogID(i % TotalNum))
	}
}

// BenchmarkEncodeDecodeAll 全量编解码基准
func BenchmarkEncodeDecodeAll(b *testing.B) {
	for n := 0; n < b.N; n++ {
		for rawID := uint16(0); rawID < TotalNum; rawID++ {
			vec, _ := Decode(CogID(rawID))
			_ = vec.Encode()
		}
	}
}

// BenchmarkDistWeightedManhattan 加权曼哈顿距离基准
func BenchmarkDistWeightedManhattan(b *testing.B) {
	a := NewVector(TriPos, TriNeg, TriPos, TriMid, TriPos, TriNeg, TriMid, TriPos, TriNeg)
	c := NewVector(TriNeg, TriPos, TriNeg, TriPos, TriNeg, TriPos, TriNeg, TriMid, TriPos)
	for i := 0; i < b.N; i++ {
		_ = DistWeightedManhattan(a, c)
	}
}

// BenchmarkMerge 融合算子基准
func BenchmarkMerge(b *testing.B) {
	a := NewVector(TriPos, TriNeg, TriPos, TriMid, TriPos, TriNeg, TriMid, TriPos, TriNeg)
	c := NewVector(TriNeg, TriPos, TriNeg, TriPos, TriNeg, TriPos, TriNeg, TriMid, TriPos)
	for i := 0; i < b.N; i++ {
		_ = Merge(a, c)
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 编码一致性验证：与TS仓库的卦象索引交叉验证
// ═══════════════════════════════════════════════════════════════════════════

// TestCrossValidateWithTS 与TypeScript仓库的编码方式交叉验证
//
// TS仓库的 toHexagramIndex 使用 (t+1) 的标准base-3编码：
//   idx = (v[0]+1)*3^8 + (v[1]+1)*3^7 + ... + (v[8]+1)*3^0
// 范围 [0, 19682]，全和(idx=0)到全阳(idx=19682)
//
// Go实现使用平衡三进制加权编码：
//   sum = v[0]*3^8 + v[1]*3^7 + ... + v[8]*3^0
//   id = sum + Offset
// 范围 [0, 19682]，全阴(id=0)到全阳(id=19682)
//
// 两种编码方式不同但都是双射，都覆盖 [0, 19682]。
// 本测试验证Go编解码自身的一致性（不与TS混用）。
func TestCrossValidateWithTS(t *testing.T) {
	// 全和向量在Go中ID=9841（原点），在TS中index=0
	zero := NewZeroVector()
	goID := zero.Encode()
	if goID != Offset {
		t.Errorf("Go zero vector ID: expected %d, got %d", Offset, goID)
	}

	// 全阳向量在两种编码中都是最大值19682
	pos := NewVector(TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos, TriPos)
	if pos.Encode() != TotalNum-1 {
		t.Errorf("Go all-pos ID: expected %d, got %d", TotalNum-1, pos.Encode())
	}

	// 全阴向量在Go中ID=0，在TS中index=9841（因为-1+1=0，但TS映射-1→0所以全阴→全0→index=0... 实际上TS的-1映射为0，0映射为1，1映射为2，所以全阴的TS index = 0*3^8+...+0*3^0 = 0）
	// 而Go的全阴 = -1*3^8+...+(-1)*3^0 = -9841, ID = 0
	neg := NewVector(TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg, TriNeg)
	if neg.Encode() != 0 {
		t.Errorf("Go all-neg ID: expected 0, got %d", neg.Encode())
	}
}

// TestTriStateString 三态字符串测试
func TestTriStateString(t *testing.T) {
	if TriNeg.String() != "阴" {
		t.Error("TriNeg should be '阴'")
	}
	if TriMid.String() != "和" {
		t.Error("TriMid should be '和'")
	}
	if TriPos.String() != "阳" {
		t.Error("TriPos should be '阳'")
	}
}

// TestVectorString 向量字符串表示测试
func TestVectorString(t *testing.T) {
	v := NewZeroVector()
	s := v.String()
	if s == "" {
		t.Error("vector string should not be empty")
	}
}

// TestFromArray 从数组构造向量测试
func TestFromArray(t *testing.T) {
	arr := [DimNum]int8{1, -1, 1, 0, 1, -1, 0, 1, -1}
	v := FromArray(arr)
	if v[0] != TriPos || v[1] != TriNeg || v[3] != TriMid {
		t.Errorf("FromArray conversion error: %v", v)
	}
	// 验证往返一致
	back := v.ToArray()
	for i := 0; i < DimNum; i++ {
		if back[i] != arr[i] {
			t.Errorf("round-trip mismatch at dim %d: %d vs %d", i, back[i], arr[i])
		}
	}
}
