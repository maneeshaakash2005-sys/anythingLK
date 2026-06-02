export default function CustomerDetailsForm({ value, onChange, enabledFields }) {
  const fields = enabledFields || {};
  const minDeliveryDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  function update(field, nextValue) {
    onChange({ ...value, [field]: nextValue });
  }

  return (
    <div className="grid gap-4">
      <label className="block">
        <span className="label">Customer name</span>
        <input className="input mt-1" required value={value.name} onChange={(event) => update('name', event.target.value)} />
      </label>
      <label className="block">
        <span className="label">Phone</span>
        <input className="input mt-1" required value={value.phone} onChange={(event) => update('phone', event.target.value)} />
      </label>
      {fields.address !== false ? (
        <label className="block">
          <span className="label">Delivery address</span>
          <textarea className="input mt-1 min-h-24" required value={value.address} onChange={(event) => update('address', event.target.value)} />
        </label>
      ) : null}
      {fields.delivery_date !== false ? (
        <label className="block">
          <span className="label">Delivery date</span>
          <input className="input mt-1" type="date" min={minDeliveryDate} value={value.delivery_date} onChange={(event) => update('delivery_date', event.target.value)} />
        </label>
      ) : null}
      {fields.notes !== false ? (
        <label className="block">
          <span className="label">Notes</span>
          <textarea className="input mt-1 min-h-20" value={value.notes} onChange={(event) => update('notes', event.target.value)} />
        </label>
      ) : null}
    </div>
  );
}
