/**
 * 知识库四节的口径常量（原型 6.9 `knowledge.html`）。
 *
 * 为什么与组件分开：§0 权限矩阵与 §1/§2/§3 的判定句是**产品口径**，不是后端数据。
 * 集中在一处的好处是：用例断言打的是同一份文案；将来后端补了端点，改的也只是
 * 「这段口径改成读接口」这一处，不会散落在 4 个 JSX 里各改一遍。
 *
 * ⚠️ 这些常量是「设计口径」，不是「后端返回的授权数据」：
 * 目前没有权限矩阵端点（没有 `/api/knowledge/permissions`），页面必须把自己标成
 * 「口径」而不是「真实授权状态」，否则就等于伪造权限。
 */

// ── §0 权限矩阵 ───────────────────────────────────────────────────

export interface MatrixRow {
  layer: string;
  hint: string;
  /** 全体用户 / 全体 Agent */
  everyone: string;
  /** 空间成员（用户 · Agent） */
  member: string;
  /** 平台管理员 */
  admin: string;
  writePath: string;
}

export const PERMISSION_MATRIX: MatrixRow[] = [
  {
    layer: '公共知识',
    hint: '全局可用 · 只读',
    everyone: '✓ 可读（检索默认命中）',
    member: '✓ 可读',
    admin: '✓ 维护（写）',
    writePath:
      '仅由记忆层 L3 核心记忆过晋升评审门（必人批 · 公共需平台管理员二审）与管理员录入产生；任何项目 / Agent 不能直接写',
  },
  {
    layer: '知识空间',
    hint: '与项目 1:1',
    everyone: '✗ 非成员不可见（列表隐藏 · 越权统一 404）',
    member: '✓ 读 · ✓ 写（项目自身亦可读写）',
    admin: '✓ 读（审计可见，写入需先入空间）',
    writePath: '成员手工编辑 + 项目自身读写 + 记忆层 L3 核心记忆过晋升评审门成为本空间知识',
  },
  {
    layer: '跨空间引用',
    hint: '关联知识库',
    everyone: '✗',
    member: '✓ 只读引用',
    admin: '✓ 只读引用',
    writePath: '不可写：被关联空间持只读快照，源空间更新走增量同步',
  },
  {
    layer: '外部源',
    hint: 'Confluence / Notion / GitHub…',
    everyone: '✗',
    member: '✓ 关联进空间后只读',
    admin: '✓ 授权与凭据维护',
    writePath: '写回由源自身系统负责；平台侧只同步索引（冻结源不再增量）',
  },
];

/** §0 两条判定句（原型里就在表下，一字不改地留着）。 */
export const SPACE_PROJECT_1TO1 =
  '空间与项目一一对应 —— 建项目即建空间，删项目即解除登记（内容留快照），不存在「一个项目多空间」或共享写空间。';

export const NOT_FOUND_SAME_CODE =
  '越权与「资源不存在」统一返回 404 —— 非成员既看不到行，也无法用状态码探测空间是否存在。';

export const MATRIX_UNWIRED =
  '本矩阵是产品口径（来自 PRODUCT-DESIGN / 原型），不是后端返回的授权数据：没有权限矩阵端点，' +
  '页面上每个按钮的真实可用性以后端 403/404 为准（越权与不存在同码 404）。';

// ── §1 公共知识 ───────────────────────────────────────────────────

export interface PublicCategory {
  name: string;
  readScope: string;
  maintainer: string;
  tags: string;
  note: string;
}

/** 公共知识四分类：全局只读、平台管理员维护。表里没有文档行 —— 后端无公共知识端点，不摆示例文档。 */
export const PUBLIC_CATEGORIES: PublicCategory[] = [
  { name: '公司规范', readScope: '全体项目与全体 Agent', maintainer: '平台管理员', tags: '规范 · 必读', note: '全员必读' },
  { name: 'API 契约', readScope: '全体项目与全体 Agent', maintainer: '平台管理员', tags: '接口', note: '跨项目通用接口约定' },
  { name: '安全基线', readScope: '全体项目与全体 Agent（含个人 Agent）', maintainer: '平台管理员', tags: '安全 · 必读', note: '破坏性操作与凭据纪律' },
  { name: '入职引导', readScope: '全体用户 · 新成员首登推荐', maintainer: '平台管理员', tags: '入门', note: '新人首周阅读路径' },
];

export const PUBLIC_READONLY_NOTE =
  '公共知识全局可用、只读：所有项目与所有 Agent 可读，只有平台管理员维护；' +
  '写不进去是设计而不是缺能 —— 公共知识没有「编辑 / 重建索引 / 删除」行操作。';

export const PUBLIC_UNWIRED =
  '公共知识后端未接入（没有公共知识表 / 端点）：本页只列四分类口径与写入路径，不摆示例文档行；' +
  '「申请晋升」的评审门（必人批 · 公共需平台管理员二审）亦未接入。';

// ── §2 知识空间 ───────────────────────────────────────────────────

/** §2 核心口径一句话（原型「非成员不可见（越权统一 404）」）。 */
export const SPACE_UNVISIBILITY_WORDING = '非成员不可见：列表隐藏，越权访问与不存在同码 404';

export const SPACE_MEMBER_NOTE =
  '空间成员含用户与 Agent 两类：Agent 作为成员即可读写（run 结束自动写记忆层 L1 原子记忆属同一权限）；' +
  '个人 Agent 与用户 1:1，故其写权限等同该用户。加人 = 加空间成员 = 加项目成员，三处同一份台账。';

export const SPACE_VISIBILITY_NOTE =
  '可见性：非成员不是「置灰」，是整行消失；越权访问与不存在同码 404。';

export const SPACE_UNWIRED =
  '知识空间后端未接入（没有 spaces / space_members / space_docs 表与端点）：' +
  '本页用**真实项目列表**做「空间 ↔ 项目 1:1」的归属映射，成员、文档数与最近写入不伪造，一律标未接入。';

// ── §3 外部源 ─────────────────────────────────────────────────────

export const EXTERNAL_READONLY_NOTE =
  '关联进空间后只读：外部源被关联进哪个空间，就只有那个空间的成员能读到那份只读快照；' +
  '源级授权（谁能测连接 / 谁维护凭据）由源自身系统与平台管理员决定，写回由源系统负责，平台侧只同步索引。';

export const CREDENTIAL_WRITE_ONLY_NOTE =
  '凭据只写不读：凭据提交后即密文保存，界面无回显（读取方向只在「写入时的提交」这一侧）。';

export const CREDENTIAL_GAP_NOTE =
  '缺口：后端 `KnowledgeSource.to_dict(mask_secrets=True)` 只对 password / api_key 两键回显 ***，' +
  '其他自定义键仍会原样返回 —— 「凭据只写不读」尚未在全字段上成立。本页因此不渲染 config_json，' +
  '等后端全字段打码后才算完整口径。';

export const EXTERNAL_UNLINKED_NOTE =
  '未关联任何空间时对普通成员不可见（列表隐藏 · 越权统一 404）—— 本页当前按「Agent 绑定关系」列出源，' +
  '空间关联表尚未接入，所以「哪些普通成员看不到」这一层还判不了。';

export const EXTERNAL_UNWIRED =
  '外部源的空间关联与源级授权后端未接入：本页只能列出该 Agent 已绑定的资料源（真实端点），' +
  '「关联到空间 / 关联进空间后只读」两列如实标未接入，不造假关联关系。';
