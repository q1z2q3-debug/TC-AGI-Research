package cogspace

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"strings"
	"sync"
)

// ═══════════════════════════════════════════════════════════════════════════
// 全局常量与数学常数
// ═══════════════════════════════════════════════════════════════════════════

const (
	// Euler 自然常数 — 时间维度权重
	Euler = 2.718281828459045
	// Pi 圆周率 — 空间维度权重
	Pi = 3.141592653589793
	// Gamma 欧拉-马歇罗尼常数 — 因果维度权重
	Gamma = 0.5772156649015329

	// DimNum 认知空间维度数（九维）
	DimNum = 9
	// TotalNum 认知空间离散点位总数 3^9 = 19683
	TotalNum = 19683
	// Offset 偏移量，抵消平衡三进制的负数区间，将 [-9841, 9841] 映射到 [0, 19682]
	// 计算：sum(3^0..3^8) = (3^9 - 1) / (3 - 1) = (19683 - 1) / 2 = 9841
	Offset = 9841
)

// pow3Cache 预计算 3 的幂次缓存，避免重复计算
var pow3Cache [DimNum]int

func init() {
	pow3Cache[0] = 1
	for i := 1; i < DimNum; i++ {
		pow3Cache[i] = pow3Cache[i-1] * 3
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 平衡三态定义
// ═══════════════════════════════════════════════════════════════════════════

// TriState 平衡三进制三态：阴(-1)收敛否定 / 和(0)融合涌现 / 阳(+1)发散肯定
type TriState int8

const (
	TriNeg TriState = -1 // 阴：收敛、否定、收缩
	TriMid TriState = 0  // 和：融合、涌现、平衡
	TriPos TriState = 1  // 阳：发散、肯定、扩张
)

// String 返回三态的中文名称
func (t TriState) String() string {
	switch t {
	case TriNeg:
		return "阴"
	case TriMid:
		return "和"
	case TriPos:
		return "阳"
	default:
		return "?"
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 九维认知向量与全局ID
// ═══════════════════════════════════════════════════════════════════════════

// 维度索引常量，增强可读性
const (
	// 时间三元：过去、现在、未来
	DimPast = 0
	DimNow  = 1
	DimFuture = 2
	// 空间三元：内、中、外
	DimInternal = 3
	DimMedial   = 4
	DimExternal = 5
	// 因果三元：因、缘、果
	DimCause    = 6
	DimCondition = 7
	DimEffect   = 8
)

// CogVector 9维认知向量 [T0,T1,T2, S0,S1,S2, C0,C1,C2]
//   T: 时间三元（过去·现在·未来）
//   S: 空间三元（内·中·外）
//   C: 因果三元（因·缘·果）
type CogVector [DimNum]TriState

// CogID 认知空间全局点位ID，范围 [0, 19682]
type CogID uint16

// NewZeroVector 返回均衡原点向量（全和态），对应 CogID = Offset = 9841
func NewZeroVector() CogVector {
	var v CogVector
	for i := range v {
		v[i] = TriMid
	}
	return v
}

// NewVector 从9个TriState值构造向量
func NewVector(vals ...TriState) CogVector {
	var v CogVector
	for i := 0; i < DimNum && i < len(vals); i++ {
		v[i] = vals[i]
	}
	return v
}

// ═══════════════════════════════════════════════════════════════════════════
// 编解码：向量 ↔ CogID 双向映射
// ═══════════════════════════════════════════════════════════════════════════

// Encode 将九维向量编码为全局ID [0, 19682]
//
// 编码公式：sum = v[0]*3^8 + v[1]*3^7 + ... + v[8]*3^0
// 其中 v[i] ∈ {-1, 0, +1}（平衡三进制）
// ID = sum + Offset，将 [-9841, 9841] 平移到 [0, 19682]
func (v CogVector) Encode() CogID {
	sum := 0
	for i := 0; i < DimNum; i++ {
		sum += int(v[i]) * pow3Cache[DimNum-1-i]
	}
	return CogID(sum + Offset)
}

// Decode 将全局ID还原为九维向量
//
// 修复要点：Go的 % 运算符对负数保留被除数符号（如 -1 % 3 = -1），
// 原始实现的 switch mod { case 0/1/2 } 无法匹配负数余数，
// 导致约一半点位（val < 0 的区间）解码为全零向量。
//
// 修复方案：使用标准平衡三进制转换算法：
//   1. r = val % 3（可能为 -2..2）
//   2. 将 r 归一化到 {-1, 0, +1}：r==2 → -1, r==-2 → +1, 其余不变
//   3. val = (val - r) / 3（精确除法，余数为0）
func Decode(id CogID) (CogVector, bool) {
	if int(id) >= TotalNum {
		return CogVector{}, false
	}
	val := int(id) - Offset
	var v CogVector
	for i := 0; i < DimNum; i++ {
		pos := DimNum - 1 - i
		r := val % 3
		// 将余数转换为平衡三进制数字 {-1, 0, +1}
		if r == 2 {
			r = -1
		} else if r == -2 {
			r = 1
		}
		// r 现在一定是 {-1, 0, 1}
		v[pos] = TriState(r)
		// 精确除法：(val - r) 一定能被 3 整除
		val = (val - r) / 3
	}
	return v, true
}

// MustDecode 解码，失败时panic（仅用于测试或确定合法的ID）
func MustDecode(id CogID) CogVector {
	v, ok := Decode(id)
	if !ok {
		panic(fmt.Sprintf("invalid CogID: %d", id))
	}
	return v
}

// ═══════════════════════════════════════════════════════════════════════════
// 距离度量算子
// ═══════════════════════════════════════════════════════════════════════════

// DistHamming 汉明距离：维度不一致的计数，范围 [0, 9]
func DistHamming(a, b CogVector) int {
	cnt := 0
	for i := 0; i < DimNum; i++ {
		if a[i] != b[i] {
			cnt++
		}
	}
	return cnt
}

// DistEuclid 欧式距离（L2），认知势能差，范围 [0, 6]
// 最大值：全阳 vs 全阴 = sqrt(9 * (1-(-1))^2) = sqrt(36) = 6
func DistEuclid(a, b CogVector) float64 {
	sum := 0.0
	for i := 0; i < DimNum; i++ {
		d := float64(a[i] - b[i])
		sum += d * d
	}
	return math.Sqrt(sum)
}

// DistManhattan 曼哈顿距离（L1），范围 [0, 18]
func DistManhattan(a, b CogVector) int {
	sum := 0
	for i := 0; i < DimNum; i++ {
		sum += int(math.Abs(float64(a[i] - b[i])))
	}
	return sum
}

// DistWeightedManhattan 分域加权曼哈顿距离
//
// 时间维(0-2) × e  +  空间维(3-5) × π  +  因果维(6-8) × γ
// 反映不同维度组对认知距离的影响权重差异
func DistWeightedManhattan(a, b CogVector) float64 {
	var tSum, sSum, cSum float64
	// 时间维 0-2
	for i := 0; i < 3; i++ {
		tSum += math.Abs(float64(a[i] - b[i]))
	}
	// 空间维 3-5
	for i := 3; i < 6; i++ {
		sSum += math.Abs(float64(a[i] - b[i]))
	}
	// 因果维 6-8
	for i := 6; i < 9; i++ {
		cSum += math.Abs(float64(a[i] - b[i]))
	}
	return tSum*Euler + sSum*Pi + cSum*Gamma
}

// DistWeightedManhattanWith 分域加权曼哈顿距离（自定义权重）
func DistWeightedManhattanWith(a, b CogVector, wTime, wSpace, wCause float64) float64 {
	var tSum, sSum, cSum float64
	for i := 0; i < 3; i++ {
		tSum += math.Abs(float64(a[i] - b[i]))
	}
	for i := 3; i < 6; i++ {
		sSum += math.Abs(float64(a[i] - b[i]))
	}
	for i := 6; i < 9; i++ {
		cSum += math.Abs(float64(a[i] - b[i]))
	}
	return tSum*wTime + sSum*wSpace + cSum*wCause
}

// BiasToOrigin 向量到均衡原点的欧式距离，数值越大认知越极端
// 范围 [0, 6]，0 = 完全平衡，6 = 全阳或全阴
func (v CogVector) BiasToOrigin() float64 {
	return DistEuclid(v, NewZeroVector())
}

// ═══════════════════════════════════════════════════════════════════════════
// 认知算子
// ═══════════════════════════════════════════════════════════════════════════

// Merge 阴阳和合融合算子
//
// 逐维取和：a[i]+b[i] > 0 → 阳, < 0 → 阴, == 0 → 和
// 生成中和后的新认知向量，用于极端偏激向量与原点中和
func Merge(a, b CogVector) CogVector {
	var res CogVector
	for i := 0; i < DimNum; i++ {
		sum := int(a[i]) + int(b[i])
		switch {
		case sum > 0:
			res[i] = TriPos
		case sum < 0:
			res[i] = TriNeg
		default:
			res[i] = TriMid
		}
	}
	return res
}

// IsExtreme 极端认知检测
//
// 非中和（非0）维度数量 >= threshold 时返回 true
// 默认 threshold=7 表示9维中有7维以上偏离平衡态
func (v CogVector) IsExtreme(threshold int) bool {
	cnt := 0
	for _, s := range v {
		if s != TriMid {
			cnt++
		}
	}
	return cnt >= threshold
}

// NeutralizeWithOrigin 与原点融合，中和极端偏激
func (v CogVector) NeutralizeWithOrigin() CogVector {
	return Merge(v, NewZeroVector())
}

// ═══════════════════════════════════════════════════════════════════════════
// 维度分析辅助
// ═══════════════════════════════════════════════════════════════════════════

// Majority 多数态：+1=扩张态, 0=观察态, -1=收缩态
func (v CogVector) Majority() TriState {
	sum := 0
	for _, s := range v {
		sum += int(s)
	}
	if sum > 1 {
		return TriPos
	}
	if sum < -1 {
		return TriNeg
	}
	return TriMid
}

// String 返回向量的可读字符串
func (v CogVector) String() string {
	labels := []string{"过去", "现在", "未来", "内", "中", "外", "因", "缘", "果"}
	parts := make([]string, 0, DimNum)
	for i := 0; i < DimNum; i++ {
		parts = append(parts, fmt.Sprintf("%s:%s", labels[i], v[i].String()))
	}
	return fmt.Sprintf("[%s] ID:%d", strings.Join(parts, " "), v.Encode())
}

// ToArray 转为 int8 数组
func (v CogVector) ToArray() [DimNum]int8 {
	var arr [DimNum]int8
	for i := 0; i < DimNum; i++ {
		arr[i] = int8(v[i])
	}
	return arr
}

// FromArray 从 int8 数组构造向量
func FromArray(arr [DimNum]int8) CogVector {
	var v CogVector
	for i := 0; i < DimNum; i++ {
		switch {
		case arr[i] > 0:
			v[i] = TriPos
		case arr[i] < 0:
			v[i] = TriNeg
		default:
			v[i] = TriMid
		}
	}
	return v
}

// ═══════════════════════════════════════════════════════════════════════════
// 动态配置（支持运行时调参）
// ═══════════════════════════════════════════════════════════════════════════

// CogConfig 认知空间运行时配置
type CogConfig struct {
	mu              sync.RWMutex
	EWeight         float64 // 时间维度权重，默认 e
	PiWeight        float64 // 空间维度权重，默认 π
	GammaWeight     float64 // 因果维度权重，默认 γ
	ConvergeThresh  float64 // 收敛判定阈值（欧式距离），默认 2.5
	ExtremeThresh   int     // 极端认知判定阈值（非零维度数），默认 7
	TopKNum         int     // 记忆召回数量，默认 3
}

var defaultConfig = &CogConfig{
	EWeight:        Euler,
	PiWeight:       Pi,
	GammaWeight:    Gamma,
	ConvergeThresh: 2.5,
	ExtremeThresh:  7,
	TopKNum:        3,
}

// GetConfig 获取全局配置
func GetConfig() *CogConfig {
	return defaultConfig
}

// LoadFromEnv 从环境变量加载配置
func (c *CogConfig) LoadFromEnv() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if v := os.Getenv("COG_E_WEIGHT"); v != "" {
		if f, err := strconvParseFloat(v); err == nil {
			c.EWeight = f
		}
	}
	if v := os.Getenv("COG_PI_WEIGHT"); v != "" {
		if f, err := strconvParseFloat(v); err == nil {
			c.PiWeight = f
		}
	}
	if v := os.Getenv("COG_GAMMA_WEIGHT"); v != "" {
		if f, err := strconvParseFloat(v); err == nil {
			c.GammaWeight = f
		}
	}
	if v := os.Getenv("COG_CONVERGE_THRESHOLD"); v != "" {
		if f, err := strconvParseFloat(v); err == nil {
			c.ConvergeThresh = f
		}
	}
	if v := os.Getenv("COG_EXTREME_THRESHOLD"); v != "" {
		if n, err := strconvAtoi(v); err == nil {
			c.ExtremeThresh = n
		}
	}
	if v := os.Getenv("COG_TOPK_NUM"); v != "" {
		if n, err := strconvAtoi(v); err == nil {
			c.TopKNum = n
		}
	}
}

// WeightedManhattan 使用动态配置的权重计算加权曼哈顿距离
func (c *CogConfig) WeightedManhattan(a, b CogVector) float64 {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return DistWeightedManhattanWith(a, b, c.EWeight, c.PiWeight, c.GammaWeight)
}

// IsConverged 判断认知是否收敛（到原点距离 < 阈值）
func (c *CogConfig) IsConverged(v CogVector) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return v.BiasToOrigin() < c.ConvergeThresh
}

// IsExtremeConfig 使用动态配置判断极端认知
func (c *CogConfig) IsExtremeConfig(v CogVector) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return v.IsExtreme(c.ExtremeThresh)
}

// GetSnapshot 获取当前配置的快照（线程安全）
func (c *CogConfig) GetSnapshot() CogConfigSnapshot {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return CogConfigSnapshot{
		EWeight:        c.EWeight,
		PiWeight:       c.PiWeight,
		GammaWeight:    c.GammaWeight,
		ConvergeThresh: c.ConvergeThresh,
		ExtremeThresh:  c.ExtremeThresh,
		TopKNum:        c.TopKNum,
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 快照序列化（用于落盘与加载）
// ═══════════════════════════════════════════════════════════════════════════

// CogSnapshot 认知空间快照，用于序列化落盘
type CogSnapshot struct {
	Version   string            `json:"version"`
	Timestamp int64             `json:"timestamp"`
	Nodes     []CogNodeSnapshot `json:"nodes"`
	Config    CogConfigSnapshot `json:"config"`
}

// CogNodeSnapshot 单个认知节点的快照
type CogNodeSnapshot struct {
	ID    uint16  `json:"id"`
	Vector [DimNum]int8 `json:"vector"`
	Text  string  `json:"text"`
	Score float64 `json:"score"`
}

// CogConfigSnapshot 配置快照
type CogConfigSnapshot struct {
	EWeight        float64 `json:"e_weight"`
	PiWeight       float64 `json:"pi_weight"`
	GammaWeight    float64 `json:"gamma_weight"`
	ConvergeThresh float64 `json:"converge_threshold"`
	ExtremeThresh  int     `json:"extreme_threshold"`
	TopKNum        int     `json:"topk_num"`
}

// MarshalSnapshot 将快照序列化为JSON字节
func (s *CogSnapshot) MarshalJSON() ([]byte, error) {
	type alias CogSnapshot
	return json.Marshal((*alias)(s))
}

// SaveSnapshotToFile 将快照保存到文件
func SaveSnapshotToFile(snap *CogSnapshot, path string) error {
	data, err := json.MarshalIndent(snap, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal snapshot: %w", err)
	}
	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("write snapshot file: %w", err)
	}
	return nil
}

// LoadSnapshotFromFile 从文件加载快照
func LoadSnapshotFromFile(path string) (*CogSnapshot, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read snapshot file: %w", err)
	}
	var snap CogSnapshot
	if err := json.Unmarshal(data, &snap); err != nil {
		return nil, fmt.Errorf("unmarshal snapshot: %w", err)
	}
	return &snap, nil
}

// ═══════════════════════════════════════════════════════════════════════════
// 内部辅助函数（避免引入 strconv 的循环依赖风险）
// ═══════════════════════════════════════════════════════════════════════════

func strconvParseFloat(s string) (float64, error) {
	var f float64
	_, err := fmt.Sscanf(s, "%f", &f)
	return f, err
}

func strconvAtoi(s string) (int, error) {
	var n int
	_, err := fmt.Sscanf(s, "%d", &n)
	return n, err
}
