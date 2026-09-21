"""Quick import test."""
import sys
sys.path.insert(0, '.')
from routes.agent_knowledge_api import _sanitize_filename, _extract_text, _chunk_text
print('Import OK')

# Test sanitize (path traversal → basename only)
assert _sanitize_filename('../../../etc/passwd') == 'passwd', _sanitize_filename('../../../etc/passwd')
assert _sanitize_filename('normal.txt') == 'normal.txt'
assert _sanitize_filename('/absolute/path/file.py') == 'file.py'
assert _sanitize_filename('test file!.js') == 'test_file_.js'
print('Sanitize OK')

# Test chunk
text = "段1\n\n段2\n\n段3"
chunks = _chunk_text(text, "test.txt")
print(f'Chunks: {len(chunks)}')
for k, v in chunks:
    print(f'  {k}: {len(v)} chars')

# Test with larger text
big = "A" * 2500
chunks2 = _chunk_text(big, "big.txt")
print(f'Big text chunks: {len(chunks2)}')
for k, v in chunks2:
    print(f'  {k}: {len(v)} chars')

print('All tests passed!')
