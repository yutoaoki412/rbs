/**
 * レッスン状況管理モジュール
 * レッスン状況タブの全機能を統合管理
 * @version 1.0.0 - 統合リファクタリング版
 */

import { getLessonStatusStorageService } from '../../../shared/services/LessonStatusStorageService.js';
import { getUnifiedNotificationService } from '../../../shared/services/UnifiedNotificationService.js';
import { EventBus } from '../../../shared/services/EventBus.js';

export class LessonStatusManagerModule {
  constructor() {
    this.moduleName = 'LessonStatusManagerModule';
    
    // サービス参照
    this.storageService = null;
    this.notificationService = getUnifiedNotificationService();
    
    // DOM要素
    this.form = null;
    this.dateInput = null;
    this.previewContainer = null;
    this.previewContent = null;
    this.currentStatusDisplay = null;
    
    // 状態管理
    this.currentData = null;
    this.hasUnsavedChanges = false;
    this.isInitialized = false;
    this.autoSaveTimeout = null;
    
    // 設定
    this.config = {
      autoSaveDelay: 3000, // 3秒後に自動保存
      animationDuration: 300,
      maxMessageLength: 500
    };
    
    // パフォーマンス監視
    this.metrics = {
      initTime: 0,
      actionCounts: {},
      errors: []
    };
    
    this.log('LessonStatusManagerModule 初期化開始');
  }

  /**
   * モジュール初期化
   */
  async initialize() {
    const startTime = performance.now();
    
    try {
      this.log('レッスン状況管理モジュール初期化開始');
      
      // サービス初期化
      await this.initializeServices();
      
      // DOM要素取得
      this.findDOMElements();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      // 初期データ読み込み
      await this.loadInitialData();
      
      // 自動保存設定
      this.setupAutoSave();
      
      this.isInitialized = true;
      this.metrics.initTime = performance.now() - startTime;
      
      this.log(`✅ レッスン状況管理モジュール初期化完了 (${this.metrics.initTime.toFixed(2)}ms)`);
      
      return { success: true };
      
    } catch (error) {
      this.error('❌ レッスン状況管理モジュール初期化エラー:', error);
      this.metrics.errors.push({
        type: 'initialization',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return { success: false, error: error.message };
    }
  }

  /**
   * サービス初期化
   */
  async initializeServices() {
    try {
      // ストレージサービス取得
      this.storageService = getLessonStatusStorageService();
      await this.storageService.initialize();
      
      this.log('✅ レッスン状況ストレージサービス初期化完了');
      
    } catch (error) {
      this.error('❌ サービス初期化エラー:', error);
      throw error;
    }
  }

  /**
   * DOM要素取得
   */
  findDOMElements() {
    // フォーム要素
    this.form = document.querySelector('#lesson-form');
    this.dateInput = document.querySelector('#lesson-date');
    
    // プレビュー関連
    this.previewContainer = document.querySelector('#preview-container');
    this.previewContent = document.querySelector('#preview-content');
    
    // 現在の状況表示
    this.currentStatusDisplay = document.querySelector('#current-status-display');
    
    // バリデーション
    if (!this.form) {
      this.warn('⚠️ レッスン状況フォームが見つかりません');
    }
    
    this.log('✅ DOM要素取得完了', {
      form: !!this.form,
      dateInput: !!this.dateInput,
      previewContainer: !!this.previewContainer,
      currentStatusDisplay: !!this.currentStatusDisplay
    });
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    if (!this.form) return;
    
    // アクションボタンイベント
    this.form.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      
      const action = button.getAttribute('data-action');
      this.handleAction(action, button);
    });
    
    // フォーム変更監視（自動保存用）
    this.form.addEventListener('change', () => {
      this.markAsChanged();
      this.scheduleAutoSave();
    });
    
    // 日付変更イベント
    if (this.dateInput) {
      this.dateInput.addEventListener('change', () => {
        this.loadStatusByDate(this.dateInput.value);
      });
    }
    
    // ストレージ更新イベント
    EventBus.on('lessonStatus:updated', (data) => {
      this.handleStorageUpdate(data);
    });
    
    this.log('✅ イベントリスナー設定完了');
  }

