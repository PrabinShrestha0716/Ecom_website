const CART_KEY = "rangila_cart_v1";

export function restoreCart(products, storage) {
  try {
    storage ??= window.sessionStorage;
    const saved = JSON.parse(storage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    const seen = new Set();
    return saved.flatMap((item) => {
      const product = products.find((entry) => entry.id === item?.id);
      if (!product || seen.has(product.id) || !Number.isSafeInteger(item.quantity) || item.quantity < 1) return [];
      seen.add(product.id);
      return [{ ...product, quantity: item.quantity, stock: null }];
    });
  } catch {
    return [];
  }
}

export function saveCart(cart, storage) {
  try {
    storage ??= window.sessionStorage;
    if (cart.length === 0) {
      storage.removeItem(CART_KEY);
    } else {
      storage.setItem(CART_KEY, JSON.stringify(cart.map(({ id, quantity }) => ({ id, quantity }))));
    }
  } catch {
    // Shopping still works when browser storage is unavailable or full.
  }
}
