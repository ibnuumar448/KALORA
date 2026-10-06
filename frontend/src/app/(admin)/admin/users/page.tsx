"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

import { ProtectedRoute } from '@/components/ProtectedRoute';

import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'student',
  });

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (err: any) {
      console.error('Failed to fetch users', err);
      toast.error(err.response?.data?.detail || 'Unable to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      await api.post('/admin/users', form);
      toast.success('User created successfully');
      setForm({ full_name: '', email: '', password: '', role: 'student' });
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Unable to create user');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading users...</div>;

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h2>
        <p className="text-slate-500 mt-1">Create and manage platform users, roles, and access.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>System users and their assigned roles.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">User ID</th>
                    <th className="px-6 py-4 font-medium">Roles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4 font-medium text-slate-900">{user.full_name}</td>
                        <td className="px-6 py-4 text-slate-600">{user.email}</td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-400" title={user.id}>
                          {user.id.split('-')[0]}...
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {(user.roles || []).map((role: string) => (
                              <span
                                key={role}
                                className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 capitalize"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create User</CardTitle>
            <CardDescription>Add a new KALORA user with a role.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                >
                  <option value="student">Student</option>
                  <option value="mentor">Mentor</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? 'Creating user...' : 'Create user'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
    </ProtectedRoute>
  );
}