  /**
   * 初期データ読み込み
   */
  async loadInitialData() {
    try {
      // 今日の日付を設定
      const today = this.getTodayDate();
      if (this.dateInput) {
        this.dateInput.value = today;
      }
      
      // 今日のレッスン状況を読み込み
      await this.loadStatusByDate(today);
      
    } catch (error) {
      this.error('初期データ読み込みエラー:', error);
      this.showNotification('error', '初期データの読み込みに失敗しました');
    }
  }

  /**
   * 自動保存設定
   */
  setupAutoSave() {
    // ページ離脱時の確認
    window.addEventListener('beforeunload', (event) => {
      if (this.hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '未保存の変更があります。ページを離れますか？';
      }
    });
  }

  /**
   * アクション処理
   */
  async handleAction(action, button) {
    try {
      this.incrementActionCount(action);
      this.setButtonLoading(button, true);
      
      switch (action) {
        case 'load-lesson-status':
          await this.loadLessonStatus();
          break;
        case 'preview-lesson-status':
          await this.previewLessonStatus();
          break;
        case 'save-draft-lesson-status':
          await this.saveDraftLessonStatus();
          break;
        case 'update-lesson-status':
          await this.updateLessonStatus();
          break;
        default:
          this.warn('未知のアクション:', action);
      }
      
    } catch (error) {
      this.error(`アクション実行エラー (${action}):`, error);
      this.showNotification('error', `${action}の実行に失敗しました`);
      
      this.metrics.errors.push({
        type: 'action',
        action,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
    } finally {
      this.setButtonLoading(button, false);
    }
  }

  /**
   * レッスン状況読み込み
   */
  async loadLessonStatus() {
    const date = this.dateInput?.value || this.getTodayDate();
    await this.loadStatusByDate(date);
  }

  /**
   * 指定日のレッスン状況読み込み
   */
  async loadStatusByDate(date) {
    try {
      this.log(`レッスン状況読み込み: ${date}`);
      
      const statusData = this.storageService.getStatusByDate(date);
      
      if (statusData) {
        this.populateForm(statusData);
        this.currentData = statusData;
        this.updateCurrentStatusDisplay(statusData);
        this.showNotification('success', `${date} のレッスン状況を読み込みました`);
      } else {
        this.setDefaultForm(date);
        this.showNotification('info', `${date} の新規レッスン状況を作成します`);
      }
      
      this.hasUnsavedChanges = false;
      
    } catch (error) {
      this.error('レッスン状況読み込みエラー:', error);
      this.showNotification('error', 'レッスン状況の読み込みに失敗しました');
    }
  }

  /**
   * レッスン状況プレビュー
   */
  async previewLessonStatus() {
    try {
      const formData = this.getFormData();
      
      // バリデーション
      if (!this.validateFormData(formData)) {
        return;
      }
      
      // プレビューHTML生成
      const previewHTML = this.generatePreviewHTML(formData);
      
      // プレビュー表示
      this.showPreview(previewHTML);
      
      this.showNotification('info', 'プレビューを表示しました');
      
    } catch (error) {
      this.error('プレビュー生成エラー:', error);
      this.showNotification('error', 'プレビューの生成に失敗しました');
    }
  }

  /**
   * 下書き保存
   */
  async saveDraftLessonStatus() {
    try {
      const formData = this.getFormData();
      
      // バリデーション（下書きは緩い検証）
      if (!formData.date) {
        this.showNotification('error', '日付を選択してください');
        return;
      }
      
      // 下書きフラグを設定
      formData.isDraft = true;
      formData.lastModified = new Date().toISOString();
      
      // 保存実行
      const result = await this.storageService.saveStatus(formData);
      
      if (result.success) {
        this.currentData = formData;
        this.hasUnsavedChanges = false;
        this.showNotification('success', '下書きを保存しました');
        
        // 統計更新
        this.updateDashboardStats();
        
      } else {
        this.showNotification('error', result.error || '下書き保存に失敗しました');
      }
      
    } catch (error) {
      this.error('下書き保存エラー:', error);
      this.showNotification('error', '下書き保存中にエラーが発生しました');
    }
  }

  /**
   * 保存して公開
   */
  async updateLessonStatus() {
    try {
      const formData = this.getFormData();
      
      // フルバリデーション
      if (!this.validateFormData(formData, true)) {
        return;
      }
      
      // 確認ダイアログ
      const confirmMessage = this.generateConfirmMessage(formData);
      if (!confirm(confirmMessage)) {
        this.showNotification('info', '公開をキャンセルしました');
        return;
      }
      
      // 公開フラグを設定
      formData.isDraft = false;
      formData.publishedAt = new Date().toISOString();
      formData.lastModified = new Date().toISOString();
      
      // 保存実行
      const result = await this.storageService.updateStatus(formData);
      
      if (result.success) {
        this.currentData = formData;
        this.hasUnsavedChanges = false;
        this.updateCurrentStatusDisplay(formData);
        
        // LP側の表示更新
        if (window.lessonStatusDisplay?.refresh) {
          window.lessonStatusDisplay.refresh();
        }
        
        // イベント発行
        EventBus.emit('button:lessonStatus:updated', { 
          date: formData.date 
        });
        
        this.showNotification('success', 'レッスン状況を公開しました');
        
        // 統計更新
        this.updateDashboardStats();
        
      } else {
        this.showNotification('error', result.error || '公開に失敗しました');
      }
      
    } catch (error) {
      this.error('レッスン状況公開エラー:', error);
      this.showNotification('error', '公開中にエラーが発生しました');
    }
  }

  /**
   * フォームデータ取得
   */
  getFormData() {
    if (!this.form) return null;
    
    const formData = {
      date: this.dateInput?.value || this.getTodayDate(),
      globalStatus: this.getSelectedValue('global-status'),
      globalMessage: this.getInputValue('global-message'),
      courses: {
        basic: {
          status: this.getSelectedValue('basic-status'),
          message: this.getInputValue('basic-message') || ''
        },
        advance: {
          status: this.getSelectedValue('advance-status'),
          message: this.getInputValue('advance-message') || ''
        }
      }
    };
    
    return formData;
  }

  /**
   * フォームデータ検証
   */
  validateFormData(data, isPublish = false) {
    // 必須項目チェック
    if (!data.date) {
      this.showNotification('error', '日付を選択してください');
      return false;
    }
    
    // 日付形式チェック
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      this.showNotification('error', '正しい日付形式で入力してください');
      return false;
    }
    
    // ステータス値チェック
    const validStatuses = ['scheduled', 'cancelled', 'indoor', 'postponed'];
    if (!validStatuses.includes(data.globalStatus)) {
      this.showNotification('error', '有効な全体ステータスを選択してください');
      return false;
    }
    
    // コースステータスチェック
    for (const [courseKey, courseData] of Object.entries(data.courses)) {
      if (!validStatuses.includes(courseData.status)) {
        this.showNotification('error', `有効な${courseKey}コースステータスを選択してください`);
        return false;
      }
    }
    
    // メッセージ長チェック
    if (data.globalMessage && data.globalMessage.length > this.config.maxMessageLength) {
      this.showNotification('error', `全体メッセージは${this.config.maxMessageLength}文字以内で入力してください`);
      return false;
    }
    
    // コースメッセージ長チェック
    for (const [courseKey, courseData] of Object.entries(data.courses)) {
      if (courseData.message && courseData.message.length > this.config.maxMessageLength) {
        this.showNotification('error', `${courseKey}コースメッセージは${this.config.maxMessageLength}文字以内で入力してください`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * フォームにデータを設定
   */
  populateForm(data) {
    if (!this.form || !data) return;
    
    // 日付設定
    if (this.dateInput) {
      this.dateInput.value = data.date;
    }
    
    // グローバルステータス設定
    this.setSelectedValue('global-status', data.globalStatus);
    
    // グローバルメッセージ設定
    this.setInputValue('global-message', data.globalMessage || '');
    
    // コース別設定
    if (data.courses) {
      this.setSelectedValue('basic-status', data.courses.basic?.status || 'scheduled');
      this.setInputValue('basic-message', data.courses.basic?.message || '');
      
      this.setSelectedValue('advance-status', data.courses.advance?.status || 'scheduled');
      this.setInputValue('advance-message', data.courses.advance?.message || '');
    }
  }

  /**
   * デフォルトフォーム設定
   */
  setDefaultForm(date) {
    const defaultData = {
      date: date,
      globalStatus: 'scheduled',
      globalMessage: '',
      courses: {
        basic: { status: 'scheduled', message: '' },
        advance: { status: 'scheduled', message: '' }
      }
    };
    
    this.populateForm(defaultData);
    this.currentData = defaultData;
  }

  /**
   * プレビューHTML生成
   */
  generatePreviewHTML(data) {
    const statusDefinitions = {
      scheduled: { icon: 'fas fa-check-circle', text: '通常開催', class: 'scheduled' },
      cancelled: { icon: 'fas fa-times-circle', text: '中止', class: 'cancelled' },
      indoor: { icon: 'fas fa-home', text: '室内開催', class: 'indoor' },
      postponed: { icon: 'fas fa-clock', text: '延期', class: 'postponed' }
    };
    
    const globalStatus = statusDefinitions[data.globalStatus];
    const basicStatus = statusDefinitions[data.courses.basic.status];
    const advanceStatus = statusDefinitions[data.courses.advance.status];
    
    return `
      <div class="lesson-status-preview">
        <div class="preview-header">
          <h3>${data.date} のレッスン状況プレビュー</h3>
        </div>
        
        <div class="global-status-section">
          <h4>全体開催ステータス</h4>
          <div class="status-indicator ${globalStatus.class}">
            <i class="${globalStatus.icon}"></i>
            ${globalStatus.text}
          </div>
          ${data.globalMessage ? `
            <div class="global-message">
              <i class="fas fa-info-circle"></i>
              ${this.escapeHtml(data.globalMessage)}
            </div>
          ` : ''}
        </div>
        
        <div class="courses-section">
          <h4>コース別詳細</h4>
          <div class="courses-grid">
            <div class="course-item">
              <div class="course-header">
                <h5>ベーシックコース</h5>
                <span class="course-time">17:00 - 17:50</span>
              </div>
              <div class="status-indicator ${basicStatus.class}">
                <i class="${basicStatus.icon}"></i>
                ${basicStatus.text}
              </div>
              ${data.courses.basic.message ? `
                <div class="course-message">
                  ${this.escapeHtml(data.courses.basic.message)}
                </div>
              ` : ''}
            </div>
            
            <div class="course-item">
              <div class="course-header">
                <h5>アドバンスコース</h5>
                <span class="course-time">18:00 - 18:50</span>
              </div>
              <div class="status-indicator ${advanceStatus.class}">
                <i class="${advanceStatus.icon}"></i>
                ${advanceStatus.text}
              </div>
              ${data.courses.advance.message ? `
                <div class="course-message">
                  ${this.escapeHtml(data.courses.advance.message)}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        
        <div class="preview-footer">
          <p class="note">※ 保存後にLP側で表示されるプレビューです</p>
        </div>
      </div>
    `;
  }

  /**
   * プレビュー表示
   */
  showPreview(html) {
    if (!this.previewContainer || !this.previewContent) return;
    
    this.previewContent.innerHTML = html;
    
    // プレビューコンテナの表示/非表示切り替え
    if (this.previewContainer.classList.contains('preview-hidden')) {
      this.previewContainer.classList.remove('preview-hidden');
      this.previewContainer.classList.add('preview-visible');
    } else {
      this.previewContainer.classList.add('preview-hidden');
      this.previewContainer.classList.remove('preview-visible');
    }
  }

  /**
   * 確認メッセージ生成
   */
  generateConfirmMessage(data) {
    const statusNames = {
      scheduled: '通常開催',
      cancelled: '中止',
      indoor: '室内開催',
      postponed: '延期'
    };
    
    return `${data.date} のレッスン状況を公開しますか？\n\n` +
           `全体ステータス: ${statusNames[data.globalStatus]}\n` +
           `ベーシックコース: ${statusNames[data.courses.basic.status]}\n` +
           `アドバンスコース: ${statusNames[data.courses.advance.status]}`;
  }

  /**
   * 現在の状況表示更新
   */
  updateCurrentStatusDisplay(data) {
    if (!this.currentStatusDisplay) return;
    
    const statusDefinitions = {
      scheduled: { icon: 'fas fa-check-circle', text: '通常開催', class: 'scheduled' },
      cancelled: { icon: 'fas fa-times-circle', text: '中止', class: 'cancelled' },
      indoor: { icon: 'fas fa-home', text: '室内開催', class: 'indoor' },
      postponed: { icon: 'fas fa-clock', text: '延期', class: 'postponed' }
    };
    
    const status = statusDefinitions[data.globalStatus];
    
    this.currentStatusDisplay.innerHTML = `
      <div class="status-indicator ${status.class}">
        <i class="${status.icon}"></i>
        <span class="status-text">${status.text}</span>
      </div>
      <div class="status-updated">
        最終更新: ${new Date().toLocaleString('ja-JP')}
      </div>
    `;
  }

  /**
   * 統計更新
   */
  updateDashboardStats() {
    if (window.dashboardStatsWidget?.updateStats) {
      window.dashboardStatsWidget.updateStats();
    }
  }

  // === ユーティリティメソッド ===

  /**
   * 今日の日付取得
   */
  getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 選択値取得
   */
  getSelectedValue(name) {
    const radio = this.form.querySelector(`input[name="${name}"]:checked`);
    return radio ? radio.value : null;
  }

  /**
   * 入力値取得
   */
  getInputValue(id) {
    const input = this.form.querySelector(`#${id}, [name="${id}"]`);
    return input ? input.value.trim() : '';
  }

  /**
   * 選択値設定
   */
  setSelectedValue(name, value) {
    const radio = this.form.querySelector(`input[name="${name}"][value="${value}"]`);
    if (radio) radio.checked = true;
  }

  /**
   * 入力値設定
   */
  setInputValue(id, value) {
    const input = this.form.querySelector(`#${id}, [name="${id}"]`);
    if (input) input.value = value;
  }

  /**
   * HTML エスケープ
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 変更マーク
   */
  markAsChanged() {
    this.hasUnsavedChanges = true;
  }

  /**
   * 自動保存スケジュール
   */
  scheduleAutoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    this.autoSaveTimeout = setTimeout(() => {
      this.saveDraftLessonStatus();
    }, this.config.autoSaveDelay);
  }

  /**
   * ボタンローディング状態設定
   */
  setButtonLoading(button, isLoading) {
    if (!button) return;
    
    const icon = button.querySelector('i');
    const originalIcon = button.getAttribute('data-original-icon') || icon?.className;
    
    if (isLoading) {
      button.disabled = true;
      if (icon) {
        button.setAttribute('data-original-icon', icon.className);
        icon.className = 'fas fa-spinner fa-spin';
      }
    } else {
      button.disabled = false;
      if (icon && originalIcon) {
        icon.className = originalIcon;
      }
    }
  }

  /**
   * 通知表示
   */
  showNotification(type, message) {
    this.notificationService.show({
      type,
      message,
      duration: 4000,
      category: 'lesson-status'
    });
  }

  /**
   * ストレージ更新ハンドリング
   */
  handleStorageUpdate(data) {
    const currentDate = this.dateInput?.value || this.getTodayDate();
    
    if (data.date === currentDate && data.source !== 'local') {
      this.log('他のタブからレッスン状況が更新されました');
      this.showNotification('info', '他のタブからレッスン状況が更新されました');
      
      if (confirm('他のタブでレッスン状況が更新されました。最新の内容を読み込みますか？')) {
        this.loadStatusByDate(currentDate);
      }
    }
  }

  /**
   * アクション回数カウント
   */
  incrementActionCount(action) {
    this.metrics.actionCounts[action] = (this.metrics.actionCounts[action] || 0) + 1;
  }

  /**
   * デバッグ情報取得
   */
  getDebugInfo() {
    return {
      moduleName: this.moduleName,
      isInitialized: this.isInitialized,
      hasUnsavedChanges: this.hasUnsavedChanges,
      metrics: this.metrics,
      currentData: this.currentData
    };
  }

  // === ログメソッド ===

  log(message, ...args) {
    console.log(`[${this.moduleName}] ${message}`, ...args);
  }

  warn(message, ...args) {
    console.warn(`[${this.moduleName}] ${message}`, ...args);
  }

  error(message, ...args) {
    console.error(`[${this.moduleName}] ${message}`, ...args);
  }
}

// グローバル参照用のインスタンス管理
let lessonStatusManagerInstance = null;

/**
 * LessonStatusManagerModule のシングルトンインスタンスを取得
 */
export function getLessonStatusManagerModule() {
  if (!lessonStatusManagerInstance) {
    lessonStatusManagerInstance = new LessonStatusManagerModule();
  }
  return lessonStatusManagerInstance;
}

/**
 * モジュール初期化（外部から呼び出し用）
 */
export async function initializeLessonStatusManager() {
  const manager = getLessonStatusManagerModule();
  return await manager.initialize();
} 