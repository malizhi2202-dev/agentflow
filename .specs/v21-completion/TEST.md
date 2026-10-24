# TEST · v21-completion（逐项留证）


## T-02 Agent 真实运行时执行（2026-10-24）

```text
$ cd backend && unittest tests.test_runtime_exec tests.test_chat_runtime
Ran 12 tests — OK

真实 CLI 冒烟（RUNTIME_EXEC_ENABLED=1）：
hermes: reply='1' runtime=hermes (7.4s)
dsh:    reply='1' runtime=dsh    (3.7s)

$ unittest discover -s tests
Ran 477 tests in 76.655s
FAILED (failures=29, errors=12, skipped=6)
diff 基线失败清单 → 无差异（0 新增红）
```

覆盖点：默认关闭、模板缺失、无 `{prompt}` 占位、argv 单参数（不经 shell）、非零退出、命令不存在、
运行时报错**不降级**、未启用走 provider、启用走运行时（prompt 带角色标记）。
