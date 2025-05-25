export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Protect /admin/ and /api/ routes
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/')) {
    // Basic Authentication check
    const authorization = request.headers.get('Authorization');
    
    // Environment variables for credentials
    // It's good practice to set these in your Cloudflare Pages project settings.
    const ADMIN_USERNAME = env.ADMIN_USERNAME || 'admin'; // Default if not set
    const ADMIN_PASSWORD = env.ADMIN_PASSWORD || 'password123'; // Default if not set

    if (!authorization) {
      return new Response('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Protected Area"',
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }
    
    const [scheme, encoded] = authorization.split(' ');
    
    if (scheme !== 'Basic' || !encoded) {
      return new Response('Invalid authentication scheme', {
        status: 401, // Or 400 for bad request
        headers: {
          'WWW-Authenticate': 'Basic realm="Protected Area"',
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }
    
    // Decode and check credentials
    // Note: In a real-world scenario, direct atob might not be safe for all character sets.
    // However, for typical Basic Auth, it's standard.
    let credentials;
    try {
        credentials = atob(encoded);
    } catch (e) {
        // This can happen if `encoded` is not valid base64
        console.error("Failed to decode base64 credentials:", e);
        return new Response('Invalid base64 encoding for credentials', {
            status: 400, // Bad Request
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }

    const [username, password] = credentials.split(':');
    
    const validUsername = username === ADMIN_USERNAME;
    const validPassword = password === ADMIN_PASSWORD; // In a real app, use secure password comparison

    if (!validUsername || !validPassword) {
      // Delay to mitigate timing attacks (optional but good practice)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      return new Response('Invalid credentials', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Protected Area"',
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }
    
    // Authentication successful for /admin/* or /api/*
    // Proceed to serve the asset or invoke the function
    // This line allows Cloudflare Pages to handle the request as usual (e.g. serve admin/index.html or call an API function)
    return await env.ASSETS.fetch(request);
  }
  
  // For all other routes, bypass authentication and serve assets/functions directly
  return await env.ASSETS.fetch(request);
}