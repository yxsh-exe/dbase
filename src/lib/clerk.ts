import { dark } from '@clerk/themes';

// Centralized Clerk appearance configuration for dark theme
export const clerkAppearance = {
  baseTheme: dark,
  elements: {
    // Form elements
    formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm',
    formButtonSecondary:
      'bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border',
    formFieldLabel: 'text-foreground font-medium',
    formFieldInput:
      'bg-background border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent',
    formFieldInputShowPasswordButton: 'text-muted-foreground hover:text-foreground',

    // Card and container elements
    card: 'bg-card border border-border shadow-lg',
    pageScrollBox: 'bg-background',
    navbar: 'bg-card border-b border-border',

    // Header elements
    headerTitle: 'text-foreground font-semibold',
    headerSubtitle: 'text-muted-foreground',

    // Social buttons
    socialButtonsBlockButton:
      'bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border shadow-sm',
    socialButtonsBlockButtonText: 'text-secondary-foreground',
    socialButtonsBlockButtonArrow: 'text-secondary-foreground',

    // Footer elements
    footerActionLink: 'text-primary hover:text-primary/80 font-medium',
    footerActionText: 'text-muted-foreground',

    // Divider elements
    dividerLine: 'bg-border',
    dividerText: 'text-muted-foreground bg-card px-2',

    // Identity preview
    identityPreviewText: 'text-foreground',
    identityPreviewEditButton: 'text-primary hover:text-primary/80',

    // Form actions
    formActionPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    formActionSecondary:
      'bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border',

    // Alert elements
    alert: 'bg-destructive/10 border border-destructive/20 text-destructive',
    alertText: 'text-destructive',

    // Avatar elements
    avatarBox: 'bg-primary/10 border border-primary/20',
    avatarImage: 'rounded-full',

    // User button
    userButtonBox: 'hover:bg-secondary/80 rounded-md',
    userButtonTrigger: 'hover:bg-secondary/80',
    userButtonPopoverCard: 'bg-card border border-border shadow-lg',
    userButtonPopoverActionButton: 'hover:bg-secondary/80 text-foreground',
    userButtonPopoverActionButtonText: 'text-foreground',

    // Modal elements
    modalBackdrop: 'bg-background/80 backdrop-blur-sm',
    modalContent: 'bg-card border border-border shadow-xl',
    modalCloseButton: 'text-muted-foreground hover:text-foreground',

    // Profile elements
    profileSection: 'border-b border-border',
    profileSectionTitle: 'text-foreground font-semibold',
    profileSectionContent: 'text-muted-foreground',

    // Organization elements
    organizationSwitcherTrigger: 'hover:bg-secondary/80 rounded-md',
    organizationSwitcherPopoverCard: 'bg-card border border-border shadow-lg',
    organizationSwitcherPopoverActionButton: 'hover:bg-secondary/80 text-foreground',

    // Verification elements
    verificationCodeField:
      'bg-background border border-border text-foreground text-center text-lg font-mono',
    verificationCodeFieldInput:
      'bg-background border border-border text-foreground text-center text-lg font-mono',

    // Loading states
    spinner: 'text-primary',
    loadingText: 'text-muted-foreground',
  },
  variables: {
    colorPrimary: 'hsl(var(--primary))',
    colorPrimaryText: 'hsl(var(--primary-foreground))',
    colorBackground: 'hsl(var(--background))',
    colorInputBackground: 'hsl(var(--background))',
    colorInputText: 'hsl(var(--foreground))',
    colorText: 'hsl(var(--foreground))',
    colorTextSecondary: 'hsl(var(--muted-foreground))',
    colorSuccess: 'hsl(var(--success))',
    colorSuccessText: 'hsl(var(--success-foreground))',
    colorDanger: 'hsl(var(--destructive))',
    colorDangerText: 'hsl(var(--destructive-foreground))',
    colorWarning: 'hsl(var(--warning))',
    colorWarningText: 'hsl(var(--warning-foreground))',
    colorNeutral: 'hsl(var(--muted))',
    colorNeutralText: 'hsl(var(--muted-foreground))',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--font-geist-sans)',
    fontFamilyButtons: 'var(--font-geist-sans)',
  },
};

