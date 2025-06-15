/**
 * Supabase設定とクライアント初期化
 * @version 1.0.0
 * 
 * ⚠️ 重要: 実際のSupabase設定は `js/config/supabase-config.js` で管理されています
 * このファイルは統合設定ファイルから値を取得します
 */

// SupabaseクライアントライブラリをCDN経由で読み込み
// HTML側で以下のscriptタグを追加する必要があります：
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

/**
 * Supabase設定
 * 統合設定ファイル（js/config/supabase-config.js）から値を取得
 */
const SUPABASE_CONFIG = {
  // 統合設定ファイルで設定された値を使用
  url: window.SUPABASE_URL || 'YOUR_SUPABASE_URL',
  anonKey: window.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY',
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
};

/**
 * Supabaseクライアントインスタンス
 */
let supabaseClient = null;

/**
 * Supabaseクライアントを初期化
 * @returns {Object} Supabaseクライアント
 */
export function initSupabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  try {
    // Supabaseライブラリが読み込まれているかチェック
    if (typeof window.supabase === 'undefined') {
      throw new Error('Supabase library not loaded. Please include the Supabase script tag.');
    }

    // クライアント初期化
    supabaseClient = window.supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      SUPABASE_CONFIG.options
    );

    console.log('✅ Supabase client initialized successfully');
    return supabaseClient;

  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
    throw error;
  }
}

/**
 * Supabaseクライアントを取得
 * @returns {Object} Supabaseクライアント
 */
export function getSupabaseClient() {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
}

/**
 * 接続テスト
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function testConnection() {
  try {
    const client = getSupabaseClient();
    
    // 軽量なクエリでテスト
    const { data, error } = await client
      .from('articles')
      .select('count')
      .limit(1);

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: 'Supabase connection successful'
    };

  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    return {
      success: false,
      message: `Connection failed: ${error.message}`
    };
  }
}

/**
 * 環境設定の確認
 * @returns {Object} 設定情報
 */
export function getEnvironmentInfo() {
  return {
    url: SUPABASE_CONFIG.url,
    hasAnonKey: !!SUPABASE_CONFIG.anonKey,
    isConfigured: SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' && 
                  SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY',
    timestamp: new Date().toISOString()
  };
}

/**
 * デバッグ情報出力
 */
export function debugSupabase() {
  const envInfo = getEnvironmentInfo();
  console.group('🔧 Supabase Debug Info');
  console.log('Configuration:', envInfo);
  console.log('Client Status:', supabaseClient ? 'Initialized' : 'Not initialized');
  console.groupEnd();
}

// 開発環境でのデバッグ用
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.debugSupabase = debugSupabase;
  window.testSupabaseConnection = testConnection;
} 