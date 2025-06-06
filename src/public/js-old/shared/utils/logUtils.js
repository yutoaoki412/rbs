/**
 * 統一ログ管理ユーティリティ
 * 全体で一貫性のあるログ出力とエラーハンドリングを提供
 * @version 1.0.0 - 統合版
 */

import { CONFIG } from '../constants/config.js';

/**
 * ログレベル定義
 */
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

/**
 * 統一ログ管理クラス
 */
export class UnifiedLogger {
  constructor() {
    this.isEnabled = CONFIG.debug?.enabled || false;
    this.currentLevel = this.getLogLevelFromConfig();
    this.logHistory = [];
    this.maxHistorySize = 100;
    
    // コンポーネント別のログ統計
    this.stats = new Map();
  }

  /**
   * 設定からログレベルを取得
   * @private
   */
  getLogLevelFromConfig() {
    const configLevel = CONFIG.debug?.logLevel || 'info';
    switch (configLevel.toLowerCase()) {
      case 'debug': return LOG_LEVELS.DEBUG;
      case 'info': return LOG_LEVELS.INFO;
      case 'warn': return LOG_LEVELS.WARN;
      case 'error': return LOG_LEVELS.ERROR;
      case 'critical': return LOG_LEVELS.CRITICAL;
      default: return LOG_LEVELS.INFO;
    }
  }

  /**
   * ログレベルチェック
   * @private
   */
  shouldLog(level) {
    return this.isEnabled && level >= this.currentLevel;
  }

  /**
   * ログエントリを履歴に追加
   * @private
   */
  addToHistory(level, component, message, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      level: Object.keys(LOG_LEVELS)[level],
      component,
      message,
      data: data ? JSON.stringify(data) : null
    };

    this.logHistory.unshift(entry);
    
