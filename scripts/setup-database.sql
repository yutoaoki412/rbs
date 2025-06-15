-- RBS陸上教室 データベースセットアップスクリプト
-- Supabase用 - 管理者ユーザー対応版
-- 実行手順: Supabase SQL Editor で実行

-- =====================================================
-- 1. 既存テーブルの確認と作成
-- =====================================================

-- articles テーブル
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  summary TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'event', 'notice', 'lesson', 'other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- instagram_posts テーブル
CREATE TABLE IF NOT EXISTS instagram_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  embed_code TEXT NOT NULL,
  caption TEXT,
  visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- lesson_status テーブル
CREATE TABLE IF NOT EXISTS lesson_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  basic_status TEXT NOT NULL DEFAULT 'scheduled' 
    CHECK (basic_status IN ('scheduled', 'cancelled', 'indoor', 'postponed')),
  basic_message TEXT DEFAULT '',
  advance_status TEXT NOT NULL DEFAULT 'scheduled' 
    CHECK (advance_status IN ('scheduled', 'cancelled', 'indoor', 'postponed')),
  advance_message TEXT DEFAULT '',
  global_message TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- admin_settings テーブル
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. インデックス作成
-- =====================================================

-- articles用のインデックス
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);

-- instagram_posts用のインデックス
CREATE INDEX IF NOT EXISTS idx_instagram_posts_visible ON instagram_posts(visible);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_display_order ON instagram_posts(display_order);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_created_at ON instagram_posts(created_at);

-- lesson_status用のインデックス
CREATE INDEX IF NOT EXISTS idx_lesson_status_date ON lesson_status(date);
CREATE INDEX IF NOT EXISTS idx_lesson_status_basic_status ON lesson_status(basic_status);
CREATE INDEX IF NOT EXISTS idx_lesson_status_advance_status ON lesson_status(advance_status);

-- admin_settings用のインデックス
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);

-- =====================================================
-- 3. 更新日時自動更新トリガー
-- =====================================================

-- トリガー関数作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにトリガー設定
DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at 
    BEFORE UPDATE ON articles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_instagram_posts_updated_at ON instagram_posts;
CREATE TRIGGER update_instagram_posts_updated_at 
    BEFORE UPDATE ON instagram_posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lesson_status_updated_at ON lesson_status;
CREATE TRIGGER update_lesson_status_updated_at 
    BEFORE UPDATE ON lesson_status 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_settings_updated_at ON admin_settings;
CREATE TRIGGER update_admin_settings_updated_at 
    BEFORE UPDATE ON admin_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. Row Level Security (RLS) 設定
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

-- =====================================================
-- 5. サンプルデータ挿入
-- =====================================================

-- サンプル記事
INSERT INTO articles (title, content, summary, category, status, featured) VALUES
('RBS陸上教室開校のお知らせ', '2024年4月より、RBS陸上教室を開校いたします...', '新しい陸上教室が開校します', 'notice', 'published', true),
('春季体験レッスンのご案内', '4月中は無料体験レッスンを実施いたします...', '無料体験レッスン開催中', 'event', 'published', false),
('雨天時のレッスンについて', '雨天時は室内でのレッスンに変更いたします...', '雨天時の対応について', 'lesson', 'published', false)
ON CONFLICT DO NOTHING;

-- サンプルレッスン状況
INSERT INTO lesson_status (date, basic_status, basic_message, advance_status, advance_message, global_message) VALUES
(CURRENT_DATE, 'scheduled', '通常通り開催予定です', 'scheduled', '通常通り開催予定です', '本日のレッスンは予定通り開催いたします')
ON CONFLICT (date) DO NOTHING;

-- 管理画面設定
INSERT INTO admin_settings (key, value, description) VALUES
('site_title', '"RBS陸上教室"', 'サイトタイトル'),
('contact_email', '"info@rbs-athletics.com"', '連絡先メールアドレス'),
('lesson_capacity', '{"basic": 20, "advance": 15}', 'レッスン定員数')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 6. 完了メッセージ
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ RBS陸上教室データベースセットアップ完了';
    RAISE NOTICE '📋 作成されたテーブル: articles, instagram_posts, lesson_status, admin_settings';
    RAISE NOTICE '🔐 RLSポリシー設定完了';
    RAISE NOTICE '📊 サンプルデータ挿入完了';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 次のステップ:';
    RAISE NOTICE '1. 管理者ユーザーを作成 (admin-login.html)';
    RAISE NOTICE '2. Authentication > Users でメール確認';
    RAISE NOTICE '3. 管理画面でログインテスト';
END $$; 