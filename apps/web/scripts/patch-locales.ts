import fs from 'fs'

const enPath = '/Users/oleksandr/WebstormProjects/entityseven-billing/apps/web/messages/en.json'
const ukPath = '/Users/oleksandr/WebstormProjects/entityseven-billing/apps/web/messages/uk.json'

const adminEn = {
  nav: {
    superadmin: "Superadmin",
    dashboard: "Admin Dashboard",
    tenants: "Tenants Management",
    users: "Users",
    invoices: "Global Invoices",
    tickets: "Global Tickets",
    auditLogs: "Audit Logs",
    back: "Back to Portal"
  },
  dashboard: {
    title: "Platform Overview",
    loading: "Loading stats...",
    totalTenants: "Total Tenants",
    revenue: "Total Revenue (30d)",
    activeSubs: "Active Subs",
    openTickets: "Open Tickets",
    recentActivity: "Recent Activity (Audit Log)",
    noActivity: "No recent activity to show."
  },
  tenants: { title: "Tenants Management", columns: { name: "Name", members: "Members", status: "Status", date: "Created" }, view: "View", suspend: "Suspend" },
  users: { title: "Platform Users", columns: { email: "Email", created: "Created At" } },
  invoices: { title: "All Invoices" },
  tickets: { title: "All Tickets" },
  audit: { title: "Audit Log Viewer", action: "Action", user: "User", ip: "IP" }
}

const adminUk = {
  nav: {
    superadmin: "Суперадмін",
    dashboard: "Дашборд Адміна",
    tenants: "Керування тенантами",
    users: "Користувачі",
    invoices: "Глобальні інвойси",
    tickets: "Глобальні тікети",
    auditLogs: "Журнал аудиту",
    back: "Повернутися до Порталу"
  },
  dashboard: {
    title: "Огляд Платформи",
    loading: "Завантаження статистики...",
    totalTenants: "Всього Тенантів",
    revenue: "Загальний Дохід (30д)",
    activeSubs: "Активнік Підписки",
    openTickets: "Відкриті Тікети",
    recentActivity: "Остання активність (Аудит)",
    noActivity: "Немає недавньої активності."
  },
  tenants: { title: "Організації", columns: { name: "Назва", members: "Учасники", status: "Статус", date: "Створено" }, view: "Перегляд", suspend: "Заблокувати" },
  users: { title: "Користувачі", columns: { email: "Пошта", created: "Створено" } },
  invoices: { title: "Усі інвойси" },
  tickets: { title: "Усі тікети" },
  audit: { title: "Журнал аудиту", action: "Дія", user: "Користувач", ip: "IP" }
}

function update(path: string, adminDict: Record<string, unknown>) {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'))
  data.admin = adminDict
  fs.writeFileSync(path, JSON.stringify(data, null, 2))
}

update(enPath, adminEn)
update(ukPath, adminUk)
console.log('Translations merged successfully!')