    // 履歴サイズ制限
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory = this.logHistory.slice(0, this.maxHistorySize);
    }

    // 統計更新
    if (!this.stats.has(component)) {
      this.stats.set(component, { debug: 0, info: 0, warn: 0, error: 0, critical: 0 });
    }
    const componentStats = this.stats.get(component);
    componentStats[entry.level.toLowerCase()]++;
  }

  /**
   * フォーマットされたログメッセージを生成
   * @private
   */
  formatMessage(level, component, message) {
    const timestamp = new Date().toLocaleTimeString('ja-JP');
    const levelEmoji = this.getLevelEmoji(level);
    const componentPrefix = component ? `[${component}] ` : '';
    
    return `${levelEmoji} ${timestamp} ${componentPrefix}${message}`;
  }

  /**
   * ログレベル用絵文字を取得
   * @private
   */
  getLevelEmoji(level) {
    switch (level) {
      case LOG_LEVELS.DEBUG: return '🐛';
      case LOG_LEVELS.INFO: return '📝';
      case LOG_LEVELS.WARN: return '⚠️';
      case LOG_LEVELS.ERROR: return '❌';
      case LOG_LEVELS.CRITICAL: return '🚨';
      default: return 'ℹ️';
    }
  }

  /**
   * デバッグログ
   */
  debug(component, message, data = null) {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;
    
    const formatted = this.formatMessage(LOG_LEVELS.DEBUG, component, message);
    if (data) {
      console.debug(formatted, data);
    } else {
      console.debug(formatted);
    }
    
    this.addToHistory(LOG_LEVELS.DEBUG, component, message, data);
  }

  /**
   * 情報ログ
   */
  info(component, message, data = null) {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;
    
    const formatted = this.formatMessage(LOG_LEVELS.INFO, component, message);
    if (data) {
      console.log(formatted, data);
    } else {
      console.log(formatted);
    }
    
    this.addToHistory(LOG_LEVELS.INFO, component, message, data);
  }

  /**
   * 警告ログ
   */
  warn(component, message, data = null) {
    if (!this.shouldLog(LOG_LEVELS.WARN)) return;
    
    const formatted = this.formatMessage(LOG_LEVELS.WARN, component, message);
    if (data) {
      console.warn(formatted, data);
    } else {
      console.warn(formatted);
    }
    
    this.addToHistory(LOG_LEVELS.WARN, component, message, data);
  }

  /**
   * エラーログ
   */
  error(component, message, error = null) {
    if (!this.shouldLog(LOG_LEVELS.ERROR)) return;
    
    const formatted = this.formatMessage(LOG_LEVELS.ERROR, component, message);
    if (error) {
      console.error(formatted, error);
    } else {
      console.error(formatted);
    }
    
    this.addToHistory(LOG_LEVELS.ERROR, component, message, error);
  }

  /**
   * 重要なエラーログ
   */
  critical(component, message, error = null) {
    const formatted = this.formatMessage(LOG_LEVELS.CRITICAL, component, message);
    if (error) {
      console.error(formatted, error);
    } else {
      console.error(formatted);
    }
    
    this.addToHistory(LOG_LEVELS.CRITICAL, component, message, error);
    
    // 重要なエラーはアラートも表示（開発環境のみ）
    if (CONFIG.app?.environment === 'development') {
      setTimeout(() => {
        alert(`🚨 重要なエラー [${component}]: ${message}`);
      }, 100);
    }
  }

  /**
   * グループログ開始
   */
  group(component, title) {
    if (!this.isEnabled) return;
    
    const formatted = this.formatMessage(LOG_LEVELS.INFO, component, title);
    console.group(formatted);
  }

  /**
   * グループログ終了
   */
  groupEnd() {
    if (!this.isEnabled) return;
    console.groupEnd();
  }

  /**
   * パフォーマンス測定開始
   */
  time(label) {
    if (!this.isEnabled) return;
    console.time(label);
  }

  /**
   * パフォーマンス測定終了
   */
  timeEnd(label) {
    if (!this.isEnabled) return;
    console.timeEnd(label);
  }

  /**
   * ログ履歴を取得
   */
  getHistory(component = null, level = null) {
    let filtered = [...this.logHistory];
    
    if (component) {
      filtered = filtered.filter(entry => entry.component === component);
    }
    
    if (level !== null) {
      const levelName = Object.keys(LOG_LEVELS)[level];
      filtered = filtered.filter(entry => entry.level === levelName);
    }
    
    return filtered;
  }

  /**
   * 統計情報を取得
   */
  getStats() {
    const stats = {};
    for (const [component, counts] of this.stats.entries()) {
      stats[component] = { ...counts };
    }
    return stats;
  }

  /**
   * ログシステムの状態を表示
   */
  showStatus() {
    if (!this.isEnabled) {
      console.log('🔇 ログシステムは無効です');
      return;
    }

    console.group('📊 ログシステム状態');
    console.log('有効:', this.isEnabled);
    console.log('現在のレベル:', Object.keys(LOG_LEVELS)[this.currentLevel]);
    console.log('履歴数:', this.logHistory.length);
    console.log('追跡中のコンポーネント:', this.stats.size);
    
    if (this.stats.size > 0) {
      console.log('コンポーネント別統計:');
      for (const [component, counts] of this.stats.entries()) {
        const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
        console.log(`  ${component}: ${total}件 (エラー: ${counts.error + counts.critical})`);
      }
    }
    
    console.groupEnd();
  }

  /**
   * ログをクリア
   */
  clear() {
    this.logHistory = [];
    this.stats.clear();
    console.clear();
    this.info('LogSystem', 'ログがクリアされました');
  }

  /**
   * ログ設定を更新
   */
  updateConfig(options = {}) {
    if (typeof options.enabled !== 'undefined') {
      this.isEnabled = options.enabled;
    }
    
    if (options.level) {
      this.currentLevel = this.getLogLevelFromConfig();
    }
    
    this.info('LogSystem', 'ログ設定が更新されました', options);
  }
}

// シングルトンインスタンス
let loggerInstance = null;

/**
 * 統一ログマネージャーのシングルトンインスタンスを取得
 */
export function getLogger() {
  if (!loggerInstance) {
    loggerInstance = new UnifiedLogger();
  }
  return loggerInstance;
}

/**
 * 便利な短縮関数
 */
const logger = getLogger();

export const log = {
  debug: (component, message, data) => logger.debug(component, message, data),
  info: (component, message, data) => logger.info(component, message, data),
  warn: (component, message, data) => logger.warn(component, message, data),
  error: (component, message, error) => logger.error(component, message, error),
  critical: (component, message, error) => logger.critical(component, message, error),
  group: (component, title) => logger.group(component, title),
  groupEnd: () => logger.groupEnd(),
  time: (label) => logger.time(label),
  timeEnd: (label) => logger.timeEnd(label),
  history: () => logger.getHistory(),
  stats: () => logger.getStats(),
  status: () => logger.showStatus(),
  clear: () => logger.clear()
};

// グローバルアクセス（デバッグ用）
if (typeof window !== 'undefined' && CONFIG.debug?.enabled) {
  window.rbsLog = log;
  window.rbsLogger = logger;
}

export default UnifiedLogger; 