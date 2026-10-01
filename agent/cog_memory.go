package agent

import (
	"container/heap"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/q1z2q3-debug/TC-AGI-Research/cogspace"
)

// ═══════════════════════════════════════════════════════════════════════════
// 认知记忆节点
// ═══════════════════════════════════════════════════════════════════════════

// CogNode 认知存储节点，每个点位最多存储一个认知
type CogNode struct {
	Vector   cogspace.CogVector // 九维认知向量
	Text     string             // 认知文本内容
	Score    float64            // 认知重要度评分 [0, 1]
	CreatedAt int64             // 创建时间戳 (unix nano)
	AccessCount int             // 访问次数（用于遗忘衰减）
	LastAccess int64            // 最后访问时间戳
	Tags     []string           // 语义标签
}

// ═══════════════════════════════════════════════════════════════════════════
// CogMemory — 19683定长认知空间内存池
// ═══════════════════════════════════════════════════════════════════════════

// CogMemory 认知记忆池
//
// 采用定长数组 [19683] 索引池，以 CogID 为直接下标：
//   - 写入：O(1) 直接下标赋值
//   - 读取：O(1) 直接下标访问
//   - TopK召回：O(n) 遍历 + 堆选择（n=已写入点位数）
//
// 协程安全：所有读写操作通过 sync.RWMutex 保护
type CogMemory struct {
	mu     sync.RWMutex
	store  [cogspace.TotalNum]*CogNode
	count  int // 已写入的非空点位数
	snapshotPath string // 快照落盘路径
}

// NewCogMemory 创建认知记忆池
func NewCogMemory() *CogMemory {
	return &CogMemory{}
}

// NewCogMemoryWithSnapshot 创建带快照路径的记忆池
func NewCogMemoryWithSnapshot(snapshotPath string) *CogMemory {
	return &CogMemory{snapshotPath: snapshotPath}
}

// Count 返回已写入的认知点位数
func (m *CogMemory) Count() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.count
}

// ═══════════════════════════════════════════════════════════════════════════
// 写入操作 — O(1)
// ═══════════════════════════════════════════════════════════════════════════

// Write 写入认知点位（覆盖式写入）
func (m *CogMemory) Write(vec cogspace.CogVector, text string, score float64) {
	m.writeNode(vec, text, score, nil)
}

// WriteWithTags 写入带标签的认知点位
func (m *CogMemory) WriteWithTags(vec cogspace.CogVector, text string, score float64, tags []string) {
	m.writeNode(vec, text, score, tags)
}

func (m *CogMemory) writeNode(vec cogspace.CogVector, text string, score float64, tags []string) {
	id := vec.Encode()
	now := time.Now().UnixNano()

	m.mu.Lock()
	defer m.mu.Unlock()

	if m.store[id] == nil {
		m.count++
	}

	m.store[id] = &CogNode{
		Vector:     vec,
		Text:       text,
		Score:      score,
		CreatedAt:  now,
		AccessCount: 0,
		LastAccess:  now,
		Tags:       tags,
	}
}

// WriteByID 通过CogID直接写入
func (m *CogMemory) WriteByID(id cogspace.CogID, text string, score float64) bool {
	vec, ok := cogspace.Decode(id)
	if !ok {
		return false
	}
	m.Write(vec, text, score)
	return true
}

// ═══════════════════════════════════════════════════════════════════════════
// 读取操作 — O(1)
// ═══════════════════════════════════════════════════════════════════════════

// Read 按向量读取认知节点
func (m *CogMemory) Read(vec cogspace.CogVector) *CogNode {
	return m.ReadByID(vec.Encode())
}

// ReadByID 按CogID读取认知节点
func (m *CogMemory) ReadByID(id cogspace.CogID) *CogNode {
	m.mu.RLock()
	defer m.mu.RUnlock()

	node := m.store[id]
	if node == nil {
		return nil
	}
	// 返回副本避免外部修改
	copied := *node
	return &copied
}

// Has 检查点位是否已写入
func (m *CogMemory) Has(vec cogspace.CogVector) bool {
	return m.HasByID(vec.Encode())
}

// HasByID 按ID检查点位是否已写入
func (m *CogMemory) HasByID(id cogspace.CogID) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.store[id] != nil
}

// Delete 删除认知点位
func (m *CogMemory) Delete(vec cogspace.CogVector) {
	m.DeleteByID(vec.Encode())
}

