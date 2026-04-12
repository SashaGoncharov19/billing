export function generateInvoiceHtml(invoice: any, tenant: any): string {
  // Simple format helpers
  const formatMoney = (amount: string | number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(Number(amount))
  }

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'N/A'
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date))
  }

  const badgeColor = invoice.status === 'paid' ? '#D1FAE5' : invoice.status === 'open' ? '#DBEAFE' : '#FEF3C7'
  const badgeTextColor = invoice.status === 'paid' ? '#065F46' : invoice.status === 'open' ? '#1E40AF' : '#92400E'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      color: #111827;
      margin: 0;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .logo {
      max-height: 60px;
    }
    .invoice-number {
      font-size: 24px;
      font-weight: 700;
      color: ${tenant.primaryColor ?? '#3B82F6'};
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background-color: #F9FAFB;
      text-align: left;
      padding: 12px;
      border-bottom: 2px solid #E5E7EB;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #E5E7EB;
    }
    .totals {
      text-align: right;
      margin-top: 24px;
    }
    .total-row {
      font-weight: 700;
      font-size: 18px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      background-color: ${badgeColor};
      color: ${badgeTextColor};
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2>${tenant.name}</h2>
    </div>
    <div style="text-align: right">
      <div class="invoice-number">Invoice #${String(invoice.number).padStart(6, '0')}</div>
      <div style="margin-top: 8px;">Status: <span class="status-badge">${invoice.status}</span></div>
      <div style="margin-top: 8px;">Issued: ${formatDate(invoice.issuedAt)}</div>
      <div style="margin-top: 4px;">Due: ${formatDate(invoice.dueAt)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Tax</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map((item: any) => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${formatMoney(item.unitPrice, invoice.currency)}</td>
          <td>${Number(item.taxRate) * 100}%</td>
          <td>${formatMoney(item.totalAmount, invoice.currency)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div style="margin-bottom: 4px;">Subtotal: ${formatMoney(invoice.subtotalAmount, invoice.currency)}</div>
    <div style="margin-bottom: 12px;">Tax: ${formatMoney(invoice.taxAmount, invoice.currency)}</div>
    <div class="total-row">Total: ${formatMoney(invoice.totalAmount, invoice.currency)}</div>
  </div>

  ${invoice.notes ? `<div style="margin-top: 40px; padding: 16px; background-color: #F9FAFB; border-radius: 8px;"><strong>Notes:</strong><br>${invoice.notes}</div>` : ''}
</body>
</html>`
}
