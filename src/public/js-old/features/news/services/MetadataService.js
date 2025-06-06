/**
 * メタデータサービス
 * ページのメタデータ（title、description、OGP等）を管理
 * @version 1.0.0
 */

import { stripHtml } from '../../../shared/utils/htmlUtils.js';
import { META_TAGS } from '../../../shared/constants/newsConstants.js';

export default class MetadataService {
  /**
   * 記事のメタデータを更新
   * @param {Object} article - 記事データ
   */
  updateMetadata(article) {
    const textContent = this.extractTextContent(article);
    
    // ページタイトルを更新
    this.updatePageTitle(article.title);
    
    // メタタグを更新
    this.updateMetaTags(textContent, article);
    
    // OGPタグを更新
    this.updateOGPTags(article, textContent);
    
    // Twitter Cardタグを更新
    this.updateTwitterTags(article, textContent);
    
    console.log('✅ メタデータ更新完了');
  }

  /**
   * 記事からテキストコンテンツを抽出
   * @param {Object} article - 記事データ
   * @returns {string}
   */
  extractTextContent(article) {
    const content = article.content || article.summary || article.excerpt || '';
    return stripHtml(content).substring(0, 150);
  }

  /**
   * ページタイトルを更新
   * @param {string} title - 記事タイトル
   */
  updatePageTitle(title) {
    document.title = `${title} - ${META_TAGS.SITE_NAME}`;
  }

  /**
   * 基本メタタグを更新
   * @param {string} textContent - テキストコンテンツ
   * @param {Object} article - 記事データ
   */
  updateMetaTags(textContent, article) {
    this.updateMetaTag('description', textContent || META_TAGS.DEFAULT_DESCRIPTION);
    this.updateMetaTag('keywords', `${META_TAGS.SITE_NAME}, 陸上教室, お知らせ, ${article.category || ''}`);
  }

  /**
   * OGPタグを更新
   * @param {Object} article - 記事データ
   * @param {string} textContent - テキストコンテンツ
   */
  updateOGPTags(article, textContent) {
    this.updateOGPTag('title', article.title);
    this.updateOGPTag('description', textContent || META_TAGS.DEFAULT_DESCRIPTION);
    this.updateOGPTag('type', 'article');
    this.updateOGPTag('url', window.location.href);
    this.updateOGPTag('image', META_TAGS.DEFAULT_IMAGE);
    this.updateOGPTag('site_name', META_TAGS.SITE_NAME);
  }

  /**
   * Twitter Cardタグを更新
   * @param {Object} article - 記事データ
   * @param {string} textContent - テキストコンテンツ
   */
  updateTwitterTags(article, textContent) {
    this.updateTwitterTag('card', 'summary_large_image');
    this.updateTwitterTag('title', article.title);
    this.updateTwitterTag('description', textContent || META_TAGS.DEFAULT_DESCRIPTION);
    this.updateTwitterTag('image', META_TAGS.DEFAULT_IMAGE);
  }

  /**
   * メタタグを更新
   * @param {string} name - メタタグ名
   * @param {string} content - コンテンツ
   */
  updateMetaTag(name, content) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  /**
   * OGPタグを更新
   * @param {string} property - プロパティ名
   * @param {string} content - コンテンツ
   */
  updateOGPTag(property, content) {
    let meta = document.querySelector(`meta[property="og:${property}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', `og:${property}`);
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  /**
   * Twitter Cardタグを更新
   * @param {string} name - タグ名
   * @param {string} content - コンテンツ
   */
  updateTwitterTag(name, content) {
    let meta = document.querySelector(`meta[name="twitter:${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = `twitter:${name}`;
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  /**
   * 全メタデータをリセット
   */
  resetMetadata() {
    // デフォルトのタイトルに戻す
    document.title = META_TAGS.SITE_NAME;
    
    // メタタグをリセット
    this.updateMetaTag('description', META_TAGS.DEFAULT_DESCRIPTION);
    this.updateMetaTag('keywords', META_TAGS.SITE_NAME);
    
    // OGPタグをリセット
    this.updateOGPTag('title', META_TAGS.SITE_NAME);
    this.updateOGPTag('description', META_TAGS.DEFAULT_DESCRIPTION);
    this.updateOGPTag('type', 'website');
    this.updateOGPTag('url', window.location.origin);
    this.updateOGPTag('image', META_TAGS.DEFAULT_IMAGE);
    this.updateOGPTag('site_name', META_TAGS.SITE_NAME);
    
    // Twitter Cardタグをリセット
    this.updateTwitterTag('card', 'summary');
    this.updateTwitterTag('title', META_TAGS.SITE_NAME);
    this.updateTwitterTag('description', META_TAGS.DEFAULT_DESCRIPTION);
    this.updateTwitterTag('image', META_TAGS.DEFAULT_IMAGE);
  }

  /**
   * 現在のメタデータを取得
   * @returns {Object}
   */
  getCurrentMetadata() {
    return {
      title: document.title,
      description: this.getMetaContent('description'),
      keywords: this.getMetaContent('keywords'),
      ogTitle: this.getOGPContent('title'),
      ogDescription: this.getOGPContent('description'),
      ogType: this.getOGPContent('type'),
      ogUrl: this.getOGPContent('url'),
      ogImage: this.getOGPContent('image'),
      ogSiteName: this.getOGPContent('site_name'),
      twitterCard: this.getTwitterContent('card'),
      twitterTitle: this.getTwitterContent('title'),
      twitterDescription: this.getTwitterContent('description'),
      twitterImage: this.getTwitterContent('image')
    };
  }

  /**
   * メタタグのコンテンツを取得
   * @param {string} name - メタタグ名
   * @returns {string}
   */
  getMetaContent(name) {
    const meta = document.querySelector(`meta[name="${name}"]`);
    return meta ? meta.content : '';
  }

  /**
   * OGPタグのコンテンツを取得
   * @param {string} property - プロパティ名
   * @returns {string}
   */
  getOGPContent(property) {
    const meta = document.querySelector(`meta[property="og:${property}"]`);
    return meta ? meta.content : '';
  }

  /**
   * Twitter Cardタグのコンテンツを取得
   * @param {string} name - タグ名
   * @returns {string}
   */
  getTwitterContent(name) {
    const meta = document.querySelector(`meta[name="twitter:${name}"]`);
    return meta ? meta.content : '';
  }
} 