export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // 管理画面へのアクセス制御
  if (url.pathname === '/admin' || url.pathname === '/admin/') {
    // Basic認証のチェック
    const authorization = request.headers.get('Authorization');
    
    if (!authorization) {
      return new Response('認証が必要です', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Area"',
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }
    
    // Basic認証の検証
    const [scheme, encoded] = authorization.split(' ');
    if (scheme !== 'Basic') {
      return new Response('無効な認証方式です', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Area"',
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }
    
    const credentials = atob(encoded);
    const [username, password] = credentials.split(':');
    
    // 環境変数から認証情報を取得（Cloudflareの環境変数で設定）
    const ADMIN_USERNAME = env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = env.ADMIN_PASSWORD || 'password123';
    
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return new Response('認証に失敗しました', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Area"',
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }
    
    // 認証成功時はadmin.htmlを返す
    try {
      const adminHtml = await env.ASSETS.fetch(new Request(`${url.origin}/admin.html`));
      return adminHtml;
    } catch (error) {
      return new Response('管理画面の読み込みに失敗しました', {
        status: 500,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }
  }
  
  // その他のリクエストはそのまま通す
  return await env.ASSETS.fetch(request);
} 