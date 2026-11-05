import { useWindowDimensions } from 'react-native';

import { breakpoints, layout } from './tokens';

export type SizeClass = 'compact' | 'medium' | 'expanded';

export interface LayoutInfo {
  width: number;
  height: number;
  sizeClass: SizeClass;
  /** < 768px: phone layout with bottom navigation. */
  isCompact: boolean;
  /** ≥ 768px: navigation moves to a side rail / sidebar. */
  hasSideNav: boolean;
  /** ≥ 1024px: full desktop workspace (labelled sidebar, wider type). */
  isDesktop: boolean;
  /** ≥ 1280px: room for an optional right-hand context panel. */
  hasContextPanel: boolean;
  /** Horizontal page padding for the current size. */
  gutter: number;
  sidebarWidth: number;
}

export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();
  const sizeClass: SizeClass = width >= breakpoints.expanded ? 'expanded' : width >= breakpoints.medium ? 'medium' : 'compact';
  const isDesktop = sizeClass === 'expanded';
  const hasSideNav = sizeClass !== 'compact';
  return {
    width,
    height,
    sizeClass,
    isCompact: sizeClass === 'compact',
    hasSideNav,
    isDesktop,
    hasContextPanel: width >= breakpoints.large,
    gutter: width < 360 ? 16 : sizeClass === 'compact' ? 20 : isDesktop ? 40 : 28,
    sidebarWidth: isDesktop ? layout.sidebarWidth : hasSideNav ? layout.railWidth : 0,
  };
}
