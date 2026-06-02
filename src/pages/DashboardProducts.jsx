import { Edit3, PackagePlus, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import DashboardLayout from '../components/DashboardLayout';
import EmptyState from '../components/EmptyState';
import ImageUploadField from '../components/ImageUploadField';
import LoadingButton from '../components/LoadingButton';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Modal from '../components/Modal';
import RetryState from '../components/RetryState';
import { useAppSettings } from '../hooks/useAppSettings';
import { useShop } from '../hooks/useShop';
import { useProducts } from '../hooks/useProducts';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';

const emptyProduct = {
  name: '',
  category: '',
  price: '',
  stock_quantity: '',
  sales_volume: 0,
  image_url: '',
};

export default function DashboardProducts() {
  const { settings } = useAppSettings();
  const { shop, loading: shopLoading } = useShop();
  const { products, categories, category, loading: productsLoading, error, setCategory, refetch, addProduct, editProduct, deleteProduct, updateStock } = useProducts(shop?.id);
  const loading = shopLoading || productsLoading;
  const [modalMode, setModalMode] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [stockValue, setStockValue] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingStock, setSavingStock] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState(null);
  const [imageError, setImageError] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const threshold = settings?.low_stock_threshold ?? 10;

  const visibleCategories = useMemo(() => categories.length > 1 ? categories : ['All'], [categories]);

  function openProductModal(product = null) {
    setSelectedProduct(product);
    setForm(product || emptyProduct);
    setImageError('');
    setImagePreview(product?.image_url || '');
    setModalMode('product');
  }

  function openStockModal(product) {
    setSelectedProduct(product);
    setStockValue(product.stock_quantity);
    setModalMode('stock');
  }

  async function handleSaveProduct(event) {
    event.preventDefault();
    if (uploadingImage) {
      toast.error('Please wait until image upload completes.');
      return;
    }
    if (savingProduct) return;
    const payload = {
      ...form,
      price: Number(form.price),
      stock_quantity: Number(form.stock_quantity),
      sales_volume: Number(form.sales_volume || 0),
      image_url: form.image_url || null,
    };

    setSavingProduct(true);
    try {
      if (selectedProduct) {
        await editProduct(selectedProduct.id, payload);
        toast.success('Product updated');
      } else {
        await addProduct(payload);
        toast.success('Product added');
      }
      setModalMode(null);
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setSavingProduct(false);
    }
  }

  function createImagePath(file) {
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
    return `${shop.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  }

  async function handleImageFileSelect(file, validationError) {
    if (validationError) {
      setImageError(validationError);
      return;
    }
    if (!file) return;
    if (!shop?.id) {
      setImageError('Shop is not loaded. Please refresh and try again.');
      return;
    }

    setUploadingImage(true);
    setImageError('');
    try {
      const filePath = createImagePath(file);
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
      const imageUrl = publicUrlData?.publicUrl || '';
      setForm((current) => ({ ...current, image_url: imageUrl }));
      setImagePreview(imageUrl);
    } catch (caughtError) {
      setImageError(caughtError.message || 'Image upload failed. Try again.');
    } finally {
      setUploadingImage(false);
    }
  }

  function handleRemoveImage() {
    setImageError('');
    setImagePreview('');
    setForm((current) => ({ ...current, image_url: '' }));
  }

  async function handleDeleteProduct() {
    const productId = pendingDeleteProduct?.id;
    if (!productId) return;
    if (deletingProductId) return;
    setDeletingProductId(productId);
    try {
      await deleteProduct(productId);
      toast.success('Product deleted');
      setPendingDeleteProduct(null);
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setDeletingProductId(null);
    }
  }

  async function handleSaveStock(event) {
    event.preventDefault();
    if (savingStock) return;
    setSavingStock(true);
    try {
      await updateStock(selectedProduct.id, stockValue);
      toast.success('Stock updated');
      setModalMode(null);
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setSavingStock(false);
    }
  }

  return (
    <DashboardLayout
      title="Products"
      actions={(
        <button className="btn-primary" onClick={() => openProductModal()}>
          <PackagePlus className="h-4 w-4" aria-hidden="true" />
          Add product
        </button>
      )}
    >
      <div className="space-y-4">
        <div className="card flex flex-wrap gap-2 p-4">
          {visibleCategories.map((item) => (
            <button key={item} className={item === category ? 'btn-primary' : 'btn-secondary'} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>

        {error ? <RetryState message={error.message} onRetry={refetch} /> : null}
        {loading ? (
          <LoadingSkeleton rows={8} />
        ) : products.length === 0 ? (
          <EmptyState title="No products found" message="Add a product or adjust the category filter." />
        ) : (
          <section className="card overflow-hidden">
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:hidden">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} currency={settings?.currency || 'LKR'} threshold={threshold} deleting={deletingProductId === product.id} onEdit={openProductModal} onStock={openStockModal} onDelete={setPendingDeleteProduct} />
              ))}
            </div>
            <div className="hidden overflow-x-auto xl:block">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead>
                  <tr>
                    <th className="table-th">Product</th>
                    <th className="table-th">Category</th>
                    <th className="table-th">Price</th>
                    <th className="table-th">Stock</th>
                    <th className="table-th">Sold</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {products.map((product) => (
                    <tr key={product.id} className={product.stock_quantity <= threshold ? 'bg-rose-50/70 dark:bg-rose-500/10' : ''}>
                      <td className="table-td font-medium">{product.name}</td>
                      <td className="table-td">{product.category}</td>
                      <td className="table-td">{formatCurrency(product.price, settings?.currency || 'LKR')}</td>
                      <td className="table-td">{product.stock_quantity}</td>
                      <td className="table-td">{product.sales_volume}</td>
                      <td className="table-td">
                        <div className="flex gap-2">
                          <button className="btn-secondary px-3" onClick={() => openProductModal(product)}><Edit3 className="h-4 w-4" aria-hidden="true" /></button>
                          <button className="btn-secondary px-3" onClick={() => openStockModal(product)}>Stock</button>
                          <button className="rounded-md p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-500/10" disabled={deletingProductId === product.id} onClick={() => setPendingDeleteProduct(product)} aria-label="Delete product">
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
      </div>

      <Modal
        title={selectedProduct ? 'Edit product' : 'Add product'}
        open={modalMode === 'product'}
        onClose={() => setModalMode(null)}
        footer={(
          <LoadingButton
            className="btn-primary w-full"
            type="submit"
            form="product-form"
            disabled={uploadingImage}
            loading={savingProduct}
            loadingText="Saving..."
            icon={Save}
          >
            Save product
          </LoadingButton>
        )}
      >
        <form id="product-form" onSubmit={handleSaveProduct} className="grid gap-4">
          <label className="block">
            <span className="label">Name</span>
            <input className="input mt-1" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Category</span>
            <input className="input mt-1" required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Price</span>
              <input className="input mt-1" required type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
            </label>
            <label className="block">
              <span className="label">Stock</span>
              <input className="input mt-1" required type="number" min="0" value={form.stock_quantity} onChange={(event) => setForm({ ...form, stock_quantity: event.target.value })} />
            </label>
          </div>
          <div className="block">
            <span className="label">Product image</span>
            <div className="mt-1">
              <ImageUploadField
                value={form.image_url}
                previewUrl={imagePreview}
                uploading={uploadingImage}
                error={imageError}
                onFileSelect={handleImageFileSelect}
                onRemove={handleRemoveImage}
              />
            </div>
          </div>
        </form>
      </Modal>

      <Modal title="Edit stock" open={modalMode === 'stock'} onClose={() => setModalMode(null)}>
        <form onSubmit={handleSaveStock} className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">{selectedProduct?.name}</p>
          <label className="block">
            <span className="label">Stock quantity</span>
            <input className="input mt-1" type="number" min="0" value={stockValue} onChange={(event) => setStockValue(event.target.value)} />
          </label>
          <LoadingButton className="btn-primary" type="submit" loading={savingStock} loadingText="Updating...">Update stock</LoadingButton>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDeleteProduct)}
        title="Delete product"
        message={`Delete "${pendingDeleteProduct?.name}"? This removes it from your product list.`}
        confirmText="Delete product"
        loading={Boolean(deletingProductId)}
        onCancel={() => setPendingDeleteProduct(null)}
        onConfirm={handleDeleteProduct}
      />
    </DashboardLayout>
  );
}

function ProductCard({ product, currency, threshold, deleting, onEdit, onStock, onDelete }) {
  return (
    <div className={`rounded-md border p-4 ${product.stock_quantity <= threshold ? 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-500/10' : 'border-slate-200 dark:border-slate-800'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{product.name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{product.category}</p>
        </div>
        <span className="text-sm font-semibold">{formatCurrency(product.price, currency)}</span>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span>Stock: {product.stock_quantity}</span>
        <span>Sold: {product.sales_volume}</span>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => onEdit(product)}>Edit</button>
        <button className="btn-secondary flex-1" onClick={() => onStock(product)}>Stock</button>
        <button className="rounded-md p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-500/10" disabled={deleting} onClick={() => onDelete(product)} aria-label="Delete product">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
