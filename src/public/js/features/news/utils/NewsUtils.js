/**
 * ニュース機能ユーティリティ
 * 共通のヘルパー関数とフォーマッター
 * @version 4.0.0
 */

import { CONFIG } from '../../../shared/constants/config.js';

export class NewsUtils {
  /**
   * 記事カードを生成
   */
  static createArticleCard(article, context = 'default') {
    const categoryInfo = CONFIG.articles.categories[article.category];
    const date = NewsUtils.formatDate(article.date || article.publishedAt);
    const excerpt = NewsUtils.generateExcerpt(article.content || article.summary || '', 120);
    
    return `
      <article class="news-card fade-in">
        <div class="news-card-header">
          <div class="news-meta">
            <div class="news-date">${date}</div>
            <div class="news-category ${article.category}" style="background-color: ${categoryInfo?.color || '#666'}">
              ${categoryInfo?.name || article.category}
            </div>
          </div>
          <h3 class="news-title">
            <a href="news-detail.html?id=${article.id}">${NewsUtils.escapeHtml(article.title)}</a>
          </h3>
        </div>
        <div class="news-card-body">
          ${excerpt ? `<p class="news-excerpt">${NewsUtils.escapeHtml(excerpt)}</p>` : ''}
          <div class="news-actions">
            <a href="news-detail.html?id=${article.id}" class="news-read-more">
              続きを読む
            </a>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * 空状態のHTMLを作成
   */
  static createEmptyState() {
    return `
      <div class="no-news">
        <i class="fas fa-newspaper"></i>
        <p>まだニュースがありません</p>
      </div>
    `;
  }

  /**
   * 本文をフォーマット
   */
  static formatContent(content) {
    if (!content) return '<p>記事の内容がありません。</p>';
    
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .split('\n')
      .map(line => line.trim() ? `<p>${line}</p>` : '')
      .join('');
  }

  /**
   * 日付をフォーマット
   */
  static formatDate(dateString) {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * HTMLエスケープ
   */
  static escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * クリップボードにコピー
   */
  static async copyToClipboard(text) {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        NewsUtils.showNotification('URLをコピーしました', 'success');
      } else {
        // フォールバック
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (success) {
          NewsUtils.showNotification('URLをコピーしました', 'success');
        } else {
          throw new Error('コピーに失敗しました');
        }
      }
    } catch (error) {
      console.error('❌ クリップボードコピーエラー:', error);
      NewsUtils.showNotification('コピーに失敗しました', 'error');
    }
  }

  /**
   * 通知を表示
   */
  static showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      background-color: ${type === 'error' ? '#e53e3e' : '#38a169'};
      animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // アニメーション用CSS追加
    if (!document.getElementById('news-utils-styles')) {
      const style = document.createElement('style');
      style.id = 'news-utils-styles';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // 3秒後に削除
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * カテゴリー情報を取得
   */
  static getCategoryInfo(categoryKey) {
    return CONFIG.articles.categories[categoryKey] || {
      name: categoryKey,
      color: '#666'
    };
  }

  /**
   * 記事の抜粋を生成
   */
  static generateExcerpt(content, maxLength = 150) {
    if (!content) return '';
    
    // HTMLタグを除去
    const textContent = content.replace(/<[^>]*>/g, '');
    
    if (textContent.length <= maxLength) return textContent;
    
    // 単語境界で切り詰め
    const truncated = textContent.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
  }

  /**
   * 記事のURL生成
   */
  static generateArticleUrl(articleId, baseUrl = '') {
    return `${baseUrl}news-detail.html?id=${articleId}`;
  }

  /**
   * 相対時間を表示
   */
  static getRelativeTime(dateString) {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return '1時間以内';
      if (diffInHours < 24) return `${diffInHours}時間前`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}日前`;
      
      const diffInWeeks = Math.floor(diffInDays / 7);
      if (diffInWeeks < 4) return `${diffInWeeks}週間前`;
      
      const diffInMonths = Math.floor(diffInDays / 30);
      if (diffInMonths < 12) return `${diffInMonths}ヶ月前`;
      
      const diffInYears = Math.floor(diffInDays / 365);
      return `${diffInYears}年前`;
      
    } catch {
      return dateString;
    }
  }

  /**
   * 記事が新着かどうか判定
   */
  static isNewArticle(dateString, daysThreshold = 7) {
    if (!dateString) return false;
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      return diffInDays <= daysThreshold;
    } catch {
      return false;
    }
  }

  /**
   * デバッグ情報を出力
   */
  static debugArticle(article) {
    if (!CONFIG.debug.enabled) return;
    
    console.group(`📰 記事デバッグ: ${article.title}`);
    console.log('ID:', article.id);
    console.log('カテゴリー:', article.category);
    console.log('公開日:', article.date || article.publishedAt);
    console.log('注目記事:', article.featured ? 'はい' : 'いいえ');
    console.log('サマリー:', article.summary || 'なし');
    console.log('新着:', NewsUtils.isNewArticle(article.date || article.publishedAt) ? 'はい' : 'いいえ');
    console.groupEnd();
  }
}

export default NewsUtils; 