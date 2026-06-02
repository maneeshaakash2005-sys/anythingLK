import { formatCurrency } from '../../utils/format';

export default function OrderSummary({ lines, total, currency = 'LKR' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-semibold">Order summary</h2>
      <div className="mt-4 space-y-3">
        {lines.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Select products to build your order.</p>
        ) : lines.map((line) => (
          <div key={line.product_id} className="flex items-center justify-between gap-3 text-sm">
            <span>{line.product.name} x {line.quantity}</span>
            <span className="font-medium">{formatCurrency(line.lineTotal, currency)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
        <span className="font-semibold">Total</span>
        <span className="text-lg font-semibold">{formatCurrency(total, currency)}</span>
      </div>
    </div>
  );
}
