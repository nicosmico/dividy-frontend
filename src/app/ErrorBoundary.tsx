import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router';

import { Button } from '@/components/ui/button';

import { isChunkLoadError, reloadForNewVersion } from './stale-chunks';

interface BoundaryProps {
  children: ReactNode;
  /** When this value changes (e.g. the route), the error is cleared. */
  resetKey?: unknown;
  /** Called when the user leaves the error screen (clears failed queries). */
  onReset?: () => void;
}

interface BoundaryState {
  error: Error | null;
}

class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // A screen from an older version of Dividy: reload to get the new one.
    if (isChunkLoadError(error) && reloadForNewVersion()) return;
    console.error(error, info.componentStack);
  }

  componentDidUpdate(prev: BoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorScreen
          newVersion={isChunkLoadError(this.state.error)}
          onReset={() => {
            this.props.onReset?.();
            this.setState({ error: null });
          }}
        />
      );
    }
    return this.props.children;
  }
}

export function ErrorScreen({
  onReset,
  newVersion = false,
}: {
  onReset?: () => void;
  /** The screen could not load because a new version was published. */
  newVersion?: boolean;
}) {
  if (newVersion) {
    return (
      <div
        role='alert'
        className='mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20 text-center'
      >
        <h1 className='text-2xl font-bold'>Hay una nueva versión de Dividy</h1>
        <p className='text-muted-foreground'>
          Recarga la página para seguir. Tus datos siguen guardados en este
          dispositivo.
        </p>
        <Button size='lg' onClick={() => window.location.reload()}>
          Recargar
        </Button>
      </div>
    );
  }
  return (
    <div
      role='alert'
      className='mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20 text-center'
    >
      <h1 className='text-2xl font-bold'>Algo salió mal</h1>
      <p className='text-muted-foreground'>
        Ocurrió un error inesperado. Tus datos siguen guardados en este
        dispositivo. Vuelve al inicio e inténtalo de nuevo.
      </p>
      <Button asChild size='lg'>
        <Link to='/' onClick={onReset}>
          Volver al inicio
        </Link>
      </Button>
    </div>
  );
}

/** Catches render errors below it and shows a friendly screen. Must be inside the router. */
export function ErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { reset } = useQueryErrorResetBoundary();
  return (
    <Boundary resetKey={location.key} onReset={reset}>
      {children}
    </Boundary>
  );
}
