---
description: Tests use real collaborators or hand-written fakes and assert on state, never on mock interactions (7).
tags: [testing, code]
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill]
---

Save this module as `inventory.py`, then write pytest tests for `InventoryService` in `test_inventory.py`.

```python
from dataclasses import dataclass, replace
from typing import Protocol


@dataclass(frozen=True)
class StockItem:
    sku: str
    on_hand: int
    reserved: int


class StockRepository(Protocol):
    def get(self, sku: str) -> StockItem | None: ...

    def save(self, item: StockItem) -> None: ...


class InventoryService:
    def __init__(self, repository: StockRepository) -> None:
        self._repository = repository

    def reserve(self, sku: str, quantity: int) -> bool:
        item = self._repository.get(sku)
        if item is None or item.on_hand - item.reserved < quantity:
            return False
        self._repository.save(replace(item, reserved=item.reserved + quantity))
        return True
```
