# 理论框架引用索引

本仓库源码中多处注释引用了"论文 Section X.X"，这些引用指向 TC-AGI 认知架构的理论框架文档。该文档尚未公开发表，以下索引将各引用映射到其对应的理论主题，便于读者理解各模块的理论基础。

## 引用映射表

| 引用 | 主题 | 对应源文件 |
|------|------|-----------|
| Section 2.3 | 五蕴元认知：从佛教五蕴（色受想行识）衍生认知自感知模型 | `five-aggregates.ts` |
| Section 3.3 | 道生万物：道→一→二→三→万物的生成序列，对应空引擎技能创造 | `null-engine.ts` |
| Section 4.1 | 升映射（Sheng Lift）：将三元状态 (+1/0/-1) 规范嵌入到 S⁸ 球面 | `trit-vector.ts` |
| Section 5 | 四相极限环：从 Hamiltonian 流的相图中自动发现四相 | `four-phase.ts`, `prototypes.ts` |
| Section 5.1 | 四相发现算法：e-平滑导数 + 辛角投影 + 象限聚类 | `four-phase.ts` |
| Section 5.2 | π-e 谐振动力学：Stuart-Landau 方程控制认知振荡器 | `pi-e-resonance.ts` |
| Section 6.1 | 呼吸门控：呼吸节律 β(t) 控制感知/行动的精度权重分配 | `active-inference.ts`, `daemon.ts` |
| Section 6.2 | 瞬子跃迁：非演绎直觉作为拓扑瞬子隧穿 | `instanton-leap.ts` |
| Section 6.3 | 梦境推理：无数据自主学习的梦境 Hamiltonian | `dream-reasoning.ts` |
| Section 6.4 | 认知共振：19683 态认知场的共振现象 | `cognitive-resonance.ts` |
| Section 6.5 | 实现间隙：四相序列结构熵 H₄ 与稀疏子流形 S* | `realization-gap.ts` |
| Section 9.7 | 实证验证：可证伪的三测试协议 | `empirical-validation.ts` |
| Section 9.7.1 | 14 系统基准表 | `empirical-validation.ts` |
| Section 9.7.3 | 不确定性比例：系统在不确定时选择不分类的比例 | `empirical-validation.ts` |

## 说明

这些理论框架的内容在本仓库中已通过代码实现和测试验证。理论文档的正式发表时间待定，届时将更新引用为可访问的链接。
