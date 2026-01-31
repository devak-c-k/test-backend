import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  
  // Get all params passed by Setu (success, status, etc.)
  const query = searchParams.toString();
  
  // Construct the Custom Scheme URL
  // "expensetrackerapp://setu-callback?success=true&..."
  const appSchemeUrl = `expensetrackerapp://setu-callback?${query}`;
  
  console.log(`[Setu Redirect] Redirecting from HTTPS to App Scheme: ${appSchemeUrl}`);

  // Perform a 307 Temporary Redirect to the App Scheme
  return NextResponse.redirect(appSchemeUrl, 307);
}
