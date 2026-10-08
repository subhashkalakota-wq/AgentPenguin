const fs = require('fs');
const path = require('path');

const clientRoot = '/Users/kalakotasubhash/Documents/PROJECTS/viso-dsa/client';

console.log('--- Applying White and Light Blue Theme to VISO-DSA ---');

// 1. Update ThemeContext.jsx
const themeContextPath = path.join(clientRoot, 'src/context/ThemeContext.jsx');
const themeContextCode = `import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
    // Default to clean White & Light Blue theme (isDarkMode = false)
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        setIsDarkMode((prev) => {
            const newTheme = !prev;
            if (newTheme) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
            return newTheme;
        });
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
`;
fs.writeFileSync(themeContextPath, themeContextCode, 'utf8');
console.log('✓ Updated ThemeContext.jsx (defaults to light theme)');

// 2. Update globals.css
const globalsCssPath = path.join(clientRoot, 'src/styles/globals.css');
const globalsCssCode = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

*,
*::before,
*::after {
  box-sizing: border-box;
}

:root {
  --viso-bg: #f8fafc;
  --viso-surface: #ffffff;
  --viso-border: #e0f2fe;
  --viso-primary: #0284c7;
  --viso-primary-dark: #0369a1;
  --viso-primary-light: #38bdf8;
  --viso-accent: #2563eb;
  --viso-text-primary: #0f172a;
  --viso-text-secondary: #475569;
  --viso-text-muted: #64748b;
}

body {
  background: #f8fafc;
  color: #0f172a;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
  transition: background 0.3s, color 0.3s;
}

.dark body {
  background: #f0f7ff;
  color: #0f172a;
}

.mono {
  font-family: 'JetBrains Mono', monospace;
}

.gradient-text {
  background: linear-gradient(135deg, #0284c7, #2563eb, #38bdf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.glass {
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(56, 189, 248, 0.25);
  box-shadow: 0 4px 20px rgba(2, 132, 199, 0.05);
  transition: background 0.3s, border-color 0.3s;
}

.dark .glass {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(56, 189, 248, 0.25);
}

.card-base {
  background: #ffffff;
  border: 1px solid #e0f2fe;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 10px rgba(2, 132, 199, 0.04);
}

.dark .card-base {
  background: #ffffff;
  border-color: #bae6fd;
  box-shadow: 0 4px 15px rgba(2, 132, 199, 0.08);
}

.card-base:hover {
  background: #ffffff;
  border-color: #0284c7;
  transform: translateY(-4px);
  box-shadow: 0 12px 35px rgba(2, 132, 199, 0.12);
}

.dark .card-base:hover {
  background: #ffffff;
  border-color: #38bdf8;
  box-shadow: 0 12px 35px rgba(2, 132, 199, 0.15);
}

.btn-primary {
  background: linear-gradient(135deg, #0284c7, #2563eb);
  color: white;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0369a1, #1d4ed8);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
}

.btn-secondary {
  background: #ffffff;
  border: 1px solid #bae6fd;
  color: #0369a1;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dark .btn-secondary {
  background: #ffffff;
  border-color: #bae6fd;
  color: #0369a1;
}

.btn-secondary:hover:not(:disabled) {
  background: #f0f9ff;
  border-color: #38bdf8;
  color: #0284c7;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.12);
}

.dark .btn-secondary:hover:not(:disabled) {
  background: #f0f9ff;
  border-color: #38bdf8;
  color: #0284c7;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none !important;
}

input,
select,
textarea {
  background: #ffffff;
  border: 1px solid #bae6fd;
  color: #0f172a;
  border-radius: 6px;
  font-family: 'Inter', sans-serif;
  outline: none;
  transition: border-color 0.2s, background 0.3s, color 0.3s, box-shadow 0.2s;
}

.dark input,
.dark select,
.dark textarea {
  background: #ffffff;
  border-color: #bae6fd;
  color: #0f172a;
}

input:focus,
select:focus,
textarea:focus {
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.25);
}

select option {
  background: #ffffff;
  color: #0f172a;
}

.dark select option {
  background: #ffffff;
  color: #0f172a;
}

.tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  background: #e0f2fe;
  border: 1px solid #bae6fd;
  color: #0284c7;
  letter-spacing: 0.3px;
}

.dark .tag {
  background: #e0f2fe;
  border-color: #bae6fd;
  color: #0284c7;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }
}

.animate-in {
  animation: fadeUp 0.5s ease forwards;
}

.pulse-anim {
  animation: pulse 1.4s infinite;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f0f9ff;
}

::-webkit-scrollbar-thumb {
  background: #bae6fd;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #7dd3fc;
}

