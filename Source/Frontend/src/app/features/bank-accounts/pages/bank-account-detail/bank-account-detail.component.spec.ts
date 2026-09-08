import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BankAccountDetailComponent } from './bank-account-detail.component';
import { BankAccountApiService } from '../../../../core/services/bank-account-api.service';
import { CategoryApiService } from '../../../../core/services/category-api.service';
import { BankAccount } from '../../../../core/models/bank-account.model';

describe('BankAccountDetailComponent', () => {
  let fixture: ComponentFixture<BankAccountDetailComponent>;
  let navigateCalls: unknown[][];

  const account: BankAccount = {
    id: 1,
    name: 'Girokonto',
    type: 'SavingsAccount',
    bankName: null,
    iban: null,
    color: null,
    currency: 'EUR',
    initialBalance: 0,
    currentBalance: 0,
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    navigateCalls = [];

    await TestBed.configureTestingModule({
      imports: [BankAccountDetailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '1' })),
            queryParamMap: of(convertToParamMap({})),
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
        {
          provide: BankAccountApiService,
          useValue: {
            getById: () => of({ value: account, fromCache: false, savedAt: null }),
            // Kennzahlen sind für diesen Test irrelevant — der Fehlerpfad hält die Fixture schlank.
            getSummary: () => throwError(() => new Error('nicht relevant')),
            getStatistics: () => throwError(() => new Error('nicht relevant')),
          },
        },
        {
          provide: CategoryApiService,
          useValue: { list: () => of([]) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BankAccountDetailComponent);
    await fixture.whenStable();
  });

  it('wechselt den Tab ohne den Browser nach oben zu scrollen', () => {
    fixture.componentInstance['selectTab']('transaktionen');

    expect(navigateCalls.length).toBe(1);
    const [, extras] = navigateCalls[0] as [unknown, { scroll?: string }];
    expect(extras.scroll).toBe('manual');
  });

  it('wechselt den Monat ohne den Browser nach oben zu scrollen', () => {
    fixture.componentInstance['selectMonth']('2026-02');

    expect(navigateCalls.length).toBe(1);
    const [, extras] = navigateCalls[0] as [unknown, { scroll?: string }];
    expect(extras.scroll).toBe('manual');
  });
});
