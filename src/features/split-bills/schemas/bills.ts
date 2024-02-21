import { z } from 'zod';

export const BILL_FORM_SCHEMA = z.object({
  uuid: z.string().min(1),
  name: z.string().min(1, 'Debes ingresar un nombre'),
  paidBy: z.string().min(1, 'Ingresa quién hizo esta compra'),
  total: z.number().min(0),
});

export const BILL_FORMS_SCHEMA = z.object({
  bills: BILL_FORM_SCHEMA.array(),
});

export type BillForm = z.infer<typeof BILL_FORM_SCHEMA>;
export type BillForms = z.infer<typeof BILL_FORMS_SCHEMA>;
