import { test } from "node:test";
import assert from "node:assert/strict";
import { restoreCart, saveCart } from "./cartSession.js";

const products = [{ id: 1, name: "Pau", price: 4.99, originalPrice: 5.99 }];
function memoryStorage(initial) {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key, next) => { value = next; },
    removeItem: () => { value = null; },
  };
}

test("refresh restores quantities with current catalog prices and unknown stock", () => {
  const storage = memoryStorage();
  saveCart([{ id: 1, quantity: 3, price: 0.01, stock: 100 }], storage);
  assert.deepEqual(JSON.parse(storage.getItem()), [{ id: 1, quantity: 3 }]);
  assert.deepEqual(restoreCart(products, storage), [{ ...products[0], quantity: 3, stock: null }]);
});

test("quantity updates persist and clearing checkout removes saved cart", () => {
  const storage = memoryStorage();
  saveCart([{ id: 1, quantity: 2 }], storage);
  saveCart([{ id: 1, quantity: 1 }], storage);
  assert.equal(restoreCart(products, storage)[0].quantity, 1);
  saveCart([], storage);
  assert.equal(storage.getItem(), null);
  assert.deepEqual(restoreCart(products, storage), []);
  assert.deepEqual(restoreCart(products, memoryStorage()), []);
});

test("malformed storage, unknown products, duplicates and invalid quantities are ignored", () => {
  for (const value of ["broken", "null", "{}"]) {
    assert.deepEqual(restoreCart(products, memoryStorage(value)), []);
  }
  const saved = [null, { id: 99, quantity: 1 }, { id: 1, quantity: -1 }, { id: 1, quantity: 1.5 }, { id: 1, quantity: 2 }, { id: 1, quantity: 3 }];
  assert.equal(restoreCart(products, memoryStorage(JSON.stringify(saved))).length, 1);
});

test("storage failures do not prevent shopping", () => {
  const storage = {
    getItem() { throw new Error("Blocked"); },
    setItem() { throw new Error("Full"); },
    removeItem() { throw new Error("Blocked"); },
  };
  assert.deepEqual(restoreCart(products, storage), []);
  assert.doesNotThrow(() => saveCart([{ id: 1, quantity: 1 }], storage));
  assert.doesNotThrow(() => saveCart([], storage));
});
