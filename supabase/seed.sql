insert into public.products (name, category, price, stock_quantity, sales_volume, image_url, created_at) values
('Ceylon Black Tea 500g', 'Beverages', 1850.00, 42, 96, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=600&q=80', now() - interval '60 days'),
('Arabica Coffee Beans 1kg', 'Beverages', 4200.00, 28, 71, 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=600&q=80', now() - interval '58 days'),
('Organic Coconut Oil 750ml', 'Pantry', 2350.00, 18, 44, 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&w=600&q=80', now() - interval '55 days'),
('Red Rice 5kg', 'Pantry', 3100.00, 63, 112, null, now() - interval '54 days'),
('Handmade Cinnamon Soap', 'Personal Care', 680.00, 9, 38, null, now() - interval '50 days'),
('Aloe Vera Gel 250ml', 'Personal Care', 1250.00, 21, 58, null, now() - interval '48 days'),
('Bamboo Cutting Board', 'Kitchen', 2950.00, 16, 24, null, now() - interval '44 days'),
('Stainless Lunch Box', 'Kitchen', 3600.00, 35, 33, null, now() - interval '42 days'),
('Ceramic Dinner Plate Set', 'Kitchen', 7900.00, 12, 19, null, now() - interval '40 days'),
('Linen Table Runner', 'Home', 2450.00, 31, 27, null, now() - interval '39 days'),
('Cotton Bath Towel', 'Home', 1750.00, 46, 68, null, now() - interval '36 days'),
('Woven Storage Basket', 'Home', 3250.00, 11, 21, null, now() - interval '35 days'),
('Notebook Pack', 'Office', 890.00, 75, 132, null, now() - interval '32 days'),
('Gel Pen Set', 'Office', 640.00, 88, 147, null, now() - interval '31 days'),
('Desk Organizer', 'Office', 2150.00, 23, 39, null, now() - interval '29 days'),
('Yoga Mat', 'Fitness', 5200.00, 14, 26, null, now() - interval '26 days'),
('Resistance Band Kit', 'Fitness', 2750.00, 27, 45, null, now() - interval '24 days'),
('Insulated Water Bottle', 'Fitness', 3900.00, 32, 73, null, now() - interval '21 days'),
('Travel Pouch Set', 'Travel', 1900.00, 25, 35, null, now() - interval '19 days'),
('Weekender Duffel Bag', 'Travel', 8900.00, 7, 16, null, now() - interval '15 days')
on conflict do nothing;

insert into public.customers (name, email, total_spent, join_date, status) values
('Aarav Perera', 'aarav.perera@example.com', 38450.00, now() - interval '210 days', 'active'),
('Nethmi Silva', 'nethmi.silva@example.com', 21280.00, now() - interval '190 days', 'active'),
('Kavindu Fernando', 'kavindu.fernando@example.com', 46300.00, now() - interval '170 days', 'active'),
('Amaya Jayasinghe', 'amaya.j@example.com', 9900.00, now() - interval '150 days', 'active'),
('Dinuka Samarasinghe', 'dinuka.s@example.com', 15480.00, now() - interval '140 days', 'active'),
('Sahana Wijesinghe', 'sahana.w@example.com', 58200.00, now() - interval '130 days', 'active'),
('Raveen Dias', 'raveen.dias@example.com', 12500.00, now() - interval '120 days', 'inactive'),
('Maya De Silva', 'maya.desilva@example.com', 31950.00, now() - interval '100 days', 'active'),
('Tharindu Gunasekara', 'tharindu.g@example.com', 7430.00, now() - interval '95 days', 'active'),
('Ishara Mendis', 'ishara.m@example.com', 26780.00, now() - interval '80 days', 'active'),
('Sachini Ranaweera', 'sachini.r@example.com', 18940.00, now() - interval '76 days', 'active'),
('Devon Kuruppu', 'devon.k@example.com', 40200.00, now() - interval '62 days', 'active'),
('Hiruni Edirisinghe', 'hiruni.e@example.com', 11150.00, now() - interval '45 days', 'active'),
('Pasindu Herath', 'pasindu.h@example.com', 23600.00, now() - interval '36 days', 'active'),
('Anuki Basnayake', 'anuki.b@example.com', 6400.00, now() - interval '20 days', 'active')
on conflict (email) do nothing;

with customer_rows as (
  select id, row_number() over (order by join_date) rn from public.customers
),
seed_orders as (
  select * from (values
    (1, 'OB-20260101-001', 8950.00, 'Paid', now() - interval '150 days'),
    (2, 'OB-20260104-002', 4200.00, 'Paid', now() - interval '145 days'),
    (3, 'OB-20260108-003', 12400.00, 'Pending', now() - interval '139 days'),
    (4, 'OB-20260112-004', 2350.00, 'Paid', now() - interval '135 days'),
    (5, 'OB-20260116-005', 10390.00, 'Paid', now() - interval '131 days'),
    (6, 'OB-20260120-006', 6850.00, 'Failed', now() - interval '127 days'),
    (7, 'OB-20260124-007', 2750.00, 'Paid', now() - interval '122 days'),
    (8, 'OB-20260128-008', 13200.00, 'Paid', now() - interval '118 days'),
    (9, 'OB-20260201-009', 640.00, 'Pending', now() - interval '114 days'),
    (10, 'OB-20260205-010', 5200.00, 'Paid', now() - interval '110 days'),
    (11, 'OB-20260209-011', 7210.00, 'Paid', now() - interval '106 days'),
    (12, 'OB-20260213-012', 3900.00, 'Paid', now() - interval '102 days'),
    (13, 'OB-20260217-013', 2450.00, 'Pending', now() - interval '98 days'),
    (14, 'OB-20260221-014', 8900.00, 'Paid', now() - interval '94 days'),
    (15, 'OB-20260225-015', 3100.00, 'Paid', now() - interval '90 days'),
    (1, 'OB-20260301-016', 4860.00, 'Paid', now() - interval '86 days'),
    (2, 'OB-20260305-017', 1850.00, 'Failed', now() - interval '82 days'),
    (3, 'OB-20260309-018', 11850.00, 'Paid', now() - interval '78 days'),
    (4, 'OB-20260313-019', 680.00, 'Paid', now() - interval '74 days'),
    (5, 'OB-20260317-020', 6050.00, 'Pending', now() - interval '70 days'),
    (6, 'OB-20260321-021', 15400.00, 'Paid', now() - interval '66 days'),
    (7, 'OB-20260325-022', 1900.00, 'Paid', now() - interval '62 days'),
    (8, 'OB-20260329-023', 7150.00, 'Paid', now() - interval '58 days'),
    (9, 'OB-20260402-024', 2950.00, 'Pending', now() - interval '54 days'),
    (10, 'OB-20260406-025', 4600.00, 'Paid', now() - interval '50 days'),
    (11, 'OB-20260410-026', 12740.00, 'Paid', now() - interval '46 days'),
    (12, 'OB-20260414-027', 890.00, 'Paid', now() - interval '42 days'),
    (13, 'OB-20260418-028', 6250.00, 'Failed', now() - interval '38 days'),
    (14, 'OB-20260422-029', 10400.00, 'Paid', now() - interval '34 days'),
    (15, 'OB-20260426-030', 3390.00, 'Pending', now() - interval '30 days')
  ) as s(customer_rn, order_number, total_amount, status, order_date)
)
insert into public.orders (customer_id, order_number, total_amount, status, order_date, created_at)
select customer_rows.id, seed_orders.order_number, seed_orders.total_amount, seed_orders.status, seed_orders.order_date, seed_orders.order_date
from seed_orders
join customer_rows on customer_rows.rn = seed_orders.customer_rn
on conflict (order_number) do nothing;

with order_rows as (
  select id, row_number() over (order by order_date) rn from public.orders
),
product_rows as (
  select id, row_number() over (order by created_at) rn from public.products
),
seed_items as (
  select * from (values
    (1,1,2),(1,8,1),(2,2,1),(3,9,1),(3,13,5),(4,3,1),(5,4,2),(5,14,6),
    (6,6,1),(6,19,3),(7,17,1),(8,18,2),(8,7,1),(9,14,1),(10,16,1),
    (11,15,2),(11,5,1),(12,18,1),(13,10,1),(14,20,1),(15,4,1),(16,11,2),
    (16,13,4),(17,1,1),(18,9,1),(18,6,2),(19,5,1),(20,3,1),(20,17,1),
    (21,2,2),(21,13,3),(22,19,1),(23,12,1),(23,8,1),(24,7,1),(25,1,1),
    (25,18,1),(26,20,1),(26,14,6),(27,13,1),(28,16,1),(28,6,1),(29,2,2),
    (29,4,1),(30,14,1),(30,17,1)
  ) as s(order_rn, product_rn, quantity)
)
insert into public.order_items (order_id, product_id, quantity, price_at_time)
select order_rows.id, product_rows.id, seed_items.quantity, products.price
from seed_items
join order_rows on order_rows.rn = seed_items.order_rn
join product_rows on product_rows.rn = seed_items.product_rn
join public.products on products.id = product_rows.id
on conflict do nothing;
