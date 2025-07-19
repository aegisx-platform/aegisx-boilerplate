import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface AppState {
  isLoading: boolean;
  isInitialized: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private appStateSubject = new BehaviorSubject<AppState>({
    isLoading: true,
    isInitialized: false
  });

  public appState$ = this.appStateSubject.asObservable();

  setLoading(isLoading: boolean): void {
    this.appStateSubject.next({
      ...this.appStateSubject.value,
      isLoading
    });
  }

  setInitialized(isInitialized: boolean): void {
    this.appStateSubject.next({
      ...this.appStateSubject.value,
      isInitialized
    });
  }

  getCurrentState(): AppState {
    return this.appStateSubject.value;
  }
}