// Production-ready Clerk configuration
export const clerkConfig = {
  // Appearance
  appearance: clerkAppearance,

  // Routing
  routing: 'hash' as const,

  // Localization
  localization: {
    locale: 'en-US',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },

  // Security settings
  signIn: {
    // Redirect to projects page after sign in
    afterSignInUrl: '/projects',
    // Redirect to home page after sign out
    afterSignOutUrl: '/',
  },

  signUp: {
    // Redirect to projects page after sign up
    afterSignUpUrl: '/projects',
  },

  // User profile settings
  userProfile: {
    // Show email in user profile
    showEmailAddress: true,
    // Show phone number in user profile
    showPhoneNumber: false,
    // Allow users to edit their profile
    allowEdit: true,
  },

  // Organization settings (if using multi-tenancy)
  organization: {
    // Allow users to create organizations
    allowCreate: false,
    // Allow users to join organizations
    allowJoin: false,
  },

  // Session settings
  session: {
    // Session duration in seconds (30 days)
    duration: 30 * 24 * 60 * 60,
    // Enable session rotation
    rotation: true,
  },

  // Multi-session settings
  multiSession: {
    // Allow multiple sessions per user
    enabled: true,
    // Maximum number of sessions per user
    maxSessions: 5,
  },

  // Password settings
  password: {
    // Minimum password length
    minLength: 8,
    // Require uppercase letters
    requireUppercase: true,
    // Require lowercase letters
    requireLowercase: true,
    // Require numbers
    requireNumbers: true,
    // Require special characters
    requireSpecialCharacters: false,
  },

  // Email settings
  email: {
    // Require email verification
    requireVerification: true,
    // Allow magic links
    allowMagicLinks: true,
  },

  // Phone settings
  phone: {
    // Require phone verification
    requireVerification: false,
    // Allow SMS codes
    allowSmsCodes: false,
  },

  // Social connections
  social: {
    // Allow Google sign in
    google: {
      enabled: true,
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    },
    // Allow GitHub sign in
    github: {
      enabled: true,
      clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
    },
    // Allow Discord sign in
    discord: {
      enabled: false,
      clientId: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
    },
  },

  // Rate limiting
  rateLimit: {
    // Enable rate limiting
    enabled: true,
    // Maximum requests per minute
    maxRequests: 100,
    // Rate limit window in seconds
    window: 60,
  },

  // CAPTCHA settings
  captcha: {
    // Enable CAPTCHA for suspicious activity
    enabled: true,
    // CAPTCHA provider (recaptcha, hcaptcha, turnstile)
    provider: 'recaptcha' as const,
    // CAPTCHA site key
    siteKey: process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY,
  },

  // Webhooks (for production monitoring)
  webhooks: {
    // Enable webhooks
    enabled: process.env.NODE_ENV === 'production',
    // Webhook endpoints
    endpoints: {
      userCreated: process.env.CLERK_WEBHOOK_USER_CREATED,
      userUpdated: process.env.CLERK_WEBHOOK_USER_UPDATED,
      userDeleted: process.env.CLERK_WEBHOOK_USER_DELETED,
      sessionCreated: process.env.CLERK_WEBHOOK_SESSION_CREATED,
      sessionRevoked: process.env.CLERK_WEBHOOK_SESSION_REVOKED,
    },
  },
};

// Helper function to get Clerk configuration based on environment
export function getClerkConfig() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    ...clerkConfig,
    // Override settings for production
    ...(isProduction && {
      // Stricter security in production
      password: {
        ...clerkConfig.password,
        minLength: 10,
        requireSpecialCharacters: true,
      },
      // Require phone verification in production
      phone: {
        ...clerkConfig.phone,
        requireVerification: true,
        allowSmsCodes: true,
      },
      // Enable all security features in production
      captcha: {
        ...clerkConfig.captcha,
        enabled: true,
      },
      rateLimit: {
        ...clerkConfig.rateLimit,
        maxRequests: 50, // Stricter rate limiting in production
      },
    }),
  };
}

// Export default configuration
export default getClerkConfig();
