# RECON · S8 执行隔离阶梯 — 第 4 轮 ②
> 状态：待审 · 2026-09-23 · 源：agent `3d678449`（全 web_fetch 一手，URL 见各条）；本地现状见 `../R4-CODEAUDIT.md` 议题1

## ① 外部事实（含四处对任务假设的修正）
- **A · agent-sandbox**：定位=**编排器不做隔离**（委托 gVisor/Kata 经 RuntimeClass）；v1.0.0 GA 属实（2026-08-28，最新 v1.0.3）**但 API 仍 v1beta1** ⚠。契约可借：`shutdownTime(绝对时刻)+shutdownPolicy Delete|Retain`、`operatingMode Running|Suspended`(杀 Pod 保对象与卷)、volumeClaimTemplates 建后不可变、SandboxWarmPool；威胁模型：默认 Managed NetworkPolicy=ingress 仅 Router+egress 仅公网（封 RFC1918/metadata）、禁系统标签注入防跨租户劫持；v1.0.3 引入 **execution-scoped credentials（进程退即吊销）**。
- **G · gVisor**：Docker `runsc install`→`--runtime=runsc` 一键；**systrap 默认平台=无需 KVM/内核改动**（ptrace 停支）；性能=CPU 密集≈零损失、亏在 syscall 密集与文件路径（定性+CSV，无固定倍数，⚠ 未达 U3）；启动大头在 Docker 本身。
- **F · Firecracker**：硬前置 `/dev/kvm`+jailer；CI 强制规格：**VMM 启动典型 ~12ms、boot≤125ms、内存开销≤5MiB、CPU>95% 裸金属**；定位=真多租户最小开销。**libkrun 仍需 KVM（Linux）/HVF(mac)，不构成无 KVM 替代** ⚠——无 KVM 正解=gVisor systrap→Kata。
- **E · E2B**：每沙箱一 FC microVM+per-slot nftables 出口名单；快在**快照**（预启动模板+UFFD 懒缺页+fork≤100ms）非冷启动；自托管=全栈（PG/Redis/CH/对象存储/K8s，节点需 root）；单机有 **E2B Embed（官方自述"评估包非生产形态"）**。
- **D · Daytona ⚠ 出局**：OSS 仓 **2026-06 停更迁私有**（末 v0.190.0）——借参照除名，本身是市场事实。
- **O · OpenHands**：三档=Docker(默认推荐)/Process("unsafe, but fast")/Remote；每会话容器自动清理；**细分层先例：Agent Server 留宿主（可信）、仅工具执行进每会话临时容器**；原文="A separate conversation is not a security boundary when it shares a sandbox with another conversation."（Enterprise 文档 Warning 框）⚠ 出处已钉准。
- **M · multica 三真边界精确出处**：security-model.mdx :12-22（"不假装是边界，请在外面包一层"+半成品沙箱理由）/:36-40 三边界（独立 workdir/运行级 CODEX_HOME/run-scoped `mat_` 票绑 (agent,task) "Never fall back"，代码位 jwt.go:78+daemon.go:8485）/:48 **Linux 曾实装 workspace-write+重定向 HOME 后主动移除**（宿主 CLI 失效且只限写不限读）——诚实降级最强先例。

## ② 本地真值（R4-CODEAUDIT 议题1）
「执行」=chat_service.py:105 同进程 httpx LLM 调用；run 端点空壳；全 backend 唯一 subprocess=git 只读。**当前无任意代码执行面**——沙箱诉求由未来工具/插件执行面触发。

## ③ 阶梯矩阵（浓缩）
T0 进程内(现状·无边界) / T1 子进程+rlimit（**弱-中，不构成安全边界**，仅过渡带）/ T2 Docker runc（中·ns+cgroup 共享内核·~1s·单租户默认档先例=OpenHands）/ T3 +runsc（中高·**无 KVM 可跑**·syscall 打折）/ T4 FC microVM（高·需 /dev/kvm·12ms/125ms/5MiB·自研编排成本）/ T5 云沙箱（最高·隔离外移换信任·自托管全栈违背单进程=仅外接选项）。
