/**
 * レッスン状況管理モジュール - 完全統合版
 * LessonStatusManagerModule + LessonStatusAdminComponent + LessonStatusModernService を統合
 * @version 3.1.0 - LessonStatusModernService統合完了版
 */

import { Component } from '../../../lib/base/Component.js';
import { getLessonStatusStorageService } from '../../../shared/services/LessonStatusStorageService.js';
import { getUnifiedNotificationService } from '../../../shared/services/UnifiedNotificationService.js';
import { EventBus } from '../../../shared/services/EventBus.js';

export class LessonStatusManagerModule extends Component {
  constructor(element = '#lesson-form, #lesson-status-admin, .lesson-status-admin') {
    super({ autoInit: false });
    
    this.componentName = 'LessonStatusManagerModule';
    this.moduleName = 'LessonStatusManagerModule';
    
    // DOM要素の設定
    if (typeof element === 'string') {
      this.element = document.querySelector(element);
    } else {
      this.element = element;
    }
    
    // サービス参照
    this.storageService = null;
    this.notificationService = null;
    this.lessonStatusService = null; // 互換性のため
    
    // DOM要素
    this.form = null;
    this.formContainer = null;
    this.dateInput = null;
    this.globalStatusInputs = null;
    this.globalMessageInput = null;
    this.courseInputs = {};
    this.actionButtons = {};
    this.previewContainer = null;
    this.previewContent = null;
    this.currentStatusDisplay = null;
    
    // 状態管理
    this.currentData = null;
    this.currentFormData = null; // 互換性のため
    this.hasUnsavedChanges = false;
    this.isInitialized = false;
    this.isLoading = false;
    this.autoSaveTimeout = null;
    this.initializationPromise = null; // 重複初期化防止
    
    // コース定義（デフォルト値を設定）
    this.courses = ['basic', 'advance'];
    
    // 設定
    this.config = {
      autoSaveDelay: 3000,
      animationDuration: 300,
      maxMessageLength: 500,
      maxCourseMessageLength: 200
    };
    
    // パフォーマンス監視
    this.metrics = {
      initTime: 0,
      actionCounts: {},
      errors: []
    };
    
    this.log('レッスン状況管理モジュール（統合版）初期化開始');
  }

  /**
   * モジュール初期化（重複防止付き）
   */
  async initialize() {
    // 既に初期化中または完了している場合は重複を防ぐ
    if (this.isInitialized) {
      this.warn('既に初期化済みです');
      return { success: true };
    }
    
    if (this.initializationPromise) {
      this.warn('初期化中です - 完了を待機します');
      return await this.initializationPromise;
    }
    
    this.initializationPromise = this._performInitialization();
    return await this.initializationPromise;
  }

