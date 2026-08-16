import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function UnauthorizedPage(){return <main className="mx-auto max-w-xl p-8 text-center"><h1 className="text-3xl font-bold">You do not have access</h1><p className="mt-3 text-muted-foreground">This Rental Case is assigned to another participant or Building organization.</p><Button asChild className="mt-5"><Link href="/">Return home</Link></Button></main>}
