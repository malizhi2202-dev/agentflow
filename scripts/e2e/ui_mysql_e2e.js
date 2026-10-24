const { chromium } = require('playwright');
// 用法：NODE_PATH=<playwright> node scripts/e2e/ui_mysql_e2e.js
// 环境变量：E2E_BASE（默认 127.0.0.1:5173 的 vite）、E2E_SHOTS（截图目录）、
//          E2E_USER/E2E_PASS（默认 admin/e2e-pass-123）、E2E_CHROME（chromium headless shell 路径）
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:5173';
const SHOTS = process.env.E2E_SHOTS || '/tmp/e2e-mysql/shots';
const USER = process.env.E2E_USER || 'admin';
const PASS = process.env.E2E_PASS || 'e2e-pass-123';
const CLI = process.env.E2E_CLI || 'dsh';
const SHELL = process.env.E2E_CHROME ||
  '/home/malizhi/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell';
const stamp = Date.now().toString().slice(-6);
const results = [];
const waitCrumb = async (page, label) => {
  await page.locator('.app-top .crumb').filter({ hasText: label }).first()
    .waitFor({ state: 'visible', timeout: 20000 });
};

/** 登录：兼容两种形态（公开用户列表 = 点卡片；不公开 = 填用户 ID 后继续）。 */
async function login(page, userId, password) {
  const idInput = page.getByPlaceholder('用户 ID（如 admin）');
  const pwd = page.getByPlaceholder('密码');
  // 等「任一形态」出现再判断（刚 goto 完时两者 count 都可能为 0 → 误判成用户卡片形态）
  await Promise.race([
    idInput.waitFor({ state: 'visible', timeout: 20000 }),
    pwd.waitFor({ state: 'visible', timeout: 20000 }),
  ]).catch(() => {});
  if (await idInput.count()) {
    await idInput.fill(userId);
    await page.getByRole('button', { name: /继续/ }).click();
  } else {
    // 公开用户列表形态：admin 的显示名是「管理员」，不能只按 id 匹配
    const byId = page.getByRole('button', { name: new RegExp(userId, 'i') }).first();
    if (await byId.count()) await byId.click();
    else await page.getByRole('button', { name: /管理员|Administrator/ }).first().click();
  }
  await pwd.waitFor({ state: 'visible', timeout: 20000 });
  await pwd.fill(password);
  await page.getByRole('button', { name: /^登录$/ }).click();
  await page.getByRole('button', { name: '任务', exact: true }).waitFor({ timeout: 20000 });
}

/** 新建任务表单是「开关式」且提交后不自动关闭：只在没打开时才点，避免点两下又关掉。 */
async function ensureNewTask(page) {
  if ((await page.getByLabel('任务标题').count()) === 0) {
    await page.getByRole('button', { name: /新建任务/ }).click();
  }
  await page.getByLabel('任务标题').waitFor({ state: 'visible', timeout: 20000 });
}

