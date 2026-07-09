import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';

import { Api, AskResponse } from './services/api';

type PageType = 'dashboard' | 'workspace' | 'saved' | 'history' | 'settings';
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
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  @ViewChild('mainContent') mainContent!: ElementRef;

  question = '';
  selectedClient = 'Medicines Master';
  selectedChartType = 'auto';

  loading = false;
  errorMessage = '';
  mobileMenuOpen = false;
  activePage: PageType = 'dashboard';

  clients = ['Medicines Master', 'Jpharma', 'Vpharma'];

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
    if (event.key === 'Enter' && !event.shiftKey) {
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

    const client = this.selectedClient || 'Medicines Master';

    this.api.askQuestion(client, trimmedQuestion).subscribe({
      next: (response: AskResponse) => {
        const chartType = this.pickChartType(response);

        const message: ChatMessage = {
          question: trimmedQuestion,
          client,
          timestamp: this.getTime(),
          response,
          chartType,
          chartData: this.buildChartData(response),
          chartOptions: this.buildChartOptions(chartType)
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

      error: (error) => {
        console.error('API error:', error);
        this.errorMessage = 'Something went wrong. Please check backend connection and try again.';
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

  pickChartType(response: AskResponse): AppChartType {
    if (!response.sql || !response.chart) {
      return 'table';
    }

    if (this.selectedChartType !== 'auto') {
      return this.selectedChartType as AppChartType;
    }

    const labels = response.chart.labels || [];
    const xAxis = String(response.chart.xAxis || '').toLowerCase();
    const yAxis = String(response.chart.yAxis || '').toLowerCase();

    if (!labels.length) {
      return 'table';
    }

    if (
      xAxis.includes('date') ||
      xAxis.includes('month') ||
      xAxis.includes('year')
    ) {
      return 'line';
    }

    if (
      yAxis.includes('percentage') ||
      yAxis.includes('percent') ||
      yAxis.includes('rate')
    ) {
      return 'bar';
    }

    if (labels.length <= 4) {
      return 'doughnut';
    }

    if (labels.length > 25) {
      return 'table';
    }

    return 'bar';
  }

  updateChartType(message: ChatMessage, selectedType: string): void {
    message.chartType =
      selectedType === 'auto'
        ? this.pickChartType(message.response)
        : (selectedType as AppChartType);

    message.chartData = this.buildChartData(message.response);
    message.chartOptions = this.buildChartOptions(message.chartType);
  }

  buildChartData(response: AskResponse): ChartConfiguration['data'] {
    return {
      labels: response.chart?.labels || [],
      datasets: [
        {
          label: response.chart?.yAxis || 'Value',
          data: response.chart?.values || [],
          borderWidth: 2
        }
      ]
    };
  }

  buildChartOptions(chartType: AppChartType): ChartConfiguration['options'] {
    const isAxisChart = chartType === 'bar' || chartType === 'line';

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: isAxisChart
        ? {
            x: {
              ticks: {
                autoSkip: true,
                maxRotation: 45,
                minRotation: 0
              }
            },
            y: {
              beginAtZero: true
            }
          }
        : undefined
    };
  }

  saveCurrentReport(message: ChatMessage): void {
    const alreadySaved = this.savedReports.some(
      report =>
        report.question === message.question &&
        report.client === message.client &&
        report.timestamp === message.timestamp
    );

    if (alreadySaved) {
      return;
    }

    const savedReport: StoredReport = {
      ...message,
      savedAt: new Date().toLocaleString()
    };

    this.savedReports.unshift(savedReport);
    this.safeSetLocalStorage('savedReports', this.savedReports);
  }

  addToHistory(message: ChatMessage): void {
    const historyReport: StoredReport = {
      ...message,
      createdAt: new Date().toLocaleString()
    };

    this.reportHistory.unshift(historyReport);
    this.reportHistory = this.reportHistory.slice(0, 20);

    this.safeSetLocalStorage('reportHistory', this.reportHistory);
  }

  openSavedReport(report: StoredReport): void {
    this.messages = [report];
    this.activePage = 'workspace';
    this.closeMobileMenu();

    setTimeout(() => {
      this.scrollToTop();
    }, 100);
  }

  openHistoryReport(report: StoredReport): void {
    this.messages = [report];
    this.activePage = 'workspace';
    this.closeMobileMenu();

    setTimeout(() => {
      this.scrollToTop();
    }, 100);
  }

  clearSavedReports(): void {
    this.savedReports = [];
    localStorage.removeItem('savedReports');
  }

  clearHistory(): void {
    this.reportHistory = [];
    localStorage.removeItem('reportHistory');
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
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  copySql(sql: string | null): void {
    if (!sql) {
      return;
    }

    navigator.clipboard.writeText(sql);
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  getTime(): string {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  scrollToTop(): void {
    if (this.mainContent?.nativeElement) {
      this.mainContent.nativeElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  safeSetLocalStorage(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`LocalStorage failed for ${key}`, error);
    }
  }

  loadLocalStorage(): void {
    try {
      this.savedReports = JSON.parse(localStorage.getItem('savedReports') || '[]');
    } catch {
      this.savedReports = [];
      localStorage.removeItem('savedReports');
    }

    try {
      this.reportHistory = JSON.parse(localStorage.getItem('reportHistory') || '[]');
    } catch {
      this.reportHistory = [];
      localStorage.removeItem('reportHistory');
    }
  }
}