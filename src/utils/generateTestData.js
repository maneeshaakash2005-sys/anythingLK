/**
 * Test Data Generation Script for OrderBase Reports
 * 
 * This script generates sample data for testing the Reports page.
 * Only creates data if none exists for the shop.
 * 
 * Usage: Call generateTestData(shopId, supabase) from your admin panel or CLI
 */

export async function generateTestData(shopId, supabase) {
  if (!shopId) {
    console.error('Shop ID is required');
    return false;
  }

  try {
    // Check if data already exists
    const { count: existingOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('shop_id', shopId);

    if (existingOrders && existingOrders > 0) {
      console.log('Test data already exists for this shop. Skipping generation.');
      return false;
    }

    // Fetch existing shop products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('shop_id', shopId)
      .limit(10);

    if (productsError || !products || products.length === 0) {
      console.error('No products found. Create products first.');
      return false;
    }

    // Get or create a test customer
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id')
      .eq('shop_id', shopId)
      .limit(1);

    let customerId;
    if (customers && customers.length > 0) {
      customerId = customers[0].id;
    } else {
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          shop_id: shopId,
          name: 'Test Customer',
          email: 'test@orderbase.local',
          phone: '+94701234567',
          join_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !newCustomer) {
        console.error('Failed to create test customer');
        return false;
      }
      customerId = newCustomer.id;
    }

    const statuses = ['Pending', 'Paid', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
    const orderData = [];
    const currentDate = new Date();

    // Generate 15 completed orders, 5 pending, 3 cancelled
    for (let i = 0; i < 23; i++) {
      let status;
      let paymentStatus = 'unpaid';

      if (i < 15) {
        status = statuses[Math.floor(Math.random() * (statuses.length - 1))]; // Exclude Cancelled
        paymentStatus = ['Paid', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'].includes(status) ? 'paid' : 'pending';
      } else if (i < 20) {
        status = 'Pending';
        paymentStatus = 'unpaid';
      } else {
        status = 'Cancelled';
        paymentStatus = 'unpaid';
      }

      const orderDate = new Date(currentDate);
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30));

      const selectedProducts = products.slice(0, Math.floor(Math.random() * 3) + 1);
      const totalAmount = selectedProducts.reduce((sum, p) => sum + Number(p.price || 0), 0);

      orderData.push({
        shop_id: shopId,
        customer_id: customerId,
        customer_name: 'Test Customer',
        customer_email: 'test@orderbase.local',
        customer_phone: '+94701234567',
        order_number: `ORD-${Date.now()}-${i}`,
        status,
        payment_status: paymentStatus,
        payment_method: i % 3 === 0 ? 'bank_transfer' : i % 3 === 1 ? 'card_payment' : 'cash_on_delivery',
        total_amount: totalAmount,
        delivery_address: '123 Test Street, Colombo',
        notes: `Test order ${i + 1}`,
        order_date: orderDate.toISOString(),
        created_at: orderDate.toISOString(),
      });
    }

    // Insert orders
    const { error: insertError } = await supabase.from('orders').insert(orderData);

    if (insertError) {
      console.error('Failed to insert test orders:', insertError);
      return false;
    }

    console.log(`Generated ${orderData.length} test orders successfully`);
    return true;
  } catch (error) {
    console.error('Error generating test data:', error);
    return false;
  }
}
