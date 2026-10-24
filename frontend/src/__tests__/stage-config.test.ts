import { describe, it, expect } from 'vitest';
import { DEFAULT_STAGES, normalizeStages } from '../stores/stageConfig';

describe('stageConfig.normalizeStages', () => {
  it('按 order 排序并把 id 映射到产物文件', () => {
    const out = normalizeStages([
      { id: '2-design', name: '技术设计', order: 2 },
      { id: '0-change', name: '变更提案', order: 0 },
    ]);
    expect(out.map((s) => s.id)).toEqual(['0-change', '2-design']);
    expect(out[0].file).toBe('CHANGE.md');
    expect(out[1].name).toBe('技术设计');
  });

  it('自定义阶段没有固定产物 → file 为 null（不猜文件名）', () => {
    const out = normalizeStages([{ id: '8-custom', name: '自定义', order: 8 }]);
    expect(out[0].file).toBeNull();
  });

  it('name 缺失时回退 id', () => {
    const out = normalizeStages([{ id: '9-x', order: 9 }]);
    expect(out[0].name).toBe('9-x');
  });

  it('非法输入响亮失败（空/非数组/缺 id/重复 id）', () => {
    expect(() => normalizeStages([])).toThrow();
    expect(() => normalizeStages('nope')).toThrow();
    expect(() => normalizeStages([{ name: '无 id' }])).toThrow();
    expect(() => normalizeStages([{ id: 'a' }, { id: 'a' }])).toThrow();
  });

  it('默认表是后端默认工作流的镜像（9 阶段，顺序固定）', () => {
    expect(DEFAULT_STAGES.map((s) => s.id)).toEqual([
      '0-change', '1-requirement', '2-design', '2a-ui-design', '3-task',
      '4-dev', '5-test', '6-review', '7-integration',
    ]);
    expect(DEFAULT_STAGES.filter((s) => s.file).length).toBe(7);
  });
});
