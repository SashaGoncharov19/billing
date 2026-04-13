import { useAdminUsers } from '@/lib/api-admin'
import { Link } from 'react-router-dom'
import { Loader2, Users, Search, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export default function AdminUsersList() {
  const { data: users, isLoading } = useAdminUsers()
  const [search, setSearch] = useState('')

  const filteredUsers = users?.filter((u: any) => 
    u.email?.toLowerCase().includes(search.toLowerCase()) || 
    u.id.includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage platform users, view their invoices, and debugging data.</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search by email or ID..."
            className="pl-9 p-2 border rounded-md bg-card text-sm w-full"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 flex justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>
        ) : filteredUsers?.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
            <Users size={48} className="opacity-20 mb-4" />
            <p>No users found matching your search.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b uppercase text-xs text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Registered</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredUsers?.map((u: any) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{u.email}</div>
                    <div className="text-xs text-muted-foreground">{u.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-muted px-2 py-1 flex w-max rounded text-xs font-medium uppercase tracking-wider">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      to={`/admin/users/${u.id}`}
                      className="inline-flex items-center text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors font-medium text-xs"
                    >
                      View Details <ChevronRight size={14} className="ml-1" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
