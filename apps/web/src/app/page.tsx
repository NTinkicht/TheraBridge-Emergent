import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Navigation convenience only; every session and permission is validated by the API.
export default function HomePage() {
  const jar = cookies();
  redirect(jar.has('__Host-tb_session') || jar.has('tb_session') ? '/app' : '/login');
}