// DeleteByID 按ID删除认知点位
func (m *CogMemory) DeleteByID(id cogspace.CogID) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.store[id] != nil {
		m.store[id] = nil
		m.count--
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// TopK 加权距离召回
// ═══════════════════════════════════════════════════════════════════════════

// SearchTopK 根据加权曼哈顿距离召回最邻近的K个认知
//
// 使用最小堆实现TopK选择，时间复杂度 O(n + k*log(k))
// 其中 n 为已写入点位数，k 为召回数量
func (m *CogMemory) SearchTopK(target cogspace.CogVector, k int) []*CogNode {
	return m.SearchTopKWithMetric(target, k, cogspace.DistWeightedManhattan)
}

// SearchTopKWithMetric 使用自定义距离度量召回TopK
func (m *CogMemory) SearchTopKWithMetric(
	target cogspace.CogVector,
	k int,
	metric func(a, b cogspace.CogVector) float64,
) []*CogNode {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if k <= 0 {
		return []*CogNode{}
	}

	// 收集所有非空节点
	h := &nodeHeap{}
	heap.Init(h)

	for _, node := range &m.store {
		if node == nil {
			continue
		}
		dist := metric(target, node.Vector)

		if h.Len() < k {
			heap.Push(h, &heapItem{node: node, dist: dist})
		} else if dist < (*h)[0].dist {
			// 替换堆顶（最大距离）
			(*h)[0] = &heapItem{node: node, dist: dist}
			heap.Fix(h, 0)
		}
	}

	// 从堆中提取结果（按距离升序）
	result := make([]*CogNode, 0, h.Len())
	// 先弹出再反转（堆是最大堆，弹出顺序是降序）
	tmp := make([]*CogNode, 0, h.Len())
	for h.Len() > 0 {
		item := heap.Pop(h).(*heapItem)
		tmp = append(tmp, item.node)
	}
	// 反转为升序
	for i := len(tmp) - 1; i >= 0; i-- {
		copied := *tmp[i]
		result = append(result, &copied)
	}

	return result
}

// SearchTopKWithDecay 带时间衰减的TopK召回
//
// 融合距离与时间衰减：effective_dist = dist * (1 + decay_factor * age_hours)
// 越久未访问的认知，其有效距离越大，越不容易被召回
func (m *CogMemory) SearchTopKWithDecay(
	target cogspace.CogVector,
	k int,
	decayFactor float64,
) []*CogNode {
	now := time.Now().UnixNano()
	m.mu.RLock()
	defer m.mu.RUnlock()

	if k <= 0 {
		return []*CogNode{}
	}

	h := &nodeHeap{}
	heap.Init(h)

	for _, node := range &m.store {
		if node == nil {
			continue
		}
		dist := cogspace.DistWeightedManhattan(target, node.Vector)
		// 时间衰减：以小时为单位
		ageHours := float64(now-node.LastAccess) / float64(time.Hour)
		effectiveDist := dist * (1.0 + decayFactor*ageHours)

		if h.Len() < k {
			heap.Push(h, &heapItem{node: node, dist: effectiveDist})
		} else if effectiveDist < (*h)[0].dist {
			(*h)[0] = &heapItem{node: node, dist: effectiveDist}
			heap.Fix(h, 0)
		}
	}

	result := make([]*CogNode, 0, h.Len())
	tmp := make([]*CogNode, 0, h.Len())
	for h.Len() > 0 {
		item := heap.Pop(h).(*heapItem)
		tmp = append(tmp, item.node)
	}
	for i := len(tmp) - 1; i >= 0; i-- {
		copied := *tmp[i]
		result = append(result, &copied)
	}

	return result
}

// ═══════════════════════════════════════════════════════════════════════════
// 快照落盘与加载
// ═══════════════════════════════════════════════════════════════════════════

// SaveSnapshot 将记忆池快照保存到文件
func (m *CogMemory) SaveSnapshot(path string) error {
	m.mu.RLock()
	defer m.mu.RUnlock()

	cfgSnap := cogspace.GetConfig().GetSnapshot()

	snap := &cogspace.CogSnapshot{
		Version:   "1.0.0",
		Timestamp: time.Now().Unix(),
		Nodes:     make([]cogspace.CogNodeSnapshot, 0, m.count),
		Config:    cfgSnap,
	}

	for id, node := range &m.store {
		if node == nil {
			continue
		}
		snap.Nodes = append(snap.Nodes, cogspace.CogNodeSnapshot{
			ID:      uint16(id),
			Vector:  node.Vector.ToArray(),
			Text:    node.Text,
			Score:   node.Score,
		})
	}

	return cogspace.SaveSnapshotToFile(snap, path)
}

// LoadSnapshot 从文件加载记忆池快照
func (m *CogMemory) LoadSnapshot(path string) error {
	snap, err := cogspace.LoadSnapshotFromFile(path)
	if err != nil {
		return err
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// 清空当前存储
	for i := range m.store {
		m.store[i] = nil
	}
	m.count = 0

	// 加载快照
	for _, ns := range snap.Nodes {
		vec := cogspace.FromArray(ns.Vector)
		m.store[ns.ID] = &CogNode{
			Vector:     vec,
			Text:       ns.Text,
			Score:      ns.Score,
			CreatedAt:  snap.Timestamp,
			AccessCount: 0,
			LastAccess:  snap.Timestamp,
		}
		m.count++
	}

	return nil
}

// SaveToDefaultPath 保存到默认路径
func (m *CogMemory) SaveToDefaultPath() error {
	if m.snapshotPath == "" {
		return fmt.Errorf("snapshot path not set")
	}
	return m.SaveSnapshot(m.snapshotPath)
}

// LoadFromDefaultPath 从默认路径加载
func (m *CogMemory) LoadFromDefaultPath() error {
	if m.snapshotPath == "" {
		return fmt.Errorf("snapshot path not set")
	}
	return m.LoadSnapshot(m.snapshotPath)
}

// ═══════════════════════════════════════════════════════════════════════════
// 统计与调试
// ═══════════════════════════════════════════════════════════════════════════

// Stats 记忆池统计信息
type MemoryStats struct {
	TotalNodes   int     // 已写入点位数
	Capacity     int     // 总容量
	UsageRatio   float64 // 使用率
	AvgScore     float64 // 平均评分
	OldestTimestamp int64 // 最早写入时间
	NewestTimestamp int64 // 最近写入时间
}

// GetStats 获取统计信息
func (m *CogMemory) GetStats() MemoryStats {
	m.mu.RLock()
	defer m.mu.RUnlock()

	stats := MemoryStats{
		Capacity: cogspace.TotalNum,
	}

	if m.count == 0 {
		return stats
	}

	stats.TotalNodes = m.count
	stats.UsageRatio = float64(m.count) / float64(cogspace.TotalNum)

	var totalScore float64
	oldest := int64(0)
	newest := int64(0)

	for _, node := range &m.store {
		if node == nil {
			continue
		}
		totalScore += node.Score
		if oldest == 0 || node.CreatedAt < oldest {
			oldest = node.CreatedAt
		}
		if node.CreatedAt > newest {
			newest = node.CreatedAt
		}
	}

	stats.AvgScore = totalScore / float64(m.count)
	stats.OldestTimestamp = oldest
	stats.NewestTimestamp = newest

	return stats
}

// Clear 清空记忆池
func (m *CogMemory) Clear() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.store {
		m.store[i] = nil
	}
	m.count = 0
}

// ═══════════════════════════════════════════════════════════════════════════
// 最小堆实现（用于TopK选择）
// ═══════════════════════════════════════════════════════════════════════════

type heapItem struct {
	node *CogNode
	dist float64
}

// nodeHeap 最大堆，堆顶是距离最大的元素
// 用于TopK：维护K个最小距离的元素，堆顶是K个中最大的
type nodeHeap []*heapItem

func (h nodeHeap) Len() int           { return len(h) }
func (h nodeHeap) Less(i, j int) bool { return h[i].dist > h[j].dist } // 最大堆
func (h nodeHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *nodeHeap) Push(x any) {
	*h = append(*h, x.(*heapItem))
}

func (h *nodeHeap) Pop() any {
	old := *h
	n := len(old)
	item := old[n-1]
	*h = old[:n-1]
	return item
}

// ═══════════════════════════════════════════════════════════════════════════
// 与TC-AGI原有MemorySystem的桥接接口
// ═══════════════════════════════════════════════════════════════════════════

// MemoryBridge 桥接TC-AGI原有的TypeScript MemorySystem
//
// 原有MemorySystem基于文件持久化（memory.json），
// CogMemory基于19683定长数组索引池。
// 桥接策略：
//   1. CogMemory作为认知空间的快速索引层（O(1)读写）
//   2. 原有MemorySystem保留为全文检索与复杂查询层
//   3. 写入时双写：CogMemory写入索引 + 原系统写入全文
//   4. 读取时先查CogMemory（快速召回），再查原系统（补充上下文）
type MemoryBridge struct {
	cogMem *CogMemory
	// origMem 对接原有 TypeScript MemorySystem（通过 gRPC/HTTP 桥接）
	// origMem OrigMemoryInterface
}

// NewMemoryBridge 创建桥接器
func NewMemoryBridge(cogMem *CogMemory) *MemoryBridge {
	return &MemoryBridge{cogMem: cogMem}
}

// WriteWithBridge 双写桥接：写入CogMemory + 同步到原系统
func (b *MemoryBridge) WriteWithBridge(vec cogspace.CogVector, text string, score float64, tags []string) {
	// 写入认知记忆池（O(1)索引）
	b.cogMem.WriteWithTags(vec, text, score, tags)

	// TODO: 同步写入原有 TypeScript MemorySystem
	// if b.origMem != nil {
	//     b.origMem.Save(memory)
	// }
}

// RetrieveWithBridge 双路召回：CogMemory TopK + 原系统补充
func (b *MemoryBridge) RetrieveWithBridge(target cogspace.CogVector, k int) []*CogNode {
	// 1. CogMemory快速召回
	results := b.cogMem.SearchTopK(target, k)

	// TODO: 2. 原系统补充检索
	// if b.origMem != nil {
	//     additional := b.origMem.Retrieve(target, k)
	//     results = merge(results, additional)
	// }

	return results
}

// EnsureSnapshotDir 确保快照目录存在
func EnsureSnapshotDir(path string) error {
	dir := filepath_Dir(path)
	if dir == "" || dir == "." {
		return nil
	}
	return os.MkdirAll(dir, 0755)
}

// filepath_Dir 获取文件所在目录（避免引入path包的别名冲突）
func filepath_Dir(path string) string {
	for i := len(path) - 1; i >= 0; i-- {
		if path[i] == '/' {
			return path[:i]
		}
	}
	return "."
}
