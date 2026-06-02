import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { firstValueFrom } from 'rxjs';
import { Api } from './services/api';

type ChartType = 'auto' | 'pie' | 'bar' | 'line' | 'table';
type PageType = 'dashboard' | 'workspace' | 'saved' | 'history' | 'settings' | 'help';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  objectKeys = Object.keys;

  clients = ['Hpharma', 'Jpharma', 'Vpharma'];
  activePage: PageType = 'dashboard';

  selectedClient = 'Jpharma';
  reportOpened = false;
  question = '';
  loading = false;
  errorMessage = '';

  activeTab: 'summary' | 'data' | 'sql' = 'summary';

  suggestedQuestions = [
    'Show top 5 therapeutic classes by medicine count',
    'Show total number of medicines',
    'Which therapeutic class has the highest number of medicines?',
    'Show medicine count by therapeutic class',
    'Show top 10 manufacturers by medicine count',
    'What medication class does Amipar belong to?'
  ];

  promptGroups = [
    {
      title: 'Explore Data',
      icon: '📊',
      prompts: [
        'Show total number of medicines',
        'Show medicine count by therapeutic class'
      ]
    },
    {
      title: 'Compare Classes',
      icon: '⚖️',
      prompts: [
        'Show top 5 therapeutic classes by medicine count',
        'Which therapeutic class has the highest number of medicines?'
      ]
    },
    {
      title: 'Find Medicine',
      icon: '🔎',
      prompts: [
        'What medication class does Amipar belong to?',
        'Show medicines used for pain'
      ]
    }
  ];

  chartTypes: { label: string; value: ChartType }[] = [
    { label: 'Auto', value: 'auto' },
    { label: 'Pie Chart', value: 'pie' },
    { label: 'Bar Chart', value: 'bar' },
    { label: 'Line Chart', value: 'line' },
    { label: 'Table Only', value: 'table' }
  ];

  selectedChartType: ChartType = 'auto';

  messages: any[] = [];
  reportHistory: any[] = [];
  savedReports: any[] = [];

  chartColors = [
    '#2563eb',
    '#0f766e',
    '#7c3aed',
    '#ea580c',
    '#0891b2',
    '#65a30d',
    '#dc2626',
    '#4338ca',
    '#0284c7',
    '#16a34a'
  ];

  constructor(
    private api: Api,
    private cdr: ChangeDetectorRef
  ) {}

  setPage(page: PageType) {
    this.activePage = page;
    this.errorMessage = '';
    this.reportOpened = page === 'workspace';
    this.cdr.detectChanges();
  }

  useSuggestedQuestion(prompt: string) {
    this.question = prompt;
    this.activePage = 'workspace';
    this.reportOpened = true;
    this.askQuestion();
  }

  openReport() {
    if (!this.selectedClient) {
      this.errorMessage = 'Please select a client.';
      return;
    }

    this.activePage = 'workspace';
    this.reportOpened = true;
    this.errorMessage = '';
    this.activeTab = 'summary';
    this.cdr.detectChanges();
  }

  closeReport() {
    this.reportOpened = false;
    this.messages = [];
    this.question = '';
    this.loading = false;
    this.errorMessage = '';
    this.activeTab = 'summary';
    this.selectedChartType = 'auto';
    this.activePage = 'dashboard';
    this.cdr.detectChanges();
  }

  updateChartType(message: any, chartType: ChartType) {
    const selectedType =
      chartType === 'auto'
        ? (message.response.chart?.type || 'bar')
        : chartType;

    message.chartType = selectedType;

    this.cdr.detectChanges();

    setTimeout(() => {
      this.chart?.update();
    }, 0);
  }

  saveCurrentReport(message: any) {
    const alreadySaved = this.savedReports.some(
      report =>
        report.question === message.question &&
        report.client === message.client &&
        report.timestamp === message.timestamp
    );

    if (!alreadySaved) {
      this.savedReports.unshift({
        ...message,
        savedAt: new Date().toLocaleString()
      });
    }

    this.activePage = 'saved';
    this.reportOpened = false;
    this.cdr.detectChanges();
  }

  openSavedReport(report: any) {
    this.selectedClient = report.client;
    this.messages = [report];
    this.reportOpened = true;
    this.activePage = 'workspace';
    this.activeTab = 'summary';

    this.cdr.detectChanges();

    setTimeout(() => {
      this.chart?.update();
    }, 0);
  }

  openHistoryReport(report: any) {
    this.selectedClient = report.client;
    this.messages = [report];
    this.reportOpened = true;
    this.activePage = 'workspace';
    this.activeTab = 'summary';

    this.cdr.detectChanges();

    setTimeout(() => {
      this.chart?.update();
    }, 0);
  }

  clearHistory() {
    this.reportHistory = [];
    this.cdr.detectChanges();
  }

  clearSavedReports() {
    this.savedReports = [];
    this.cdr.detectChanges();
  }

  copySql(sql: string | null) {
    if (!sql) return;
    navigator.clipboard.writeText(sql);
  }

  async askQuestion() {
    if (!this.selectedClient) {
      this.errorMessage = 'Please select a client.';
      return;
    }

    if (!this.question.trim()) {
      this.errorMessage = 'Please enter a question.';
      return;
    }

    const currentQuestion = this.question.trim();

    this.loading = true;
    this.errorMessage = '';
    this.activePage = 'workspace';
    this.reportOpened = true;
    this.activeTab = 'summary';
    this.cdr.detectChanges();

    try {
      const res = await firstValueFrom(
        this.api.askQuestion(this.selectedClient, currentQuestion)
      );

      const selectedType =
        this.selectedChartType === 'auto'
          ? (res.chart?.type || 'bar')
          : this.selectedChartType;

      const chartData = res.chart
        ? {
            labels: res.chart.labels || [],
            datasets: [
              {
                label: res.chart.yAxis || 'Value',
                data: res.chart.values || [],
                backgroundColor: this.chartColors,
                borderRadius: selectedType === 'bar' ? 10 : 0,
                borderWidth: 1
              }
            ]
          }
        : null;

      const newMessage = {
        client: this.selectedClient,
        question: currentQuestion,
        response: res,
        chartData,
        chartType: selectedType,
        chartOptions: {
          responsive: true,
          maintainAspectRatio: false
        },
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        createdAt: new Date().toLocaleString()
      };

      this.messages = [newMessage];
      this.reportHistory.unshift(newMessage);

      this.question = '';
      this.activeTab = 'summary';
    } catch (err) {
      console.error('Frontend API error:', err);
      this.errorMessage = 'Something went wrong while fetching the response.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.chart?.update();
      }, 0);
    }
  }
}