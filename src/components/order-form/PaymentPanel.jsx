import { useMemo } from 'react';
import ImageUploadField from '../ImageUploadField';
import { formatCurrency } from '../../utils/format';

export default function PaymentPanel({ settings, bankAccounts, paymentMethod, onPaymentMethodChange, paymentSlip, onPaymentSlipChange, total, currency = 'LKR' }) {
  const canUseCash = settings?.cash_on_delivery_enabled !== false;
  const canUseBank = settings?.bank_transfer_enabled !== false;
  const maxFileSize = 8 * 1024 * 1024;
  const slipPreview = useMemo(() => (paymentSlip && paymentSlip.type !== 'application/pdf' ? URL.createObjectURL(paymentSlip) : paymentSlip?.name || ''), [paymentSlip]);

  function handleSlipFileChange(file) {
    if (!file) {
      onPaymentSlipChange(null);
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      onPaymentSlipChange(null, 'Unsupported file type. Use JPG, PNG, WEBP, or PDF.');
      return;
    }
    if (file.size > maxFileSize) {
      onPaymentSlipChange(null, 'Payment slip must be 8MB or smaller.');
      return;
    }
    onPaymentSlipChange(file, null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">Total amount</p>
        <p className="text-2xl font-semibold">{formatCurrency(total, currency)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {canUseCash ? (
          <label className={`rounded-md border p-4 ${paymentMethod === 'cash_on_delivery' ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 dark:border-slate-800'}`}>
            <input className="mr-2" type="radio" name="payment" value="cash_on_delivery" checked={paymentMethod === 'cash_on_delivery'} onChange={(event) => onPaymentMethodChange(event.target.value)} />
            Cash on delivery
          </label>
        ) : null}
        {canUseBank ? (
          <label className={`rounded-md border p-4 ${paymentMethod === 'bank_transfer' ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 dark:border-slate-800'}`}>
            <input className="mr-2" type="radio" name="payment" value="bank_transfer" checked={paymentMethod === 'bank_transfer'} onChange={(event) => onPaymentMethodChange(event.target.value)} />
            Bank transfer
          </label>
        ) : null}
      </div>

      {paymentMethod === 'bank_transfer' ? (
        <div className="space-y-3">
          {bankAccounts.map((account) => (
            <div key={account.id} className="rounded-md border border-slate-200 p-4 text-sm dark:border-slate-800">
              <p className="font-semibold">{account.bank_name}</p>
              <p>Account name: {account.account_name}</p>
              <p>Account number: {account.account_number}</p>
              {account.branch ? <p>Branch: {account.branch}</p> : null}
            </div>
          ))}
          <div>
            <span className="label">Payment slip {settings?.payment_slip_required ? '' : '(optional)'}</span>
            <div className="mt-1">
              <ImageUploadField
                value={paymentSlip?.name || ''}
                previewUrl={slipPreview}
                acceptedTypes={['image/jpeg', 'image/png', 'image/webp', 'application/pdf']}
                maxFileSize={maxFileSize}
                helperText="JPG, PNG, WEBP, PDF up to 8MB"
                onFileSelect={(file, errorMessage) => {
                  if (errorMessage) {
                    onPaymentSlipChange(null, errorMessage);
                    return;
                  }
                  handleSlipFileChange(file);
                }}
                onRemove={() => onPaymentSlipChange(null, null)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
