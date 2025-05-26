/**
 * ログ管理クラス
 * 一貫したログ出力とデバッグ機能を提供
 */

export class Logger {
  constructor(module = 'System') {
    this.module = module;
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    this.currentLevel = this.levels.INFO;
    this.logs = [];
    this.maxLogs = 1000;
  }

  /**
   * ログレベルを設定
   */
  setLevel(level) {
    if (typeof level === 'string') {
      this.currentLevel = this.levels[level.toUpperCase()] ?? this.levels.INFO;
    } else {
      this.currentLevel = level;
    }
  }

  /**
   * エラーログ
   */
  error(message, ...args) {
    this._log('ERROR', message, ...args);
  }

  /**
   * 警告ログ
   */
  warn(message, ...args) {
    this._log('WARN', message, ...args);
  }

  /**
   * 情報ログ
   */
  info(message, ...args) {
    this._log('INFO', message, ...args);
  }

  /**
   * デバッグログ
   */
  debug(message, ...args) {
    this._log('DEBUG', message, ...args);
  }

  /**
   * 内部ログ処理
   */
  _log(level, message, ...args) {
    const levelValue = this.levels[level];
    
    if (levelValue > this.currentLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      module: this.module,
      message,
      args: args.length > 0 ? args : undefined
    };

    // メモリ内ログ保存
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // コンソール出力
    const prefix = `[${timestamp}] [${level}] [${this.module}]`;
    
    switch (level) {
      case 'ERROR':
        console.error(prefix, message, ...args);
        break;
      case 'WARN':
        console.warn(prefix, message, ...args);
        break;
      case 'INFO':
        console.info(prefix, message, ...args);
        break;
      case 'DEBUG':
        console.debug(prefix, message, ...args);
        break;
    }
  }

  /**
   * ログを取得
   */
  getLogs(level = null, limit = 100) {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level.toUpperCase());
    }
    
    return filteredLogs.slice(-limit);
  }

  /**
   * ログをクリア
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * ログをエクスポート
   */
  exportLogs() {
    const data = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * パフォーマンス測定開始
   */
  time(label) {
    console.time(`[${this.module}] ${label}`);
  }

  /**
   * パフォーマンス測定終了
   */
  timeEnd(label) {
    console.timeEnd(`[${this.module}] ${label}`);
  }
} 