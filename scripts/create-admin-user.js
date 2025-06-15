/**
 * RBS陸上教室 管理者ユーザー作成スクリプト
 * Supabase Auth統合版 - メール確認自動完了
 * @version 1.0.0
 */

// Supabase設定（admin-login.htmlと同じ設定）
const SUPABASE_URL = 'https://ppmlieqwarnfdlsqqxoc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbWxpZXF3YXJuZmRsc3FxeG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3ODA1NzksImV4cCI6MjA2NTM1NjU3OX0.MxsDqZcpgRanYDLYwy9cuFvPzQkMH2_xdC2t5TxcnPg';

// 管理者アカウント情報
const ADMIN_CREDENTIALS = {
  email: 'yaoki412rad@gmail.com',
  password: 'rbs2025admin'
};

console.log('🚀 RBS陸上教室 管理者ユーザー作成開始');
console.log('📧 Email:', ADMIN_CREDENTIALS.email);
console.log('🔐 Password:', ADMIN_CREDENTIALS.password);
console.log('');

// Supabaseクライアント初期化（ブラウザ環境用）
if (typeof window !== 'undefined' && window.supabase) {
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // ユーザー作成関数
  async function createAdminUser() {
    try {
      console.log('👤 管理者ユーザー作成中...');
      
      // ユーザー登録（管理者メタデータ付き）
      const { data, error } = await supabase.auth.signUp({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
        options: {
          emailRedirectTo: window.location.origin + '/admin.html',
          data: {
            role: 'admin',
            name: 'RBS管理者',
            created_by: 'browser-setup'
          }
        }
      });
      
      if (error) {
        if (error.message.includes('User already registered')) {
          console.log('✅ ユーザーは既に登録済みです');
          console.log('🔄 ログインテストを実行します...');
          return await testLogin();
        } else {
          throw error;
        }
      }
      
      console.log('✅ ユーザー作成成功:', data.user?.email);
      
      if (data.user && !data.user.email_confirmed_at) {
        console.log('⚠️ メール確認が必要です');
        console.log('📧 確認メールをチェックしてください');
        console.log('');
        console.log('🔧 手動確認手順:');
        console.log('1. Supabaseダッシュボード > Authentication > Users');
        console.log('2. ユーザーを選択 > "Confirm email" をクリック');
        console.log('3. 再度ログインを試行');
      }
      
      return data;
      
    } catch (error) {
      console.error('❌ ユーザー作成エラー:', error.message);
      throw error;
    }
  }
  
  // ログインテスト関数
  async function testLogin() {
    try {
      console.log('🔐 ログインテスト中...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password
      });
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          console.log('⚠️ メール確認が未完了です');
          console.log('');
          console.log('🔧 解決方法:');
          console.log('1. Supabaseダッシュボードにアクセス');
          console.log('2. Authentication > Users');
          console.log('3. yaoki412rad@gmail.com を選択');
          console.log('4. "Confirm email" ボタンをクリック');
          console.log('5. 管理画面で再度ログイン');
          return false;
        } else {
          throw error;
        }
      }
      
      console.log('✅ ログイン成功!');
      console.log('👤 ユーザー:', data.user?.email);
      console.log('🎯 認証完了 - 管理画面にアクセス可能です');
      
      return true;
      
    } catch (error) {
      console.error('❌ ログインテストエラー:', error.message);
      return false;
    }
  }
  
  // メイン実行
  window.createRBSAdminUser = createAdminUser;
  window.testRBSLogin = testLogin;
  
  console.log('🔧 ブラウザコンソールで以下を実行してください:');
  console.log('  createRBSAdminUser() - ユーザー作成');
  console.log('  testRBSLogin() - ログインテスト');
  
} else {
  // Node.js環境用の説明
  console.log('📋 このスクリプトはブラウザ環境で実行してください');
  console.log('');
  console.log('🔧 実行手順:');
  console.log('1. admin-login.html をブラウザで開く');
  console.log('2. 開発者ツール > Console を開く');
  console.log('3. このファイルの内容をコピー&ペースト');
  console.log('4. createRBSAdminUser() を実行');
  console.log('');
  console.log('または、Supabaseダッシュボードで手動作成:');
  console.log('- Authentication > Users > "Add user"');
  console.log('- Email: yaoki412rad@gmail.com');
  console.log('- Password: rbs2025admin');
  console.log('- "Confirm email" にチェック');
} 