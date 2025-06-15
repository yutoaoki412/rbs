-- RBS陸上教室 LP - Supabaseデータベーススキーマ
-- 作成日: 2024年12月
-- バージョン: 1.0.0

-- =====================================================
-- 1. articles テーブル (記事管理)
-- =====================================================

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

-- articles用のインデックス
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);

-- articles用の更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at 
    BEFORE UPDATE ON articles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. instagram_posts テーブル (Instagram投稿管理)
-- =====================================================

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

-- instagram_posts用のインデックス
CREATE INDEX IF NOT EXISTS idx_instagram_posts_visible ON instagram_posts(visible);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_display_order ON instagram_posts(display_order);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_created_at ON instagram_posts(created_at);

-- instagram_posts用の更新日時自動更新トリガー
DROP TRIGGER IF EXISTS update_instagram_posts_updated_at ON instagram_posts;
CREATE TRIGGER update_instagram_posts_updated_at 
    BEFORE UPDATE ON instagram_posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. lesson_status テーブル (レッスン状況管理)
-- =====================================================

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

-- lesson_status用のインデックス
CREATE INDEX IF NOT EXISTS idx_lesson_status_date ON lesson_status(date);
CREATE INDEX IF NOT EXISTS idx_lesson_status_basic_status ON lesson_status(basic_status);
CREATE INDEX IF NOT EXISTS idx_lesson_status_advance_status ON lesson_status(advance_status);

-- lesson_status用の更新日時自動更新トリガー
DROP TRIGGER IF EXISTS update_lesson_status_updated_at ON lesson_status;
CREATE TRIGGER update_lesson_status_updated_at 
    BEFORE UPDATE ON lesson_status 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. admin_settings テーブル (管理画面設定)
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- admin_settings用のインデックス
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);

-- admin_settings用の更新日時自動更新トリガー
DROP TRIGGER IF EXISTS update_admin_settings_updated_at ON admin_settings;
CREATE TRIGGER update_admin_settings_updated_at 
    BEFORE UPDATE ON admin_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. Row Level Security (RLS) 設定
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
-- 6. サンプルデータ (開発・テスト用)
-- =====================================================

-- サンプル記事
INSERT INTO articles (title, content, summary, category, status, featured) VALUES
('RBS陸上教室開校のお知らせ', '2024年4月より、RBS陸上教室を開校いたします...', '新しい陸上教室が開校します', 'notice', 'published', true),
('春季体験レッスンのご案内', '4月中は無料体験レッスンを実施いたします...', '無料体験レッスン開催中', 'event', 'published', false),
('雨天時のレッスンについて', '雨天時は室内でのレッスンに変更いたします...', '雨天時の対応について', 'lesson', 'published', false)
ON CONFLICT DO NOTHING;

-- 今日のレッスン状況サンプル
INSERT INTO lesson_status (date, basic_status, advance_status, global_message) VALUES
(CURRENT_DATE, 'scheduled', 'scheduled', '本日のレッスンは通常通り開催いたします。')
ON CONFLICT (date) DO NOTHING;

-- 管理画面設定サンプル
INSERT INTO admin_settings (key, value, description) VALUES
('site_settings', '{"title": "RBS陸上教室", "version": "1.0.0"}', 'サイト基本設定'),
('notification_settings', '{"enabled": true, "email": "admin@rbs.example.com"}', '通知設定')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 7. 便利なビュー
-- =====================================================

-- 公開記事のビュー
CREATE OR REPLACE VIEW published_articles AS
SELECT 
  id,
  title,
  content,
  summary,
  category,
  featured,
  published_at,
  created_at,
  updated_at
FROM articles 
WHERE status = 'published'
ORDER BY published_at DESC, created_at DESC;

-- 表示中のInstagram投稿のビュー
CREATE OR REPLACE VIEW visible_instagram_posts AS
SELECT 
  id,
  url,
  embed_code,
  caption,
  display_order,
  created_at,
  updated_at
FROM instagram_posts 
WHERE visible = true
ORDER BY display_order ASC, created_at DESC;

-- 最新のレッスン状況のビュー
CREATE OR REPLACE VIEW current_lesson_status AS
SELECT 
  date,
  basic_status,
  basic_message,
  advance_status,
  advance_message,
  global_message,
  created_at,
  updated_at
FROM lesson_status 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;

-- =====================================================
-- 8. 関数
-- =====================================================

-- 記事統計を取得する関数
CREATE OR REPLACE FUNCTION get_article_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', (SELECT COUNT(*) FROM articles),
    'published', (SELECT COUNT(*) FROM articles WHERE status = 'published'),
    'draft', (SELECT COUNT(*) FROM articles WHERE status = 'draft'),
    'featured', (SELECT COUNT(*) FROM articles WHERE featured = true)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Instagram投稿統計を取得する関数
CREATE OR REPLACE FUNCTION get_instagram_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', (SELECT COUNT(*) FROM instagram_posts),
    'visible', (SELECT COUNT(*) FROM instagram_posts WHERE visible = true),
    'hidden', (SELECT COUNT(*) FROM instagram_posts WHERE visible = false)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- スキーマ作成完了
-- =====================================================

COMMENT ON TABLE articles IS 'ニュース記事管理テーブル';
COMMENT ON TABLE instagram_posts IS 'Instagram投稿管理テーブル';
COMMENT ON TABLE lesson_status IS 'レッスン開催状況管理テーブル';
COMMENT ON TABLE admin_settings IS '管理画面設定テーブル'; 