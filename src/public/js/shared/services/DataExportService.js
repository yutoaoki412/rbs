/**
 * データエクスポートサービス
 * 全てのデータのエクスポート・インポート機能を統合管理
 * @version 1.0.0
 */

import { BaseService } from '../../lib/base/BaseService.js';
import { EventBus } from './EventBus.js';
import { CONFIG } from '../constants/config.js';

export class DataExportService extends BaseService {
  constructor() {
    super('DataExportService');
    
    // 統一ストレージキー（CONFIG.storage.keysから取得）
    this.storageKeys = {
      exportHistory: CONFIG.storage.keys.exportHistory
    };
    
    // データサービス参照
    this.dataServices = new Map();
    
    // エクスポート履歴
    this.exportHistory = [];
    this.maxHistorySize = 20;
    
    // エクスポート設定
    this.defaultConfig = {
      format: 'json',
      includeMetadata: true,
      compress: false,
      dateRange: null,
      services: 'all'
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

    this.debug('初期化開始');
    this.setupEventListeners();
    await this.loadExportHistory();
    
    this.initialized = true;
    this.debug('初期化完了');
  }

  /**
   * データサービスを登録
   * @param {string} serviceName - サービス名
   * @param {Object} serviceInstance - サービスインスタンス
   */
  registerDataService(serviceName, serviceInstance) {
    if (!serviceInstance || typeof serviceInstance.getExportData !== 'function') {
      throw new Error(`データサービス '${serviceName}' は getExportData メソッドを実装する必要があります`);
    }
    
    this.dataServices.set(serviceName, serviceInstance);
    this.debug(`データサービス '${serviceName}' を登録しました`);
  }

  /**
   * 全データをエクスポート
   * @param {Object} options - エクスポートオプション
   * @returns {Promise<{success: boolean, message?: string, filename?: string}>}
   */
  async exportAllData(options = {}) {
    try {
      this.log('全データエクスポート開始');
      
      // エクスポート設定の準備
      const config = { ...this.defaultConfig, ...options };
      const exportData = await this.collectAllData(config);
      
      // ファイル名生成
      const filename = this.generateExportFilename(config);
      
      // ファイルダウンロード実行
      await this.downloadExportFile(exportData, filename);
      
      // 履歴に記録
      this.addToExportHistory({
        type: 'full-export',
        filename,
        timestamp: new Date().toISOString(),
        recordCount: this.calculateTotalRecords(exportData)
      });
      
      // イベント発行
      EventBus.emit('dataExport:completed', {
        type: 'full',
        filename,
        recordCount: this.calculateTotalRecords(exportData)
      });
      
      this.log(`全データエクスポート完了: ${filename}`);
      
      return {
        success: true,
        message: `データを ${filename} としてエクスポートしました`,
        filename
      };
      
    } catch (error) {
      this.error('全データエクスポートエラー:', error);
      
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
   * 特定サービスのデータをエクスポート
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
      
      this.log(`${serviceName} データエクスポート開始`);
      
      const serviceData = await this.collectServiceData(serviceName, options);
      const filename = this.generateExportFilename({
        ...options,
        serviceName,
        type: 'partial'
      });
      
      await this.downloadExportFile(serviceData, filename);
      
      // 履歴に記録
      this.addToExportHistory({
        type: 'service-export',
        serviceName,
        filename,
        timestamp: new Date().toISOString(),
        recordCount: this.calculateServiceRecords(serviceName, serviceData)
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
      this.error(`${serviceName} エクスポートエラー:`, error);
      
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
   * 全データを収集
   * @private
   * @param {Object} config - 設定
   * @returns {Promise<Object>}
   */
  async collectAllData(config) {
    const exportData = {
      metadata: this.generateMetadata(config, 'full'),
      data: {}
    };
    
    // 各データサービスからデータを収集
    for (const [serviceName, service] of this.dataServices) {
      try {
        this.debug(`${serviceName} データ収集中...`);
        exportData.data[serviceName] = await service.getExportData();
      } catch (error) {
        this.warn(`${serviceName} データ収集エラー:`, error);
        exportData.data[serviceName] = {
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    return exportData;
  }

  /**
   * 特定サービスのデータを収集
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
   * メタデータ生成
   * @private
   * @param {Object} config - 設定
   * @param {string} type - エクスポートタイプ
   * @param {string} serviceName - サービス名（オプション）
   * @returns {Object}
   */
  generateMetadata(config, type, serviceName = null) {
    return {
      exportedAt: new Date().toISOString(),
      exportType: type,
      serviceName,
      version: config.version || this.defaultConfig.version,
      userAgent: navigator.userAgent,
      url: window.location.href,
      settings: {
        compression: config.compression || false,
        includeMetadata: config.includeMetadata !== false,
        dateFormat: config.dateFormat || 'ISO'
      }
    };
  }

  /**
   * エクスポートファイル名生成
   * @private
   * @param {Object} config - 設定
   * @returns {string}
   */
  generateExportFilename(config) {
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    
    let filename = 'rbs-data';
    
    if (config.serviceName) {
      filename += `-${config.serviceName}`;
    }
    
    if (config.type === 'partial') {
      filename += '-partial';
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
  }

  /**
   * 総レコード数計算
   * @private
   * @param {Object} exportData - エクスポートデータ
   * @returns {number}
   */
  calculateTotalRecords(exportData) {
    let total = 0;
    
    if (exportData.data) {
      for (const [serviceName, serviceData] of Object.entries(exportData.data)) {
        total += this.calculateServiceRecords(serviceName, serviceData);
      }
    }
    
    return total;
  }

  /**
   * サービス別レコード数計算
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
        // 一般的な配列の場合
        if (Array.isArray(serviceData)) {
          return serviceData.length;
        }
        // オブジェクトの場合はキー数
        if (typeof serviceData === 'object') {
          return Object.keys(serviceData).length;
        }
        return 1;
    }
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
      this.warn('エクスポート履歴保存エラー:', error);
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
      this.warn('エクスポート履歴読み込みエラー:', error);
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
    
    EventBus.emit('dataExport:historyCleard');
    this.log('エクスポート履歴をクリアしました');
  }

  /**
   * 登録されたデータサービス一覧取得
   * @returns {Array}
   */
  getRegisteredServices() {
    return Array.from(this.dataServices.keys());
  }

  /**
   * データサービス状態取得
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
   * サービスがデータを持っているかチェック
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
   * イベントリスナーの設定
   * @private
   */
  setupEventListeners() {
    // データ変更の監視
    EventBus.on('articles:saved', () => this.markDataChanged('articles'));
    EventBus.on('instagram:saved', () => this.markDataChanged('instagram'));
    EventBus.on('lessonStatus:updated', () => this.markDataChanged('lessonStatus'));
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
   * 破棄処理
   */
  destroy() {
    this.dataServices.clear();
    this.exportHistory = [];
    
    super.destroy();
  }
}

// シングルトンインスタンス
export const dataExportService = new DataExportService(); 