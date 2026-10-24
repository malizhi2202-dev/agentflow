# TEST: RSI 适配器
## 功能
- `test_judge_adapter` 4 条：未配置 fail-closed / 假 provider 打分 0.5 且调用 2 次 / 预算超限抛错且**停止调用**（calls=1）/ provider 异常响亮失败
- `test_l0_job` 3 条：默认 dry-run 只统计（不写记忆）/ 会话上限生效 / 注入抽取器每会话入库
- `test_shadow_runner` 新增 2 条：`judge=bogus` → 400；`judge=llm` 未配置 → 400（文案含「judge 未配置」）

## 全量
```text
$ unittest discover -s tests
Ran 460 tests in 72.652s
FAILED (failures=29, errors=12, skipped=6)
$ diff 基线失败清单 → 无差异（0 新增红）
```

## 安全
- 无默认 provider、无隐式外部调用；未配置即 400
- 预算帽硬上限，超限抛错停止（Test 断言 calls=1）
- L0 循环 interval=0 不启动；启动后仍受单例租约与每轮会话上限约束

## CLI 通道（dsh / hermes）
`test_cli_provider` 9 条：argv 白名单（prompt 单参数）/ 未知 CLI 拒绝 / ANSI 去除 / 最后一行 / 成功带超时 / 非零退出响亮 / 超时响亮 / cli 免 key / judge 只看最后一行。
真实试跑见 `LOCAL-TRIAL.md` 追加节（dsh 与 hermes 各跑通 L0 + judge）。

## 未覆盖
真实厂商调用（未定厂商/预算）、judge 缓存、L0 prompt 质量评估。
测试门（自评）🧪✅ 🟫✅ 🧑‍💼✅ 🧑‍🎨✅ → 4/4
