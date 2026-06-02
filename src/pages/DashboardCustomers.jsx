import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import DashboardLayout from '../components/DashboardLayout';
import EmptyState from '../components/EmptyState';
import LoadingButton from '../components/LoadingButton';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Modal from '../components/Modal';
import RetryState from '../components/RetryState';
import { useAppSettings } from '../hooks/useAppSettings';
import { useShop } from '../hooks/useShop';
import { useCustomers } from '../hooks/useCustomers';
import { formatCurrency, formatDate } from '../utils/format';

const emptyCustomer = { name: '', email: '', status: 'active' };

export default function DashboardCustomers() {
  const { settings } = useAppSettings();
  const { shop, loading: shopLoading } = useShop();
  const { customers, loading: customersLoading, error, refetch, addCustomer, editCustomer, deleteCustomer } = useCustomers(shop?.id);
  const loading = shopLoading || customersLoading;
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [form, setForm] = useState(emptyCustomer);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDeleteCustomer, setPendingDeleteCustomer] = useState(null);

  function openModal(customer = null) {
    setSelectedCustomer(customer);
    setForm(customer || emptyCustomer);
    setModalOpen(true);
  }

  async function handleSave(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (selectedCustomer) {
        await editCustomer(selectedCustomer.id, form);
        toast.success('Customer updated');
      } else {
        await addCustomer(form);
        toast.success('Customer added');
      }
      setModalOpen(false);
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const id = pendingDeleteCustomer?.id;
    if (!id) return;
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteCustomer(id);
      toast.success('Customer deleted');
      setPendingDeleteCustomer(null);
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <DashboardLayout
      title="Customers"
      actions={(
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add customer
        </button>
      )}
    >
      {error ? <RetryState message={error.message} onRetry={refetch} /> : null}
      {loading ? (
        <LoadingSkeleton rows={8} />
      ) : customers.length === 0 ? (
        <EmptyState title="No customers found" />
      ) : (
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead>
                <tr>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Joined</th>
                  <th className="table-th">Orders</th>
                  <th className="table-th">Total spent</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="table-td">
                      <Link className="font-medium text-brand-700 dark:text-brand-100" to={`/dashboard/customers/${customer.id}`}>{customer.name}</Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{customer.email}</p>
                    </td>
                    <td className="table-td">{formatDate(customer.join_date)}</td>
                    <td className="table-td">{customer.order_count}</td>
                    <td className="table-td">{formatCurrency(customer.calculated_total_spent || customer.total_spent, settings?.currency || 'LKR')}</td>
                    <td className="table-td">{customer.status}</td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        <button className="btn-secondary px-3" onClick={() => openModal(customer)}>Edit</button>
                        <button className="rounded-md p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-500/10" disabled={deletingId === customer.id} onClick={() => setPendingDeleteCustomer(customer)} aria-label="Delete customer">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Modal title={selectedCustomer ? 'Edit customer' : 'Add customer'} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="label">Name</span>
            <input className="input mt-1" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Email</span>
            <input className="input mt-1" required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Status</span>
            <select className="input mt-1" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>
          <LoadingButton className="btn-primary" type="submit" loading={saving} loadingText="Saving...">Save customer</LoadingButton>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDeleteCustomer)}
        title="Delete customer"
        message={`Delete "${pendingDeleteCustomer?.name}"? Their customer profile will be removed.`}
        confirmText="Delete customer"
        loading={Boolean(deletingId)}
        onCancel={() => setPendingDeleteCustomer(null)}
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  );
}
