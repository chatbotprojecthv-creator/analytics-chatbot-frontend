import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AskResponse {
  question: string;
  sql: string | null;
  summary: string;
  insights: any;
  chart: any;
  data: any[];
}

@Injectable({
  providedIn: 'root'
})
export class Api {
  private baseUrl = 'https://analytics-chatbot-api-165509171640.us-central1.run.app';

  constructor(private http: HttpClient) {}

  askQuestion(client: string, question: string): Observable<AskResponse> {
    return this.http.post<AskResponse>(`${this.baseUrl}/ask`, {
      client,
      question
    });
  }
}