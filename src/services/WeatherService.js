/**
 * WeatherService
 * 天候情報の取得と表示を管理するサービスクラス
 * 統一されたクラス設計とエラーハンドリングを実装
 */
class WeatherService {
  constructor(options = {}) {
    this.options = {
      apiKey: options.apiKey || null,
      apiUrl: options.apiUrl || 'https://api.openweathermap.org/data/2.5/weather',
      location: options.location || { lat: 35.6762, lon: 139.6503 }, // 東京
      updateInterval: options.updateInterval || 30 * 60 * 1000, // 30分
      cacheKey: options.cacheKey || 'weather_data',
      cacheDuration: options.cacheDuration || 15 * 60 * 1000, // 15分
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 2000,
      ...options
    };

    // 状態管理
    this.state = {
      isInitialized: false,
      isUpdating: false,
      lastUpdateTime: null,
      retryCount: 0,
      currentWeather: null
    };

    // タイマー管理
    this.timers = {
      update: null,
      retry: null
    };

    // キャッシュマネージャー
    this.cacheManager = options.cacheManager || window.cacheManager;
    this.storageManager = options.storageManager || window.storageManager;

    // 天候アイコンマッピング
    this.weatherIcons = {
      'clear': '☀️',
      'clouds': '☁️',
      'rain': '🌧️',
      'drizzle': '🌦️',
      'thunderstorm': '⛈️',
      'snow': '❄️',
      'mist': '🌫️',
      'fog': '🌫️',
      'haze': '🌫️',
      'dust': '🌪️',
      'sand': '🌪️',
      'ash': '🌋',
      'squall': '💨',
      'tornado': '🌪️'
    };

    // イベントハンドラーのバインド
    this.boundHandlers = {
      handleVisibilityChange: this.handleVisibilityChange.bind(this),
      handleOnline: this.handleOnline.bind(this),
      handleOffline: this.handleOffline.bind(this)
    };

    this.init();
  }

  /**
   * サービスを初期化
   */
  async init() {
    try {
      this.bindEvents();
      await this.loadCachedWeather();
      this.startPeriodicUpdate();
      this.state.isInitialized = true;
      
      this.dispatchEvent('weather-service:initialized', { service: this });
      
    } catch (error) {
      this.handleError('天候サービスの初期化に失敗', error);
    }
  }

  /**
   * イベントリスナーを設定
   */
  bindEvents() {
    document.addEventListener('visibilitychange', this.boundHandlers.handleVisibilityChange);
    window.addEventListener('online', this.boundHandlers.handleOnline);
    window.addEventListener('offline', this.boundHandlers.handleOffline);
  }

  /**
   * ページ可視性変更処理
   */
  handleVisibilityChange() {
    if (!document.hidden && this.isDataStale()) {
      this.updateWeather();
    }
  }

  /**
   * オンライン復帰処理
   */
  handleOnline() {
    this.updateWeather();
  }

  /**
   * オフライン処理
   */
  handleOffline() {
    this.dispatchEvent('weather-service:offline');
  }

  /**
   * キャッシュされた天候データを読み込み
   */
  async loadCachedWeather() {
    try {
      const cachedData = this.cacheManager.get(this.options.cacheKey);
      if (cachedData && this.isValidWeatherData(cachedData)) {
        this.state.currentWeather = cachedData;
        this.state.lastUpdateTime = new Date(cachedData.timestamp);
        this.displayWeather(cachedData);
        
        this.dispatchEvent('weather-service:cached-data-loaded', { data: cachedData });
        return true;
      }
      return false;
    } catch (error) {
      this.handleError('キャッシュデータの読み込みに失敗', error);
      return false;
    }
  }

  /**
   * 定期更新を開始
   */
  startPeriodicUpdate() {
    this.stopPeriodicUpdate();
    
    // 初回実行（キャッシュがない場合のみ）
    if (!this.state.currentWeather) {
      this.updateWeather();
    }
    
    // 定期実行
    this.timers.update = setInterval(() => {
      this.updateWeather();
    }, this.options.updateInterval);
    
    this.dispatchEvent('weather-service:periodic-update-started');
  }

