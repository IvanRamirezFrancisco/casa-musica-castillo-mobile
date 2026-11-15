import { DemoAccountOrder } from '../models/account.model';

export const DEMO_ACCOUNT_ORDERS: DemoAccountOrder[] = [
    {
      id: 'DEMO-1004',
      date: '2026-09-28',
      status: 'pending',
      items: [{ id: 'p2', name: 'Teclado Roland GO', unitPrice: 7200, quantity: 1 }],
      shipping: 150,
      deliveryMethod: 'Envío a domicilio',
      paymentMethod: 'Transferencia bancaria',
    },
    {
      id: 'DEMO-1003',
      date: '2026-09-20',
      status: 'shipped',
      items: [
        { id: 'p1', name: 'Guitarra Acústica Yamaha', unitPrice: 4500, quantity: 1 },
        { id: 'p4', name: 'Cuerdas para guitarra', unitPrice: 180, quantity: 2 },
      ],
      shipping: 150,
      deliveryMethod: 'Envío a domicilio',
      paymentMethod: 'Mercado Pago',
    },
    {
      id: 'DEMO-1002',
      date: '2026-09-02',
      status: 'delivered',
      items: [{ id: 'p3', name: 'Batería Pearl Export', unitPrice: 15500, quantity: 1 }],
      shipping: 0,
      deliveryMethod: 'Recoger en tienda',
      paymentMethod: 'Mercado Pago',
    },
    {
      id: 'DEMO-1001',
      date: '2026-08-15',
      status: 'cancelled',
      items: [{ id: 'p5', name: 'Atril para partituras', unitPrice: 350, quantity: 1 }],
      shipping: 0,
      deliveryMethod: 'Recoger en tienda',
      paymentMethod: 'Transferencia bancaria',
    },
  ];
