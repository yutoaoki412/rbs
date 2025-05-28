/**
 * エラーハンドリングクラス
 * 一貫したエラー処理とユーザーフレンドリーなメッセージ表示
 */

import { Logger } from './Logger.js';

export class ErrorHandler {
  constructor() {
    this.logger = new Logger('ErrorHandler');
    this.errorHistory = [];
    this.maxHistory = 50;
    this.setupGlobalHandlers();
  }

  /**
   * グローバルエラーハンドラーの設定
   */
  setupGlobalHandlers() {
    // JavaScriptエラー
    window.addEventListener('error', (event) => {
      this.handle(event.error, 'グローバルJavaScriptエラー', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Promise拒否
    window.addEventListener('unhandledrejection', (event) => {
      this.handle(event.reason, 'ハンドルされていないPromise拒否');
      event.preventDefault(); // ブラウザのデフォルト処理を阻止
    });
  }

  /**
   * エラーハンドリング
   */
  handle(error, context = '不明なエラー', metadata = {}) {
    try {
      const errorInfo = this.analyzeError(error, context, metadata);
      this.logError(errorInfo);
      this.saveToHistory(errorInfo);
      this.notifyUser(errorInfo);
      
      // 重要なエラーの場合は追加処理
      if (errorInfo.severity === 'critical') {
        this.handleCriticalError(errorInfo);
      }
      
    } catch (handlerError) {
      // エラーハンドラー自体でエラーが発生した場合
      console.error('ErrorHandler自体でエラーが発生:', handlerError);
      this.fallbackErrorHandling(error, context);
    }
  }

  /**
   * エラー分析
   */
  analyzeError(error, context, metadata) {
    const timestamp = new Date().toISOString();
    
    let errorMessage = 'unknown error';
    let errorType = 'UnknownError';
    let stack = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorType = error.constructor.name;
      stack = error.stack;
    } else if (typeof error === 'string') {
      errorMessage = error;
      errorType = 'StringError';
    } else if (error && typeof error === 'object') {
      errorMessage = error.message || JSON.stringify(error);
      errorType = 'ObjectError';
    }

    // 重要度を判定
    const severity = this.determineSeverity(errorType, errorMessage, context);
    
    // ユーザーフレンドリーなメッセージを生成
    const userMessage = this.generateUserMessage(errorType, errorMessage, context);

    return {
      timestamp,
      errorType,
      errorMessage,
      userMessage,
      context,
      severity,
      stack,
      metadata,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }

  /**
   * エラーの重要度を判定
   */
  determineSeverity(errorType, message, context) {
    // 認証関連は重要
    if (context.includes('認証') || context.includes('auth')) {
      return 'critical';
    }
    
    // データ関連
    if (context.includes('データ') || message.includes('storage')) {
      return 'high';
    }
    
    // ネットワーク関連
    if (errorType.includes('Network') || message.includes('fetch')) {
      return 'medium';
    }
    
    // UI関連
    if (context.includes('UI') || errorType.includes('DOM')) {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * ユーザーフレンドリーなメッセージを生成
   */
  generateUserMessage(errorType, message, context) {
    const errorMessages = {
      'NetworkError': 'ネットワークに接続できません。インターネット接続を確認してください。',
      'AuthenticationError': 'ログインの有効期限が切れています。再度ログインしてください。',
      'ValidationError': '入力内容に不備があります。入力内容をご確認ください。',
      'StorageError': 'データの保存に失敗しました。ブラウザの設定を確認してください。',
      'PermissionError': 'この操作を実行する権限がありません。',
      'TimeoutError': '処理がタイムアウトしました。しばらく待ってから再試行してください。'
    };

    // 既知のエラータイプの場合
    if (errorMessages[errorType]) {
      return errorMessages[errorType];
    }

    // コンテキストに基づく判定
    if (context.includes('認証')) {
      return 'ログインに問題があります。再度ログインしてください。';
    }
    
    if (context.includes('保存') || context.includes('データ')) {
      return 'データの処理中にエラーが発生しました。再試行してください。';
    }

    if (context.includes('ネットワーク') || context.includes('通信')) {
      return 'サーバーとの通信でエラーが発生しました。しばらく待ってから再試行してください。';
    }

    // デフォルトメッセージ
    return 'エラーが発生しました。ページを更新してから再試行してください。';
  }

  /**
   * エラーログ出力
   */
  logError(errorInfo) {
    const { severity, errorType, errorMessage, context, stack } = errorInfo;
    
    const logMessage = `${context}: ${errorType} - ${errorMessage}`;
    
    switch (severity) {
      case 'critical':
        this.logger.error(logMessage, { errorInfo });
        break;
      case 'high':
        this.logger.error(logMessage, { errorInfo });
        break;
      case 'medium':
        this.logger.warn(logMessage, { errorInfo });
        break;
      case 'low':
        this.logger.info(logMessage, { errorInfo });
        break;
    }
  }

  /**
   * エラー履歴に保存
   */
  saveToHistory(errorInfo) {
    this.errorHistory.push(errorInfo);
    
    if (this.errorHistory.length > this.maxHistory) {
      this.errorHistory.shift();
    }
  }

  /**
   * ユーザーへの通知
   */
  notifyUser(errorInfo) {
    const { severity, userMessage } = errorInfo;
    
    // 重要度に応じて通知方法を変更
    if (severity === 'critical' || severity === 'high') {
      this.showErrorNotification(userMessage);
    } else if (severity === 'medium') {
      this.showWarningNotification(userMessage);
    }
    // lowの場合は通知しない（ログのみ）
  }

  /**
   * エラー通知表示
   */
  showErrorNotification(message) {
    this.createNotification('error', message);
  }

  /**
   * 警告通知表示
   */
  showWarningNotification(message) {
    this.createNotification('warning', message);
  }

  /**
   * 通知作成
   */
  createNotification(type, message) {
    // 既存の通知システムを活用
    if (window.showNotification) {
      window.showNotification(type, message);
    } else {
      // フォールバック
      const isError = type === 'error';
      const method = isError ? 'error' : 'warn';
      console[method](`[${type.toUpperCase()}] ${message}`);
      
      // 簡易的なアラート（開発時のみ）
      if (this.isDevelopment()) {
        alert(`${isError ? 'エラー' : '警告'}: ${message}`);
      }
    }
  }

  /**
   * 重要なエラーの処理
   */
  handleCriticalError(errorInfo) {
    // 認証エラーの場合はログアウト
    if (errorInfo.context.includes('認証') || errorInfo.context.includes('auth')) {
      setTimeout(() => {
        window.location.href = 'admin-login.html';
      }, 2000);
    }
    
    // エラーレポートの送信（将来的に実装）
    this.sendErrorReport(errorInfo);
  }

  /**
   * フォールバックエラーハンドリング
   */
  fallbackErrorHandling(error, context) {
    console.error(`フォールバックエラーハンドリング - ${context}:`, error);
    
    if (this.isDevelopment()) {
      alert(`エラーが発生しました: ${context}`);
    }
  }

  /**
   * 開発環境かどうかの判定
   */
  isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.search.includes('debug=true');
  }

  /**
   * エラーレポート送信（将来的な実装）
   */
  sendErrorReport(errorInfo) {
    // 将来的にサーバーへのエラー報告機能を実装
    this.logger.debug('エラーレポート送信（未実装）', errorInfo);
  }

  /**
   * エラー履歴取得
   */
  getErrorHistory(limit = 10) {
    return this.errorHistory.slice(-limit);
  }

  /**
   * エラー履歴クリア
   */
  clearErrorHistory() {
    this.errorHistory = [];
  }

  /**
   * エラー統計取得
   */
  getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      bySeverity: {},
      byType: {},
      recent: this.errorHistory.filter(error => {
        const hourAgo = Date.now() - (60 * 60 * 1000);
        return new Date(error.timestamp).getTime() > hourAgo;
      }).length
    };

    this.errorHistory.forEach(error => {
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      stats.byType[error.errorType] = (stats.byType[error.errorType] || 0) + 1;
    });

    return stats;
  }
} 