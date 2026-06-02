import { Minus, Plus } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

export default function ProductPicker({ products, cartItems, onChange, currency = 'LKR' }) {
  function quantityFor(productId) {
    return cartItems.find((item) => item.product_id === productId)?.quantity || 0;
  }

  function setQuantity(product, quantity) {
    const nextQuantity = Math.max(0, Math.min(Number(quantity || 0), Number(product.stock_quantity || 0)));
    const others = cartItems.filter((item) => item.product_id !== product.id);
    if (nextQuantity === 0) {
      onChange(others);
      return;
    }
    onChange([...others, { product_id: product.id, quantity: nextQuantity }]);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {products.map((product) => {
        const quantity = quantityFor(product.id);
        const soldOut = product.stock_quantity <= 0;
        return (
          <div key={product.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="mb-3 h-32 w-full rounded-md object-cover" />
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{product.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{product.category}</p>
              </div>
              <p className="text-sm font-semibold">{formatCurrency(product.price, currency)}</p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className={`text-xs ${soldOut ? 'text-rose-600' : 'text-slate-500 dark:text-slate-400'}`}>
                {soldOut ? 'Out of stock' : `${product.stock_quantity} available`}
              </span>
              <div className="flex items-center">
                <button type="button" className="btn-secondary rounded-r-none px-2" disabled={soldOut || quantity === 0} onClick={() => setQuantity(product, quantity - 1)} aria-label="Decrease quantity">
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <input className="input w-16 rounded-none text-center" type="number" min="0" max={product.stock_quantity} value={quantity} disabled={soldOut} onChange={(event) => setQuantity(product, event.target.value)} />
                <button type="button" className="btn-secondary rounded-l-none px-2" disabled={soldOut || quantity >= product.stock_quantity} onClick={() => setQuantity(product, quantity + 1)} aria-label="Increase quantity">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
