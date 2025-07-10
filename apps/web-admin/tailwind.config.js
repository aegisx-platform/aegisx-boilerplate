/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./apps/web-admin/src/**/*.{html,ts}",
    "./libs/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        // Healthcare Primary Colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',    // Main blue
          600: '#2563eb',
          900: '#1e3a8a',
        },
        // Healthcare Success/Stable Colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',    // Main green
          600: '#16a34a',
          900: '#14532d',
        },
        // Healthcare Critical/Danger Colors
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',    // Main red
          600: '#dc2626',
          900: '#7f1d1d',
        },
        // Healthcare Warning Colors
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',    // Main orange
          600: '#d97706',
          900: '#78350f',
        },
        // Healthcare Status Colors
        medical: {
          critical: '#dc2626',     // Emergency/Critical
          urgent: '#ea580c',       // Urgent care
          stable: '#22c55e',       // Stable condition
          monitoring: '#3b82f6',   // Under monitoring
          discharged: '#6b7280',   // Discharged/Inactive
        }
      },
      fontFamily: {
        'sans': ['Inter', 'Roboto', 'sans-serif'],
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
  ]
}