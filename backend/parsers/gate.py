"""Gate 投票记录解析器."""
import re


def parse_gates(content: str) -> list[dict]:
    """解析 🗳️ 投票记录块."""
    gates = []
    # 找到所有 🗳️ 块（从 🗳️ 到下一个 ## 或文件结尾）
    blocks = re.findall(r'🗳️\s*(.+?)(?=\n(?:---|\n)##|\Z)', content, re.DOTALL)
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 2:
            continue
        # 第一行: Gate名: 问题
        first_line = lines[0].strip()
        if ':' in first_line:
            gate_name, _, question = first_line.partition(':')
            gate_name = gate_name.strip()
            question = question.strip()
        else:
            gate_name = first_line
            question = ''
        votes = []
        result = ''
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue
            # 结果行
            if line.startswith('结果') or '结果' in line:
                result = line
                continue
            # 投票行: 🟫 角色名: ✅/❌/⚪ 理由
            m = re.match(r'\s*(🟫|🟦|🟩|🔴)\s*(.+?)[:：]\s*(✅|❌|⚪|⚠️)\s*(.*)', line)
            if m:
                votes.append({
                    'role': m.group(2).strip(),
                    'vote': m.group(3).strip(),
                    'reason': m.group(4).strip() if m.group(4) else '',
                })
        if votes:
            gates.append({
                'name': gate_name,
                'question': question,
                'votes': votes,
                'result': result or 'pending',
            })
    return gates
