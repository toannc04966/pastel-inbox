import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type Locale = 'en' | 'vi';

const translations = {
  en: {
    // TopBar
    refresh: 'Refresh',
    clear: 'Clear',
    clearInbox: 'Clear inbox',
    allDomains: 'All domains',
    selectDomain: 'Select domain',
    autoRefreshOn: 'Auto-refresh on',
    autoRefreshOff: 'Auto-refresh off',
    pausedUserActive: 'Paused (user active)',
    enableAutoRefresh: 'Enable auto-refresh',
    disableAutoRefresh: 'Disable auto-refresh',
    logout: 'Logout',
    
    // Clear Dialog
    clearInboxQuestion: 'Clear inbox?',
    clearInboxDescription: 'This will delete all {count} messages. This action cannot be undone.',
    cancel: 'Cancel',
    confirm: 'Confirm',
    clearAll: 'Clear All',
    clearing: 'Clearing...',
    
    // Message List
    searchPlaceholder: 'Search sender, subject, content...',
    noMessages: 'No messages',
    noMessagesMatch: 'No messages match your search',
    waitingForEmails: 'Waiting for incoming emails…',
    
    // Message Viewer
    selectMessage: 'Select a message to view its content',
    noSubject: '(No subject)',
    from: 'From:',
    to: 'To:',
    showHeaders: 'Show headers',
    hideHeaders: 'Hide headers',
    markAsUnread: 'Mark as unread',
    downloadRaw: 'Download raw email (.eml)',
    rawNotAvailable: 'Raw email not available',
    back: 'Back',
    noContent: 'No content available',
    
    // Delete Dialog
    deleteMessage: 'Delete this message?',
    deleteDescription: 'This action cannot be undone.',
    delete: 'Delete',
    
    // Toast Messages
    copied: 'Copied!',
    copiedToClipboard: 'Copied to clipboard',
    emailDownloaded: 'Email downloaded',
    
    // Theme
    darkMode: 'Dark mode',
    lightMode: 'Light mode',
    systemMode: 'System',
    autoAfter18: 'Auto dark after 18:00',
    
    // Language
    language: 'Language',
    english: 'English',
    vietnamese: 'Vietnamese',
  },
  vi: {
    // TopBar
    refresh: 'Làm mới',
    clear: 'Xoá',
    clearInbox: 'Xoá hộp thư',
    allDomains: 'Tất cả domain',
    selectDomain: 'Chọn domain',
    autoRefreshOn: 'Tự động làm mới bật',
    autoRefreshOff: 'Tự động làm mới tắt',
    pausedUserActive: 'Tạm dừng (đang hoạt động)',
    enableAutoRefresh: 'Bật tự động làm mới',
    disableAutoRefresh: 'Tắt tự động làm mới',
    logout: 'Đăng xuất',
    
    // Clear Dialog
    clearInboxQuestion: 'Xoá hộp thư?',
    clearInboxDescription: 'Sẽ xoá tất cả {count} email. Hành động này không thể hoàn tác.',
    cancel: 'Huỷ',
    confirm: 'Xác nhận',
    clearAll: 'Xoá tất cả',
    clearing: 'Đang xoá...',
    
    // Message List
    searchPlaceholder: 'Tìm người gửi, tiêu đề, nội dung...',
    noMessages: 'Không có email',
    noMessagesMatch: 'Không có email phù hợp',
    waitingForEmails: 'Đang chờ email gửi đến…',
    
    // Message Viewer
    selectMessage: 'Chọn một email để xem nội dung',
    noSubject: '(Không có tiêu đề)',
    from: 'Từ:',
    to: 'Đến:',
    showHeaders: 'Hiển thị headers',
    hideHeaders: 'Ẩn headers',
    markAsUnread: 'Đánh dấu chưa đọc',
    downloadRaw: 'Tải email gốc (.eml)',
    rawNotAvailable: 'Email gốc không có sẵn',
    back: 'Quay lại',
    noContent: 'Không có nội dung',
    
    // Delete Dialog
    deleteMessage: 'Xoá email này?',
    deleteDescription: 'Hành động này không thể hoàn tác.',
    delete: 'Xoá',
    
    // Toast Messages
    copied: 'Đã sao chép!',
    copiedToClipboard: 'Đã sao chép',
    emailDownloaded: 'Đã tải email',
    
    // Theme
    darkMode: 'Chế độ tối',
    lightMode: 'Chế độ sáng',
    systemMode: 'Hệ thống',
    autoAfter18: 'Tự động tối sau 18:00',
    
    // Language
    language: 'Ngôn ngữ',
    english: 'Tiếng Anh',
    vietnamese: 'Tiếng Việt',
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'locale';

function getBrowserLocale(): Locale {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('vi')) return 'vi';
  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      return stored || getBrowserLocale();
    }
    return 'en';
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      let text: string = translations[locale][key] || translations.en[key] || key;
      
      if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
          text = text.replace(`{${paramKey}}`, String(value));
        });
      }
      
      return text;
    },
    [locale]
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