  /**
   * 実際の初期化処理
   * @private
   */
  async _performInitialization() {
    const startTime = performance.now();
    
    try {
      this.log('レッスン状況管理モジュール（統合版）初期化開始');
      
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
      
      this.log(`✅ レッスン状況管理モジュール（統合版）初期化完了 (${this.metrics.initTime.toFixed(2)}ms)`);
      
      return { success: true };
      
    } catch (error) {
      this.error('❌ レッスン状況管理モジュール（統合版）初期化エラー:', error);
      this.metrics.errors.push({
        type: 'initialization',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.isInitialized = false;
      this.initializationPromise = null;
      
      return { success: false, error: error.message };
    }
  }

  /**
   * サービス初期化
   */
  async initializeServices() {
    try {
      // ストレージサービス初期化
      this.storageService = getLessonStatusStorageService();
      await this.storageService.init();
      
      // 通知サービス初期化（複数の通知システムに対応）
      try {
        this.notificationService = getUnifiedNotificationService();
        this.log('✅ 統一通知サービス初期化完了');
      } catch (error) {
        this.warn('統一通知サービスの初期化に失敗:', error);
        // フォールバックとして他の通知システムを確認
        if (typeof window.showNotification === 'function') {
          this.log('✅ グローバル通知関数を使用');
        } else if (typeof window.adminNotify === 'function') {
          this.log('✅ 管理画面通知関数を使用');
        } else {
          this.warn('⚠️ 利用可能な通知システムが見つかりません');
        }
      }
      
      this.log('✅ サービス初期化完了');
      
    } catch (error) {
      this.error('サービス初期化エラー:', error);
      throw error;
    }
  }

  /**
   * DOM要素取得（統合版）
   */
  findDOMElements() {
    // フォーム要素（複数パターンに対応）
    this.form = document.querySelector('#lesson-form');
    this.formContainer = document.querySelector('#lesson-status .lesson-form, .lesson-status-form') || this.form;
    
    if (!this.form && !this.formContainer) {
      this.warn('⚠️ レッスン状況フォームが見つかりません');
      return;
    }
    
    const container = this.formContainer || this.form;
    
    // 日付入力
    this.dateInput = container.querySelector('#lesson-date, input[name="lesson-date"]');
    
    // グローバルステータス
    this.globalStatusInputs = container.querySelectorAll('input[name="global-status"]');
    
    // グローバルメッセージ
    this.globalMessageInput = container.querySelector('#global-message, textarea[name="global-message"]');
    
    // コース別入力
    this.courses.forEach(course => {
      this.courseInputs[course] = {
        status: container.querySelectorAll(`input[name="${course}-status"], input[name="${course}-lesson"]`),
        message: container.querySelector(`#${course}-message, #${course}-lesson-note, textarea[name="${course}-note"]`)
      };
    });
    
    // アクションボタン
    this.actionButtons = {
      load: container.querySelector('button[data-action="load-lesson-status"]'),
      preview: container.querySelector('button[data-action="preview-lesson-status"]'),
      saveDraft: container.querySelector('button[data-action="save-draft-lesson-status"]'),
      save: container.querySelector('button[data-action="update-lesson-status"]')
    };
    
    // プレビュー関連
    this.previewContainer = document.querySelector('#preview-container, .lesson-status-preview, #lesson-status-preview');
    this.previewContent = document.querySelector('#preview-content');
    
    // 現在の状況表示
    this.currentStatusDisplay = document.querySelector('#current-status-display');
    
    this.log('✅ DOM要素取得完了', {
      form: !!this.form,
      formContainer: !!this.formContainer,
      dateInput: !!this.dateInput,
      globalStatusInputs: this.globalStatusInputs?.length || 0,
      globalMessageInput: !!this.globalMessageInput,
      actionButtons: Object.keys(this.actionButtons).filter(key => this.actionButtons[key]).length,
      previewContainer: !!this.previewContainer,
      currentStatusDisplay: !!this.currentStatusDisplay
    });
  }

  /**
   * イベントリスナー設定（レッスン状況専用・最適化版）
   * レッスン状況関連のアクションのみを処理し、他のActionManagerとの重複を避ける
   */
  setupEventListeners() {
    const container = this.formContainer || this.form;
    if (!container) return;
    
    // アクションボタンイベント（レッスン状況のみ処理）
    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      
      const action = button.getAttribute('data-action');
      
      // レッスン状況関連のアクションのみ処理
      if (action && action.includes('lesson-status')) {
        event.preventDefault(); // デフォルト動作を停止
        event.stopImmediatePropagation(); // 他のすべてのハンドラーを停止
        this.log(`🛑 レッスン状況アクション専用処理: ${action}`);
        this.handleAction(action, button);
      }
    }, true); // キャプチャフェーズで実行して最優先にする
    
    // フォーム変更監視（自動保存用）
    container.addEventListener('change', (event) => {
      this.handleFormChange(event);
    });
    
    // フォーム入力監視（リアルタイムバリデーション）
    container.addEventListener('input', (event) => {
      this.handleFormInput(event);
    });
    
    // 日付変更イベント
    if (this.dateInput) {
      this.dateInput.addEventListener('change', () => {
        const date = this.dateInput.value;
        if (date) {
          this.loadStatusByDate(date);
        }
      });
    }
    
    // ストレージ更新イベント
    EventBus.on('lessonStatus:updated', (data) => {
      this.handleStorageUpdate(data);
    });


    
    // ページ離脱時の確認
    window.addEventListener('beforeunload', (event) => {
      if (this.hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '未保存の変更があります。ページを離れますか？';
        return event.returnValue;
      }
    });
    
    this.log('✅ レッスン状況専用イベントリスナー設定完了');
  }



