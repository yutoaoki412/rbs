/**
 * RBS陸上教室 記事フォーム管理システム
 * 記事の作成・編集フォームの操作とバリデーションを管理
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { Logger } from '../utils/Logger.js';

export class NewsFormManager extends EventEmitter {
  constructor() {
    super();
    
    this.logger = new Logger('NewsFormManager');
    this.currentArticle = null;
    this.formElements = {};
    this.autoSaveTimer = null;
    this.isEditing = false;
    
    this.init();
  }

  /**
   * フォーム管理システムの初期化
   */
  init() {
    this.cacheFormElements();
    this.setupFormValidation();
    this.setupAutoSave();
    this.setupEventListeners();
  }

  /**
   * フォーム要素のキャッシュ
   */
  cacheFormElements() {
    this.formElements = {
      form: document.getElementById('news-form'),
      id: document.getElementById('news-id'),
      title: document.getElementById('news-title'),
      category: document.getElementById('news-category'),
      date: document.getElementById('news-date'),
      summary: document.getElementById('news-summary'),
      content: document.getElementById('news-content'),
      featured: document.getElementById('news-featured'),
      status: document.getElementById('news-status'),
      editorTitle: document.getElementById('editor-title')
    };
  }

  /**
   * イベントリスナーの設定
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

    // Markdownエディタのヘルパー機能
    this.setupMarkdownHelpers();
  }

  /**
   * フォーム変更時の処理
   */
  onFormChange() {
    this.emit('formChanged', this.getFormData());
    this.scheduleAutoSave();
  }

  /**
   * 自動保存の設定
   */
  setupAutoSave() {
    this.autoSaveInterval = 30000; // 30秒
  }

  /**
   * 自動保存のスケジュール
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
   */
  autoSave() {
    const formData = this.getFormData();
    
    // 何かしらの入力がある場合のみ自動保存
    if (formData.title.trim() || formData.content.trim()) {
      try {
        localStorage.setItem('rbs_news_draft', JSON.stringify(formData));
        this.emit('autoSaved', formData);
        this.logger.debug('記事の自動保存を実行しました');
      } catch (error) {
        this.logger.error('自動保存エラー:', error);
      }
    }
  }

  /**
   * フォームバリデーションの設定
   */
  setupFormValidation() {
    this.validationRules = {
      title: {
        required: true,
        maxLength: 100,
        message: 'タイトルは必須です（100文字以内）'
      },
      content: {
        required: false,
        maxLength: 10000,
        message: '本文は10,000文字以内で入力してください'
      },
      summary: {
        required: false,
        maxLength: 200,
        message: '要約は200文字以内で入力してください'
      }
    };
  }

  /**
   * フォームデータの取得
   */
  getFormData() {
    return {
      id: this.formElements.id?.value || null,
      title: this.formElements.title?.value || '',
      category: this.formElements.category?.value || 'announcement',
      date: this.formElements.date?.value || new Date().toISOString().slice(0, 10),
      summary: this.formElements.summary?.value || '',
      content: this.formElements.content?.value || '',
      featured: this.formElements.featured?.checked || false,
      status: this.formElements.status?.value || 'draft'
    };
  }

  /**
   * 記事データをフォームに設定
   */
  populateForm(article) {
    if (!article) {
      this.logger.warn('populateForm: 記事データが無効です');
      return;
    }

    this.logger.debug('記事データをフォームに入力中:', article.title);
    this.currentArticle = article;
    this.isEditing = true;

    // 各フィールドに値を設定
    const mappings = [
      { element: this.formElements.id, value: article.id || '', type: 'value' },
      { element: this.formElements.title, value: article.title || '', type: 'value' },
      { element: this.formElements.category, value: article.category || 'announcement', type: 'value' },
      { element: this.formElements.date, value: article.date || article.createdAt?.split('T')[0] || '', type: 'value' },
      { element: this.formElements.summary, value: article.summary || '', type: 'value' },
      { element: this.formElements.content, value: article.content || '', type: 'value' },
      { element: this.formElements.featured, value: article.featured || false, type: 'checked' },
      { element: this.formElements.status, value: article.status || 'draft', type: 'value' }
    ];

    mappings.forEach(mapping => {
      const { element, value, type } = mapping;
      if (element) {
        if (type === 'checked') {
          element.checked = value;
        } else {
          element.value = value;
        }
      }
    });

    // エディタのタイトルを更新
    this.updateEditorTitle('記事編集');
    
    // フォーカスをタイトルフィールドに設定
    if (this.formElements.title) {
      setTimeout(() => this.formElements.title.focus(), 100);
    }

    this.emit('articleLoaded', article);
  }

  /**
   * フォームのクリア
   */
  clearForm() {
    const defaultValues = {
      id: '',
      title: '',
      category: 'announcement',
      date: new Date().toISOString().slice(0, 10),
      summary: '',
      content: '',
      featured: false,
      status: 'draft'
    };

    Object.keys(defaultValues).forEach(key => {
      const element = this.formElements[key];
      if (element) {
        if (typeof defaultValues[key] === 'boolean') {
          element.checked = defaultValues[key];
        } else {
          element.value = defaultValues[key];
        }
      }
    });

    this.currentArticle = null;
    this.isEditing = false;
    this.updateEditorTitle('新規記事作成');
    
    // 自動保存されたデータも削除
    localStorage.removeItem('rbs_news_draft');
    
    this.emit('formCleared');
  }

  /**
   * エディタタイトルの更新
   */
  updateEditorTitle(title) {
    if (this.formElements.editorTitle) {
      this.formElements.editorTitle.textContent = title;
    }
  }

  /**
   * フォームバリデーション
   */
  validateForm() {
    const formData = this.getFormData();
    const errors = [];

    Object.keys(this.validationRules).forEach(field => {
      const rule = this.validationRules[field];
      const value = formData[field] || '';

      if (rule.required && !value.trim()) {
        errors.push(rule.message);
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(rule.message);
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors,
      data: formData
    };
  }

  /**
   * 保存前のバリデーション
   */
  validateForSave() {
    const validation = this.validateForm();
    
    if (!validation.data.title.trim()) {
      validation.isValid = false;
      validation.errors.push('タイトルを入力してください');
    }

    return validation;
  }

  /**
   * 公開前のバリデーション
   */
  validateForPublish() {
    const validation = this.validateForSave();
    
    if (!validation.data.content.trim()) {
      validation.isValid = false;
      validation.errors.push('本文を入力してください');
    }

    return validation;
  }

  /**
   * Markdownヘルパーの設定
   */
  setupMarkdownHelpers() {
    // Markdownエディタでのヘルパー機能を提供
    this.markdownHelpers = {
      insertBold: () => this.insertMarkdown('**', '**'),
      insertItalic: () => this.insertMarkdown('*', '*'),
      insertHeading: (level = 2) => this.insertMarkdown(`${'#'.repeat(level)} `, ''),
      insertLink: () => this.insertMarkdown('[', '](URL)'),
      insertList: () => this.insertMarkdown('- ', ''),
      insertCode: () => this.insertMarkdown('`', '`'),
      insertCodeBlock: () => this.insertMarkdown('```\n', '\n```')
    };
  }

  /**
   * Markdownの挿入
   */
  insertMarkdown(before, after = '') {
    const textarea = this.formElements.content;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    const replacement = before + selectedText + after;
    textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);

    // カーソル位置を調整
    const newPosition = start + before.length + selectedText.length;
    textarea.setSelectionRange(newPosition, newPosition);
    textarea.focus();

    this.onFormChange();
  }

  /**
   * 自動保存されたデータの復元
   */
  restoreAutoSavedData() {
    try {
      const savedData = localStorage.getItem('rbs_news_draft');
      if (savedData) {
        const data = JSON.parse(savedData);
        this.populateForm(data);
        this.emit('autoSavedDataRestored', data);
        return true;
      }
    } catch (error) {
      this.logger.error('自動保存データの復元エラー:', error);
    }
    return false;
  }

  /**
   * 破棄処理
   */
  destroy() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    this.removeAllListeners();
    this.logger.info('NewsFormManagerを破棄しました');
  }
} 