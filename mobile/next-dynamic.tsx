import React, { lazy, Suspense, type ComponentType, type ReactNode } from 'react';

type Loader<TProps> = () => Promise<{ default: ComponentType<TProps> } | ComponentType<TProps>>;
interface DynamicOptions { loading?: ComponentType; ssr?: boolean }

/** Vite-compatible subset of next/dynamic used by the shared app. */
export default function dynamic<TProps extends object>(loader: Loader<TProps>, options: DynamicOptions = {}) {
  const LazyComponent = lazy(async () => {
    const loaded = await loader();
    // Named exports can be memo/forwardRef objects, not only functions. React.lazy
    // always needs a module-shaped result, even for these exotic components.
    return loaded !== null && typeof loaded === 'object' && 'default' in loaded
      ? loaded
      : { default: loaded as ComponentType<TProps> };
  });
  const Loading = options.loading;
  return function DynamicComponent(props: TProps): ReactNode {
    return (
      <Suspense fallback={Loading ? <Loading /> : null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
