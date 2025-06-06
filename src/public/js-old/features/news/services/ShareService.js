/**
 * シェアサービス
 * SNSシェア機能を提供
 * @version 1.0.0
 */

import { generateShareUrl, copyCurrentUrl, openInNewTab } from '../../../shared/utils/urlUtils.js';
import { SHARE_CONFIG, META_TAGS } from '../../../shared/constants/newsConstants.js';
import NotificationService from '../../../shared/services/NotificationService.js';

export default class ShareService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * 統一されたシェアメソッド（NewsActionServiceから呼び出し用）
   * @param {string} platform - プラットフォーム名
   * @param {Object} options - シェアオプション
   * @param {string} options.url - シェアするURL
   * @param {string} options.text - シェアテキスト
   */
  async share(platform, options) {
    const { url, text } = options;
    
    // 記事風のオブジェクトを作成
    const articleLike = {
      title: text || document.title,
      url: url || window.location.href
    };
    
    switch (platform) {
      case 'twitter':
        await this.shareTwitter(articleLike);
        break;
      case 'facebook':
        await this.shareFacebook(articleLike);
        break;
      case 'line':
        await this.shareLine(articleLike);
        break;
      default:
        console.warn(`未対応のプラットフォーム: ${platform}`);
        this.notificationService.showError(`${platform}でのシェアには対応していません`);
    }
  }

  /**
   * Twitterでシェア
   * @param {Object} article - 記事データ
   */
  async shareTwitter(article) {
    if (!article) {
      console.warn('記事データが設定されていません');
      return;
    }
    
    const text = `${article.title} - ${META_TAGS.SITE_NAME}`;
    const shareUrl = generateShareUrl('twitter', {
      url: window.location.href,
      text: text
    });
    
    const opened = openInNewTab(shareUrl, '_blank', 'width=600,height=400');
    
    if (opened) {
      console.log('Twitter シェア成功');
      this.notificationService.showSuccess('Twitterでシェアしました');
    } else {
      console.warn('Twitter シェア失敗');
      this.notificationService.showError('Twitterでのシェアに失敗しました');
    }
  }

  /**
   * Facebookでシェア
   * @param {Object} article - 記事データ
   */
  async shareFacebook(article) {
    if (!article) {
      console.warn('記事データが設定されていません');
      return;
    }
    
    const shareUrl = generateShareUrl('facebook', {
      url: window.location.href
    });
    
    const opened = openInNewTab(shareUrl, '_blank', 'width=600,height=400');
    
    if (opened) {
      console.log('Facebook シェア成功');
      this.notificationService.showSuccess('Facebookでシェアしました');
    } else {
      console.warn('Facebook シェア失敗');
      this.notificationService.showError('Facebookでのシェアに失敗しました');
    }
  }

  /**
   * LINEでシェア
   * @param {Object} article - 記事データ
   */
  async shareLine(article) {
    if (!article) {
      console.warn('記事データが設定されていません');
      return;
    }
    
    const text = `${article.title} - ${META_TAGS.SITE_NAME}`;
    const shareUrl = generateShareUrl('line', {
      url: window.location.href,
      text: text
    });
    
    const opened = openInNewTab(shareUrl, '_blank', 'width=600,height=400');
    
    if (opened) {
      console.log('LINE シェア成功');
      this.notificationService.showSuccess('LINEでシェアしました');
    } else {
      console.warn('LINE シェア失敗');
      this.notificationService.showError('LINEでのシェアに失敗しました');
    }
  }

  /**
   * URLをクリップボードにコピー
   */
  async copyUrl() {
    try {
      const success = await copyCurrentUrl();
      
      if (success) {
        console.log('URL コピー成功');
        this.notificationService.showSuccess('URLをコピーしました');
      } else {
        throw new Error('クリップボードへのコピーに失敗');
      }
    } catch (error) {
      console.error('URL コピー失敗:', error);
      this.notificationService.showError('URLのコピーに失敗しました');
      
      // フォールバック: プロンプトでURLを表示
      this.showUrlPrompt();
    }
  }

  /**
   * URLをプロンプトで表示（フォールバック）
   */
  showUrlPrompt() {
    const url = window.location.href;
    prompt('URLをコピーしてください:', url);
  }

  /**
   * ネイティブシェア機能を使用（対応ブラウザのみ）
   * @param {Object} article - 記事データ
   * @returns {Promise<boolean>} シェア成功フラグ
   */
  async shareNative(article) {
    if (!navigator.share) {
      console.log('ネイティブシェア機能は対応していません');
      return false;
    }

    try {
      await navigator.share({
        title: article.title,
        text: `${article.title} - ${META_TAGS.SITE_NAME}`,
        url: window.location.href
      });
      
      console.log('ネイティブシェア成功');
      this.notificationService.showSuccess('シェアしました');
      return true;
      
    } catch (error) {
      console.error('ネイティブシェア失敗:', error);
      this.notificationService.showError('シェアに失敗しました');
      return false;
    }
  }

  /**
   * 利用可能なシェア方法をチェック
   * @returns {Object} 利用可能な機能フラグ
   */
  getAvailableShareMethods() {
    return {
      native: !!navigator.share,
      clipboard: !!navigator.clipboard?.writeText,
      twitter: true,
      facebook: true,
      line: true
    };
  }

  /**
   * シェアURLを生成（外部利用向け）
   * @param {string} platform - プラットフォーム
   * @param {Object} article - 記事データ
   * @returns {string} シェアURL
   */
  generateShareUrl(platform, article) {
    const text = `${article.title} - ${META_TAGS.SITE_NAME}`;
    return generateShareUrl(platform, {
      url: window.location.href,
      text: text
    });
  }

  /**
   * 複数プラットフォームで同時シェア
   * @param {string[]} platforms - プラットフォームリスト
   * @param {Object} article - 記事データ
   */
  async shareMultiple(platforms, article) {
    const results = [];
    
    for (const platform of platforms) {
      try {
        switch (platform) {
          case 'twitter':
            await this.shareTwitter(article);
            results.push({ platform, success: true });
            break;
          case 'facebook':
            await this.shareFacebook(article);
            results.push({ platform, success: true });
            break;
          case 'line':
            await this.shareLine(article);
            results.push({ platform, success: true });
            break;
          default:
            results.push({ platform, success: false, error: 'Unknown platform' });
        }
      } catch (error) {
        results.push({ platform, success: false, error: error.message });
      }
    }
    
    return results;
  }
} 