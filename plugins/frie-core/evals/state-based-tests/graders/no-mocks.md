---
type: regex
pattern: '(Mock\b|MagicMock|mocker|monkeypatch|patch\(|assert_called|call_count|call_args)'
match: not_contains
weight: 3
target:
  source: file
  path: test_inventory.py
---
