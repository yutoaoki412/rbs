/**
 * レッスン状況管理 - モダンサービス
 * UX改善版の管理機能を提供
 * @version 3.0.0
 */

import { Component } from '../../../shared/base/Component.js';
import { getLessonStatusStorageService } from '../../../shared/services/LessonStatusStorageService.js';
import { EventBus } from '../../../shared/services/EventBus.js';

export class LessonStatusModernService extends Component {
  constructor() {
    super({ autoInit: false });
    
    this.componentName = 'LessonStatusModernService';
    
    // サービス参照
    this.storageService = null;
    
    // DOM要素
    this.container = null;
    this.dateInput = null;
    this.currentStatusDisplay = null;
    this.previewSection = null;
    this.previewContent = null;
    
    // 状態管理
    this.currentData = null;
    this.hasUnsavedChanges = false;
    this.templates = [];
    this.autoSaveTimeout = null;
    
    // 設定
    this.config = {
      autoSaveDelay: 2000, // 2秒後に自動保存
      previewUpdateDelay: 500, // 0.5秒後にプレビュー更新
      maxTemplates: 10
    };
  }

  /**
   * 初期化
   */
  async init() {
    if (this.isInitialized) {
      this.log('既に初期化済みです');
      return;
    }

    try {
      this.log('レッスン状況モダンサービス初期化開始');
      
      // DOM要素の取得
      this.findDOMElements();
      
      // サービス初期化
      await this.initializeStorageService();
      
      // イベントリスナーの設定
      this.setupEventListeners();
      
      // テンプレートの読み込み
      this.loadTemplates();
      
      // 初期データの設定
      await this.initializeWithTodayData();
      
      this.isInitialized = true;
      this.log('レッスン状況モダンサービス初期化完了');
      
    } catch (error) {
      this.error('レッスン状況モダンサービス初期化エラー:', error);
      throw error; // エラーを再スローして上位で処理
    }
  }

  /**
   * DOM要素の取得
   */
  findDOMElements() {
    this.container = document.querySelector('.lesson-status-container');
    this.dateInput = document.getElementById('lesson-date-modern');
    this.currentStatusDisplay = document.getElementById('current-status-display');
    this.previewSection = document.getElementById('preview-section');
    this.previewContent = document.getElementById('live-preview-content');
    
    if (!this.container) {
      throw new Error('レッスン状況コンテナが見つかりません');
    }
  }

