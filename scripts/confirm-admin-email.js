/**
 * 管理者ユーザーのメール確認スクリプト
 * ブラウザコンソールで実行してメール確認を完了
 */

console.log('📧 管理者メール確認スクリプト開始');

// Supabase設定
const SUPABASE_URL = 'https://ppmlieqwarnfdlsqqxoc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbWxpZXF3YXJuZmRsc3FxeG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MzI4NzQsImV4cCI6MjA1MDAwODg3NH0.YBJhkJhCJhJhCJhJhCJhJhCJhJhCJhJhCJhJhCJhJhC';

// 管理者認証情報
const ADMIN_EMAIL = 'yaoki412rad@gmail.com';
const ADMIN_PASSWORD = 'rbs2025admin';

// ブラウザ環境での実行
if (typeof window !== 'undefined' && window.supabase) {
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // メール確認状態チェック関数
  async function checkEmailConfirmation() {
    try {
      console.log('🔍 メール確認状態をチェック中...');
      
      // ログイン試行
      const { data, error } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      });
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          console.log('❌ メールが未確認です');
          return false;
        } else {
          console.error('❌ ログインエラー:', error.message);
          return false;
        }
      }
      
      console.log('✅ メール確認済み - ログイン成功');
      console.log('👤 ユーザー情報:', {
        email: data.user.email,
        confirmed: !!data.user.email_confirmed_at,
        metadata: data.user.user_metadata
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ チェック中にエラー:', error);
      return false;
    }
  }
  
  // メール確認完了まで待機
  async function waitForEmailConfirmation() {
    console.log('⏳ メール確認完了を待機中...');
    console.log('');
    console.log('📋 手動確認手順:');
    console.log('1. Supabaseダッシュボード > Authentication > Users');
    console.log('2. yaoki412rad@gmail.com を選択');
    console.log('3. "Confirm email" ボタンをクリック');
    console.log('4. このスクリプトが自動で確認します');
    console.log('');
    
    let attempts = 0;
    const maxAttempts = 60; // 5分間待機
    
    const checkInterval = setInterval(async () => {
      attempts++;
      
      const isConfirmed = await checkEmailConfirmation();
      
      if (isConfirmed) {
        clearInterval(checkInterval);
        console.log('🎉 メール確認完了！');
        console.log('✅ 管理画面にログインできます');
        
        // 管理画面にリダイレクト
        setTimeout(() => {
          window.location.href = 'admin.html';
        }, 2000);
        
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.log('⏰ タイムアウト: 手動でメール確認を完了してください');
      } else {
        console.log(`⏳ 確認中... (${attempts}/${maxAttempts})`);
      }
    }, 5000); // 5秒間隔でチェック
  }
  
  // 実行
  window.confirmAdminEmail = waitForEmailConfirmation;
  
  console.log('✅ スクリプト準備完了');
  console.log('📞 実行方法: window.confirmAdminEmail()');
  
} else {
  console.log('❌ ブラウザ環境またはSupabaseが利用できません');
}

// 使用方法の表示
console.log('');
console.log('🔧 使用方法:');
console.log('1. ブラウザコンソールでこのスクリプトを実行');
console.log('2. window.confirmAdminEmail() を実行');
console.log('3. Supabaseダッシュボードでメール確認');
console.log('4. 自動でログイン確認・リダイレクト'); 