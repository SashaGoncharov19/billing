import type { Invoice, Tenant } from '@entityseven/db'

export type InvoiceViewData = Invoice & {
  items: Array<{
    description: string
    quantity: number | string
    unitPrice: number | string
    totalAmount: number | string
  }>
  issuerDetails: {
    name: string
    address?: string | null
    taxId?: string | null
    email?: string | null
    country?: string | null
  }
  recipientDetails: {
    name: string
    address?: string | null
    taxId?: string | null
    email?: string | null
    country?: string | null
  }
}

export function generateInvoiceHtml(invoice: InvoiceViewData, tenant: Tenant): string {
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const badgeColor = invoice.status === 'paid' ? '#D1FAE5' : invoice.status === 'open' ? '#DBEAFE' : '#FEF3C7'
  const badgeTextColor = invoice.status === 'paid' ? '#065F46' : invoice.status === 'open' ? '#1E40AF' : '#92400E'

  const issuer = invoice.issuerDetails || {
    name: tenant.billingEntity || tenant.name,
    address: tenant.billingAddress,
    taxId: tenant.billingTaxId,
    email: tenant.billingEmail,
    country: tenant.billingCountry
  }

  const recipient = invoice.recipientDetails || {}

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
    .addresses {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      background: #F9FAFB;
      padding: 24px;
      border-radius: 8px;
    }
    .address-block h3 {
      margin-top: 0;
      margin-bottom: 12px;
      font-size: 14px;
      text-transform: uppercase;
      color: #6B7280;
    }
    .address-line {
      margin-bottom: 4px;
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
      <h2>${issuer.name || tenant.name}</h2>
    </div>
    <div style="text-align: right">
      <div class="invoice-number">Invoice #${String(invoice.number).padStart(6, '0')}</div>
      <div style="margin-top: 8px;">Status: <span class="status-badge">${invoice.status}</span></div>
      <div style="margin-top: 8px;">Issued: ${formatDate(invoice.issuedAt || invoice.createdAt)}</div>
      ${invoice.dueAt ? `<div style="margin-top: 4px;">Due: ${formatDate(invoice.dueAt)}</div>` : ''}
      ${invoice.paymentMethod ? `<div style="margin-top: 4px;">Payment Method: ${invoice.paymentMethod}</div>` : ''}
      ${invoice.status === 'paid' && invoice.paidAt ? `<div style="margin-top: 4px; color: #059669; font-weight: 600;">Paid: ${formatDate(invoice.paidAt)}</div>` : ''}
    </div>
  </div>

  <div class="addresses">
    <div class="address-block">
      <h3>From</h3>
      <div class="address-line"><strong>${issuer.name || 'Company Name'}</strong></div>
      ${issuer.address ? `<div class="address-line" style="white-space: pre-wrap;">${issuer.address}</div>` : ''}
      ${issuer.country ? `<div class="address-line">${issuer.country}</div>` : ''}
      ${issuer.taxId ? `<div class="address-line">Tax ID: ${issuer.taxId}</div>` : ''}
      ${issuer.email ? `<div class="address-line">${issuer.email}</div>` : ''}
    </div>
    
    <div class="address-block" style="text-align: right;">
      <h3>Bill To</h3>
      <div class="address-line"><strong>${recipient.name || 'Customer'}</strong></div>
      ${recipient.address ? `<div class="address-line" style="white-space: pre-wrap;">${recipient.address}</div>` : ''}
      ${recipient.country ? `<div class="address-line">${recipient.country}</div>` : ''}
      ${recipient.taxId ? `<div class="address-line">Tax ID: ${recipient.taxId}</div>` : ''}
      ${recipient.email ? `<div class="address-line">${recipient.email}</div>` : ''}
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
      ${invoice.items?.map((item: any) => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${formatMoney(item.unitPrice, invoice.currency)}</td>
          <td>${Number(item.taxRate) * 100}%</td>
          <td>${formatMoney(item.totalAmount, invoice.currency)}</td>
        </tr>
      `).join('') || ''}
    </tbody>
  </table>

  <div class="totals">
    <div style="margin-bottom: 4px;">Subtotal: ${formatMoney(invoice.subtotalAmount, invoice.currency)}</div>
    <div style="margin-bottom: 12px;">Tax: ${formatMoney(invoice.taxAmount, invoice.currency)}</div>
      <div class="total-row">Total: ${formatMoney(invoice.totalAmount, invoice.currency)}</div>
    </div>
    
    ${invoice.notes ? `
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">
        <strong>Notes:</strong><br/>
        ${invoice.notes.replace(/\n/g, '<br/>')}
      </div>
    ` : ''}
</body>
</html>`
}
