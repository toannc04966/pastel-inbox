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
    
    // Attachments
    attachments: 'Attachments',
    
    // Theme
    darkMode: 'Dark mode',
    lightMode: 'Light mode',
    systemMode: 'System',
    autoAfter18: 'Auto dark after 18:00',
    
    // Language
    language: 'Language',
    english: 'English',
    vietnamese: 'Vietnamese',

    // Account Menu
    admin: 'Admin',
    adminPanel: 'Admin Panel',
    changePassword: 'Change Password',
    changePasswordDescription: 'Enter your current password and a new password. You will be logged out after changing.',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    passwordsDoNotMatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters',
    passwordChanged: 'Password changed successfully',
    passwordChangeFailed: 'Failed to change password',
    save: 'Save',
    saving: 'Saving...',

    // Admin Page
    createUser: 'Create User',
    createUserDescription: 'Create a new user account.',
    userCreated: 'User created successfully',
    createUserFailed: 'Failed to create user',
    loadUsersFailed: 'Failed to load users',
    noUsers: 'No users found',
    email: 'Email',
    password: 'Password',
    role: 'Role',
    user: 'User',
    createdAt: 'Created At',
    actions: 'Actions',
    resetPassword: 'Reset Password',
    resetPasswordFor: 'Set a new password for {email}',
    passwordReset: 'Password reset successfully',
    resetPasswordFailed: 'Failed to reset password',
    create: 'Create',
    creating: 'Creating...',
    resetting: 'Resetting...',
    deleteUser: 'Delete User',
    deleteUserConfirmation: 'Are you sure you want to delete user {email}?',
    deleteUserWarning: 'This action cannot be undone. This will permanently delete the user account, all sessions, and permissions.',
    userDeleted: 'User deleted successfully',
    deleteUserFailed: 'Failed to delete user',
    cannotDeleteYourself: 'Cannot delete your own account',
    deleting: 'Deleting...',
    
    // Address Only Mode
    enterEmailAddress: 'Please enter an email address',
    emailMustEndWith: 'Email must end with @{domain}',
    invalidEmailFormat: 'Invalid email format',
    enterEmailToView: 'Enter email address to view inbox:',
    loading: 'Loading...',
    openInbox: 'Open Inbox',
    recentInboxes: 'Recent Inboxes',
    noRecentInboxes: 'No recent inboxes for this domain',
    noDomains: 'No domains accessible. Contact administrator.',
    
    // Permissions Modal
    managePermissions: 'Manage Permissions',
    noPermissions: 'No domain permissions yet',
    clickAddPermission: 'Click "Add Permission" to grant access to a domain.',
    addPermission: 'Add Permission',
    permissionModes: 'Permission Modes',
    allInboxesDesc: 'User can browse all emails in domain',
    addressOnlyDesc: 'User must specify email to view',
    domain: 'Domain',
    mode: 'Mode',
    permissionsUpdated: 'Permissions updated successfully',
    permissionsUpdateFailed: 'Failed to update permissions',
    discardChanges: 'Discard unsaved changes?',
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
    
    // Attachments
    attachments: 'Tệp đính kèm',
    
    // Theme
    darkMode: 'Chế độ tối',
    lightMode: 'Chế độ sáng',
    systemMode: 'Hệ thống',
    autoAfter18: 'Tự động tối sau 18:00',
    
    // Language
    language: 'Ngôn ngữ',
    english: 'Tiếng Anh',
    vietnamese: 'Tiếng Việt',

    // Account Menu
    admin: 'Quản trị',
    adminPanel: 'Trang quản trị',
    changePassword: 'Đổi mật khẩu',
    changePasswordDescription: 'Nhập mật khẩu hiện tại và mật khẩu mới. Bạn sẽ bị đăng xuất sau khi đổi.',
    currentPassword: 'Mật khẩu hiện tại',
    newPassword: 'Mật khẩu mới',
    confirmPassword: 'Xác nhận mật khẩu',
    passwordsDoNotMatch: 'Mật khẩu không khớp',
    passwordTooShort: 'Mật khẩu phải có ít nhất 6 ký tự',
    passwordChanged: 'Đổi mật khẩu thành công',
    passwordChangeFailed: 'Đổi mật khẩu thất bại',
    save: 'Lưu',
    saving: 'Đang lưu...',

    // Admin Page
    createUser: 'Tạo người dùng',
    createUserDescription: 'Tạo tài khoản người dùng mới.',
    userCreated: 'Tạo người dùng thành công',
    createUserFailed: 'Tạo người dùng thất bại',
    loadUsersFailed: 'Tải danh sách thất bại',
    noUsers: 'Không có người dùng',
    email: 'Email',
    password: 'Mật khẩu',
    role: 'Vai trò',
    user: 'Người dùng',
    createdAt: 'Ngày tạo',
    actions: 'Hành động',
    resetPassword: 'Đặt lại mật khẩu',
    resetPasswordFor: 'Đặt mật khẩu mới cho {email}',
    passwordReset: 'Đặt lại mật khẩu thành công',
    resetPasswordFailed: 'Đặt lại mật khẩu thất bại',
    create: 'Tạo',
    creating: 'Đang tạo...',
    resetting: 'Đang đặt lại...',
    deleteUser: 'Xóa người dùng',
    deleteUserConfirmation: 'Bạn có chắc muốn xóa người dùng {email}?',
    deleteUserWarning: 'Hành động này không thể hoàn tác. Sẽ xóa vĩnh viễn tài khoản, tất cả phiên đăng nhập và quyền hạn.',
    userDeleted: 'Đã xóa người dùng thành công',
    deleteUserFailed: 'Không thể xóa người dùng',
    cannotDeleteYourself: 'Không thể xóa tài khoản của chính bạn',
    deleting: 'Đang xóa...',
    
    // Address Only Mode
    enterEmailAddress: 'Vui lòng nhập địa chỉ email',
    emailMustEndWith: 'Email phải kết thúc bằng @{domain}',
    invalidEmailFormat: 'Định dạng email không hợp lệ',
    enterEmailToView: 'Nhập địa chỉ email để xem hộp thư:',
    loading: 'Đang tải...',
    openInbox: 'Mở hộp thư',
    recentInboxes: 'Hộp thư gần đây',
    noRecentInboxes: 'Không có hộp thư gần đây cho domain này',
    noDomains: 'Không có domain. Liên hệ quản trị viên.',
    
    // Permissions Modal
    managePermissions: 'Quản lý quyền',
    noPermissions: 'Chưa có quyền truy cập domain',
    clickAddPermission: 'Nhấn "Thêm quyền" để cấp quyền truy cập domain.',
    addPermission: 'Thêm quyền',
    permissionModes: 'Chế độ quyền',
    allInboxesDesc: 'Có thể xem tất cả email trong domain',
    addressOnlyDesc: 'Phải chỉ định email để xem',
    domain: 'Domain',
    mode: 'Chế độ',
    permissionsUpdated: 'Cập nhật quyền thành công',
    permissionsUpdateFailed: 'Cập nhật quyền thất bại',
    discardChanges: 'Bỏ các thay đổi chưa lưu?',
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
