import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { AuthService } from '../../../../core/services/auth.service';
import { AccountApiService } from '../../../../core/services/account-api.service';
import { ToastService } from '../../../../core/services/toast.service';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser: () => ({ email: 'a@b.de', emailVerified: false }) },
        },
        { provide: AccountApiService, useValue: {} },
        { provide: ToastService, useValue: { success: () => {}, error: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    await fixture.whenStable();
  });

  it('zeigt den Hinweis zur unbestätigten E-Mail-Adresse', () => {
    const banner = (fixture.nativeElement as HTMLElement).querySelector('.verify-banner');
    expect(banner?.textContent).toContain('a@b.de');
  });
});