const log = (n, ok, d) => { results.push({ n, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`); };

/**
 * 轻量 a11y 审计（v21 T-06）：不引 axe（离线环境 + 避免 devDependency 漂移），
 * 只查「可回归、可解释」的硬项：按钮可达名 / 表单控件标签 / img alt / 标题层级 / 负 tabindex 之外的正 tabindex / tab 角色 aria。
 */
async function auditA11y(page, label) {
  const issues = await page.evaluate(() => {
    const out = [];
    const txt = (el) => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();
    document.querySelectorAll('button').forEach((b) => {
      if (!txt(b)) out.push('button 无可达名: ' + b.outerHTML.slice(0, 70));
    });
    document.querySelectorAll('input,select,textarea').forEach((el) => {
      if (el.type === 'hidden') return;
      const byFor = el.id && document.querySelector(`label[for="${el.id}"]`);
      const wrapped = el.closest('label');   // 包裹式 label 也是合法标签，别误报
      if (!byFor && !wrapped && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.title) {
        out.push('表单控件无标签: ' + el.outerHTML.slice(0, 70));
      }
    });
    document.querySelectorAll('img').forEach((i) => {
      if (!i.hasAttribute('alt')) out.push('img 缺 alt: ' + (i.src || '').slice(0, 50));
    });
    if (!document.querySelector('h1,h2')) out.push('页面无标题（h1/h2）');
    document.querySelectorAll('[tabindex]').forEach((el) => {
      if (Number(el.getAttribute('tabindex')) > 0) out.push('正 tabindex（破坏焦点顺序）: ' + el.outerHTML.slice(0, 60));
    });
    document.querySelectorAll('[role="tab"]').forEach((t) => {
      if (!t.hasAttribute('aria-selected')) out.push('tab 缺 aria-selected: ' + (t.textContent || '').trim());
    });
    return out;
  });
  log(`a11y：${label}（0 违规）`, issues.length === 0, issues.length ? issues.slice(0, 3).join(' | ') : '');
  return issues;
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: SHELL });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // ---- 登录 ----
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await login(page, USER, PASS);
  log('登录（MySQL + 服务端会话）', true);

  // ---- 任务：建单 + 状态推进 ----
  await page.getByRole('button', { name: '任务', exact: true }).click();
  const t1 = `MYSQL 任务 ${stamp}`;
  await ensureNewTask(page);
  await page.getByLabel('任务标题').fill(t1);
  await page.getByRole('button', { name: /^创建$/ }).click();
  await page.getByText(t1).waitFor({ timeout: 15000 });
  // 卡片 DOM：标题 span → 头部 div(1) → 卡片 div(2)。用祖先两层的卡片容器限定范围
  // 卡片是 <article aria-label="任务 <title>">（P3 重写后的稳定标识），比 ancestor::div 稳
  const card1 = page.getByRole('article', { name: `任务 ${t1}` });
  await card1.getByRole('button', { name: /→ 待做/ }).click();
  await card1.getByRole('button', { name: /→ 进行中/ }).waitFor({ timeout: 20000 });
  log('任务：建单 → 推进到待做', true);

  // ---- 任务：指派给自己 → 收件箱 ----
  const t2 = `MYSQL 指派 ${stamp}`;
  await ensureNewTask(page);
  await page.getByLabel('任务标题').fill(t2);
  // 三轨是指派选择器里的 chip 按钮（不是 <select>）
  // aria-label 挂在一个 div.panel 上（不是表单控件）→ 用 role=region 取；三轨是 chip 按钮
  // aria-label 在 div.panel 上（无 landmark role）→ 用属性选择器；三轨按钮文字是 人/Agent/小队
  await page.locator('[aria-label="指派负责人"]').getByRole('button', { name: /^人$/ }).first().click();
  await page.getByLabel('负责人 ID').fill('admin');
  await page.getByRole('button', { name: /^创建$/ }).click();
  await page.getByText(t2).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: '收件箱' }).click();
  await waitCrumb(page, '收件箱');
  await page.waitForTimeout(1200);
  const unreadBefore = await page.getByText(/未读 \d+ · 需我处理 \d+/).first().innerText();
  await page.screenshot({ path: `${SHOTS}/inbox.png` });
  const readBtn = page.getByTitle('标为已读（只动指针）').first();
  if (await readBtn.count()) { await readBtn.click(); await page.waitForTimeout(800); }
  log('收件箱：指派进箱 + 标读', true, unreadBefore);

  // ---- 团队：建团 + 成员 + 暂停 ----
  await page.getByRole('button', { name: '团队与小队', exact: true }).click();
  const team = `MySQL 团队 ${stamp}`;
  await page.getByRole('button', { name: /新建团队/ }).click();
  await page.getByLabel('团队 slug').fill(`mysql-${stamp}`);
  await page.getByLabel('团队名称').fill(team);
  await page.getByRole('button', { name: '创建团队' }).click();
  // 列表卡片按钮的可达名=「打开团队 <name>」；直接等按钮出现（文本可能先于列表渲染命中）
  const esc = team.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const teamCard = page.getByRole('button', { name: new RegExp(esc) });
  try {
    await teamCard.first().waitFor({ state: 'visible', timeout: 25000 });
  } catch (e) {
    const dump = await page.locator('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') || (b.textContent || '').trim().slice(0, 30)));
    console.error('DIAG buttons=', JSON.stringify(dump));
    throw e;
  }
  await teamCard.first().click({ timeout: 20000 });
  await page.getByLabel('成员 user id').fill('bob');
  await page.getByRole('button', { name: '添加成员' }).click();
  await page.getByText('bob').first().waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: '切换到 已暂停' }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/teams.png` });
  log('团队：建团 + 加成员 + 暂停', true);

  // ---- 自动化 / 运行时 / 回放：三页可达 + 至少一条真交互 ----
  await page.getByRole('button', { name: '自动化', exact: true }).click();
  await waitCrumb(page, '自动化');
  // ① 清单始终在；②-⑨ 需要选中一条自动化（新建后自动选中）
  await page.getByText(/① 自动化清单/).first().waitFor({ timeout: 20000 });
  const autoName = `E2E 自动化 ${stamp}`;
  await page.getByRole('button', { name: /新建自动化/ }).click();
  await page.getByLabel('自动化名称').fill(autoName);
  // 三段各自必填：负责人（Agent id 取库里第一只）+ Runbook 目标
  const agentId = await page.evaluate(async () => {
    const list = await fetch('/api/agents').then((r) => r.json());
    return (list.agents || [])[0]?.id ?? null;
  });
  if (agentId === null) throw new Error('自动化用例需要至少一只 Agent');
  await page.getByLabel('负责人引用').fill(String(agentId));
  await page.getByLabel(/新建 Runbook 目标|新建 Runbook .*目标/).fill('每日巡检并汇报失败');
  await page.getByRole('button', { name: /保存（即 v1 快照）/ }).click();
  await page.getByText(autoName).first().waitFor({ timeout: 20000 });
  for (const [label, marker] of [
    ['②', /② 三段构成/], ['③', /③ schedule 触发器/], ['④', /④ webhook 触发器/],
    ['⑤', /⑤ 执行模式/], ['⑥', /⑥ 两级账本/], ['⑦', /⑦ 失败治理/],
    ['⑧', /⑧ 权限/], ['⑨', /⑨ multica/],
  ]) {
    await page.getByText(marker).first().waitFor({ timeout: 20000 });
  }
  await page.screenshot({ path: `${SHOTS}/automations.png` });
  log('自动化：9 节可见 + 新建自动化真落库（v1 快照）', true);

  await page.getByRole('button', { name: '运行时', exact: true }).click();
  await waitCrumb(page, '运行时');
  log('运行时：页面可达（summary/sessions）', (await page.getByRole('region', { name: '运行时会话' }).count()) > 0);

  await page.getByRole('button', { name: '回放', exact: true }).click();
  await waitCrumb(page, '回放');
  await page.getByLabel(/^回放任务/).first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/replay.png` });
  log('回放：选任务看运行时间线', (await page.getByText(/run #\d+|还没有运行记录/).count()) > 0);

  // ---- P3 四族：看板证据门 / 对话中心语义 / 知识库四节 / 管控面三卡组 ----
  // ① 看板：把一条任务标完成且不附证据 → 完成态但要出现「缺证据」警告
  await page.getByRole('button', { name: '任务', exact: true }).click();
  await waitCrumb(page, '任务');
  const boardTask = `E2E 证据 ${stamp}`;
  await ensureNewTask(page);
  await page.getByLabel('任务标题').fill(boardTask);
  await page.getByRole('button', { name: /^创建$/ }).click();
  await page.getByText(boardTask).first().waitFor({ timeout: 20000 });
  const card = page.getByRole('article', { name: `任务 ${boardTask}` });
  await card.getByRole('button', { name: /→ 待做/ }).click();
  await page.waitForTimeout(800);
  await card.getByRole('button', { name: /→ 进行中/ }).click();
  await page.waitForTimeout(800);
  // 到 done 的路径：in_progress → in_review → done（状态机；done 走「附证据」表单，可空证据=可疑完成）
  await card.getByRole('button', { name: /→ 待验收/ }).click();
  await page.waitForTimeout(800);
  await card.getByRole('button', { name: /→ 完成（需证据）/ }).click();
  await card.getByRole('button', { name: /无证据提交（记为可疑完成）/ }).click();
  await page.waitForTimeout(1200);
  await page.getByText(/缺证据/).first().waitFor({ timeout: 20000 });
  log('看板：无证据完成 → 仍完成但出现「缺证据」警告（不硬拦）', true);

  // ② 对话中心：四语义文案与规则面板
  await page.getByRole('button', { name: /对话中心/ }).click();
  await waitCrumb(page, '对话中心');
  for (const marker of [/完全私密/, /一条消息/, /离线/]) {
    await page.getByText(marker).first().waitFor({ timeout: 20000 });
  }
  log('对话中心：私密 / 一条消息=一 run / 离线 queued 口径可见', true);

  // ③ 知识库：§0 权限矩阵 + §3 外部源
  await page.getByRole('button', { name: '知识库', exact: true }).click();
  await waitCrumb(page, '知识库');
  await page.getByText(/权限矩阵/).first().waitFor({ timeout: 20000 });
  await page.getByText(/外部源/).first().waitFor({ timeout: 20000 });
  log('知识库：§0 权限矩阵 + §3 外部源 可见', true);

  // ④ 管控面：三块卡区
  await page.getByRole('button', { name: 'Agent 管控', exact: true }).click();
  await waitCrumb(page, 'Agent 管控');
  for (const marker of [/调度底座/, /RSI/, /维护作业/]) {
    await page.getByText(marker).first().waitFor({ timeout: 20000 });
  }
  log('管控面：调度底座 / RSI 开关 / 维护作业 三块卡区可见', true);

  // ---- a11y：四个主页面各审一次（0 违规才算过）----
  await auditA11y(page, '回放');
  await page.getByRole('button', { name: '任务', exact: true }).click();
  await waitCrumb(page, '任务');
  await auditA11y(page, '任务看板');
  await page.getByRole('button', { name: '团队与小队', exact: true }).click();
  await waitCrumb(page, '团队与小队');
  await auditA11y(page, '团队与小队');
  await page.getByRole('button', { name: '记忆中心', exact: true }).click();
  await waitCrumb(page, '记忆中心');
  await auditA11y(page, '记忆中心');
  await page.getByRole('button', { name: '自动化', exact: true }).click();
  await waitCrumb(page, '自动化');
  await auditA11y(page, '自动化中心');

  // ---- ui-parity 新页族：8 页可达 + 各自 a11y（用户要求「全量对齐」后的回归入口）----
  const NEW_PAGES = [
    ['阶段模型配置', /阶段表（唯一事实源）/],
    ['决策模型目录', /未绑定 ⇒ 直通/],
    ['微调工厂', /训练批次/],
    ['执行隔离', /档位清单/],
    ['对外集成', /消息渠道（六通道）/],
    ['环境参谋', /机器画像/],
    ['Agent 详情', /选一只 Agent 看详情/],
    ['小队中心', /小队列表/],
  ];
  for (const [label, marker] of NEW_PAGES) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.getByText(marker).first().waitFor({ timeout: 20000 });
    await auditA11y(page, label);
    log(`页族可达：${label}`, true);
  }

  // ---- 多用户：bob 的视角（不可见与越权都走 404，不泄漏存在性）----
  const adminTaskId = await page.evaluate(async (title) => {
    const list = await fetch('/api/tasks').then((r) => r.json());
    const hit = (list.tasks || []).find((t) => t.title === title);
    return hit ? hit.id : null;
  }, t1);
  if (adminTaskId === null) throw new Error('找不到 admin 刚建的任务，多用户用例无法判定');

  const bobCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const bobPage = await bobCtx.newPage();
  await bobPage.goto(BASE, { waitUntil: 'networkidle' });
  await login(bobPage, 'bob', PASS);
  const bobView = await bobPage.evaluate(async ({ title, taskId }) => {
    const list = await fetch('/api/tasks').then((r) => r.json());
    const titles = (list.tasks || []).map((t) => t.title);
    const detail = await fetch(`/api/tasks/${taskId}`);
    return {
      total: titles.length,
      seesAdminTask: titles.includes(title),
      detailStatus: detail.status,
    };
  }, { title: t1, taskId: adminTaskId });
  log('多用户：bob 的任务列表不含 admin 的任务', !bobView.seesAdminTask, `bob 可见 ${bobView.total} 条`);
  log('多用户：bob 直取 admin 任务详情 = 404', bobView.detailStatus === 404, `status=${bobView.detailStatus}`);
  await bobCtx.close();

  // ---- 记忆：列表（应含 L0 抽取结果）+ 写入 + 评审 ----
  await page.getByRole('button', { name: '记忆中心', exact: true }).click();
  await waitCrumb(page, '记忆中心');
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
  try {
    await page.getByText(`MySQL 提案 ${stamp}`).waitFor({ timeout: 20000 });
  } catch (e) {
    const alerts = await page.getByRole('alert').allTextContents().catch(() => []);
    const disabled = await page.getByRole('button', { name: '创建提案' }).isDisabled().catch(() => null);
    const surfaces = await page.locator('#p-surface option').allTextContents().catch(() => []);
    console.error('DIAG 提案创建失败 alerts=', JSON.stringify(alerts), 'btnDisabled=', disabled,
                  'surfaceOptions=', JSON.stringify(surfaces).slice(0, 200));
    throw e;
  }

  // 库里可能残留历史提案卡片 → 一律限定在本次提案的 article 内，避免 strict mode 撞车
  const pcard = page.getByRole('article', { name: `提案 MySQL 提案 ${stamp}` });
  await pcard.getByLabel('探针步数').fill('3');
  await pcard.getByLabel('探针 token 数').fill('1200');
  await pcard.getByRole('button', { name: '记录探针' }).click();
  await pcard.getByRole('button', { name: '记录影子重放' }).waitFor({ timeout: 15000 });
  await pcard.getByLabel('judge 模型').fill(`${CLI}-cli`);
  await pcard.getByLabel('pass_rate').fill('0.9');
  await pcard.getByLabel('baseline').fill('0.5');
  const checks = pcard.getByRole('checkbox');
  await checks.nth(0).check(); await checks.nth(1).check();
  await pcard.getByRole('button', { name: '记录影子重放' }).click();
  await pcard.getByRole('button', { name: '人批发布' }).waitFor({ timeout: 15000 });
  await pcard.getByRole('button', { name: '人批发布' }).click();
  await pcard.getByRole('button', { name: /确认发布/ }).click();
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
  log(`运行时：judge=llm 真实调用 ${CLI} CLI`, runtime.ok && runtime.body.judge_kind === 'llm_judge',
      `pass_rate=${runtime.body.pass_rate} kind=${runtime.body.judge_kind}`);

  await browser.close();
  const failed = results.filter(r => !r.ok);
  console.log(`\nSUMMARY ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('E2E ERROR:', e.message); process.exit(2); });
