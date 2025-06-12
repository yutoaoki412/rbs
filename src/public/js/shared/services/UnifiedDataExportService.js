/**
 * 統合データエクスポートサービス（完全版）
 * 全てのLocal Storageデータを統一エクスポート・インポート機能
 * 旧DataExportServiceの機能も統合した決定版
 * @version 3.0.0
 */

import { BaseService } from '../../lib/base/BaseService.js';
import { EventBus } from './EventBus.js';
import { CONFIG } from '../constants/config.js';

export class UnifiedDataExportService extends BaseService {
  constructor() {
    super('UnifiedDataExportService');
    
    // 統一ストレージキー（CONFIG.storage.keysから取得）
    this.storageKeys = {
      exportHistory: CONFIG.storage.keys.exportHistory || 'rbs_export_history'
    };
    
    // データサービス参照（旧DataExportServiceとの互換性）
    this.dataServices = new Map();
    
    // エクスポート対象データの定義（完全版）
    this.dataSchemas = {
      articles: {
        key: CONFIG.storage.keys.articles,
        type: 'array',
        description: '記事データ',
        validator: (data) => Array.isArray(data),
        icon: 'fas fa-newspaper'
      },
      instagram: {
        key: CONFIG.storage.keys.instagramPosts,
        fallbackKeys: ['rbs_instagram', 'rbs_instagram_posts'],
        type: 'array',
        description: 'Instagram投稿データ',
        validator: (data) => Array.isArray(data),
        icon: 'fab fa-instagram'
      },
      lessons: {
        key: CONFIG.storage.keys.lessonStatus,
        fallbackKeys: ['rbs_lesson_status', CONFIG.storage.keys.lessons],
        type: 'object',
        description: 'レッスンステータスデータ',
        validator: (data) => typeof data === 'object' && data !== null,
        icon: 'fas fa-calendar-check'
      },
      settings: {
        key: CONFIG.storage.keys.settings,
        fallbackKeys: ['rbs_settings', CONFIG.storage.keys.adminSettings],
        type: 'object',
        description: '設定データ',
        validator: (data) => typeof data === 'object' && data !== null,
        icon: 'fas fa-cog'
      },
      auth: {
        key: CONFIG.storage.keys.auth,
        type: 'object',
        description: '認証データ',
        validator: (data) => typeof data === 'object' && data !== null,
        sensitive: true,
        icon: 'fas fa-key'
      },
      adminAuth: {
        key: CONFIG.storage.keys.adminAuth,
        type: 'object',
        description: '管理認証データ',
        validator: (data) => typeof data === 'object' && data !== null,
        sensitive: true,
        icon: 'fas fa-user-shield'
      },
      newsDraft: {
        key: CONFIG.storage.keys.newsDraft,
        type: 'object',
        description: 'ニュース下書きデータ',
        validator: (data) => typeof data === 'object' && data !== null,
        icon: 'fas fa-edit'
      },
      notificationMode: {
        key: CONFIG.storage.keys.notificationMode,
        type: 'string',
        description: '通知モード設定',
        validator: (data) => typeof data === 'string',
        icon: 'fas fa-bell'
      }
    };
    
    // エクスポート履歴
    this.exportHistory = [];
    this.maxHistorySize = 50;
    
    // エクスポート設定
    this.defaultConfig = {
      format: 'json',
      includeMetadata: true,
      includeSensitiveData: false,
      compression: false,
      dateRange: null,
      categories: 'all'
    };
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) {
      this.warn('既に初期化済みです');
      return;
    }

    this.debug('🚀 統合データエクスポートサービス初期化開始');
    this.setupEventListeners();
    await this.loadExportHistory();
    
