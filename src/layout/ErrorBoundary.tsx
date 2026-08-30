import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert, RefreshCw, Home } from 'lucide-react';
import { EmptyState, Btn } from '../ui/kit';
import { useT } from '../core/i18n';

/**
 * Catches render/lifecycle errors anywhere in the wrapped subtree so a bug in
 * one page can't take down the whole app to a blank white screen. Placed
 * around <Outlet /> in AppShell, so the shell (nav, header) survives even if
 * a specific route crashes, and the person can retry or navigate elsewhere.
 *
 * Must be a class component — React has no hook-based error boundary API.
 * `key={pathname}` from the caller resets it automatically on navigation.
 */

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept to console.error only — this app has no telemetry/network calls
    // by design (offline-first), so we don't phone errors home.
    console.error('[ErrorBoundary] caught render error:', error, info.componentStack);
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.reset} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <EmptyState
        icon={<TriangleAlert size={26} />}
        title={t('error.boundary.title')}
        hint={t('error.boundary.hint')}
        action={
          <div className="flex items-center gap-3">
            <Btn variant="secondary" onClick={onRetry}>
              <RefreshCw size={16} />
              {t('error.boundary.retry')}
            </Btn>
            <Btn
              variant="accent"
              onClick={() => {
                onRetry();
                window.location.assign('./');
              }}
            >
              <Home size={16} />
              {t('error.boundary.home')}
            </Btn>
          </div>
        }
      />
    </div>
  );
}
