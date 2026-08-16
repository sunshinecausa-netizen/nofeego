'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { accountFetch } from '@/lib/account/client';
import { useAuth } from '@/lib/auth-context';
export function PropertyInvitationGate({token}:{token:string}){const {user,loading}=useAuth();const router=useRouter();const [error,setError]=useState<string|null>(null);useEffect(()=>{if(loading)return;if(!user)return;accountFetch<{registrationId:string}>(`/api/property/invitations/${encodeURIComponent(token)}`,{method:'POST'}).then(result=>router.replace(`/property/registrations/${result.registrationId}`)).catch(caught=>setError(caught instanceof Error?caught.message:'INVITATION_REJECTED'))},[loading,router,token,user]);const next=`/property/invitations/${encodeURIComponent(token)}`;return <main className="mx-auto max-w-xl p-8"><h1 className="text-3xl font-bold">Property invitation</h1>{error?<p role="alert" className="mt-3 text-destructive">This invitation is expired, used, revoked, assigned to another email, or not authorized for this Building.</p>:<p role="status" className="mt-3 text-muted-foreground">{loading||user?'Verifying your one-time invitation…':'Sign in with the invited email address. Access is limited to the authorized Building.'}</p>}{!loading&&!user&&<Button asChild className="mt-5"><Link href={`/sign-in?next=${encodeURIComponent(next)}`}>Continue securely</Link></Button>}</main>}
