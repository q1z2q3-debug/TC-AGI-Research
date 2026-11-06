package main

import (
	"fmt"
	"os"
	"time"

	"github.com/q1z2q3-debug/TC-AGI-Research/agent"
	"github.com/q1z2q3-debug/TC-AGI-Research/cogspace"
)

// ═══════════════════════════════════════════════════════════════════════════
// 九维平衡三进制认知空间 — 完整调用示例
// ═══════════════════════════════════════════════════════════════════════════

func main() {
	fmt.Println("╔══════════════════════════════════════════════════════════╗")
	fmt.Println("║  TC-AGI 九维平衡三进制认知空间 — 完整调用示例            ║")
	fmt.Println("╚══════════════════════════════════════════════════════════╝")
	fmt.Println()

	// ━━━ 1. 加载环境配置 ━━━
	cogspace.GetConfig().LoadFromEnv()
	fmt.Println("【1】配置加载完成:")
	cfgSnap := cogspace.GetConfig().GetSnapshot()
	fmt.Printf("    时间权重 e=%.6f, 空间权重 π=%.6f, 因果权重 γ=%.6f\n",
		cfgSnap.EWeight, cfgSnap.PiWeight, cfgSnap.GammaWeight)
	fmt.Printf("    收敛阈值=%.2f, 极端阈值=%d, TopK=%d\n",
		cfgSnap.ConvergeThresh, cfgSnap.ExtremeThresh, cfgSnap.TopKNum)
	fmt.Println()

	// ━━━ 2. 全量编解码验证 ━━━
	fmt.Println("【2】全量19683点位编解码验证...")
	allPass := true
	for id := uint16(0); id < cogspace.TotalNum; id++ {
		vec, ok := cogspace.Decode(cogspace.CogID(id))
		if !ok {
			allPass = false
			break
		}
		if vec.Encode() != cogspace.CogID(id) {
			allPass = false
			break
		}
	}
	if allPass {
		fmt.Printf("    ✓ 全量 %d 点位编解码双向可逆，无映射误差\n", cogspace.TotalNum)
	} else {
		fmt.Println("    ✗ 编解码验证失败！")
		os.Exit(1)
	}
	fmt.Println()

	// ━━━ 3. 认知向量操作演示 ━━━
	fmt.Println("【3】认知向量操作演示:")

	// 原点向量（全和态）
	zero := cogspace.NewZeroVector()
	fmt.Printf("    原点向量: %s\n", zero.String())
	fmt.Printf("    原点ID: %d (offset=%d)\n", zero.Encode(), cogspace.Offset)

	// 扩张态向量
	expand := cogspace.NewVector(
		cogspace.TriPos, cogspace.TriPos, cogspace.TriPos, // 时间：全阳
		cogspace.TriPos, cogspace.TriMid, cogspace.TriPos, // 空间：内外阳
		cogspace.TriPos, cogspace.TriMid, cogspace.TriPos, // 因果：因果阳
	)
	fmt.Printf("    扩张向量: %s\n", expand.String())
	fmt.Printf("    到原点距离: %.4f\n", expand.BiasToOrigin())

	// 收缩态向量
	contract := cogspace.NewVector(
		cogspace.TriNeg, cogspace.TriNeg, cogspace.TriNeg,
		cogspace.TriNeg, cogspace.TriMid, cogspace.TriNeg,
		cogspace.TriNeg, cogspace.TriMid, cogspace.TriNeg,
	)
	fmt.Printf("    收缩向量: %s\n", contract.String())
	fmt.Printf("    扩张↔收缩欧式距离: %.4f\n", cogspace.DistEuclid(expand, contract))
	fmt.Printf("    扩张↔收缩加权曼哈顿距离: %.4f\n", cogspace.DistWeightedManhattan(expand, contract))

	// 阴阳和合融合
	merged := cogspace.Merge(expand, contract)
	fmt.Printf("    融合结果: %s\n", merged.String())
	fmt.Println()

	// ━━━ 4. 认知记忆池演示 ━━━
	fmt.Println("【4】认知记忆池演示:")
	mem := agent.NewCogMemory()

	// 写入若干认知点位
	cognitions := []struct {
		text string
		vec  cogspace.CogVector
	}{
		{"用户询问历史数据分析方法", cogspace.NewVector(
			cogspace.TriPos, cogspace.TriMid, cogspace.TriMid,
			cogspace.TriMid, cogspace.TriMid, cogspace.TriMid,
			cogspace.TriMid, cogspace.TriMid, cogspace.TriMid)},
		{"系统规划未来产品路线图", cogspace.NewVector(
			cogspace.TriMid, cogspace.TriMid, cogspace.TriPos,
			cogspace.TriMid, cogspace.TriMid, cogspace.TriPos,
			cogspace.TriMid, cogspace.TriMid, cogspace.TriMid)},
		{"内省自我认知与价值观审视", cogspace.NewVector(
			cogspace.TriMid, cogspace.TriMid, cogspace.TriMid,
			cogspace.TriPos, cogspace.TriMid, cogspace.TriMid,
			cogspace.TriMid, cogspace.TriMid, cogspace.TriMid)},
		{"因资源不足导致项目延期", cogspace.NewVector(
			cogspace.TriMid, cogspace.TriMid, cogspace.TriMid,
			cogspace.TriMid, cogspace.TriMid, cogspace.TriNeg,
			cogspace.TriPos, cogspace.TriNeg, cogspace.TriNeg)},
	}

	for i, c := range cognitions {
		mem.WriteWithTags(c.vec, c.text, 0.5+float64(i)*0.1, []string{"demo"})
	}
	fmt.Printf("    已写入 %d 个认知点位\n", mem.Count())

	// TopK召回
	target := cogspace.NewVector(
		cogspace.TriPos, cogspace.TriMid, cogspace.TriMid,
		cogspace.TriMid, cogspace.TriMid, cogspace.TriMid,
		cogspace.TriMid, cogspace.TriMid, cogspace.TriMid)
	results := mem.SearchTopK(target, 3)
	fmt.Printf("    以「过去·阳」为目标召回Top3:\n")
	for i, r := range results {
		fmt.Printf("      #%d [dist≈%.4f] %s\n", i+1,
			cogspace.DistWeightedManhattan(target, r.Vector), r.Text)
	}

	stats := mem.GetStats()
	fmt.Printf("    统计: %d/%d 点位已用 (%.2f%%), 平均评分=%.2f\n",
		stats.TotalNodes, stats.Capacity, stats.UsageRatio*100, stats.AvgScore)
	fmt.Println()

	// ━━━ 5. Agent认知循环演示 ━━━
	fmt.Println("【5】Agent认知循环演示:")

	loopMem := agent.NewCogMemory()
	loop := agent.NewCogAgentLoop(loopMem)
	loop.MaxRounds = 5

	round := 0
	result, termCheck, err := loop.Run(
		"分析过去的经验，规划未来的目标",
		func(intent, supplement string) (string, bool, error) {
			round++
			fmt.Printf("    第%d轮: intent='%s'\n", round, intent)
			if supplement != "" {
				// 只显示前50字符
				sup := supplement
				if len(sup) > 50 {
					sup = sup[:50] + "..."
				}
				fmt.Printf("           supplement='%s'\n", sup)
			}
			if round >= 3 {
				return "分析完成，已产出规划方案", true, nil
			}
			return fmt.Sprintf("第%d轮分析进行中", round), false, nil
		},
	)

	if err != nil {
		fmt.Printf("    错误: %v\n", err)
	} else {
		fmt.Printf("    最终结果: %s\n", result)
		fmt.Printf("    终止校验: %s\n", termCheck.String())
	}
	fmt.Println()

	// ━━━ 6. 快照落盘加载演示 ━━━
	fmt.Println("【6】快照落盘加载演示:")
	snapshotPath := "/tmp/cogspace_demo_snapshot.json"

	if err := mem.SaveSnapshot(snapshotPath); err != nil {
		fmt.Printf("    保存失败: %v\n", err)
	} else {
		fmt.Printf("    ✓ 快照已保存到 %s\n", snapshotPath)

		mem2 := agent.NewCogMemory()
		if err := mem2.LoadSnapshot(snapshotPath); err != nil {
			fmt.Printf("    加载失败: %v\n", err)
		} else {
			fmt.Printf("    ✓ 快照已加载，点位数: %d\n", mem2.Count())
		}
		os.Remove(snapshotPath)
	}
	fmt.Println()

	// ━━━ 7. 性能基准 ━━━
	fmt.Println("【7】性能基准:")
	start := time.Now()
	for id := uint16(0); id < cogspace.TotalNum; id++ {
		vec, _ := cogspace.Decode(cogspace.CogID(id))
		_ = vec.Encode()
	}
	elapsed := time.Since(start)
	fmt.Printf("    全量19683点位编解码: %v (%.0f ns/op)\n",
		elapsed, float64(elapsed.Nanoseconds())/cogspace.TotalNum)

	start = time.Now()
	for i := 0; i < 100000; i++ {
		_ = cogspace.DistWeightedManhattan(expand, contract)
	}
	elapsed = time.Since(start)
	fmt.Printf("    加权曼哈顿距离 ×100000: %v (%.0f ns/op)\n",
		elapsed, float64(elapsed.Nanoseconds())/100000)
	fmt.Println()

	fmt.Println("╔══════════════════════════════════════════════════════════╗")
	fmt.Println("║  ✓ 所有演示完成                                          ║")
	fmt.Println("╚══════════════════════════════════════════════════════════╝")
}