  /**
   * ストレージサービス初期化
   */
  async initializeStorageService() {
    this.storageService = getLessonStatusStorageService();
    if (!this.storageService.initialized) {
      await this.storageService.init();
    }
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    // 日付変更
    if (this.dateInput) {
      this.dateInput.addEventListener('change', () => {
        this.loadStatusByDate(this.dateInput.value);
      });
    }

    // フォーム変更の監視（リアルタイムプレビュー）
    this.container.addEventListener('input', (e) => {
      this.handleFormChange(e);
    });

    // ボタンクリック
    this.container.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action && this[action]) {
        e.preventDefault();
        this[action]();
      }
    });

    // セクション折りたたみ
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('section-toggle')) {
        this.toggleSection(e.target);
      }
    });

    // ページ離脱時の確認
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '未保存の変更があります。このページを離れますか？';
      }
    });

    // EventBus イベント
    EventBus.on('lessonStatus:updated', (data) => {
      this.handleStatusUpdate(data);
    });
  }

  /**
   * 今日のデータで初期化
   */
  async initializeWithTodayData() {
    const today = this.getTodayDate();
    if (this.dateInput) {
      this.dateInput.value = today;
    }
    await this.loadStatusByDate(today);
  }

  /**
   * 指定日のレッスン状況を読み込み
   */
  async loadStatusByDate(date) {
    try {
      this.showLoadingStatus();
      
      const statusData = this.storageService.getStatusByDate(date);
      
      if (statusData) {
        this.populateForm(statusData);
        this.currentData = statusData;
        this.updateCurrentStatusDisplay(statusData);
        this.showNotification('success', `${date} のレッスン状況を読み込みました`);
      } else {
        this.setDefaultForm(date);
        this.showNotification('info', `${date} の新しいレッスン状況を作成します`);
      }
      
      this.hasUnsavedChanges = false;
      this.updateRealTimePreview();
      
    } catch (error) {
      this.error('レッスン状況読み込みエラー:', error);
      this.showNotification('error', 'レッスン状況の読み込みに失敗しました');
    }
  }

  /**
   * フォームにデータを設定
   */
  populateForm(statusData) {
    try {
      // 日付設定
      if (statusData.date && this.dateInput) {
        this.dateInput.value = statusData.date;
      }

      // グローバルステータス
      if (statusData.globalStatus) {
        const globalRadio = document.querySelector(`input[name="global-status-modern"][value="${this.mapStatusKeyToJapanese(statusData.globalStatus)}"]`);
        if (globalRadio) globalRadio.checked = true;
      }

      // グローバルメッセージ
      const globalMessage = document.getElementById('global-message-modern');
      if (globalMessage && statusData.globalMessage) {
        globalMessage.value = statusData.globalMessage;
      }

      // コース設定
      if (statusData.courses) {
        // ベーシックコース
        if (statusData.courses.basic) {
          const basicJapanese = this.mapStatusKeyToJapanese(statusData.courses.basic.status);
          const basicRadio = document.querySelector(`input[name="basic-status"][value="${basicJapanese}"]`);
          if (basicRadio) basicRadio.checked = true;
          
          const basicMessage = document.getElementById('basic-message');
          if (basicMessage) basicMessage.value = statusData.courses.basic.message || '';
        }

        // アドバンスコース
        if (statusData.courses.advance) {
          const advanceJapanese = this.mapStatusKeyToJapanese(statusData.courses.advance.status);
          const advanceRadio = document.querySelector(`input[name="advance-status"][value="${advanceJapanese}"]`);
          if (advanceRadio) advanceRadio.checked = true;
          
          const advanceMessage = document.getElementById('advance-message');
          if (advanceMessage) advanceMessage.value = statusData.courses.advance.message || '';
        }
      }

    } catch (error) {
      this.error('フォームデータ設定エラー:', error);
    }
  }

  /**
   * デフォルトフォーム設定
   */
  setDefaultForm(date) {
    // 日付設定
    if (this.dateInput) {
      this.dateInput.value = date;
    }

    // すべて通常開催にリセット
    const globalScheduled = document.querySelector('input[name="global-status-modern"][value="通常開催"]');
    if (globalScheduled) globalScheduled.checked = true;

    const basicScheduled = document.querySelector('input[name="basic-status"][value="通常開催"]');
    if (basicScheduled) basicScheduled.checked = true;

    const advanceScheduled = document.querySelector('input[name="advance-status"][value="通常開催"]');
    if (advanceScheduled) advanceScheduled.checked = true;

    // メッセージクリア
    const messages = ['global-message-modern', 'basic-message', 'advance-message'];
    messages.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.value = '';
    });

    this.currentData = null;
  }

  /**
   * フォーム変更ハンドラ
   */
  handleFormChange(e) {
    this.hasUnsavedChanges = true;
    
    // 自動保存タイマーリセット
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    this.autoSaveTimeout = setTimeout(() => {
      this.saveDraftLessonStatus();
    }, this.config.autoSaveDelay);
    
    // リアルタイムプレビュー更新
    if (this.previewSection && this.previewSection.style.display !== 'none') {
      setTimeout(() => {
        this.updateRealTimePreview();
      }, this.config.previewUpdateDelay);
    }
    
    // 現在のステータス表示更新
    this.updateCurrentStatusDisplay();
  }

  /**
   * 現在のステータス表示更新
   */
  updateCurrentStatusDisplay(statusData = null) {
    if (!this.currentStatusDisplay) return;

    const data = statusData || this.getFormData();
    const statusValue = document.getElementById('current-status-value');
    
    if (statusValue) {
      const statusText = this.mapStatusKeyToJapanese(data.globalStatus);
      const statusIcon = this.getStatusIcon(data.globalStatus);
      
      statusValue.innerHTML = `
        <i class="${statusIcon}"></i>
        ${statusText}
      `;
    }
  }

  /**
   * ステータスアイコン取得
   */
  getStatusIcon(status) {
    const icons = {
      'scheduled': 'fas fa-check-circle',
      'cancelled': 'fas fa-times-circle',
      'indoor': 'fas fa-home',
      'postponed': 'fas fa-clock'
    };
    return icons[status] || 'fas fa-question-circle';
  }

  /**
   * フォームデータ取得
   */
  getFormData() {
    const today = this.getTodayDate();
    
    return {
      date: this.dateInput?.value || today,
      globalStatus: this.mapJapaneseStatusToKey(
        document.querySelector('input[name="global-status-modern"]:checked')?.value || '通常開催'
      ),
      globalMessage: document.getElementById('global-message-modern')?.value || '',
      courses: {
        basic: {
          name: 'ベーシックコース（年長〜小3）',
          time: '17:00-17:50',
          status: this.mapJapaneseStatusToKey(
            document.querySelector('input[name="basic-status"]:checked')?.value || '通常開催'
          ),
          message: document.getElementById('basic-message')?.value || ''
        },
        advance: {
          name: 'アドバンスコース（小4〜小6）',
          time: '18:00-18:50',
          status: this.mapJapaneseStatusToKey(
            document.querySelector('input[name="advance-status"]:checked')?.value || '通常開催'
          ),
          message: document.getElementById('advance-message')?.value || ''
        }
      }
    };
  }

  /**
   * ボタンアクション: 読み込み
   */
  loadLessonStatusModern() {
    try {
      const date = this.dateInput?.value || this.getTodayDate();
      this.loadStatusByDate(date);
    } catch (error) {
      this.error('レッスン状況読み込みエラー:', error);
      this.showNotification('error', 'レッスン状況の読み込みに失敗しました');
    }
  }

  /**
   * ボタンアクション: 前日をコピー
   */
  copyPreviousDay() {
    try {
      const currentDate = new Date(this.dateInput?.value || this.getTodayDate());
      const previousDate = new Date(currentDate);
      previousDate.setDate(currentDate.getDate() - 1);
      
      const previousDateStr = previousDate.toISOString().slice(0, 10);
      const previousData = this.storageService.getStatusByDate(previousDateStr);
      
      if (previousData) {
        // 日付のみ更新して他はコピー
        const copiedData = { ...previousData, date: this.dateInput?.value || this.getTodayDate() };
        this.populateForm(copiedData);
        this.hasUnsavedChanges = true;
        this.showNotification('success', `${previousDateStr} の設定をコピーしました`);
      } else {
        this.showNotification('info', '前日のデータが見つかりませんでした');
      }
    } catch (error) {
      this.error('前日設定コピーエラー:', error);
      this.showNotification('error', '前日設定のコピーに失敗しました');
    }
  }

  /**
   * リアルタイムプレビュー更新
   */
  updateRealTimePreview() {
    if (this.previewSection && !this.previewSection.classList.contains('preview-hidden')) {
      this.previewLessonStatus();
    }
  }

  /**
   * レッスン状況プレビュー
   */
  previewLessonStatus() {
    try {
      const data = this.getFormData();
      const previewHTML = this.generatePreviewHTML(data);
      
      if (this.previewContent) {
        this.previewContent.innerHTML = previewHTML;
      }
      
      // プレビューパネルの表示切り替え
      if (this.previewSection.classList.contains('preview-hidden')) {
        this.previewSection.classList.remove('preview-hidden');
        this.previewSection.classList.add('preview-visible');
      } else {
        this.previewSection.classList.add('preview-hidden');
        this.previewSection.classList.remove('preview-visible');
      }
      
      this.showNotification('info', 'プレビューを更新しました');
    } catch (error) {
      this.error('プレビュー生成エラー:', error);
      this.showNotification('error', 'プレビューの生成に失敗しました');
    }
  }

  /**
   * プレビューHTML生成
   */
  generatePreviewHTML(data) {
    const statusClass = data.globalStatus;
    const statusText = this.mapStatusKeyToJapanese(data.globalStatus);
    const statusIcon = this.getStatusIcon(data.globalStatus);

    return `
      <div class="lesson-status-display">
        <div class="main-status ${statusClass}">
          <div class="status-icon">
            <i class="${statusIcon}"></i>
          </div>
          <div class="status-text">
            <h3>本日のレッスン開催状況</h3>
            <div class="status-indicator ${statusClass}">${statusText}</div>
            ${data.globalMessage ? `<div class="status-message">${data.globalMessage}</div>` : ''}
          </div>
        </div>
        
        <div class="courses-detail">
          <h4>コース別詳細</h4>
          <div class="courses-grid">
            <div class="course-item">
              <div class="course-header">
                <h4>ベーシックコース</h4>
                <div class="course-time">17:00-17:50</div>
              </div>
              <div class="status-badge ${data.courses.basic.status}">
                ${this.mapStatusKeyToJapanese(data.courses.basic.status)}
              </div>
              ${data.courses.basic.message ? `<div class="course-message">${data.courses.basic.message}</div>` : ''}
            </div>
            
            <div class="course-item">
              <div class="course-header">
                <h4>アドバンスコース</h4>
                <div class="course-time">18:00-18:50</div>
              </div>
              <div class="status-badge ${data.courses.advance.status}">
                ${this.mapStatusKeyToJapanese(data.courses.advance.status)}
              </div>
              ${data.courses.advance.message ? `<div class="course-message">${data.courses.advance.message}</div>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * ボタンアクション: 下書き保存
   */
  async saveDraftLessonStatus() {
    try {
      const data = this.getFormData();
      const result = await this.storageService.saveStatus(data);
      
      if (result.success) {
        this.hasUnsavedChanges = false;
        this.currentData = data;
        this.showNotification('success', '下書きを保存しました', 2000);
      } else {
        this.showNotification('error', '下書き保存に失敗しました');
      }
    } catch (error) {
      this.error('下書き保存エラー:', error);
      this.showNotification('error', '下書き保存中にエラーが発生しました');
    }
  }

  /**
   * ボタンアクション: 保存して公開
   */
  async updateLessonStatusModern() {
    try {
      const data = this.getFormData();
      
      // バリデーション
      if (!this.validateData(data)) {
        return;
      }
      
      // 確認ダイアログ
      const confirmMessage = this.generateConfirmMessage(data);
      if (!confirm(confirmMessage)) {
        this.showNotification('info', '公開をキャンセルしました');
        return;
      }
      
      // 保存実行
      const result = await this.storageService.updateStatus(data);
      
      if (result.success) {
        this.hasUnsavedChanges = false;
        this.currentData = data;
        this.updateCurrentStatusDisplay(data);
        
        // LP側の表示も更新
        if (window.lessonStatusDisplay && typeof window.lessonStatusDisplay.refresh === 'function') {
          window.lessonStatusDisplay.refresh();
        }
        
        // イベント発行
        EventBus.emit('button:lessonStatus:updated', { date: data.date });
        
        this.showNotification('success', 'レッスン状況を公開しました');
      } else {
        this.showNotification('error', result.error || '公開に失敗しました');
      }
      
    } catch (error) {
      this.error('レッスン状況公開エラー:', error);
      this.showNotification('error', '公開中にエラーが発生しました');
    }
  }

  /**
   * データバリデーション
   */
  validateData(data) {
    if (!data.date) {
      this.showNotification('error', '日付を選択してください');
      return false;
    }
    
    return true;
  }

  /**
   * 確認メッセージ生成
   */
  generateConfirmMessage(data) {
    return `${data.date} のレッスン状況を公開しますか？\n\n` +
      `全体ステータス: ${this.mapStatusKeyToJapanese(data.globalStatus)}\n` +
      `ベーシックコース: ${this.mapStatusKeyToJapanese(data.courses.basic.status)}\n` +
      `アドバンスコース: ${this.mapStatusKeyToJapanese(data.courses.advance.status)}`;
  }

  /**
   * ボタンアクション: リセット
   */
  resetLessonStatus() {
    if (confirm('現在の設定をリセットしますか？未保存の変更は失われます。')) {
      const date = this.dateInput?.value || this.getTodayDate();
      this.setDefaultForm(date);
      this.hasUnsavedChanges = false;
      this.updateRealTimePreview();
      this.showNotification('info', '設定をリセットしました');
    }
  }

  /**
   * ボタンアクション: テンプレート保存
   */
  copyToTemplate() {
    const data = this.getFormData();
    const templateName = prompt('テンプレート名を入力してください:', `${this.mapStatusKeyToJapanese(data.globalStatus)}設定`);
    
    if (templateName) {
      this.saveTemplate(templateName, data);
      this.showNotification('success', `テンプレート「${templateName}」を保存しました`);
    }
  }

  /**
   * テンプレート保存
   */
  saveTemplate(name, data) {
    const template = {
      id: Date.now(),
      name: name,
      data: { ...data, date: null }, // 日付は除外
      createdAt: new Date().toISOString()
    };
    
    this.templates.unshift(template);
    
    // 最大数を超えた場合は古いものを削除
    if (this.templates.length > this.config.maxTemplates) {
      this.templates = this.templates.slice(0, this.config.maxTemplates);
    }
    
    localStorage.setItem('lessonStatusTemplates', JSON.stringify(this.templates));
  }

  /**
   * テンプレート読み込み
   */
  loadTemplates() {
    try {
      const stored = localStorage.getItem('lessonStatusTemplates');
      if (stored) {
        this.templates = JSON.parse(stored);
      }
    } catch (error) {
      this.warn('テンプレート読み込みエラー:', error);
      this.templates = [];
    }
  }

  /**
   * セクション折りたたみ
   */
  toggleSection(toggleButton) {
    const targetId = toggleButton.dataset.toggle;
    const targetSection = document.getElementById(targetId);
    
    if (targetSection) {
      const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
      const newState = !isExpanded;
      
      toggleButton.setAttribute('aria-expanded', newState);
      
      if (newState) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('visible');
      } else {
        targetSection.classList.add('hidden');
        targetSection.classList.remove('visible');
      }
      
      const icon = toggleButton.querySelector('i');
      if (icon) {
        icon.className = newState ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
      }
    }
  }

  /**
   * ローディング状態表示
   */
  showLoadingStatus() {
    if (this.currentStatusDisplay) {
      const statusValue = document.getElementById('current-status-value');
      if (statusValue) {
        statusValue.innerHTML = `
          <i class="fas fa-spinner fa-spin"></i>
          読み込み中...
        `;
      }
    }
  }

  /**
   * 通知表示
   */
  showNotification(type, message, duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `status-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <strong>${this.getNotificationTitle(type)}</strong>
        <p>${message}</p>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 表示アニメーション
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // 自動削除
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }

  /**
   * 通知タイトル取得
   */
  getNotificationTitle(type) {
    const titles = {
      'success': '成功',
      'error': 'エラー',
      'info': '情報',
      'warning': '警告'
    };
    return titles[type] || '通知';
  }

  /**
   * ステータス更新イベントハンドラ
   */
  handleStatusUpdate(data) {
    const currentDate = this.dateInput?.value || this.getTodayDate();
    
    if (data.date === currentDate && data.source !== 'local') {
      this.debug('他のタブからレッスン状況が更新されました');
      this.showNotification('info', '他のタブでレッスン状況が更新されました');
      
      if (confirm('他のタブでレッスン状況が更新されました。最新の内容を読み込みますか？')) {
        this.loadStatusByDate(currentDate);
      }
    }
  }

  /**
   * 日本語ステータスを英語キーにマッピング
   */
  mapJapaneseStatusToKey(japanese) {
    const mapping = {
      '通常開催': 'scheduled',
      '中止': 'cancelled',
      '室内開催': 'indoor',
      '延期': 'postponed'
    };
    return mapping[japanese] || 'scheduled';
  }

  /**
   * 英語キーを日本語ステータスにマッピング
   */
  mapStatusKeyToJapanese(key) {
    const mapping = {
      'scheduled': '通常開催',
      'cancelled': '中止',
      'indoor': '室内開催',
      'postponed': '延期'
    };
    return mapping[key] || '通常開催';
  }

  /**
   * 今日の日付取得
   */
  getTodayDate() {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * クリーンアップ
   */
  destroy() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    EventBus.off('lessonStatus:updated');
    
    super.destroy();
  }

  /**
   * 未実装アクション用のエラーハンドリング
   */
  handleUnknownAction(actionName) {
    this.warn(`未実装のアクション: ${actionName}`);
    this.showNotification('warning', `"${actionName}" 機能は現在開発中です`);
  }
} 