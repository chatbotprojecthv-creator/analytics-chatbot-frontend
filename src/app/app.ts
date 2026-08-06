import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import {
  ChartConfiguration,
  ChartDataset,
  ChartType
} from 'chart.js';

import {
  Api,
  AskResponse,
  ChartSeries
} from './services/api';

type PageType =
  | 'dashboard'
  | 'workspace'
  | 'saved'
  | 'history'
  | 'settings';

type AppChartType = ChartType | 'table';

interface ChatMessage {
  question: string;
  client: string;
  timestamp: string;
  response: AskResponse;
  chartType: AppChartType;
  chartData: ChartConfiguration['data'];
  chartOptions: ChartConfiguration['options'];
}

interface StoredReport extends ChatMessage {
  savedAt?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BaseChartDirective
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  @ViewChild('mainContent') mainContent!: ElementRef;

  question = '';
  selectedClient = 'All Clients';
  selectedChartType = 'auto';

  loading = false;
  errorMessage = '';
  mobileMenuOpen = false;
  activePage: PageType = 'dashboard';

  clients = [
    'All Clients',
    'Hpharma',
    'Jpharma',
    'Vpharma'
  ];

  messages: ChatMessage[] = [];
  savedReports: StoredReport[] = [];
  reportHistory: StoredReport[] = [];

  chartTypes = [
    { label: 'Auto', value: 'auto' },
    { label: 'Bar', value: 'bar' },
    { label: 'Line', value: 'line' },
    { label: 'Doughnut', value: 'doughnut' },
    { label: 'Pie', value: 'pie' },
    { label: 'Table Only', value: 'table' }
  ];

  promptGroups = [
    {
      title: 'Client Analytics',
      icon: '🏢',
      prompts: [
        'Show medicine count by client',
        'Compare Jpharma and Vpharma by habit forming medicines'
      ]
    },
    {
      title: 'Medicine Usage',
      icon: '💊',
      prompts: [
        'Most common uses by client',
        'Show top side effects for Jpharma'
      ]
    },
    {
      title: 'Risk Insights',
      icon: '⚠️',
      prompts: [
        'How many habit forming medicines exist by client',
        'Which client has the highest percentage of habit forming medicines?'
      ]
    }
  ];

