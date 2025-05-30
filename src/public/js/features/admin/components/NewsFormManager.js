/**
 * ニュースフォーム管理コンポーネント
 * 記事編集フォームの管理とバリデーションを担当
 * @version 2.0.0
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import { CONFIG } from '../../../shared/constants/config.js';
import { articleDataService } from '../services/ArticleDataService.js';
import { querySelector, show, hide, setValue, getValue } from '../../../shared/utils/domUtils.js';
import { escapeHtml, truncate } from '../../../shared/utils/stringUtils.js';
import { createErrorMessage, createSuccessMessage } from '../../../shared/utils/htmlUtils.js';

export class NewsFormManager {
  constructor() {
    this.initialized = false;
    this.currentArticle = null;
    this.formElements = {};
    this.autoSaveTimer = null;
    this.isEditing = false;
    
    // フォーム設定
    this.autoSaveInterval = 30000; // 30秒
    this.maxTitleLength = 100;
    this.maxContentLength = 10000;
    this.maxSummaryLength = 200;
  }

  /**
   * 初期化
   */
  init() {
    if (this.initialized) {
      console.log('⚠️ NewsFormManager: 既に初期化済み');
      return;
    }

    console.log('📝 NewsFormManager: 初期化開始');
    
    this.cacheFormElements();
    this.setupFormValidation();
    this.setupEventListeners();
    this.setupAutoSave();
    this.restoreAutoSavedData();
    
    this.initialized = true;
    console.log('✅ NewsFormManager: 初期化完了');
  }

  /**
   * フォーム要素のキャッシュ
   * @private
   */
  cacheFormElements() {
    this.formElements = {
      form: querySelector('#news-form, .news-form'),
      id: querySelector('#news-id, [name="id"]'),
      title: querySelector('#news-title, [name="title"]'),
      category: querySelector('#news-category, [name="category"]'),
      date: querySelector('#news-date, [name="date"]'),
      summary: querySelector('#news-summary, [name="summary"]'),
      content: querySelector('#news-content, [name="content"]'),
      featured: querySelector('#news-featured, [name="featured"]'),
      status: querySelector('#news-status, [name="status"]'),
      editorTitle: querySelector('#editor-title, .editor-title'),
      messageContainer: querySelector('#form-message, .form-message')
    };

    // メッセージコンテナがない場合は作成
    if (!this.formElements.messageContainer && this.formElements.form) {
      this.formElements.messageContainer = document.createElement('div');
      this.formElements.messageContainer.className = 'form-message';
      this.formElements.form.insertBefore(
        this.formElements.messageContainer, 
        this.formElements.form.firstChild
      );
    }

    console.log('📝 フォーム要素をキャッシュ:', Object.keys(this.formElements).length + '個');
  }

  /**
   * イベントリスナーの設定
   * @private
   */
  setupEventListeners() {
    // フォーム要素の変更を監視
    Object.keys(this.formElements).forEach(key => {
      const element = this.formElements[key];
      if (element && element.addEventListener) {
        element.addEventListener('input', () => this.onFormChange());
        element.addEventListener('change', () => this.onFormChange());
      }
    });

    // フォーム送信の監視
    if (this.formElements.form) {
      this.formElements.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    // Markdownエディタのヘルパー機能
    this.setupMarkdownHelpers();

    // 外部イベントの監視
    EventBus.on('article:saved', (data) => {
      this.handleArticleSaved(data);
    });

    console.log('📝 イベントリスナーを設定');
  }

  /**
   * フォーム変更時の処理
   * @private
   */
  onFormChange() {
    EventBus.emit('newsForm:changed', this.getFormData());
    this.scheduleAutoSave();
    this.updateCharacterCount();
  }

  /**
   * 文字数カウント更新
   * @private
   */
  updateCharacterCount() {
    const titleElement = this.formElements.title;
    const summaryElement = this.formElements.summary;
    const contentElement = this.formElements.content;

    if (titleElement) {
      const titleCount = titleElement.value.length;
      this.updateCountDisplay('title-count', titleCount, this.maxTitleLength);
    }

    if (summaryElement) {
      const summaryCount = summaryElement.value.length;
      this.updateCountDisplay('summary-count', summaryCount, this.maxSummaryLength);
    }

    if (contentElement) {
      const contentCount = contentElement.value.length;
      this.updateCountDisplay('content-count', contentCount, this.maxContentLength);
    }
  }

  /**
   * カウント表示を更新
   * @private
   * @param {string} elementId - 表示要素のID
   * @param {number} current - 現在の文字数
   * @param {number} max - 最大文字数
   */
  updateCountDisplay(elementId, current, max) {
    const countElement = querySelector(`#${elementId}`);
    if (countElement) {
      countElement.textContent = `${current}/${max}`;
      countElement.className = current > max ? 'count-over' : 'count-normal';
    }
  }

  /**
   * 自動保存の設定
   * @private
   */
  setupAutoSave() {
    // ページ離脱時の警告
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '保存されていない変更があります。ページを離れますか？';
      }
    });
  }

  /**
   * 自動保存のスケジュール
   * @private
   */
  scheduleAutoSave() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      this.autoSave();
    }, this.autoSaveInterval);
  }

  /**
   * 自動保存の実行
   * @private
   */
  autoSave() {
    const formData = this.getFormData();
    
    // 何かしらの入力がある場合のみ自動保存
    if (formData.title.trim() || formData.content.trim()) {
      try {
        localStorage.setItem('rbs_news_draft', JSON.stringify({
          ...formData,
          autoSavedAt: new Date().toISOString()
        }));
        
        EventBus.emit('newsForm:autoSaved', formData);
        this.showMessage('自動保存しました', 'info', 2000);
        
        console.log('💾 記事の自動保存を実行');
      } catch (error) {
        console.error('❌ 自動保存エラー:', error);
      }
    }
  }

  /**
   * フォームバリデーションの設定
   * @private
   */
  setupFormValidation() {
    this.validationRules = {
      title: {
        required: true,
        maxLength: this.maxTitleLength,
        message: `タイトルは必須です（${this.maxTitleLength}文字以内）`
      },
      content: {
        required: false,
        maxLength: this.maxContentLength,
        message: `本文は${this.maxContentLength.toLocaleString()}文字以内で入力してください`
      },
      summary: {
        required: false,
        maxLength: this.maxSummaryLength,
        message: `要約は${this.maxSummaryLength}文字以内で入力してください`
      }
    };
  }

  /**
   * フォームデータの取得
   * @returns {Object}
   */
  getFormData() {
    return {
      id: getValue(this.formElements.id) || null,
      title: getValue(this.formElements.title) || '',
      category: getValue(this.formElements.category) || 'news',
      date: getValue(this.formElements.date) || new Date().toISOString().slice(0, 10),
      excerpt: getValue(this.formElements.summary) || '',
      content: getValue(this.formElements.content) || '',
      featured: this.formElements.featured?.checked || false,
      status: getValue(this.formElements.status) || 'draft'
    };
  }

  /**
   * 記事データをフォームに設定
   * @param {Object} article - 記事データ
   */
  populateForm(article) {
    if (!article) {
      console.warn('populateForm: 記事データが無効です');
      return;
    }

    console.log('📝 記事データをフォームに入力中:', article.title);
    this.currentArticle = article;
    this.isEditing = true;

    // 各フィールドに値を設定
    const mappings = [
      { element: this.formElements.id, value: article.id || '', type: 'value' },
      { element: this.formElements.title, value: article.title || '', type: 'value' },
      { element: this.formElements.category, value: article.category || 'news', type: 'value' },
      { element: this.formElements.date, value: article.date || article.createdAt?.split('T')[0] || '', type: 'value' },
      { element: this.formElements.summary, value: article.excerpt || '', type: 'value' },
      { element: this.formElements.content, value: articleDataService.getArticleContent(article.id) || '', type: 'value' },
      { element: this.formElements.featured, value: article.featured || false, type: 'checked' },
      { element: this.formElements.status, value: article.status || 'draft', type: 'value' }
    ];

    mappings.forEach(mapping => {
      const { element, value, type } = mapping;
      if (element) {
        if (type === 'checked') {
          element.checked = value;
        } else {
          setValue(element, value);
        }
      }
    });

    // エディタのタイトルを更新
    this.updateEditorTitle(`記事編集: ${truncate(article.title, 30)}`);
    
    // フォーカスをタイトルフィールドに設定
    if (this.formElements.title) {
      setTimeout(() => this.formElements.title.focus(), 100);
    }

    this.updateCharacterCount();
    EventBus.emit('newsForm:articleLoaded', article);
  }

  /**
   * フォームのクリア
   */
  clearForm() {
    console.log('📝 フォームをクリア');
    
    // 各フィールドをクリア
    Object.keys(this.formElements).forEach(key => {
      const element = this.formElements[key];
      if (element && element.type) {
        if (element.type === 'checkbox') {
          element.checked = false;
        } else if (element.tagName === 'SELECT') {
          element.selectedIndex = 0;
        } else {
          setValue(element, '');
        }
      }
    });

    // デフォルト値を設定
    if (this.formElements.date) {
      setValue(this.formElements.date, new Date().toISOString().slice(0, 10));
    }
    if (this.formElements.category) {
      setValue(this.formElements.category, 'news');
    }
    if (this.formElements.status) {
      setValue(this.formElements.status, 'draft');
    }

    this.currentArticle = null;
    this.isEditing = false;
    this.updateEditorTitle('新規記事作成');
    this.updateCharacterCount();
    this.clearMessage();
    
    EventBus.emit('newsForm:cleared');
  }

  /**
   * エディタタイトルの更新
   * @param {string} title - タイトル
   */
  updateEditorTitle(title) {
    if (this.formElements.editorTitle) {
      this.formElements.editorTitle.textContent = title;
    }
    document.title = `${title} - RBS陸上教室 管理画面`;
  }

  /**
   * フォーム送信処理
   * @private
   */
  async handleFormSubmit() {
    try {
      const formData = this.getFormData();
      const validation = this.validateForm(formData);
      
      if (!validation.isValid) {
        this.showMessage(`入力エラー: ${validation.errors.join(', ')}`, 'error');
        return;
      }

      // ArticleDataServiceに保存を依頼
      const result = await articleDataService.saveArticle(formData, false);
      
      if (result.success) {
        this.showMessage(result.message, 'success');
        this.currentArticle = { ...formData, id: result.id };
        this.isEditing = true;
        setValue(this.formElements.id, result.id);
        
        // 自動保存データをクリア
        localStorage.removeItem('rbs_news_draft');
      } else {
        this.showMessage(result.message, 'error');
      }
    } catch (error) {
      console.error('❌ フォーム送信エラー:', error);
      this.showMessage('保存中にエラーが発生しました', 'error');
    }
  }

  /**
   * 記事保存完了時の処理
   * @private
   * @param {Object} data - 保存されたデータ
   */
  handleArticleSaved(data) {
    // データの検証
    if (!data || typeof data !== 'object') {
      console.warn('📝 NewsFormManager: 無効なデータが渡されました', data);
      return;
    }

    const { article, isNew, published } = data;
    
    // articleオブジェクトの検証
    if (!article || !article.id) {
      console.warn('📝 NewsFormManager: 記事データが不正です', data);
      return;
    }
    
    if (article.id === this.currentArticle?.id) {
      this.currentArticle = article;
      if (isNew) {
        setValue(this.formElements.id, article.id);
        this.isEditing = true;
      }
      
      const message = published ? '記事を公開しました' : '記事を保存しました';
      this.showMessage(message, 'success');
    }
  }

  /**
   * フォームバリデーション
   * @param {Object} data - フォームデータ
   * @returns {{isValid: boolean, errors: Array}}
   */
  validateForm(data) {
    const errors = [];
    
    // タイトル検証
    if (!data.title || data.title.trim().length === 0) {
      errors.push('タイトルは必須です');
    } else if (data.title.length > this.maxTitleLength) {
      errors.push(`タイトルは${this.maxTitleLength}文字以内で入力してください`);
    }
    
    // 要約検証
    if (data.excerpt && data.excerpt.length > this.maxSummaryLength) {
      errors.push(`要約は${this.maxSummaryLength}文字以内で入力してください`);
    }
    
    // 本文検証
    if (data.content && data.content.length > this.maxContentLength) {
      errors.push(`本文は${this.maxContentLength.toLocaleString()}文字以内で入力してください`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 公開用バリデーション
   * @returns {{isValid: boolean, errors: Array}}
   */
  validateForPublish() {
    const data = this.getFormData();
    const baseValidation = this.validateForm(data);
    const errors = [...baseValidation.errors];
    
    // 公開時は要約が必須
    if (!data.excerpt || data.excerpt.trim().length === 0) {
      errors.push('記事を公開するには要約が必要です');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Markdownヘルパーの設定
   * @private
   */
  setupMarkdownHelpers() {
    // Markdownショートカット
    if (this.formElements.content) {
      this.formElements.content.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
          switch (e.key) {
            case 'b':
              e.preventDefault();
              this.insertMarkdown('**', '**');
              break;
            case 'i':
              e.preventDefault();
              this.insertMarkdown('*', '*');
              break;
          }
        }
      });
    }
  }

  /**
   * Markdownテキスト挿入
   * @param {string} before - 前に挿入するテキスト
   * @param {string} after - 後に挿入するテキスト
   */
  insertMarkdown(before, after = '') {
    const textarea = this.formElements.content;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const replacement = before + selectedText + after;

    textarea.setRangeText(replacement, start, end);
    textarea.focus();
    textarea.setSelectionRange(
      start + before.length,
      start + before.length + selectedText.length
    );
    
    this.onFormChange();
  }

  /**
   * 自動保存データの復元
   * @private
   */
  restoreAutoSavedData() {
    try {
      const saved = localStorage.getItem('rbs_news_draft');
      if (saved) {
        const data = JSON.parse(saved);
        const autoSavedAt = new Date(data.autoSavedAt);
        const now = new Date();
        const diffMinutes = (now - autoSavedAt) / (1000 * 60);
        
        // 1時間以内の自動保存データのみ復元
        if (diffMinutes < 60) {
          this.populateForm(data);
          this.showMessage(
            `${Math.round(diffMinutes)}分前の自動保存データを復元しました`,
            'info'
          );
        } else {
          localStorage.removeItem('rbs_news_draft');
        }
      }
    } catch (error) {
      console.error('❌ 自動保存データの復元に失敗:', error);
      localStorage.removeItem('rbs_news_draft');
    }
  }

  /**
   * 未保存の変更があるかチェック
   * @returns {boolean}
   */
  hasUnsavedChanges() {
    const formData = this.getFormData();
    return formData.title.trim() !== '' || formData.content.trim() !== '';
  }

  /**
   * メッセージ表示
   * @param {string} message - メッセージ
   * @param {string} type - タイプ ('success', 'error', 'info')
   * @param {number} duration - 表示時間（ミリ秒）
   */
  showMessage(message, type = 'info', duration = 5000) {
    if (!this.formElements.messageContainer) return;

    let html = '';
    switch (type) {
      case 'success':
        html = createSuccessMessage(message);
        break;
      case 'error':
        html = createErrorMessage({ 
          title: 'エラー', 
          message: escapeHtml(message) 
        });
        break;
      default:
        html = `<div class="message ${type}">${escapeHtml(message)}</div>`;
    }

    this.formElements.messageContainer.innerHTML = html;

    if (duration > 0) {
      setTimeout(() => {
        this.clearMessage();
      }, duration);
    }
  }

  /**
   * メッセージクリア
   */
  clearMessage() {
    if (this.formElements.messageContainer) {
      this.formElements.messageContainer.innerHTML = '';
    }
  }

  /**
   * 破棄処理
   */
  destroy() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    
    this.currentArticle = null;
    this.formElements = {};
    this.initialized = false;
    
    console.log('🗑️ NewsFormManager: 破棄完了');
  }

  // === ログメソッド ===

  /**
   * ログ出力
   * @private
   */
  log(...args) {
    console.log('📝 NewsFormManager:', ...args);
  }

  /**
   * デバッグログ出力
   * @private
   */
  debug(...args) {
    if (CONFIG.debug?.enabled) {
      console.debug('🔍 NewsFormManager:', ...args);
    }
  }

  /**
   * 警告ログ出力
   * @private
   */
  warn(...args) {
    console.warn('⚠️ NewsFormManager:', ...args);
  }

  /**
   * エラーログ出力
   * @private
   */
  error(...args) {
    console.error('❌ NewsFormManager:', ...args);
  }
}

// シングルトンインスタンス
export const newsFormManager = new NewsFormManager(); 