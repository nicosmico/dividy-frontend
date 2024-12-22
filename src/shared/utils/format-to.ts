export const formatToCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', { currency: 'CLP', style: 'currency' }).format(
    value
  );
