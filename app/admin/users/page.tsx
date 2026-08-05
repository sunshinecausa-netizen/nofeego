'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Users as UsersIcon, Shield, Mail, Calendar, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    try {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsers(data as Profile[] ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/sign-in'); return; }
    if (profile && !profile.is_admin) { router.push('/'); return; }
    if (profile?.is_admin) queueMicrotask(() => void loadUsers());
  }, [user, profile, authLoading, router]);

  const toggleAdmin = async (userId: string, currentAdmin: boolean) => {
    if (!confirm(currentAdmin ? 'Remove admin privileges?' : 'Grant admin privileges?')) return;
    await supabase.from('profiles').update({ is_admin: !currentAdmin }).eq('id', userId);
    loadUsers();
  };

  if (authLoading || (user && !profile)) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!profile?.is_admin) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Link>
        </Button>
        <h1 className="font-serif text-3xl font-bold">Manage Users</h1>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No users found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {u.display_name?.[0]?.toUpperCase() ?? u.email?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      {u.display_name || 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{u.email ?? '-'}</TableCell>
                  <TableCell>
                    {u.is_admin ? (
                      <Badge className="bg-primary gap-1"><Crown className="h-3 w-3" /> Admin</Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={u.is_admin ? 'outline' : 'default'}
                      onClick={() => toggleAdmin(u.id, u.is_admin)}
                      disabled={u.id === user?.id}
                    >
                      {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="mt-4 p-4 bg-muted/30 rounded-xl text-sm text-muted-foreground">
        <Shield className="h-4 w-4 inline mr-2 text-primary" />
        Admin roles are assigned manually. The first registered user is not automatically an admin.
      </div>
    </div>
  );
}
