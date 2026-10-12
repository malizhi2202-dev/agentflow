# ① 头脑风暴 · S13
候选：A 回归纯 localhost 砍权限（❌ 与多租户/协作层方向冲突）· B 内嵌 OAuth2/OIDC 全家桶（❌ 单进程过重）· C 三板斧：session cookie+PAT 双轨 / DEPLOY_MODE 显式化 / argon2id+废出厂口令（✅ 采纳=P0-1/2/3 具体化）· D 保 header 推给网关担责（❌ 安全押在部署运气上）。
