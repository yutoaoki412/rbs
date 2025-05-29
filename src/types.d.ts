/**
 * RBS陸上教室システム TypeScript型定義
 * JavaScript→TypeScript移行時の参考用
 */

// === アクションハンドラー関連 ===
export interface ActionParams {
  tab?: string;
  url?: string;
  target?: string;
  text?: string;
  [key: string]: string | undefined;
}

export interface ActionContext {
  element: HTMLElement;
  params: ActionParams;
  event: Event;
}

export type ActionHandler = (
  element: HTMLElement, 
  params: ActionParams, 
  event: Event
) => Promise<void> | void;

export type FeedbackType = 'success' | 'error' | 'info' | 'warning';
export type TabName = 'dashboard' | 'news-management' | 'lesson-status' | 'settings';
export type PageType = 'index' | 'admin' | 'admin-login' | 'news' | 'news-detail';

// === アプリケーション関連 ===
export interface AppConfig {
  debug: {
    enabled: boolean;
  };
  routing: Record<string, unknown>;
}

export interface AppInfo {
  version: string;
  initialized: boolean;
  loadTime: number;
  modules: string[];
  currentPage: PageType;
}

export interface ErrorInfo {
  message: string;
  stack: string;
  timestamp: string;
  userAgent: string;
  url: string;
}

// === 統計・ダッシュボード関連 ===
export interface DashboardStats {
  total: number;
  published: number;
  draft: number;
  currentMonth: number;
}

// === 記事管理関連 ===
export interface Article {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt?: string;
  featured?: boolean;
}

// === レッスン状況関連 ===
export interface LessonStatus {
  date: string;
  globalStatus: 'scheduled' | 'cancelled' | 'indoor' | 'postponed';
  globalMessage?: string;
  courses: {
    basic?: CourseStatus;
    advance?: CourseStatus;
  };
}

export interface CourseStatus {
  status: 'scheduled' | 'cancelled' | 'indoor' | 'postponed';
  message?: string;
}

// === イベント関連 ===
export interface EventListener {
  type: string;
  listener: EventListenerOrEventListenerObject;
}

// === グローバル拡張 ===
declare global {
  interface Window {
    RBS?: {
      app: Application;
      version: string;
      debug: () => AppInfo;
      modules: () => string[];
    };
  }
}

// === クラス型定義 ===
export declare class ActionHandler {
  constructor();
  init(): void;
  get isInitialized(): boolean;
  handleAction(element: HTMLElement, event: Event): Promise<void>;
  register(actionName: string, handler: ActionHandler): void;
  registerMultiple(handlers: Record<string, ActionHandler>): void;
  switchAdminTab(tabName: TabName): void;
  showFeedback(message: string, type?: FeedbackType): void;
  destroy(): void;
}

export declare class Application {
  constructor();
  get initialized(): boolean;
  get config(): AppConfig | null;
  get modules(): Map<string, any>;
  init(): Promise<void>;
  getCurrentPage(): PageType;
  getModule(name: string): any;
  getInfo(): AppInfo;
  destroy(): void;
} 