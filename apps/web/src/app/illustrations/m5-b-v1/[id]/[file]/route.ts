import {sharedIllustrationResponse} from '@/lib/shared-illustration-storage.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string;file:string}>}) {
  const {id,file}=await params;
  return sharedIllustrationResponse(id,file);
}
