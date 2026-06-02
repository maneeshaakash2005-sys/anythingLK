import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useProducts(shopId) {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    if (!shopId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('products').select('*').eq('shop_id', shopId).order('created_at', { ascending: false });

      if (category !== 'All') {
        query = query.eq('category', category);
      }

      const { data, error: productsError } = await query;
      if (productsError) throw productsError;
      setProducts(data || []);
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      setLoading(false);
    }
  }, [category, shopId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((product) => product.category))).sort();
    return ['All', ...unique];
  }, [products]);

  const addProduct = useCallback(async (payload) => {
    if (!shopId) throw new Error('No shop loaded');
    const { data, error: addError } = await supabase
      .from('products')
      .insert({ ...payload, shop_id: shopId })
      .select()
      .single();
    if (addError) throw addError;
    await fetchProducts();
    return data;
  }, [fetchProducts, shopId]);

  const editProduct = useCallback(async (id, payload) => {
    if (!shopId) throw new Error('No shop loaded');
    const { data, error: editError } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .eq('shop_id', shopId)
      .select()
      .single();
    if (editError) throw editError;
    setProducts((current) => current.map((product) => (product.id === id ? data : product)));
    return data;
  }, [shopId]);

  const deleteProduct = useCallback(async (id) => {
    if (!shopId) throw new Error('No shop loaded');
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('shop_id', shopId);
    if (deleteError) throw deleteError;
    setProducts((current) => current.filter((product) => product.id !== id));
  }, [shopId]);

  const updateStock = useCallback(async (id, stockQuantity) => {
    if (!shopId) throw new Error('No shop loaded');
    const { data, error: stockError } = await supabase
      .from('products')
      .update({ stock_quantity: Number(stockQuantity) })
      .eq('id', id)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (stockError) throw stockError;
    setProducts((current) => current.map((product) => (product.id === id ? data : product)));
    return data;
  }, [shopId]);

  return {
    products,
    categories,
    category,
    loading,
    error,
    setCategory,
    refetch: fetchProducts,
    addProduct,
    editProduct,
    deleteProduct,
    updateStock,
  };
}
