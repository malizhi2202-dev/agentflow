# RULINGS — v25-r25-clearance 裁定记录（四条 · 2026-10-25 · AskUserQuestion）

> 本文件是**批内裁定记录**；现行口径的单一事实源仍是 `.specs/platform-evolution/RULINGS.md`（结案账 §五点五·三 · 词表 §五点五·三之一）。

## 裁一 · 批次范围 =「全做 A+B+C」

- **原文选项**：「全做 A+B+C」——A 前端接线（R25-1/4/6/8）· B 治理后端（R25-2/5/7）· C 列形态族（R25-11）。
- **影响**：五笔拆批（shape → governance → assign-run → fe-wiring → docs），验收门含真 MySQL 重放与前端四门。

## 裁二 · R25-5 =「实装 HMAC-SHA256，token 双通道过渡」

- **判定语义**：带 `X-Webhook-Signature: sha256=<hex>` ⇒ **HMAC-SHA256(raw body, signing_secret) + `hmac.compare_digest`**，不符 401；**不带 ⇒ 回落旧 token 通道**（存量集成不断）；未配置签名密钥却带签名头 ⇒ `signature_unconfigured` 401（fail-closed，不给「猜没猜中」留缝）。
- **投递账记因**：`auth` 字段 `hmac` / `legacy_token`；拒因 `signature_invalid` / `signature_unconfigured`。「门」类 401 照记行、不进成功率分母（主档 §3.3 投递账本句对上）。
- **密钥管理**：`signing_secret` 明文**只回显一次**、密文经 `encryption_service` 落库、rotate **同换两凭据**、`api` 型触发器不设。
- **边界**：**token 退役另批裁定**——双通道是过渡态，退役前 `legacy_token` 记因持续可见。

## 裁三 · R25-7 =「落表：全局一行总闸」

- **判定语义**：`rsi_switches` 增 `category='global'` 行（迁移 032 幂等插、enabled=1）；`assert_category_running` **先查总闸**，off ⇒ 短路一切类目（发生在任何类目判定前）；`switches()` global 领衔、**缺行合成开**（兼容旧库）；停用必填原因双入口对 global 同样成立。
- **聚合语义改判**：前端总闸从「逐类目聚合呈现」改「**读写真行**」；无 global 真行时如实回退聚合并加「派生 · 」前缀——诚实呈现纪律不破。

## 裁四 · R25-3 =「表挂起，exec_ledgers 继续只建不写」

- **判定语义**：预算帽生成器不入批；`exec_ledgers.expected_*` 无上游即不写——**宁挂账不伪造恒等式**（写 expected=actual 的假账违背该表纪律）。
- **性质**：挂账由「待裁」转「**已裁挂起**」，解锁需新裁定。

## 随批登记的两处口径（非新裁，探查修正）

- **R25-8 升级**：探查实锤「两头有、中间没有」⇒ 本批按「前端确认层（一份）+ 后端 `run_from_assignment`」结案；确认层硬口径沿原型 `board.html#md-assign-confirm`（开始=当场建 run / 先不开工=只登记 / 取消；停车闸=backlog/未开始；终态不豁免；人轨不弹）。
- **R25-11 判据**：列形态族「按主档判据逐项补，无需逐条裁定」；**rename/表重构不做**（v23 已认账 + 生产数据风险）。
