import type { Dataset } from '../types';

/**
 * Small e-commerce dataset. Deliberately includes non-`completed` orders
 * (cancelled/refunded) so questions can test correct filtering — a first taste
 * of the "realistic, slightly messy" data this product is about.
 */
export const ecommerce: Dataset = {
  id: 'ecommerce',
  title: 'E-commerce orders',
  tables: [
    { name: 'customers', columns: ['customer_id', 'name', 'country'] },
    { name: 'orders', columns: ['order_id', 'customer_id', 'amount', 'status', 'created_at'] },
    { name: 'products', columns: ['product_id', 'name', 'category', 'price'] },
    { name: 'order_items', columns: ['order_id', 'product_id', 'quantity'] },
  ],
  setupSql: `
    CREATE OR REPLACE TABLE customers (
      customer_id INTEGER,
      name        VARCHAR,
      country     VARCHAR
    );
    INSERT INTO customers VALUES
      (1, 'Ava',  'UK'),
      (2, 'Ben',  'US'),
      (3, 'Chen', 'SG'),
      (4, 'Dana', 'US');

    CREATE OR REPLACE TABLE orders (
      order_id    INTEGER,
      customer_id INTEGER,
      amount      DECIMAL(10,2),
      status      VARCHAR,
      created_at  TIMESTAMP
    );
    INSERT INTO orders VALUES
      (101, 1, 50.00, 'completed', TIMESTAMP '2026-01-02 10:00:00'),
      (102, 1, 30.00, 'completed', TIMESTAMP '2026-01-05 12:00:00'),
      (103, 2, 99.99, 'completed', TIMESTAMP '2026-01-03 09:30:00'),
      (104, 2, 20.00, 'cancelled', TIMESTAMP '2026-01-04 09:30:00'),
      (105, 3, 10.00, 'completed', TIMESTAMP '2026-01-06 14:00:00'),
      (106, 1,  5.00, 'refunded',  TIMESTAMP '2026-01-07 14:00:00'),
      (107, 4, 15.00, 'cancelled', TIMESTAMP '2026-01-08 11:00:00');

    CREATE OR REPLACE TABLE products (
      product_id INTEGER,
      name       VARCHAR,
      category   VARCHAR,
      price      DECIMAL(10,2)
    );
    INSERT INTO products VALUES
      (1, 'Widget',    'Hardware', 9.99),
      (2, 'Gadget',    'Hardware', 19.99),
      (3, 'Doohickey', 'Hardware', 4.50),
      (4, 'E-book',    'Digital',  12.00),
      (5, 'Course',    'Digital',  49.00);

    -- Line items reference existing orders (order 106 is refunded).
    CREATE OR REPLACE TABLE order_items (
      order_id   INTEGER,
      product_id INTEGER,
      quantity   INTEGER
    );
    INSERT INTO order_items VALUES
      (101, 1, 2),
      (101, 3, 1),
      (102, 2, 1),
      (103, 5, 1),
      (103, 4, 2),
      (105, 1, 1),
      (106, 4, 1);
  `,
};
