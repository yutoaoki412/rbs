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
    const date = NewsUtils.formatDate(article.date || article.publishedAt || article.createdAt);
    
    // 概要文を生成（複数のフィールドから取得を試行）
    let excerptText = '';
    if (article.summary) {
      excerptText = article.summary;
    } else if (article.excerpt) {
      excerptText = article.excerpt;
    } else if (article.content) {
      excerptText = NewsUtils.generateExcerpt(article.content, 80);
    } else if (article.description) {
      excerptText = article.description;
    } else {
      excerptText = '記事の概要が設定されていません。';
    }
    
    console.log('🔍 概要文生成:', {
      articleId: article.id,
      summary: article.summary,
      excerpt: article.excerpt,
      contentLength: article.content ? article.content.length : 0,
      finalExcerpt: excerptText
    });
    
    // コンテキストに応じてクラスとコンテンツを設定
    let cardClasses = 'news-card';
    let adminActions = '';
    
    switch (context) {
      case 'homepage':
        cardClasses = 'news-card loading';
        break;
      case 'admin-recent':
        cardClasses = 'news-card admin-card recent-view';
        adminActions = NewsUtils._generateAdminActions(article, 'recent');
        break;
      case 'admin-list':
        cardClasses = 'news-card admin-card list-view';
        adminActions = NewsUtils._generateAdminActions(article, 'list');
        break;
      case 'admin-unified':
        cardClasses = 'news-card admin-card unified-view';
        adminActions = NewsUtils._generateAdminActions(article, 'unified');
        break;
      default:
        cardClasses = 'news-card fade-in';
        break;
    }
    
    return `
      <article class="${cardClasses}" data-article-id="${article.id}">
        <div class="news-card-header">
          <div class="news-meta">
            <div class="news-date">${date}</div>
            <div class="news-category ${article.category}">
              ${categoryInfo?.name || article.category}
            </div>

          </div>
          <h3 class="news-title">
            ${context.startsWith('admin') ? 
              `<span class="admin-title-text">${NewsUtils.escapeHtml(article.title)}</span>` :
              `<a href="news-detail.html?id=${article.id}">${NewsUtils.escapeHtml(article.title)}</a>`
            }
          </h3>
        </div>
        <div class="news-card-body">
          <p class="news-excerpt">${NewsUtils.escapeHtml(excerptText)}</p>
          <div class="news-actions">
            ${context.startsWith('admin') ? 
              adminActions :
              `<a href="news-detail.html?id=${article.id}" class="news-read-more">続きを読む</a>`
            }
          </div>
        </div>
      </article>
    `;
  }

  /**
   * 管理画面用アクションボタンを生成
   * @private
   * @param {Object} article - 記事データ
   * @param {string} mode - 表示モード（統一化により不要だが互換性のため残す）
   * @returns {string} アクションボタンHTML
   */
  static _generateAdminActions(article, mode) {
    const title = NewsUtils.escapeHtml(article.title);
    
    // プレビューボタンを削除し、編集と削除のみに変更
    const actions = `
      <button class="news-action-btn edit-btn" 
              data-action="edit-article" 
              data-id="${article.id}" 
              title="記事を編集"
              aria-label="記事「${title}」を編集">
        <i class="fas fa-edit"></i>
        <span class="action-text">編集</span>
      </button>
      <button class="news-action-btn delete-btn" 
              data-action="delete-article" 
              data-id="${article.id}" 
              title="記事を削除"
              aria-label="記事「${title}」を削除">
        <i class="fas fa-trash"></i>
        <span class="action-text">削除</span>
      </button>
    `;
    
    console.log(`🔧 _generateAdminActions - モード: ${mode}, 記事ID: ${article.id}, 生成したボタン数: 2`);
    
    return actions;
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
    
    // 改行を統一（\r\nや\rを\nに変換）
    let formattedContent = content.replace(/\r\n|\r/g, '\n');
    
    // ヘッダーの処理（段階的に処理 - h6からh1の順で処理）
    formattedContent = formattedContent
      .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
      .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
      .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // 太字・イタリックの処理
    formattedContent = formattedContent
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // リンクの処理
    formattedContent = formattedContent
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // 水平線の処理
    formattedContent = formattedContent
      .replace(/^---$/gm, '<hr>')
      .replace(/^\*\*\*$/gm, '<hr>')
      .replace(/^___$/gm, '<hr>');
    
    // コードブロックの処理
    formattedContent = formattedContent
      .replace(/```([^`]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 行ごとに処理してリストと段落を適切に生成
    const lines = formattedContent.split('\n');
    const processedLines = [];
    let inList = false;
    let listType = null; // 'ul' or 'ol'
    let inBlockquote = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 空行の処理
      if (!line) {
        if (inList) {
          processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
          inList = false;
          listType = null;
        }
        if (inBlockquote) {
          processedLines.push('</blockquote>');
          inBlockquote = false;
        }
        processedLines.push(''); // 空行を保持
        continue;
      }
      
      // 引用の処理
      const blockquoteMatch = line.match(/^>\s+(.*)$/);
      if (blockquoteMatch) {
        if (inList) {
          processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
          inList = false;
          listType = null;
        }
        if (!inBlockquote) {
          processedLines.push('<blockquote>');
          inBlockquote = true;
        }
        processedLines.push(`<p>${blockquoteMatch[1]}</p>`);
        continue;
      } else if (inBlockquote) {
        processedLines.push('</blockquote>');
        inBlockquote = false;
      }
      
      // ヘッダーまたは水平線の場合はそのまま追加
      if (line.match(/^<(h[1-6]|hr)>/)) {
        if (inList) {
          processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
          inList = false;
          listType = null;
        }
        processedLines.push(line);
        continue;
      }
      
      // リスト項目の処理
      const unorderedListMatch = line.match(/^[-*+]\s+(.*)$/);
      const orderedListMatch = line.match(/^(\d+)\.\s+(.*)$/);
      
      if (unorderedListMatch || orderedListMatch) {
        const isUnordered = !!unorderedListMatch;
        const currentListType = isUnordered ? 'ul' : 'ol';
        const listContent = isUnordered ? unorderedListMatch[1] : orderedListMatch[2];
        
        // リストタイプが変わった場合、前のリストを閉じる
        if (inList && listType !== currentListType) {
          processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
          inList = false;
        }
        
        // 新しいリストを開始
        if (!inList) {
          processedLines.push(currentListType === 'ul' ? '<ul>' : '<ol>');
          inList = true;
          listType = currentListType;
        }
        
        processedLines.push(`<li>${listContent}</li>`);
      } else {
        // 通常のテキスト
        if (inList) {
          processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
          inList = false;
          listType = null;
        }
        
        // コードブロックやヘッダーでなければ段落で囲む
        if (!line.match(/^<(pre|h[1-6]|ul|ol|li|blockquote|hr)/)) {
          processedLines.push(`<p>${line}</p>`);
        } else {
          processedLines.push(line);
        }
      }
    }
    
    // 最後のリストを閉じる
    if (inList) {
      processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
    }
    
    // 最後の引用を閉じる
    if (inBlockquote) {
      processedLines.push('</blockquote>');
    }
    
    // 連続する空の段落を削除し、結果を結合
    return processedLines
      .filter((line, index, array) => {
        // 空行と空段落の連続を避ける
        if (line === '' || line === '<p></p>') {
          const prevLine = array[index - 1];
          const nextLine = array[index + 1];
          // 前後が段落タグでない場合のみ空行を保持
          return !(prevLine && prevLine.match(/<\/(p|h[1-6]|ul|ol)>/)) && 
                 !(nextLine && nextLine.match(/^<(p|h[1-6]|ul|ol)/));
        }
        return true;
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n') // 3個以上の連続改行を2個に制限
      .trim();
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
  static generateExcerpt(content, maxLength = 100) {
    if (!content) return '';
    
    // HTMLタグとマークダウン記法を除去
    let textContent = content
      .replace(/<[^>]*>/g, '') // HTMLタグを除去
      .replace(/#{1,6}\s+/g, '') // マークダウンのヘッダーを除去（h1からh6まで）
      .replace(/\*\*(.*?)\*\*/g, '$1') // 太字マークダウンを除去
      .replace(/\*(.*?)\*/g, '$1') // イタリックマークダウンを除去
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // リンクマークダウンを除去
      .replace(/```[\s\S]*?```/g, '') // コードブロックを除去
      .replace(/`([^`]+)`/g, '$1') // インラインコードを除去
      .replace(/^\s*[-*+]\s+/gm, '') // リスト記号を除去
      .replace(/^\s*\d+\.\s+/gm, '') // 数字リスト記号を除去
      .replace(/^\s*>\s+/gm, '') // 引用記号を除去
      .replace(/^---$|^\*\*\*$|^___$/gm, '') // 水平線を除去
      .replace(/\n\s*\n/g, ' ') // 改行を空白に変換
      .replace(/\s+/g, ' ') // 複数の空白を1つに
      .trim();
    
    if (textContent.length <= maxLength) return textContent;
    
    // 単語境界で切り詰め（日本語対応）
    const truncated = textContent.substring(0, maxLength);
    
    // 最後の句読点や空白で区切る
    const lastPunctuation = Math.max(
      truncated.lastIndexOf('。'),
      truncated.lastIndexOf('、'),
      truncated.lastIndexOf('！'),
      truncated.lastIndexOf('？'),
      truncated.lastIndexOf(' ')
    );
    
    if (lastPunctuation > maxLength * 0.7) {
      return truncated.substring(0, lastPunctuation + 1);
    }
    
    return truncated + '...';
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

  /**
   * カードにアニメーションを適用
   */
  static applyCardAnimation(cards, delay = 100) {
    if (!cards || !cards.length) return;
    
    cards.forEach((card, index) => {
      setTimeout(() => {
        if (card.classList.contains('loading')) {
          card.classList.remove('loading');
          card.classList.add('fade-in');
        }
      }, index * delay);
    });
  }
}

export default NewsUtils; 