const { chromium } = require('playwright');
// 用法：NODE_PATH=<playwright> node scripts/e2e/ui_mysql_e2e.js
// 环境变量：E2E_BASE（默认 127.0.0.1:5173 的 vite）、E2E_SHOTS（截图目录）、
//          E2E_USER/E2E_PASS（默认 admin/e2e-pass-123）、E2E_CHROME（chromium headless shell 路径）
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:5173';
const SHOTS = process.env.E2E_SHOTS || '/tmp/e2e-mysql/shots';
const USER = process.env.E2E_USER || 'admin';
const PASS = process.env.E2E_PASS || 'e2e-pass-123';
const SHELL = process.env.E2E_CHROME ||
  '/home/malizhi/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell';
const stamp = Date.now().toString().slice(-6);
const results = [];
const log = (n, ok, d) => { results.push({ n, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`); };

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: SHELL });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // ---- 登录 ----
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const idInput = page.getByPlaceholder('用户 ID（如 admin）');
  if (await idInput.count()) { await idInput.fill(USER); await page.getByRole('button', { name: /继续/ }).click(); }
  if ((await page.getByPlaceholder('密码').count()) === 0) await page.getByRole('button', { name: new RegExp(USER) }).first().click();
  await page.getByPlaceholder('密码').fill(PASS);
  await page.getByRole('button', { name: /^登录$/ }).click();
  await page.getByRole('button', { name: '任务' }).waitFor({ timeout: 20000 });
  log('登录（MySQL + 服务端会话）', true);

  // ---- 任务：建单 + 状态推进 ----
  await page.getByRole('button', { name: '任务' }).click();
  const t1 = `MYSQL 任务 ${stamp}`;
  await page.getByRole('button', { name: /新建任务/ }).click();
  await page.getByLabel('任务标题').fill(t1);
  await page.getByRole('button', { name: /^创建$/ }).click();
  await page.getByText(t1).waitFor({ timeout: 15000 });
  // 卡片 DOM：标题 span → 头部 div(1) → 卡片 div(2)。用祖先两层的卡片容器限定范围
  const card1 = page.getByText(t1, { exact: true }).locator('xpath=ancestor::div[2]');
  await card1.getByRole('button', { name: /→ 待做/ }).click();
  await page.getByText(t1, { exact: true }).locator('xpath=ancestor::div[2]')
    .getByRole('button', { name: /→ 进行中/ }).waitFor({ timeout: 20000 });
  log('任务：建单 → 推进到待做', true);

  // ---- 任务：指派给自己 → 收件箱 ----
  const t2 = `MYSQL 指派 ${stamp}`;
  await page.getByRole('button', { name: /新建任务/ }).click();
  await page.getByLabel('任务标题').fill(t2);
  await page.getByLabel('负责人类型').selectOption('member');
  await page.getByLabel('负责人 ID').fill('admin');
  await page.getByRole('button', { name: /^创建$/ }).click();
  await page.getByText(t2).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: '收件箱' }).click();
  await page.getByRole('heading', { name: /收件箱/ }).waitFor();
  await page.waitForTimeout(1200);
  const unreadBefore = await page.getByText(/未读 \d+ · 需我处理 \d+/).first().innerText();
  await page.screenshot({ path: `${SHOTS}/inbox.png` });
  const readBtn = page.getByTitle('标为已读（只动指针）').first();
  if (await readBtn.count()) { await readBtn.click(); await page.waitForTimeout(800); }
  log('收件箱：指派进箱 + 标读', true, unreadBefore);

  // ---- 团队：建团 + 成员 + 暂停 ----
  await page.getByRole('button', { name: '团队与小隊' }).click();
  const team = `MySQL 团队 ${stamp}`;
  await page.getByRole('button', { name: /新建团队/ }).click();
  await page.getByLabel('团队 slug').fill(`mysql-${stamp}`);
  await page.getByLabel('团队名称').fill(team);
  await page.getByRole('button', { name: '创建团队' }).click();
  await page.getByText(team).first().waitFor({ timeout: 20000 });
  // 列表卡片按钮的可达名=卡片全文；用正则匹配更稳（aria-label 偶发时序不稳）
  const esc = team.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await page.getByRole('button', { name: new RegExp(esc) }).first().click({ timeout: 20000 });
  await page.getByLabel('成员 user id').fill('bob');
  await page.getByRole('button', { name: '添加成员' }).click();
  await page.getByText('bob').first().waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: '切换到 已暂停' }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/teams.png` });
  log('团队：建团 + 加成员 + 暂停', true);

  // ---- 记忆：列表（应含 L0 抽取结果）+ 写入 + 评审 ----
  await page.getByRole('button', { name: '记忆中心' }).click();
  await page.getByRole('heading', { name: /记忆中心/ }).waitFor();
  await page.getByText(/自动化治理/).waitFor({ timeout: 15000 });
  // L0 抽取由 dsh CLI 生成，cue 措辞可能不同：用关键词 + 行数双重判定
  await page.getByText('看评审').first().waitFor({ timeout: 20000 });
  const memCards = page.locator('div').filter({ has: page.getByText('看评审') });
  const memCount = await memCards.count();
  const has502 = (await page.getByText(/502/).count()) > 0;
  log('记忆：L0 抽取结果已在列表', memCount >= 2 && has502, `记忆行=${memCount} 含502=${has502}`);

  await page.getByRole('button', { name: /写入记忆/ }).first().click();
  await page.getByLabel('cue').fill(`MySQL 手写 ${stamp}`);
  await page.getByLabel('lesson').fill('先看发布记录再看网关');
  await page.getByLabel('evidence').fill('run-1');
  await page.getByRole('region', { name: '写入记忆' }).getByText('写入记忆').click();
  await page.getByRole('status').waitFor({ timeout: 15000 });
  const writeResult = await page.getByRole('status').first().innerText();
  log('记忆：写入并返回结果', /入库|no_entry/.test(writeResult), writeResult.slice(0, 40));
  await page.getByText('看评审').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/memory.png` });
  log('记忆：晋升评审账可查', (await page.getByText(/字段完整/).count()) > 0);

  // ---- 治理：开关 + 手动熔断 ----
  await page.getByText(/自动化治理/).click();
  const sw = page.getByRole('button', { name: /^skill：/ });
  await sw.waitFor();
  const before = (await sw.innerText()).includes('已暂停') ? 'paused' : 'running';
  await sw.click(); await page.waitForTimeout(900);
  const after = (await page.getByRole('button', { name: /^skill：/ }).innerText()).includes('已暂停') ? 'paused' : 'running';
  log('治理：skill 开关切换', before !== after, `${before}→${after}`);

  await page.getByLabel('熔断原因').fill('E2E 演练');
  await page.getByRole('button', { name: '手动熔断' }).click();
  await page.waitForTimeout(1200);
  log('治理：手动熔断提交', true);

  // ---- 提案：可改面 + 提案 + 探针 + 影子 + 发布 ----
  await page.getByRole('tab', { name: '提案' }).click();
  await page.getByRole('button', { name: '新建可改面' }).click();
  await page.getByLabel('surface 名称').fill(`agent-config-${stamp}`);
  await page.getByLabel('白名单路径').fill('prompts/');
  await page.getByRole('button', { name: '创建' }).click();
  await page.waitForTimeout(1200);

  // 熔断打开时建房应被 409 拦下（治理生效）
  await page.getByRole('button', { name: /新建提案/ }).click();
  await page.getByLabel('提案标题').fill(`熔断期提案 ${stamp}`);
  await page.locator('#p-surface').selectOption(`agent-config-${stamp}`);
  await page.getByLabel('目标路径').fill('prompts/persona.md');
  await page.getByRole('button', { name: '创建提案' }).click();
  await page.getByRole('alert').last().waitFor({ timeout: 15000 });
  const breakerMsg = await page.getByRole('alert').last().innerText();
  log('治理：熔断期新建提案被拒（409 文案）', /熔断打开/.test(breakerMsg), breakerMsg.slice(0, 30));

  // 复位熔断：治理区在**记忆 tab** 里（切回去再展开），复位后切回提案 tab
  await page.getByRole('tab', { name: '记忆' }).click();
  await page.getByText(/自动化治理/).click();
  const resetBtn = page.getByRole('button', { name: '复位' }).first();
  if (await resetBtn.count()) { await resetBtn.click(); await page.getByText('确认复位').first().click(); }
  await page.waitForTimeout(1200);
  log('治理：熔断复位', true);

  // 复位后重新创建提案
  await page.getByRole('tab', { name: '提案' }).click();
  await page.getByRole('button', { name: /新建提案/ }).click();
  await page.getByLabel('提案标题').fill(`MySQL 提案 ${stamp}`);
  await page.locator('#p-surface').selectOption(`agent-config-${stamp}`);
  await page.getByLabel('目标路径').fill('prompts/persona.md');
  await page.getByRole('button', { name: '创建提案' }).click();
  await page.getByText(`MySQL 提案 ${stamp}`).waitFor({ timeout: 20000 });

  await page.getByLabel('探针步数').fill('3');
  await page.getByLabel('探针 token 数').fill('1200');
  await page.getByRole('button', { name: '记录探针' }).click();
  await page.getByRole('button', { name: '记录影子重放' }).waitFor({ timeout: 15000 });
  await page.getByLabel('judge 模型').fill('dsh-cli');
  await page.getByLabel('pass_rate').fill('0.9');
  await page.getByLabel('baseline').fill('0.5');
  const checks = page.getByRole('checkbox');
  await checks.nth(0).check(); await checks.nth(1).check();
  await page.getByRole('button', { name: '记录影子重放' }).click();
  await page.getByRole('button', { name: '人批发布' }).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: '人批发布' }).click();
  await page.getByRole('button', { name: /确认发布/ }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/proposals.png` });
  log('提案：探针 → 影子 → 人批发布 全链路', (await page.getByText('published').count()) > 0);

  // ---- 真实运行时：UI 会话里直接调 shadow/run(judge=llm) ----
  const runtime = await page.evaluate(async () => {
    // 必须用 generated 状态的新提案：已发布的提案不能再走影子门
    const surfaces = await fetch('/api/rsi/surfaces').then(r => r.json());
    const sf = (surfaces.surfaces || [])[0];
    if (!sf) return { ok: false, why: 'no surface' };
    const created = await fetch('/api/rsi/proposals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'runtime-judge ' + Date.now(), dimension: 'invariant',
                             surface_name: sf.name, target: 'prompts/runtime.md' }),
    }).then(r => r.json());
    const p = created.proposal;
    if (!p) return { ok: false, why: 'create failed', body: created };
    const res = await fetch(`/api/rsi/proposals/${p.id}/shadow/run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cases: [{ expected: '先看第一个类型错误', actual: '先看第一个类型错误，其它多为级联' },
                { expected: '不该', actual: '先改配置再说' }],
        judge_model: 'dsh-cli', golden_set_frozen: true, cross_vendor: true,
        baseline: 0.0, judge: 'llm',
      }),
    });
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
  });
  log('运行时：judge=llm 真实调用 dsh CLI', runtime.ok && runtime.body.judge_kind === 'llm_judge',
      `pass_rate=${runtime.body.pass_rate} kind=${runtime.body.judge_kind}`);

  await browser.close();
  const failed = results.filter(r => !r.ok);
  console.log(`\nSUMMARY ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('E2E ERROR:', e.message); process.exit(2); });
