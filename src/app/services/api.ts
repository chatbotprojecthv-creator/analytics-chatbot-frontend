import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChartSeries {
  key: string;
  label: string;
  values: number[];
}

export interface ChartResponse {
  type: 'bar' | 'pie' | 'line' | string;
  reason:
    | 'ranking'
    | 'comparison'
    | 'distribution'
    | 'part_to_whole'
    | 'trend'
    | 'categorical_comparison'
    | string;
  xAxis: string;
  yAxis: string;
  labels: string[];
  values: number[];
  series: ChartSeries[];
  data: Record<string, unknown>[];
  limited: boolean;
  displayed_items: number;
  total_items: number;
  orientation: 'horizontal' | 'vertical';
}

export interface InsightsResponse {
  record_count: number;
  empty: boolean;
  top_category?: string;
  top_value?: number;
  total_categories?: number;
  total_value?: number;
  label_key?: string;
  value_key?: string;
  numeric_keys?: string[];
}

export interface AskResponse {
  question: string;
  client?: string;
  sql: string | null;
  summary: string;
  guardrail_type?: string | null;
  insights: InsightsResponse;
  chart: ChartResponse | null;
  data: Record<string, unknown>[];
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Api {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  askQuestion(
    client: string,
    question: string
  ): Observable<AskResponse> {
    return this.http.post<AskResponse>(
      `${this.baseUrl}/ask`,
      {
        client,
        question
      }
    );
  }
}