    this.initialized = true;
    this.debug('✅ 統合データエクスポートサービス初期化完了');
  }

  /**
   * データサービス登録（旧DataExportServiceとの互換性）
   * @param {string} serviceName - サービス名
   * @param {Object} serviceInstance - サービスインスタンス
   */
  registerDataService(serviceName, serviceInstance) {
    if (!serviceInstance || typeof serviceInstance.getExportData !== 'function') {
      throw new Error(`データサービス '${serviceName}' は getExportData メソッドを実装する必要があります`);
    }
    
    this.dataServices.set(serviceName, serviceInstance);
    this.debug(`📦 データサービス '${serviceName}' を登録しました`);
  }

  /**
   * 全データを完全エクスポート
   * @param {Object} options - エクスポートオプション
   * @returns {Promise<{success: boolean, message?: string, filename?: string, stats?: Object}>}
   */
  async exportAllData(options = {}) {
    try {
      this.log('📤 統合データエクスポート開始');
      
      // エクスポート設定の準備
      const config = { ...this.defaultConfig, ...options };
      
      // 全データ収集（スキーマベース + サービスベース）
      const exportData = await this.collectAllData(config);
      
      // データ統計計算
      const stats = this.calculateDataStats(exportData);
      
      // ファイル名生成
      const filename = this.generateExportFilename(config, stats);
      
      // エクスポート前確認（データが空の場合）
      if (stats.totalRecords === 0) {
        this.warn('⚠️ エクスポートするデータがありません');
        return {
          success: false,
          message: 'エクスポートするデータがありません',
          stats
        };
      }
      
      // ファイルダウンロード実行
      await this.downloadExportFile(exportData, filename);
      
      // 履歴に記録
      this.addToExportHistory({
        type: 'full-export',
        filename,
        timestamp: new Date().toISOString(),
        stats
      });
      
      // イベント発行
      EventBus.emit('dataExport:completed', {
        type: 'full',
        filename,
        stats
      });
      
      this.log(`📦 全データエクスポート完了: ${filename}`);
      
      return {
        success: true,
        message: `全データを ${filename} としてエクスポートしました`,
        filename,
        stats
      };
      
    } catch (error) {
      this.error('❌ 全データエクスポートエラー:', error);
      
      EventBus.emit('dataExport:failed', {
        type: 'full',
        error: error.message
      });
      
      return {
        success: false,
        message: `エクスポートに失敗しました: ${error.message}`
      };
    }
  }

  /**
   * カテゴリ別データエクスポート
   * @param {string} category - カテゴリ名
   * @param {Object} options - オプション
   * @returns {Promise<{success: boolean, message?: string, filename?: string, stats?: Object}>}
   */
  async exportDataByCategory(category, options = {}) {
    try {
      this.log(`📦 カテゴリ別エクスポート開始: ${category}`);
      
      const config = { ...this.defaultConfig, ...options, categories: [category] };
      const exportData = await this.collectDataByCategory(category, config);
      const stats = this.calculateDataStats(exportData);
      const filename = this.generateExportFilename(config, stats, category);
      
      await this.downloadExportFile(exportData, filename);
      
      this.addToExportHistory({
        type: 'category-export',
        category,
        filename,
        timestamp: new Date().toISOString(),
        stats
      });
      
      return {
        success: true,
        message: `${category} データを ${filename} としてエクスポートしました`,
        filename,
        stats
      };
      
    } catch (error) {
      this.error(`❌ カテゴリエクスポートエラー (${category}):`, error);
      return {
        success: false,
        message: `${category} のエクスポートに失敗しました: ${error.message}`
      };
    }
  }

  /**
   * 特定サービスのデータをエクスポート（旧DataExportServiceとの互換性）
   * @param {string} serviceName - サービス名
   * @param {Object} options - エクスポートオプション
   * @returns {Promise<{success: boolean, message?: string, filename?: string}>}
   */
  async exportServiceData(serviceName, options = {}) {
    try {
      const service = this.dataServices.get(serviceName);
      if (!service) {
        throw new Error(`データサービス '${serviceName}' が見つかりません`);
      }
      
      this.log(`🔧 ${serviceName} データエクスポート開始`);
      
      const serviceData = await this.collectServiceData(serviceName, options);
      const stats = this.calculateDataStats(serviceData);
      const filename = this.generateExportFilename({
        ...options,
        serviceName,
        type: 'service'
      }, stats);
      
      await this.downloadExportFile(serviceData, filename);
      
      // 履歴に記録
      this.addToExportHistory({
        type: 'service-export',
        serviceName,
        filename,
        timestamp: new Date().toISOString(),
        stats
      });
      
      EventBus.emit('dataExport:completed', {
        type: 'service',
        serviceName,
        filename
      });
      
      return {
        success: true,
        message: `${serviceName} データを ${filename} としてエクスポートしました`,
        filename
      };
      
    } catch (error) {
      this.error(`❌ ${serviceName} エクスポートエラー:`, error);
      
      EventBus.emit('dataExport:failed', {
        type: 'service',
        serviceName,
        error: error.message
      });
      
      return {
        success: false,
        message: `${serviceName} のエクスポートに失敗しました: ${error.message}`
      };
    }
  }

  /**
   * 全データを収集（統合版：スキーマベース + サービスベース）
   * @private
   * @param {Object} config - 設定
   * @returns {Promise<Object>}
   */
  async collectAllData(config) {
    this.debug('📊 全データ収集開始');
    
    const exportData = {
      metadata: this.generateMetadata(config, 'full'),
      data: {},
      statistics: {},
      services: {}
    };
    
    // スキーマベースのデータ収集
    for (const [schemaName, schema] of Object.entries(this.dataSchemas)) {
      try {
        // 機密データのスキップ（オプション）
        if (schema.sensitive && !config.includeSensitiveData) {
          this.debug(`🔒 機密データをスキップ: ${schemaName}`);
          continue;
        }
        
        this.debug(`📥 データ収集中: ${schemaName}`);
        const data = await this.collectSchemaData(schema);
        
        if (data !== null) {
          exportData.data[schemaName] = data;
          exportData.statistics[schemaName] = this.generateDataStatistics(schemaName, data);
        }
        
      } catch (error) {
        this.warn(`⚠️ ${schemaName} データ収集エラー:`, error);
        exportData.data[schemaName] = {
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    // 登録済みサービスからのデータ収集（旧DataExportServiceとの互換性）
    for (const [serviceName, service] of this.dataServices) {
      try {
        this.debug(`🔧 サービスデータ収集中: ${serviceName}`);
        exportData.services[serviceName] = await service.getExportData();
      } catch (error) {
        this.warn(`⚠️ ${serviceName} サービスデータ収集エラー:`, error);
        exportData.services[serviceName] = {
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    // 追加のストレージ情報
    exportData.storageInfo = this.generateStorageInfo();
    
    this.debug('✅ 全データ収集完了');
    return exportData;
  }

  /**
   * カテゴリ別データ収集
   * @private
   * @param {string} category - カテゴリ名
   * @param {Object} config - 設定
   * @returns {Promise<Object>}
   */
  async collectDataByCategory(category, config) {
    const exportData = {
      metadata: this.generateMetadata(config, 'category', category),
      data: {},
      statistics: {}
    };
    
    const schema = this.dataSchemas[category];
    if (!schema) {
      throw new Error(`カテゴリ '${category}' が見つかりません`);
    }
    
    const data = await this.collectSchemaData(schema);
    if (data !== null) {
      exportData.data[category] = data;
      exportData.statistics[category] = this.generateDataStatistics(category, data);
    }
    
    return exportData;
  }

  /**
   * 特定サービスのデータを収集（旧DataExportServiceとの互換性）
   * @private
   * @param {string} serviceName - サービス名
   * @param {Object} options - オプション
   * @returns {Promise<Object>}
   */
  async collectServiceData(serviceName, options) {
    const service = this.dataServices.get(serviceName);
    const serviceData = await service.getExportData();
    
    return {
      metadata: this.generateMetadata(options, 'service', serviceName),
      data: {
        [serviceName]: serviceData
      }
    };
  }

  /**
   * スキーマ定義に基づいてデータ収集
   * @private
   * @param {Object} schema - データスキーマ
   * @returns {Promise<*>}
   */
  async collectSchemaData(schema) {
    // メインキーからデータ取得を試行
    let data = this.getStorageData(schema.key);
    
    // フォールバックキーで再試行
    if (data === null && schema.fallbackKeys) {
      for (const fallbackKey of schema.fallbackKeys) {
        data = this.getStorageData(fallbackKey);
        if (data !== null) {
          this.debug(`🔄 フォールバック成功: ${fallbackKey}`);
          break;
        }
      }
    }
    
    // データ検証
    if (data !== null && schema.validator && !schema.validator(data)) {
      this.warn(`⚠️ データ検証失敗: ${schema.key}`);
      return null;
    }
    
    return data;
  }

  /**
   * Local Storageからデータ取得
   * @private
   * @param {string} key - ストレージキー
   * @returns {*}
   */
  getStorageData(key) {
    try {
      const rawData = localStorage.getItem(key);
      if (rawData === null) return null;
      
      return JSON.parse(rawData);
    } catch (error) {
      this.warn(`⚠️ ストレージデータ解析エラー (${key}):`, error);
      return null;
    }
  }

  /**
   * データ統計生成
   * @private
   * @param {string} schemaName - スキーマ名
   * @param {*} data - データ
   * @returns {Object}
   */
  generateDataStatistics(schemaName, data) {
    const stats = {
      type: typeof data,
      size: JSON.stringify(data).length,
      lastUpdated: new Date().toISOString()
    };
    
    if (Array.isArray(data)) {
      stats.count = data.length;
      stats.structure = 'array';
    } else if (typeof data === 'object' && data !== null) {
      stats.count = Object.keys(data).length;
      stats.structure = 'object';
    } else {
      stats.count = 1;
      stats.structure = 'primitive';
    }
    
    return stats;
  }

  /**
   * データ統計計算（統合版）
   * @private
   * @param {Object} exportData - エクスポートデータ
   * @returns {Object}
   */
  calculateDataStats(exportData) {
    const stats = {
      totalRecords: 0,
      totalSize: JSON.stringify(exportData).length,
      categories: {},
      services: {},
      timestamp: new Date().toISOString()
    };
    
    // スキーマベースデータの統計
    if (exportData.data) {
      for (const [category, data] of Object.entries(exportData.data)) {
        if (data && typeof data === 'object' && !data.error) {
          const recordCount = this.calculateRecordCount(data);
          
          stats.categories[category] = {
            records: recordCount,
            size: JSON.stringify(data).length
          };
          
          stats.totalRecords += recordCount;
        }
      }
    }
    
    // サービスベースデータの統計
    if (exportData.services) {
      for (const [serviceName, serviceData] of Object.entries(exportData.services)) {
        if (serviceData && typeof serviceData === 'object' && !serviceData.error) {
          const recordCount = this.calculateServiceRecords(serviceName, serviceData);
          
          stats.services[serviceName] = {
            records: recordCount,
            size: JSON.stringify(serviceData).length
          };
          
          stats.totalRecords += recordCount;
        }
      }
    }
    
    return stats;
  }

  /**
   * レコード数計算（汎用）
   * @private
   * @param {*} data - データ
   * @returns {number}
   */
  calculateRecordCount(data) {
    if (Array.isArray(data)) {
      return data.length;
    } else if (typeof data === 'object' && data !== null) {
      return Object.keys(data).length;
    } else {
      return 1;
    }
  }

  /**
   * サービス別レコード数計算（旧DataExportServiceとの互換性）
   * @private
   * @param {string} serviceName - サービス名
   * @param {Object} serviceData - サービスデータ
   * @returns {number}
   */
  calculateServiceRecords(serviceName, serviceData) {
    if (!serviceData || serviceData.error) {
      return 0;
    }
    
    // サービス別の計算ロジック
    switch (serviceName) {
      case 'articles':
        return serviceData.articles?.length || 0;
      case 'instagram':
        return serviceData.posts?.length || 0;
      case 'lessonStatus':
        return Object.keys(serviceData.lessonStatuses || {}).length;
      default:
        return this.calculateRecordCount(serviceData);
    }
  }

  /**
   * ストレージ情報生成
   * @private
   * @returns {Object}
   */
  generateStorageInfo() {
    const storageInfo = {
      totalKeys: localStorage.length,
      totalSize: JSON.stringify(localStorage).length,
      availableKeys: [],
      rbsKeys: [],
      schemaKeys: [],
      unknownKeys: []
    };
    
    const knownKeys = new Set(Object.values(this.dataSchemas).flatMap(schema => 
      [schema.key, ...(schema.fallbackKeys || [])]
    ));
    
    // Local Storage内の全キーを調査
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      storageInfo.availableKeys.push(key);
      
      if (key.startsWith('rbs_')) {
        storageInfo.rbsKeys.push(key);
        
        if (knownKeys.has(key)) {
          storageInfo.schemaKeys.push(key);
        } else {
          storageInfo.unknownKeys.push(key);
        }
      }
    }
    
    return storageInfo;
  }

  /**
   * メタデータ生成
   * @private
   * @param {Object} config - 設定
   * @param {string} type - エクスポートタイプ
   * @param {string} category - カテゴリ名（オプション）
   * @returns {Object}
   */
  generateMetadata(config, type, category = null) {
    return {
      exportedAt: new Date().toISOString(),
      exportType: type,
      category,
      version: CONFIG.app.version || '3.0.0',
      serviceName: 'UnifiedDataExportService',
      userAgent: navigator.userAgent,
      url: window.location.href,
      settings: {
        includeSensitiveData: config.includeSensitiveData || false,
        compression: config.compression || false,
        includeMetadata: config.includeMetadata !== false,
        dateFormat: 'ISO'
      },
      schemaVersion: '3.0.0',
      compatibility: ['DataExportService', 'UnifiedDataExportService']
    };
  }

  /**
   * エクスポートファイル名生成
   * @private
   * @param {Object} config - 設定
   * @param {Object} stats - 統計
   * @param {string} category - カテゴリ名（オプション）
   * @returns {string}
   */
  generateExportFilename(config, stats, category = null) {
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    
    let filename = 'rbs-data';
    
    if (category) {
      filename += `-${category}`;
    } else if (config.serviceName) {
      filename += `-${config.serviceName}`;
    } else {
      filename += '-full';
    }
    
    if (config.type === 'service') {
      filename += '-service';
    }
    
    if (stats && stats.totalRecords > 0) {
      filename += `-${stats.totalRecords}records`;
    }
    
    filename += `-${date}-${time}.json`;
    
    return filename;
  }

  /**
   * ファイルダウンロード実行
   * @private
   * @param {Object} data - エクスポートデータ
   * @param {string} filename - ファイル名
   */
  async downloadExportFile(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    
    // ダウンロードリンク作成
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // ダウンロード実行
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // オブジェクトURL解放
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    this.debug(`📁 ファイルダウンロード完了: ${filename}`);
  }

  /**
   * エクスポート履歴に追加
   * @private
   * @param {Object} record - 履歴レコード
   */
  addToExportHistory(record) {
    this.exportHistory.unshift(record);
    
    // 履歴サイズ制限
    if (this.exportHistory.length > this.maxHistorySize) {
      this.exportHistory = this.exportHistory.slice(0, this.maxHistorySize);
    }
    
    this.saveExportHistory();
  }

  /**
   * エクスポート履歴保存
   * @private
   */
  async saveExportHistory() {
    try {
      localStorage.setItem(this.storageKeys.exportHistory, JSON.stringify(this.exportHistory));
    } catch (error) {
      this.warn('⚠️ エクスポート履歴保存エラー:', error);
    }
  }

  /**
   * エクスポート履歴読み込み
   * @private
   */
  async loadExportHistory() {
    try {
      const saved = localStorage.getItem(this.storageKeys.exportHistory);
      if (saved) {
        this.exportHistory = JSON.parse(saved);
      }
    } catch (error) {
      this.warn('⚠️ エクスポート履歴読み込みエラー:', error);
      this.exportHistory = [];
    }
  }

  /**
   * エクスポート履歴取得
   * @returns {Array}
   */
  getExportHistory() {
    return [...this.exportHistory];
  }

  /**
   * エクスポート履歴クリア
   */
  clearExportHistory() {
    this.exportHistory = [];
    this.saveExportHistory();
    
    EventBus.emit('dataExport:historyCleared');
    this.log('🗑️ エクスポート履歴をクリアしました');
  }

  /**
   * データ完全性チェック
   * @returns {Object}
   */
  async checkDataIntegrity() {
    const report = {
      timestamp: new Date().toISOString(),
      schemas: {},
      warnings: [],
      errors: [],
      summary: {
        totalSchemas: Object.keys(this.dataSchemas).length,
        validSchemas: 0,
        missingSchemas: 0,
        errorSchemas: 0
      }
    };
    
    for (const [schemaName, schema] of Object.entries(this.dataSchemas)) {
      try {
        const data = await this.collectSchemaData(schema);
        const exists = data !== null;
        const valid = exists && schema.validator(data);
        
        report.schemas[schemaName] = {
          exists,
          valid,
          size: data ? JSON.stringify(data).length : 0,
          description: schema.description,
          icon: schema.icon,
          sensitive: schema.sensitive || false
        };
        
        if (!exists) {
          report.warnings.push(`${schemaName}: データが存在しません`);
          report.summary.missingSchemas++;
        } else if (!valid) {
          report.errors.push(`${schemaName}: データ検証に失敗しました`);
          report.summary.errorSchemas++;
        } else {
          report.summary.validSchemas++;
        }
        
      } catch (error) {
        report.errors.push(`${schemaName}: ${error.message}`);
        report.schemas[schemaName] = {
          exists: false,
          valid: false,
          error: error.message,
          description: schema.description,
          icon: schema.icon
        };
        report.summary.errorSchemas++;
      }
    }
    
    return report;
  }

  /**
   * エクスポート可能なカテゴリ一覧
   * @returns {Array}
   */
  getAvailableCategories() {
    return Object.keys(this.dataSchemas).map(name => ({
      name,
      description: this.dataSchemas[name].description,
      icon: this.dataSchemas[name].icon,
      sensitive: this.dataSchemas[name].sensitive || false
    }));
  }

  /**
   * 登録されたデータサービス一覧取得（旧DataExportServiceとの互換性）
   * @returns {Array}
   */
  getRegisteredServices() {
    return Array.from(this.dataServices.keys());
  }

  /**
   * データサービス状態取得（旧DataExportServiceとの互換性）
   * @returns {Object}
   */
  getServiceStatus() {
    const status = {};
    
    for (const [serviceName, service] of this.dataServices) {
      status[serviceName] = {
        initialized: service.initialized || false,
        hasData: this.hasServiceData(service),
        lastUpdated: service.lastUpdated || null
      };
    }
    
    return status;
  }

  /**
   * サービスがデータを持っているかチェック（旧DataExportServiceとの互換性）
   * @private
   * @param {Object} service - サービスインスタンス
   * @returns {boolean}
   */
  hasServiceData(service) {
    try {
      const data = service.getExportData();
      return this.calculateServiceRecords('unknown', data) > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * イベントリスナー設定
   * @private
   */
  setupEventListeners() {
    // データ変更の監視
    EventBus.on('articles:saved', () => this.markDataChanged('articles'));
    EventBus.on('instagram:saved', () => this.markDataChanged('instagram'));
    EventBus.on('lessonStatus:updated', () => this.markDataChanged('lessonStatus'));
    
    // Local Storage変更の監視
    EventBus.on('localStorage:changed', (data) => {
      this.debug('📦 Local Storage変更検出:', data.key);
    });
  }

  /**
   * データ変更マーク
   * @private
   * @param {string} serviceName - サービス名
   */
  markDataChanged(serviceName) {
    EventBus.emit('dataExport:dataChanged', { serviceName });
  }

  /**
   * サービス破棄
   */
  destroy() {
    EventBus.off('articles:saved');
    EventBus.off('instagram:saved');
    EventBus.off('lessonStatus:updated');
    EventBus.off('localStorage:changed');
    
    this.dataServices.clear();
    this.exportHistory = [];
    this.initialized = false;
    
    this.debug('🗑️ 統合データエクスポートサービス破棄完了');
  }
}

// シングルトンインスタンス
export const unifiedDataExportService = new UnifiedDataExportService();

// 旧DataExportServiceとの互換性（後方互換性）
export const dataExportService = unifiedDataExportService;

// デフォルトエクスポート
export default UnifiedDataExportService; 