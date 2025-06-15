-- RBS陸上教室 セキュア管理者システム セットアップ
-- メタデータベース権限管理による完全セキュリティ
-- 実行手順: Supabaseダッシュボード > SQL Editor で実行

-- =====================================================
-- 1. 管理者権限確認関数の作成
-- =====================================================

-- 管理者権限確認関数
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- 認証済みユーザーかチェック
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- user_metadataのroleをチェック
  RETURN COALESCE(
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin',
    FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 管理者メールアドレス確認関数（フォールバック用）
CREATE OR REPLACE FUNCTION is_admin_email()
RETURNS BOOLEAN AS $$
BEGIN
  -- 認証済みユーザーかチェック
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 管理者メールアドレスリスト
  RETURN COALESCE(
    auth.email() = ANY(ARRAY['yaoki412rad@gmail.com']),
    FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 統合管理者権限確認関数
CREATE OR REPLACE FUNCTION is_authenticated_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- メタデータ権限またはメールアドレス権限のいずれかでOK
  RETURN is_admin_user() OR is_admin_email();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. RLSポリシーの更新（管理者権限強化）
-- =====================================================

-- articlesテーブルのRLS更新
DROP POLICY IF EXISTS "Authenticated users can manage articles" ON articles;
CREATE POLICY "Admin users can manage articles" 
ON articles FOR ALL 
TO authenticated 
USING (is_authenticated_admin()) 
WITH CHECK (is_authenticated_admin());

-- instagram_postsテーブルのRLS更新
DROP POLICY IF EXISTS "Authenticated users can manage Instagram posts" ON instagram_posts;
CREATE POLICY "Admin users can manage Instagram posts" 
ON instagram_posts FOR ALL 
TO authenticated 
USING (is_authenticated_admin()) 
WITH CHECK (is_authenticated_admin());

-- lesson_statusテーブルのRLS更新
DROP POLICY IF EXISTS "Authenticated users can manage lesson status" ON lesson_status;
CREATE POLICY "Admin users can manage lesson status" 
ON lesson_status FOR ALL 
TO authenticated 
USING (is_authenticated_admin()) 
WITH CHECK (is_authenticated_admin());

-- admin_settingsテーブルのRLS更新
DROP POLICY IF EXISTS "Authenticated users can manage admin settings" ON admin_settings;
CREATE POLICY "Admin users can manage admin settings" 
ON admin_settings FOR ALL 
TO authenticated 
USING (is_authenticated_admin()) 
WITH CHECK (is_authenticated_admin());

-- =====================================================
-- 3. 管理者ログテーブルの作成
-- =====================================================

-- 管理者アクションログテーブル
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 管理者ログのインデックス
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_action_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_action_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_table_name ON admin_action_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_action_logs(created_at);

-- 管理者ログのRLS
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;

-- 管理者のみログを閲覧可能
CREATE POLICY "Admin users can view admin logs" 
ON admin_action_logs FOR SELECT 
TO authenticated 
USING (is_authenticated_admin());

-- システムのみログを挿入可能
CREATE POLICY "System can insert admin logs" 
ON admin_action_logs FOR INSERT 
TO authenticated 
WITH CHECK (is_authenticated_admin());

-- =====================================================
-- 4. 管理者アクションログ記録関数
-- =====================================================

-- 管理者アクション自動ログ記録関数
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
  -- 管理者権限確認
  IF NOT is_authenticated_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- ログ記録
  INSERT INTO admin_action_logs (
    admin_id,
    admin_email,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    created_at
  ) VALUES (
    auth.uid(),
    auth.email(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::TEXT, OLD.id::TEXT),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 各テーブルにログトリガーを設定
DROP TRIGGER IF EXISTS admin_log_articles ON articles;
CREATE TRIGGER admin_log_articles
  AFTER INSERT OR UPDATE OR DELETE ON articles
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

DROP TRIGGER IF EXISTS admin_log_instagram_posts ON instagram_posts;
CREATE TRIGGER admin_log_instagram_posts
  AFTER INSERT OR UPDATE OR DELETE ON instagram_posts
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

DROP TRIGGER IF EXISTS admin_log_lesson_status ON lesson_status;
CREATE TRIGGER admin_log_lesson_status
  AFTER INSERT OR UPDATE OR DELETE ON lesson_status
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

DROP TRIGGER IF EXISTS admin_log_admin_settings ON admin_settings;
CREATE TRIGGER admin_log_admin_settings
  AFTER INSERT OR UPDATE OR DELETE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- =====================================================
-- 5. 管理者権限確認ビュー
-- =====================================================

-- 現在の管理者情報ビュー
CREATE OR REPLACE VIEW current_admin_info AS
SELECT 
  auth.uid() as user_id,
  auth.email() as email,
  is_admin_user() as has_metadata_role,
  is_admin_email() as has_admin_email,
  is_authenticated_admin() as is_admin,
  (auth.jwt() ->> 'user_metadata')::jsonb as user_metadata,
  NOW() as checked_at;

-- 管理者アクション統計ビュー
CREATE OR REPLACE VIEW admin_action_stats AS
SELECT 
  admin_email,
  action,
  table_name,
  COUNT(*) as action_count,
  MAX(created_at) as last_action,
  MIN(created_at) as first_action
FROM admin_action_logs
GROUP BY admin_email, action, table_name
ORDER BY admin_email, action_count DESC;

-- =====================================================
-- 6. 完了メッセージとテスト
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ セキュア管理者システムセットアップ完了';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 実装された機能:';
    RAISE NOTICE '  - メタデータベース権限管理';
    RAISE NOTICE '  - 強化されたRLSポリシー';
    RAISE NOTICE '  - 管理者アクションログ';
    RAISE NOTICE '  - 権限確認関数';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 次のステップ:';
    RAISE NOTICE '1. 管理者ユーザーにrole=adminメタデータを設定';
    RAISE NOTICE '2. フロントエンドの権限チェック更新';
    RAISE NOTICE '3. 管理画面でテスト実行';
    RAISE NOTICE '';
    RAISE NOTICE '📊 確認用クエリ:';
    RAISE NOTICE '  SELECT * FROM current_admin_info;';
    RAISE NOTICE '  SELECT * FROM admin_action_stats;';
END $$; 