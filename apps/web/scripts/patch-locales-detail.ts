import fs from 'fs'

const enPath = '/Users/oleksandr/WebstormProjects/entityseven-billing/apps/web/messages/en.json'
const ukPath = '/Users/oleksandr/WebstormProjects/entityseven-billing/apps/web/messages/uk.json'

function patch(path: string, keyContent: any) {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'))
  data.admin.tenantDetail = keyContent;
  fs.writeFileSync(path, JSON.stringify(data, null, 2))
}

const en = {
  loading: "Loading tenant details...",
  notFound: "Tenant not found.",
  status: { suspended: "Suspended", active: "Active" },
  profile: {
    title: "Profile",
    description: "Basic information about the tenant.",
    slug: "Slug:",
    colors: "Colors:",
    createdAt: "Created At:"
  },
  members: {
    title: "Members",
    total: "{count} member(s) total",
    empty: "No members found."
  },
  invoices: {
    title: "Recent Invoices",
    total: "{count} invoice(s)",
    empty: "No invoices generated yet.",
    columns: { id: "ID", amount: "Amount", status: "Status", date: "Date" }
  }
}

const uk = {
  loading: "Завантаження деталей тенанта...",
  notFound: "Тенант не знайдений.",
  status: { suspended: "Заблоковано", active: "Активний" },
  profile: {
    title: "Профіль",
    description: "Основна інформація про тенанта.",
    slug: "Slug:",
    colors: "Кольори:",
    createdAt: "Створено:"
  },
  members: {
    title: "Учасники",
    total: "Всього учасників: {count}",
    empty: "Учасників не знайдено."
  },
  invoices: {
    title: "Останні інвойси",
    total: "Кількість інвойсів: {count}",
    empty: "Інвойси ще не згенеровані.",
    columns: { id: "ID", amount: "Сума", status: "Статус", date: "Дата" }
  }
}

patch(enPath, en)
patch(ukPath, uk)
console.log('Done')
