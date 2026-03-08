import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const bypassProxy = process.env.NEXT_PUBLIC_FAKE_GENERATION === '1';

export default bypassProxy ? (() => NextResponse.next()) : clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
