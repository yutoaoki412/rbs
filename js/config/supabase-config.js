/**
 * Supabase統合設定ファイル
 * 全てのHTMLファイルで使い回し可能
 * @version 1.0.0
 */

// Supabase設定を window オブジェクトに設定
window.SUPABASE_URL = 'https://ppmlieqwarnfdlsqqxoc.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbWxpZXF3YXJuZmRsc3FxeG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3ODA1NzksImV4cCI6MjA2NTM1NjU3OX0.MxsDqZcpgRanYDLYwy9cuFvPzQkMH2_xdC2t5TxcnPg';

// 設定確認のためのログ出力（開発時のみ）
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('🔧 Supabase設定読み込み完了');
  console.log('URL:', window.SUPABASE_URL);
  console.log('ANON_KEY:', window.SUPABASE_ANON_KEY ? '設定済み' : '未設定');
} 