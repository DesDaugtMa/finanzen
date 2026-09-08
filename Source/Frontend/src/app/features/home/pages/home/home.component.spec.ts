import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HomeComponent } from './home.component';
import { AuthService } from '../../../../core/services/auth.service';
import { AccountApiService } from '../../../../core/services/account-api.service';
import { BalanceApiService } from '../../../../core/services/balance-api.service';
import { ToastService } from '../../../../core/services/toast.service';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    const emptyParamMap = convertToParamMap({});

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(emptyParamMap),
            snapshot: { queryParamMap: emptyParamMap },
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: (...args: unknown[]) => {
              navigateCalls.push(args);
              return Promise.resolve(true);
            },
          },
        },
        { provide: AuthService, useValue: { currentUser: () => null } },
        { provide: AccountApiService, useValue: {} },
        {
          provide: BalanceApiService,
          // Die Bilanz ist für diesen Test irrelevant — der Fehlerpfad hält die Fixture schlank.
          useValue: { getPeriod: () => throwError(() => new Error('nicht relevant')) },
        },
        { provide: ToastService, useValue: { success: () => {}, error: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    await fixture.whenStable();
  });

  it('wechselt den Tab ohne den Browser nach oben zu scrollen', () => {
    fixture.componentInstance['selectTab']('statistiken');

    expect(navigateCalls.length).toBe(1);
    const [, extras] = navigateCalls[0] as [unknown, { scroll?: string }];
    expect(extras.scroll).toBe('manual');
  });
});
