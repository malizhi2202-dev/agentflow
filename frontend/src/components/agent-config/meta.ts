/**
 * Agent 详情 config · 十六分区元信息（change: ui-parity · P3-2）
 *
 * 为什么单独一份：页首「分区直达」锚点条、各分区标题、验收用例三处都必须与原型
 * `.specs/product-design/prototype/agent-detail__config.html` 的 `sec1…sec16` + `sec-im`
 * 一一对应；写三份必然漂移，所以分区编号 / 锚点 id / 标题只活在这里。
 *
 * 锚点 id 直接沿用原型的 `secN`，好处是原型里的深链（`agent-detail__config.html#sec6`）
 * 换成实现页后仍然可用，排查时两边指的是同一个分区。
 */
export interface SectionMeta {
  /** 锚点 id，与原型 `id="secN"` 一致（可直接深链 #sec6） */
  id: string;
  no: number;
  /** 分区标题；渲染成 `<no> · <title>`，与原型逐字一致 */
  title: string;
}

export const SECTIONS: SectionMeta[] = [
  { id: 'sec1', no: 1, title: '标识' },
  { id: 'sec2', no: 2, title: '域归属' },
  { id: 'sec3', no: 3, title: '指令与开场白' },
  { id: 'sec4', no: 4, title: '运行时与模型' },
  { id: 'sec5', no: 5, title: '执行设置' },
  { id: 'sec6', no: 6, title: '环境变量' },
  { id: 'sec7', no: 7, title: 'CLI 自定义参数' },
  { id: 'sec8', no: 8, title: 'MCP 服务绑定' },
  { id: 'sec9', no: 9, title: '对外集成' },
  { id: 'sec10', no: 10, title: '技能' },
  { id: 'sec11', no: 11, title: '知识源' },
  { id: 'sec12', no: 12, title: '编排引用' },
  { id: 'sec13', no: 13, title: 'Access' },
  { id: 'sec14', no: 14, title: '闸门' },
  { id: 'sec15', no: 15, title: '健康与探活' },
  { id: 'sec16', no: 16, title: '危险区' },
];

/**
 * 原型的第 17 个锚点：`sec-im`（9A · 集成（IM 通道））。
 *
 * 为什么并进 9 区而不是单列一条链接：IM 通道卡在实现侧就是既有的 `ChannelConfig`
 * （通道 × Agent 唯一 bot、密钥写-only 都在组件里），它就是「对外集成」的一部分；
 * 硬拆成第 17 条直达链接会让锚点条看起来有 17 个分区。这里保留原型编号做对照说明。
 */
export const IM_ANCHOR_NOTE =
  '9A = 集成（IM 通道）：原型是独立锚点 sec-im，本页并入「9 对外集成」内部，不另占直达链接（共 16 条 + 1 条说明）。';
