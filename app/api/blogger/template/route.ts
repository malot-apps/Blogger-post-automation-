import { NextResponse } from 'next/server';
import { loadMasterTemplate } from '@/src/server/templateService';

export async function GET() {
  try {
    const template = loadMasterTemplate();
    return NextResponse.json({ template });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