input[type="range"] {
  -webkit-appearance: none;
  height: 4px;
  border-radius: 2px;
  background: #e0f2fe;
  border: none;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #0284c7;
  cursor: pointer;
  box-shadow: 0 0 6px rgba(2, 132, 199, 0.4);
}
`;
fs.writeFileSync(globalsCssPath, globalsCssCode, 'utf8');
console.log('✓ Updated globals.css with White & Light Blue tokens');

// 3. Update tailwind.config.js
const tailwindConfigPath = path.join(clientRoot, 'tailwind.config.js');
const tailwindCode = `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        navy: '#f0f9ff',
        violet: { DEFAULT: '#0284c7', dark: '#0369a1', dim: '#38bdf8' }
      }
    }
  },
  plugins: []
};
`;
fs.writeFileSync(tailwindConfigPath, tailwindCode, 'utf8');
console.log('✓ Updated tailwind.config.js');

// 4. Update App.jsx loading placeholder
const appPath = path.join(clientRoot, 'src/App.jsx');
let appCode = fs.readFileSync(appPath, 'utf8');
appCode = appCode.replace(/background:\s*'#0a0e1a'/g, "background: '#f0f7ff'");
appCode = appCode.replace(/color:\s*'#a78bfa'/g, "color: '#0284c7'");
fs.writeFileSync(appPath, appCode, 'utf8');
console.log('✓ Updated App.jsx ProtectedRoute loading theme');

// 5. Update Navbar.jsx
const navbarPath = path.join(clientRoot, 'src/components/layout/Navbar.jsx');
let navCode = fs.readFileSync(navbarPath, 'utf8');
navCode = navCode.replace(
  /background:\s*isDarkMode\s*\?\s*'rgba\(30,\s*41,\s*59,\s*0\.92\)'\s*:\s*'rgba\(255,255,255,0\.92\)'/,
  "background: 'rgba(255, 255, 255, 0.95)'"
);
navCode = navCode.replace(
  /borderBottom:\s*isDarkMode\s*\?\s*'1px\s*solid\s*#334155'\s*:\s*'1px\s*solid\s*#e5e7eb'/,
  "borderBottom: '1px solid #e0f2fe', boxShadow: '0 2px 10px rgba(2, 132, 199, 0.05)'"
);
navCode = navCode.replace(
  /color:\s*isDarkMode\s*\?\s*'#f8fafc'\s*:\s*'#1f2937'/,
  "color: '#0f172a'"
);
navCode = navCode.replace(
  /color:\s*isDarkMode\s*\?\s*'#cbd5e1'\s*:\s*'#6b7280'/g,
  "color: '#475569'"
);
navCode = navCode.replace(
  /color:\s*isActive\(path\)\s*\?\s*'#3b82f6'\s*:\s*\(isDarkMode\s*\?\s*'#cbd5e1'\s*:\s*'#6b7280'\)/g,
  "color: isActive(path) ? '#0284c7' : '#475569'"
);
navCode = navCode.replace(
  /borderBottom:\s*isActive\(path\)\s*\?\s*'2px\s*solid\s*#3b82f6'\s*:\s*'2px\s*solid\s*transparent'/g,
  "borderBottom: isActive(path) ? '2px solid #0284c7' : '2px solid transparent'"
);
navCode = navCode.replace(
  /linear-gradient\(135deg,#2563eb,#7c3aed\)/g,
  "linear-gradient(135deg, #0284c7, #38bdf8)"
);
navCode = navCode.replace(
  /background:\s*isDarkMode\s*\?\s*'#1e293b'\s*:\s*'#f8fafc'/g,
  "background: '#f0f9ff'"
);
navCode = navCode.replace(
  /border:\s*isDarkMode\s*\?\s*'1px\s*solid\s*#334155'\s*:\s*'1px\s*solid\s*#e5e7eb'/g,
  "border: '1px solid #bae6fd'"
);
fs.writeFileSync(navbarPath, navCode, 'utf8');
console.log('✓ Updated Navbar.jsx to white & light blue');

// 6. Update Footer.jsx
const footerPath = path.join(clientRoot, 'src/components/layout/Footer.jsx');
let footerCode = fs.readFileSync(footerPath, 'utf8');
footerCode = footerCode.replace(
  /background:\s*isDarkMode\s*\?\s*'#020617'\s*:\s*'#f8fafc'/,
  "background: '#f8fafc'"
);
footerCode = footerCode.replace(
  /borderTop:\s*isDarkMode\s*\?\s*'1px\s*solid\s*#1e293b'\s*:\s*'1px\s*solid\s*#e2e8f0'/g,
  "borderTop: '1px solid #e0f2fe'"
);
footerCode = footerCode.replace(
  /color:\s*isDarkMode\s*\?\s*'#f8fafc'\s*:\s*'#0f172a'/g,
  "color: '#0f172a'"
);
footerCode = footerCode.replace(
  /color:\s*isDarkMode\s*\?\s*'#94a3b8'\s*:\s*'#475569'/g,
  "color: '#475569'"
);
footerCode = footerCode.replace(/#3b82f6/g, '#0284c7');
fs.writeFileSync(footerPath, footerCode, 'utf8');
console.log('✓ Updated Footer.jsx');

// 7. Update AIChat.jsx
const aiChatPath = path.join(clientRoot, 'src/components/ui/AIChat.jsx');
let aiChatCode = fs.readFileSync(aiChatPath, 'utf8');
aiChatCode = aiChatCode.replace(/linear-gradient\(135deg,#2563eb,#7c3aed\)/g, 'linear-gradient(135deg, #0284c7, #2563eb)');
aiChatCode = aiChatCode.replace(/linear-gradient\(135deg,\s*#2563eb,\s*#7c3aed\)/g, 'linear-gradient(135deg, #0284c7, #2563eb)');
aiChatCode = aiChatCode.replace(/#7c3aed/g, '#0284c7');
aiChatCode = aiChatCode.replace(/background:\s*isUser\s*\?\s*'linear-gradient\(135deg,#2563eb,#7c3aed\)'\s*:\s*\(isDark\s*\?\s*'#1e293b'\s*:\s*'#f1f5f9'\)/g,
  "background: isUser ? 'linear-gradient(135deg, #0284c7, #2563eb)' : '#f0f9ff', border: isUser ? 'none' : '1px solid #e0f2fe'"
);
fs.writeFileSync(aiChatPath, aiChatCode, 'utf8');
console.log('✓ Updated AIChat.jsx');

// 8. Update CodePanel.jsx and InfoPanel.jsx
const codePanelPath = path.join(clientRoot, 'src/components/ui/CodePanel.jsx');
let codePanel = fs.readFileSync(codePanelPath, 'utf8');
codePanel = codePanel.replace(/#4f46e5/g, '#0284c7');
fs.writeFileSync(codePanelPath, codePanel, 'utf8');
console.log('✓ Updated CodePanel.jsx');

const infoPanelPath = path.join(clientRoot, 'src/components/ui/InfoPanel.jsx');
let infoPanel = fs.readFileSync(infoPanelPath, 'utf8');
infoPanel = infoPanel.replace(/rgba\(79,\s*70,\s*229,\s*0\.03\)/g, 'rgba(2, 132, 199, 0.04)');
infoPanel = infoPanel.replace(/rgba\(79,\s*70,\s*229,\s*0\.1\)/g, 'rgba(56, 189, 248, 0.25)');
infoPanel = infoPanel.replace(/color:\s*'#4f46e5'/g, "color: '#0284c7'");
fs.writeFileSync(infoPanelPath, infoPanel, 'utf8');
console.log('✓ Updated InfoPanel.jsx');

// 9. Update VisualizePage.jsx
const vizPagePath = path.join(clientRoot, 'src/pages/VisualizePage.jsx');
let vizPage = fs.readFileSync(vizPagePath, 'utf8');
vizPage = vizPage.replace(/color:\s*'#a78bfa'/g, "color: '#0284c7'");
vizPage = vizPage.replace(/color:\s*'#94a3b8'/g, "color: '#64748b'");
fs.writeFileSync(vizPagePath, vizPage, 'utf8');
console.log('✓ Updated VisualizePage.jsx');

// 10. Update Dashboard.jsx
const dashPath = path.join(clientRoot, 'src/pages/Dashboard.jsx');
let dash = fs.readFileSync(dashPath, 'utf8');
dash = dash.replace(/linear-gradient\(90deg,#7c3aed,#4f46e5,#60a5fa\)/g, 'linear-gradient(90deg, #0284c7, #38bdf8, #60a5fa)');
dash = dash.replace(/linear-gradient\(135deg,#2563eb,#7c3aed\)/g, 'linear-gradient(135deg, #0284c7, #38bdf8)');
dash = dash.replace(/color:\s*'#a78bfa'/g, "color: '#0284c7'");
dash = dash.replace(/#a78bfa/g, '#0284c7');
dash = dash.replace(/rgba\(139,92,246,0.5\)/g, 'rgba(56,189,248,0.5)');
fs.writeFileSync(dashPath, dash, 'utf8');
console.log('✓ Updated Dashboard.jsx');

console.log('--- All VISO-DSA theme modifications applied successfully ---');