  constructor(
    private api: Api,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLocalStorage();
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault();
      this.askQuestion();
    }
  }

  askQuestion(): void {
    if (this.loading) {
      return;
    }

    const trimmedQuestion = this.question.trim();

    if (!trimmedQuestion) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const client =
      this.selectedClient || 'All Clients';

    this.api
      .askQuestion(client, trimmedQuestion)
      .subscribe({
        next: (response: AskResponse) => {
          const chartType =
            this.pickChartType(response);

          const message: ChatMessage = {
            question: trimmedQuestion,
            client,
            timestamp: this.getTime(),
            response,
            chartType,
            chartData:
              this.buildChartData(response),
            chartOptions:
              this.buildChartOptions(
                chartType,
                response
              )
          };

          this.loading = false;
          this.messages = [message];
          this.question = '';
          this.activePage = 'workspace';

          this.addToHistory(message);

          this.cdr.detectChanges();

          setTimeout(() => {
            this.scrollToTop();
          }, 100);
        },

        error: error => {
          console.error(
            'API error:',
            error
          );

          this.errorMessage =
            'Something went wrong. Please check the backend connection and try again.';

          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  useSuggestedQuestion(prompt: string): void {
    if (this.loading) {
      return;
    }

    this.question = prompt;
    this.askQuestion();
  }

  pickChartType(
    response: AskResponse
  ): AppChartType {
    if (
      !response.sql ||
      !response.chart ||
      !response.chart.labels?.length
    ) {
      return 'table';
    }

    if (
      this.selectedChartType !== 'auto'
    ) {
      return this.selectedChartType as AppChartType;
    }

    const backendType =
      response.chart.type;

    const supportedTypes: AppChartType[] = [
      'bar',
      'line',
      'pie',
      'doughnut'
    ];

    if (
      supportedTypes.includes(
        backendType as AppChartType
      )
    ) {
      return backendType as AppChartType;
    }

    return 'bar';
  }

  updateChartType(
    message: ChatMessage,
    selectedType: string
  ): void {
    message.chartType =
      selectedType === 'auto'
        ? this.pickChartType(
            message.response
          )
        : (
            selectedType as AppChartType
          );

    message.chartData =
      this.buildChartData(
        message.response
      );

    message.chartOptions =
      this.buildChartOptions(
        message.chartType,
        message.response
      );

    this.cdr.detectChanges();
  }

  buildChartData(
    response: AskResponse
  ): ChartConfiguration['data'] {
    const chart = response.chart;

    if (!chart) {
      return {
        labels: [],
        datasets: []
      };
    }

    const availableSeries =
      chart.series?.length
        ? chart.series
        : [
            {
              key:
                chart.yAxis || 'value',
              label:
                this.formatChartLabel(
                  chart.yAxis || 'Value'
                ),
              values:
                chart.values || []
            }
          ];

    const datasets:
      ChartDataset[] =
      availableSeries.map(
        (
          series: ChartSeries
        ): ChartDataset => ({
          label:
            series.label ||
            this.formatChartLabel(
              series.key
            ),
          data: series.values,
          borderWidth: 2
        })
      );

    return {
      labels: chart.labels || [],
      datasets
    };
  }

  buildChartOptions(
    chartType: AppChartType,
    response: AskResponse
  ): ChartConfiguration['options'] {
    const chart = response.chart;

    const isAxisChart =
      chartType === 'bar' ||
      chartType === 'line';

    const isHorizontal =
      chartType === 'bar' &&
      chart?.orientation ===
        'horizontal';

    const hasMultipleSeries =
      (chart?.series?.length || 0) > 1;

    return {
      responsive: true,
      maintainAspectRatio: false,

      indexAxis:
        isHorizontal
          ? 'y'
          : 'x',

      interaction: {
        mode: 'index',
        intersect: false
      },

      plugins: {
        legend: {
          display:
            hasMultipleSeries ||
            chartType === 'pie' ||
            chartType ===
              'doughnut',
          position: 'top'
        },

        tooltip: {
          enabled: true
        }
      },

      scales: isAxisChart
        ? {
            x: {
              beginAtZero:
                isHorizontal,

              stacked: false,

              ticks: {
                autoSkip:
                  !isHorizontal,
                maxRotation:
                  isHorizontal
                    ? 0
                    : 45,
                minRotation: 0
              }
            },

            y: {
              beginAtZero: true,
              stacked: false,

              ticks: {
                autoSkip: false
              }
            }
          }
        : undefined
    };
  }

  formatChartLabel(
    value: string
  ): string {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, character =>
        character.toUpperCase()
      );
  }

  saveCurrentReport(
    message: ChatMessage
  ): void {
    const alreadySaved =
      this.savedReports.some(
        report =>
          report.question ===
            message.question &&
          report.client ===
            message.client &&
          report.timestamp ===
            message.timestamp
      );

    if (alreadySaved) {
      return;
    }

    const savedReport:
      StoredReport = {
      ...message,
      savedAt:
        new Date().toLocaleString()
    };

    this.savedReports.unshift(
      savedReport
    );

    this.safeSetLocalStorage(
      'savedReports',
      this.savedReports
    );
  }

  addToHistory(
    message: ChatMessage
  ): void {
    const historyReport:
      StoredReport = {
      ...message,
      createdAt:
        new Date().toLocaleString()
    };

    this.reportHistory.unshift(
      historyReport
    );

    this.reportHistory =
      this.reportHistory.slice(0, 20);

    this.safeSetLocalStorage(
      'reportHistory',
      this.reportHistory
    );
  }

  openSavedReport(
    report: StoredReport
  ): void {
    const restoredReport =
      this.restoreStoredReport(report);

    this.messages = [
      restoredReport
    ];

    this.activePage = 'workspace';
    this.closeMobileMenu();

    setTimeout(() => {
      this.scrollToTop();
    }, 100);
  }

  openHistoryReport(
    report: StoredReport
  ): void {
    const restoredReport =
      this.restoreStoredReport(report);

    this.messages = [
      restoredReport
    ];

    this.activePage = 'workspace';
    this.closeMobileMenu();

    setTimeout(() => {
      this.scrollToTop();
    }, 100);
  }

  restoreStoredReport(
    report: StoredReport
  ): StoredReport {
    const chartType =
      this.pickChartType(
        report.response
      );

    return {
      ...report,
      chartType,
      chartData:
        this.buildChartData(
          report.response
        ),
      chartOptions:
        this.buildChartOptions(
          chartType,
          report.response
        )
    };
  }

  clearSavedReports(): void {
    this.savedReports = [];
    localStorage.removeItem(
      'savedReports'
    );
  }

  clearHistory(): void {
    this.reportHistory = [];
    localStorage.removeItem(
      'reportHistory'
    );
  }

  goHome(): void {
    this.closeReport();
  }

  closeReport(): void {
    this.messages = [];
    this.question = '';
    this.errorMessage = '';
    this.loading = false;
    this.selectedChartType = 'auto';
    this.activePage = 'dashboard';

    this.closeMobileMenu();

    setTimeout(() => {
      this.scrollToTop();
    }, 100);
  }

  setPage(page: PageType): void {
    this.activePage = page;
    this.closeMobileMenu();

    setTimeout(() => {
      this.scrollToTop();
    }, 100);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen =
      !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  copySql(
    sql: string | null
  ): void {
    if (!sql) {
      return;
    }

    navigator.clipboard
      .writeText(sql)
      .catch(error => {
        console.error(
          'Copy SQL failed:',
          error
        );
      });
  }

  objectKeys(
    obj: unknown
  ): string[] {
    if (
      obj &&
      typeof obj === 'object' &&
      !Array.isArray(obj)
    ) {
      return Object.keys(obj);
    }

    return [];
  }

  getTime(): string {
    return new Date()
      .toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
  }

  scrollToTop(): void {
    if (
      this.mainContent?.nativeElement
    ) {
      this.mainContent.nativeElement.scrollTo(
        {
          top: 0,
          behavior: 'smooth'
        }
      );
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  safeSetLocalStorage(
    key: string,
    value: unknown
  ): void {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch (error) {
      console.error(
        `LocalStorage failed for ${key}`,
        error
      );
    }
  }

  loadLocalStorage(): void {
    try {
      const savedReports =
        JSON.parse(
          localStorage.getItem(
            'savedReports'
          ) || '[]'
        ) as StoredReport[];

      this.savedReports =
        savedReports.map(report =>
          this.restoreStoredReport(
            report
          )
        );
    } catch {
      this.savedReports = [];
      localStorage.removeItem(
        'savedReports'
      );
    }

    try {
      const reportHistory =
        JSON.parse(
          localStorage.getItem(
            'reportHistory'
          ) || '[]'
        ) as StoredReport[];

      this.reportHistory =
        reportHistory.map(report =>
          this.restoreStoredReport(
            report
          )
        );
    } catch {
      this.reportHistory = [];
      localStorage.removeItem(
        'reportHistory'
      );
    }
  }
}