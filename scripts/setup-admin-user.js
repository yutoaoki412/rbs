/**
 * Supabase管理者ユーザーセットアップスクリプト
 * RBS陸上教室管理画面用
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../js/shared/constants/config.js';

// Supabase設定（設定ファイルから取得）
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ppmlieqwarnfdlsqqxoc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URLが設定されていません');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEYが設定されていません');
  console.log('📋 管理者ユーザー作成には、Supabase Service Role Keyが必要です');
  console.log('');
  console.log('🔧 手動セットアップ手順:');
  console.log('1. Supabaseダッシュボード > Settings > API');
  console.log('2. Service Role Keyをコピー');
  console.log('3. 以下のコマンドで環境変数を設定:');
  console.log('   export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"');
  console.log('4. 再度このスクリプトを実行');
  console.log('');
  console.log('または、Supabase Auth > Usersで手動でユーザーを作成してください:');
  console.log(`- Email: ${CONFIG.admin.auth.adminCredentials.email}`);
  console.log(`- Password: ${CONFIG.admin.auth.adminCredentials.password}`);
  console.log('- Email Confirm: true');
  console.log('');
  
  // RLSポリシー情報は出力
  await setupRLSPolicies();
  process.exit(0);
}

// サービスロールクライアント（管理者作成用）
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * 管理者ユーザー作成
 */
async function createAdminUser() {
  try {
    console.log('🔧 管理者ユーザー作成開始...');
    
    const adminCredentials = CONFIG.admin.auth.adminCredentials;
    
    // 既存ユーザー確認
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`ユーザー一覧取得エラー: ${listError.message}`);
    }
    
    const existingAdmin = existingUsers.users.find(user => user.email === adminCredentials.email);
    
    if (existingAdmin) {
      console.log('✅ 管理者ユーザーは既に存在します:', adminCredentials.email);
      return existingAdmin;
    }
    
    // 新規管理者ユーザー作成
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminCredentials.email,
      password: adminCredentials.password,
      email_confirm: true, // メール確認をスキップ
      user_metadata: {
        role: adminCredentials.role,
        name: 'RBS管理者',
        created_by: 'setup-script'
      }
    });
    
    if (createError) {
      throw new Error(`管理者ユーザー作成エラー: ${createError.message}`);
    }
    
    console.log('✅ 管理者ユーザー作成完了:', newUser.user.email);
    return newUser.user;
    
  } catch (error) {
    console.error('❌ 管理者ユーザー作成失敗:', error);
    throw error;
  }
}

/**
 * RLSポリシー確認・作成（schema.sql準拠）
 */
async function setupRLSPolicies() {
  try {
    console.log('🔧 RLSポリシー設定確認...');
    
    // schema.sqlに基づく完全なRLSポリシー設定
    const rlsPoliciesSQL = `
-- =====================================================
-- Row Level Security (RLS) 設定 - schema.sql準拠
-- =====================================================

-- articlesテーブルのRLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- 公開記事は誰でも読み取り可能
DROP POLICY IF EXISTS "Public articles are viewable by everyone" ON articles;
CREATE POLICY "Public articles are viewable by everyone" 
ON articles FOR SELECT 
USING (status = 'published');

-- 認証済みユーザーは全記事を操作可能（管理者用）
DROP POLICY IF EXISTS "Authenticated users can manage articles" ON articles;
CREATE POLICY "Authenticated users can manage articles" 
ON articles FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- instagram_postsテーブルのRLS
ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;

-- 表示設定されたInstagram投稿は誰でも読み取り可能
DROP POLICY IF EXISTS "Visible Instagram posts are viewable by everyone" ON instagram_posts;
CREATE POLICY "Visible Instagram posts are viewable by everyone" 
ON instagram_posts FOR SELECT 
USING (visible = true);

-- 認証済みユーザーは全Instagram投稿を操作可能
DROP POLICY IF EXISTS "Authenticated users can manage Instagram posts" ON instagram_posts;
CREATE POLICY "Authenticated users can manage Instagram posts" 
ON instagram_posts FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- lesson_statusテーブルのRLS
ALTER TABLE lesson_status ENABLE ROW LEVEL SECURITY;

-- レッスン状況は誰でも読み取り可能
DROP POLICY IF EXISTS "Lesson status is viewable by everyone" ON lesson_status;
CREATE POLICY "Lesson status is viewable by everyone" 
ON lesson_status FOR SELECT 
USING (true);

-- 認証済みユーザーはレッスン状況を操作可能
DROP POLICY IF EXISTS "Authenticated users can manage lesson status" ON lesson_status;
CREATE POLICY "Authenticated users can manage lesson status" 
ON lesson_status FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- admin_settingsテーブルのRLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- 管理画面設定は認証済みユーザーのみアクセス可能
DROP POLICY IF EXISTS "Authenticated users can manage admin settings" ON admin_settings;
CREATE POLICY "Authenticated users can manage admin settings" 
ON admin_settings FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
`;
    
    // ポリシー実行（実際のSQL実行は管理画面で行う）
    console.log('📋 以下のSQLをSupabase SQLエディタで実行してください:');
    console.log('');
    console.log(rlsPoliciesSQL);
    console.log('');
    
    console.log('✅ RLSポリシー設定情報を出力しました（schema.sql準拠）');
    
  } catch (error) {
    console.error('❌ RLSポリシー設定エラー:', error);
    throw error;
  }
}

/**
 * セットアップ実行
 */
async function runSetup() {
  try {
    console.log('🚀 RBS管理者セットアップ開始');
    console.log('=====================================');
    
    // 管理者ユーザー作成
    const adminUser = await createAdminUser();
    
    // RLSポリシー設定情報出力
    await setupRLSPolicies();
    
    console.log('=====================================');
    console.log('✅ セットアップ完了');
    console.log('');
    console.log('📋 次の手順:');
    console.log('1. 上記のSQLをSupabase SQLエディタで実行');
    console.log('2. 管理画面にアクセスして認証テスト');
    console.log(`3. 管理者メール: ${adminUser.email}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ セットアップ失敗:', error);
    process.exit(1);
  }
}

// Node.js環境での実行
if (typeof process !== 'undefined' && process.argv) {
  runSetup();
}

// ブラウザ環境での実行用エクスポート
export { createAdminUser, setupRLSPolicies, runSetup }; 