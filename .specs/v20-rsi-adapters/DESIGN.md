# DESIGN: RSI 适配器
- 0.5 触碰：`judge_adapter.py`(新) · `l0_job.py`(新) · `shadow_runner.py`(加 scorer) · `rsi_api.py`(映射/模式) · `main.py`(循环) · `config.py`(5 项)
- D1 显式配置才启用（无默认 provider）· D2 预算帽硬停 · D3 打分器可替换（门禁不复制）· D4 L0 循环 interval=0 不启动 · D5 三类错统一 400
- 风险：真实厂商未定 → 保持未配置；L0 prompt 质量未评 → 默认 dry-run。
- G2（自评）🟩✅ 🟫✅ 🟪✅ 🔴✅ → 4/4