  /**
   * 定期更新を停止
   */
  stopPeriodicUpdate() {
    if (this.timers.update) {
      clearInterval(this.timers.update);
      this.timers.update = null;
    }
    
    if (this.timers.retry) {
      clearTimeout(this.timers.retry);
      this.timers.retry = null;
    }
    
    this.dispatchEvent('weather-service:periodic-update-stopped');
  }

  /**
   * 天候データを更新
   */
  async updateWeather() {
    if (this.state.isUpdating || !navigator.onLine) return;

    try {
      this.state.isUpdating = true;
      
      const weatherData = await this.fetchWeatherData();
      
      if (weatherData) {
        this.state.currentWeather = weatherData;
        this.state.lastUpdateTime = new Date();
        this.state.retryCount = 0;
        
        // キャッシュに保存
        this.cacheManager.set(this.options.cacheKey, weatherData, {
          ttl: this.options.cacheDuration
        });
        
        // 表示を更新
        this.displayWeather(weatherData);
        
        this.dispatchEvent('weather-service:updated', { data: weatherData });
      }
      
    } catch (error) {
      this.handleUpdateError(error);
    } finally {
      this.state.isUpdating = false;
    }
  }

  /**
   * 天候データをAPIから取得
   */
  async fetchWeatherData() {
    try {
      if (!this.options.apiKey) {
        // APIキーがない場合はモックデータを返す
        return this.getMockWeatherData();
      }

      const url = new URL(this.options.apiUrl);
      url.searchParams.append('lat', this.options.location.lat);
      url.searchParams.append('lon', this.options.location.lon);
      url.searchParams.append('appid', this.options.apiKey);
      url.searchParams.append('units', 'metric');
      url.searchParams.append('lang', 'ja');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: this.createAbortSignal(10000) // 10秒タイムアウト
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.convertApiDataToInternalFormat(data);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('天候データの取得がタイムアウトしました');
      }
      throw error;
    }
  }

  /**
   * AbortSignalを作成
   */
  createAbortSignal(timeout) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
  }

  /**
   * APIデータを内部形式に変換
   */
  convertApiDataToInternalFormat(apiData) {
    return {
      temperature: Math.round(apiData.main.temp),
      description: apiData.weather[0].description,
      icon: this.getWeatherIcon(apiData.weather[0].main.toLowerCase()),
      humidity: apiData.main.humidity,
      windSpeed: apiData.wind?.speed || 0,
      pressure: apiData.main.pressure,
      visibility: apiData.visibility ? Math.round(apiData.visibility / 1000) : null,
      timestamp: new Date().toISOString(),
      location: apiData.name || '東京',
      condition: apiData.weather[0].main.toLowerCase()
    };
  }

  /**
   * モック天候データを取得
   */
  getMockWeatherData() {
    const conditions = ['clear', 'clouds', 'rain'];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      temperature: Math.round(Math.random() * 20 + 10), // 10-30度
      description: this.getWeatherDescription(randomCondition),
      icon: this.getWeatherIcon(randomCondition),
      humidity: Math.round(Math.random() * 40 + 40), // 40-80%
      windSpeed: Math.round(Math.random() * 10 + 1), // 1-10 m/s
      pressure: Math.round(Math.random() * 50 + 1000), // 1000-1050 hPa
      visibility: Math.round(Math.random() * 10 + 5), // 5-15 km
      timestamp: new Date().toISOString(),
      location: '東京',
      condition: randomCondition
    };
  }

  /**
   * 天候アイコンを取得
   */
  getWeatherIcon(condition) {
    return this.weatherIcons[condition] || '🌤️';
  }

  /**
   * 天候説明を取得
   */
  getWeatherDescription(condition) {
    const descriptions = {
      'clear': '晴れ',
      'clouds': '曇り',
      'rain': '雨',
      'drizzle': '小雨',
      'thunderstorm': '雷雨',
      'snow': '雪',
      'mist': '霧',
      'fog': '霧',
      'haze': 'もや',
      'dust': '砂塵',
      'sand': '砂嵐',
      'ash': '火山灰',
      'squall': '突風',
      'tornado': '竜巻'
    };
    
    return descriptions[condition] || '不明';
  }

  /**
   * 天候データを表示
   */
  displayWeather(weatherData) {
    try {
      const weatherElements = document.querySelectorAll('.weather-info');
      
      weatherElements.forEach(element => {
        this.updateWeatherElement(element, weatherData);
      });
      
      // 特定の天候に応じた追加処理
      this.handleWeatherConditions(weatherData);
      
    } catch (error) {
      this.handleError('天候表示の更新に失敗', error);
    }
  }

  /**
   * 天候要素を更新
   */
  updateWeatherElement(element, weatherData) {
    const template = element.dataset.template || 'default';
    
    switch (template) {
      case 'simple':
        element.innerHTML = `
          <span class="weather-icon">${weatherData.icon}</span>
          <span class="weather-text">${weatherData.temperature}°C ${weatherData.description}</span>
        `;
        break;
        
      case 'detailed':
        element.innerHTML = `
          <div class="weather-main">
            <span class="weather-icon">${weatherData.icon}</span>
            <div class="weather-details">
              <div class="weather-temp">${weatherData.temperature}°C</div>
              <div class="weather-desc">${weatherData.description}</div>
            </div>
          </div>
          <div class="weather-extra">
            <span>湿度: ${weatherData.humidity}%</span>
            <span>風速: ${weatherData.windSpeed}m/s</span>
          </div>
        `;
        break;
        
      default:
        element.innerHTML = `
          <span class="weather-icon">${weatherData.icon}</span>
          <span class="weather-text">${weatherData.temperature}°C ${weatherData.description}</span>
        `;
    }
    
    // 天候に応じたスタイル調整
    this.applyWeatherStyles(element, weatherData);
  }

  /**
   * 天候に応じたスタイルを適用
   */
  applyWeatherStyles(element, weatherData) {
    // 既存のクラスをクリア
    element.classList.remove('weather-clear', 'weather-clouds', 'weather-rain', 'weather-snow');
    
    // 天候に応じたクラスを追加
    element.classList.add(`weather-${weatherData.condition}`);
    
    // 温度に応じた色調整
    if (weatherData.temperature >= 30) {
      element.style.color = '#e74c3c'; // 暑い日は赤
    } else if (weatherData.temperature <= 5) {
      element.style.color = '#3498db'; // 寒い日は青
    } else {
      element.style.color = ''; // デフォルト
    }
  }

  /**
   * 特定の天候条件に応じた処理
   */
  handleWeatherConditions(weatherData) {
    // 雨の場合の注意喚起
    if (weatherData.condition === 'rain' || weatherData.condition === 'thunderstorm') {
      this.dispatchEvent('weather-service:rain-detected', { data: weatherData });
    }
    
    // 強風の場合の注意喚起
    if (weatherData.windSpeed > 10) {
      this.dispatchEvent('weather-service:strong-wind-detected', { data: weatherData });
    }
    
    // 極端な温度の場合の注意喚起
    if (weatherData.temperature > 35 || weatherData.temperature < 0) {
      this.dispatchEvent('weather-service:extreme-temperature-detected', { data: weatherData });
    }
  }

  /**
   * データが古いかチェック
   */
  isDataStale() {
    if (!this.state.lastUpdateTime) return true;
    
    const now = new Date();
    const diff = now - this.state.lastUpdateTime;
    return diff > this.options.cacheDuration;
  }

  /**
   * 天候データの有効性をチェック
   */
  isValidWeatherData(data) {
    return data &&
           typeof data.temperature === 'number' &&
           typeof data.description === 'string' &&
           typeof data.icon === 'string' &&
           data.timestamp;
  }

  /**
   * 更新エラーを処理
   */
  handleUpdateError(error) {
    this.state.retryCount++;
    
    if (this.state.retryCount <= this.options.retryAttempts) {
      console.warn(`天候データの更新に失敗しました。リトライします (${this.state.retryCount}/${this.options.retryAttempts}):`, error);
      
      this.timers.retry = setTimeout(() => {
        this.updateWeather();
      }, this.options.retryDelay * this.state.retryCount);
      
    } else {
      console.error('天候データの更新に失敗しました。最大リトライ回数に達しました:', error);
      this.state.retryCount = 0;
      
      // キャッシュデータがあれば表示を維持
      if (this.state.currentWeather) {
        this.displayOfflineIndicator();
      }
      
      this.dispatchEvent('weather-service:update-failed', {
        error: error.message,
        retryCount: this.state.retryCount
      });
    }
  }

  /**
   * オフラインインジケーターを表示
   */
  displayOfflineIndicator() {
    const weatherElements = document.querySelectorAll('.weather-info');
    
    weatherElements.forEach(element => {
      const offlineIndicator = element.querySelector('.weather-offline');
      if (!offlineIndicator) {
        const indicator = document.createElement('span');
        indicator.className = 'weather-offline';
        indicator.textContent = '(オフライン)';
        indicator.style.fontSize = '0.8em';
        indicator.style.color = '#6c757d';
        indicator.style.marginLeft = '8px';
        element.appendChild(indicator);
      }
    });
  }

  /**
   * オフラインインジケーターを削除
   */
  removeOfflineIndicator() {
    const offlineIndicators = document.querySelectorAll('.weather-offline');
    offlineIndicators.forEach(indicator => indicator.remove());
  }

  /**
   * 手動で天候データを更新
   */
  async manualUpdate() {
    try {
      this.removeOfflineIndicator();
      await this.updateWeather();
      return true;
    } catch (error) {
      this.handleError('手動更新に失敗', error);
      return false;
    }
  }

  /**
   * 現在の天候データを取得
   */
  getCurrentWeather() {
    return this.state.currentWeather ? { ...this.state.currentWeather } : null;
  }

  /**
   * 位置情報を更新
   */
  updateLocation(lat, lon) {
    this.options.location = { lat, lon };
    this.updateWeather();
    
    this.dispatchEvent('weather-service:location-updated', {
      location: this.options.location
    });
  }

  /**
   * カスタムイベントを発火
   */
  dispatchEvent(eventName, detail = {}) {
    try {
      const event = new CustomEvent(eventName, { detail });
      document.dispatchEvent(event);
    } catch (error) {
      console.error('イベント発火エラー:', error);
    }
  }

  /**
   * エラーハンドリング
   */
  handleError(message, error) {
    console.error(`[WeatherService] ${message}:`, error);
    
    this.dispatchEvent('weather-service:error', {
      message,
      error: error.message
    });
  }

  /**
   * 現在の状態を取得
   */
  getState() {
    return { ...this.state };
  }

  /**
   * オプションを更新
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    
    // 更新間隔が変更された場合は定期更新を再開
    if (newOptions.updateInterval) {
      this.startPeriodicUpdate();
    }
    
    this.dispatchEvent('weather-service:options-updated', { options: this.options });
  }

  /**
   * サービスを破棄
   */
  destroy() {
    try {
      // 定期更新を停止
      this.stopPeriodicUpdate();
      
      // イベントリスナーを削除
      document.removeEventListener('visibilitychange', this.boundHandlers.handleVisibilityChange);
      window.removeEventListener('online', this.boundHandlers.handleOnline);
      window.removeEventListener('offline', this.boundHandlers.handleOffline);
      
      // 状態をリセット
      this.state.isInitialized = false;
      
      this.dispatchEvent('weather-service:destroyed');
      
    } catch (error) {
      this.handleError('サービスの破棄に失敗', error);
    }
  }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeatherService;
} else if (typeof window !== 'undefined') {
  window.WeatherService = WeatherService;
} 