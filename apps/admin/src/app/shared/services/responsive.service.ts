import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
}

@Injectable({
  providedIn: 'root'
})
export class ResponsiveService {
  private readonly MOBILE_BREAKPOINT = 768;
  private readonly TABLET_BREAKPOINT = 1024;

  private responsiveState$ = new BehaviorSubject<ResponsiveState>(this.getInitialState());

  constructor() {
    // Listen to window resize events
    fromEvent(window, 'resize')
      .pipe(
        debounceTime(250), // Debounce to avoid excessive calculations
        map(() => this.calculateResponsiveState()),
        distinctUntilChanged((prev, curr) =>
          prev.isMobile === curr.isMobile &&
          prev.isTablet === curr.isTablet &&
          prev.isDesktop === curr.isDesktop
        )
      )
      .subscribe(state => this.responsiveState$.next(state));
  }

  private getInitialState(): ResponsiveState {
    if (typeof window !== 'undefined') {
      return this.calculateResponsiveState();
    }
    // Default state for SSR
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: 1200
    };
  }

  private calculateResponsiveState(): ResponsiveState {
    const width = window.innerWidth;

    return {
      isMobile: width < this.MOBILE_BREAKPOINT,
      isTablet: width >= this.MOBILE_BREAKPOINT && width < this.TABLET_BREAKPOINT,
      isDesktop: width >= this.TABLET_BREAKPOINT,
      width
    };
  }

  // Observable for components to subscribe to
  getResponsiveState(): Observable<ResponsiveState> {
    return this.responsiveState$.asObservable();
  }

  // Get current state synchronously
  getCurrentState(): ResponsiveState {
    return this.responsiveState$.value;
  }

  // Convenience methods
  isMobile(): Observable<boolean> {
    return this.responsiveState$.pipe(map(state => state.isMobile));
  }

  isTablet(): Observable<boolean> {
    return this.responsiveState$.pipe(map(state => state.isTablet));
  }

  isDesktop(): Observable<boolean> {
    return this.responsiveState$.pipe(map(state => state.isDesktop));
  }

  isMobileOrTablet(): Observable<boolean> {
    return this.responsiveState$.pipe(map(state => state.isMobile || state.isTablet));
  }
}