  /**
   * 初期データ読み込み
   */
  async loadInitialData() {
    try {
      // 今日の日付を設定
      const today = this.getTodayDate();
      if (this.dateInput && !this.dateInput.value) {
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
    // 既に設定済みの場合はスキップ
    if (this.autoSaveSetup) return;
    this.autoSaveSetup = true;
  }

  /**
   * フォーム変更ハンドラ（統合版）
   */
  handleFormChange(event) {
    this.hasUnsavedChanges = true;
    this.markAsChanged();
    this.scheduleAutoSave();
    this.updateFormValidation();
    this.debug('フォーム変更検出:', event.target.name || event.target.id);
  }

  /**
   * フォーム入力ハンドラ（リアルタイムバリデーション）
   */
  handleFormInput(event) {
    this.hasUnsavedChanges = true;
    
    // リアルタイムバリデーション
    if (event.target.type === 'textarea' || event.target.tagName === 'TEXTAREA') {
      this.validateTextLength(event.target);
    }
  }

  /**
   * アクション処理（レッスン状況専用・最適化版）
   */
  async handleAction(action, button) {
    try {
      this.log(`🎯 レッスン状況アクション実行: ${action}`);
      this.incrementActionCount(action);
      this.setButtonLoading(button, true);
      this.setLoading(true);
      
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
      this.showNotification('error', `${action}の実行に失敗しました: ${error.message}`);
      
      this.metrics.errors.push({
        type: 'action',
        action,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
    } finally {
      this.setButtonLoading(button, false);
      this.setLoading(false);
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
   * 指定日のレッスン状況読み込み（統合版）
   */
  async loadStatusByDate(date) {
    try {
      this.log(`レッスン状況読み込み: ${date}`);
      
      const statusData = this.storageService.getStatusByDate(date);
      
      if (statusData) {
        await this.populateForm(statusData);
        this.currentData = statusData;
        this.currentFormData = statusData; // 互換性のため
        this.updateCurrentStatusDisplay(statusData);
        this.updateUIWithLessonStatus(statusData);
        this.showNotification('success', `${date} のレッスン状況を読み込みました`);
      } else {
        await this.setDefaultForm(date);
        this.showNotification('info', `${date} の新規レッスン状況を作成します`);
      }
      
      this.hasUnsavedChanges = false;
      
    } catch (error) {
      this.error('レッスン状況読み込みエラー:', error);
      this.showNotification('error', 'レッスン状況の読み込みに失敗しました');
    }
  }

  /**
   * レッスン状況プレビュー（改善版）
   */
  async previewLessonStatus() {
    try {
      this.log('プレビュー生成開始');
      
      const formData = this.getFormData();
      this.debug('プレビュー用フォームデータ:', formData);
      
      // バリデーション
      if (!this.validateFormData(formData)) {
        this.warn('プレビュー: バリデーションエラー');
        return;
      }
      
      // プレビューHTML生成
      const previewHTML = this.generatePreviewHTML(formData);
      
      // プレビュー表示
      const displayResult = this.showPreview(previewHTML);
      
      if (displayResult) {
        this.showNotification('success', 'レッスン状況のプレビューを表示しました');
        this.log('✅ プレビュー表示成功');
      } else {
        this.showNotification('warning', 'プレビューを表示しましたが、一部機能が制限されています');
        this.warn('⚠️ プレビュー表示: 制限モード');
      }
      
    } catch (error) {
      this.error('プレビュー生成エラー:', error);
      this.showNotification('error', `プレビューの生成に失敗しました: ${error.message}`);
      
      // エラー詳細をデバッグ用に出力
      this.debug('プレビューエラー詳細:', {
        error: error.message,
        stack: error.stack,
        formState: this.getDebugInfo()
      });
    }
  }

  /**
   * 下書き保存（改善版）
   */
  async saveDraftLessonStatus() {
    try {
      this.log('下書き保存開始');
      
      const formData = this.getFormData();
      this.debug('下書き保存用フォームデータ:', formData);
      
      // バリデーション（下書きは緩い検証）
      if (!formData.date) {
        this.showNotification('error', '日付を選択してください');
        this.warn('下書き保存: 日付が未選択');
        return;
      }
      
      // 日付形式の基本チェック
      if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) {
        this.showNotification('error', '正しい日付形式で入力してください');
        this.warn('下書き保存: 日付形式が不正');
        return;
      }
      
      // 下書きフラグを設定
      formData.isDraft = true;
      formData.lastModified = new Date().toISOString();
      formData.savedAt = new Date().toISOString();
      
      this.debug('下書き保存実行:', formData);
      
      // 保存実行
      let result;
      if (this.storageService && typeof this.storageService.saveStatus === 'function') {
        result = await this.storageService.saveStatus(formData);
      } else {
        // フォールバック：ローカルストレージに直接保存
        this.warn('ストレージサービスが利用できません。ローカルストレージに保存します。');
        result = this.saveDraftToLocalStorage(formData);
      }
      
      if (result && result.success) {
        this.currentData = formData;
        this.hasUnsavedChanges = false;
        this.showNotification('success', `下書きを保存しました (${formData.date})`);
        this.log('✅ 下書き保存成功');
        
        // 統計更新
        try {
          this.updateDashboardStats();
        } catch (statsError) {
          this.warn('統計更新エラー:', statsError);
        }
        
        // 保存成功の視覚的フィードバック
        this.highlightSaveSuccess();
        
      } else {
        const errorMsg = result?.error || '下書き保存に失敗しました';
        this.showNotification('error', errorMsg);
        this.error('下書き保存失敗:', result);
      }
      
    } catch (error) {
      this.error('下書き保存エラー:', error);
      this.showNotification('error', `下書き保存中にエラーが発生しました: ${error.message}`);
      
      // エラー詳細をデバッグ用に出力
      this.debug('下書き保存エラー詳細:', {
        error: error.message,
        stack: error.stack,
        formState: this.getDebugInfo()
      });
    }
  }

  /**
   * ローカルストレージへの下書き保存（フォールバック）
   */
  saveDraftToLocalStorage(formData) {
    try {
      const draftKey = `rbs_lesson_draft_${formData.date}`;
      const draftData = {
        ...formData,
        savedAt: new Date().toISOString(),
        source: 'fallback'
      };
      
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      
      this.log(`ローカルストレージに下書き保存: ${draftKey}`);
      
      return {
        success: true,
        data: draftData
      };
      
    } catch (error) {
      this.error('ローカルストレージ保存エラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 保存成功の視覚的フィードバック
   */
  highlightSaveSuccess() {
    try {
      // 保存ボタンに一時的なスタイルを適用
      const saveButton = this.actionButtons.saveDraft;
      if (saveButton) {
        const originalStyle = saveButton.style.cssText;
        saveButton.style.cssText += `
          background-color: #28a745 !important;
          color: white !important;
          transform: scale(1.05);
          transition: all 0.3s ease;
        `;
        
        setTimeout(() => {
          saveButton.style.cssText = originalStyle;
        }, 1500);
      }
      
      // フォーム全体に成功の境界線を一時的に表示
      const form = this.form || this.formContainer;
      if (form) {
        const originalBorder = form.style.border;
        form.style.border = '2px solid #28a745';
        form.style.transition = 'border 0.3s ease';
        
        setTimeout(() => {
          form.style.border = originalBorder;
        }, 2000);
      }
      
    } catch (error) {
      this.warn('視覚的フィードバック表示エラー:', error);
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
        
        this.showNotification('success', 'レッスン状況を保存して公開しました');
        
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
   * フォームデータ取得（統合版）
   */
  getFormData() {
    // 統合版のcollectFormDataを使用
    return this.collectFormData();
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
      if (courseData.message && courseData.message.length > this.config.maxCourseMessageLength) {
        this.showNotification('error', `${courseKey}コースメッセージは${this.config.maxCourseMessageLength}文字以内で入力してください`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * フォームにデータを設定（統合版）
   */
  async populateForm(data) {
    if (!data) return;
    
    try {
      // 日付設定
      if (this.dateInput) {
        this.dateInput.value = data.date;
      }
      
      // グローバルステータス設定（複数パターンに対応）
      if (this.globalStatusInputs && this.globalStatusInputs.length > 0) {
        const globalInput = Array.from(this.globalStatusInputs).find(input => input.value === data.globalStatus);
        if (globalInput) {
          globalInput.checked = true;
        }
      } else {
        // フォールバック
        this.setSelectedValue('global-status', data.globalStatus);
      }
      
      // グローバルメッセージ設定
      if (this.globalMessageInput) {
        this.globalMessageInput.value = data.globalMessage || '';
      } else {
        this.setInputValue('global-message', data.globalMessage || '');
      }
      
      // コース別設定（統合版）
      if (data.courses) {
        this.courses.forEach(courseKey => {
          const courseData = data.courses[courseKey];
          if (courseData) {
            // ステータス設定
            if (this.courseInputs[courseKey]?.status) {
              const statusInput = Array.from(this.courseInputs[courseKey].status).find(input => 
                input.value === courseData.status || input.value === this.mapStatusToAdmin(courseData.status)
              );
              if (statusInput) {
                statusInput.checked = true;
              }
            } else {
              // フォールバック
              this.setSelectedValue(`${courseKey}-status`, courseData.status);
            }
            
            // メッセージ設定
            if (this.courseInputs[courseKey]?.message) {
              this.courseInputs[courseKey].message.value = courseData.message || '';
            } else {
              // フォールバック
              this.setInputValue(`${courseKey}-message`, courseData.message || '');
            }
          }
        });
      }
      
      this.debug('フォームデータ設定完了');
      
    } catch (error) {
      this.error('フォームデータ設定エラー:', error);
    }
  }

  /**
   * デフォルトフォーム設定（統合版）
   */
  async setDefaultForm(date) {
    try {
      const defaultData = {
        date: date,
        globalStatus: 'scheduled',
        globalMessage: '',
        courses: {
          basic: { status: 'scheduled', message: '' },
          advance: { status: 'scheduled', message: '' }
        }
      };
      
      await this.populateForm(defaultData);
      this.currentData = defaultData;
      this.currentFormData = defaultData; // 互換性のため
      this.hasUnsavedChanges = false;
      
      this.debug('デフォルトフォーム設定完了');
      
    } catch (error) {
      this.error('デフォルトフォーム設定エラー:', error);
    }
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
          <h3 style="color: white !important;">${data.date} のレッスン状況プレビュー</h3>
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
   * プレビュー表示（改善版）
   */
  showPreview(html) {
    try {
      // プレビューコンテナとコンテンツを取得
      let previewContainer = this.previewContainer || document.querySelector('#preview-container, .lesson-status-preview, #lesson-status-preview');
      let previewContent = this.previewContent || document.querySelector('#preview-content, .preview-content');
      
      // プレビューコンテナが見つからない場合の処理
      if (!previewContainer) {
        this.warn('プレビューコンテナが見つかりません。フォールバック処理を実行します。');
        return this.createFallbackPreview(html);
      }
      
      // プレビューコンテンツが見つからない場合
      if (!previewContent) {
        this.warn('プレビューコンテンツエリアが見つかりません。コンテナ内に作成します。');
        previewContent = document.createElement('div');
        previewContent.className = 'preview-content';
        previewContent.id = 'preview-content';
        previewContainer.appendChild(previewContent);
      }
      
      // プレビュー内容を設定
      previewContent.innerHTML = html;
      
      // プレビューコンテナの表示/非表示切り替え
      if (previewContainer.classList.contains('preview-hidden')) {
        previewContainer.classList.remove('preview-hidden');
        previewContainer.classList.add('preview-visible');
        this.log('✅ プレビューを表示しました');
      } else {
        // 既に表示されている場合は更新のみ
        this.log('✅ プレビューを更新しました');
      }
      
      // スムーズスクロール
      try {
        previewContainer.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      } catch (scrollError) {
        this.warn('スクロールに失敗しました:', scrollError);
      }
      
      return true;
      
    } catch (error) {
      this.error('プレビュー表示エラー:', error);
      return this.createFallbackPreview(html);
    }
  }

  /**
   * フォールバックプレビュー作成
   */
  createFallbackPreview(html) {
    try {
      this.log('フォールバックプレビューを作成します');
      
      // 既存のフォールバックプレビューを削除
      const existingFallback = document.querySelector('#fallback-preview');
      if (existingFallback) {
        existingFallback.remove();
      }
      
      // フォールバックプレビューコンテナを作成
      const fallbackContainer = document.createElement('div');
      fallbackContainer.id = 'fallback-preview';
      fallbackContainer.style.cssText = `
        position: fixed;
        top: 10%;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 800px;
        max-height: 80vh;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        overflow: hidden;
        border: 1px solid #ddd;
      `;
      
      // ヘッダー作成
      const header = document.createElement('div');
      header.style.cssText = `
        background: linear-gradient(135deg, #4a90e2, #357abd);
        color: white;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
        font-size: 16px;
      `;
      header.innerHTML = `
        <span><i class="fas fa-eye"></i> レッスン状況プレビュー</span>
        <button onclick="this.closest('#fallback-preview').remove()" 
                style="background:none;border:none;color:white;cursor:pointer;font-size:18px;padding:4px 8px;border-radius:4px;" 
                onmouseover="this.style.backgroundColor='rgba(255,255,255,0.2)'" 
                onmouseout="this.style.backgroundColor='transparent'">×</button>
      `;
      
      // コンテンツエリア作成
      const content = document.createElement('div');
      content.style.cssText = `
        padding: 20px;
        overflow-y: auto;
        max-height: calc(80vh - 80px);
        background: #f8f9fa;
      `;
      content.innerHTML = html;
      
      // 組み立て
      fallbackContainer.appendChild(header);
      fallbackContainer.appendChild(content);
      
      // ページに追加
      document.body.appendChild(fallbackContainer);
      
      // フェードイン効果
      fallbackContainer.style.opacity = '0';
      setTimeout(() => {
        fallbackContainer.style.transition = 'opacity 0.3s ease';
        fallbackContainer.style.opacity = '1';
      }, 10);
      
      this.log('✅ フォールバックプレビューを表示しました');
      return false; // 制限モードとして false を返す
      
    } catch (error) {
      this.error('フォールバックプレビュー作成エラー:', error);
      
      // 最終フォールバック：新しいウィンドウで表示
      try {
        const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
        newWindow.document.write(`
          <html>
            <head>
              <title>レッスン状況プレビュー</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f8f9fa; }
                .lesson-status-preview { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              </style>
            </head>
            <body>${html}</body>
          </html>
        `);
        newWindow.document.close();
        this.log('✅ 新しいウィンドウでプレビューを表示しました');
        return false;
      } catch (windowError) {
        this.error('新しいウィンドウでの表示も失敗しました:', windowError);
        // コンソールにHTMLを出力（デバッグ用）
        console.log('プレビューHTML:', html);
        alert('プレビューの表示に失敗しました。ブラウザのコンソールを確認してください。');
        return false;
      }
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
   * 通知表示（改善版）
   */
  showNotification(type, message) {
    try {
      this.log(`通知表示: [${type}] ${message}`);
      
      // 1. 統一通知サービスを使用
      if (this.notificationService && typeof this.notificationService.show === 'function') {
        this.notificationService.show({
          type,
          message,
          duration: 4000,
          category: 'lesson-status'
        });
        this.log('✅ 統一通知サービスで表示');
        return true;
      }
      
      // 2. グローバル通知関数を使用
      if (typeof window.showNotification === 'function') {
        window.showNotification(type, message, 4000);
        this.log('✅ グローバル通知関数で表示');
        return true;
      }
      
      // 3. 管理画面通知関数を使用
      if (typeof window.adminNotify === 'function') {
        window.adminNotify({ type, message, duration: 4000 });
        this.log('✅ 管理画面通知関数で表示');
        return true;
      }
      
      // 4. UIManagerServiceを使用
      if (window.uiManagerService && typeof window.uiManagerService.showNotification === 'function') {
        window.uiManagerService.showNotification(type, message);
        this.log('✅ UIManagerServiceで表示');
        return true;
      }
      
      // 5. 簡易通知作成（最終フォールバック）
      this.createSimpleNotification(type, message);
      this.log('✅ 簡易通知で表示');
      return true;
      
    } catch (error) {
      // 通知表示でエラーが発生した場合のフォールバック
      this.error('通知表示エラー:', error);
      const typeEmoji = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      };
      console.log(`${typeEmoji[type] || 'ℹ️'} [${type.toUpperCase()}] ${message}`);
      
      // アラートとしても表示
      alert(`[${type.toUpperCase()}] ${message}`);
      return false;
    }
  }

  /**
   * 簡易通知作成（最終フォールバック）
   */
  createSimpleNotification(type, message) {
    // 既存の通知コンテナを取得または作成
    let container = document.querySelector('#fallback-notifications');
    if (!container) {
      container = document.createElement('div');
      container.id = 'fallback-notifications';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    
    // 通知要素作成
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: ${this.getNotificationBgColor(type)};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      pointer-events: auto;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>${this.getNotificationIcon(type)}</span>
        <span>${this.escapeHtml(message)}</span>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background:none;border:none;color:white;cursor:pointer;margin-left:auto;font-size:16px;">×</button>
      </div>
    `;
    
    container.appendChild(notification);
    
    // アニメーション
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // 自動削除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 4000);
  }

  /**
   * 通知の背景色を取得
   */
  getNotificationBgColor(type) {
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#4a90e2'
    };
    return colors[type] || colors.info;
  }

  /**
   * 通知のアイコンを取得
   */
  getNotificationIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
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

  // === 統合版追加機能 ===

  /**
   * ステータスマッピング（標準→管理画面）
   */
  mapStatusToAdmin(status) {
    const mapping = {
      'scheduled': '開催',
      'cancelled': '中止',
      'indoor': '室内開催',
      'postponed': '延期'
    };
    return mapping[status] || '開催';
  }

  /**
   * ステータスマッピング（管理画面→標準）
   */
  mapAdminToStatus(adminStatus) {
    const mapping = {
      '開催': 'scheduled',
      '中止': 'cancelled',
      '室内開催': 'indoor',
      '延期': 'postponed'
    };
    return mapping[adminStatus] || 'scheduled';
  }

  /**
   * フォームデータ収集（統合版）
   */
  collectFormData() {
    const formData = {
      date: this.dateInput?.value || this.getTodayDate(),
      globalStatus: this.getSelectedGlobalStatus(),
      globalMessage: this.getGlobalMessage(),
      courses: {}
    };
    
    // コース別データ収集（安全性を確保）
    const courses = this.courses || ['basic', 'advance'];
    
    courses.forEach(course => {
      try {
        const status = this.getSelectedCourseStatus(course);
        const message = this.getCourseMessage(course);
        
        formData.courses[course] = {
          status: this.mapAdminToStatus(status),
          message: message || ''
        };
        
        this.debug(`コース[${course}]データ収集完了:`, {
          status: status,
          mappedStatus: this.mapAdminToStatus(status),
          message: message
        });
        
      } catch (error) {
        this.error(`コース[${course}]データ収集エラー:`, error);
        // フォールバック値を設定
        formData.courses[course] = {
          status: 'scheduled',
          message: ''
        };
      }
    });
    
    this.debug('フォームデータ収集完了:', formData);
    return formData;
  }

  /**
   * 選択されたグローバルステータスを取得
   */
  getSelectedGlobalStatus() {
    if (this.globalStatusInputs && this.globalStatusInputs.length > 0) {
      const checked = Array.from(this.globalStatusInputs).find(input => input.checked);
      return checked?.value || 'scheduled';
    }
    // フォールバック
    return this.getSelectedValue('global-status') || 'scheduled';
  }

  /**
   * グローバルメッセージを取得
   */
  getGlobalMessage() {
    if (this.globalMessageInput) {
      return this.globalMessageInput.value || '';
    }
    // フォールバック
    return this.getInputValue('global-message') || '';
  }

  /**
   * 選択されたコースステータスを取得
   */
  getSelectedCourseStatus(course) {
    const courseInputs = this.courseInputs[course]?.status;
    if (courseInputs) {
      const checked = Array.from(courseInputs).find(input => input.checked);
      return checked?.value || '開催';
    }
    // フォールバック
    return this.getSelectedValue(`${course}-status`) || 'scheduled';
  }

  /**
   * コースメッセージを取得
   */
  getCourseMessage(course) {
    const messageInput = this.courseInputs[course]?.message;
    if (messageInput) {
      return messageInput.value || '';
    }
    // フォールバック
    return this.getInputValue(`${course}-message`) || '';
  }

  /**
   * フォームバリデーション更新
   */
  updateFormValidation() {
    // リアルタイムバリデーション表示
    // 現在は基本的なチェックのみ
  }

  /**
   * テキスト長バリデーション
   */
  validateTextLength(textElement) {
    const maxLength = textElement.name?.includes('global') ? 
      this.config.maxMessageLength : this.config.maxCourseMessageLength;
    const currentLength = textElement.value.length;
    
    // 長さ表示
    let lengthIndicator = textElement.parentElement.querySelector('.length-indicator');
    if (!lengthIndicator) {
      lengthIndicator = document.createElement('small');
      lengthIndicator.className = 'length-indicator';
      lengthIndicator.style.cssText = 'display: block; margin-top: 5px; font-size: 12px;';
      textElement.parentElement.appendChild(lengthIndicator);
    }
    
    lengthIndicator.textContent = `${currentLength}/${maxLength}文字`;
    lengthIndicator.style.color = currentLength > maxLength ? '#e74c3c' : '#666';
  }

  /**
   * ローディング状態設定
   */
  setLoading(loading) {
    this.isLoading = loading;
    
    // ボタンの無効化/有効化
    Object.values(this.actionButtons).forEach(button => {
      if (button) {
        button.disabled = loading;
      }
    });
  }

  /**
   * UIの更新（レッスン状況表示）
   */
  updateUIWithLessonStatus(statusData) {
    // 追加のUI更新処理
    this.debug('UIの更新完了:', statusData);
  }

  /**
   * 互換性メソッド - hasUnsavedData
   */
  hasUnsavedData() {
    return this.hasUnsavedChanges;
  }

  /**
   * 互換性メソッド - resetForm
   */
  async resetForm() {
    if (this.hasUnsavedChanges) {
      if (!confirm('未保存の変更があります。リセットしますか？')) {
        return;
      }
    }
    
    await this.setDefaultForm(this.getTodayDate());
    this.showNotification('info', 'フォームをリセットしました');
  }

  // === LessonStatusModernService互換メソッド ===

  /**
   * レッスン状況読み込み（Modern互換）
   */
  loadLessonStatusModern() {
    const dateInput = document.querySelector('#lesson-date');
    const date = dateInput?.value || this.getTodayDate();
    return this.loadStatusByDate(date);
  }

  /**
   * プレビュー表示（Modern互換）
   */
  previewLessonStatusModern() {
    return this.previewLessonStatus();
  }

  /**
   * 下書き保存（Modern互換）
   */
  saveDraftLessonStatusModern() {
    return this.saveDraftLessonStatus();
  }

  /**
   * 更新・公開（Modern互換）
   */
  updateLessonStatusModern() {
    return this.updateLessonStatus();
  }

  /**
   * 統合版のクリーンアップ
   */
  async destroy() {
    try {
      // タイムアウトクリア
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
      }
      
      // イベントリスナー削除
      EventBus.off('lessonStatus:updated');
      
      // 親クラスの破棄
      if (super.destroy) {
        await super.destroy();
      }
      
      this.log('統合モジュール破棄完了');
      
    } catch (error) {
      this.error('統合モジュール破棄エラー:', error);
    }
  }

  // === ログメソッド ===

  log(message, ...args) {
    console.log(`[${this.componentName || this.moduleName}] ${message}`, ...args);
  }

  warn(message, ...args) {
    console.warn(`[${this.componentName || this.moduleName}] ${message}`, ...args);
  }

  error(message, ...args) {
    console.error(`[${this.componentName || this.moduleName}] ${message}`, ...args);
  }

  debug(message, ...args) {
    console.log(`[${this.componentName || this.moduleName}:DEBUG] ${message}`, ...args);
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

/**
 * LessonStatusModernService 互換関数（統合版エイリアス）
 * @deprecated 統一LessonStatusManagerModuleを使用してください
 */
export function getLessonStatusModernService() {
  console.warn('⚠️ getLessonStatusModernService()は非推奨です。getLessonStatusManagerModule()を使用してください。');
  return getLessonStatusManagerModule();
} 