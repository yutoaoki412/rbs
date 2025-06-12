/**
 * ニュース関連の定数定義
 * @version 1.0.0
 */

export const NEWS_CONFIG = {
  RELATED_ARTICLES_LIMIT: 3,
  EXCERPT_LENGTH: 80,
  DESCRIPTION_LENGTH: 150
};

export const CATEGORY_COLORS = {
  announcement: '#4299e1',
  event: '#38b2ac', 
  media: '#9f7aea',
  important: '#f56565'
};

export const SHARE_CONFIG = {
  TWITTER_INTENT_URL: 'https://twitter.com/intent/tweet',
  FACEBOOK_SHARE_URL: 'https://www.facebook.com/sharer/sharer.php',
  LINE_SHARE_URL: 'https://social-plugins.line.me/lineit/share'
};

export const META_TAGS = {
  SITE_NAME: 'RBS陸上教室',
  DEFAULT_IMAGE: './assets/images/lp-logo.png',
  DEFAULT_DESCRIPTION: 'RBS陸上教室のニュース詳細'
};

export const ERROR_MESSAGES = {
  ARTICLE_NOT_FOUND: '指定された記事は存在しないか、削除された可能性があります。',
  LOAD_FAILED: '記事の読み込みに失敗しました',
  CONTENT_FAILED: 'コンテンツの取得に失敗しました',
  INVALID_ID: '記事IDが指定されていないか、無効です。',
  SERVICE_INIT_FAILED: 'ArticleServiceの初期化に失敗しました'
}; 