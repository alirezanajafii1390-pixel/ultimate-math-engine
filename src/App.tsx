import { Routes, Route, Navigate } from 'react-router';
import { StoreProvider, useStore } from './core/store';
import { LanguageProvider } from './core/i18n';
import { ToastProvider } from './ui/kit';
import { ErrorBoundary } from './layout/ErrorBoundary';
import AppShell from './layout/AppShell';
import HomePage from './modules/home/HomePage';
import CalculatorPage from './modules/calculator/CalculatorPage';
import FormulaPage from './modules/formula/FormulaPage';
import ConverterPage from './modules/converter/ConverterPage';
import WorkspacePage from './modules/workspace/WorkspacePage';
import SettingsPage from './modules/settings/SettingsPage';
import HelpPage from './modules/help/HelpPage';
import DeveloperPage from './modules/developer/DeveloperPage';

function Routed() {
  const { state } = useStore();
  return (
    <LanguageProvider lang={state.settings.language}>
      <ToastProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="calculator" element={<CalculatorPage />} />
            <Route path="formula" element={<FormulaPage />} />
            <Route path="converter" element={<ConverterPage />} />
            <Route path="workspace" element={<WorkspacePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="developer" element={<DeveloperPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </LanguageProvider>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ErrorBoundary>
        <Routed />
      </ErrorBoundary>
    </StoreProvider>
  );
}
