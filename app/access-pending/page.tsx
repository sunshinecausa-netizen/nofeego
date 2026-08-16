import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function AccessPendingPage(){return <main className="mx-auto max-w-xl p-8 text-center"><h1 className="text-3xl font-bold">Access pending</h1><p className="mt-3 text-muted-foreground">Your Agent or Property access must be approved by an Admin. Tenant access remains available.</p><Button asChild className="mt-5"><Link href="/">Return home</Link></Button></main>}
